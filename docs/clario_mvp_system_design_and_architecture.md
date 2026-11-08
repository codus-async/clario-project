# Clario — MVP System Design and Architecture Blueprint (`system-architecture.md`)

**Document Status:** Stage 4 — System Design & Architecture Specification  
**Target Release:** Clario MVP (P0 Scope — 75 Features, 290 Functional Requirements)  
**Target Platform:** Responsive Web Application (All 6 Human Actors)  
**Launch Jurisdiction & Currency:** Nigeria (`NGN` — Integer Minor Units / Kobo)  
**Authoritative Timezone Default:** `Africa/Lagos` (`WAT`, `UTC+1`)

---

## 1. Business Rules (BR) Audit & Architectural Readiness Assessment

All **34 Business Rules** (`BR-01` through `BR-30`, plus `BR-NEW-01` through `BR-NEW-04`) across the specification baseline are unambiguous, internally consistent, and 100% traced to the **75 P0 Features** (`F-01`–`F-83`) and **290 Functional Requirements** (`FR-001`–`FR-290`).

### 1.1 Resolution of Earlier Discovery Questions (`actors.md` §4)

| Discovery Question (`actors.md` §4) | Authoritative MVP Resolution | Enforcing Rules & Features | Architectural Mechanism |
|---|---|---|---|
| **1. Who formally approves and publishes final examination results?** | The **Project Coordinator** approves consolidated final results (`F-59`) and publishes them atomically at the **individual project level** (`F-60`) without blocking on other incomplete projects in the programme. | `BR-22`, `BR-23` (Updated), `F-58`, `F-59`, `F-60` | Single-transaction row-locked state transition per `project_id` with atomic lock on all associated assessments (`FR-210`, `FR-211`). |
| **2. Can a supervisor examine a project they supervised?** | **No.** Neither the current Supervisor (`F-24`) nor any former/reassigned Supervisor (`F-27`) can be appointed to examine or score a project they supervised. Supervisor and Examiner assessments are strictly blind/independent. | `BR-16`, `BR-17`, `F-24`, `F-27`, `F-46`, `F-47`, `F-48` | `project_supervision_history` ledger checked via DB trigger & service guard before `examiner_appointments` insertion (`FR-161`). |
| **3. Can one coordinator manage multiple programmes or academic sessions?** | Yes, via **separate appointment records**, operated **one `(Programme, Academic Session)` scope at a time**. | `BR-03`, `F-15`, `F-65`, `F-66` | Active session token binds a single `active_coordinator_appointment_id` (`programme_id` + `academic_session_id`) per request (`FR-050`, `FR-225`). |
| **4. Can students request changes to project groups or supervisors?** | **No.** Students cannot self-create or transfer groups (`BR-07`), and student-initiated group/supervisor change workflows are excluded from MVP. Coordinators manage groups (`F-22`) and Supervisor reassignments (`F-27`). | `BR-07`, `F-22`, `F-27`, `OD-01` | Write endpoints for group membership and supervisor assignment are restricted strictly to `PROJECT_COORDINATOR` (`FR-077`, `FR-084`). |
| **5. What level of project-record access should Institutional Admins have?** | **Metadata only.** Institutional Admins (and Platform Admins) are strictly blocked from viewing/downloading topic proposal rationales, project documents, supervisory feedback/discussions, and student grades. | `BR-08`/`F-08`, `BR-25`/`F-18`, `SEC-14`, `SEC-15`, `F-66`, `F-77` | Policy Enforcement Point (`F-66`), Document Retrieval Guard (`F-77`), and redacted Audit Views (`FR-283`). |
| **6. Should external examiners be supported as a distinct category?** | **Excluded from MVP.** All examination workflows (`F-46`–`F-55`) operate strictly with institutional `Project Examiner` accounts appointed by the Project Coordinator. | Scope Exclusion (`mvp-features-part2.md` Mod. H) | Role enum restricted to the 6 confirmed human actors. |

### 1.2 Core Architectural Invariants (`BR-NEW-01` to `BR-NEW-04`)

1. **Institutional Timezone Authority (`BR-NEW-01`):** Every timestamp is persisted in UTC (`TIMESTAMPTZ`), while every deadline evaluation, reminder trigger (`F-79`), overdue transition (`F-80`), and UI display converts using the tenant's configured IANA timezone (`institutions.timezone_iana`, defaulting to `Africa/Lagos`).
2. **Group Shared Examination + Individual Supervision Grading (`BR-NEW-02`):** For group projects, `examiner_assessments` (`F-52`–`F-55`) bind to `project_id` (shared across the group), whereas `supervisor_assessments` (`F-39`, `F-56`) and `consolidated_student_results` (`F-58`, `F-61`) bind to `(project_id, student_user_id)` and are isolated per student (`FR-121`).
3. **Post-Approval Edit Self-Healing (`BR-NEW-03` / `PROP-03`):** Any edit to a submitted Examiner (`F-55`) or Supervisor (`F-56`) assessment when `projects.result_approval_status = 'APPROVED'` (and `!= 'PUBLISHED'`) atomically recalculates `F-58`, reverts `projects.result_approval_status` to `'REQUIRES_REAPPROVAL'`, logs the diff in `F-82`, and alerts the Coordinator.
4. **Submission, Payment & Notification Decoupling (`BR-NEW-04`):**
   - Uploads become formal submissions (`F-32`) only after server receipt, magic-byte inspection, malware scanning (`F-76`), and version creation (`F-78`, `DAT-03`).
   - Subscription status changes (`F-69`) occur only after cryptographic HMAC verification of gateway webhooks (`F-68`, `DAT-10`) with idempotent deduplication (`DAT-08`, `DAT-09`).
   - Notifications (`F-71`–`F-75`) are written to a transactional outbox table (`outbox_events`) and dispatched asynchronously so external email failures never roll back academic or administrative transactions.

---

## 2. Architectural Style & Non-Functional Requirements (NFR) Alignment

### 2.1 Chosen Architecture Pattern: Modular Monolith + Asynchronous Worker Tier
Clario MVP is architected as a **strictly bounded Modular Monolith API Server** paired with an **Asynchronous Background Worker & Scheduler Tier**, backed by **PostgreSQL 16 (with Row-Level Security)**, **Redis 7**, and **S3-Compatible Encrypted Object Storage**.

**Why this pattern is optimal for Clario MVP:**
- **ACID Transactional Integrity:** Complex multi-entity invariants — such as atomic project-level result publication (`F-60`), post-approval grade edit reversion (`BR-NEW-03`), sequential milestone unlocking (`BR-10`), and supervisor handover (`F-27`) — execute within single local ACID database transactions without distributed two-phase commit (`2PC`) fragility.
- **Strict Tenant & Confidentiality Enforcement:** Centralizes the Policy Enforcement Point (`F-66`), PostgreSQL Row-Level Security (`BR-01`), and Tamper-Resistant Audit Logging (`F-82`) in one unified data access layer.
- **Fault-Isolated Background Processing (`PER-03`, `NFR-REL`):** Offloads virus scanning (`F-76`), email dispatch (`F-71`, `F-73`), deadline reminder sweeps (`F-79`), overdue detection (`F-80`), and institutional archive exports (`FR-006`) to stateless worker processes.

