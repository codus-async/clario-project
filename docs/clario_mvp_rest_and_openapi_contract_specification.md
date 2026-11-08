# Clario — MVP REST / OpenAPI 3.1 Contract Specification (`api-specification.md`)

**Document Status:** Stage 4 — API & Integration Contract Specification  
**OpenAPI Version:** `3.1.0`  
**Base URL:** `https://api.clario.edu.ng/api/v1`  
**Target Release:** Clario MVP (P0 Scope — 75 Features, `FR-001` to `FR-290`)  
**Default Timezone Authority:** `Africa/Lagos` (`WAT`, `UTC+1`)  
**Currency Authority:** Nigerian Naira (`NGN`) represented strictly in integer minor units (**kobo**)

---

## 1. Global API Conventions, Security Headers & PEP Middleware Contract

Every endpoint in Clario is governed by the **Five-Gate Policy Enforcement Point (PEP)** pipeline (`F-64`, `F-65`, `F-66`, `F-70`).

### 1.1 Standard Request & Response Headers

| Header Name | Direction | Required? | Purpose & Enforcing Features |
|---|---|---|---|
| `Cookie: clario_sid=<uuid>` or `Authorization: Bearer <token>` | Request | Mandatory (except Public Auth & Webhook routes) | Binds request to the server-verifiable Redis session (`F-64`, `F-65`). |
| `X-Clario-Active-Role` | Request | Optional (Required when user holds multiple roles) | Explicitly selects active role context (`PROJECT_COORDINATOR`, `PROJECT_SUPERVISOR`, `PROJECT_EXAMINER`, etc. per `FR-047`, `F-65`). |
| `X-Clario-Coordinator-Appointment-Id` | Request | Mandatory for all `PROJECT_COORDINATOR` routes | Binds the request to **one** specific `(programme_id, academic_session_id)` appointment scope (`BR-03`, `F-15`, `F-66`). |
| `Idempotency-Key` | Request | Mandatory on Payment, Submission, and Bulk Import `POST` routes | Prevents duplicate payment initiations (`F-67`), duplicate formal submissions (`F-32`, `DAT-05`), and duplicate retries. |
| `X-Paystack-Signature` / `X-Gateway-Signature` | Request | Mandatory on `/webhooks/payments` | Cryptographic HMAC-SHA512/SHA256 signature verified before parsing webhook payload (`F-68`, `DAT-10`). |
| `X-Clario-Institution-Timezone` | Response | Always returned on tenant routes | Returns the institution's authoritative IANA timezone (e.g., `Africa/Lagos` per `BR-NEW-01`) alongside UTC ISO-8601 timestamps. |

### 1.2 Standard Error Envelope (RFC 9457 Problem Details)

All `4xx` and `5xx` responses return a consistent JSON structure:

```json
{
  "error": {
    "code": "BR_16_EXAMINER_SUPERVISOR_CONFLICT",
    "title": "Conflict of Interest Violation (BR-16)",
    "status": 409,
    "detail": "Dr. Musa cannot be appointed as a Project Examiner for Project prj_9912 because they currently or previously supervised this project.",
    "instance": "/api/v1/coordinator/projects/prj_9912/examiners",
    "timestamp_utc": "2026-11-04T16:55:00Z",
    "institution_timezone": "Africa/Lagos",
    "field_errors": [
      {
        "field": "examiner_user_id",
        "message": "User is listed in project_supervision_history for this project."
      }
    ]
  }
}
```

### 1.3 Standardized Domain Error Codes
* `401 UNAUTHORIZED_SESSION`: Missing, expired, or revoked session (`F-64`, `F-65`).
* `403 MFA_ENROLLMENT_REQUIRED`: User holds `PLATFORM_ADMIN`, `INSTITUTIONAL_ADMIN`, or `PROJECT_COORDINATOR` role and has not completed MFA (`SEC-06`).
* `403 CONFIDENTIAL_ACADEMIC_RECORD_BLOCKED`: `PLATFORM_ADMIN` (`F-08`) or `INSTITUTIONAL_ADMIN` (`F-18`, `BR-25`) attempted to access proposals, project files, discussions, or grades.
* `403 OUT_OF_ASSIGNMENT_SCOPE`: Cross-tenant (`BR-01`), cross-programme/session (`BR-03`), or unassigned project/group access attempt (`BR-02`, `F-66`).
* `402 SUBSCRIPTION_EXPIRED_RESTRICTED`: Institution's subscription and grace period have expired (`F-70`, `SYS-07`); write operation blocked until renewal.
* `409 BR_05_TOPIC_REQUIRED_BEFORE_SUPERVISOR`: Attempted to assign a Supervisor before a topic proposal was submitted (`F-24`).
* `409 BR_08_DESIGNATED_SUBMITTER_ONLY`: Non-designated group member attempted a formal group submission (`F-23`, `F-32`).
* `409 BR_10_PRECEDING_MILESTONE_NOT_APPROVED`: Attempted to submit to a locked milestone (`F-29`, `F-32`).
* `409 BR_16_EXAMINER_SUPERVISOR_CONFLICT`: Attempted to appoint a current or former Supervisor as Examiner (`F-48`).
* `409 BR_21_ASSESSMENT_LOCKED_POST_PUBLICATION`: Attempted to edit an assessment or penalty override after project result publication (`F-55`, `F-56`, `F-60`).

---

## 2. Module K: Authentication, MFA & Session Management (`F-64`–`F-66`)

### 2.1 Endpoint Summary

