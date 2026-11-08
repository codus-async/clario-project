# Clario — MVP Feature Specification (`mvp-features.md`)

**Document Status:** Stage 2 — Feature Decomposition (Batch 1 of 5: Modules A & B)  
**Target Release:** Clario MVP (P0 Scope Only)  
**Platform:** Responsive Web Application (All Actors)  
**Launch Jurisdiction & Currency:** Nigeria (`NGN`)

---

## Batch 1 Overview — Platform & Institutional Administration

This batch specifies the 14 P0 features across **Module A (Platform Administration)** and **Module B (Institutional Administration)**:
- **Module A (Platform Administration):** `F-01`, `F-02`, `F-03`, `F-04`, `F-05`, `F-08` *(Note: `F-06` is P1 and `F-07` is P2; both are excluded from the MVP).*
- **Module B (Institutional Administration):** `F-09`, `F-10`, `F-11`, `F-12`, `F-13`, `F-14`, `F-15`, `F-16`, `F-18` *(Note: `F-17` is P1 and excluded from the MVP).*

---

# Module A: Platform Administration

## F-01: Institutional Account Management

### A. Feature Identification
- **Feature ID:** F-01
- **Feature Name:** Institutional Account Management
- **Feature Category:** Platform Administration (User-Facing Functionality)
- **Primary Actor:** Platform Admin
- **Supporting Actors:** Institutional Admin (receives onboarding invitation), Audit Process (`F-82`), Email Service (`F-71`)
- **MVP Priority:** P0
- **Source User Stories:** PA-01, PA-02, PA-03
- **Short Feature Description:** Enables Platform Admins to create, view, update, activate, suspend, and initiate termination/export for institutional tenant accounts on Clario.

### B. Business Purpose
- **Problem Solved:** Tertiary institutions require isolated, independently managed organizational environments before any academic structures, users, or projects can be administered.
- **Necessity for Clario:** Forms the root tenant boundary for Clario's multi-tenant SaaS model.
- **Business/Academic Value:** Enables rapid institutional onboarding, centralized operational status monitoring across all subscribed institutions, and controlled tenant suspension or offboarding.
- **Impact if Omitted:** No institution can be onboarded, isolated, billed, or governed on the platform.

### C. Functional Requirements
- **FR-001:** The system must allow an authenticated Platform Admin to create a new institutional tenant record with a unique institution name, unique institutional code/slug, country, configured timezone (defaulting to `Africa/Lagos` per `PROP-04`), primary administrative contact details, and initial status (`Pending Activation` or `Active`).
- **FR-002:** Upon institutional tenant creation, the system must automatically provision an isolated logical tenant boundary (`BR-01`) and trigger an onboarding invitation email (`F-71`) to the designated initial Institutional Admin email address.
- **FR-003:** The system must allow a Platform Admin to transition an institutional account status between `Pending Activation`, `Active`, `Suspended`, and `Pending Termination`, requiring a mandatory reason for `Suspended` and `Pending Termination` transitions.
- **FR-004:** When an institutional account is set to `Suspended`, the system must immediately block interactive academic and administrative operations for all users belonging to that institution (except Institutional Admin billing/account resolution access where applicable) and terminate or restrict active sessions (`F-65`, `F-66`).
- **FR-005:** The system must provide a searchable, filterable directory of all institutional tenants displaying institution name, code, account status, current subscription status (`F-03`), total active user count (against the 5,000-user launch capacity ceiling), and creation timestamp.
- **FR-006:** The system must allow a Platform Admin (or authorised Institutional Admin request) to generate a complete institutional data archive export (`PROP-05`, `NFR-BKP`) containing structured institutional records, project metadata, uploaded documents, and relevant audit logs for data portability or pre-termination recovery (`OD-10`).

### D. User Interaction and Behaviour
- **Access:** Accessed by Platform Admin via the Platform Administration Console -> "Institutions" section.
- **Information Viewed:** List and detail views of institutional tenants showing profile metadata, timezone, operational status badge, current subscription plan/expiry, active user count, and high-level administrative audit log entries (`F-82`).
- **Actions Performed:** Create New Institution, Edit Institution Metadata, Activate Institution, Suspend Institution (with reason modal), Reactivate Institution, Initiate Termination/Data Export.
- **Validations:** Institution name (required, 3–150 chars, unique case-insensitively), Institution code/slug (required, 2–20 alphanumeric/hyphen chars, unique), Timezone (valid IANA timezone identifier), Primary Contact Email (valid RFC 5322 email format), Status Change Reason (required for suspension/termination, 10–500 chars).
- **Post-Action Behaviour (Success):** Record persists, audit event (`F-82`) is written, success banner is displayed, and onboarding/status notification email (`F-71`) is queued.
- **Post-Action Behaviour (Failure):** Inline field validation errors or banner error message; no partial tenant provisioning occurs.
- **States:** Loading skeleton during tenant list fetch; Empty state ("No institutions registered yet — Create your first institution"); Error state with retry option if backend request fails.

### E. Business Rules
- **BR-01:** Every institution operates within its own strict institutional boundary.
- **BR-28:** All institutional account creations, updates, status transitions, and data export actions must be recorded in the administrative audit log.
- **BR-NEW-01 (Proposed under `PROP-04`):** Every institution must have a configured IANA timezone used as the authoritative reference for all milestone and assessment deadlines within that institution.

### F. Permissions and Access Control
- **Platform Admin:** Full access to create, view, update, activate, suspend, and initiate export for all institutional tenant records; cannot view confidential academic project contents (`F-08`).
- **Institutional Admin:** Read-only access to their own institution's profile metadata and ability to update their institution's timezone (`PROP-04`); no access to other institutions.
- **All Other Actors:** No access to `F-01`.

### G. Data Requirements
- **Captured:** Institution ID (system-generated immutable UUID), Institution Name, Institution Code/Slug, Country, Configured Timezone, Primary Contact Name, Primary Contact Email, Primary Contact Phone (optional), Account Status (`Pending Activation`, `Active`, `Suspended`, `Pending Termination`, `Terminated`), Status Change Reason, Created/Updated Timestamps, Created/Updated By Actor ID.
- **Displayed:** All captured fields plus aggregated active user count and linked subscription status (`F-03`).
- **Relationships:** Root parent of Faculties (`F-09`), Academic Sessions (`F-12`), Institutional Users (`F-13`), and Institutional Subscriptions (`F-03`).
- **Preserved/Protected:** Tenant ID is immutable; deleted/terminated tenants must follow the post-termination recovery period (`OD-10`) before permanent erasure.

### H. Dependencies and Integrations
- **Required Features:** `F-64` (Authentication), `F-66` (RBAC), `F-71` (Email Delivery), `F-82` (Audit Logging).
- **Triggers:** Onboarding invitation email (`F-71`); tenant access enforcement updates (`F-66`).

### I. Acceptance Criteria
- **AC-F01-01 (Positive — Tenant Creation):** Given an authenticated Platform Admin, When they submit the "Create Institution" form with unique Institution Name, unique Code, Timezone `Africa/Lagos`, and valid Primary Contact Email, Then the system creates the isolated tenant record, logs an audit entry (`F-82`), and dispatches an invitation email to the initial Institutional Admin.
- **AC-F01-02 (Validation — Duplicate Code):** Given an existing institution with code `UNILAG`, When a Platform Admin attempts to create another institution with code `unilag`, Then the system rejects the submission with a duplicate code validation error.
- **AC-F01-03 (Positive — Tenant Suspension):** Given an `Active` institution, When a Platform Admin suspends the institution and provides a valid reason, Then the institution status changes to `Suspended`, an audit record with previous and new status is created, and subsequent academic operations by users of that institution are blocked.
- **AC-F01-04 (Permission — Unauthorized Actor):** Given an authenticated Institutional Admin or Project Coordinator, When they attempt to access the Platform Admin institution creation or suspension operations, Then the system denies access with an authorization error.

---

## F-02: Subscription Plan Management

### A. Feature Identification
- **Feature ID:** F-02
- **Feature Name:** Subscription Plan Management
- **Feature Category:** Platform Administration (User-Facing Functionality)
- **Primary Actor:** Platform Admin
- **Supporting Actors:** Institutional Admin (views active plans during selection in `F-03`), Audit Process (`F-82`)
- **MVP Priority:** P0
- **Source User Stories:** PA-04
- **Short Feature Description:** Enables Platform Admins to create, update, activate, and retire institutional subscription plans priced in Nigerian Naira (`NGN`).

### B. Business Purpose
- **Problem Solved:** Institutions vary in size and billing cycle preferences and need structured commercial tiers to subscribe to Clario.
- **Necessity for Clario:** Provides the commercial catalogue required for institutional billing (`F-03`) and automated payment processing (`F-67`).
- **Business/Academic Value:** Standardizes pricing, user capacity limits, and billing intervals across institutional customers.
- **Impact if Omitted:** Institutions cannot select a plan or initiate automated subscription payments.

### C. Functional Requirements
- **FR-007:** The system must allow a Platform Admin to create a subscription plan specifying Plan Name, Plan Code, Description, Billing Interval (`Annual` or `Semester/Session` or `Monthly`), Price in `NGN` (stored in integer minor units/kobo), Maximum Active Users limit (up to 5,000 for MVP), and Status (`Draft`, `Active`, `Archived`).
- **FR-008:** The system must allow a Platform Admin to update plan descriptions, status, or pricing for future subscriptions while preserving the contracted price and capacity terms of currently active institutional subscriptions until their next renewal cycle.
- **FR-009:** The system must prevent the deletion of any subscription plan that has historical or active institutional subscriptions linked to it, allowing the plan only to be `Archived` (hidden from new selection).