### 2.2 Quantitative NFR Target Mapping

| NFR Dimension | MVP Target | Architectural Implementation |
|---|---|---|
| **Tenant Scale (`SCA-01`, `SCA-02`)** | Up to $20$ institutions; up to $5,000$ active users/institution ($100,000$ total users) | Shared-database, shared-schema multi-tenancy with mandatory `institution_id` B-tree composite indexing and PostgreSQL Row-Level Security (`RLS`). |
| **Concurrency (`SCA-03`)** | $1,000$ concurrent active users | Stateless horizontally scaled API containers ($2\text{--}6$ instances behind ALB/Nginx) + PgBouncer connection pooling + Redis session & permission caching. |
| **Interactive Latency (`PER-01`)** | $p95 < 2.0\text{ seconds}$ for normal interactive requests | Covered composite indexes on all dashboard/filter queries, paginated cursors, pre-computed project progress states (`F-31`), and asynchronous outbox for notifications. |
| **File Security & Throughput (`PER-02`, `NFR-SEC`)** | Max $50\text{ MB}$ (`PDF, DOC, DOCX, PPT, PPTX`), magic-byte + malware scan, resumable retry | Direct-to-Quarantine S3 multipart/chunked presigned uploads (`DAT-05`) $\rightarrow$ asynchronous ClamAV + magic-byte worker verification $\rightarrow$ promotion to Immutable Vault bucket (`F-76`, `F-78`). |
| **Availability (`REL-01`)** | $\ge 99.5\%$ monthly uptime ($< 3\text{h } 36\text{m}$ allowed downtime/month) | Multi-AZ deployment: redundant API nodes, Primary-Standby PostgreSQL with automated failover, Redis Sentinel/Cluster, and zero-downtime rolling deployments. |
| **Disaster Recovery (`REL-06`–`REL-10`, `F-83`)** | Hourly encrypted backups, $30\text{-day}$ retention, $\text{RPO} \le 1\text{ hour}$, $\text{RTO} \le 4\text{ hours}$ | Continuous PostgreSQL WAL archiving ($\text{actual RPO} < 5\text{ mins}$) + automated hourly encrypted snapshots + S3 cross-region replication + automated DR verification runbooks. |

---

## 3. System C4 Architecture (Context & Container Views)

### 3.1 C4 Level 1 — System Context Diagram

```
+---------------------------------------------------------------------------------------------------+
|                                        HUMAN ACTORS (6 ROLES)                                     |
|  [Platform Admin]  [Institutional Admin]  [Project Coordinator]  [Supervisor]  [Student]  [Examiner]|
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  | HTTPS (Responsive Web App — Desktop/Tablet/Mobile)
                                                  v
                                    +---------------------------+
                                    |      CLARIO PLATFORM      |
                                    |  Multi-Tenant SaaS for    |
                                    |  Final-Year Project       |
                                    |  Lifecycle Management     |
                                    +-------------+-------------+
                                                  |
        +-----------------------------------------+-----------------------------------------+
        | HTTPS API / Webhooks                    | SMTP / HTTPS API                        | S3 API (TLS)
        v                                         v                                         v
+-------------------------------+       +-------------------------------+       +-------------------------------+
|   NIGERIAN PAYMENT GATEWAY    |       |  TRANSACTIONAL EMAIL SERVICE  |       |  CLOUD OBJECT STORAGE & KMS   |
| (Paystack / Flutterwave / etc)|       |   (SES / Postmark / SendGrid) |       | (Encrypted Document & Backup  |
| - NGN Checkout (F-67)         |       | - Onboarding, Reset & Workflow|       |  Vaults — F-76, F-78, F-83)   |
| - Signed Webhooks (F-68)      |       |   Emails (F-71, F-73)         |       +-------------------------------+
+-------------------------------+       +-------------------------------+
```

### 3.2 C4 Level 2 — Container & Internal Module Architecture

```
+-------------------------------------------------------------------------------------------------------+
|                                     BROWSER CLIENT TIER                                               |
|  Responsive Web Application (TypeScript / React / Next.js — WCAG 2.2 AA Compliant)                    |
|  - Role & Scope Context Header (F-65)           - Encrypted IndexedDB Local Draft Store (NFR-USA)     |
|  - Resumable Chunk Upload Manager (DAT-05)      - In-App Notification Center Drawer (F-72)            |
+---------------------------------------------------+---------------------------------------------------+
                                                    | HTTPS / TLS 1.3
                                                    v
+-------------------------------------------------------------------------------------------------------+
|                              EDGE, WAF & API GATEWAY (Nginx / Cloud ALB)                              |
|  - IP & Account Rate Limiting (SEC-04)          - Strict TLS & HSTS Headers (SEC-17)                  |
|  - Request Body Size Enforcement (<= 50MB)      - Dedicated Webhook Ingress (/api/v1/webhooks/payment)|
+-------------------------+---------------------------------------------------+-------------------------+
                          |                                                   |
                          v                                                   v
+---------------------------------------------------+ +-------------------------------------------------+
|      CLARIO CORE API SERVER (Modular Monolith)    | |   ASYNCHRONOUS WORKER & SCHEDULER CLUSTER       |
|---------------------------------------------------| |-------------------------------------------------|
| 1. Security & Policy Enforcement Pipeline:        | | * Outbox Relay Worker (Polls outbox_events)     |
|    [AuthN & MFA Verifier (F-64)]                  | | * Notification Dispatcher (F-71, F-72, F-73)    |
|          ↓                                        | |   - Exponential Backoff (5 retries) + DLQ Alert |
|    [Redis Session & Inactivity Guard (F-65)]      | | * File Validation & Malware Scanner (F-76)      |
|          ↓                                        | |   - Magic-Byte Inspector + ClamAV Daemon        |
|    [Subscription Access Gate (F-70)]              | | * Deadline Reminder Scheduler (F-79 -> F-40)    |
|          ↓                                        | |   - Evaluates 7d, 3d, 24h in Tenant Timezone    |
|    [Scope & Confidentiality ABAC Guard (F-66)]    | | * Missed Deadline Detector (F-80 -> F-41, F-74) |
|    (Enforces BR-01..03, F-08, F-18, SEC-09..16)   | | * Tenant Archive Export Builder (FR-006)        |
|          ↓                                        | | * Hourly Backup & DR Orchestrator (F-83)        |
|    [PostgreSQL RLS Context Setter]                | +-----------------------+-------------------------+
|---------------------------------------------------|                         |
| 2. Internal Domain Modules:                       |                         |
|    * Mod-A: Platform & Tenant Admin (F-01..08)    |                         |
|    * Mod-B: Institutional Hierarchy & IAM (F-09..18)|                       |
|    * Mod-C/D: Cohort, Topics, Groups & Supervision|                         |
|      (F-19..24, F-27)                             |                         |
|    * Mod-E/F: Workspace, Milestones, Submissions, |                         |
|      Discussions & Versions (F-28..38, F-76..78)  |                         |
|    * Mod-G: Deadlines, Extensions & Late Penalties|                         |
|      (F-40..44)                                   |                         |
|    * Mod-H: Examiner Panel & Defence (F-46..50)   |                         |
|    * Mod-I/J: Grading, Consolidation, Approval &  |                         |
|      Atomic Publication (F-39, F-51..62)          |                         |
|    * Mod-L: Subscription Billing & Webhooks       |                         |
|      (F-67..70)                                   |                         |
|    * Mod-P: Cryptographic Audit Service (F-82)    |                         |
+-------------------------+-------------------------+                         |
                          |                                                   |
                          +-------------------------+-------------------------+
                                                    |
            +---------------------------------------+---------------------------------------+
            |                                       |                                       |
            v                                       v                                       v
+-----------------------------------+ +---------------------------+ +-----------------------------------+
|  POSTGRESQL 16 CLUSTER (Primary + | |   REDIS 7 CLUSTER         | |  S3 OBJECT STORAGE VAULTS         |
|  Multi-AZ Standby + PgBouncer)    | |---------------------------| |-----------------------------------|
|-----------------------------------| | * Active Sessions (F-65)  | | 1. clario-quarantine-uploads      |
| * Tenant RLS Policies (BR-01)     | | * Adaptive Lockout & Rate | |    (Short-lived multipart chunks) |
| *NUMERIC(10,4) Exact Grading      | |   Limit Counters (SEC-05) | | 2. clario-immutable-documents     |
| * Append-Only Audit Ledger (F-82) | | * Job Queues & Cron Locks | |    (Object Lock / Versioning F-78)|
| * Transactional Outbox Table      | +---------------------------+ | 3. clario-dr-backups-encrypted    |
+-----------------------------------+                               |    (Hourly DB + Object Snapshots) |
                                                                    +-----------------------------------+
```