| Method & Path | Feature IDs | Allowed Actors | Description |
|---|---|---|---|
| `POST /auth/login` | `F-64`, `F-65` | Public | Authenticates email/institutional ID + password; enforces rate limits (`SEC-04`) and adaptive temporary lockouts (`SEC-05`). |
| `POST /auth/activate` | `F-01`, `F-05`, `F-13`, `F-64` | Public (Token) | Activates an invited account, enforces $\ge 12\text{-char}$ & breach-screened password (`SEC-02`, `SEC-03`). |
| `POST /auth/mfa/enroll` | `F-05`, `F-14`, `F-64` | Authenticated (`PRE_MFA`) | Generates TOTP secret, QR provisioning URI, and 10 recovery codes (`SEC-06`). |
| `POST /auth/mfa/verify` | `F-64`, `F-65` | Authenticated (`PRE_MFA`) | Verifies 6-digit TOTP or recovery code and upgrades session to `mfa_verified = true`. |
| `POST /auth/password/forgot` | `F-64`, `F-71` | Public | Initiates self-service password reset email (`SEC-08`). |
| `POST /auth/password/reset` | `F-64`, `F-65` | Public (Token) | Resets password using single-use token and revokes all existing sessions (`FR-227`). |
| `PUT /auth/session/context` | `F-14`, `F-15`, `F-65` | All Authenticated | Switches active role (`active_role`) or active Coordinator `(Programme, Session)` appointment (`BR-03`). |
| `POST /auth/session/heartbeat` | `F-65` | All Authenticated | Extends session inactivity TTL (`SEC-07`). |
| `POST /auth/logout` | `F-65` | All Authenticated | Immediately revokes current session on the server (`FR-227`). |

### 2.2 Key Payload Contracts

#### `POST /auth/login` (`F-64`)
```json
// Request
{
  "identifier": "tunde.adewale@unilag.edu.ng",
  "institution_code": "UNILAG",
  "password": "Correct-Horse-Battery-Staple-99!"
}

// Response: 200 OK
{
  "session_id": "ses_88a12b4c",
  "user": {
    "id": "usr_7102",
    "full_name": "Dr. Tunde Adewale",
    "institution_id": "inst_001",
    "institution_code": "UNILAG",
    "timezone_iana": "Africa/Lagos",
    "roles": ["PROJECT_COORDINATOR", "PROJECT_SUPERVISOR", "PROJECT_EXAMINER"],
    "coordinator_appointments": [
      {
        "appointment_id": "cap_301",
        "programme_id": "prg_10",
        "programme_name": "B.Sc. Computer Science",
        "academic_session_id": "acs_2026",
        "session_label": "2026/2027"
      }
    ]
  },
  "mfa_required": true,
  "mfa_enrolled": true,
  "mfa_verified": false,
  "next_step": "MFA_CHALLENGE_REQUIRED",
  "inactivity_timeout_minutes": 30
}
```

---

## 3. Module A: Platform Administration (`F-01`–`F-05`, `F-08`)

*All endpoints in Module A require `active_role = PLATFORM_ADMIN` and `mfa_verified = true` (`SEC-06`). Per `F-08`, zero endpoints exist for Platform Admins to read confidential academic records.*

| Method & Path | Feature IDs | Description |
|---|---|---|
| `GET /platform/institutions` | `F-01`, `F-03` | Paginated, filterable directory of institutional tenants with subscription status and active user count (`FR-005`). |
| `POST /platform/institutions` | `F-01`, `F-71`, `F-82` | Creates a new isolated institutional tenant (`BR-01`) with default timezone `Africa/Lagos` and sends onboarding invite (`FR-001`, `FR-002`). |
| `GET /platform/institutions/{institution_id}` | `F-01`, `F-03` | Retrieves operational, structural count, and billing summary for one tenant (`FR-023`). |
| `PATCH /platform/institutions/{institution_id}` | `F-01`, `F-82` | Updates institution metadata or primary contact details. |
| `POST /platform/institutions/{institution_id}/status` | `F-01`, `F-65`, `F-82` | Transitions tenant between `PENDING_ACTIVATION`, `ACTIVE`, `SUSPENDED`, and `PENDING_TERMINATION` (requires mandatory `reason` for suspension/termination `FR-003`, `FR-004`). |
| `POST /platform/institutions/{institution_id}/exports` | `F-01`, `F-08`, `F-82` | Initiates an asynchronous full institutional data archive export (`FR-006`, `SEC-16`); requires mandatory `support_request_reference` and `justification` (`FR-024`). |
| `GET /platform/subscription-plans` | `F-02` | Lists all subscription plans (`DRAFT`, `ACTIVE`, `ARCHIVED`). |
| `POST /platform/subscription-plans` | `F-02`, `F-82` | Creates a subscription plan priced in `NGN` integer **kobo** (`FR-007`) with `max_user_capacity <= 5000`. |
| `PATCH /platform/subscription-plans/{plan_id}` | `F-02`, `F-82` | Updates plan or transitions status to `ARCHIVED` (deletion blocked if linked to subscriptions `FR-008`, `FR-009`). |
| `GET /platform/subscriptions` | `F-03`, `F-04` | Lists all institutional subscriptions filterable by status (`ACTIVE`, `GRACE_PERIOD`, `EXPIRED`) and renewal date (`FR-010`). |
| `PUT /platform/settings/grace-period` | `F-04`, `F-70`, `F-82` | Updates platform-wide default grace period days ($0\dots 90$) and Grace/Expired permission matrix toggles (`FR-015`, `FR-017`, `OD-06`). |
| `PUT /platform/subscriptions/{subscription_id}/grace-override` | `F-04`, `F-70`, `F-82` | Sets or clears an institution-specific grace period override with mandatory justification (`FR-015`, `FR-016`). |
| `GET /platform/admins` | `F-05` | Lists all Platform Admin accounts and MFA enrollment status. |
| `POST /platform/admins/invite` | `F-05`, `F-71`, `F-82` | Invites a new Platform Admin with mandatory MFA on activation (`FR-018`, `FR-019`). |
| `POST /platform/admins/{user_id}/deactivate` | `F-05`, `F-65`, `F-82` | Deactivates another Platform Admin and revokes sessions (blocks self-deactivation or last-admin lockout `FR-020`, `FR-021`). |