### D. User Interaction and Behaviour
- **Access:** Platform Admin Console -> "Subscription Plans".
- **Information Viewed:** Table of subscription plans showing Name, Code, Billing Interval, Price in `NGN`, Max User Limit, Status, and count of subscribed institutions.
- **Actions Performed:** Create Plan, Edit Plan, Activate Plan, Archive Plan.
- **Validations:** Plan Name (required, unique), Plan Code (required, unique), Price (required, integer $\ge 0$ in `NGN` kobo), Max Active Users (required, integer between $1$ and $5000$), Billing Interval (required).
- **Post-Action Behaviour:** Plan changes take effect immediately for new selections in `F-03` and record an audit log entry (`F-82`).
- **States:** Loading state, Empty state ("No subscription plans configured"), Validation error state.

### E. Business Rules
- **BR-28:** All subscription plan creations, price modifications, and status transitions must be recorded in the administrative audit log.
- **BR-29:** Subscription plans apply strictly to institutional SaaS subscriptions in `NGN`, never to student project payments.

### F. Permissions and Access Control
- **Platform Admin:** Full create, read, update, and archive access.
- **Institutional Admin:** Read-only access to `Active` plans within their billing portal (`F-03`).
- **All Other Actors:** No access.

### G. Data Requirements
- **Captured:** Plan ID, Plan Name, Plan Code, Description, Currency (`NGN` fixed for launch), Amount in Minor Units (kobo), Billing Duration (in days/months), Max User Capacity, Plan Status (`Draft`, `Active`, `Archived`), Timestamps.
- **Preserved:** Historical pricing snapshots referenced by `F-03` billing records.

### H. Dependencies and Integrations
- **Required Features:** `F-64`, `F-66`, `F-82`.
- **Consumed By:** `F-03` (Institutional Subscription and Billing Management), `F-67` (Subscription Payment Processing).

### I. Acceptance Criteria
- **AC-F02-01 (Positive — Plan Creation):** Given an authenticated Platform Admin, When they create a plan with Price `NGN 2,500,000.00`, Billing Interval `Annual`, and Max Users `5000`, Then the plan is stored in exact integer minor units (`250000000` kobo), marked `Active`, and logged in `F-82`.
- **AC-F02-02 (Data Integrity — Archiving Plan in Use):** Given an `Active` subscription plan assigned to an institution, When a Platform Admin archives the plan, Then the plan is no longer selectable for new subscriptions, but the existing institution's active subscription remains unaffected.

---

## F-03: Institutional Subscription and Billing Management

### A. Feature Identification
- **Feature ID:** F-03
- **Feature Name:** Institutional Subscription and Billing Management
- **Feature Category:** Platform Administration & Institutional Billing (User-Facing Functionality)
- **Primary Actor:** Platform Admin
- **Supporting Actors:** Institutional Admin (`PROP-02` — selects plan, views invoices, initiates payment/renewal), Payment Gateway (`F-67`), Audit Process (`F-82`)
- **MVP Priority:** P0
- **Source User Stories:** PA-05, PA-06
- **Short Feature Description:** Enables Platform Admins to oversee all institutional subscriptions and billing records, and enables Institutional Admins (`PROP-02`) to view their institution's subscription status, manage billing details, select plans, and initiate subscription payments or renewals.

### B. Business Purpose
- **Problem Solved:** Both the SaaS operator (Platform Admin) and the customer (Institutional Admin) need transparent visibility and control over subscription lifecycles, billing contacts, invoices, and renewal dates.
- **Necessity for Clario:** Connects institutional tenant accounts (`F-01`) and subscription plans (`F-02`) to automated payment processing (`F-67`–`F-70`).
- **Business/Academic Value:** Ensures uninterrupted institutional service delivery through timely renewals and accurate billing administration.
- **Impact if Omitted:** Institutions cannot subscribe, renew, or view their billing status, and Platform Admins cannot track revenue or subscription health.

### C. Functional Requirements
- **FR-010:** The system must allow a Platform Admin to view and filter all institutional subscriptions across the platform by status (`Trial/Pending Payment`, `Active`, `Grace Period`, `Expired/Restricted`, `Cancelled`), plan (`F-02`), and renewal date.
- **FR-011:** The system must allow an Institutional Admin (`PROP-02`) to view their institution's current subscription plan, subscription status, start date, expiration date, grace-period end date (if applicable), and payment/invoice history.
- **FR-012:** The system must allow both Platform Admins and Institutional Admins (for their own tenant) to update institutional billing information (Billing Legal Name, Billing Address, Tax/RC Number, Billing Email, Billing Contact Phone).
- **FR-013:** The system must allow an Institutional Admin to select an `Active` subscription plan (`F-02`) and initiate a new subscription payment or renewal in `NGN`, invoking `F-67`.
- **FR-014:** The system must record every billing invoice and payment transaction attempt with a unique reference, linking it to the institutional subscription record.

### D. User Interaction and Behaviour
- **Access:** Platform Admin via "Subscriptions & Billing"; Institutional Admin via "Institution Settings -> Subscription & Billing" (`PROP-02`).
- **Information Viewed:** Current Plan card, Subscription Status badge, Validity Period (Start Date – End Date), Grace Period countdown (if in `Grace Period`), Billing Profile details, and Payment/Invoice History table (Reference, Date, Amount in `NGN`, Payment Status: `Pending`, `Paid`, `Failed`).
- **Actions Performed:** Assign/Select Plan, Edit Billing Details, Initiate Subscription Payment / Renewal (`Institutional Admin`), Download/View Invoice Receipt.
- **Validations:** Billing Legal Name (required), Billing Email (required, valid email), selected Plan must be `Active` and its Max User Capacity must be $\ge$ the institution's current active user count.
- **Post-Action Behaviour:** Billing updates save immediately with an audit log (`F-82`); clicking "Pay / Renew Subscription" creates a `Pending` payment transaction and redirects/opens the payment gateway checkout flow (`F-67`).
- **States:** Loading state, Empty payment history state, Banner warning when subscription is within 14 days of expiry or in `Grace Period` (`F-04`).

### E. Business Rules
- **BR-01 & BR-02:** An Institutional Admin can only view and manage billing for their own institution.
- **BR-28:** Subscription assignments, plan changes, and billing modifications are logged in `F-82`.
- **BR-29:** All subscription billing is strictly institutional in `NGN`.

### F. Permissions and Access Control
- **Platform Admin:** View and manage billing profiles and subscription assignments across all institutions.
- **Institutional Admin:** View subscription status, update billing profile, select plan, and initiate payment strictly for their own institution.
- **All Other Actors:** No access.

### G. Data Requirements
- **Captured:** Subscription ID, Institution ID (`F-01`), Plan ID (`F-02`), Subscription Status (`Pending Payment`, `Active`, `Grace Period`, `Expired`, `Cancelled`), Current Period Start Timestamp, Current Period End Timestamp, Grace Period End Timestamp (`F-04`), Billing Legal Name, Billing Email, Billing Address, Tax/Registration ID, Payment Transaction History records.
- **Relationships:** Links `F-01` (Institution) and `F-02` (Plan) to `F-67`–`F-70` (Payment & Access Enforcement).

### H. Dependencies and Integrations
- **Required Features:** `F-01`, `F-02`, `F-04`, `F-64`, `F-66`, `F-67`–`F-70`, `F-71`, `F-82`.

### I. Acceptance Criteria
- **AC-F03-01 (Positive — Institutional Billing Update & Plan Selection):** Given an authenticated Institutional Admin, When they update their institution's Billing Legal Name and Billing Email and select an `Active` plan to renew, Then the billing profile is saved, a `Pending` payment transaction is created in `NGN`, and the payment initiation workflow (`F-67`) starts.
- **AC-F03-02 (Validation — Plan Capacity Below Active Users):** Given an institution with $1,200$ active users, When an Institutional Admin attempts to select a subscription plan with a Max User Capacity of $1,000$, Then the system blocks plan selection and displays a capacity validation error.
- **AC-F03-03 (Permission — Cross-Tenant Billing Isolation):** Given an Institutional Admin of Institution A, When they attempt to view or access the billing records of Institution B, Then the system denies access (`BR-01`, `BR-02`).

---

## F-04: Subscription Grace Period Management

### A. Feature Identification
- **Feature ID:** F-04
- **Feature Name:** Subscription Grace Period Management
- **Feature Category:** Platform Administration (User-Facing Functionality)
- **Primary Actor:** Platform Admin
- **Supporting Actors:** Subscription Access Enforcement Service (`F-70`), Audit Process (`F-82`)
- **MVP Priority:** P0
- **Source User Stories:** PA-07
- **Short Feature Description:** Allows Platform Admins to configure default and institution-specific subscription grace periods (in days) that govern how long an institution retains access after its subscription period expires before access restrictions (`F-70`) are enforced.