---

## 4. Security, Authentication & Multi-Dimensional Access Control (`F-08`, `F-18`, `F-64`–`F-66`, `F-70`)

### 4.1 Authentication, Password Security & Mandatory MFA (`F-64`)
1. **Password Hashing & Screening (`SEC-02`, `SEC-03`, `SEC-20`):**
   - Passwords must be $\ge 12$ characters and are hashed using **Argon2id** (`memory=64MB, iterations=3, parallelism=4`).
   - During registration, activation, or password reset (`FR-220`), candidate passwords are checked against an offline Bloom filter / k-anonymity hash prefix table of compromised passwords before acceptance.
2. **Rate Limiting & Adaptive Temporary Lockout (`SEC-04`, `SEC-05`):**
   - Redis sliding-window counters track failed attempts per `(ip_address)` and per `(email_or_institutional_id)`.
   - After $5$ consecutive failures within $15\text{ minutes}$, the account enters a temporary exponential cooldown ($15\text{ mins} \rightarrow 30\text{ mins} \rightarrow 60\text{ mins}$) stored in `users.lockout_until_utc`.
   - In compliance with `SEC-05`, **permanent lockouts are never applied**, and an Institutional Admin can clear a temporary lockout (`FR-044`, `SEC-08`).
3. **Mandatory MFA Enforcement (`SEC-06`, `FR-019`, `FR-048`, `FR-222`):**
   - TOTP (RFC 6238) with encrypted secret storage (AES-256-GCM using KMS data key) + $10$ single-use hashed recovery codes.
   - If `user_roles` contains `PLATFORM_ADMIN`, `INSTITUTIONAL_ADMIN`, or `PROJECT_COORDINATOR`, the login flow issues a restricted `PRE_MFA_SESSION` token that can access **only** `/api/v1/auth/mfa/enroll` and `/api/v1/auth/mfa/verify` until `mfa_verified = true`.

### 4.2 Session Lifecycle & Instant Revocation (`F-65`)
- Sessions are stored in Redis under `session:{session_id}` with a secondary user index set `user_sessions:{user_id}`.
- **Role-Based Inactivity Timeouts (`SEC-07`, `FR-226`, `OD-12`):**
  - Every interactive request updates `last_activity_utc` and resets the Redis TTL according to the active role's configured timeout (defaulting to $30\text{ minutes}$ for `PLATFORM_ADMIN`, `INSTITUTIONAL_ADMIN`, and `PROJECT_COORDINATOR`; $60\text{ minutes}$ for `PROJECT_SUPERVISOR`, `PROJECT_EXAMINER`, and `STUDENT`).
- **Instant Server-Side Revocation (`FR-227`):**
  - Deactivating a user (`F-05`, `F-13`), resetting a password (`F-64`), revoking a role/appointment (`F-14`, `F-15`), or suspending an institution (`F-01`) immediately deletes all keys in `user_sessions:{user_id}` (or sets `tenant_status:{institution_id} = SUSPENDED` in Redis), terminating access on the very next HTTP request (`AC-F65-02`).

### 4.3 Five-Gate Policy Enforcement Point (PEP) Architecture (`F-66`, `F-70`)
Every incoming API request passes sequentially through five authorization gates before reaching any domain service:

```
Request -> [Gate 1: Session & MFA] -> [Gate 2: Tenant Boundary] -> [Gate 3: Subscription State]
        -> [Gate 4: Confidentiality Blocker] -> [Gate 5: Scope & Assignment ABAC] -> Domain Service
```

1. **Gate 1 (Authentication & MFA Gate — `F-64`, `F-65`):** Verifies valid Redis session, inactivity window, and `mfa_verified == true` for mandatory-MFA roles.
2. **Gate 2 (Tenant Isolation Gate — `BR-01`, `SEC-09`):** Binds `request.institution_id = session.institution_id` and executes `SET LOCAL app.current_institution_id` on the PostgreSQL transaction so Row-Level Security (`RLS`) enforces tenant isolation at the database engine level.
3. **Gate 3 (Institutional Account & Subscription Gate — `F-01`, `F-04`, `F-70`):**
   - Checks `institution.status` (`SUSPENDED` blocks all non-billing access per `FR-004`) and `subscription.status` (`ACTIVE`, `GRACE_PERIOD`, `EXPIRED`).
   - Evaluates the request's `(active_role, operation_type)` against the tenant's **Grace Period & Post-Expiry Permission Matrix (`FR-017`, `FR-245`, `OD-06`)**, while **always permitting** `INSTITUTIONAL_ADMIN` access to `F-03`/`F-67` (Billing & Renewal) and `FR-006` (Data Export).