#### Example Payload: `POST /platform/institutions` (`F-01`)
```json
// Request
{
  "name": "University of Lagos",
  "code_slug": "UNILAG",
  "country": "Nigeria",
  "timezone_iana": "Africa/Lagos",
  "primary_contact_name": "Prof. Folashade Ogunsola",
  "primary_contact_email": "ict-admin@unilag.edu.ng",
  "primary_contact_phone": "+2348030000000",
  "initial_status": "ACTIVE"
}
```

---

## 4. Module B & L: Institutional Administration & Subscription Billing (`F-03`, `F-09`–`F-16`, `F-18`, `F-67`–`F-70`)

*All endpoints in this section (except the external payment webhook receiver) require `active_role = INSTITUTIONAL_ADMIN`, `mfa_verified = true`, and are strictly tenant-isolated to `session.institution_id` (`BR-01`). Per `F-18` (`BR-25`), Institutional Admins are blocked from all project/document/grading routes.*

### 4.1 Academic Structure & Institutional Directory Endpoints (`F-09`–`F-16`)

| Method & Path | Feature IDs | Description |
|---|---|---|
| `GET /institution/profile` & `PATCH /institution/timezone` | `F-01`, `F-12` | Views tenant profile and updates institution's IANA timezone (`FR-036`, `BR-NEW-01`). |
| `GET /institution/faculties` & `POST /institution/faculties` | `F-09`, `F-82` | Lists or creates Faculties (unique name/code per institution `FR-025`, `FR-026`). |
| `PATCH /institution/faculties/{faculty_id}` | `F-09`, `F-82` | Updates or archives a Faculty (blocks archiving if active child Departments exist `FR-027`). |
| `GET /institution/departments` & `POST /institution/departments` | `F-10`, `F-82` | Lists or creates Departments under an `ACTIVE` Faculty (`FR-028`, `FR-029`). |
| `PATCH /institution/departments/{dept_id}` | `F-10`, `F-82` | Updates or archives a Department (blocks archiving if active Programmes exist `FR-030`). |
| `GET /institution/programmes` & `POST /institution/programmes` | `F-11`, `F-82` | Lists or creates Degree Programmes under an `ACTIVE` Department (`FR-031`, `FR-032`). |
| `PATCH /institution/programmes/{programme_id}` | `F-11`, `F-82` | Updates or archives a Programme (blocks archiving if active Coordinator appointments or session projects exist `FR-033`). |
| `GET /institution/academic-sessions` & `POST /institution/academic-sessions` | `F-12`, `F-82` | Lists or creates Academic Sessions (`end_date > start_date` `FR-034`, `FR-035`). |
| `POST /institution/academic-sessions/{session_id}/status` | `F-12`, `F-82` | Activates or closes an Academic Session (`CLOSED` locks all session records as read-only `FR-037`). |
| `GET /institution/users` & `POST /institution/users` | `F-13`, `F-14`, `F-71` | Searches/lists institutional users or creates a single user (checking plan capacity $\le 5,000$ `FR-038`–`FR-040`). |
| `POST /institution/users/bulk-import` | `F-13`, `F-71`, `F-82` | Multipart CSV upload with dry-run validation preview and atomic user batch creation (`FR-038`, `FR-039`). |
| `PATCH /institution/users/{user_id}` | `F-13`, `F-82` | Updates user profile, institutional ID, or Under-18 Guardian Consent status (`FR-041`, `FR-042`, `PROP-05`). |
| `POST /institution/users/{user_id}/deactivate` | `F-13`, `F-65`, `F-82` | Deactivates user and immediately terminates active sessions while preserving academic history (`FR-043`). |
| `POST /institution/users/{user_id}/recovery-assist` | `F-13`, `F-64`, `F-82` | Triggers password reset email or clears temporary login lockout (`FR-044`, `SEC-08`). |
| `PUT /institution/users/{user_id}/roles` | `F-14`, `F-64`, `F-82` | Assigns/revokes institutional roles; blocks combining `STUDENT` with staff/admin roles (`FR-046`) and enforces mandatory MFA on Admin/Coordinator (`FR-048`). |
| `GET /institution/coordinator-appointments` & `POST /institution/coordinator-appointments` | `F-15`, `F-71`, `F-82` | Lists or appoints a Project Coordinator strictly to **one `programme_id` and one `academic_session_id`** (`BR-03`, `FR-049`–`FR-051`). |
| `POST /institution/coordinator-appointments/{appointment_id}/revoke` | `F-15`, `F-65`, `F-82` | Revokes/replaces a Coordinator appointment and transfers scope immediately (`FR-052`). |
| `GET /institution/supervisors` & `POST /institution/supervisors` | `F-16`, `F-14`, `F-82` | Lists or creates Supervisor eligibility records (Title, Primary Dept, Specialization Tags, Status `FR-053`, `FR-054`). |
| `PATCH /institution/supervisors/{supervisor_record_id}` | `F-16`, `F-82` | Updates Supervisor details or transitions status (`AVAILABLE`, `UNAVAILABLE_ON_LEAVE`, `INACTIVE` — blocking new assignments when unavailable `FR-055`). |

### 4.2 Institutional Subscription & Automated Payment Endpoints (`F-03`, `F-67`–`F-70`)