### B. Business Purpose
- **Problem Solved:** Institutional procurement and bank approval cycles in tertiary institutions can experience administrative delays around renewal dates; immediate hard lockouts on day one of expiry would disrupt active academic defences or submissions.
- **Necessity for Clario:** Provides a configurable buffer period between subscription expiry and access restriction enforcement (`F-70`).
- **Business/Academic Value:** Balances revenue protection with academic continuity.
- **Impact if Omitted:** Expired institutions would either suffer immediate disruptive lockouts or continue using the platform indefinitely without payment controls.

### C. Functional Requirements
- **FR-015:** The system must allow a Platform Admin to configure a platform-wide default subscription grace period duration (in integer calendar days, e.g., $0$ to $90$ days) and optionally override the grace period duration for a specific institutional subscription (`F-03`).
- **FR-016:** When an active institutional subscription passes its `Current Period End Timestamp` without a verified renewal payment (`F-69`), the system must automatically calculate `Grace Period End Timestamp = Current Period End Timestamp + Configured Grace Period Days` (evaluated in the institution's timezone) and transition the subscription status to `Grace Period` (if Grace Period Days $> 0$) or immediately to `Expired` (if Grace Period Days $= 0$).
- **FR-017:** The system must expose configurable permission matrix toggles for the `Grace Period` state and the `Expired` state (`F-70`) so that once policy decision `OD-06` (`GAP-10`) is finalized, the exact allowed operations during grace period vs. post-expiry restriction are enforced without code changes.

### D. User Interaction and Behaviour
- **Access:** Platform Admin Console -> "Subscriptions & Billing -> Grace Period Settings" (and per-institution override on the Institution Subscription detail view).
- **Information Viewed:** Default Grace Period (days), Per-Institution Grace Period Override (days, optional), Calculated Grace Period End Date, Audit reason for override.
- **Actions Performed:** Update Default Grace Period, Set/Clear Institution Grace Period Override.
- **Validations:** Grace period duration must be an integer between $0$ and $90$ days; per-institution override requires a mandatory justification note ($10$–$300$ chars).
- **Post-Action Behaviour:** Updates recalculate the `Grace Period End Timestamp` for any currently affected subscription, trigger `F-70` evaluation, and log an audit record (`F-82`).
- **States:** Loading, Success toast, Validation error state.

### E. Business Rules
- **BR-28:** All changes to default or institution-specific grace periods are logged in the administrative audit trail (`F-82`).
- **Open Decision Reference (`OD-06` / `GAP-10`):** Which specific actor operations remain permitted during the `Grace Period` versus after `Expired` restrictions begin is tracked in `mvp-open-decisions.md`.

### F. Permissions and Access Control
- **Platform Admin:** Full access to configure default and per-institution grace periods.
- **Institutional Admin:** Read-only visibility of their institution's grace period end date when their subscription is expiring or in `Grace Period`.
- **All Other Actors:** No access.

### G. Data Requirements
- **Captured:** Default Grace Period Days (integer), Institution Override Grace Period Days (nullable integer), Override Justification, Calculated Grace Period End Timestamp, Updated By Actor ID, Timestamp.

### H. Dependencies and Integrations
- **Required Features:** `F-03`, `F-64`, `F-66`, `F-70` (Subscription Access Enforcement), `F-82`.

### I. Acceptance Criteria
- **AC-F04-01 (Positive — Grace Period Calculation):** Given an institution with an active subscription expiring on `2026-11-30 23:59:59 WAT` and a configured grace period of `14` days, When the subscription end timestamp passes without renewal, Then the subscription transitions to `Grace Period` with `Grace Period End Timestamp` set to `2026-12-14 23:59:59 WAT`.
- **AC-F04-02 (Validation — Invalid Grace Period Value):** Given an authenticated Platform Admin, When they attempt to set a negative grace period (`-5` days) or non-integer value, Then the system rejects the input with a validation error.

---

## F-05: Platform Administrator Management

### A. Feature Identification
- **Feature ID:** F-05
- **Feature Name:** Platform Administrator Management
- **Feature Category:** Platform Administration (User-Facing Functionality)
- **Primary Actor:** Platform Admin
- **Supporting Actors:** Authentication Service (`F-64`), Email Service (`F-71`), Audit Process (`F-82`)
- **MVP Priority:** P0
- **Source User Stories:** PA-08
- **Short Feature Description:** Enables existing Platform Admins to invite, view, update, enforce MFA on, and deactivate other Platform Admin accounts.

### B. Business Purpose
- **Problem Solved:** Platform operations cannot rely on a single shared superuser credential; individual, accountable Platform Admin accounts are required for operational continuity and security auditability.
- **Necessity for Clario:** Distributes platform management responsibilities while maintaining individual accountability and mandatory MFA (`SEC-06`).
- **Business/Academic Value:** Reduces operational bottleneck and single-point-of-failure risk for the SaaS operator.
- **Impact if Omitted:** Platform administration would rely on un-auditable shared credentials or database-level manual provisioning.

### C. Functional Requirements
- **FR-018:** The system must allow an authenticated Platform Admin to invite a new Platform Admin by specifying Full Name and Email Address, generating a time-limited single-use onboarding token sent via `F-71`.
- **FR-019:** The system must enforce mandatory Multi-Factor Authentication (`MFA`, `SEC-06`) enrollment during a Platform Admin's initial account activation before granting access to any Platform Admin functionality (`F-64`).
- **FR-020:** The system must allow a Platform Admin to deactivate another Platform Admin account, immediately revoking all active sessions (`F-65`) for the deactivated administrator.
- **FR-021:** The system must prevent a Platform Admin from deactivating their own currently authenticated account or deactivating the last remaining active Platform Admin account on the platform.

### D. User Interaction and Behaviour
- **Access:** Platform Admin Console -> "Platform Administrators".
- **Information Viewed:** List of Platform Admins showing Full Name, Email, Account Status (`Invited`, `Active`, `Deactivated`), MFA Status (`Enrolled`, `Pending`), Last Login Timestamp.
- **Actions Performed:** Invite Platform Admin, Resend Invitation, Update Name, Deactivate/Reactivate Platform Admin.
- **Validations:** Full Name (required, 2–100 chars), Email (required, valid format, unique across platform admins).
- **Post-Action Behaviour:** Invitation email sent (`F-71`); deactivation terminates sessions (`F-65`); all actions logged in `F-82`.
- **States:** Loading, Empty search filter state, Error banner when attempting self-deactivation.

### E. Business Rules
- **BR-28:** Creation, invitation, status changes, and role modifications of Platform Admins must be recorded in the administrative audit log (`F-82`).
- **SEC-06:** MFA is strictly mandatory for all Platform Admins.

### F. Permissions and Access Control
- **Platform Admin:** Full access to manage Platform Admin accounts (except self-deactivation).
- **All Institutional Actors:** No access.

### G. Data Requirements
- **Captured:** Platform Admin User ID, Full Name, Email Address, Password Hash (`F-64`), MFA Secret/Enrollment Status, Account Status (`Invited`, `Active`, `Deactivated`), Invitation Token & Expiry, Last Login Timestamp, Created/Updated By.

### H. Dependencies and Integrations
- **Required Features:** `F-64`, `F-65`, `F-66`, `F-71`, `F-82`.

### I. Acceptance Criteria
- **AC-F05-01 (Positive — Platform Admin Invitation & MFA Enforcement):** Given an authenticated Platform Admin, When they invite a new Platform Admin via email and the invitee sets a password, Then the system requires the invitee to complete MFA enrollment (`SEC-06`) before granting access to the Platform Admin console.
- **AC-F05-02 (Boundary — Prevent Self-Deactivation / Last Admin Lockout):** Given an authenticated Platform Admin, When they attempt to deactivate their own account, Then the system blocks the action and displays an error message stating that administrators cannot deactivate their own account.

---

## F-08: Institutional Academic Data Protection

### A. Feature Identification
- **Feature ID:** F-08
- **Feature Name:** Institutional Academic Data Protection
- **Feature Category:** Platform Administration & Security Enforcement (Supporting System Capability & Access Control)
- **Primary Actor:** Platform Admin (Subject of Restriction)
- **Supporting Actors:** Access Control Service (`F-66`), Audit Process (`F-82`)
- **MVP Priority:** P0
- **Source User Stories:** PA-11
- **Short Feature Description:** Enforces strict technical boundaries preventing Platform Admins from having unrestricted default access to confidential institutional academic records (student project documents, topic proposals, supervisor/examiner feedback, and unpublished/published student grades), and logs any authorised break-glass diagnostic access.

### B. Business Purpose
- **Problem Solved:** Tertiary institutions act as Data Controllers (`PRV-01`) for their academic records and intellectual property; unrestricted SaaS operator browsing of student dissertations, exam scores, and supervisory feedback violates institutional confidentiality and data protection principles.
- **Necessity for Clario:** Enforces `SEC-15` and `SEC-16` at the authorization layer.
- **Business/Academic Value:** Builds institutional trust and ensures compliance with the Nigeria Data Protection Act 2023 (`NDPA`).
- **Impact if Omitted:** Platform Admins would have unrestricted visibility into confidential academic submissions and grading records across all tenants.

### C. Functional Requirements
- **FR-022:** By default, the system must block Platform Admin accounts from querying, viewing, or downloading student topic proposals (`F-20`), uploaded milestone/final project documents (`F-32`, `F-37`, `F-77`), submission feedback and discussions (`F-33`, `F-34`), and Supervisor/Examiner assessment scores or comments (`F-52`–`F-61`).
- **FR-023:** The system must restrict Platform Admin visibility of institutional tenants to operational, structural, and subscription metadata (`F-01`, `F-03`, aggregate user counts, and system health metrics).
- **FR-024:** Where restricted diagnostic or institutional data export (`FR-006`) support access is executed by a Platform Admin on behalf of an institution (`SEC-16`), the system must require an explicit support reference/justification, scope the action to a time-limited session, and record an immutable high-priority audit log entry (`F-82`) visible to the affected institution's Institutional Admin.

### D. User Interaction and Behaviour
- **Access:** Automatically enforced across all Platform Admin views and API endpoints (`F-66`).
- **Information Viewed:** Platform Admins see tenant operational metrics and subscription status; academic content routes return `403 Forbidden — Confidential Institutional Academic Record`.
- **Actions Performed:** If initiating an authorised institutional data export (`FR-006`) or diagnostic action, the Platform Admin must enter a mandatory Institutional Request Reference and Justification.
- **Post-Action Behaviour:** Unauthorised access attempts are blocked and logged as security events (`F-82`); authorised support actions record a tamper-resistant audit entry.

### E. Business Rules
- **BR-01 & BR-02:** Strict institutional boundary and scope enforcement.
- **SEC-15 & SEC-16:** Platform Admins must not have unrestricted default access to institutional academic records; any authorised support access must be restricted and audited.

### F. Permissions and Access Control
- **System Access Control (`F-66`):** Denies Platform Admin role access to all academic content endpoints (`F-20`–`F-62`, `F-77`).

### G. Data Requirements
- **Captured:** Security/Audit Log Record containing Platform Admin ID, Target Institution ID, Attempted Resource/Operation, Support Reference & Justification (if applicable), Outcome (`Denied` or `Authorised Support Action`), Timestamp.

### H. Dependencies and Integrations
- **Required Features:** `F-66` (Role and Scope-Based Access Control), `F-77` (Authorised Document Retrieval), `F-82` (Audit Logging).

### I. Acceptance Criteria
- **AC-F08-01 (Permission — Block Default Academic Document & Grade Access):** Given an authenticated Platform Admin, When they attempt to access a student's project workspace, download a project document (`F-77`), or view an examiner's grading sheet, Then the system denies the request with a `403 Forbidden` response and logs the denied attempt.
- **AC-F08-02 (Audit — Restricted Support Action Logging):** Given an authenticated Platform Admin executing an authorised institutional archive export (`FR-006`), When they submit the action with a valid Institutional Request Reference, Then the system records an immutable audit log entry (`F-82`) visible to the Institution's Institutional Admin.

---

# Module B: Institutional Administration

## F-09: Faculty Management

### A. Feature Identification
- **Feature ID:** F-09
- **Feature Name:** Faculty Management
- **Feature Category:** Institutional Administration (User-Facing Functionality)
- **Primary Actor:** Institutional Admin
- **Supporting Actors:** Audit Process (`F-82`)
- **MVP Priority:** P0
- **Source User Stories:** IA-01
- **Short Feature Description:** Enables Institutional Admins to create, view, update, and deactivate/archive Faculties (the top-level academic division within an institution).

### B. Business Purpose
- **Problem Solved:** Tertiary institutions organize departments and degree programmes under faculties (or colleges/schools); without faculty records, the institutional hierarchy (`Institution -> Faculty -> Department -> Programme -> Academic Session`) cannot be established.
- **Necessity for Clario:** Establishes the first level of the academic hierarchy within an institutional tenant.
- **Business/Academic Value:** Mirrors the real-world organizational structure of universities and polytechnics.
- **Impact if Omitted:** Departments (`F-10`) and Programmes (`F-11`) cannot be structured under their parent faculties.

### C. Functional Requirements
- **FR-025:** The system must allow an Institutional Admin to create a Faculty within their institution by providing a Faculty Name, Faculty Code, and optional Description.
- **FR-026:** The system must enforce uniqueness of Faculty Name and Faculty Code within the same institution (`BR-01`), while allowing different institutions to use identical faculty names or codes.
- **FR-027:** The system must allow an Institutional Admin to update Faculty Name, Code, Description, or Status (`Active`, `Archived`), and must prevent deletion or archiving of a Faculty that contains active Departments (`F-10`).

### D. User Interaction and Behaviour
- **Access:** Institutional Admin Console -> "Academic Structure -> Faculties".
- **Information Viewed:** List of Faculties within the institution showing Faculty Name, Faculty Code, Number of Departments, Status (`Active`, `Archived`), and Created Date.
- **Actions Performed:** Create Faculty, Edit Faculty, Archive/Reactivate Faculty.
- **Validations:** Faculty Name (required, 2–150 chars, unique within institution), Faculty Code (required, 2–20 chars, unique within institution).
- **Post-Action Behaviour:** Faculty is saved, list updates, and an audit log entry (`F-82`) is recorded.
- **States:** Loading state, Empty state ("No faculties created yet — Create your first faculty to begin setting up departments"), Error validation state.

### E. Business Rules
- **BR-01 & BR-02:** Faculties are strictly scoped to the Institutional Admin's institution.
- **BR-28:** Faculty creation, modification, and status changes are logged in `F-82`.

### F. Permissions and Access Control
- **Institutional Admin:** Full create, read, update, and archive access within their own institution.
- **Project Coordinator / Supervisor / Student / Examiner:** Read-only visibility of their associated Faculty name where displayed in profile/project context.

### G. Data Requirements
- **Captured:** Faculty ID, Institution ID (`F-01`), Faculty Name, Faculty Code, Description (optional), Status (`Active`, `Archived`), Created/Updated Timestamps, Created/Updated By.
- **Relationships:** Belongs to one Institution (`F-01`); has many Departments (`F-10`).

### H. Dependencies and Integrations
- **Required Features:** `F-01`, `F-64`, `F-66`, `F-82`.
- **Consumed By:** `F-10` (Department Management).

### I. Acceptance Criteria
- **AC-F09-01 (Positive — Faculty Creation):** Given an authenticated Institutional Admin of Institution A, When they create a Faculty named `Faculty of Engineering` with code `ENG`, Then the Faculty is saved under Institution A and logged in `F-82`.
- **AC-F09-02 (Multi-Tenant Uniqueness):** Given `Faculty of Engineering` (`ENG`) exists in Institution A, When an Institutional Admin of Institution B creates `Faculty of Engineering` (`ENG`), Then the system allows it without conflict; When Institution A attempts to create a second Faculty with code `ENG`, the system rejects it with a duplicate error.
- **AC-F09-03 (Data Integrity — Prevent Archiving Faculty with Active Departments):** Given a Faculty with at least one `Active` Department (`F-10`), When the Institutional Admin attempts to archive the Faculty, Then the system blocks the action and instructs the user to archive or reassign the child departments first.

---

## F-10: Department Management

### A. Feature Identification
- **Feature ID:** F-10
- **Feature Name:** Department Management
- **Feature Category:** Institutional Administration (User-Facing Functionality)
- **Primary Actor:** Institutional Admin
- **Supporting Actors:** Audit Process (`F-82`)
- **MVP Priority:** P0
- **Source User Stories:** IA-02
- **Short Feature Description:** Enables Institutional Admins to create, view, update, and archive academic Departments within Faculties (`F-09`).

### B. Business Purpose
- **Problem Solved:** Academic degree programmes and supervisors belong to specific academic departments under a faculty.
- **Necessity for Clario:** Establishes the second level of the institutional academic hierarchy (`Faculty -> Department`).
- **Business/Academic Value:** Organizes programmes (`F-11`) and supervisor pools (`F-16`) by department.
- **Impact if Omitted:** Programmes (`F-11`) cannot be linked to departments, breaking the required institutional hierarchy.

### C. Functional Requirements
- **FR-028:** The system must allow an Institutional Admin to create a Department within their institution by selecting an `Active` parent Faculty (`F-09`) and specifying a Department Name, Department Code, and optional Description.
- **FR-029:** The system must enforce uniqueness of Department Name and Department Code within the institution.
- **FR-030:** The system must allow an Institutional Admin to update Department details, reassign parent Faculty (within the same institution), or change Status (`Active`, `Archived`), and must prevent archiving a Department that has active Programmes (`F-11`).

### D. User Interaction and Behaviour
- **Access:** Institutional Admin Console -> "Academic Structure -> Departments".
- **Information Viewed:** Filterable list of Departments showing Department Name, Code, Parent Faculty Name, Number of Programmes, and Status.
- **Actions Performed:** Create Department, Edit Department, Archive/Reactivate Department.
- **Validations:** Parent Faculty (required, must be `Active` and belong to the same institution), Department Name (required, 2–150 chars, unique in institution), Department Code (required, 2–20 chars, unique in institution).
- **Post-Action Behaviour:** Department record persists, UI updates, and audit entry (`F-82`) is written.
- **States:** Loading state, Empty state (with prompt to create a Faculty first if no Faculty exists), Validation error state.

### E. Business Rules
- **BR-01 & BR-02:** Strictly scoped to the Institutional Admin's institution.
- **BR-28:** All Department creation and update actions are audited (`F-82`).

### F. Permissions and Access Control
- **Institutional Admin:** Full create, read, update, and archive access within their own institution.
- **Other Institutional Actors:** Read-only visibility of their associated Department name/code.

### G. Data Requirements
- **Captured:** Department ID, Institution ID (`F-01`), Faculty ID (`F-09`), Department Name, Department Code, Description (optional), Status (`Active`, `Archived`), Timestamps.
- **Relationships:** Belongs to one Faculty (`F-09`) and one Institution (`F-01`); has many Programmes (`F-11`) and Supervisor Records (`F-16`).

### H. Dependencies and Integrations
- **Required Features:** `F-01`, `F-09`, `F-64`, `F-66`, `F-82`.
- **Consumed By:** `F-11` (Programme Management), `F-16` (Supervisor Records Management).

### I. Acceptance Criteria
- **AC-F10-01 (Positive — Department Creation):** Given an `Active` Faculty `ENG` in Institution A, When the Institutional Admin creates Department `Computer Engineering` with code `CPE` under `ENG`, Then the Department is created, linked to `ENG`, and logged in `F-82`.
- **AC-F10-02 (Validation — Archived Parent Faculty):** Given an `Archived` Faculty, When an Institutional Admin attempts to create a new Department under that Faculty, Then the system rejects the action with a validation error.

---

## F-11: Programme Management

### A. Feature Identification
- **Feature ID:** F-11
- **Feature Name:** Programme Management
- **Feature Category:** Institutional Administration (User-Facing Functionality)
- **Primary Actor:** Institutional Admin
- **Supporting Actors:** Project Coordinator (operates within assigned Programme scope), Audit Process (`F-82`)
- **MVP Priority:** P0
- **Source User Stories:** IA-03
- **Short Feature Description:** Enables Institutional Admins to create, view, update, and archive academic Programmes within Departments (`F-10`).

### B. Business Purpose
- **Problem Solved:** Final-year projects, grading rubrics, milestone structures, and Project Coordinator appointments are administered at the academic Programme level (e.g., `B.Sc. Computer Science`, `B.Eng. Electrical Engineering`).
- **Necessity for Clario:** Establishes the third level of the institutional hierarchy (`Faculty -> Department -> Programme`) and serves as the primary operational unit for Project Coordinators (`BR-03`).
- **Business/Academic Value:** Allows different degree programmes within the same department to maintain distinct project milestones (`F-29`), grading structures (`F-51`), and coordinators (`F-15`).
- **Impact if Omitted:** Project Coordinators cannot be appointed (`F-15`), and students (`F-19`) cannot be registered into a programme.

### C. Functional Requirements
- **FR-031:** The system must allow an Institutional Admin to create an academic Programme by selecting an `Active` parent Department (`F-10`) and specifying Programme Name, Programme Code, Degree/Award Title (optional, e.g., `B.Sc.`, `B.Eng.`, `HND`), and Status (`Active`, `Archived`).
- **FR-032:** The system must enforce uniqueness of Programme Name and Programme Code within the institution.
- **FR-033:** The system must prevent archiving or deleting a Programme that has active Coordinator appointments (`F-15`) or active student project records (`F-19`) in an active Academic Session (`F-12`).

### D. User Interaction and Behaviour
- **Access:** Institutional Admin Console -> "Academic Structure -> Programmes".
- **Information Viewed:** Filterable table (by Faculty and Department) showing Programme Name, Programme Code, Parent Department, Parent Faculty, Active Coordinator(s) for the current session, and Status.
- **Actions Performed:** Create Programme, Edit Programme, Archive/Reactivate Programme.
- **Validations:** Parent Department (required, `Active`, same institution), Programme Name (required, 2–150 chars, unique in institution), Programme Code (required, 2–25 chars, unique in institution).
- **Post-Action Behaviour:** Programme saved, UI updated, audit event (`F-82`) recorded.
- **States:** Loading, Empty state, Validation error state.

### E. Business Rules
- **BR-01 & BR-02:** Strictly scoped to the Institutional Admin's institution.
- **BR-03:** A Programme (paired with an Academic Session in `F-15`) defines the exact scope of a Project Coordinator assignment.
- **BR-28:** All Programme management operations are logged in `F-82`.

### F. Permissions and Access Control
- **Institutional Admin:** Full create, read, update, and archive access within their institution.
- **Project Coordinator:** Read access to their assigned Programme(s).

### G. Data Requirements
- **Captured:** Programme ID, Institution ID (`F-01`), Faculty ID (`F-09`), Department ID (`F-10`), Programme Name, Programme Code, Degree/Award Type (optional), Status (`Active`, `Archived`), Timestamps.
- **Relationships:** Belongs to one Department (`F-10`); referenced by Coordinator Appointments (`F-15`), Student Registrations (`F-19`), Milestone Configurations (`F-29`), and Assessment Structures (`F-51`).

### H. Dependencies and Integrations
- **Required Features:** `F-01`, `F-09`, `F-10`, `F-64`, `F-66`, `F-82`.
- **Consumed By:** `F-15`, `F-19`, `F-29`, `F-51`.

### I. Acceptance Criteria
- **AC-F11-01 (Positive — Programme Creation):** Given an `Active` Department `CPE`, When the Institutional Admin creates Programme `B.Eng. Computer Engineering` with code `BENG-CPE`, Then the Programme is saved under `CPE` and logged in `F-82`.
- **AC-F11-02 (Data Integrity — Prevent Archiving Programme with Active Session Projects):** Given a Programme with registered students in an `Active` Academic Session, When the Institutional Admin attempts to archive the Programme, Then the system blocks the action and displays an error message.

---

## F-12: Academic Session Management

### A. Feature Identification
- **Feature ID:** F-12
- **Feature Name:** Academic Session Management
- **Feature Category:** Institutional Administration (User-Facing Functionality)
- **Primary Actor:** Institutional Admin
- **Supporting Actors:** Project Coordinator, Audit Process (`F-82`)
- **MVP Priority:** P0
- **Source User Stories:** IA-04
- **Short Feature Description:** Enables Institutional Admins to create, manage, activate, and close Academic Sessions (e.g., `2026/2027`) within their institution, as well as view/update the institution's configured timezone (`PROP-04`).

### B. Business Purpose
- **Problem Solved:** Final-year projects are cohort-bound by academic year/session; institutions need to separate current-year projects, coordinator appointments, milestones, and results from past or upcoming academic years.
- **Necessity for Clario:** Completes the institutional hierarchy (`Institution -> Faculty -> Department -> Programme -> Academic Session`) and bounds Coordinator scope (`BR-03`).
- **Business/Academic Value:** Enables clean multi-year operation while preserving historical session records in read-only closed states.
- **Impact if Omitted:** Coordinator appointments (`F-15`), student registrations (`F-19`), and project lifecycles cannot be scoped to an academic year.

### C. Functional Requirements
- **FR-034:** The system must allow an Institutional Admin to create an Academic Session by specifying a unique Session Name/Label (e.g., `2026/2027`), Start Date, End Date, and Status (`Upcoming`, `Active`, `Closed`).
- **FR-035:** The system must validate that the Session `End Date` is strictly chronologically after the `Start Date` (evaluated in the institution's configured timezone).
- **FR-036:** The system must allow an Institutional Admin to view and update the institution's configured IANA timezone (`PROP-04`, `NFR-DOM`), applying the timezone to all deadline evaluations across the institution.
- **FR-037:** When an Academic Session is transitioned to `Closed`, the system must preserve all projects, submissions, assessments, and published results within that session in an immutable, read-only state.

### D. User Interaction and Behaviour
- **Access:** Institutional Admin Console -> "Academic Structure -> Academic Sessions" (and Timezone setting in Institutional Settings header).
- **Information Viewed:** List of Academic Sessions showing Session Name, Start Date, End Date, Status (`Upcoming`, `Active`, `Closed`), and institution Timezone banner (e.g., `Africa/Lagos (WAT, UTC+1)`).
- **Actions Performed:** Create Session, Edit Session Dates/Name, Activate Session, Close Session (with confirmation dialog), Update Institutional Timezone (`PROP-04`).
- **Validations:** Session Name (required, unique within institution, 4–50 chars), Start Date (required, valid date), End Date (required, valid date $>$ Start Date).
- **Post-Action Behaviour:** Session saved, status updated, audit log (`F-82`) written.
- **States:** Loading, Empty state, Confirmation modal before closing an `Active` session.

### E. Business Rules
- **BR-01 & BR-02:** Strictly scoped to the institution.
- **BR-03:** Every Project Coordinator assignment is scoped to one Programme (`F-11`) and one Academic Session (`F-12`).
- **BR-28:** Session creation, status changes, and timezone updates are logged in `F-82`.
- *(Note: Automated Incomplete Project Carry-Forward `F-63`/`F-81`/`BR-24` is deferred to P1; see Open Decision `OD-03`/`GAP-07` for manual session setup interaction).*

### F. Permissions and Access Control
- **Institutional Admin:** Full create, read, update, activate, and close access within their institution.
- **Project Coordinator / Supervisor / Student / Examiner:** Read access to sessions relevant to their assignments.

### G. Data Requirements
- **Captured:** Academic Session ID, Institution ID (`F-01`), Session Name, Start Date, End Date, Session Status (`Upcoming`, `Active`, `Closed`), Created/Updated Timestamps.
- **Relationships:** Belongs to one Institution (`F-01`); scopes Coordinator Appointments (`F-15`), Student Registrations (`F-19`), Projects (`F-21`), and Milestones (`F-29`).

### H. Dependencies and Integrations
- **Required Features:** `F-01`, `F-64`, `F-66`, `F-82`.
- **Consumed By:** `F-15`, `F-19`–`F-62`.

### I. Acceptance Criteria
- **AC-F12-01 (Positive — Session Creation):** Given an authenticated Institutional Admin, When they create session `2026/2027` with Start Date `2026-10-01`, End Date `2027-07-31`, and Status `Active`, Then the session is created and available for Coordinator appointment (`F-15`).
- **AC-F12-02 (Validation — Invalid Date Range):** Given an authenticated Institutional Admin, When they attempt to create or update a session where `End Date <= Start Date`, Then the system rejects the submission with a date validation error.
- **AC-F12-03 (Data Integrity — Closed Session Read-Only Enforcement):** Given an Academic Session transitioned to `Closed`, When a Student or Examiner attempts to make a new submission or modify an assessment in that session, Then the system blocks the write operation.

---

## F-13: Institutional User Management

### A. Feature Identification
- **Feature ID:** F-13
- **Feature Name:** Institutional User Management
- **Feature Category:** Institutional Administration (User-Facing Functionality)
- **Primary Actor:** Institutional Admin
- **Supporting Actors:** Project Coordinator (registers/manages student project records in `F-19`), Authentication Service (`F-64`), Email Service (`F-71`), Audit Process (`F-82`)
- **MVP Priority:** P0
- **Source User Stories:** IA-05, IA-06, IA-07
- **Short Feature Description:** Enables Institutional Admins to create/register (individually or via bulk CSV import), invite, update, manage under-18 parental/guardian consent flags (`PROP-05`), assist with account recovery (`SEC-08`), and deactivate institutional user accounts.

### B. Business Purpose
- **Problem Solved:** Institutions have hundreds or thousands of students, supervisors, coordinators, and examiners who need authenticated, tenant-scoped accounts to participate in Clario workflows.
- **Necessity for Clario:** Provides user onboarding, lifecycle management, and data-subject record maintenance within each institution.
- **Business/Academic Value:** Centralizes user directory management and allows immediate deactivation of users who leave the institution.
- **Impact if Omitted:** No institutional staff or students can log into Clario or be assigned to roles, supervision, or examination.

### C. Functional Requirements
- **FR-038:** The system must allow an Institutional Admin to create and invite institutional users individually or via validated bulk CSV upload (supporting Full Name, Email Address, Institutional ID/Staff/Matriculation Number, Primary Department/Programme, Initial Role (`F-14`), and Under-18 Minor Indicator (`PROP-05`)).
- **FR-039:** Before creating new active users, the system must verify that adding the users will not exceed the institution's subscribed plan user capacity (`F-02`, `F-03`) or the MVP ceiling of $5,000$ users per institution (`SCA-02`).
- **FR-040:** Upon user creation, the system must dispatch an onboarding invitation email (`F-71`) containing a secure, time-limited activation link for the user to set their password (and enroll in MFA if assigned an Institutional Admin or Project Coordinator role per `SEC-06`).
- **FR-041:** Where a student user is flagged as Under 18 (`NFR-PRV: Students under 18`, `PROP-05`) and institutional policy requires parental/guardian consent for the applicable processing activity, the system must record Guardian Name, Guardian Email, and Consent Verification Status (`Pending`, `Verified`, `Not Required - Statutory Educational Basis`), and allow the Institutional Admin to oversee and verify consent status.
- **FR-042:** The system must allow an Institutional Admin to update user profile information (Full Name, Email, Institutional ID/Staff/Matriculation Number, Department affiliation) to satisfy data accuracy and correction rights (`NFR-PRV`), logging changes in `F-82`.
- **FR-043:** The system must allow an Institutional Admin to deactivate an institutional user account, immediately terminating the user's active sessions (`F-65`) and blocking login (`F-64`) while preserving all historical academic submissions, feedback, and audit records associated with that user.
- **FR-044:** The system must allow an Institutional Admin to trigger a password recovery/reset email or clear a temporary login lockout (`SEC-05`, `SEC-08`) for an institutional user within their tenant.

### D. User Interaction and Behaviour
- **Access:** Institutional Admin Console -> "Users Directory".
- **Information Viewed:** Searchable, paginated user directory filterable by Role (`F-14`), Department (`F-10`), and Account Status (`Invited`, `Active`, `Deactivated`), showing Name, Email, Staff/Matric Number, Roles, MFA Status, Under-18 Consent Status (if applicable), and Last Login.
- **Actions Performed:** Create User, Bulk Upload Users (CSV with row-by-row validation preview), Edit User, Resend Invite, Trigger Password Reset / Unlock Account (`SEC-08`), Deactivate/Reactivate User.
- **Validations:** Full Name (required, 2–120 chars), Email (required, valid format, unique within institution), Institutional ID/Matric/Staff Number (required, unique within institution), Capacity Check (total active/invited users $\le$ plan limit and $\le 5000$).
- **Post-Action Behaviour:** User created/updated, invitation email queued (`F-71`), sessions revoked on deactivation (`F-65`), audit entry written (`F-82`).
- **States:** Loading state, Bulk CSV validation summary modal (showing valid rows vs. error rows with line numbers), Empty state, Error state.

### E. Business Rules
- **BR-01 & BR-02:** Institutional Admins can only manage users belonging to their own institution.
- **BR-28:** User creation, bulk import, profile modification, role change, and deactivation are logged in `F-82`.
- **NFR-PRV (Deletion & Retention Safeguard):** Deactivating a user or handling an erasure request must never delete academic project records, submissions, or grades that the institution is legally or academically required to retain.

### F. Permissions and Access Control
- **Institutional Admin:** Full create, read, update, invite, password-recovery assist, and deactivate access for users in their institution (cannot deactivate their own currently logged-in account).
- **Project Coordinator:** Can register and manage Student project records within their assigned Programme and Academic Session (`F-19`).
- **All Users:** Can view their own profile and request corrections to inaccurate personal data.

### G. Data Requirements
- **Captured:** User ID, Institution ID (`F-01`), Full Name, Email Address, Institutional ID (Staff/Matric Number), Primary Department ID (`F-10`, optional for non-academic admins), Account Status (`Invited`, `Active`, `Deactivated`), Under-18 Flag (boolean), Guardian Email & Consent Status (nullable), Password Hash (`F-64`), MFA Status (`F-64`), Timestamps.
- **Protected:** Credentials and MFA secrets (`SEC-20`); personal data protected under `NDPA 2023`.

### H. Dependencies and Integrations
- **Required Features:** `F-01`, `F-03`, `F-10`, `F-14`, `F-64`, `F-65`, `F-66`, `F-71`, `F-82`.

### I. Acceptance Criteria
- **AC-F13-01 (Positive — Single & Bulk User Registration):** Given an authenticated Institutional Admin within subscription capacity, When they create a user or upload a valid CSV of users, Then the system creates the user records scoped to the institution, dispatches activation emails (`F-71`), and records an audit log (`F-82`).
- **AC-F13-02 (Positive — User Deactivation & Session Revocation):** Given an `Active` user with an open session in the institution, When the Institutional Admin deactivates the user, Then the user's status becomes `Deactivated`, their active session is immediately invalidated (`F-65`), and their historical project/academic records remain intact.
- **AC-F13-03 (Boundary — Subscription / 5,000 User Limit Enforcement):** Given an institution at its maximum subscribed user capacity (or $5,000$ users), When the Institutional Admin attempts to create or import additional users, Then the system rejects the operation with a capacity limit error.

---

## F-14: Institutional Role and Permission Management

### A. Feature Identification
- **Feature ID:** F-14
- **Feature Name:** Institutional Role and Permission Management
- **Feature Category:** Institutional Administration (User-Facing Functionality)
- **Primary Actor:** Institutional Admin
- **Supporting Actors:** Access Control Service (`F-66`), Audit Process (`F-82`)
- **MVP Priority:** P0
- **Source User Stories:** IA-08
- **Short Feature Description:** Enables Institutional Admins to assign and revoke institutional roles (`Institutional Admin`, `Project Coordinator`, `Project Supervisor`, `Project Examiner`, `Student`) for users within their institution.

### B. Business Purpose
- **Problem Solved:** Academic staff and students perform distinct functions; a single academic staff member may simultaneously serve as a `Project Supervisor` for assigned students, a `Project Examiner` for other projects, and a `Project Coordinator` for a specific programme.
- **Necessity for Clario:** Establishes the role assignments enforced by `F-66` (Role and Scope-Based Access Control).
- **Business/Academic Value:** Supports flexible academic staffing while strictly separating administrative, supervisory, examination, and student permissions.
- **Impact if Omitted:** Users would have no assigned roles or permissions to perform actions within their institution.

### C. Functional Requirements
- **FR-045:** The system must allow an Institutional Admin to assign one or more valid institutional roles (`Institutional Admin`, `Project Coordinator`, `Project Supervisor`, `Project Examiner`, `Student`) to a user within their institution.
- **FR-046:** The system must enforce role compatibility rules: a user holding the `Student` role within an institution cannot simultaneously be assigned `Institutional Admin`, `Project Coordinator`, `Project Supervisor`, or `Project Examiner` roles within that same institution; conversely, academic/administrative staff can hold combinations of `Project Supervisor`, `Project Examiner`, and `Project Coordinator` (subject to per-project independence rules in `BR-16` / `F-48` and confidentiality rules in `BR-25` / `F-18`).
- **FR-047:** Because `BR-25` (`F-18`) strictly prohibits `Institutional Admin` from accessing confidential project documents or academic feedback, if an academic staff member also performs supervision or examination, the system must enforce strict role-context separation (or require separate administrative vs. academic role contexts) so that `Institutional Admin` privileges never grant access to unassigned academic records.
- **FR-048:** When a user is assigned the `Institutional Admin` or `Project Coordinator` role, the system must immediately mark MFA as mandatory (`SEC-06`) for that user and require MFA verification before they can access `Institutional Admin` or `Project Coordinator` functions.

### D. User Interaction and Behaviour
- **Access:** Institutional Admin Console -> "Users Directory -> Manage Roles" (or "Roles & Permissions" management view).
- **Information Viewed:** User's current assigned roles, scope summary (e.g., linked Coordinator programme/session from `F-15`), MFA requirement indicator.
- **Actions Performed:** Assign Role, Revoke Role.
- **Validations:** Cannot assign `Student` alongside staff/admin roles; cannot revoke the last active `Institutional Admin` role in the institution; assigning `Project Coordinator` prompts or links to `F-15` to bind the Programme and Academic Session scope.
- **Post-Action Behaviour:** Role permissions update immediately in `F-66`, audit entry is written (`F-82`), and if `Institutional Admin` or `Project Coordinator` was added, MFA enforcement is flagged (`F-64`).
- **States:** Loading, Role conflict error message, Confirmation modal on role revocation.

### E. Business Rules
- **BR-01 & BR-02:** Role assignments are strictly scoped to the institution.
- **BR-16:** Holding both `Project Supervisor` and `Project Examiner` roles at the institution level is permitted for academic staff, but the user cannot examine any project they supervised (`F-48`).
- **BR-25:** Holding `Institutional Admin` never grants access to confidential project documents or academic feedback (`F-18`).
- **BR-28:** All role assignments and revocations are logged in `F-82`.

### F. Permissions and Access Control
- **Institutional Admin:** Full access to assign and revoke institutional roles within their tenant.
- **All Other Institutional Actors:** Read-only visibility of their own assigned roles.

### G. Data Requirements
- **Captured:** Role Assignment ID, Institution ID (`F-01`), User ID (`F-13`), Role Code (`INSTITUTIONAL_ADMIN`, `PROJECT_COORDINATOR`, `PROJECT_SUPERVISOR`, `PROJECT_EXAMINER`, `STUDENT`), Assigned By Actor ID, Assigned Timestamp, Status (`Active`, `Revoked`).

### H. Dependencies and Integrations
- **Required Features:** `F-13`, `F-15`, `F-16`, `F-18`, `F-64`, `F-66`, `F-82`.

### I. Acceptance Criteria
- **AC-F14-01 (Positive — Staff Multi-Role Assignment):** Given an academic staff user in Institution A, When the Institutional Admin assigns both `Project Supervisor` and `Project Examiner` roles to that user, Then both roles are granted and the user can switch between or access both workspaces for their respective assigned projects.
- **AC-F14-02 (Validation — Student Role Mutually Exclusive with Staff/Admin Roles):** Given a user assigned the `Student` role, When an Institutional Admin attempts to assign `Project Examiner` or `Project Coordinator` to that user, Then the system rejects the assignment with a role-incompatibility error.
- **AC-F14-03 (Security — Mandatory MFA Trigger on Coordinator/Admin Role):** Given a Supervisor user who has not previously enabled MFA, When the Institutional Admin assigns the `Project Coordinator` role to that user, Then the system requires the user to complete MFA setup (`SEC-06`) before accessing Coordinator features.

---

## F-15: Project Coordinator Appointment

### A. Feature Identification
- **Feature ID:** F-15
- **Feature Name:** Project Coordinator Appointment
- **Feature Category:** Institutional Administration (User-Facing Functionality)
- **Primary Actor:** Institutional Admin
- **Supporting Actors:** Project Coordinator (receives scoped appointment), Email Service (`F-71`), Audit Process (`F-82`)
- **MVP Priority:** P0
- **Source User Stories:** IA-09
- **Short Feature Description:** Enables Institutional Admins to appoint an eligible institutional user as Project Coordinator for a specific Programme (`F-11`) and a specific Academic Session (`F-12`).

### B. Business Purpose
- **Problem Solved:** Project administration (student registration, allocation, milestone configuration, defence scheduling, and result publication) requires clearly designated academic authority bounded to a specific degree programme and academic cohort.
- **Necessity for Clario:** Implements `BR-03` ("A Coordinator manages one programme and one academic session per assignment") and establishes the authorization scope enforced by `F-66`.
- **Business/Academic Value:** Ensures clear accountability for programme-level project management and prevents cross-programme administrative interference.
- **Impact if Omitted:** No Project Coordinator would have an authorized Programme + Academic Session scope to manage projects (`F-19`–`F-60`).

### C. Functional Requirements
- **FR-049:** The system must allow an Institutional Admin to create a Project Coordinator appointment by selecting an `Active` non-student user (`F-13`), one `Active` Programme (`F-11`), and one `Upcoming` or `Active` Academic Session (`F-12`) within their institution.
- **FR-050:** Each Coordinator appointment record must bind strictly to **one Programme and one Academic Session** (`BR-03`). If a user coordinates multiple programmes or sessions, the Institutional Admin must create separate, distinct Coordinator appointment records for each (Programme, Session) pair, and the Coordinator must operate within one selected (Programme, Session) context at a time.
- **FR-051:** Automatically upon appointment, if the user does not already hold the `Project Coordinator` role (`F-14`), the system must grant the role, enforce mandatory MFA (`SEC-06`), log the appointment in `F-82`, and send an appointment notification (`F-71`, `F-72`).
- **FR-052:** The system must allow an Institutional Admin to revoke or replace a Coordinator appointment for a (Programme, Academic Session) pair, immediately transferring administrative scope for that Programme and Session to the newly appointed Coordinator while preserving all historical audit records.

### D. User Interaction and Behaviour
- **Access:** Institutional Admin Console -> "Coordinator Appointments" (also accessible from the Programme detail view `F-11`).
- **Information Viewed:** Table of Coordinator Appointments filterable by Faculty, Department, Programme, and Academic Session, showing Coordinator Name, Email, Faculty, Department, Programme, Academic Session, Appointment Status (`Active`, `Revoked`), and Appointed Date.
- **Actions Performed:** Appoint Coordinator, Replace/Revoke Coordinator Appointment.
- **Validations:** Selected User must be `Active` and not hold the `Student` role (`F-14`); Programme must be `Active` (`F-11`); Academic Session must be `Upcoming` or `Active` (`F-12`); prevents duplicate active appointment of the same user to the exact same (Programme, Academic Session) pair.
- **Post-Action Behaviour:** Appointment saved, `F-66` scope permissions updated immediately, notification dispatched (`F-71`, `F-72`), audit record written (`F-82`).
- **States:** Loading, Empty state ("No Project Coordinators appointed for this session"), Validation error state.

### E. Business Rules
- **BR-01 & BR-02:** Strictly scoped to the institution.
- **BR-03:** A Coordinator manages one programme and one academic session per assignment.
- **BR-28:** Every Coordinator appointment and revocation is logged in `F-82`.

### F. Permissions and Access Control
- **Institutional Admin:** Full access to create, view, replace, and revoke Coordinator appointments within their institution.
- **Project Coordinator:** Read access to their own active/historical appointments and ability to select their active (Programme, Academic Session) workspace context.

### G. Data Requirements
- **Captured:** Appointment ID, Institution ID (`F-01`), User ID (`F-13`), Department ID (`F-10`), Programme ID (`F-11`), Academic Session ID (`F-12`), Status (`Active`, `Revoked`), Appointed By Actor ID, Appointed Timestamp, Revoked Timestamp & Reason (nullable).

### H. Dependencies and Integrations
- **Required Features:** `F-11`, `F-12`, `F-13`, `F-14`, `F-64`, `F-66`, `F-71`, `F-72`, `F-82`.
- **Consumed By:** All Project Coordinator features (`F-19`–`F-60`).

### I. Acceptance Criteria
- **AC-F15-01 (Positive — Coordinator Scoped Appointment):** Given an `Active` staff user Dr. Adewale, Programme `B.Sc. Computer Science`, and Session `2026/2027`, When the Institutional Admin appoints Dr. Adewale as Coordinator for that Programme and Session, Then Dr. Adewale gains Coordinator access strictly for `B.Sc. Computer Science` in `2026/2027` (`BR-03`), and an audit record is created (`F-82`).
- **AC-F15-02 (Permission — Cross-Programme & Cross-Session Scope Restriction):** Given Dr. Adewale is appointed Coordinator only for `B.Sc. Computer Science` in `2026/2027`, When Dr. Adewale attempts to register students or configure milestones for `B.Sc. Software Engineering` or for Session `2025/2026`, Then the system denies access (`BR-02`, `BR-03`).

---

## F-16: Supervisor Records Management

### A. Feature Identification
- **Feature ID:** F-16
- **Feature Name:** Supervisor Records Management
- **Feature Category:** Institutional Administration (User-Facing Functionality)
- **Primary Actor:** Institutional Admin
- **Supporting Actors:** Project Coordinator (views eligible supervisors during assignment in `F-21`, `F-24`, `F-27`), Audit Process (`F-82`)
- **MVP Priority:** P0
- **Source User Stories:** IA-10
- **Short Feature Description:** Enables Institutional Admins to create and maintain academic Supervisor eligibility records (linking staff users to departments, academic ranks/titles, specialization areas, and availability status) so Project Coordinators can assign eligible supervisors to projects.

### B. Business Purpose
- **Problem Solved:** Project Coordinators need an accurate, up-to-date pool of eligible academic supervisors with their departmental affiliation, specialization keywords, and availability status before assigning them to student projects (`F-24`, `F-27`).
- **Necessity for Clario:** Establishes the authoritative pool of eligible Supervisors within an institution.
- **Business/Academic Value:** Prevents unassigned or unavailable staff from being mistakenly allocated to supervise final-year projects.
- **Impact if Omitted:** Project Coordinators cannot identify or select eligible Supervisors during project allocation (`F-21`, `F-24`) or reassignment (`F-27`).

### C. Functional Requirements
- **FR-053:** The system must allow an Institutional Admin to create and maintain a Supervisor Record for an institutional staff user (`F-13`), capturing Academic Title/Rank (e.g., `Prof.`, `Dr.`, `Mr.`, `Mrs.`), Primary Department (`F-10`), Permitted Supervision Programmes/Departments (if cross-departmental supervision is allowed by the institution), Research Specialization Tags (optional), and Supervision Eligibility Status (`Available`, `Unavailable / On Leave`, `Inactive`).
- **FR-054:** Creating a Supervisor Record for a user must automatically ensure the user holds the `Project Supervisor` role (`F-14`).
- **FR-055:** When an Institutional Admin updates a Supervisor's Eligibility Status to `Unavailable / On Leave` or `Inactive`, the system must prevent Project Coordinators from making *new* project assignments to that Supervisor (`F-24`) while flagging existing active project assignments in the relevant Coordinator's workspace so the Coordinator can execute a Supervisor Reassignment (`F-27`).

### D. User Interaction and Behaviour
- **Access:** Institutional Admin Console -> "Supervisor Directory".
- **Information Viewed:** Searchable, filterable list of Supervisors by Faculty, Department, and Eligibility Status (`Available`, `Unavailable / On Leave`, `Inactive`), showing Academic Title, Full Name, Staff ID, Email, Primary Department, Specialization Tags, and Eligibility Status.
- **Actions Performed:** Create Supervisor Record (from existing staff user or new user creation), Edit Supervisor Record, Change Eligibility Status (`Available` / `Unavailable` / `Inactive`).
- **Validations:** Linked User must be a non-student user in the same institution; Primary Department must be `Active` (`F-10`); Academic Title (required, 2–30 chars).
- **Post-Action Behaviour:** Supervisor record saved, eligibility updated for Coordinator selection dropdowns (`F-24`, `F-27`), audit entry logged (`F-82`).
- **States:** Loading, Empty state, Warning prompt when marking a Supervisor with active projects as `Unavailable / On Leave`.

### E. Business Rules
- **BR-01 & BR-02:** Supervisor records are strictly scoped to the institution.
- **BR-28:** Creation, updates, and availability status changes of Supervisor records are logged in `F-82`.
- *(Note: Supervisor Workload Monitoring `F-25` and Workload Limit Management `F-26` are P1 and excluded from the MVP).*

### F. Permissions and Access Control
- **Institutional Admin:** Full create, read, update, and eligibility status management within their institution.
- **Project Coordinator:** Read-only access to eligible (`Available`) Supervisor records for their Programme/Department when performing assignments (`F-21`, `F-24`, `F-27`).
- **Project Supervisor:** Read access to their own Supervisor record.

### G. Data Requirements
- **Captured:** Supervisor Record ID, Institution ID (`F-01`), User ID (`F-13`), Primary Department ID (`F-10`), Academic Title/Rank, Specialization Areas/Keywords (optional text/tags), Eligibility Status (`Available`, `Unavailable`, `Inactive`), Timestamps.

### H. Dependencies and Integrations
- **Required Features:** `F-10`, `F-13`, `F-14`, `F-64`, `F-66`, `F-82`.
- **Consumed By:** `F-21` (Project Allocation), `F-24` (Supervisor Assignment), `F-27` (Supervisor Reassignment), `F-46` & `F-48` (Examiner Eligibility & Independence Check).

### I. Acceptance Criteria
- **AC-F16-01 (Positive — Supervisor Record Creation):** Given an `Active` staff user in Department `CSC`, When the Institutional Admin creates a Supervisor Record with Title `Dr.`, Department `CSC`, and Status `Available`, Then the user is granted the `Project Supervisor` role (`F-14`) and appears as an eligible Supervisor for `CSC` programmes in `F-24`.
- **AC-F16-02 (Workflow — Unavailable Supervisor Blocked from New Assignments):** Given a Supervisor whose Eligibility Status is changed to `Unavailable / On Leave` by the Institutional Admin, When a Project Coordinator attempts to assign a new student or group to that Supervisor in `F-24`, Then the Supervisor is excluded/blocked from new assignment selection.

---

## F-18: Academic Information Confidentiality

### A. Feature Identification
- **Feature ID:** F-18
- **Feature Name:** Academic Information Confidentiality
- **Feature Category:** Institutional Administration & Security Enforcement (Supporting System Capability & Access Control)
- **Primary Actor:** Institutional Admin (Subject of Restriction)
- **Supporting Actors:** Access Control Service (`F-66`), Audit Process (`F-82`)
- **MVP Priority:** P0
- **Source User Stories:** IA-12
- **Short Feature Description:** Enforces strict access control preventing Institutional Admins from viewing or downloading confidential student project documents, topic proposals, submission discussions, supervisory feedback, and academic grading assessments.

### B. Business Purpose
- **Problem Solved:** Institutional Admins manage institutional structure (`F-09`–`F-12`), user accounts (`F-13`–`F-16`), and billing (`F-03`), which are administrative functions. Allowing IT or administrative personnel to inspect student dissertations, supervisory critiques, or examination scores compromises academic integrity and confidentiality.
- **Necessity for Clario:** Enforces `BR-25` and `SEC-14` across all institutional data views and document storage endpoints.
- **Business/Academic Value:** Preserves the boundary between institutional IT/user administration and academic supervision/examination.
- **Impact if Omitted:** Institutional Admins could read private supervisory feedback, download student research files, or view unpublished examination scores.

### C. Functional Requirements
- **FR-056:** The system must block any user acting in the `Institutional Admin` role from viewing or downloading project topic proposal descriptions/rationales (`F-20`), milestone and final project uploaded files (`F-32`, `F-35`, `F-37`, `F-77`), Supervisor review comments and submission discussions (`F-33`, `F-34`), and Examiner/Supervisor assessment rubrics, scores, or feedback (`F-52`–`F-61`).
- **FR-057:** Where an Institutional Admin views user, programme, or supervisor records (`F-09`–`F-16`), the system must expose only non-confidential administrative metadata (such as user registration status, role assignment, coordinator appointment scope, and supervisor availability status).
- **FR-058:** Any attempt by an `Institutional Admin` session to directly request a confidential academic resource or document URL (`F-77`) must be rejected with `403 Forbidden` and logged by the security/audit service (`F-82`).

### D. User Interaction and Behaviour
- **Access:** Automatically enforced across all Institutional Admin interfaces and API routes via `F-66` and `F-77`.
- **Information Viewed:** Institutional Admins see only structural, user, role, coordinator appointment, supervisor directory, and subscription billing views. No navigation links or data payloads for project workspaces, documents, or academic feedback are rendered.
- **Post-Action Behaviour (Failure/Unauthorized Request):** Direct URL navigation or API requests to project workspaces or document downloads return an access-denied message ("Access Restricted: Institutional Administrators cannot access confidential project documents or academic feedback").

### E. Business Rules
- **BR-02:** Users can only access information within their authorised scope.
- **BR-25:** Institutional Admins cannot access confidential project documents or academic feedback.
- *(Note: `F-17` Institutional Project Oversight is P1 and excluded from the MVP).*

### F. Permissions and Access Control
- **System Access Control (`F-66` & `F-77`):** Explicitly denies `Institutional Admin` role access to confidential project content, feedback, and assessment endpoints.

### G. Data Requirements
- **Protected Data:** Topic proposal content (`F-20`), Uploaded documents and version history (`F-32`, `F-35`, `F-37`, `F-76`–`F-78`), Submission feedback and discussions (`F-33`, `F-34`), Supervisor and Examiner scores/comments (`F-39`, `F-52`–`F-61`).

### H. Dependencies and Integrations
- **Required Features:** `F-66` (Role and Scope-Based Access Control), `F-77` (Authorised Document Retrieval), `F-82` (Audit Logging).

### I. Acceptance Criteria
- **AC-F18-01 (Permission — Block Document Download by Institutional Admin):** Given an authenticated Institutional Admin of Institution A, When they attempt to retrieve or download a project document uploaded by a student in Institution A (`F-77`), Then the system denies the request with a `403 Forbidden` error (`BR-25`, `SEC-14`).
- **AC-F18-02 (Permission — Block Academic Feedback & Grade Visibility):** Given an authenticated Institutional Admin of Institution A, When they attempt to access a project's submission feedback thread (`F-34`) or assessment breakdown (`F-58`, `F-61`), Then the system denies access and does not expose any academic feedback or grade data.