4. **Gate 4 (Hard Academic Confidentiality Blocker — `F-08`, `F-18`, `BR-25`, `SEC-14`, `SEC-15`):**
   - If `session.active_role IN ('PLATFORM_ADMIN', 'INSTITUTIONAL_ADMIN')` and the target resource belongs to confidential academic categories (`TopicProposal`, `SubmissionVersion`, `SharedDocument`, `SubmissionDiscussion`, `ExaminerAssessment`, `SupervisorAssessment`, `ConsolidatedResult`, `DocumentStream`), Gate 4 **unconditionally returns `403 Forbidden`** and emits a `SECURITY_CONFIDENTIALITY_BLOCKED` audit event to `F-82`.
   - Even if a staff user holds both `INSTITUTIONAL_ADMIN` and `PROJECT_SUPERVISOR` roles (`FR-047`), they must explicitly switch `session.active_role` to `PROJECT_SUPERVISOR` (`F-65`), where Gate 5 restricts them strictly to their own assigned projects (`SEC-12`).
5. **Gate 5 (Fine-Grained Scope & Assignment ABAC — `BR-02`, `BR-03`, `BR-08`, `BR-16`, `BR-17`):**
   - **Project Coordinator (`BR-03`, `BR-26`):** Verifies `resource.programme_id == session.programme_id AND resource.academic_session_id == session.academic_session_id`. Blocks write access to `submission_discussions` (`BR-26`).
   - **Project Supervisor (`SEC-12`, `BR-17`):** Verifies an `ACTIVE` row exists in `project_supervision_history` for `(project_id, user_id)`. Blocks access to `examiner_assessments` (`BR-17`).
   - **Project Examiner (`SEC-13`, `BR-16`, `BR-17`, `BR-21`):** Verifies an `ACTIVE` row exists in `examiner_appointments` for `(project_id, user_id)` and zero rows exist in `project_supervision_history` for `(project_id, user_id)`. Restricts document retrieval (`F-77`) strictly to the approved `FINAL_SUBMISSION` package (`F-50`) and blocks edits once `projects.result_approval_status == 'PUBLISHED'` (`BR-21`).
   - **Student (`SEC-11`, `BR-08`, `FR-121`):** Verifies the student owns the individual project or is an active member of the project's group (`F-22`). For formal submission mutations (`F-20`, `F-32`, `F-35`) on group projects, verifies `is_designated_submitter == true` (`BR-08`). For result/breakdown queries (`F-60`, `F-61`), filters strictly by `student_user_id == session.user_id AND is_published == true` (`FR-121`).

---

## 5. Complete Logical & Physical Database Schema Design (PostgreSQL 16)

### 5.1 Entity-Relationship Architecture Overview

```
[institutions] 1---* [faculties] 1---* [departments] 1---* [programmes]
      |                                                         |
      +---1 [institutional_subscriptions] *---1 [subscription_plans]
      |             |
      |             +---* [payment_transactions] 1---* [webhook_events]
      |
      +---* [academic_sessions]
      |             |
      +---* [users] +---* [coordinator_appointments] (Binds 1 User + 1 Programme + 1 Session — BR-03)
                    +---* [supervisor_records]
                    +---* [student_cohort_registrations] (Unique per Programme + Session + Student)
                                  |
                                  v
                             [projects] (INDIVIDUAL or GROUP)
                                  |
        +-------------------------+-------------------------+-------------------------+
        |                         |                         |                         |
        v                         v                         v                         v
[project_groups]        [topic_proposals]     [project_supervision_history]  [examiner_appointments]
        |                  (F-20 Iterations)    (Current & Former — BR-16)     (Validated != History)
        v                                                                             |
[project_group_members]                                                               v
(is_designated_submitter BR-08)                                              [examiner_assessments]
                                                                               (Shared per Project)
        +---------------------------------------------------+                         |
        |                                                   |                         |
        v                                                   v                         v
[project_milestone_states] 1---* [submission_versions]   [supervisor_assessments]  [consolidated_student_results]
(Sequential Gate BR-10)          (Immutable Append-Only) (Individual per Student)  (Atomic Publish per Project)
                                         |
                                         +---* [submission_discussions] (Bound to Submission ID — BR-27)
```

### 5.2 Core Relational Schema Definitions (DDL Specifications)

#### 5.2.1 Module A & L: Tenants, Subscriptions, Plans & Payments (`F-01`–`F-05`, `F-67`–`F-70`)

```sql
CREATE TABLE institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    code_slug VARCHAR(20) NOT NULL,
    country VARCHAR(60) NOT NULL DEFAULT 'Nigeria',
    timezone_iana VARCHAR(64) NOT NULL DEFAULT 'Africa/Lagos',
    primary_contact_name VARCHAR(120) NOT NULL,
    primary_contact_email VARCHAR(255) NOT NULL,
    primary_contact_phone VARCHAR(40),
    status VARCHAR(30) NOT NULL CHECK (status IN (
        'PENDING_ACTIVATION', 'ACTIVE', 'SUSPENDED', 'PENDING_TERMINATION', 'TERMINATED'
    )),
    status_change_reason VARCHAR(500),
    termination_recovery_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_institutions_name UNIQUE (LOWER(name)),
    CONSTRAINT uq_institutions_code UNIQUE (LOWER(code_slug))
);

CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    billing_interval VARCHAR(20) NOT NULL CHECK (billing_interval IN ('ANNUAL', 'SESSION', 'MONTHLY')),
    billing_duration_days INT NOT NULL CHECK (billing_duration_days > 0),
    currency CHAR(3) NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
    amount_kobo BIGINT NOT NULL CHECK (amount_kobo >= 0),
    max_active_users INT NOT NULL CHECK (max_active_users BETWEEN 1 AND 5000),
    status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE institutional_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL UNIQUE REFERENCES institutions(id),
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    contracted_amount_kobo BIGINT NOT NULL,
    contracted_max_users INT NOT NULL CHECK (contracted_max_users BETWEEN 1 AND 5000),
    status VARCHAR(25) NOT NULL CHECK (status IN (
        'PENDING_PAYMENT', 'ACTIVE', 'GRACE_PERIOD', 'EXPIRED', 'CANCELLED'
    )),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    grace_period_override_days INT CHECK (grace_period_override_days BETWEEN 0 AND 90),
    grace_period_override_reason VARCHAR(300),
    grace_period_end TIMESTAMPTZ,
    billing_legal_name VARCHAR(200) NOT NULL,
    billing_email VARCHAR(255) NOT NULL,
    billing_address TEXT,
    tax_rc_number VARCHAR(60),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    subscription_id UUID NOT NULL REFERENCES institutional_subscriptions(id),
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    idempotency_reference VARCHAR(100) NOT NULL UNIQUE,
    currency CHAR(3) NOT NULL DEFAULT 'NGN',
    expected_amount_kobo BIGINT NOT NULL CHECK (expected_amount_kobo > 0),
    paid_amount_kobo BIGINT,
    gateway_provider VARCHAR(40) NOT NULL,
    gateway_checkout_id VARCHAR(150),
    status VARCHAR(30) NOT NULL CHECK (status IN (
        'INITIATED', 'PENDING_VERIFICATION', 'SUCCEEDED', 'FAILED', 'ABANDONED', 'DISCREPANCY'
    )),
    initiated_by_user_id UUID NOT NULL,
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    failure_reason TEXT
);

CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_provider VARCHAR(40) NOT NULL,
    gateway_event_id VARCHAR(150) NOT NULL,
    transaction_reference VARCHAR(100),
    event_type VARCHAR(60) NOT NULL,
    signature_status VARCHAR(30) NOT NULL CHECK (signature_status IN ('VERIFIED', 'REJECTED_INVALID_SIGNATURE')),
    processing_status VARCHAR(30) NOT NULL CHECK (processing_status IN (
        'RECEIVED', 'PROCESSED', 'DUPLICATE_IGNORED', 'FAILED'
    )),
    payload_sha256 CHAR(64) NOT NULL,
    raw_payload JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    CONSTRAINT uq_webhook_gateway_event UNIQUE (gateway_provider, gateway_event_id)
);
```