| Method & Path | Feature IDs | Actor | Description |
|---|---|---|---|
| `GET /institution/billing/subscription` | `F-03`, `F-04`, `F-70` | `INSTITUTIONAL_ADMIN` | Retrieves current plan, subscription status, validity dates, grace period countdown, billing profile, and payment history (`FR-011`). |
| `PUT /institution/billing/profile` | `F-03`, `F-82` | `INSTITUTIONAL_ADMIN` | Updates Billing Legal Name, Billing Email, Address, and Tax/RC Number (`FR-012`). |
| `POST /institution/billing/payments/initiate` | `F-03`, `F-67`, `F-82` | `INSTITUTIONAL_ADMIN` | Validates `plan.max_user_capacity >= current_active_users`, creates an idempotent `PENDING_VERIFICATION` transaction in `NGN` kobo, and returns gateway checkout URL (`FR-013`, `FR-232`–`FR-235`). |
| `POST /webhooks/payments/{provider}` | `F-68`, `F-69`, `F-70`, `F-82` | Payment Webhook Sender | Verifies cryptographic HMAC signature (`DAT-10`), deduplicates by `gateway_event_id` and `idempotency_reference` (`DAT-08`, `DAT-09`), verifies exact `NGN` kobo amount, atomically activates/extends subscription (`F-69`), lifts `F-70` restrictions, and queues receipts (`FR-236`–`FR-242`). |

#### Example Payload: `POST /institution/billing/payments/initiate` (`F-03`, `F-67`)
```json
// Request (Header: Idempotency-Key: pay_unilag_2026_annual_01)
{
  "plan_id": "pln_enterprise_annual"
}

// Response: 201 Created
{
  "transaction_id": "ptx_9012",
  "idempotency_reference": "CLARIO-NGN-UNILAG-20261104-9012",
  "currency": "NGN",
  "expected_amount_kobo": 250000000,
  "expected_amount_formatted": "NGN 2,500,000.00",
  "status": "PENDING_VERIFICATION",
  "gateway_provider": "PAYSTACK",
  "checkout_url": "https://checkout.paystack.com/8819201a",
  "integrity_notice": "Subscription status will update only after cryptographic server verification of the payment event (DAT-10)."
}
```

---

## 5. Module C, D, E, F & G: Coordinator, Supervisor & Student Lifecycle Endpoints (`F-19`–`F-44`)

### 5.1 Project Coordinator Cohort, Allocation, Group & Supervisor Endpoints (`F-19`, `F-21`–`F-24`, `F-27`)

*Requires `active_role = PROJECT_COORDINATOR`, `mfa_verified = true`, and a valid `X-Clario-Coordinator-Appointment-Id` header (`BR-03`).*

| Method & Path | Feature IDs | Description |
|---|---|---|
| `GET /coordinator/students` & `POST /coordinator/students` | `F-19`, `F-71`, `F-82` | Lists or registers students (single or bulk CSV) into the Coordinator's `(Programme, Academic Session)` cohort (`FR-059`–`FR-062`). |
| `GET /coordinator/topic-proposals` | `F-20` | Monitors all student/group topic proposals across the programme filterable by status (`PC-02`, `PC-20`, `FR-069`). |
| `POST /coordinator/allocations/individual` | `F-21`, `F-82` | Allocates a registered student to an `INDIVIDUAL` project (`FR-070`, `FR-071`). |
| `GET /coordinator/groups` & `POST /coordinator/groups` | `F-21`, `F-22`, `F-23`, `F-36` | Lists or creates a `GROUP` project with $\ge 2$ unallocated students and $\ge 1$ Designated Group Submitter (`BR-07`, `BR-08`, `FR-074`–`FR-078`). |
| `PUT /coordinator/groups/{group_id}/submitter` | `F-23`, `F-82` | Designates or transfers the `is_designated_submitter` authority within a group (ensuring $\ge 1$ active submitter remains `FR-078`). |
| `POST /coordinator/projects/assign-supervisor` | `F-21`, `F-24`, `F-75`, `F-82` | Assigns (single or bulk) an `AVAILABLE` Supervisor (`F-16`) to projects that have submitted a topic proposal (`BR-04`, `BR-05`, `FR-081`–`FR-083`). |
| `POST /coordinator/projects/{project_id}/reassign-supervisor` | `F-27`, `F-48`, `F-75`, `F-82` | Reassigns a project to a new `AVAILABLE` Supervisor with mandatory `reassignment_reason`; revokes former Supervisor's active access (`SEC-12`), preserves approved work, and retains both Supervisors in `project_supervision_history` for `BR-16` (`FR-084`, `FR-085`). |

#### Example Payload: `POST /coordinator/groups` (`F-21`, `F-22`, `F-23`)
```json
// Request
{
  "group_code": "CSC-2027-GRP-01",
  "members": [
    { "student_registration_id": "sreg_101", "is_designated_submitter": true },
    { "student_registration_id": "sreg_102", "is_designated_submitter": false },
    { "student_registration_id": "sreg_103", "is_designated_submitter": false }
  ]
}
```

### 5.2 Topic Proposal & Review Workflow Endpoints (`F-20`)

| Method & Path | Feature IDs | Allowed Actors | Description |
|---|---|---|---|
| `POST /projects/{project_id}/topic-proposals` | `F-20`, `F-23`, `F-75` | `STUDENT` (Owner or Designated Submitter `BR-08`) | Submits initial topic proposal prior to Supervisor assignment (`BR-04`, `FR-063`) or submits a revised proposal after rejection (`ST-07`, `FR-067`). |
| `GET /projects/{project_id}/topic-proposals` | `F-20` | `STUDENT`, Assigned `PROJECT_SUPERVISOR`, `PROJECT_COORDINATOR` | Retrieves current and historical topic proposal iterations, feedback, and alternative topic suggestions. |
| `POST /projects/{project_id}/topic-proposals/{proposal_id}/decision` | `F-20`, `F-29`, `F-75`, `F-82` | Assigned `PROJECT_SUPERVISOR` | Records `APPROVE` (locks official project title & unlocks Milestone 1 `BR-10`), `REJECT` (requires mandatory `supervisor_feedback`), or `SUGGEST_ALTERNATIVE` (`FR-066`). |
| `POST /projects/{project_id}/topic-proposals/{proposal_id}/alternative-response` | `F-20`, `F-75`, `F-82` | `STUDENT` (Owner or Designated Submitter) | Accepts or declines a Supervisor's suggested alternative topic (`FR-068`, `OD-02`). |

### 5.3 Workspace, Milestones, Deadlines, Extensions & Late Penalty Endpoints (`F-28`–`F-31`, `F-40`–`F-44`)

| Method & Path | Feature IDs | Allowed Actors | Description |
|---|---|---|---|
| `GET /projects/{project_id}/workspace` | `F-28`, `F-31`, `F-36`, `F-38`, `F-62` | `STUDENT`, Assigned `PROJECT_SUPERVISOR`, `PROJECT_COORDINATOR` | Unified Project / Shared Group Workspace payload (`ST-01`, `ST-16`, `PS-06`) including guidelines (`ST-02`), milestone roadmap (`F-29`–`F-31`), group submission ledger (`F-38`), defence schedule (`F-49`), and completion checklist (`F-62`). |
| `GET /supervisor/dashboard/projects` | `F-28`, `F-31`, `F-41` | `PROJECT_SUPERVISOR` | Lists all assigned individual and group projects filterable by milestone stage, pending review, extension request, or overdue status (`PS-06`, `PS-08`, `PS-18`, `FR-088`). |
| `GET /coordinator/milestones` & `POST /coordinator/milestones` | `F-29`, `F-30`, `F-79`, `F-82` | `PROJECT_COORDINATOR` | Configures ordered sequential milestones (`1..N`, ending with `FINAL_SUBMISSION`), deliverable requirements, allowed file formats, and chronological deadlines in the institution's timezone (`FR-089`–`FR-097`). |
| `PATCH /coordinator/milestones/{milestone_id}` | `F-29`, `F-30`, `F-79`, `F-80`, `F-82` | `PROJECT_COORDINATOR` | Updates milestone guidelines or deadline (blocks deleting/reordering milestones that already have submissions `FR-091`; synchronizes `F-79`/`F-80` schedulers `FR-097`). |
| `GET /coordinator/progress-monitoring` | `F-31`, `F-41` | `PROJECT_COORDINATOR` | Programme-wide milestone completion metrics, bottleneck filters, and overdue submission monitoring (`PC-15`, `PC-16`, `PC-21`, `FR-101`, `FR-138`). |
| `POST /projects/{project_id}/extensions` | `F-42`, `F-75` | `STUDENT` | Submits a Milestone Deadline Extension Request with requested date, reason, and optional supporting document (`ST-25`, `FR-140`, `FR-141`). |
| `POST /projects/{project_id}/extensions/{ext_id}/supervisor-recommendation` | `F-42`, `F-75`, `F-82` | Assigned `PROJECT_SUPERVISOR` | Recommends or declines an extension request with mandatory supervisory comments (`BR-15`, `PS-19`, `FR-142`). |
| `POST /coordinator/extensions/{ext_id}/decision` | `F-30`, `F-42`, `F-43`, `F-79`, `F-80`, `F-82` | `PROJECT_COORDINATOR` | Approves or rejects a Supervisor-recommended extension (`BR-15`, `PC-17`, `FR-143`); updates project Effective Deadline and reschedules `F-79`/`F-80`. |
| `PUT /coordinator/late-penalty-policy` | `F-44`, `F-82` | `PROJECT_COORDINATOR` | Configures programme late penalty rules, grace buffer minutes, rate, and cap (`PC-18`, `FR-148`, `OD-05`). |
| `POST /coordinator/late-penalties/{penalty_id}/override` | `F-44`, `F-58`, `F-82` | `PROJECT_COORDINATOR` | Overrides or waives an automatically calculated late penalty with mandatory `override_reason`, recalculating net score (`BR-14`, `PC-19`, `FR-150`–`FR-152`). |

---

## 6. Module E, F & N: Secure File Upload, Version Preservation, Review & Discussions (`F-32`–`F-35`, `F-37`, `F-76`–`F-78`)

### 6.1 Two-Phase Idempotent Upload & Formal Submission Pipeline (`F-32`, `F-35`, `F-37`, `F-76`, `F-78`)

To satisfy `DAT-03` (*an upload becomes a formal submission only after server receipt, binary content validation, and confirmation*), `DAT-05` (*interrupted upload recovery without duplicates*), and `NFR-SEC` (*max $50\text{ MB}$, `PDF/DOC/DOCX/PPT/PPTX` magic-byte & malware scan*):