#### 5.2.2 Module B & K: Academic Hierarchy, Users, Roles & Appointments (`F-09`–`F-16`, `F-64`–`F-66`)

```sql
CREATE TABLE faculties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    name VARCHAR(150) NOT NULL,
    code VARCHAR(20) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_faculty_name_per_inst UNIQUE (institution_id, LOWER(name)),
    CONSTRAINT uq_faculty_code_per_inst UNIQUE (institution_id, LOWER(code))
);

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    faculty_id UUID NOT NULL REFERENCES faculties(id),
    name VARCHAR(150) NOT NULL,
    code VARCHAR(20) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_dept_name_per_inst UNIQUE (institution_id, LOWER(name)),
    CONSTRAINT uq_dept_code_per_inst UNIQUE (institution_id, LOWER(code))
);

CREATE TABLE programmes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    faculty_id UUID NOT NULL REFERENCES faculties(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    name VARCHAR(150) NOT NULL,
    code VARCHAR(25) NOT NULL,
    degree_award_title VARCHAR(40),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_prog_name_per_inst UNIQUE (institution_id, LOWER(name)),
    CONSTRAINT uq_prog_code_per_inst UNIQUE (institution_id, LOWER(code))
);

CREATE TABLE academic_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    session_label VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('UPCOMING', 'ACTIVE', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_session_dates CHECK (end_date > start_date),
    CONSTRAINT uq_session_label_per_inst UNIQUE (institution_id, LOWER(session_label))
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id), -- NULL strictly for PLATFORM_ADMIN
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL,
    institutional_id_number VARCHAR(60), -- Staff ID or Matriculation Number
    primary_department_id UUID REFERENCES departments(id),
    password_hash TEXT,
    mfa_required BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_enrolled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret_encrypted TEXT,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    lockout_until_utc TIMESTAMPTZ,
    is_under_18 BOOLEAN NOT NULL DEFAULT FALSE,
    guardian_name VARCHAR(120),
    guardian_email VARCHAR(255),
    guardian_consent_status VARCHAR(40) CHECK (guardian_consent_status IN (
        'NOT_REQUIRED', 'PENDING', 'VERIFIED', 'STATUTORY_EDUCATIONAL_BASIS'
    )),
    status VARCHAR(20) NOT NULL CHECK (status IN ('INVITED', 'ACTIVE', 'DEACTIVATED')),
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_email_per_inst UNIQUE NULLS NOT DISTINCT (institution_id, LOWER(email)),
    CONSTRAINT uq_user_inst_id_per_inst UNIQUE (institution_id, LOWER(institutional_id_number))
);

CREATE TABLE user_role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id),
    user_id UUID NOT NULL REFERENCES users(id),
    role_code VARCHAR(30) NOT NULL CHECK (role_code IN (
        'PLATFORM_ADMIN', 'INSTITUTIONAL_ADMIN', 'PROJECT_COORDINATOR',
        'PROJECT_SUPERVISOR', 'PROJECT_EXAMINER', 'STUDENT'
    )),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
    assigned_by_user_id UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_active_role_per_user UNIQUE (user_id, role_code)
);

-- Enforces BR-03: One Programme and One Academic Session per Coordinator Appointment
CREATE TABLE coordinator_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    user_id UUID NOT NULL REFERENCES users(id),
    programme_id UUID NOT NULL REFERENCES programmes(id),
    academic_session_id UUID NOT NULL REFERENCES academic_sessions(id),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
    appointed_by_user_id UUID NOT NULL REFERENCES users(id),
    appointed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revocation_reason VARCHAR(300)
);

CREATE TABLE supervisor_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id),
    primary_department_id UUID NOT NULL REFERENCES departments(id),
    academic_title VARCHAR(30) NOT NULL,
    specialization_tags TEXT[] NOT NULL DEFAULT '{}',
    eligibility_status VARCHAR(25) NOT NULL DEFAULT 'AVAILABLE' CHECK (eligibility_status IN (
        'AVAILABLE', 'UNAVAILABLE', 'INACTIVE'
    )),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 5.2.3 Module C, D, E, F & G: Projects, Groups, Topics, Supervision, Milestones & Submissions (`F-19`–`F-44`, `F-76`–`F-78`)

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    programme_id UUID NOT NULL REFERENCES programmes(id),
    academic_session_id UUID NOT NULL REFERENCES academic_sessions(id),
    project_type VARCHAR(15) NOT NULL CHECK (project_type IN ('INDIVIDUAL', 'GROUP')),
    approved_topic_title VARCHAR(300),
    current_supervisor_id UUID REFERENCES users(id),
    lifecycle_status VARCHAR(35) NOT NULL DEFAULT 'AWAITING_TOPIC' CHECK (lifecycle_status IN (
        'AWAITING_TOPIC', 'TOPIC_PROPOSED', 'UNDER_SUPERVISION',
        'FINAL_SUBMITTED', 'UNDER_EXAMINATION', 'COMPLETED'
    )),
    result_approval_status VARCHAR(35) NOT NULL DEFAULT 'INCOMPLETE' CHECK (result_approval_status IN (
        'INCOMPLETE', 'CONSOLIDATED_PENDING_APPROVAL', 'APPROVED', 'REQUIRES_REAPPROVAL', 'PUBLISHED'
    )),
    approved_by_coordinator_id UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    published_by_coordinator_id UUID REFERENCES users(id),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE student_cohort_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    programme_id UUID NOT NULL REFERENCES programmes(id),
    academic_session_id UUID NOT NULL REFERENCES academic_sessions(id),
    student_user_id UUID NOT NULL REFERENCES users(id),
    matriculation_number VARCHAR(60) NOT NULL,
    arrangement_type VARCHAR(15) NOT NULL DEFAULT 'UNASSIGNED' CHECK (arrangement_type IN (
        'UNASSIGNED', 'INDIVIDUAL', 'GROUP'
    )),
    project_id UUID REFERENCES projects(id),
    participation_status VARCHAR(30) NOT NULL DEFAULT 'REGISTERED',
    registered_by_coordinator_id UUID NOT NULL REFERENCES users(id),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Enforces FR-060 & OD-03: Unique per (Programme, Session, Student)
    CONSTRAINT uq_student_per_programme_session UNIQUE (programme_id, academic_session_id, student_user_id)
);

CREATE TABLE project_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    programme_id UUID NOT NULL REFERENCES programmes(id),
    academic_session_id UUID NOT NULL REFERENCES academic_sessions(id),
    project_id UUID NOT NULL UNIQUE REFERENCES projects(id),
    group_code VARCHAR(100) NOT NULL,
    created_by_coordinator_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_group_code_per_prog_session UNIQUE (programme_id, academic_session_id, LOWER(group_code))
);

CREATE TABLE project_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    group_id UUID NOT NULL REFERENCES project_groups(id),
    student_registration_id UUID NOT NULL UNIQUE REFERENCES student_cohort_registrations(id),
    student_user_id UUID NOT NULL REFERENCES users(id),
    is_designated_submitter BOOLEAN NOT NULL DEFAULT FALSE, -- Enforces BR-08 (F-23)
    member_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (member_status IN ('ACTIVE', 'REMOVED')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE topic_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    iteration_number INT NOT NULL CHECK (iteration_number >= 1),
    parent_proposal_id UUID REFERENCES topic_proposals(id),
    title VARCHAR(300) NOT NULL,
    problem_statement TEXT NOT NULL,
    objectives TEXT NOT NULL,
    methodology TEXT NOT NULL,
    keywords TEXT[],
    submitted_by_user_id UUID NOT NULL REFERENCES users(id),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(35) NOT NULL CHECK (status IN (
        'SUBMITTED_AWAITING_SUPERVISOR', 'UNDER_SUPERVISOR_REVIEW',
        'APPROVED', 'REJECTED', 'ALTERNATIVE_SUGGESTED', 'SUPERSEDED'
    )),
    reviewed_by_supervisor_id UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    supervisor_feedback TEXT,
    alternative_topic_title VARCHAR(300),
    alternative_topic_rationale TEXT
);

-- Tracks both Current (F-24) and Former/Reassigned (F-27) Supervisors for BR-16 (F-48)
CREATE TABLE project_supervision_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    supervisor_user_id UUID NOT NULL REFERENCES users(id),
    supervisor_record_id UUID NOT NULL REFERENCES supervisor_records(id),
    assignment_status VARCHAR(25) NOT NULL CHECK (assignment_status IN ('ACTIVE', 'REASSIGNED_HISTORICAL')),
    assigned_by_coordinator_id UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    reassignment_reason VARCHAR(500)
);

CREATE TABLE programme_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    programme_id UUID NOT NULL REFERENCES programmes(id),
    academic_session_id UUID NOT NULL REFERENCES academic_sessions(id),
    sequence_number INT NOT NULL CHECK (sequence_number >= 1),
    title VARCHAR(150) NOT NULL,
    milestone_type VARCHAR(25) NOT NULL CHECK (milestone_type IN ('INTERIM', 'FINAL_SUBMISSION')),
    description_and_guidelines TEXT NOT NULL,
    permitted_extensions TEXT[] NOT NULL DEFAULT ARRAY['pdf', 'doc', 'docx', 'ppt', 'pptx'],
    base_deadline_utc TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_milestone_seq_per_prog_session UNIQUE (programme_id, academic_session_id, sequence_number)
);

CREATE TABLE project_milestone_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    milestone_id UUID NOT NULL REFERENCES programme_milestones(id),
    progress_state VARCHAR(35) NOT NULL DEFAULT 'LOCKED' CHECK (progress_state IN (
        'LOCKED', 'UNLOCKED_NOT_SUBMITTED', 'SUBMITTED_AWAITING_REVIEW',
        'REVISIONS_REQUESTED', 'REJECTED', 'APPROVED'
    )),
    effective_deadline_utc TIMESTAMPTZ NOT NULL,
    is_overdue BOOLEAN NOT NULL DEFAULT FALSE,
    overdue_detected_at TIMESTAMPTZ,
    latest_version_number INT NOT NULL DEFAULT 0,
    CONSTRAINT uq_project_milestone UNIQUE (project_id, milestone_id)
);

CREATE TABLE storage_objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    uploaded_by_user_id UUID NOT NULL REFERENCES users(id),
    document_category VARCHAR(35) NOT NULL CHECK (document_category IN (
        'MILESTONE_SUBMISSION', 'FINAL_PROJECT_SUBMISSION',
        'SHARED_GROUP_WORKING_DOC', 'SUPERVISOR_FEEDBACK_ATTACHMENT', 'EXTENSION_EVIDENCE'
    )),
    bucket_name VARCHAR(100) NOT NULL,
    object_key VARCHAR(500) NOT NULL UNIQUE,
    sanitized_filename VARCHAR(255) NOT NULL,
    validated_extension VARCHAR(10) NOT NULL CHECK (validated_extension IN ('pdf', 'doc', 'docx', 'ppt', 'pptx')),
    validated_mime_type VARCHAR(120) NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 52428800),
    sha256_checksum CHAR(64) NOT NULL,
    malware_scan_status VARCHAR(20) NOT NULL CHECK (malware_scan_status = 'CLEAN'),
    upload_idempotency_token VARCHAR(120) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Immutable Append-Only Table (BR-11, DAT-01, DAT-02, F-35, F-78)
CREATE TABLE submission_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    milestone_id UUID NOT NULL REFERENCES programme_milestones(id),
    version_number INT NOT NULL CHECK (version_number >= 1),
    parent_version_id UUID REFERENCES submission_versions(id),
    storage_object_id UUID NOT NULL UNIQUE REFERENCES storage_objects(id),
    submitted_by_user_id UUID NOT NULL REFERENCES users(id),
    submission_notes TEXT,
    revision_summary_note TEXT,
    server_receipt_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_deadline_at_receipt_utc TIMESTAMPTZ NOT NULL,
    is_late BOOLEAN NOT NULL DEFAULT FALSE,
    late_duration_minutes INT NOT NULL DEFAULT 0,
    review_status VARCHAR(25) NOT NULL DEFAULT 'AWAITING_REVIEW' CHECK (review_status IN (
        'AWAITING_REVIEW', 'REVISIONS_REQUESTED', 'REJECTED', 'APPROVED'
    )),
    reviewed_by_supervisor_id UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    CONSTRAINT uq_submission_version UNIQUE (project_id, milestone_id, version_number)
);

-- Bound strictly to submission_version_id per BR-27 (F-34)
CREATE TABLE submission_discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    submission_version_id UUID NOT NULL REFERENCES submission_versions(id),
    author_user_id UUID NOT NULL REFERENCES users(id),
    author_role VARCHAR(25) NOT NULL CHECK (author_role IN ('PROJECT_SUPERVISOR', 'STUDENT')),
    entry_type VARCHAR(30) NOT NULL CHECK (entry_type IN ('FORMAL_REVIEW_FEEDBACK', 'DISCUSSION_COMMENT')),
    comment_body TEXT NOT NULL,
    attachment_object_id UUID REFERENCES storage_objects(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 5.2.4 Module H, I, J & P: Examination, Grading, Consolidation, Publication & Audit (`F-39`, `F-46`–`F-62`, `F-82`)

```sql
CREATE TABLE assessment_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    programme_id UUID NOT NULL REFERENCES programmes(id),
    academic_session_id UUID NOT NULL REFERENCES academic_sessions(id),
    total_max_marks NUMERIC(10,4) NOT NULL DEFAULT 100.0000,
    supervisor_max_marks NUMERIC(10,4) NOT NULL DEFAULT 30.0000, -- Default 30 marks per BR-18
    examiner_doc_max_marks NUMERIC(10,4) NOT NULL DEFAULT 40.0000,
    examiner_defence_max_marks NUMERIC(10,4) NOT NULL DEFAULT 30.0000,
    pass_mark_threshold NUMERIC(10,4) NOT NULL DEFAULT 45.0000,
    default_panel_size INT NOT NULL DEFAULT 1 CHECK (default_panel_size >= 1),
    examiner_consolidation_method VARCHAR(30) NOT NULL DEFAULT 'ARITHMETIC_MEAN' CHECK (
        examiner_consolidation_method IN ('ARITHMETIC_MEAN', 'WEIGHTED_PANEL', 'COORDINATOR_RESOLVED')
    ),
    final_rounding_mode VARCHAR(30) NOT NULL DEFAULT 'ROUND_HALF_UP_2DP',
    supervisor_criteria_jsonb JSONB NOT NULL,
    examiner_doc_criteria_jsonb JSONB NOT NULL,
    examiner_defence_criteria_jsonb JSONB NOT NULL,
    grade_scale_bands_jsonb JSONB NOT NULL,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT chk_component_sum CHECK (
        supervisor_max_marks + examiner_doc_max_marks + examiner_defence_max_marks = total_max_marks
    ),
    CONSTRAINT uq_structure_per_prog_session UNIQUE (programme_id, academic_session_id)
);