| Method & Path | Feature IDs | Allowed Actors | Description |
|---|---|---|---|
| `POST /projects/{project_id}/uploads/initiate` | `F-32`, `F-37`, `F-76` | Authorised `STUDENT` or `PROJECT_SUPERVISOR` | Validates file size ($\le 52,428,800\text{ bytes}$), extension, and actor permissions; returns an `upload_idempotency_token` and chunked/multipart presigned upload target (`FR-103`, `FR-104`, `FR-265`). |
| `POST /projects/{project_id}/milestones/{milestone_id}/submissions` | `F-23`, `F-32`, `F-35`, `F-43`, `F-75`, `F-76`, `F-78` | `STUDENT` (Individual Owner or Designated Submitter `BR-08`) | Verifies uploaded bytes (magic bytes + ClamAV clean scan + SHA-256), creates immutable `Version N` (`F-78`, `BR-11`), evaluates server receipt timestamp against Effective Deadline in institution timezone (`F-43`, `BR-12`), calculates any late penalty (`F-44`), transitions milestone to `SUBMITTED_AWAITING_REVIEW`, and notifies Supervisor (`FR-102`–`FR-107`, `FR-116`, `FR-117`). |
| `GET /projects/{project_id}/milestones/{milestone_id}/versions` | `F-35`, `F-38`, `F-78` | `STUDENT`, Assigned `PROJECT_SUPERVISOR`, `PROJECT_COORDINATOR` | Lists all preserved versions (`v1..vN`) with side-by-side comparison metadata, revision summaries, lateness details, and review outcomes (`PS-14`, `PS-15`, `ST-15`, `FR-118`). |
| `POST /projects/{project_id}/submissions/{version_id}/review` | `F-33`, `F-34`, `F-75`, `F-82` | Assigned `PROJECT_SUPERVISOR` | Records `APPROVED` (unlocks Milestone $k+1$ per `BR-10` or marks Final Submission ready for examination `F-50`), `REVISIONS_REQUESTED` (mandatory feedback), or `REJECTED` (mandatory feedback) (`FR-108`–`FR-110`). |
| `GET /projects/{project_id}/submissions/{version_id}/discussions` & `POST /projects/{project_id}/submissions/{version_id}/discussions` | `F-34`, `F-75` | `STUDENT` (or any Group Member), Assigned `PROJECT_SUPERVISOR` | Views or posts formal review feedback (`PS-10`) and threaded submission discussion comments strictly bound to `submission_version_id` (`BR-27`, `FR-111`–`FR-115`). Coordinators and Admins are blocked from posting (`BR-25`, `BR-26`). |
| `GET /groups/{group_id}/shared-documents` & `POST /groups/{group_id}/shared-documents` | `F-37`, `F-76`, `F-78` | Any Active Group Member (`STUDENT`), Assigned `PROJECT_SUPERVISOR` | Uploads, revises, lists, or archives asynchronous shared working documents inside the Shared Group Workspace (`ST-18`, `FR-122`–`FR-126`). |
| `GET /documents/{storage_object_id}/download` | `F-08`, `F-18`, `F-50`, `F-66`, `F-77`, `F-82` | Authorised Scoped Actors Only (`FR-266`) | Evaluates PEP Gate 4 & Gate 5 (`F-77`): blocks `PLATFORM_ADMIN` (`F-08`), `INSTITUTIONAL_ADMIN` (`F-18`), unassigned users, and blocks `PROJECT_EXAMINER` from intermediate milestone files (`AC-F77-03`), then streams decrypted document over HTTPS (`FR-266`–`FR-268`). |

#### Example Payload: `POST /projects/{project_id}/milestones/{milestone_id}/submissions` (`F-32`, `F-35`, `F-43`)
```json
// Request (Header: Idempotency-Key: sub_prj9912_ms2_v2)
{
  "upload_idempotency_token": "upl_tok_771829a",
  "submission_notes": "Completed Literature Review with 45 peer-reviewed citations.",
  "revision_summary_note": "Addressed Supervisor feedback on Section 2.3 theoretical framework and added comparative table."
}

// Response: 201 Created
{
  "submission_version_id": "subv_4402",
  "project_id": "prj_9912",
  "milestone_id": "ms_02",
  "version_number": 2,
  "parent_version_id": "subv_4109",
  "storage_object_id": "obj_88310",
  "file_name": "CSC_GRP_01_Chapter2_v2.pdf",
  "file_size_bytes": 4194304,
  "sha256_checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "server_receipt_utc": "2026-12-02T01:14:00Z",
  "server_receipt_local": "2026-12-02T02:14:00+01:00[Africa/Lagos]",
  "effective_deadline_local": "2026-12-01T23:59:00+01:00[Africa/Lagos]",
  "is_late": true,
  "late_duration_minutes": 135,
  "calculated_late_penalty_marks": 2.0000,
  "review_status": "AWAITING_REVIEW"
}
```

---

## 7. Module H, I & J: Examination, Blind Grading, Consolidation & Atomic Publication (`F-39`, `F-46`–`F-62`)

### 7.1 Coordinator Examination, Rubric, Consolidation, Approval & Publication Endpoints

*Requires `active_role = PROJECT_COORDINATOR`, `mfa_verified = true`, and active `(Programme, Session)` appointment header (`BR-03`).*

| Method & Path | Feature IDs | Description |
|---|---|---|
| `GET /coordinator/assessment-structure` & `PUT /coordinator/assessment-structure` | `F-51`, `F-82` | Configures Supervisor max marks (default $30.0000$ `BR-18`), Examiner Document max marks, Examiner Defence max marks (sum $= 100.0000$), criteria rubrics, pass mark, grade bands, and Examiner consolidation method (`FR-172`–`FR-177`). Locked once assessments are submitted. |
| `POST /coordinator/examination-panels` | `F-47`, `F-48`, `F-82` | Configures default panel size ($\ge 1$, `BR-20`) and reusable named Examination Panels (`FR-158`, `FR-159`). |
| `POST /coordinator/projects/{project_id}/examiners` | `F-46`, `F-47`, `F-48`, `F-71`, `F-82` | Appoints $1\dots M$ eligible `PROJECT_EXAMINER` users to a project; enforces `F-48` (`BR-16`) blocking any current (`F-24`) or former (`F-27`) Supervisor of that project (`FR-153`–`FR-156`, `FR-161`). |
| `DELETE /coordinator/projects/{project_id}/examiners/{appointment_id}` | `F-46`, `F-50`, `F-82` | Removes/replaces an unsubmitted Examiner and immediately revokes their `F-50` access (`FR-157`, `AC-F50-03`). |
| `POST /coordinator/defence-schedules` & `PATCH /coordinator/defence-schedules/{schedule_id}` | `F-49`, `F-71`–`F-73`, `F-82` | Schedules or updates oral defence date, start/end time (`WAT`), and venue; checks overlapping Examiner timeslot conflicts (`FR-165`–`FR-168`). |
| `GET /coordinator/assessments/monitoring` | `F-57`, `F-58` | Programme-wide Assessment Completion Monitoring (`PC-27`, `PC-30`, `PC-33`) showing submitted vs. pending Examiner panel assessments and per-student Supervisor assessments (`FR-199`–`FR-201`). |
| `GET /coordinator/projects/{project_id}/consolidated-sheet` | `F-57`, `F-58` | Full Consolidated Result Sheet (`PC-30`, `PC-31`) displaying individual Examiner Document/Defence sheets, Consolidated Examiner Score ($E_{\text{consolidated}}$), each student's Individual Supervisor Score ($S_k$), Late Penalty (`F-44`), exact `NUMERIC(10,4)` unrounded score, rounded final score, grade, and Pass/Fail outcome (`FR-202`, `FR-203`). |
| `POST /coordinator/projects/approve-results` | `F-59`, `F-82` | Approves final consolidated results for one or a batch of ready projects (`BR-22`, `FR-204`–`FR-207`), transitioning status to `APPROVED_READY_FOR_PUBLICATION`. |
| `POST /coordinator/projects/publish-results` | `F-60`, `F-61`, `F-62`, `F-75`, `F-82` | **Atomic Project-Level Publication (`BR-23` Updated, `FR-208`–`FR-212`):** Publishes one or more `APPROVED` projects without blocking on other pending projects in the programme; atomically locks all Examiner/Supervisor assessments (`BR-21`), exposes private student breakdowns (`F-61`), updates completion status (`F-62`), writes `F-82` audit log, and queues notifications (`F-75`). |

### 7.2 Project Examiner Blind Assessment Endpoints (`F-50`, `F-52`–`F-55`)

*Requires `active_role = PROJECT_EXAMINER` and an `ACTIVE` appointment (`F-46`) on `project_id` (`SEC-13`). Strictly excludes Supervisor scores and co-examiner scores (`BR-17`, `F-48`).*

| Method & Path | Feature IDs | Description |
|---|---|---|
| `GET /examiner/projects` | `F-49`, `F-50`, `F-55` | Lists all projects assigned to the Examiner with Defence Schedule (`PE-03`) and Assessment Status (`PENDING`, `DRAFT`, `SUBMITTED`, `PUBLISHED_LOCKED` `PE-01`, `PE-11`, `FR-169`). |
| `GET /examiner/projects/{project_id}/package` | `F-48`, `F-50`, `F-51`, `F-77` | Retrieves the Examination Package (`PE-02`): approved title/abstract, student/group roster, Final Consolidated Project submission download link (`F-77`), defence details, and the Examiner's own Document (`F-52`) + Defence (`F-53`) rubric sheet (`FR-170`, `FR-171`). |
| `PUT /examiner/projects/{project_id}/assessment/draft` | `F-52`, `F-53`, `F-54` | Saves draft Document criterion scores (`PE-04`), Defence criterion scores (`PE-05`), and Formal Examination Feedback (`PE-08`) with exact decimal calculation (`FR-178`–`FR-186`). |
| `POST /examiner/projects/{project_id}/assessment/submit` | `F-52`–`F-55`, `F-58`, `F-82` | Formally submits or edits (`PE-09`, `PE-10`) the Examiner Assessment (`FR-187`–`FR-191`). If edited after Coordinator `F-59` approval (and before `F-60` publication), requires mandatory `edit_reason`, recalculates `F-58`, and **atomically reverts project approval status to `PENDING_COORDINATOR_REAPPROVAL` (`BR-NEW-03` / `PROP-03`)**. Blocked once `PUBLISHED` (`BR-21`). |

### 7.3 Project Supervisor Independent Performance Assessment Endpoints (`F-39`, `F-56`)

*Requires `active_role = PROJECT_SUPERVISOR` and an `ACTIVE` supervision assignment (`F-24`/`F-27`) on `project_id` (`SEC-12`). Strictly excludes Examiner scores (`BR-17`).*

| Method & Path | Feature IDs | Description |
|---|---|---|
| `GET /supervisor/projects/{project_id}/assessments` | `F-39`, `F-51`, `F-56` | Retrieves the Supervisor Performance Assessment rubric (default $30\text{ marks}$ `BR-18`) for the individual student or for **each individual student member of a group project (`F-39`, `PS-24`)** (`FR-129`–`FR-132`, `FR-193`–`FR-195`). |
| `PUT /supervisor/projects/{project_id}/students/{student_user_id}/assessment/draft` | `F-39`, `F-56` | Saves draft individual student performance and interaction criterion scores and qualitative feedback (`PS-21`, `PS-22`). |
| `POST /supervisor/projects/{project_id}/students/{student_user_id}/assessment/submit` | `F-39`, `F-56`, `F-58`, `F-82` | Formally submits or edits (`PS-23`, `PS-24`) the student's Supervisor Performance Assessment (`FR-196`, `FR-197`). Triggers `BR-NEW-03` re-approval safeguard if edited post-approval; permanently locked post-publication. |