CREATE TABLE examiner_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    examiner_user_id UUID NOT NULL REFERENCES users(id),
    panel_name VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REMOVED')),
    appointed_by_coordinator_id UUID NOT NULL REFERENCES users(id),
    appointed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    removed_at TIMESTAMPTZ,
    removal_reason VARCHAR(300),
    CONSTRAINT uq_examiner_per_project UNIQUE (project_id, examiner_user_id)
);

-- Shared at Project Level for both Individual and Group Projects (BR-NEW-02, F-52..F-55)
CREATE TABLE examiner_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    examiner_appointment_id UUID NOT NULL UNIQUE REFERENCES examiner_appointments(id),
    examiner_user_id UUID NOT NULL REFERENCES users(id),
    doc_criterion_scores_jsonb JSONB NOT NULL DEFAULT '[]',
    doc_subtotal NUMERIC(10,4) NOT NULL DEFAULT 0.0000,
    defence_criterion_scores_jsonb JSONB NOT NULL DEFAULT '[]',
    defence_subtotal NUMERIC(10,4) NOT NULL DEFAULT 0.0000,
    examiner_total_score NUMERIC(10,4) NOT NULL DEFAULT 0.0000,
    formal_feedback TEXT,
    status VARCHAR(25) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'DRAFT', 'SUBMITTED', 'PUBLISHED_LOCKED'
    )),
    revision_count INT NOT NULL DEFAULT 0,
    last_edit_reason VARCHAR(500),
    submitted_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Individual per Student for both Individual and Group Projects (BR-NEW-02, F-39, F-56)
CREATE TABLE supervisor_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    student_user_id UUID NOT NULL REFERENCES users(id),
    supervisor_user_id UUID NOT NULL REFERENCES users(id),
    criterion_scores_jsonb JSONB NOT NULL DEFAULT '[]',
    supervisor_total_score NUMERIC(10,4) NOT NULL DEFAULT 0.0000,
    qualitative_feedback TEXT,
    status VARCHAR(25) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'DRAFT', 'SUBMITTED', 'PUBLISHED_LOCKED'
    )),
    revision_count INT NOT NULL DEFAULT 0,
    last_edit_reason VARCHAR(500),
    submitted_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sup_assessment_per_student UNIQUE (project_id, student_user_id)
);

CREATE TABLE consolidated_student_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    programme_id UUID NOT NULL REFERENCES programmes(id),
    academic_session_id UUID NOT NULL REFERENCES academic_sessions(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    student_user_id UUID NOT NULL REFERENCES users(id),
    consolidated_examiner_doc_score NUMERIC(10,4) NOT NULL,
    consolidated_examiner_defence_score NUMERIC(10,4) NOT NULL,
    consolidated_examiner_total_score NUMERIC(10,4) NOT NULL,
    individual_supervisor_score NUMERIC(10,4) NOT NULL,
    gross_score NUMERIC(10,4) NOT NULL,
    effective_late_penalty NUMERIC(10,4) NOT NULL DEFAULT 0.0000,
    net_unrounded_score NUMERIC(10,4) NOT NULL,
    final_rounded_score NUMERIC(10,2) NOT NULL,
    letter_grade VARCHAR(5) NOT NULL,
    pass_fail_outcome VARCHAR(10) NOT NULL CHECK (pass_fail_outcome IN ('PASS', 'FAIL')),
    completion_status VARCHAR(35) NOT NULL CHECK (completion_status IN (
        'IN_PROGRESS', 'COMPLETED', 'FAILED_INCOMPLETE'
    )),
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_consolidated_result_per_student UNIQUE (project_id, student_user_id)
);

-- Tamper-Resistant Append-Only Audit Ledger (F-82, BR-28, NFR-AUD)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id),
    programme_id UUID REFERENCES programmes(id),
    academic_session_id UUID REFERENCES academic_sessions(id),
    project_id UUID REFERENCES projects(id),
    actor_user_id UUID REFERENCES users(id),
    actor_system_service VARCHAR(60),
    actor_role VARCHAR(35) NOT NULL,
    actor_ip_address INET,
    action_code VARCHAR(80) NOT NULL,
    target_entity_type VARCHAR(60) NOT NULL,
    target_entity_id VARCHAR(100) NOT NULL,
    previous_state_jsonb JSONB,
    resulting_state_jsonb JSONB,
    is_confidential_academic_payload BOOLEAN NOT NULL DEFAULT FALSE,
    justification_reason TEXT,
    outcome VARCHAR(20) NOT NULL CHECK (outcome IN ('SUCCESS', 'DENIED', 'FAILED')),
    previous_row_hash CHAR(64) NOT NULL,
    row_integrity_hash CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 6. Critical End-to-End Architectural Sequence Flows

### 6.1 Examiner Independence (`BR-16`) & Blind Grading (`BR-17`) Enforcement
1. **Trigger & Application Guard (`F-48`):**
   - A PostgreSQL `BEFORE INSERT OR UPDATE` trigger on `examiner_appointments` queries `project_supervision_history`:
     ```sql
     IF EXISTS (
         SELECT 1 FROM project_supervision_history
         WHERE project_id = NEW.project_id
           AND supervisor_user_id = NEW.examiner_user_id
     ) THEN
         RAISE EXCEPTION 'BR-16 Violation: User supervised this project and cannot be appointed Examiner.';
     END IF;
     ```
   - An inverse trigger on `project_supervision_history` prevents reassigning a project (`F-27`) to a user who holds an active `examiner_appointments` record for that project (`FR-162`).