### 7.4 Student Published Result, Breakdown & Completion Endpoints (`F-60`–`F-62`)

*Requires `active_role = STUDENT` and ownership/group membership of `project_id` (`SEC-11`). Enforces `FR-121` (a group member can view **only their own** individual Supervisor score and final grade).*

| Method & Path | Feature IDs | Description |
|---|---|---|
| `GET /student/projects/{project_id}/result-breakdown` | `F-60`, `F-61` | Returns `403/404` if not yet `PUBLISHED` (`FR-212`, `FR-215`). Once `PUBLISHED`, returns the student's private Final Score, Grade, Pass/Fail outcome (`ST-31`), shared Examiner Document & Defence scores, the student's **own** individual Supervisor Performance score (`F-39`/`F-56`), Late Penalty details (`F-44`), and formal feedback (`ST-32`, `FR-213`, `FR-214`). |
| `GET /student/projects/{project_id}/completion-status` | `F-62` | Returns the 5-condition Academic Completion Checklist and derived status (`IN_PROGRESS`, `COMPLETED`, `FAILED_INCOMPLETE` `ST-33`, `FR-216`–`FR-218`). |

#### Example Payload: `GET /student/projects/{project_id}/result-breakdown` (`F-60`, `F-61`, `BR-NEW-02`)
```json
// Response: 200 OK (Student A in Group CSC-2027-GRP-01 — Private to Student A per FR-121)
{
  "project_id": "prj_9912",
  "project_type": "GROUP",
  "group_code": "CSC-2027-GRP-01",
  "approved_topic_title": "AI-Driven Microgrid Load Forecasting for Nigerian Universities",
  "student_user_id": "usr_stu_01",
  "matriculation_number": "CSC/2022/045",
  "publication_status": "PUBLISHED",
  "published_at_local": "2027-06-15T14:30:00+01:00[Africa/Lagos]",
  "components": {
    "supervisor_performance_individual": {
      "awarded_score": 27.00,
      "max_marks": 30.00,
      "qualitative_feedback": "Exceptional leadership on the forecasting model implementation and consistent milestone attendance."
    },
    "examiner_document_shared": {
      "consolidated_score": 33.50,
      "max_marks": 40.00
    },
    "examiner_defence_shared": {
      "consolidated_score": 24.50,
      "max_marks": 30.00
    },
    "examiner_total_shared": {
      "consolidated_score": 58.00,
      "max_marks": 70.00,
      "consolidation_method": "ARITHMETIC_MEAN",
      "formal_examination_feedback": "Well-structured dissertation and strong live demonstration during oral defence."
    }
  },
  "calculation_summary": {
    "gross_score": 85.00,
    "effective_late_penalty_deducted": 0.00,
    "late_penalty_status": "WAIVED_BY_COORDINATOR",
    "final_rounded_score": 85.00,
    "total_max_marks": 100.00,
    "pass_mark_threshold": 45.00,
    "letter_grade": "A",
    "academic_outcome": "PASS"
  },
  "completion_status": "COMPLETED"
}
```

---

## 8. Module M, O & P: Notifications, Audit Logs & Disaster Recovery Endpoints (`F-71`–`F-75`, `F-79`, `F-80`, `F-82`, `F-83`)

| Method & Path | Feature IDs | Allowed Actors | Description |
|---|---|---|---|
| `GET /notifications` | `F-40`, `F-72`, `F-74`, `F-75` | All Authenticated Actors | Lists the authenticated user's persistent in-app notifications (`ALL` or `UNREAD`) with unread count badge and target deep links (`FR-250`–`FR-252`). |
| `POST /notifications/{notification_id}/read` & `POST /notifications/read-all` | `F-72` | All Authenticated Actors | Marks a single notification or all notifications for the current user as `is_read = true` (`FR-251`). |
| `GET /platform/audit-logs` | `F-08`, `F-82` | `PLATFORM_ADMIN` | Read-only paginated platform administrative and security audit log viewer with confidential academic payloads redacted (`FR-279`, `FR-283`). |
| `GET /institution/audit-logs` | `F-18`, `F-82` | `INSTITUTIONAL_ADMIN` | Read-only paginated institutional administrative audit log viewer querying `v_institutional_admin_audit_logs` (confidential academic grades/feedback redacted per `BR-25`, `FR-283`). |
| `GET /coordinator/audit-logs` | `F-82` | `PROJECT_COORDINATOR` | Read-only paginated academic decision audit log viewer scoped strictly to the Coordinator's active `(Programme, Academic Session)` appointment (`BR-03`, `FR-280`, `FR-283`). |
| `GET /platform/operations/backups` | `F-83` | `PLATFORM_ADMIN` | Lists hourly encrypted backup snapshots, 30-day retention status, $\text{RPO} \le 1\text{h}$ compliance status, and operational alerts (`FR-285`–`FR-289`). |
| `POST /platform/operations/backups/recovery-drill` | `F-82`, `F-83` | `PLATFORM_ADMIN` | Triggers/records an isolated disaster-recovery restoration verification drill and logs measured $\text{RTO} \le 4\text{ hours}$ and `SHA-256` manifest verification (`FR-290`, `REL-09`). |
| `GET /platform/operations/background-jobs` | `F-71`, `F-73`, `F-79`, `F-80` | `PLATFORM_ADMIN` | Monitors asynchronous notification retry queues, dead-letter alerts (`F-73`), deadline reminder scheduler runs (`F-79`), and missed deadline detection runs (`F-80`, `NFR-MON`). |