2. **Blind Grading Isolation (`BR-17`):**
   - API serializers for `PROJECT_EXAMINER` query only `examiner_assessments WHERE examiner_user_id = :current_user_id`, never joining `supervisor_assessments` or co-examiner rows (`FR-164`).
   - API serializers for `PROJECT_SUPERVISOR` query only `supervisor_assessments`, never joining `examiner_assessments` (`FR-195`).

### 6.2 Post-Approval Assessment Edit Safeguard (`BR-NEW-03` / `PROP-03`) & Atomic Publication (`F-60`)

```
Examiner / Supervisor                   Clario Core API (ACID Transaction)                    Outbox & Audit
         |                                              |                                           |
         |--- 1. PUT /assessments/{id} (Edit Score) --->|                                           |
         |       (Mandatory: last_edit_reason)          |--- 2. SELECT * FROM projects              |
         |                                              |       WHERE id = :pid FOR UPDATE          |
         |                                              |--- 3. Verify result_approval_status       |
         |                                              |       != 'PUBLISHED' (BR-21)              |
         |                                              |--- 4. Update Assessment Score &           |
         |                                              |       Recompute Consolidation (F-58)      |
         |                                              |--- 5. IF status == 'APPROVED':            |
         |                                              |       SET result_approval_status =        |
         |                                              |       'REQUIRES_REAPPROVAL' (BR-NEW-03)   |
         |                                              |--- 6. INSERT audit_logs (Before/After) -->|
         |                                              |--- 7. INSERT outbox_events (Alert Coord)->|
         |<-- 8. 200 OK (Updated & Flagged) ------------|--- 9. COMMIT TRANSACTION                  |
```

### 6.3 Automated `NGN` Subscription Payment & Idempotent Webhook Synchronisation (`F-67`–`F-70`)

```
Institutional Admin        Clario Billing API          Payment Gateway (NGN)        Clario Webhook Receiver
        |                          |                             |                             |
        |-- 1. Initiate Renewal -->|                             |                             |
        |   (Plan <= 5,000 Users)  |-- 2. Create TX (Kobo) ----->|                             |
        |<-- 3. Checkout URL ------|<--Checkout Session----------|                             |
        |-- 4. Complete NGN Pay -------------------------------->|                             |
        |<-- 5. Browser Redirect (Status stays PENDING - DAT-10)-|                             |
        |                                                        |-- 6. POST /webhooks/payment>|
        |                                                        |   (HMAC Signature Header)   |
        |                                                        |   * Verify HMAC (DAT-10)    |
        |                                                        |   * Check Unique Event ID   |
        |                                                        |     (DAT-08, DAT-09)        |
        |                                                        |   * Match Kobo Amount       |
        |                                                        |   * Set Sub = ACTIVE (F-69) |
        |                                                        |   * Lift F-70 Restrictions  |
        |                                                        |   * Write Audit Log (F-82)  |
        |                                                        |<-- 7. 200 OK ---------------|
```

---

## 7. Extensibility Hooks for Open Decisions (`OD-01` to `OD-22`)

To guarantee that none of the 22 open policy decisions in `mvp-open-decisions.md` require architectural refactoring later, each is isolated behind a dedicated configuration structure:

1. **Group Membership Post-Allocation Policy (`OD-01` / `FR-077`):** Controlled by `programme_settings.allow_post_allocation_group_edits (BOOLEAN)`.
2. **Alternative Topic Student Response Flow (`OD-02` / `FR-068`):** Controlled by `programme_settings.alternative_topic_acceptance_mode ('AUTO_APPROVE' | 'REQUIRE_REVISED_SUBMISSION')`.
3. **Late Penalty Calculation Engine (`OD-05` / `FR-148`):** Implemented via the Strategy Pattern (`NoDeductionStrategy`, `FlatMarksPerDayStrategy`, `PercentagePerDayStrategy`, `FixedFlatDeductionStrategy`) parameterized by `grace_buffer_minutes` and `max_penalty_cap` per programme.
4. **Subscription Grace Period & Post-Expiry Matrix (`OD-06` / `FR-017`, `FR-245`):** Stored in a platform-configurable JSONB policy matrix evaluated dynamically in **PEP Gate 3 (`F-70`)**.
5. **Examiner Consolidation & Rounding Strategy (`OD-08` / `FR-176`, `FR-202`):** `assessment_structures` stores `examiner_consolidation_method` and `final_rounding_mode`, while all intermediate SQL/application math uses `NUMERIC(10,4)`.
6. **Payment Gateway Provider Adapter (`OD-09` / `F-67`–`F-69`):** Abstracted behind a `PaymentGatewayPort` interface (`initiateCheckout`, `verifyWebhookSignature`, `verifyTransactionServerToServer`), allowing Paystack, Flutterwave, Monnify, or Remita adapters to be plugged in via environment configuration.

---

## 8. High Availability, Monitoring, Backup & Disaster Recovery Architecture (`F-83`)

1. **Automated Hourly Encrypted Backups (`REL-06`, `FR-285`–`FR-287`):**
   - **PostgreSQL:** Continuous WAL archiving to `s3://clario-dr-backups-encrypted/wal/` + hourly `pgBackRest` / RDS snapshot jobs encrypted with AWS KMS / Vault `AES-256` keys (`SEC-19`), retained for **30 days**.
   - **Object Storage (`F-76`, `F-78`):** S3 Versioning + Object Lock (preventing overwrite or deletion of formal submission objects per `DAT-02`) + hourly incremental manifest sync to an isolated recovery bucket.
2. **Recovery Point & Recovery Time Objectives (`REL-07`, `REL-08`, `FR-288`):**
   - $\text{RPO} \le 1\text{ hour}$ (Continuous WAL streaming achieves $< 5\text{ minutes}$ actual RPO; hourly snapshots guarantee hard compliance $\le 1\text{ hour}$).
   - $\text{RTO} \le 4\text{ hours}$ (Automated Infrastructure-as-Code recovery runbook restores database, object vault pointers, and stateless API/worker containers within $\sim 45\text{ minutes}$).
3. **Operational Monitoring & Alerting (`REL-10`, `NFR-MON`, `FR-289`):**
   - Prometheus + Grafana / CloudWatch monitors:
     - Interactive API latency ($p95 < 2.0\text{s}$ threshold alert),
     - Background queue lag and Dead-Letter Queue (`DLQ`) depth (`F-73`, `F-79`, `F-80`),
     - Webhook signature failures and payment amount discrepancies (`F-68`, `F-69`),
     - Hourly backup completion status (immediate PagerDuty/Email alert to Platform Admins if any hourly backup job is delayed by $> 10\text{ minutes}$ or fails).