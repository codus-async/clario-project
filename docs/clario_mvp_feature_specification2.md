# Clario — MVP Feature Specification (`mvp-features.md`)

**Document Status:** Stage 2 — Feature Decomposition (Batches 1 & 2 of 5: Modules A, B, C, D & E)

**Target Release:** Clario MVP (P0 Scope Only)

**Platform:** Responsive Web Application (All Actors)

**Launch Jurisdiction & Currency:** Nigeria (`NGN`)

## Batch 1 & 2 Overview

* **Module A (Platform Administration):** `F-01`, `F-02`, `F-03`, `F-04`, `F-05`, `F-08` *(Note: `F-06` is P1 and `F-07` is P2; both are excluded from the MVP).*

* **Module B (Institutional Administration):** `F-09`, `F-10`, `F-11`, `F-12`, `F-13`, `F-14`, `F-15`, `F-16`, `F-18` *(Note: `F-17` is P1 and excluded from the MVP).*

* **Module C (Project Registration, Topics & Allocation):** `F-19`, `F-20`, `F-21`, `F-22`, `F-23`, `F-24`

* **Module D (Supervisor Capacity & Assignment):** `F-27` *(Note: `F-25` and `F-26` are P1 and excluded from the MVP).*

* **Module E (Project Workspace & Lifecycle):** `F-28`, `F-29`, `F-30`, `F-31`, `F-32`, `F-33`, `F-34`, `F-35`

# Module A: Platform Administration

## F-01: Institutional Account Management

### A. Feature Identification

* **Feature ID:** F-01

* **Feature Name:** Institutional Account Management

* **Feature Category:** Platform Administration (User-Facing Functionality)

* **Primary Actor:** Platform Admin

* **Supporting Actors:** Institutional Admin (receives onboarding invitation), Audit Process (`F-82`), Email Service (`F-71`)

* **MVP Priority:** P0

* **Source User Stories:** PA-01, PA-02, PA-03

* **Short Feature Description:** Enables Platform Admins to create, view, update, activate, suspend, and initiate termination/export for institutional tenant accounts on Clario.

### B. Business Purpose

* **Problem Solved:** Tertiary institutions require isolated, independently managed organizational environments before any academic structures, users, or projects can be administered.

* **Necessity for Clario:** Forms the root tenant boundary for Clario's multi-tenant SaaS model.

* **Business/Academic Value:** Enables rapid institutional onboarding, centralized operational status monitoring across all subscribed institutions, and controlled tenant suspension or offboarding.

* **Impact if Omitted:** No institution can be onboarded, isolated, billed, or governed on the platform.

### C. Functional Requirements

* **FR-001:** The system must allow an authenticated Platform Admin to create a new institutional tenant record with a unique institution name, unique institutional code/slug, country, configured timezone (defaulting to `Africa/Lagos` per `PROP-04`), primary administrative contact details, and initial status (`Pending Activation` or `Active`).

* **FR-002:** Upon institutional tenant creation, the system must automatically provision an isolated logical tenant boundary (`BR-01`) and trigger an onboarding invitation email (`F-71`) to the designated initial Institutional Admin email address.

* **FR-003:** The system must allow a Platform Admin to transition an institutional account status between `Pending Activation`, `Active`, `Suspended`, and `Pending Termination`, requiring a mandatory reason for `Suspended` and `Pending Termination` transitions.

* **FR-004:** When an institutional account is set to `Suspended`, the system must immediately block interactive academic and administrative operations for all users belonging to that institution (except Institutional Admin billing/account resolution access where applicable) and terminate or restrict active sessions (`F-65`, `F-66`).

* **FR-005:** The system must provide a searchable, filterable directory of all institutional tenants displaying institution name, code, account status, current subscription status (`F-03`), total active user count (against the 5,000-user launch capacity ceiling), and creation timestamp.

* **FR-006:** The system must allow a Platform Admin (or authorised Institutional Admin request) to generate a complete institutional data archive export (`PROP-05`, `NFR-BKP`) containing structured institutional records, project metadata, uploaded documents, and relevant audit logs for data portability or pre-termination recovery (`OD-10`).

### D. User Interaction and Behaviour

* **Access:** Accessed by Platform Admin via the Platform Administration Console -> "Institutions" section.

* **Information Viewed:** List and detail views of institutional tenants showing profile metadata, timezone, operational status badge, current subscription plan/expiry, active user count, and high-level administrative audit log entries (`F-82`).

* **Actions Performed:** Create New Institution, Edit Institution Metadata, Activate Institution, Suspend Institution (with reason modal), Reactivate Institution, Initiate Termination/Data Export.

* **Validations:** Institution name (required, 3–150 chars, unique case-insensitively), Institution code/slug (required, 2–20 alphanumeric/hyphen chars, unique), Timezone (valid IANA timezone identifier), Primary Contact Email (valid RFC 5322 email format), Status Change Reason (required for suspension/termination, 10–500 chars).

* **Post-Action Behaviour (Success):** Record persists, audit event (`F-82`) is written, success banner is displayed, and onboarding/status notification email (`F-71`) is queued.

* **Post-Action Behaviour (Failure):** Inline field validation errors or banner error message; no partial tenant provisioning occurs.

* **States:** Loading skeleton during tenant list fetch; Empty state ("No institutions registered yet — Create your first institution"); Error state with retry option if backend request fails.

### E. Business Rules

* **BR-01:** Every institution operates within its own strict institutional boundary.

* **BR-28:** All institutional account creations, updates, status transitions, and data export actions must be recorded in the administrative audit log.

* **BR-NEW-01 (Proposed under `PROP-04`):** Every institution must have a configured IANA timezone used as the authoritative reference for all milestone and assessment deadlines within that institution.

### F. Permissions and Access Control

* **Platform Admin:** Full access to create, view, update, activate, suspend, and initiate export for all institutional tenant records; cannot view confidential academic project contents (`F-08`).

* **Institutional Admin:** Read-only access to their own institution's profile metadata and ability to update their institution's timezone (`PROP-04`); no access to other institutions.

* **All Other Actors:** No access to `F-01`.

### G. Data Requirements

* **Captured:** Institution ID (system-generated immutable UUID), Institution Name, Institution Code/Slug, Country, Configured Timezone, Primary Contact Name, Primary Contact Email, Primary Contact Phone (optional), Account Status (`Pending Activation`, `Active`, `Suspended`, `Pending Termination`, `Terminated`), Status Change Reason, Created/Updated Timestamps, Created/Updated By Actor ID.

* **Displayed:** All captured fields plus aggregated active user count and linked subscription status (`F-03`).

* **Relationships:** Root parent of Faculties (`F-09`), Academic Sessions (`F-12`), Institutional Users (`F-13`), and Institutional Subscriptions (`F-03`).

* **Preserved/Protected:** Tenant ID is immutable; deleted/terminated tenants must follow the post-termination recovery period (`OD-10`) before permanent erasure.

### H. Dependencies and Integrations

* **Required Features:** `F-64` (Authentication), `F-66` (RBAC), `F-71` (Email Delivery), `F-82` (Audit Logging).

* **Triggers:** Onboarding invitation email (`F-71`); tenant access enforcement updates (`F-66`).

### I. Acceptance Criteria

* **AC-F01-01 (Positive — Tenant Creation):** Given an authenticated Platform Admin, When they submit the "Create Institution" form with unique Institution Name, unique Code, Timezone `Africa/Lagos`, and valid Primary Contact Email, Then the system creates the isolated tenant record, logs an audit entry (`F-82`), and dispatches an invitation email to the initial Institutional Admin.

* **AC-F01-02 (Validation — Duplicate Code):** Given an existing institution with code `UNILAG`, When a Platform Admin attempts to create another institution with code `unilag`, Then the system rejects the submission with a duplicate code validation error.

* **AC-F01-03 (Positive — Tenant Suspension):** Given an `Active` institution, When a Platform Admin suspends the institution and provides a valid reason, Then the institution status changes to `Suspended`, an audit record with previous and new status is created, and subsequent academic operations by users of that institution are blocked.

* **AC-F01-04 (Permission — Unauthorized Actor):** Given an authenticated Institutional Admin or Project Coordinator, When they attempt to access the Platform Admin institution creation or suspension operations, Then the system denies access with an authorization error.

## F-02: Subscription Plan Management

### A. Feature Identification

* **Feature ID:** F-02

* **Feature Name:** Subscription Plan Management

* **Feature Category:** Platform Administration (User-Facing Functionality)

* **Primary Actor:** Platform Admin

* **Supporting Actors:** Institutional Admin (views active plans during selection in `F-03`), Audit Process (`F-82`)

* **MVP Priority:** P0

* **Source User Stories:** PA-04

* **Short Feature Description:** Enables Platform Admins to create, update, activate, and retire institutional subscription plans priced in Nigerian Naira (`NGN`).

### B. Business Purpose

* **Problem Solved:** Institutions vary in size and billing cycle preferences and need structured commercial tiers to subscribe to Clario.

* **Necessity for Clario:** Provides the commercial catalogue required for institutional billing (`F-03`) and automated payment processing (`F-67`).

* **Business/Academic Value:** Standardizes pricing, user capacity limits, and billing intervals across institutional customers.

* **Impact if Omitted:** Institutions cannot select a plan or initiate automated subscription payments.

### C. Functional Requirements

* **FR-007:** The system must allow a Platform Admin to create a subscription plan specifying Plan Name, Plan Code, Description, Billing Interval (`Annual` or `Semester/Session` or `Monthly`), Price in `NGN` (stored in integer minor units/kobo), Maximum Active Users limit (up to 5,000 for MVP), and Status (`Draft`, `Active`, `Archived`).

* **FR-008:** The system must allow a Platform Admin to update plan descriptions, status, or pricing for future subscriptions while preserving the contracted price and capacity terms of currently active institutional subscriptions until their next renewal cycle.

* **FR-009:** The system must prevent the deletion of any subscription plan that has historical or active institutional subscriptions linked to it, allowing the plan only to be `Archived` (hidden from new selection).

### D. User Interaction and Behaviour

* **Access:** Platform Admin Console -> "Subscription Plans".

* **Information Viewed:** Table of subscription plans showing Name, Code, Billing Interval, Price in `NGN`, Max User Limit, Status, and count of subscribed institutions.

* **Actions Performed:** Create Plan, Edit Plan, Activate Plan, Archive Plan.

* **Validations:** Plan Name (required, unique), Plan Code (required, unique), Price (required, integer $\ge 0$ in `NGN` kobo), Max Active Users (required, integer between $1$ and $5000$), Billing Interval (required).

* **Post-Action Behaviour:** Plan changes take effect immediately for new selections in `F-03` and record an audit log entry (`F-82`).

* **States:** Loading state, Empty state ("No subscription plans configured"), Validation error state.

### E. Business Rules

* **BR-28:** All subscription plan creations, price modifications, and status transitions must be recorded in the administrative audit log.

* **BR-29:** Subscription plans apply strictly to institutional SaaS subscriptions in `NGN`, never to student project payments.

### F. Permissions and Access Control

* **Platform Admin:** Full create, read, update, and archive access.

* **Institutional Admin:** Read-only access to `Active` plans within their billing portal (`F-03`).

* **All Other Actors:** No access.

### G. Data Requirements

* **Captured:** Plan ID, Plan Name, Plan Code, Description, Currency (`NGN` fixed for launch), Amount in Minor Units (kobo), Billing Duration (in days/months), Max User Capacity, Plan Status (`Draft`, `Active`, `Archived`), Timestamps.

* **Preserved:** Historical pricing snapshots referenced by `F-03` billing records.

### H. Dependencies and Integrations

* **Required Features:** `F-64`, `F-66`, `F-82`.

* **Consumed By:** `F-03` (Institutional Subscription and Billing Management), `F-67` (Subscription Payment Processing).

### I. Acceptance Criteria

* **AC-F02-01 (Positive — Plan Creation):** Given an authenticated Platform Admin, When they create a plan with Price `NGN 2,500,000.00`, Billing Interval `Annual`, and Max Users `5000`, Then the plan is stored in exact integer minor units (`250000000` kobo), marked `Active`, and logged in `F-82`.

* **AC-F02-02 (Data Integrity — Archiving Plan in Use):** Given an `Active` subscription plan assigned to an institution, When a Platform Admin archives the plan, Then the plan is no longer selectable for new subscriptions, but the existing institution's active subscription remains unaffected.

## F-03: Institutional Subscription and Billing Management

### A. Feature Identification

* **Feature ID:** F-03

* **Feature Name:** Institutional Subscription and Billing Management

* **Feature Category:** Platform Administration & Institutional Billing (User-Facing Functionality)

* **Primary Actor:** Platform Admin

* **Supporting Actors:** Institutional Admin (`PROP-02` — selects plan, views invoices, initiates payment/renewal), Payment Gateway (`F-67`), Audit Process (`F-82`)

* **MVP Priority:** P0

* **Source User Stories:** PA-05, PA-06

* **Short Feature Description:** Enables Platform Admins to oversee all institutional subscriptions and billing records, and enables Institutional Admins (`PROP-02`) to view their institution's subscription status, manage billing details, select plans, and initiate subscription payments or renewals.

### B. Business Purpose

* **Problem Solved:** Both the SaaS operator (Platform Admin) and the customer (Institutional Admin) need transparent visibility and control over subscription lifecycles, billing contacts, invoices, and renewal dates.

* **Necessity for Clario:** Connects institutional tenant accounts (`F-01`) and subscription plans (`F-02`) to automated payment processing (`F-67`–`F-70`).

* **Business/Academic Value:** Ensures uninterrupted institutional service delivery through timely renewals and accurate billing administration.

* **Impact if Omitted:** Institutions cannot subscribe, renew, or view their billing status, and Platform Admins cannot track revenue or subscription health.

### C. Functional Requirements

* **FR-010:** The system must allow a Platform Admin to view and filter all institutional subscriptions across the platform by status (`Trial/Pending Payment`, `Active`, `Grace Period`, `Expired/Restricted`, `Cancelled`), plan (`F-02`), and renewal date.

* **FR-011:** The system must allow an Institutional Admin (`PROP-02`) to view their institution's current subscription plan, subscription status, start date, expiration date, grace-period end date (if applicable), and payment/invoice history.

* **FR-012:** The system must allow both Platform Admins and Institutional Admins (for their own tenant) to update institutional billing information (Billing Legal Name, Billing Address, Tax/RC Number, Billing Email, Billing Contact Phone).

* **FR-013:** The system must allow an Institutional Admin to select an `Active` subscription plan (`F-02`) and initiate a new subscription payment or renewal in `NGN`, invoking `F-67`.

* **FR-014:** The system must record every billing invoice and payment transaction attempt with a unique reference, linking it to the institutional subscription record.

### D. User Interaction and Behaviour

* **Access:** Platform Admin via "Subscriptions & Billing"; Institutional Admin via "Institution Settings -> Subscription & Billing" (`PROP-02`).

* **Information Viewed:** Current Plan card, Subscription Status badge, Validity Period (Start Date – End Date), Grace Period countdown (if in `Grace Period`), Billing Profile details, and Payment/Invoice History table (Reference, Date, Amount in `NGN`, Payment Status: `Pending`, `Paid`, `Failed`).

* **Actions Performed:** Assign/Select Plan, Edit Billing Details, Initiate Subscription Payment / Renewal (`Institutional Admin`), Download/View Invoice Receipt.

* **Validations:** Billing Legal Name (required), Billing Email (required, valid email), selected Plan must be `Active` and its Max User Capacity must be $\ge$ the institution's current active user count.

* **Post-Action Behaviour:** Billing updates save immediately with an audit log (`F-82`); clicking "Pay / Renew Subscription" creates a `Pending` payment transaction and redirects/opens the payment gateway checkout flow (`F-67`).

* **States:** Loading state, Empty payment history state, Banner warning when subscription is within 14 days of expiry or in `Grace Period` (`F-04`).

### E. Business Rules

* **BR-01 & BR-02:** An Institutional Admin can only view and manage billing for their own institution.

* **BR-28:** Subscription assignments, plan changes, and billing modifications are logged in `F-82`.

* **BR-29:** All subscription billing is strictly institutional in `NGN`.

### F. Permissions and Access Control

* **Platform Admin:** View and manage billing profiles and subscription assignments across all institutions.

* **Institutional Admin:** View subscription status, update billing profile, select plan, and initiate payment strictly for their own institution.

* **All Other Actors:** No access.

### G. Data Requirements

* **Captured:** Subscription ID, Institution ID (`F-01`), Plan ID (`F-02`), Subscription Status (`Pending Payment`, `Active`, `Grace Period`, `Expired`, `Cancelled`), Current Period Start Timestamp, Current Period End Timestamp, Grace Period End Timestamp (`F-04`), Billing Legal Name, Billing Email, Billing Address, Tax/Registration ID, Payment Transaction History records.

* **Relationships:** Links `F-01` (Institution) and `F-02` (Plan) to `F-67`–`F-70` (Payment & Access Enforcement).

### H. Dependencies and Integrations

* **Required Features:** `F-01`, `F-02`, `F-04`, `F-64`, `F-66`, `F-67`–`F-70`, `F-71`, `F-82`.

### I. Acceptance Criteria

* **AC-F03-01 (Positive — Institutional Billing Update & Plan Selection):** Given an authenticated Institutional Admin, When they update their institution's Billing Legal Name and Billing Email and select an `Active` plan to renew, Then the billing profile is saved, a `Pending` payment transaction is created in `NGN`, and the payment initiation workflow (`F-67`) starts.

* **AC-F03-02 (Validation — Plan Capacity Below Active Users):** Given an institution with $1,200$ active users, When an Institutional Admin attempts to select a subscription plan with a Max User Capacity of $1,000$, Then the system blocks plan selection and displays a capacity validation error.

* **AC-F03-03 (Permission — Cross-Tenant Billing Isolation):** Given an Institutional Admin of Institution A, When they attempt to view or access the billing records of Institution B, Then the system denies access (`BR-01`, `BR-02`).

## F-04: Subscription Grace Period Management

### A. Feature Identification

* **Feature ID:** F-04

* **Feature Name:** Subscription Grace Period Management

* **Feature Category:** Platform Administration (User-Facing Functionality)

* **Primary Actor:** Platform Admin

* **Supporting Actors:** Subscription Access Enforcement Service (`F-70`), Audit Process (`F-82`)

* **MVP Priority:** P0

* **Source User Stories:** PA-07

* **Short Feature Description:** Allows Platform Admins to configure default and institution-specific subscription grace periods (in days) that govern how long an institution retains access after its subscription period expires before access restrictions (`F-70`) are enforced.

### B. Business Purpose

* **Problem Solved:** Institutional procurement and bank approval cycles in tertiary institutions can experience administrative delays around renewal dates; immediate hard lockouts on day one of expiry would disrupt active academic defences or submissions.

* **Necessity for Clario:** Provides a configurable buffer period between subscription expiry and access restriction enforcement (`F-70`).

* **Business/Academic Value:** Balances revenue protection with academic continuity.

* **Impact if Omitted:** Expired institutions would either suffer immediate disruptive lockouts or continue using the platform indefinitely without payment controls.

### C. Functional Requirements

* **FR-015:** The system must allow a Platform Admin to configure a platform-wide default subscription grace period duration (in integer calendar days, e.g., $0$ to $90$ days) and optionally override the grace period duration for a specific institutional subscription (`F-03`).

* **FR-016:** When an active institutional subscription passes its `Current Period End Timestamp` without a verified renewal payment (`F-69`), the system must automatically calculate `Grace Period End Timestamp = Current Period End Timestamp + Configured Grace Period Days` (evaluated in the institution's timezone) and transition the subscription status to `Grace Period` (if Grace Period Days $> 0$) or immediately to `Expired` (if Grace Period Days $= 0$).

* **FR-017:** The system must expose configurable permission matrix toggles for the `Grace Period` state and the `Expired` state (`F-70`) so that once policy decision `OD-06` (`GAP-10`) is finalized, the exact allowed operations during grace period vs. post-expiry restriction are enforced without code changes.

### D. User Interaction and Behaviour

* **Access:** Platform Admin Console -> "Subscriptions & Billing -> Grace Period Settings" (and per-institution override on the Institution Subscription detail view).

* **Information Viewed:** Default Grace Period (days), Per-Institution Grace Period Override (days, optional), Calculated Grace Period End Date, Audit reason for override.

* **Actions Performed:** Update Default Grace Period, Set/Clear Institution Grace Period Override.

* **Validations:** Grace period duration must be an integer between $0$ and $90$ days; per-institution override requires a mandatory justification note ($10$–$300$ chars).

* **Post-Action Behaviour:** Updates recalculate the `Grace Period End Timestamp` for any currently affected subscription, trigger `F-70` evaluation, and log an audit record (`F-82`).

* **States:** Loading, Success toast, Validation error state.

### E. Business Rules

* **BR-28:** All changes to default or institution-specific grace periods are logged in the administrative audit trail (`F-82`).

* **Open Decision Reference (`OD-06` / `GAP-10`):** Which specific actor operations remain permitted during the `Grace Period` versus after `Expired` restrictions begin is tracked in `mvp-open-decisions.md`.

### F. Permissions and Access Control

* **Platform Admin:** Full access to configure default and per-institution grace periods.

* **Institutional Admin:** Read-only visibility of their institution's grace period end date when their subscription is expiring or in `Grace Period`.

* **All Other Actors:** No access.

### G. Data Requirements

* **Captured:** Default Grace Period Days (integer), Institution Override Grace Period Days (nullable integer), Override Justification, Calculated Grace Period End Timestamp, Updated By Actor ID, Timestamp.

### H. Dependencies and Integrations

* **Required Features:** `F-03`, `F-64`, `F-66`, `F-70` (Subscription Access Enforcement), `F-82`.

### I. Acceptance Criteria

* **AC-F04-01 (Positive — Grace Period Calculation):** Given an institution with an active subscription expiring on `2026-11-30 23:59:59 WAT` and a configured grace period of `14` days, When the subscription end timestamp passes without renewal, Then the subscription transitions to `Grace Period` with `Grace Period End Timestamp` set to `2026-12-14 23:59:59 WAT`.

* **AC-F04-02 (Validation — Invalid Grace Period Value):** Given an authenticated Platform Admin, When they attempt to set a negative grace period (`-5` days) or non-integer value, Then the system rejects the input with a validation error.

## F-05: Platform Administrator Management

### A. Feature Identification

* **Feature ID:** F-05

* **Feature Name:** Platform Administrator Management

* **Feature Category:** Platform Administration (User-Facing Functionality)

* **Primary Actor:** Platform Admin

* **Supporting Actors:** Authentication Service (`F-64`), Email Service (`F-71`), Audit Process (`F-82`)

* **MVP Priority:** P0

* **Source User Stories:** PA-08

* **Short Feature Description:** Enables existing Platform Admins to invite, view, update, enforce MFA on, and deactivate other Platform Admin accounts.

### B. Business Purpose

* **Problem Solved:** Platform operations cannot rely on a single shared superuser credential; individual, accountable Platform Admin accounts are required for operational continuity and security auditability.

* **Necessity for Clario:** Distributes platform management responsibilities while maintaining individual accountability and mandatory MFA (`SEC-06`).

* **Business/Academic Value:** Reduces operational bottleneck and single-point-of-failure risk for the SaaS operator.

* **Impact if Omitted:** Platform administration would rely on un-auditable shared credentials or database-level manual provisioning.

### C. Functional Requirements

* **FR-018:** The system must allow an authenticated Platform Admin to invite a new Platform Admin by specifying Full Name and Email Address, generating a time-limited single-use onboarding token sent via `F-71`.

* **FR-019:** The system must enforce mandatory Multi-Factor Authentication (`MFA`, `SEC-06`) enrollment during a Platform Admin's initial account activation before granting access to any Platform Admin functionality (`F-64`).

* **FR-020:** The system must allow a Platform Admin to deactivate another Platform Admin account, immediately revoking all active sessions (`F-65`) for the deactivated administrator.

* **FR-021:** The system must prevent a Platform Admin from deactivating their own currently authenticated account or deactivating the last remaining active Platform Admin account on the platform.

### D. User Interaction and Behaviour

* **Access:** Platform Admin Console -> "Platform Administrators".

* **Information Viewed:** List of Platform Admins showing Full Name, Email, Account Status (`Invited`, `Active`, `Deactivated`), MFA Status (`Enrolled`, `Pending`), Last Login Timestamp.

* **Actions Performed:** Invite Platform Admin, Resend Invitation, Update Name, Deactivate/Reactivate Platform Admin.

* **Validations:** Full Name (required, 2–100 chars), Email (required, valid format, unique across platform admins).

* **Post-Action Behaviour:** Invitation email sent (`F-71`); deactivation terminates sessions (`F-65`); all actions logged in `F-82`.

* **States:** Loading, Empty search filter state, Error banner when attempting self-deactivation.

### E. Business Rules

* **BR-28:** Creation, invitation, status changes, and role modifications of Platform Admins must be recorded in the administrative audit log (`F-82`).

* **SEC-06:** MFA is strictly mandatory for all Platform Admins.

### F. Permissions and Access Control

* **Platform Admin:** Full access to manage Platform Admin accounts (except self-deactivation).

* **All Institutional Actors:** No access.

### G. Data Requirements

* **Captured:** Platform Admin User ID, Full Name, Email Address, Password Hash (`F-64`), MFA Secret/Enrollment Status, Account Status (`Invited`, `Active`, `Deactivated`), Invitation Token & Expiry, Last Login Timestamp, Created/Updated By.

### H. Dependencies and Integrations

* **Required Features:** `F-64`, `F-65`, `F-66`, `F-71`, `F-82`.

### I. Acceptance Criteria

* **AC-F05-01 (Positive — Platform Admin Invitation & MFA Enforcement):** Given an authenticated Platform Admin, When they invite a new Platform Admin via email and the invitee sets a password, Then the system requires the invitee to complete MFA enrollment (`SEC-06`) before granting access to the Platform Admin console.

* **AC-F05-02 (Boundary — Prevent Self-Deactivation / Last Admin Lockout):** Given an authenticated Platform Admin, When they attempt to deactivate their own account, Then the system blocks the action and displays an error message stating that administrators cannot deactivate their own account.

## F-08: Institutional Academic Data Protection

### A. Feature Identification

* **Feature ID:** F-08

* **Feature Name:** Institutional Academic Data Protection

* **Feature Category:** Platform Administration & Security Enforcement (Supporting System Capability & Access Control)

* **Primary Actor:** Platform Admin (Subject of Restriction)

* **Supporting Actors:** Access Control Service (`F-66`), Audit Process (`F-82`)

* **MVP Priority:** P0

* **Source User Stories:** PA-11

* **Short Feature Description:** Enforces strict technical boundaries preventing Platform Admins from having unrestricted default access to confidential institutional academic records (student project documents, topic proposals, supervisor/examiner feedback, and unpublished/published student grades), and logs any authorised break-glass diagnostic access.

### B. Business Purpose

* **Problem Solved:** Tertiary institutions act as Data Controllers (`PRV-01`) for their academic records and intellectual property; unrestricted SaaS operator browsing of student dissertations, exam scores, and supervisory feedback violates institutional confidentiality and data protection principles.

* **Necessity for Clario:** Enforces `SEC-15` and `SEC-16` at the authorization layer.

* **Business/Academic Value:** Builds institutional trust and ensures compliance with the Nigeria Data Protection Act 2023 (`NDPA`).

* **Impact if Omitted:** Platform Admins would have unrestricted visibility into confidential academic submissions and grading records across all tenants.

### C. Functional Requirements

* **FR-022:** By default, the system must block Platform Admin accounts from querying, viewing, or downloading student topic proposals (`F-20`), uploaded milestone/final project documents (`F-32`, `F-37`, `F-77`), submission feedback and discussions (`F-33`, `F-34`), and Supervisor/Examiner assessment scores or comments (`F-52`–`F-61`).

* **FR-023:** The system must restrict Platform Admin visibility of institutional tenants to operational, structural, and subscription metadata (`F-01`, `F-03`, aggregate user counts, and system health metrics).

* **FR-024:** Where restricted diagnostic or institutional data export (`FR-006`) support access is executed by a Platform Admin on behalf of an institution (`SEC-16`), the system must require an explicit support reference/justification, scope the action to a time-limited session, and record an immutable high-priority audit log entry (`F-82`) visible to the affected institution's Institutional Admin.

### D. User Interaction and Behaviour

* **Access:** Automatically enforced across all Platform Admin views and API endpoints (`F-66`).

* **Information Viewed:** Platform Admins see tenant operational metrics and subscription status; academic content routes return `403 Forbidden — Confidential Institutional Academic Record`.

* **Actions Performed:** If initiating an authorised institutional data export (`FR-006`) or diagnostic action, the Platform Admin must enter a mandatory Institutional Request Reference and Justification.

* **Post-Action Behaviour:** Unauthorised access attempts are blocked and logged as security events (`F-82`); authorised support actions record a tamper-resistant audit entry.

### E. Business Rules

* **BR-01 & BR-02:** Strict institutional boundary and scope enforcement.

* **SEC-15 & SEC-16:** Platform Admins must not have unrestricted default access to institutional academic records; any authorised support access must be restricted and audited.

### F. Permissions and Access Control

* **System Access Control (`F-66`):** Denies Platform Admin role access to all academic content endpoints (`F-20`–`F-62`, `F-77`).

### G. Data Requirements

* **Captured:** Security/Audit Log Record containing Platform Admin ID, Target Institution ID, Attempted Resource/Operation, Support Reference & Justification (if applicable), Outcome (`Denied` or `Authorised Support Action`), Timestamp.

### H. Dependencies and Integrations

* **Required Features:** `F-66` (Role and Scope-Based Access Control), `F-77` (Authorised Document Retrieval), `F-82` (Audit Logging).

### I. Acceptance Criteria

* **AC-F08-01 (Permission — Block Default Academic Document & Grade Access):** Given an authenticated Platform Admin, When they attempt to access a student's project workspace, download a project document (`F-77`), or view an examiner's grading sheet, Then the system denies the request with a `403 Forbidden` response and logs the denied attempt.

* **AC-F08-02 (Audit — Restricted Support Action Logging):** Given an authenticated Platform Admin executing an authorised institutional archive export (`FR-006`), When they submit the action with a valid Institutional Request Reference, Then the system records an immutable audit log entry (`F-82`) visible to the Institution's Institutional Admin.

# Module B: Institutional Administration

## F-09: Faculty Management

### A. Feature Identification

* **Feature ID:** F-09

* **Feature Name:** Faculty Management

* **Feature Category:** Institutional Administration (User-Facing Functionality)

* **Primary Actor:** Institutional Admin

* **Supporting Actors:** Audit Process (`F-82`)

* **MVP Priority:** P0

* **Source User Stories:** IA-01

* **Short Feature Description:** Enables Institutional Admins to create, view, update, and deactivate/archive Faculties (the top-level academic division within an institution).

### B. Business Purpose

* **Problem Solved:** Tertiary institutions organize departments and degree programmes under faculties (or colleges/schools); without faculty records, the institutional hierarchy (`Institution -> Faculty -> Department -> Programme -> Academic Session`) cannot be established.

* **Necessity for Clario:** Establishes the first level of the academic hierarchy within an institutional tenant.

* **Business/Academic Value:** Mirrors the real-world organizational structure of universities and polytechnics.

* **Impact if Omitted:** Departments (`F-10`) and Programmes (`F-11`) cannot be structured under their parent faculties.

### C. Functional Requirements

* **FR-025:** The system must allow an Institutional Admin to create a Faculty within their institution by providing a Faculty Name, Faculty Code, and optional Description.

* **FR-026:** The system must enforce uniqueness of Faculty Name and Faculty Code within the same institution (`BR-01`), while allowing different institutions to use identical faculty names or codes.

* **FR-027:** The system must allow an Institutional Admin to update Faculty Name, Code, Description, or Status (`Active`, `Archived`), and must prevent deletion or archiving of a Faculty that contains active Departments (`F-10`).

### D. User Interaction and Behaviour

* **Access:** Institutional Admin Console -> "Academic Structure -> Faculties".

* **Information Viewed:** List of Faculties within the institution showing Faculty Name, Faculty Code, Number of Departments, Status (`Active`, `Archived`), and Created Date.

* **Actions Performed:** Create Faculty, Edit Faculty, Archive/Reactivate Faculty.

* **Validations:** Faculty Name (required, 2–150 chars, unique within institution), Faculty Code (required, 2–20 chars, unique within institution).

* **Post-Action Behaviour:** Faculty is saved, list updates, and an audit log entry (`F-82`) is recorded.

* **States:** Loading state, Empty state ("No faculties created yet — Create your first faculty to begin setting up departments"), Error validation state.

### E. Business Rules

* **BR-01 & BR-02:** Faculties are strictly scoped to the Institutional Admin's institution.

* **BR-28:** Faculty creation, modification, and status changes are logged in `F-82`.

### F. Permissions and Access Control

* **Institutional Admin:** Full create, read, update, and archive access within their own institution.

* **Project Coordinator / Supervisor / Student / Examiner:** Read-only visibility of their associated Faculty name where displayed in profile/project context.

### G. Data Requirements

* **Captured:** Faculty ID, Institution ID (`F-01`), Faculty Name, Faculty Code, Description (optional), Status (`Active`, `Archived`), Created/Updated Timestamps, Created/Updated By.

* **Relationships:** Belongs to one Institution (`F-01`); has many Departments (`F-10`).

### H. Dependencies and Integrations

* **Required Features:** `F-01`, `F-64`, `F-66`, `F-82`.

* **Consumed By:** `F-10` (Department Management).

### I. Acceptance Criteria

* **AC-F09-01 (Positive — Faculty Creation):** Given an authenticated Institutional Admin of Institution A, When they create a Faculty named `Faculty of Engineering` with code `ENG`, Then the Faculty is saved under Institution A and logged in `F-82`.

* **AC-F09-02 (Multi-Tenant Uniqueness):** Given `Faculty of Engineering` (`ENG`) exists in Institution A, When an Institutional Admin of Institution B creates `Faculty of Engineering` (`ENG`), Then the system allows it without conflict; When Institution A attempts to create a second Faculty with code `ENG`, the system rejects it with a duplicate error.

* **AC-F09-03 (Data Integrity — Prevent Archiving Faculty with Active Departments):** Given a Faculty with at least one `Active` Department (`F-10`), When the Institutional Admin attempts to archive the Faculty, Then the system blocks the action and instructs the user to archive or reassign the child departments first.

## F-10: Department Management

### A. Feature Identification

* **Feature ID:** F-10

* **Feature Name:** Department Management

* **Feature Category:** Institutional Administration (User-Facing Functionality)

* **Primary Actor:** Institutional Admin

* **Supporting Actors:** Audit Process (`F-82`)

* **MVP Priority:** P0

* **Source User Stories:** IA-02

* **Short Feature Description:** Enables Institutional Admins to create, view, update, and archive academic Departments within Faculties (`F-09`).

### B. Business Purpose

* **Problem Solved:** Academic degree programmes and supervisors belong to specific academic departments under a faculty.

* **Necessity for Clario:** Establishes the second level of the institutional academic hierarchy (`Faculty -> Department`).

* **Business/Academic Value:** Organizes programmes (`F-11`) and supervisor pools (`F-16`) by department.

* **Impact if Omitted:** Programmes (`F-11`) cannot be linked to departments, breaking the required institutional hierarchy.

### C. Functional Requirements

* **FR-028:** The system must allow an Institutional Admin to create a Department within their institution by selecting an `Active` parent Faculty (`F-09`) and specifying a Department Name, Department Code, and optional Description.

* **FR-029:** The system must enforce uniqueness of Department Name and Department Code within the institution.

* **FR-030:** The system must allow an Institutional Admin to update Department details, reassign parent Faculty (within the same institution), or change Status (`Active`, `Archived`), and must prevent archiving a Department that has active Programmes (`F-11`).

### D. User Interaction and Behaviour

* **Access:** Institutional Admin Console -> "Academic Structure -> Departments".

* **Information Viewed:** Filterable list of Departments showing Department Name, Code, Parent Faculty Name, Number of Programmes, and Status.

* **Actions Performed:** Create Department, Edit Department, Archive/Reactivate Department.

* **Validations:** Parent Faculty (required, must be `Active` and belong to the same institution), Department Name (required, 2–150 chars, unique in institution), Department Code (required, 2–20 chars, unique in institution).

* **Post-Action Behaviour:** Department record persists, UI updates, and audit entry (`F-82`) is written.

* **States:** Loading state, Empty state (with prompt to create a Faculty first if no Faculty exists), Validation error state.

### E. Business Rules

* **BR-01 & BR-02:** Strictly scoped to the Institutional Admin's institution.

* **BR-28:** All Department creation and update actions are audited (`F-82`).

### F. Permissions and Access Control

* **Institutional Admin:** Full create, read, update, and archive access within their own institution.

* **Other Institutional Actors:** Read-only visibility of their associated Department name/code.

### G. Data Requirements

* **Captured:** Department ID, Institution ID (`F-01`), Faculty ID (`F-09`), Department Name, Department Code, Description (optional), Status (`Active`, `Archived`), Timestamps.

* **Relationships:** Belongs to one Faculty (`F-09`) and one Institution (`F-01`); has many Programmes (`F-11`) and Supervisor Records (`F-16`).

### H. Dependencies and Integrations

* **Required Features:** `F-01`, `F-09`, `F-64`, `F-66`, `F-82`.

* **Consumed By:** `F-11` (Programme Management), `F-16` (Supervisor Records Management).

### I. Acceptance Criteria

* **AC-F10-01 (Positive — Department Creation):** Given an `Active` Faculty `ENG` in Institution A, When the Institutional Admin creates Department `Computer Engineering` with code `CPE` under `ENG`, Then the Department is created, linked to `ENG`, and logged in `F-82`.

* **AC-F10-02 (Validation — Archived Parent Faculty):** Given an `Archived` Faculty, When an Institutional Admin attempts to create a new Department under that Faculty, Then the system rejects the action with a validation error.

## F-11: Programme Management

### A. Feature Identification

* **Feature ID:** F-11

* **Feature Name:** Programme Management

* **Feature Category:** Institutional Administration (User-Facing Functionality)

* **Primary Actor:** Institutional Admin

* **Supporting Actors:** Project Coordinator (operates within assigned Programme scope), Audit Process (`F-82`)

* **MVP Priority:** P0

* **Source User Stories:** IA-03

* **Short Feature Description:** Enables Institutional Admins to create, view, update, and archive academic Programmes within Departments (`F-10`).

### B. Business Purpose

* **Problem Solved:** Final-year projects, grading rubrics, milestone structures, and Project Coordinator appointments are administered at the academic Programme level (e.g., `B.Sc. Computer Science`, `B.Eng. Electrical Engineering`).

* **Necessity for Clario:** Establishes the third level of the institutional hierarchy (`Faculty -> Department -> Programme`) and serves as the primary operational unit for Project Coordinators (`BR-03`).

* **Business/Academic Value:** Allows different degree programmes within the same department to maintain distinct project milestones (`F-29`), grading structures (`F-51`), and coordinators (`F-15`).

* **Impact if Omitted:** Project Coordinators cannot be appointed (`F-15`), and students (`F-19`) cannot be registered into a programme.

### C. Functional Requirements

* **FR-031:** The system must allow an Institutional Admin to create an academic Programme by selecting an `Active` parent Department (`F-10`) and specifying Programme Name, Programme Code, Degree/Award Title (optional, e.g., `B.Sc.`, `B.Eng.`, `HND`), and Status (`Active`, `Archived`).

* **FR-032:** The system must enforce uniqueness of Programme Name and Programme Code within the institution.

* **FR-033:** The system must prevent archiving or deleting a Programme that has active Coordinator appointments (`F-15`) or active student project records (`F-19`) in an active Academic Session (`F-12`).

### D. User Interaction and Behaviour

* **Access:** Institutional Admin Console -> "Academic Structure -> Programmes".

* **Information Viewed:** Filterable table (by Faculty and Department) showing Programme Name, Programme Code, Parent Department, Parent Faculty, Active Coordinator(s) for the current session, and Status.

* **Actions Performed:** Create Programme, Edit Programme, Archive/Reactivate Programme.

* **Validations:** Parent Department (required, `Active`, same institution), Programme Name (required, 2–150 chars, unique in institution), Programme Code (required, 2–25 chars, unique in institution).

* **Post-Action Behaviour:** Programme saved, UI updated, audit event (`F-82`) recorded.

* **States:** Loading, Empty state, Validation error state.

### E. Business Rules

* **BR-01 & BR-02:** Strictly scoped to the Institutional Admin's institution.

* **BR-03:** A Programme (paired with an Academic Session in `F-15`) defines the exact scope of a Project Coordinator assignment.

* **BR-28:** All Programme management operations are logged in `F-82`.

### F. Permissions and Access Control

* **Institutional Admin:** Full create, read, update, and archive access within their institution.

* **Project Coordinator:** Read access to their assigned Programme(s).

### G. Data Requirements

* **Captured:** Programme ID, Institution ID (`F-01`), Faculty ID (`F-09`), Department ID (`F-10`), Programme Name, Programme Code, Degree/Award Type (optional), Status (`Active`, `Archived`), Timestamps.

* **Relationships:** Belongs to one Department (`F-10`); referenced by Coordinator Appointments (`F-15`), Student Registrations (`F-19`), Milestone Configurations (`F-29`), and Assessment Structures (`F-51`).

### H. Dependencies and Integrations

* **Required Features:** `F-01`, `F-09`, `F-10`, `F-64`, `F-66`, `F-82`.

* **Consumed By:** `F-15`, `F-19`, `F-29`, `F-51`.

### I. Acceptance Criteria

* **AC-F11-01 (Positive — Programme Creation):** Given an `Active` Department `CPE`, When the Institutional Admin creates Programme `B.Eng. Computer Engineering` with code `BENG-CPE`, Then the Programme is saved under `CPE` and logged in `F-82`.

* **AC-F11-02 (Data Integrity — Prevent Archiving Programme with Active Session Projects):** Given a Programme with registered students in an `Active` Academic Session, When the Institutional Admin attempts to archive the Programme, Then the system blocks the action and displays an error message.

## F-12: Academic Session Management

### A. Feature Identification

* **Feature ID:** F-12

* **Feature Name:** Academic Session Management

* **Feature Category:** Institutional Administration (User-Facing Functionality)

* **Primary Actor:** Institutional Admin

* **Supporting Actors:** Project Coordinator, Audit Process (`F-82`)

* **MVP Priority:** P0

* **Source User Stories:** IA-04

* **Short Feature Description:** Enables Institutional Admins to create, manage, activate, and close Academic Sessions (e.g., `2026/2027`) within their institution, as well as view/update the institution's configured timezone (`PROP-04`).

### B. Business Purpose

* **Problem Solved:** Final-year projects are cohort-bound by academic year/session; institutions need to separate current-year projects, coordinator appointments, milestones, and results from past or upcoming academic years.

* **Necessity for Clario:** Completes the institutional hierarchy (`Institution -> Faculty -> Department -> Programme -> Academic Session`) and bounds Coordinator scope (`BR-03`).

* **Business/Academic Value:** Enables clean multi-year operation while preserving historical session records in read-only closed states.

* **Impact if Omitted:** Coordinator appointments (`F-15`), student registrations (`F-19`), and project lifecycles cannot be scoped to an academic year.

### C. Functional Requirements

* **FR-034:** The system must allow an Institutional Admin to create an Academic Session by specifying a unique Session Name/Label (e.g., `2026/2027`), Start Date, End Date, and Status (`Upcoming`, `Active`, `Closed`).

* **FR-035:** The system must validate that the Session `End Date` is strictly chronologically after the `Start Date` (evaluated in the institution's configured timezone).

* **FR-036:** The system must allow an Institutional Admin to view and update the institution's configured IANA timezone (`PROP-04`, `NFR-DOM`), applying the timezone to all deadline evaluations across the institution.

* **FR-037:** When an Academic Session is transitioned to `Closed`, the system must preserve all projects, submissions, assessments, and published results within that session in an immutable, read-only state.

### D. User Interaction and Behaviour

* **Access:** Institutional Admin Console -> "Academic Structure -> Academic Sessions" (and Timezone setting in Institutional Settings header).

* **Information Viewed:** List of Academic Sessions showing Session Name, Start Date, End Date, Status (`Upcoming`, `Active`, `Closed`), and institution Timezone banner (e.g., `Africa/Lagos (WAT, UTC+1)`).

* **Actions Performed:** Create Session, Edit Session Dates/Name, Activate Session, Close Session (with confirmation dialog), Update Institutional Timezone (`PROP-04`).

* **Validations:** Session Name (required, unique within institution, 4–50 chars), Start Date (required, valid date), End Date (required, valid date $>$ Start Date).

* **Post-Action Behaviour:** Session saved, status updated, audit log (`F-82`) written.

* **States:** Loading, Empty state, Confirmation modal before closing an `Active` session.

### E. Business Rules

* **BR-01 & BR-02:** Strictly scoped to the institution.

* **BR-03:** Every Project Coordinator assignment is scoped to one Programme (`F-11`) and one Academic Session (`F-12`).

* **BR-28:** Session creation, status changes, and timezone updates are logged in `F-82`.

* *(Note: Automated Incomplete Project Carry-Forward `F-63`/`F-81`/`BR-24` is deferred to P1; see Open Decision `OD-03`/`GAP-07` for manual session setup interaction).*

### F. Permissions and Access Control

* **Institutional Admin:** Full create, read, update, activate, and close access within their institution.

* **Project Coordinator / Supervisor / Student / Examiner:** Read access to sessions relevant to their assignments.

### G. Data Requirements

* **Captured:** Academic Session ID, Institution ID (`F-01`), Session Name, Start Date, End Date, Session Status (`Upcoming`, `Active`, `Closed`), Created/Updated Timestamps.

* **Relationships:** Belongs to one Institution (`F-01`); scopes Coordinator Appointments (`F-15`), Student Registrations (`F-19`), Projects (`F-21`), and Milestones (`F-29`).

### H. Dependencies and Integrations

* **Required Features:** `F-01`, `F-64`, `F-66`, `F-82`.

* **Consumed By:** `F-15`, `F-19`–`F-62`.

### I. Acceptance Criteria

* **AC-F12-01 (Positive — Session Creation):** Given an authenticated Institutional Admin, When they create session `2026/2027` with Start Date `2026-10-01`, End Date `2027-07-31`, and Status `Active`, Then the session is created and available for Coordinator appointment (`F-15`).

* **AC-F12-02 (Validation — Invalid Date Range):** Given an authenticated Institutional Admin, When they attempt to create or update a session where `End Date <= Start Date`, Then the system rejects the submission with a date validation error.

* **AC-F12-03 (Data Integrity — Closed Session Read-Only Enforcement):** Given an Academic Session transitioned to `Closed`, When a Student or Examiner attempts to make a new submission or modify an assessment in that session, Then the system blocks the write operation.

## F-13: Institutional User Management

### A. Feature Identification

* **Feature ID:** F-13

* **Feature Name:** Institutional User Management

* **Feature Category:** Institutional Administration (User-Facing Functionality)

* **Primary Actor:** Institutional Admin

* **Supporting Actors:** Project Coordinator (registers/manages student project records in `F-19`), Authentication Service (`F-64`), Email Service (`F-71`), Audit Process (`F-82`)

* **MVP Priority:** P0

* **Source User Stories:** IA-05, IA-06, IA-07

* **Short Feature Description:** Enables Institutional Admins to create/register (individually or via bulk CSV import), invite, update, manage under-18 parental/guardian consent flags (`PROP-05`), assist with account recovery (`SEC-08`), and deactivate institutional user accounts.

### B. Business Purpose

* **Problem Solved:** Institutions have hundreds or thousands of students, supervisors, coordinators, and examiners who need authenticated, tenant-scoped accounts to participate in Clario workflows.

* **Necessity for Clario:** Provides user onboarding, lifecycle management, and data-subject record maintenance within each institution.

* **Business/Academic Value:** Centralizes user directory management and allows immediate deactivation of users who leave the institution.

* **Impact if Omitted:** No institutional staff or students can log into Clario or be assigned to roles, supervision, or examination.

### C. Functional Requirements

* **FR-038:** The system must allow an Institutional Admin to create and invite institutional users individually or via validated bulk CSV upload (supporting Full Name, Email Address, Institutional ID/Staff/Matriculation Number, Primary Department/Programme, Initial Role (`F-14`), and Under-18 Minor Indicator (`PROP-05`)).

* **FR-039:** Before creating new active users, the system must verify that adding the users will not exceed the institution's subscribed plan user capacity (`F-02`, `F-03`) or the MVP ceiling of $5,000$ users per institution (`SCA-02`).

* **FR-040:** Upon user creation, the system must dispatch an onboarding invitation email (`F-71`) containing a secure, time-limited activation link for the user to set their password (and enroll in MFA if assigned an Institutional Admin or Project Coordinator role per `SEC-06`).

* **FR-041:** Where a student user is flagged as Under 18 (`NFR-PRV: Students under 18`, `PROP-05`) and institutional policy requires parental/guardian consent for the applicable processing activity, the system must record Guardian Name, Guardian Email, and Consent Verification Status (`Pending`, `Verified`, `Not Required - Statutory Educational Basis`), and allow the Institutional Admin to oversee and verify consent status.

* **FR-042:** The system must allow an Institutional Admin to update user profile information (Full Name, Email, Institutional ID/Staff/Matriculation Number, Department affiliation) to satisfy data accuracy and correction rights (`NFR-PRV`), logging changes in `F-82`.

* **FR-043:** The system must allow an Institutional Admin to deactivate an institutional user account, immediately terminating the user's active sessions (`F-65`) and blocking login (`F-64`) while preserving all historical academic submissions, feedback, and audit records associated with that user.

* **FR-044:** The system must allow an Institutional Admin to trigger a password recovery/reset email or clear a temporary login lockout (`SEC-05`, `SEC-08`) for an institutional user within their tenant.

### D. User Interaction and Behaviour

* **Access:** Institutional Admin Console -> "Users Directory".

* **Information Viewed:** Searchable, paginated user directory filterable by Role (`F-14`), Department (`F-10`), and Account Status (`Invited`, `Active`, `Deactivated`), showing Name, Email, Staff/Matric Number, Roles, MFA Status, Under-18 Consent Status (if applicable), and Last Login.

* **Actions Performed:** Create User, Bulk Upload Users (CSV with row-by-row validation preview), Edit User, Resend Invite, Trigger Password Reset / Unlock Account (`SEC-08`), Deactivate/Reactivate User.

* **Validations:** Full Name (required, 2–120 chars), Email (required, valid format, unique within institution), Institutional ID/Matric/Staff Number (required, unique within institution), Capacity Check (total active/invited users $\le$ plan limit and $\le 5000$).

* **Post-Action Behaviour:** User created/updated, invitation email queued (`F-71`), sessions revoked on deactivation (`F-65`), audit entry written (`F-82`).

* **States:** Loading state, Bulk CSV validation summary modal (showing valid rows vs. error rows with line numbers), Empty state, Error state.

### E. Business Rules

* **BR-01 & BR-02:** Institutional Admins can only manage users belonging to their own institution.

* **BR-28:** User creation, bulk import, profile modification, role change, and deactivation are logged in `F-82`.

* **NFR-PRV (Deletion & Retention Safeguard):** Deactivating a user or handling an erasure request must never delete academic project records, submissions, or grades that the institution is legally or academically required to retain.

### F. Permissions and Access Control

* **Institutional Admin:** Full create, read, update, invite, password-recovery assist, and deactivate access for users in their institution (cannot deactivate their own currently logged-in account).

* **Project Coordinator:** Can register and manage Student project records within their assigned Programme and Academic Session (`F-19`).

* **All Users:** Can view their own profile and request corrections to inaccurate personal data.

### G. Data Requirements

* **Captured:** User ID, Institution ID (`F-01`), Full Name, Email Address, Institutional ID (Staff/Matric Number), Primary Department ID (`F-10`, optional for non-academic admins), Account Status (`Invited`, `Active`, `Deactivated`), Under-18 Flag (boolean), Guardian Email & Consent Status (nullable), Password Hash (`F-64`), MFA Status (`F-64`), Timestamps.

* **Protected:** Credentials and MFA secrets (`SEC-20`); personal data protected under `NDPA 2023`.

### H. Dependencies and Integrations

* **Required Features:** `F-01`, `F-03`, `F-10`, `F-14`, `F-64`, `F-65`, `F-66`, `F-71`, `F-82`.

### I. Acceptance Criteria

* **AC-F13-01 (Positive — Single & Bulk User Registration):** Given an authenticated Institutional Admin within subscription capacity, When they create a user or upload a valid CSV of users, Then the system creates the user records scoped to the institution, dispatches activation emails (`F-71`), and records an audit log (`F-82`).

* **AC-F13-02 (Positive — User Deactivation & Session Revocation):** Given an `Active` user with an open session in the institution, When the Institutional Admin deactivates the user, Then the user's status becomes `Deactivated`, their active session is immediately invalidated (`F-65`), and their historical project/academic records remain intact.

* **AC-F13-03 (Boundary — Subscription / 5,000 User Limit Enforcement):** Given an institution at its maximum subscribed user capacity (or $5,000$ users), When the Institutional Admin attempts to create or import additional users, Then the system rejects the operation with a capacity limit error.

## F-14: Institutional Role and Permission Management

### A. Feature Identification

* **Feature ID:** F-14

* **Feature Name:** Institutional Role and Permission Management

* **Feature Category:** Institutional Administration (User-Facing Functionality)

* **Primary Actor:** Institutional Admin

* **Supporting Actors:** Access Control Service (`F-66`), Audit Process (`F-82`)

* **MVP Priority:** P0

* **Source User Stories:** IA-08

* **Short Feature Description:** Enables Institutional Admins to assign and revoke institutional roles (`Institutional Admin`, `Project Coordinator`, `Project Supervisor`, `Project Examiner`, `Student`) for users within their institution.

### B. Business Purpose

* **Problem Solved:** Academic staff and students perform distinct functions; a single academic staff member may simultaneously serve as a `Project Supervisor` for assigned students, a `Project Examiner` for other projects, and a `Project Coordinator` for a specific programme.

* **Necessity for Clario:** Establishes the role assignments enforced by `F-66` (Role and Scope-Based Access Control).

* **Business/Academic Value:** Supports flexible academic staffing while strictly separating administrative, supervisory, examination, and student permissions.

* **Impact if Omitted:** Users would have no assigned roles or permissions to perform actions within their institution.

### C. Functional Requirements

* **FR-045:** The system must allow an Institutional Admin to assign one or more valid institutional roles (`Institutional Admin`, `Project Coordinator`, `Project Supervisor`, `Project Examiner`, `Student`) to a user within their institution.

* **FR-046:** The system must enforce role compatibility rules: a user holding the `Student` role within an institution cannot simultaneously be assigned `Institutional Admin`, `Project Coordinator`, `Project Supervisor`, or `Project Examiner` roles within that same institution; conversely, academic/administrative staff can hold combinations of `Project Supervisor`, `Project Examiner`, and `Project Coordinator` (subject to per-project independence rules in `BR-16` / `F-48` and confidentiality rules in `BR-25` / `F-18`).

* **FR-047:** Because `BR-25` (`F-18`) strictly prohibits `Institutional Admin` from accessing confidential project documents or academic feedback, if an academic staff member also performs supervision or examination, the system must enforce strict role-context separation (or require separate administrative vs. academic role contexts) so that `Institutional Admin` privileges never grant access to unassigned academic records.

* **FR-048:** When a user is assigned the `Institutional Admin` or `Project Coordinator` role, the system must immediately mark MFA as mandatory (`SEC-06`) for that user and require MFA verification before they can access `Institutional Admin` or `Project Coordinator` functions.

### D. User Interaction and Behaviour

* **Access:** Institutional Admin Console -> "Users Directory -> Manage Roles" (or "Roles & Permissions" management view).

* **Information Viewed:** User's current assigned roles, scope summary (e.g., linked Coordinator programme/session from `F-15`), MFA requirement indicator.

* **Actions Performed:** Assign Role, Revoke Role.

* **Validations:** Cannot assign `Student` alongside staff/admin roles; cannot revoke the last active `Institutional Admin` role in the institution; assigning `Project Coordinator` prompts or links to `F-15` to bind the Programme and Academic Session scope.

* **Post-Action Behaviour:** Role permissions update immediately in `F-66`, audit entry is written (`F-82`), and if `Institutional Admin` or `Project Coordinator` was added, MFA enforcement is flagged (`F-64`).

* **States:** Loading, Role conflict error message, Confirmation modal on role revocation.

### E. Business Rules

* **BR-01 & BR-02:** Role assignments are strictly scoped to the institution.

* **BR-16:** Holding both `Project Supervisor` and `Project Examiner` roles at the institution level is permitted for academic staff, but the user cannot examine any project they supervised (`F-48`).

* **BR-25:** Holding `Institutional Admin` never grants access to confidential project documents or academic feedback (`F-18`).

* **BR-28:** All role assignments and revocations are logged in `F-82`.

### F. Permissions and Access Control

* **Institutional Admin:** Full access to assign and revoke institutional roles within their tenant.

* **All Other Institutional Actors:** Read-only visibility of their own assigned roles.

### G. Data Requirements

* **Captured:** Role Assignment ID, Institution ID (`F-01`), User ID (`F-13`), Role Code (`INSTITUTIONAL_ADMIN`, `PROJECT_COORDINATOR`, `PROJECT_SUPERVISOR`, `PROJECT_EXAMINER`, `STUDENT`), Assigned By Actor ID, Assigned Timestamp, Status (`Active`, `Revoked`).

### H. Dependencies and Integrations

* **Required Features:** `F-13`, `F-15`, `F-16`, `F-18`, `F-64`, `F-66`, `F-82`.

### I. Acceptance Criteria

* **AC-F14-01 (Positive — Staff Multi-Role Assignment):** Given an academic staff user in Institution A, When the Institutional Admin assigns both `Project Supervisor` and `Project Examiner` roles to that user, Then both roles are granted and the user can switch between or access both workspaces for their respective assigned projects.

* **AC-F14-02 (Validation — Student Role Mutually Exclusive with Staff/Admin Roles):** Given a user assigned the `Student` role, When an Institutional Admin attempts to assign `Project Examiner` or `Project Coordinator` to that user, Then the system rejects the assignment with a role-incompatibility error.

* **AC-F14-03 (Security — Mandatory MFA Trigger on Coordinator/Admin Role):** Given a Supervisor user who has not previously enabled MFA, When the Institutional Admin assigns the `Project Coordinator` role to that user, Then the system requires the user to complete MFA setup (`SEC-06`) before accessing Coordinator features.

## F-15: Project Coordinator Appointment

### A. Feature Identification

* **Feature ID:** F-15

* **Feature Name:** Project Coordinator Appointment

* **Feature Category:** Institutional Administration (User-Facing Functionality)

* **Primary Actor:** Institutional Admin

* **Supporting Actors:** Project Coordinator (receives scoped appointment), Email Service (`F-71`), Audit Process (`F-82`)

* **MVP Priority:** P0

* **Source User Stories:** IA-09

* **Short Feature Description:** Enables Institutional Admins to appoint an eligible institutional user as Project Coordinator for a specific Programme (`F-11`) and a specific Academic Session (`F-12`).

### B. Business Purpose

* **Problem Solved:** Project administration (student registration, allocation, milestone configuration, defence scheduling, and result publication) requires clearly designated academic authority bounded to a specific degree programme and academic cohort.

* **Necessity for Clario:** Implements `BR-03` ("A Coordinator manages one programme and one academic session per assignment") and establishes the authorization scope enforced by `F-66`.

* **Business/Academic Value:** Ensures clear accountability for programme-level project management and prevents cross-programme administrative interference.

* **Impact if Omitted:** No Project Coordinator would have an authorized Programme + Academic Session scope to manage projects (`F-19`–`F-60`).

### C. Functional Requirements

* **FR-049:** The system must allow an Institutional Admin to create a Project Coordinator appointment by selecting an `Active` non-student user (`F-13`), one `Active` Programme (`F-11`), and one `Upcoming` or `Active` Academic Session (`F-12`) within their institution.

* **FR-050:** Each Coordinator appointment record must bind strictly to **one Programme and one Academic Session** (`BR-03`). If a user coordinates multiple programmes or sessions, the Institutional Admin must create separate, distinct Coordinator appointment records for each (Programme, Session) pair, and the Coordinator must operate within one selected (Programme, Session) context at a time.

* **FR-051:** Automatically upon appointment, if the user does not already hold the `Project Coordinator` role (`F-14`), the system must grant the role, enforce mandatory MFA (`SEC-06`), log the appointment in `F-82`, and send an appointment notification (`F-71`, `F-72`).

* **FR-052:** The system must allow an Institutional Admin to revoke or replace a Coordinator appointment for a (Programme, Academic Session) pair, immediately transferring administrative scope for that Programme and Session to the newly appointed Coordinator while preserving all historical audit records.

### D. User Interaction and Behaviour

* **Access:** Institutional Admin Console -> "Coordinator Appointments" (also accessible from the Programme detail view `F-11`).

* **Information Viewed:** Table of Coordinator Appointments filterable by Faculty, Department, Programme, and Academic Session, showing Coordinator Name, Email, Faculty, Department, Programme, Academic Session, Appointment Status (`Active`, `Revoked`), and Appointed Date.

* **Actions Performed:** Appoint Coordinator, Replace/Revoke Coordinator Appointment.

* **Validations:** Selected User must be `Active` and not hold the `Student` role (`F-14`); Programme must be `Active` (`F-11`); Academic Session must be `Upcoming` or `Active` (`F-12`); prevents duplicate active appointment of the same user to the exact same (Programme, Academic Session) pair.

* **Post-Action Behaviour:** Appointment saved, `F-66` scope permissions updated immediately, notification dispatched (`F-71`, `F-72`), audit record written (`F-82`).

* **States:** Loading, Empty state ("No Project Coordinators appointed for this session"), Validation error state.

### E. Business Rules

* **BR-01 & BR-02:** Strictly scoped to the institution.

* **BR-03:** A Coordinator manages one programme and one academic session per assignment.

* **BR-28:** Every Coordinator appointment and revocation is logged in `F-82`.

### F. Permissions and Access Control

* **Institutional Admin:** Full access to create, view, replace, and revoke Coordinator appointments within their institution.

* **Project Coordinator:** Read access to their own active/historical appointments and ability to select their active (Programme, Academic Session) workspace context.

### G. Data Requirements

* **Captured:** Appointment ID, Institution ID (`F-01`), User ID (`F-13`), Department ID (`F-10`), Programme ID (`F-11`), Academic Session ID (`F-12`), Status (`Active`, `Revoked`), Appointed By Actor ID, Appointed Timestamp, Revoked Timestamp & Reason (nullable).

### H. Dependencies and Integrations

* **Required Features:** `F-11`, `F-12`, `F-13`, `F-14`, `F-64`, `F-66`, `F-71`, `F-72`, `F-82`.

* **Consumed By:** All Project Coordinator features (`F-19`–`F-60`).

### I. Acceptance Criteria

* **AC-F15-01 (Positive — Coordinator Scoped Appointment):** Given an `Active` staff user Dr. Adewale, Programme `B.Sc. Computer Science`, and Session `2026/2027`, When the Institutional Admin appoints Dr. Adewale as Coordinator for that Programme and Session, Then Dr. Adewale gains Coordinator access strictly for `B.Sc. Computer Science` in `2026/2027` (`BR-03`), and an audit record is created (`F-82`).

* **AC-F15-02 (Permission — Cross-Programme & Cross-Session Scope Restriction):** Given Dr. Adewale is appointed Coordinator only for `B.Sc. Computer Science` in `2026/2027`, When Dr. Adewale attempts to register students or configure milestones for `B.Sc. Software Engineering` or for Session `2025/2026`, Then the system denies access (`BR-02`, `BR-03`).

## F-16: Supervisor Records Management

### A. Feature Identification

* **Feature ID:** F-16

* **Feature Name:** Supervisor Records Management

* **Feature Category:** Institutional Administration (User-Facing Functionality)

* **Primary Actor:** Institutional Admin

* **Supporting Actors:** Project Coordinator (views eligible supervisors during assignment in `F-21`, `F-24`, `F-27`), Audit Process (`F-82`)

* **MVP Priority:** P0

* **Source User Stories:** IA-10

* **Short Feature Description:** Enables Institutional Admins to create and maintain academic Supervisor eligibility records (linking staff users to departments, academic ranks/titles, specialization areas, and availability status) so Project Coordinators can assign eligible supervisors to projects.

### B. Business Purpose

* **Problem Solved:** Project Coordinators need an accurate, up-to-date pool of eligible academic supervisors with their departmental affiliation, specialization keywords, and availability status before assigning them to student projects (`F-24`, `F-27`).

* **Necessity for Clario:** Establishes the authoritative pool of eligible Supervisors within an institution.

* **Business/Academic Value:** Prevents unassigned or unavailable staff from being mistakenly allocated to supervise final-year projects.

* **Impact if Omitted:** Project Coordinators cannot identify or select eligible Supervisors during project allocation (`F-21`, `F-24`) or reassignment (`F-27`).

### C. Functional Requirements

* **FR-053:** The system must allow an Institutional Admin to create and maintain a Supervisor Record for an institutional staff user (`F-13`), capturing Academic Title/Rank (e.g., `Prof.`, `Dr.`, `Mr.`, `Mrs.`), Primary Department (`F-10`), Permitted Supervision Programmes/Departments (if cross-departmental supervision is allowed by the institution), Research Specialization Tags (optional), and Supervision Eligibility Status (`Available`, `Unavailable / On Leave`, `Inactive`).

* **FR-054:** Creating a Supervisor Record for a user must automatically ensure the user holds the `Project Supervisor` role (`F-14`).

* **FR-055:** When an Institutional Admin updates a Supervisor's Eligibility Status to `Unavailable / On Leave` or `Inactive`, the system must prevent Project Coordinators from making *new* project assignments to that Supervisor (`F-24`) while flagging existing active project assignments in the relevant Coordinator's workspace so the Coordinator can execute a Supervisor Reassignment (`F-27`).

### D. User Interaction and Behaviour

* **Access:** Institutional Admin Console -> "Supervisor Directory".

* **Information Viewed:** Searchable, filterable list of Supervisors by Faculty, Department, and Eligibility Status (`Available`, `Unavailable / On Leave`, `Inactive`), showing Academic Title, Full Name, Staff ID, Email, Primary Department, Specialization Tags, and Eligibility Status.

* **Actions Performed:** Create Supervisor Record (from existing staff user or new user creation), Edit Supervisor Record, Change Eligibility Status (`Available` / `Unavailable` / `Inactive`).

* **Validations:** Linked User must be a non-student user in the same institution; Primary Department must be `Active` (`F-10`); Academic Title (required, 2–30 chars).

* **Post-Action Behaviour:** Supervisor record saved, eligibility updated for Coordinator selection dropdowns (`F-24`, `F-27`), audit entry logged (`F-82`).

* **States:** Loading, Empty state, Warning prompt when marking a Supervisor with active projects as `Unavailable / On Leave`.

### E. Business Rules

* **BR-01 & BR-02:** Supervisor records are strictly scoped to the institution.

* **BR-28:** Creation, updates, and availability status changes of Supervisor records are logged in `F-82`.

* *(Note: Supervisor Workload Monitoring `F-25` and Workload Limit Management `F-26` are P1 and excluded from the MVP).*

### F. Permissions and Access Control

* **Institutional Admin:** Full create, read, update, and eligibility status management within their institution.

* **Project Coordinator:** Read-only access to eligible (`Available`) Supervisor records for their Programme/Department when performing assignments (`F-21`, `F-24`, `F-27`).

* **Project Supervisor:** Read access to their own Supervisor record.

### G. Data Requirements

* **Captured:** Supervisor Record ID, Institution ID (`F-01`), User ID (`F-13`), Primary Department ID (`F-10`), Academic Title/Rank, Specialization Areas/Keywords (optional text/tags), Eligibility Status (`Available`, `Unavailable`, `Inactive`), Timestamps.

### H. Dependencies and Integrations

* **Required Features:** `F-10`, `F-13`, `F-14`, `F-64`, `F-66`, `F-82`.

* **Consumed By:** `F-21` (Project Allocation), `F-24` (Supervisor Assignment), `F-27` (Supervisor Reassignment), `F-46` & `F-48` (Examiner Eligibility & Independence Check).

### I. Acceptance Criteria

* **AC-F16-01 (Positive — Supervisor Record Creation):** Given an `Active` staff user in Department `CSC`, When the Institutional Admin creates a Supervisor Record with Title `Dr.`, Department `CSC`, and Status `Available`, Then the user is granted the `Project Supervisor` role (`F-14`) and appears as an eligible Supervisor for `CSC` programmes in `F-24`.

* **AC-F16-02 (Workflow — Unavailable Supervisor Blocked from New Assignments):** Given a Supervisor whose Eligibility Status is changed to `Unavailable / On Leave` by the Institutional Admin, When a Project Coordinator attempts to assign a new student or group to that Supervisor in `F-24`, Then the Supervisor is excluded/blocked from new assignment selection.

## F-18: Academic Information Confidentiality

### A. Feature Identification

* **Feature ID:** F-18

* **Feature Name:** Academic Information Confidentiality

* **Feature Category:** Institutional Administration & Security Enforcement (Supporting System Capability & Access Control)

* **Primary Actor:** Institutional Admin (Subject of Restriction)

* **Supporting Actors:** Access Control Service (`F-66`), Audit Process (`F-82`)

* **MVP Priority:** P0

* **Source User Stories:** IA-12

* **Short Feature Description:** Enforces strict access control preventing Institutional Admins from viewing or downloading confidential student project documents, topic proposals, submission discussions, supervisory feedback, and academic grading assessments.

### B. Business Purpose

* **Problem Solved:** Institutional Admins manage institutional structure (`F-09`–`F-12`), user accounts (`F-13`–`F-16`), and billing (`F-03`), which are administrative functions. Allowing IT or administrative personnel to inspect student dissertations, supervisory critiques, or examination scores compromises academic integrity and confidentiality.

* **Necessity for Clario:** Enforces `BR-25` and `SEC-14` across all institutional data views and document storage endpoints.

* **Business/Academic Value:** Preserves the boundary between institutional IT/user administration and academic supervision/examination.

* **Impact if Omitted:** Institutional Admins could read private supervisory feedback, download student research files, or view unpublished examination scores.

### C. Functional Requirements

* **FR-056:** The system must block any user acting in the `Institutional Admin` role from viewing or downloading project topic proposal descriptions/rationales (`F-20`), milestone and final project uploaded files (`F-32`, `F-35`, `F-37`, `F-77`), Supervisor review comments and submission discussions (`F-33`, `F-34`), and Examiner/Supervisor assessment rubrics, scores, or feedback (`F-52`–`F-61`).

* **FR-057:** Where an Institutional Admin views user, programme, or supervisor records (`F-09`–`F-16`), the system must expose only non-confidential administrative metadata (such as user registration status, role assignment, coordinator appointment scope, and supervisor availability status).

* **FR-058:** Any attempt by an `Institutional Admin` session to directly request a confidential academic resource or document URL (`F-77`) must be rejected with `403 Forbidden` and logged by the security/audit service (`F-82`).

### D. User Interaction and Behaviour

* **Access:** Automatically enforced across all Institutional Admin interfaces and API routes via `F-66` and `F-77`.

* **Information Viewed:** Institutional Admins see only structural, user, role, coordinator appointment, supervisor directory, and subscription billing views. No navigation links or data payloads for project workspaces, documents, or academic feedback are rendered.

* **Post-Action Behaviour (Failure/Unauthorized Request):** Direct URL navigation or API requests to project workspaces or document downloads return an access-denied message ("Access Restricted: Institutional Administrators cannot access confidential project documents or academic feedback").

### E. Business Rules

* **BR-02:** Users can only access information within their authorised scope.

* **BR-25:** Institutional Admins cannot access confidential project documents or academic feedback.

* *(Note: `F-17` Institutional Project Oversight is P1 and excluded from the MVP).*

### F. Permissions and Access Control

* **System Access Control (`F-66` & `F-77`):** Explicitly denies `Institutional Admin` role access to confidential project content, feedback, and assessment endpoints.

### G. Data Requirements

* **Protected Data:** Topic proposal content (`F-20`), Uploaded documents and version history (`F-32`, `F-35`, `F-37`, `F-76`–`F-78`), Submission feedback and discussions (`F-33`, `F-34`), Supervisor and Examiner scores/comments (`F-39`, `F-52`–`F-61`).

### H. Dependencies and Integrations

* **Required Features:** `F-66` (Role and Scope-Based Access Control), `F-77` (Authorised Document Retrieval), `F-82` (Audit Logging).

### I. Acceptance Criteria

* **AC-F18-01 (Permission — Block Document Download by Institutional Admin):** Given an authenticated Institutional Admin of Institution A, When they attempt to retrieve or download a project document uploaded by a student in Institution A (`F-77`), Then the system denies the request with a `403 Forbidden` error (`BR-25`, `SEC-14`).

* **AC-F18-02 (Permission — Block Academic Feedback & Grade Visibility):** Given an authenticated Institutional Admin of Institution A, When they attempt to access a project's submission feedback thread (`F-34`) or assessment breakdown (`F-58`, `F-61`), Then the system denies access and does not expose any academic feedback or grade data.

# Module C: Project Registration, Topics and Allocation

## F-19: Student Project Registration

### A. Feature Identification

* **Feature ID:** F-19

* **Feature Name:** Student Project Registration

* **Feature Category:** Project Administration (User-Facing Functionality)

* **Primary Actor:** Project Coordinator

* **Supporting Actors:** Student (gains access to project cohort), Institutional Admin (creates underlying user directory if not yet created in `F-13`), Email Service (`F-71`), In-App Notification Service (`F-72`), Audit Process (`F-82`)

* **MVP Priority:** P0

* **Source User Stories:** PC-01

* **Short Feature Description:** Enables a Project Coordinator to register and maintain student project participation records (individually or via bulk CSV import) within their assigned Programme (`F-11`) and Academic Session (`F-12`).

### B. Business Purpose

* **Problem Solved:** Before students can propose project topics (`F-20`), be placed into individual or group projects (`F-21`, `F-22`), or be assigned a Supervisor (`F-24`), they must be formally enrolled in the final-year project cohort for a specific Programme and Academic Session.

* **Necessity for Clario:** Establishes the authoritative roster of participating final-year students within a Coordinator's assigned Programme and Session scope (`BR-03`).

* **Business/Academic Value:** Ensures every final-year student is accounted for, prevents un-enrolled students from submitting proposals, and allows Coordinators to track unassigned students.

* **Impact if Omitted:** Students cannot participate in projects, propose topics, or be allocated to groups or supervisors.

### C. Functional Requirements

* **FR-059:** The system must allow a Project Coordinator to register students into their assigned (Programme, Academic Session) project cohort either by selecting existing `Student` users (`F-13`) from the institution or by uploading/entering new student records (Full Name, Email, Matriculation Number, Under-18 Minor Indicator per `PROP-05`), subject to the institution's subscription user capacity (`FR-039`).

* **FR-060:** The system must prevent a student from being registered more than once in the same Programme and Academic Session project cohort.

* **FR-061:** Upon registration into the Programme and Academic Session cohort, the system must initialize the student's Project Participation Status as `Registered - Awaiting Topic/Allocation`, grant access to the Student Project Workspace (`F-28`), and trigger a cohort registration notification (`F-71`, `F-72`).

* **FR-062:** The system must allow a Project Coordinator to view, search, filter (by Participation Status, Allocation Type: `Unassigned`, `Individual`, `Group`, and Topic Status), and update student project registration records within their assigned Programme and Session.

### D. User Interaction and Behaviour

* **Access:** Project Coordinator Workspace -> "Students & Registration".

* **Information Viewed:** Table of registered project students showing Matriculation Number, Full Name, Email, Project Arrangement (`Unassigned`, `Individual`, `Group Name`), Topic Proposal Status (`Not Submitted`, `Pending Review`, `Approved`, `Rejected`), Assigned Supervisor, and Registration Status (`Active`, `Deactivated`).

* **Actions Performed:** Register Student, Bulk Import Project Students (CSV), Update Student Cohort Record, Remove Unallocated Student from Cohort (if registered in error before any submissions).

* **Validations:** Student must hold the `Student` role (`F-14`); Matriculation Number and Email (required, unique within cohort); Programme and Academic Session must match the Coordinator's active appointment scope (`BR-03`); Academic Session must be `Active` (`F-12`).

* **Post-Action Behaviour:** Student cohort record is saved, student gains workspace access (`F-28`), onboarding/registration notification is queued (`F-71`, `F-72`), and an audit record is logged (`F-82`).

* **States:** Loading state, Bulk import preview & validation state, Empty state ("No students registered for this programme and session yet"), Error state.

### E. Business Rules

* **BR-01 & BR-02:** Strictly isolated to the Coordinator's institution and authorised scope.

* **BR-03:** A Coordinator can only register and manage project students within their assigned Programme and Academic Session.

* **BR-28:** Cohort registrations and removals are logged in `F-82`.

### F. Permissions and Access Control

* **Project Coordinator:** Full create, read, update, and remove (if unallocated/no submissions) access strictly within their assigned Programme and Academic Session.

* **Student:** Read-only access to their own registration record via `F-28`.

* **All Other Actors:** No access to `F-19` management actions.

### G. Data Requirements

* **Captured:** Student Project Registration ID, Institution ID (`F-01`), Programme ID (`F-11`), Academic Session ID (`F-12`), Student User ID (`F-13`), Matriculation Number, Cohort Participation Status (`Registered`, `Topic Proposed`, `Allocated`, `Completed`), Project Arrangement (`Unassigned`, `Individual`, `Group`), Linked Project ID (`F-21`, nullable), Linked Group ID (`F-22`, nullable), Registered By Coordinator ID, Timestamps.

* **Relationships:** Links Student (`F-13`) to Programme (`F-11`) and Session (`F-12`); prerequisite for `F-20`, `F-21`, and `F-22`.

### H. Dependencies and Integrations

* **Required Features:** `F-11`, `F-12`, `F-13`, `F-14`, `F-15`, `F-64`, `F-66`, `F-71`, `F-72`, `F-82`.

* **Consumed By:** `F-20` (Topic Proposal), `F-21` (Project Allocation), `F-22` (Group Management), `F-28` (Project Workspace).

### I. Acceptance Criteria

* **AC-F19-01 (Positive — Cohort Registration):** Given an authenticated Project Coordinator appointed to `B.Sc. Computer Science` for `2026/2027`, When they register a student with Matriculation Number `CSC/2022/045` into the cohort, Then the student record is created with status `Registered`, the student can access their workspace (`F-28`), and a notification is sent.

* **AC-F19-02 (Validation — Duplicate Student in Cohort):** Given student `CSC/2022/045` is already registered in `B.Sc. Computer Science` (`2026/2027`), When the Coordinator attempts to register the same student again in the same Programme and Session, Then the system rejects the duplicate registration with a validation error.

* **AC-F19-03 (Permission — Out-of-Scope Programme):** Given a Coordinator appointed only to `B.Sc. Computer Science`, When they attempt to register a student into `B.Sc. Information Systems`, Then the system denies the action with a `403 Forbidden` error (`BR-03`).

## F-20: Project Topic Proposal and Review Management

### A. Feature Identification

* **Feature ID:** F-20

* **Feature Name:** Project Topic Proposal and Review Management

* **Feature Category:** Project Administration & Supervision (User-Facing Functionality)

* **Primary Actor:** Project Coordinator, Project Supervisor, Student

* **Supporting Actors:** Notification Services (`F-71`–`F-75`), Audit Process (`F-82`)

* **MVP Priority:** P0

* **Source User Stories:** PC-02, PC-20, PS-01, PS-02, PS-03, PS-04, PS-05, ST-04, ST-05, ST-06, ST-07, ST-08

* **Short Feature Description:** Enables registered Students (or designated Group Submitters per `PROP-01`) to submit proposed project topics before Supervisor assignment (`BR-04`), allows Coordinators to receive and monitor proposals and assign Supervisors (`BR-05`), and enables assigned Supervisors to review proposals, approve suitable topics, reject unsuitable topics with mandatory feedback, suggest alternative topics, and review revised proposals.

### B. Business Purpose

* **Problem Solved:** Final-year projects begin with selecting an academically viable research topic. Without a structured proposal, review, revision, and approval workflow, students risk pursuing unviable or duplicate topics without supervisory validation.

* **Necessity for Clario:** Implements the foundational academic onboarding workflow (`BR-04`, `BR-05`) separating student proposal submission, Coordinator supervisor assignment, and Supervisor academic topic decision-making.

* **Business/Academic Value:** Provides full transparency into topic approval status across the programme while preserving a complete history of original proposals, rejections, alternative topic suggestions, and revised proposals.

* **Impact if Omitted:** Students cannot propose topics, Supervisors cannot validate research directions, and projects cannot transition into milestone execution (`F-29`–`F-35`).

### C. Functional Requirements

* **FR-063:** The system must allow a registered Student (`F-19`) — or the designated Group Submitter (`F-23`) if a group was pre-formed by the Coordinator (`PROP-01`) — to submit one or more proposed project topics (capturing Topic Title, Problem Statement / Abstract, Objectives, Proposed Methodology, and optional Keywords) prior to Supervisor assignment (`BR-04`).

* **FR-064:** Upon topic proposal submission, the system must set the proposal status to `Submitted - Awaiting Supervisor Assignment` (if no Supervisor is assigned yet) or `Under Supervisor Review` (if a Supervisor is already assigned), make the proposal visible to the Programme's Project Coordinator (`PC-02`, `PC-20`), and notify the Coordinator (or assigned Supervisor) via `F-75`.

* **FR-065:** Once a Supervisor is assigned to the Student or Group (`F-21`, `F-24`, `BR-05`), the system must expose the submitted topic proposal(s) to the assigned Supervisor (`PS-01`) for academic review.

* **FR-066:** The system must allow the assigned Project Supervisor to record one of three academic decisions on a submitted topic proposal:

  1. **Approve Topic (`PS-02`):** Sets the selected proposal to `Approved`, locks it as the official active project title on the Project record (`F-21`), automatically marks any other pending alternative proposals for that same project as `Superseded`, logs the critical academic decision in `F-82`, and notifies the Student/Group (`F-75`).

  2. **Reject Topic (`PS-03`):** Sets the proposal status to `Rejected`, requires mandatory written supervisory feedback explaining the academic reason for rejection (`ST-06`), logs the decision in `F-82`, and notifies the Student/Group (`F-75`).

  3. **Suggest Alternative Topic (`PS-04`):** Allows the Supervisor to propose an alternative Topic Title, Description/Scope, and Rationale to the Student/Group (`ST-08`), setting the topic workflow state to `Alternative Suggested by Supervisor` and notifying the Student/Group (`F-75`).

* **FR-067:** When a topic proposal is `Rejected`, the system must allow the Student (or designated Group Submitter) to submit a revised topic proposal (`ST-07`) linked to the previous rejected proposal so the Supervisor can review the revised proposal alongside previous feedback (`PS-05`).

* **FR-068:** When a Supervisor suggests an alternative topic (`PS-04`, `ST-08`), the system must display the suggested alternative topic details to the Student/Group and provide configurable response actions (Accept Alternative Topic -> adopts topic as `Approved` or `Submitted` per programme configuration; or Decline & Submit Revised Proposal) in accordance with Open Decision `OD-02` (`GAP-06`).

* **FR-069:** The system must provide the Project Coordinator with a real-time Topic Approval Monitoring view (`PC-20`) filtering all students/groups in the programme by Topic Status (`No Topic Proposed`, `Awaiting Supervisor Assignment`, `Under Supervisor Review`, `Rejected - Awaiting Revision`, `Alternative Suggested`, `Approved`).

### D. User Interaction and Behaviour

* **Access:** Student via "Project Workspace -> Topic Proposal"; Project Supervisor via "Supervision Workspace -> Assigned Projects -> Topic Review"; Project Coordinator via "Programme Workspace -> Topic Proposals & Monitoring".

* **Information Viewed:** Proposal Title, Abstract/Problem Statement, Objectives, Methodology, Submission Timestamp, Proposal Version/Iteration Number, Current Status badge, Supervisor Decision & Feedback, Alternative Topic Suggestion card (if applicable), and full Proposal History.

* **Actions Performed:**

  * *Student / Designated Group Submitter:* Save Draft Proposal locally (`NFR-USA`), Submit Topic Proposal, View Rejection Feedback, Submit Revised Proposal, Respond to Supervisor Alternative Topic (`OD-02`).

  * *Project Supervisor:* Approve Topic, Reject Topic (with mandatory feedback), Suggest Alternative Topic.

  * *Project Coordinator:* View/Filter Proposals, Assign Supervisor (`F-21`/`F-24`).

* **Validations:** Topic Title (required, 10–300 chars), Problem Statement/Abstract (required, 50–3,000 chars), Objectives (required, 20–2,000 chars); Supervisor Rejection Feedback (required when rejecting, 20–2,000 chars); Alternative Topic Title & Rationale (required when suggesting alternative); only the designated Group Submitter (`BR-08`) can submit/revise a formal topic proposal for a group project.

* **Post-Action Behaviour:** State transitions persist immediately, audit record is written for Supervisor topic decisions (`F-82`, `NFR-AUD`), and in-app/email notifications (`F-75`) are dispatched.

* **States:** Loading, Local draft saved indicator, Empty state ("No topic proposal submitted yet"), Status banners for `Under Review`, `Rejected`, `Alternative Suggested`, and `Approved`.

### E. Business Rules

* **BR-04:** Students propose project topics before supervisor assignment.

* **BR-05:** Coordinators assign supervisors after topic proposals are submitted.

* **BR-08:** For group projects, only designated group submitters can make formal group submissions (including formal group topic proposals).

* **BR-26:** Coordinators monitor topic status (`PC-20`) and assign Supervisors (`PC-03`), but Supervisors make the academic topic approval/rejection decisions (`PS-01`–`PS-05`).

* **NFR-AUD:** Topic allocation/approval decisions are recorded in the audit log (`F-82`).

* **Open Decision Reference (`OD-02` / `GAP-06`):** Exact workflow outcome when a Student accepts or rejects a Supervisor's suggested alternative topic is tracked in `mvp-open-decisions.md`.

### F. Permissions and Access Control

* **Student:** Create and view topic proposals for their own individual project; for group projects, all group members can view proposals and feedback, while only the designated Group Submitter (`F-23`) can submit or revise formal proposals.

* **Project Supervisor:** View and review (`Approve`, `Reject`, `Suggest Alternative`) topic proposals strictly for students/groups assigned to them (`SEC-12`).

* **Project Coordinator:** Read-only access to all topic proposals and their statuses within their assigned Programme and Session (`BR-03`) to facilitate allocation (`F-21`, `F-24`) and monitoring (`PC-20`).

* **Institutional Admin / Platform Admin / Project Examiner:** No access (`BR-25`, `F-08`, `F-18`).

### G. Data Requirements

* **Captured:** Topic Proposal ID, Institution ID (`F-01`), Programme ID (`F-11`), Academic Session ID (`F-12`), Project/Student/Group Reference (`F-19`, `F-21`, `F-22`), Iteration/Revision Number, Topic Title, Problem Statement/Abstract, Objectives, Methodology, Submitted By User ID, Submitted Timestamp, Proposal Status (`Submitted - Awaiting Supervisor`, `Under Supervisor Review`, `Approved`, `Rejected`, `Alternative Suggested`, `Superseded`), Reviewed By Supervisor ID, Review Timestamp, Supervisor Feedback, Alternative Topic Title & Description (nullable), Parent Proposal ID (for revisions).

* **Preserved:** All historical proposal iterations, rejection reasons, and alternative suggestions must be preserved.

### H. Dependencies and Integrations

* **Required Features:** `F-19`, `F-21`, `F-22`, `F-23`, `F-24`, `F-64`, `F-66`, `F-71`–`F-75`, `F-82`.

* **Consumed By:** `F-21` (Project Allocation), `F-28` (Project Workspace), `F-29` (Milestone execution unlocked upon topic approval).

### I. Acceptance Criteria

* **AC-F20-01 (Positive — Student Proposal Before Supervisor Assignment):** Given a registered Student in an active Programme and Session who does not yet have an assigned Supervisor, When the Student submits a valid topic proposal, Then the system records the proposal with status `Submitted - Awaiting Supervisor` (`BR-04`) and makes it visible to the Programme Coordinator (`PC-02`).

* **AC-F20-02 (Positive — Supervisor Topic Approval):** Given a topic proposal assigned to a Supervisor (`BR-05`), When the Supervisor approves the topic, Then the proposal status changes to `Approved`, the topic becomes the official project title, an audit log entry (`F-82`) is written, and the Student receives an in-app and email notification (`F-75`).

* **AC-F20-03 (Validation — Supervisor Rejection Requires Feedback):** Given a Supervisor reviewing an assigned topic proposal, When they attempt to reject the topic without entering feedback, Then the system blocks the rejection and requires supervisory feedback explaining why the proposal was rejected (`PS-03`, `ST-06`).

* **AC-F20-04 (Positive — Student Revision After Rejection):** Given a Student whose topic proposal was `Rejected` with feedback, When the Student submits a revised topic proposal, Then the system links the revised proposal to the rejected proposal, preserves the original proposal in history, sets the new proposal status to `Under Supervisor Review`, and notifies the Supervisor (`PS-05`, `ST-07`).

## F-21: Project Allocation Management

### A. Feature Identification

* **Feature ID:** F-21

* **Feature Name:** Project Allocation Management

* **Feature Category:** Project Administration (User-Facing Functionality)

* **Primary Actor:** Project Coordinator

* **Supporting Actors:** Student, Project Supervisor, Notification Services (`F-71`–`F-75`), Audit Process (`F-82`)

* **MVP Priority:** P0

* **Source User Stories:** PC-03, PC-04

* **Short Feature Description:** Enables Project Coordinators to establish and manage each student's formal project arrangement (`Individual Project` or `Group Project`) and coordinate Supervisor assignment (`F-24`) after topic proposals are submitted.

### B. Business Purpose

* **Problem Solved:** Every registered final-year student must be formally allocated to either an individual project or a recognized project group and linked to an academic Supervisor after topic proposal submission.

* **Necessity for Clario:** Implements `BR-05` and `BR-06`, creating the core `Project` entity that anchors workspaces (`F-28`, `F-36`), milestones (`F-29`–`F-35`), examinations (`F-46`–`F-50`), and results (`F-58`–`F-62`).

* **Business/Academic Value:** Guarantees that no registered student is left without a recognized project structure or supervisory oversight.

* **Impact if Omitted:** Neither individual nor group project records can be formally instantiated or linked to Supervisors.

### C. Functional Requirements

* **FR-070:** The system must allow a Project Coordinator to allocate any registered cohort student (`F-19`) to either an **Individual Project** arrangement or a **Group Project** arrangement (`BR-06`, `F-22`).

* **FR-071:** The system must enforce that a student can belong to at most **one** active Project (either one Individual Project OR one Group Project) within the same Programme and Academic Session.

* **FR-072:** In accordance with `BR-04` and `BR-05` (`PC-03`), the system must support the workflow where students (or pre-formed groups per `PROP-01`) submit their topic proposals (`F-20`) first, and the Coordinator subsequently assigns an eligible Supervisor (`F-24`) to the individual project or group project so the Supervisor can review the proposed topic.

* **FR-073:** The system must provide the Project Coordinator with an Allocation Management dashboard displaying all cohort students, their allocation type (`Unallocated`, `Individual`, `Group`), topic proposal submission state, and Supervisor assignment state.

### D. User Interaction and Behaviour

* **Access:** Project Coordinator Workspace -> "Project Allocation".

* **Information Viewed:** Cohort allocation summary cards (Total Registered, Allocated Individual, Allocated Group, Unallocated, Awaiting Supervisor Assignment) and a filterable table of students/projects.

* **Actions Performed:** Allocate as Individual Project, Allocate to New/Existing Group (`F-22`), Assign Supervisor (`F-24`).

* **Validations:** Student must be registered in the Coordinator's Programme and Session (`F-19`); Student must not already be allocated to another active project in the same Programme and Session; Supervisor assignment requires that a topic proposal (`F-20`) has been submitted (`BR-04`, `BR-05`).

* **Post-Action Behaviour:** Project entity created/updated, workspace (`F-28` or `F-36`) linked, audit entry recorded (`F-82`), and relevant actors notified (`F-71`, `F-72`).

* **States:** Loading state, Empty state, Validation error banner if attempting to double-allocate a student or assign a supervisor before a topic proposal exists.

### E. Business Rules

* **BR-03:** Scoped strictly to the Coordinator's assigned Programme and Academic Session.

* **BR-04:** Students propose project topics before supervisor assignment.

* **BR-05:** Coordinators assign supervisors after topic proposals are submitted.

* **BR-06:** Projects can be individual or group-based.

* **NFR-AUD:** Project allocation decisions are logged in `F-82`.

### F. Permissions and Access Control

* **Project Coordinator:** Full access to manage project allocations within their assigned Programme and Session.

* **Student / Project Supervisor:** Read-only access to their own allocated project arrangement.

### G. Data Requirements

* **Captured:** Project ID, Institution ID (`F-01`), Programme ID (`F-11`), Academic Session ID (`F-12`), Project Type (`INDIVIDUAL`, `GROUP`), Linked Student Registration ID (for `INDIVIDUAL`, `F-19`) or Linked Group ID (for `GROUP`, `F-22`), Approved Topic Title (populated upon `F-20` approval), Assigned Supervisor ID (`F-24`, nullable prior to assignment), Project Lifecycle Status (`Topic Proposal`, `Active Supervision`, `Final Submitted`, `Under Examination`, `Results Approved`, `Results Published`, `Completed`), Timestamps.

### H. Dependencies and Integrations

* **Required Features:** `F-19`, `F-20`, `F-22`, `F-23`, `F-24`, `F-64`, `F-66`, `F-71`, `F-72`, `F-82`.

* **Consumed By:** `F-28`–`F-62`.

### I. Acceptance Criteria

* **AC-F21-01 (Positive — Individual & Group Allocation):** Given registered students in a Coordinator's Programme and Session, When the Coordinator allocates Student A to an `Individual` project and allocates Students B and C to a `Group` project (`F-22`), Then distinct Project records of type `INDIVIDUAL` and `GROUP` are created and logged in `F-82`.

* **AC-F21-02 (Validation — Prevent Double Allocation):** Given Student B is already allocated to Group 1 in `B.Sc. Computer Science` (`2026/2027`), When the Coordinator attempts to allocate Student B to an Individual Project or to Group 2 in the same Programme and Session, Then the system rejects the action with a conflict error.

* **AC-F21-03 (Business Rule — Supervisor Assignment Requires Submitted Topic Proposal):** Given a student or group that has not yet submitted a topic proposal (`F-20`), When the Coordinator attempts to assign a Supervisor (`F-24`), Then the system blocks the assignment and informs the Coordinator that a topic proposal must be submitted before Supervisor assignment (`BR-04`, `BR-05`).

## F-22: Project Group Management

### A. Feature Identification

* **Feature ID:** F-22

* **Feature Name:** Project Group Management

* **Feature Category:** Project Administration & Group Collaboration (User-Facing Functionality)

* **Primary Actor:** Project Coordinator

* **Supporting Actors:** Student (views group membership), Project Supervisor (views group membership), Notification Services (`F-71`, `F-72`), Audit Process (`F-82`)

* **MVP Priority:** P0

* **Source User Stories:** PC-05, PC-06, ST-17

* **Short Feature Description:** Enables Project Coordinators to create project groups within their Programme and Academic Session, assign initial student members to each group, and expose group membership details to assigned Students and Supervisors.

### B. Business Purpose

* **Problem Solved:** Collaborative final-year projects require multiple students to be grouped into a single named academic unit with shared workspace access (`F-36`), a designated submitter (`F-23`), shared examination grading (`F-52`–`F-55`), and individual supervisor performance grading (`F-39`, `F-56`).

* **Necessity for Clario:** Implements `BR-06` and `BR-07`, establishing the group structure required for all group project workflows.

* **Business/Academic Value:** Eliminates confusion over group composition and ensures all members and supervisors have a clear view of group participants.

* **Impact if Omitted:** Group projects cannot be created or managed on Clario.

### C. Functional Requirements

* **FR-074:** The system must allow a Project Coordinator to create a Project Group within their assigned Programme and Academic Session by specifying a unique Group Name/Code (e.g., `CSC-2027-GRP-01`), selecting two or more unallocated registered students (`F-19`) as initial group members (`BR-07`), and designating at least one group member as the Group Submitter (`F-23`).

* **FR-075:** Upon group creation, the system must automatically provision a Shared Group Workspace (`F-36`) accessible to all assigned group members and notify all members of their group assignment (`F-71`, `F-72`).

* **FR-076:** The system must allow all members of a Project Group (`ST-17`), the assigned Project Supervisor, and the Project Coordinator to view the complete group roster (Full Name, Matriculation Number, Email, and Designated Submitter badge for each member).

* **FR-077:** In accordance with `GAP-05` (`OD-01`), initial group membership is established during allocation (`PC-06`); any post-allocation Coordinator-initiated membership adjustment (prior to final result publication) must be controlled by a configurable policy flag (`OD-01`), require a mandatory audit justification (`F-82`), and never expose a student-initiated group transfer workflow in the MVP.

### D. User Interaction and Behaviour

* **Access:** Project Coordinator via "Programme Workspace -> Project Groups"; Student via "Group Workspace -> Group Members" (`ST-17`); Supervisor via "Supervision Workspace -> Group Details".

* **Information Viewed:** Group Name/Code, Member count, Member list (Name, Matriculation Number, Email, Role: `Designated Submitter` or `Member`), Assigned Supervisor (`F-24`), and Topic/Milestone Status.

* **Actions Performed:** Create Project Group, Assign Initial Members, Designate Submitter (`F-23`), View Group Members (`ST-17`).

* **Validations:** Group Name/Code (required, unique within Programme and Academic Session, 3–100 chars); Group must contain at least $2$ registered students from the same Programme and Session who are not already allocated to another project (`FR-071`); at least one member must be designated as Group Submitter (`F-23`).

* **Post-Action Behaviour:** Group record and Group Project (`F-21`) are saved, Shared Group Workspace (`F-36`) is enabled, audit entry is recorded (`F-82`), and members are notified.

* **States:** Loading, Empty state ("No project groups created yet"), Validation error if fewer than 2 students are selected or if a student is already allocated.

### E. Business Rules

* **BR-06:** Projects can be individual or group-based.

* **BR-07:** Coordinators create groups and assign their members.

* **BR-28 / NFR-AUD:** Group creation and membership assignments are logged in `F-82`.

* **Open Decision Reference (`OD-01` / `GAP-05`):** Whether and how a Coordinator may modify group membership after initial allocation (e.g., if a student drops out mid-session) is tracked in `mvp-open-decisions.md`.

### F. Permissions and Access Control

* **Project Coordinator:** Create and manage project groups within their assigned Programme and Academic Session.

* **Student:** Read-only access to the membership list of their own assigned group (`ST-17`, `SEC-11`); no access to other groups.

* **Project Supervisor:** Read-only access to the membership list of groups assigned to them (`SEC-12`).

* **Project Examiner:** Read-only access to the group membership list of projects assigned to them for examination (`SEC-13`).

### G. Data Requirements

* **Captured:** Group ID, Institution ID (`F-01`), Programme ID (`F-11`), Academic Session ID (`F-12`), Project ID (`F-21`), Group Name/Code, Group Members list (Group Member Record ID, Student User ID, Student Registration ID, Is Designated Submitter boolean, Joined Timestamp, Member Status), Created By Coordinator ID, Timestamps.

### H. Dependencies and Integrations

* **Required Features:** `F-19`, `F-21`, `F-23`, `F-64`, `F-66`, `F-71`, `F-72`, `F-82`.

* **Consumed By:** `F-20`, `F-23`, `F-24`, `F-36`–`F-39`, `F-56`, `F-58`.

### I. Acceptance Criteria

* **AC-F22-01 (Positive — Group Creation & Member Visibility):** Given three unallocated registered students in `B.Sc. Computer Science` (`2026/2027`), When the Project Coordinator creates group `CSC-GRP-01` with those three students and designates one as submitter, Then the group is created, all three students can view the complete member list (`ST-17`), and an audit entry is logged (`F-82`).

* **AC-F22-02 (Validation — Minimum Group Size):** Given an authenticated Project Coordinator, When they attempt to create a Project Group with only $1$ student selected, Then the system rejects the creation with a validation error requiring at least $2$ students for a group project.

* **AC-F22-03 (Permission — Student Cannot Modify Group Membership):** Given an authenticated Student assigned to `CSC-GRP-01`, When they view their group workspace, Then they can view group members (`ST-17`) but have no permission or action to add, remove, or transfer group members (`BR-07`).

## F-23: Group Submission Authority Management

### A. Feature Identification

* **Feature ID:** F-23

* **Feature Name:** Group Submission Authority Management

* **Feature Category:** Project Administration & Group Collaboration (User-Facing Functionality & Access Control)

* **Primary Actor:** Project Coordinator (designates submitter), Designated Group Submitter (Student who executes formal submissions)

* **Supporting Actors:** Non-submitter Group Members, Access Control Service (`F-66`), Audit Process (`F-82`)

* **MVP Priority:** P0

* **Source User Stories:** PC-07, ST-20

* **Short Feature Description:** Enables Project Coordinators to designate one or more authorised Group Submitters within each project group and strictly restricts formal group submissions (topic proposals, milestone submissions, and final project submissions) to those designated members.

### B. Business Purpose

* **Problem Solved:** If every member of a 4-person project group could independently click "Submit Milestone" simultaneously with different files, the group would suffer conflicting versions, duplicate submissions, and disputes over which document represents the group's official submission.

* **Necessity for Clario:** Implements `BR-08` and `DAT-04` ("Only designated group submitters can make formal group submissions").

* **Business/Academic Value:** Ensures clear governance and single-point accountability for formal academic submissions while still allowing all group members to collaborate on shared workspace files (`F-36`, `F-37`).

* **Impact if Omitted:** Uncoordinated or conflicting formal submissions from multiple group members would corrupt milestone state transitions and version histories.

### C. Functional Requirements

* **FR-078:** The system must require a Project Coordinator to designate at least one member of every Project Group (`F-22`) as an authorised Group Submitter (`PC-07`), and allow the Coordinator to update/transfer the Designated Submitter flag to another active member of the same group at any time while the session is active.

* **FR-079:** The system must allow a Student who holds the active `Designated Submitter` flag for their group (`ST-20`) to execute formal group submissions on behalf of the group, including formal topic proposals/revisions (`F-20`), formal milestone submissions/resubmissions (`F-32`, `F-35`), and the consolidated final project submission (`F-32`).

* **FR-080:** The system must block non-designated group members from executing formal group submissions (`BR-08`, `DAT-04`), while still allowing non-designated group members to upload/manage shared working documents in the group workspace (`F-37`), view formal submission status (`F-38`), and participate in submission discussions (`F-34`).

### D. User Interaction and Behaviour

* **Access:** Project Coordinator via "Project Groups -> Manage Submitter"; Student via "Shared Group Workspace".

* **Information Viewed:** "Designated Group Submitter" badge next to the authorised member(s) in the group roster; on milestone/final submission panels, Designated Submitters see active "Submit on Behalf of Group" controls, whereas non-designated members see a read-only informational notice ("Only \[Designated Submitter Name\] is authorised to make formal submissions for this group").

* **Actions Performed:**

  * *Project Coordinator:* Designate/Change Group Submitter (`PC-07`).

  * *Designated Group Submitter:* Submit Formal Topic Proposal, Submit Milestone Document, Submit Final Project on behalf of the group (`ST-20`).

* **Validations:** Every active group must have at least one active member marked as `Designated Submitter`; the system must reject any attempt to remove the `Designated Submitter` flag from the sole submitter without assigning it to another group member.

* **Post-Action Behaviour:** Submitter authority updates immediately in `F-66`, logs an audit entry (`F-82`), and notifies the group members (`F-72`).

* **States:** Active submission state for Designated Submitter; Disabled/Read-only formal submission state for non-designated group members.

### E. Business Rules

* **BR-08 / DAT-04:** Only designated group submitters can make formal group submissions.

* **BR-28:** Designation and changes of group submission authority are logged in `F-82`.

### F. Permissions and Access Control

* **Project Coordinator:** Full authority to designate and change Group Submitters for groups within their assigned Programme and Session.

* **Designated Group Submitter (Student):** Authorised to execute formal submissions (`F-20`, `F-32`) for their assigned group.

* **Non-Designated Group Member (Student):** Denied formal submission execution (`403 Forbidden` if attempted via API); permitted shared document collaboration (`F-37`) and read access (`F-36`, `F-38`).

### G. Data Requirements

* **Captured:** Group Member Record ID (`F-22`), Group ID, Student User ID, `is_designated_submitter` (boolean), Designated By Coordinator ID, Designated Timestamp.

### H. Dependencies and Integrations

* **Required Features:** `F-22`, `F-64`, `F-66`, `F-72`, `F-82`.

* **Consumed By:** `F-20` (Topic Proposal), `F-32` (Milestone and Final Project Submission), `F-35` (Document Version Management), `F-38` (Group Submission Tracking).

### I. Acceptance Criteria

* **AC-F23-01 (Positive — Designated Submitter Formal Submission):** Given Student A is designated as the Group Submitter for `CSC-GRP-01` (`PC-07`), When Student A uploads and submits the Milestone 1 document on behalf of the group (`ST-20`), Then the system accepts the formal submission, records Student A as the submitting representative on behalf of `CSC-GRP-01`, and updates the group's milestone status for all members.

* **AC-F23-02 (Permission — Block Non-Designated Member from Formal Submission):** Given Student B is a member of `CSC-GRP-01` but is *not* designated as a Group Submitter, When Student B attempts to execute a formal milestone or final project submission (`F-32`), Then the system blocks the operation with a `403 Forbidden` error (`BR-08`, `DAT-04`).

* **AC-F23-03 (Validation — Group Must Retain at Least One Submitter):** Given `CSC-GRP-01` has only Student A as Designated Submitter, When the Coordinator attempts to revoke Student A's submitter status without selecting another group member as Designated Submitter, Then the system rejects the update with a validation error.

## F-24: Supervisor Assignment Management

### A. Feature Identification

* **Feature ID:** F-24

* **Feature Name:** Supervisor Assignment Management

* **Feature Category:** Project Administration (User-Facing Functionality)

* **Primary Actor:** Project Coordinator

* **Supporting Actors:** Project Supervisor, Student, Notification Services (`F-71`–`F-75`), Audit Process (`F-82`)

* **MVP Priority:** P0

* **Source User Stories:** PC-08, PC-09

* **Short Feature Description:** Enables Project Coordinators to assign eligible, available Project Supervisors (`F-16`) to individual student projects (`PC-09`) or project groups (`PC-08`) after topic proposals have been submitted (`BR-05`).

### B. Business Purpose

* **Problem Solved:** Every individual project and group project requires an assigned academic Supervisor to review proposed topics (`F-20`), guide research, review milestone submissions (`F-33`), and provide performance grades (`F-56`).

* **Necessity for Clario:** Connects projects (`F-21`, `F-22`) with eligible Supervisors (`F-16`), unlocking supervisory access (`SEC-12`) to the Project Workspace (`F-28`).

* **Business/Academic Value:** Ensures timely, accountable academic supervision for both individual and collaborative projects.

* **Impact if Omitted:** Supervisors cannot access student projects, approve topics, review milestone documents, or submit supervisor assessments.

### C. Functional Requirements

* **FR-081:** The system must allow a Project Coordinator to assign an eligible Project Supervisor (`F-16` with status `Available`) to an Individual Project (`PC-09`) or a Group Project (`PC-08`) within their assigned Programme and Academic Session, provided that the student or group has submitted a topic proposal (`F-20`, `BR-04`, `BR-05`).

* **FR-082:** Support both single-project assignment and bulk Supervisor assignment (allowing a Coordinator to select multiple projects that have submitted topic proposals and assign them to an available Supervisor).

* **FR-083:** Upon Supervisor assignment, the system must:

  1. Grant the assigned Supervisor immediate access to the project's workspace (`F-28` / `F-36`), topic proposals (`F-20`), and submission history (`SEC-12`).

  2. Transition any `Submitted - Awaiting Supervisor` topic proposal (`F-20`) for that project to `Under Supervisor Review`.

  3. Record a critical academic audit log entry (`F-82`, `NFR-AUD`).

  4. Dispatch in-app and email notifications (`F-71`, `F-72`, `F-75`) to both the assigned Supervisor and the Student (or all Group Members).

### D. User Interaction and Behaviour

* **Access:** Project Coordinator Workspace -> "Supervisor Assignments" (or directly from the Project Allocation / Topic Proposals table).

* **Information Viewed:** List of projects awaiting Supervisor assignment (showing Student/Group Name, Submitted Topic Proposal Title & Keywords, Project Type: `Individual` / `Group`) alongside a selector of `Available` Supervisors (`F-16`) showing Supervisor Name, Title, Department, and Specialization Tags.

* **Actions Performed:** Assign Supervisor to Individual Project (`PC-09`), Assign Supervisor to Project Group (`PC-08`), Bulk Assign Supervisor.

* **Validations:** Target project must belong to the Coordinator's Programme and Session (`BR-03`); target project must have a submitted topic proposal (`BR-05`); selected Supervisor must exist in `F-16` for the institution with Eligibility Status `Available`.

* **Post-Action Behaviour:** Assignment persists, workspace permissions (`F-66`) update, topic status transitions to `Under Supervisor Review`, notifications are sent, and audit log (`F-82`) is written.

* **States:** Loading state, Empty state ("All projects with submitted proposals have been assigned a Supervisor"), Error state.

### E. Business Rules

* **BR-04 & BR-05:** Students propose project topics before supervisor assignment; Coordinators assign supervisors after topic proposals are submitted.

* **BR-16:** The assigned Supervisor is recorded in the project's supervision history so that `F-48` permanently prevents them from being appointed as a Project Examiner for that project.

* **NFR-AUD:** Supervisor assignments must be recorded in the audit log (`F-82`).

* *(Note: `F-25` Supervisor Workload Monitoring and `F-26` Supervisor Workload Limit Management are P1 features excluded from the MVP; Open Decision `OD-04` / `GAP-08` tracks workload limit rules for post-MVP).*

### F. Permissions and Access Control

* **Project Coordinator:** Full authority to assign Supervisors to projects within their assigned Programme and Academic Session.

* **Project Supervisor:** Read access to their assigned projects (`PS-06`).

* **Student:** Read access to their assigned Supervisor's name, academic title, and department within their workspace (`F-28`).

### G. Data Requirements

* **Captured:** Supervision Assignment ID, Institution ID (`F-01`), Programme ID (`F-11`), Academic Session ID (`F-12`), Project ID (`F-21`), Group ID (`F-22`, nullable), Supervisor User ID (`F-13`), Supervisor Record ID (`F-16`), Assignment Status (`Active`, `Reassigned/Historical`), Assigned By Coordinator ID, Assigned Timestamp, Ended Timestamp (nullable).

### H. Dependencies and Integrations

* **Required Features:** `F-16`, `F-19`, `F-20`, `F-21`, `F-22`, `F-64`, `F-66`, `F-71`–`F-75`, `F-82`.

* **Consumed By:** `F-20`, `F-27`, `F-28`, `F-33`, `F-48` (Examiner Independence check), `F-56` (Supervisor Assessment).

### I. Acceptance Criteria

* **AC-F24-01 (Positive — Individual & Group Supervisor Assignment):** Given an Individual Project and a Group Project that have both submitted topic proposals (`F-20`), When the Project Coordinator assigns `Available` Supervisor Dr. Okonkwo to both projects, Then Dr. Okonkwo gains supervisory access to both projects (`PC-08`, `PC-09`), the topic proposals transition to `Under Supervisor Review`, notifications are dispatched, and audit records are logged (`F-82`).

* **AC-F24-02 (Permission — Supervisor Scope Isolation):** Given Dr. Okonkwo is assigned to Project 1 but not Project 2, When Dr. Okonkwo attempts to view or review Project 2, Then the system denies access (`SEC-12`).

# Module D: Supervisor Capacity and Assignment Management

*(Note: `F-25` Supervisor Workload Monitoring and `F-26` Supervisor Workload Limit Management are classified as **P1** in `mvp-p.md` §5 and are therefore excluded from the MVP implementation specification. Only `F-27` is P0 in Module D).*

## F-27: Supervisor Reassignment

### A. Feature Identification

* **Feature ID:** F-27

* **Feature Name:** Supervisor Reassignment

* **Feature Category:** Project Administration & Supervision Continuity (User-Facing Functionality)

* **Primary Actor:** Project Coordinator

* **Supporting Actors:** New Project Supervisor (`PS-20`), Former Project Supervisor, Student / Group Members, Notification Services (`F-71`, `F-72`), Audit Process (`F-82`)

* **MVP Priority:** P0

* **Source User Stories:** PC-12, PS-20

* **Short Feature Description:** Enables a Project Coordinator to reassign an individual student project or group project from its current Supervisor to a new eligible Supervisor when a Supervisor becomes unavailable (or when academic administration requires reassignment), seamlessly transferring full project workspace, version history, and supervision authority to the new Supervisor.

### B. Business Purpose

* **Problem Solved:** Academic staff may go on sabbatical, medical leave, or leave the institution mid-session. Without a clean reassignment mechanism, affected students or groups would be stranded mid-project without anyone authorised to approve their pending milestones or submit their Supervisor performance grade (`F-56`).

* **Necessity for Clario:** Ensures uninterrupted academic supervision (`PC-12`, `PS-20`) while maintaining accurate historical records of who supervised the project.

* **Business/Academic Value:** Protects student progression and preserves all prior milestone approvals, document versions, and feedback threads across the handover.

* **Impact if Omitted:** Projects with unavailable supervisors would be permanently deadlocked at their current milestone.

### C. Functional Requirements

* **FR-084:** The system must allow a Project Coordinator to reassign an active Individual Project or Group Project from its current Supervisor to another `Available` Supervisor (`F-16`) within the institution, requiring a mandatory Reassignment Reason.

* **FR-085:** Upon Supervisor reassignment, the system must:

  1. Mark the former Supervisor's assignment record (`F-24`) as `Reassigned/Historical` with an `Ended Timestamp` and revoke the former Supervisor's active write/review permissions on the project (`F-66`). *(Note: Default MVP behaviour revokes the former Supervisor's access to the project upon reassignment to enforce `SEC-12` ("Supervisors MUST only access projects and students assigned to them"), while preserving their name on historical feedback/approvals they authored).*

  2. Create a new `Active` Supervision Assignment record for the new Supervisor and immediately grant the new Supervisor full access (`PS-20`) to the project's workspace (`F-28`/`F-36`), topic proposals (`F-20`), all prior and current milestone submissions (`F-32`), complete document version history (`F-35`), prior supervisory feedback/discussions (`F-33`, `F-34`), pending extension requests (`F-42`), and Supervisor performance assessment (`F-56`).

  3. Preserve all previously approved topics (`F-20`) and previously approved milestones (`F-33`) so the student or group is not forced to repeat already-approved work.

  4. Retain **both** the former Supervisor and the new Supervisor in the project's supervision history so that **neither** can be appointed as a Project Examiner for that project (`BR-16`, `F-48`).

  5. Log the reassignment (including Previous Supervisor ID, New Supervisor ID, Actor ID, and Reason) in `F-82` (`NFR-AUD`) and notify the New Supervisor, Former Supervisor, and Student/Group Members (`F-71`, `F-72`).

### D. User Interaction and Behaviour

* **Access:** Project Coordinator Workspace -> "Supervisor Assignments -> Reassign Supervisor" (including a quick filter for projects whose current Supervisor was marked `Unavailable / On Leave` in `F-16`); New Project Supervisor via "Supervision Workspace -> Assigned Projects" (`PS-20`).

* **Information Viewed:** Current Supervisor Name & Status, New Supervisor selector (`Available` supervisors from `F-16`), Reassignment Reason input, and Project Handover Summary (Current Milestone stage, Topic Status, Pending Submissions).

* **Actions Performed:** Reassign Supervisor (`PC-12`); Access Reassigned Project History & Continue Supervision (`PS-20`).

* **Validations:** New Supervisor must be `Available` (`F-16`) and different from the current Supervisor; New Supervisor must not be currently appointed as a Project Examiner (`F-46`) for that same project (`BR-16`); Reassignment Reason is required ($10$–$500$ chars); Project results must not already be `Published` (`F-60`).

* **Post-Action Behaviour:** Access permissions transfer atomically, audit record is written (`F-82`), and notifications are sent.

* **States:** Loading state, Confirmation modal summarizing the handover, Success toast.

### E. Business Rules

* **BR-16:** Neither the former Supervisor nor the new Supervisor can examine a project they supervised (`F-48`).

* **SEC-12:** Only the currently assigned Supervisor has active supervisory access to the project.

* **NFR-AUD:** Supervisor reassignments are logged in `F-82` with previous and resulting values.

### F. Permissions and Access Control

* **Project Coordinator:** Authorised to execute Supervisor reassignments within their assigned Programme and Session.

* **New Project Supervisor:** Full supervisory read/write access to the reassigned project (`PS-20`).

* **Former Project Supervisor:** Active supervisory access revoked upon reassignment (`SEC-12`); historical comments/approvals remain attributed to them.

### G. Data Requirements

* **Captured:** Reassignment Event ID, Project ID (`F-21`), Former Supervisor ID, New Supervisor ID, Reassigned By Coordinator ID, Reassignment Reason, Timestamp.

### H. Dependencies and Integrations

* **Required Features:** `F-16`, `F-21`, `F-24`, `F-28`, `F-48`, `F-64`, `F-66`, `F-71`, `F-72`, `F-82`.

### I. Acceptance Criteria

* **AC-F27-01 (Positive — Seamless Handover & Continuity):** Given Project X has Milestone 1 approved by Supervisor A and Milestone 2 currently awaiting review, When the Coordinator reassigns Project X to Supervisor B with reason `Supervisor A on sabbatical leave`, Then Supervisor B gains full access to Project X (`PS-20`), Milestone 1 remains `Approved`, Supervisor B can review and approve Milestone 2, and Supervisor A can no longer access or modify Project X.

* **AC-F27-02 (Business Rule — Examiner Independence Preserved Across Reassignment):** Given Supervisor A previously supervised Project X before it was reassigned to Supervisor B, When the Coordinator later attempts to appoint Supervisor A as a Project Examiner (`F-46`) for Project X, Then the system blocks the appointment (`BR-16`, `F-48`).

# Module E: Project Workspace and Lifecycle

## F-28: Project Workspace

### A. Feature Identification

* **Feature ID:** F-28

* **Feature Name:** Project Workspace

* **Feature Category:** Project Workspace & Lifecycle (User-Facing Functionality)

* **Primary Actor:** Student, Project Supervisor

* **Supporting Actors:** Project Coordinator (views project details in programme scope)

* **MVP Priority:** P0

* **Source User Stories:** ST-01, ST-02, PS-06

* **Short Feature Description:** Provides authorised Students and Project Supervisors with a unified, role-tailored Project Workspace displaying assigned project metadata, programme project requirements/guidelines (`ST-02`), topic status (`F-20`), milestone timeline and deadlines (`F-29`, `F-30`), submission portals (`F-32`), feedback threads (`F-33`, `F-34`), defence schedule (`F-49`), and completion/result status (`F-60`–`F-62`).

### B. Business Purpose

* **Problem Solved:** Students and Supervisors need a single, authoritative workspace where all requirements, guidelines, milestones, documents, and supervisory interactions for a project live together rather than scattered across emails and disconnected pages.

* **Necessity for Clario:** Serves as the central hub for executing the academic project lifecycle (`ST-01`, `ST-02`, `PS-06`).

* **Business/Academic Value:** Improves student clarity on programme expectations and allows Supervisors to manage all assigned students and groups from one organized dashboard.

* **Impact if Omitted:** Students and Supervisors would have no unified interface to view project requirements or navigate project lifecycle stages.

### C. Functional Requirements

* **FR-086:** The system must provide each registered Student (`F-19`) with access to their assigned Project Workspace (`ST-01`) showing their Project Title/Topic Status (`F-20`), Project Arrangement (`Individual` or `Group` with member list `F-22`), Assigned Supervisor details (`F-24`), Programme Project Requirements & Guidelines (`ST-02`, `F-29`), Milestone Roadmap & Deadlines (`F-29`, `F-30`), Submission & Version History (`F-32`–`F-35`), Defence Schedule (`F-49`), and Project Completion / Published Result status (`F-60`–`F-62`).

* **FR-087:** The system must allow the Project Coordinator (as part of Programme Milestone & Requirement setup in `F-29`) to publish programme-level Project Requirements, Guidelines, and Expectations (`ST-02`, `PS-07`), and render these prominently in the Project Workspace for all Students and Supervisors in that Programme and Academic Session.

* **FR-088:** The system must provide each Project Supervisor with a Supervision Dashboard (`PS-06`) listing all Individual Projects and Project Groups currently assigned to them across their active sessions, filterable by Programme, Academic Session, Milestone Stage, and Pending Action (`Topic Awaiting Review`, `Submission Awaiting Review`, `Extension Request Pending`, `Overdue Submission`, `Performance Assessment Pending`), allowing one-click drill-down into each project's workspace.

### D. User Interaction and Behaviour

* **Access:** Student upon login -> "My Project Workspace" (`ST-01`); Project Supervisor upon login -> "Assigned Projects Dashboard" -> select project (`PS-06`).

* **Information Viewed:** Project Header (Title, Session, Programme, Arrangement Type, Supervisor, Overall Progress % / Current Stage), "Project Requirements & Guidelines" tab/panel (`ST-02`, `PS-07`), "Topic Proposal" tab (`F-20`), "Milestones & Submissions" timeline tab (`F-29`–`F-35`), "Extensions & Deadlines" tab (`F-42`–`F-44`), and "Defence & Results" tab (`F-49`, `F-60`–`F-62`).

* **Actions Performed:** View Requirements/Guidelines, Navigate lifecycle tabs, Filter assigned projects (`PS-06`), Trigger contextual lifecycle actions (Propose Topic, Upload Milestone, Review Submission, Request Extension).

* **Validations:** Strict access check (`F-66`, `SEC-11`, `SEC-12`) verifying that the requesting user is the assigned Student/Group Member, the currently assigned Supervisor, or the Programme's appointed Coordinator.

* **Post-Action Behaviour:** Workspace views load in under $2$ seconds (`PER-01`).

* **States:** Loading skeleton, Onboarding state (when student is registered in `F-19` and needs to submit their initial Topic Proposal `F-20`), Active Supervision state, Examination/Published Result state.

### E. Business Rules

* **BR-01 & BR-02:** Strict institutional and project-scope isolation (`SEC-11`, `SEC-12`).

* **BR-25:** Institutional Admins and Platform Admins are blocked from accessing Project Workspaces (`F-08`, `F-18`).

### F. Permissions and Access Control

* **Student:** Read/write access (per role rules) strictly to their own Individual Project Workspace or their assigned Shared Group Workspace (`F-36`, `SEC-11`).

* **Project Supervisor:** Read/review access strictly to workspaces of projects currently assigned to them (`SEC-12`).

* **Project Coordinator:** Read access to workspaces within their assigned Programme and Session (`BR-03`) for progress monitoring (`F-31`), without intervening in routine Supervisor–Student discussions (`BR-26`).

### G. Data Requirements

* **Displayed:** Aggregated Project view combining Project Record (`F-21`), Programme Guidelines (`F-29`), Topic Proposal (`F-20`), Milestones (`F-29`, `F-30`), Submissions (`F-32`–`F-35`), Defence (`F-49`), and Published Results (`F-60`–`F-62`).

### H. Dependencies and Integrations

* **Required Features:** `F-19`, `F-20`, `F-21`, `F-22`, `F-24`, `F-29`, `F-30`, `F-64`, `F-66`.

### I. Acceptance Criteria

* **AC-F28-01 (Positive — Student Workspace & Requirements Access):** Given an authenticated Student registered in `B.Sc. Computer Science` (`2026/2027`), When they open their Project Workspace (`ST-01`), Then they can view the programme's project requirements and guidelines (`ST-02`), their topic status, and their configured milestones and deadlines (`ST-03`).

* **AC-F28-02 (Positive — Supervisor Assigned Projects Dashboard):** Given an authenticated Project Supervisor assigned to $5$ individual projects and $2$ group projects, When they open their Supervision Dashboard (`PS-06`), Then all $7$ assigned projects are displayed with their current milestone stage and pending review indicators, and no unassigned projects are visible (`SEC-12`).

* **AC-F28-03 (Permission — Cross-Student Workspace Isolation):** Given Student A and Student B are on separate individual projects, When Student A attempts to access Student B's Project Workspace URL, Then the system denies access with a `403 Forbidden` response (`SEC-11`).

## F-29: Milestone Configuration

### A. Feature Identification

* **Feature ID:** F-29

* **Feature Name:** Milestone Configuration

* **Feature Category:** Project Workspace & Lifecycle (User-Facing Functionality)

* **Primary Actor:** Project Coordinator

* **Supporting Actors:** Project Supervisor (`PS-07`), Student (`ST-03`), Audit Process (`F-82`)

* **MVP Priority:** P0

* **Source User Stories:** PC-13, PS-07, ST-03

* **Short Feature Description:** Enables Project Coordinators to define and order the sequence of project milestones, deliverable requirements, programme guidelines, and the final project submission stage for their assigned Programme and Academic Session, making them visible to Students and Supervisors.

### B. Business Purpose

* **Problem Solved:** Final-year projects follow a structured academic sequence (e.g., Milestone 1: Chapter One / Introduction -> Milestone 2: Literature Review -> Milestone 3: Methodology & System Design -> Milestone 4: Implementation & Testing -> Final Consolidated Project Submission). Without configurable sequential milestones, programmes cannot enforce staged supervisory sign-off (`BR-10`).

* **Necessity for Clario:** Establishes the sequential academic workflow enforced across `F-30`–`F-35` and `BR-10`.

* **Business/Academic Value:** Gives Coordinators full control to tailor project stages and deliverable instructions to their specific degree programme while enforcing disciplined sequential progression.

* **Impact if Omitted:** Students would have no structured milestones against which to upload deliverables (`F-32`), and sequential progression gating (`BR-10`) could not operate.

### C. Functional Requirements

* **FR-089:** The system must allow a Project Coordinator to configure an ordered sequence of Project Milestones (`Sequence Order 1, 2, ..., N`) for their assigned Programme and Academic Session (`PC-13`), specifying for each milestone:

  1. Milestone Title (e.g., `Chapter 1: Introduction`, `Chapter 2: Literature Review`, `Final Consolidated Dissertation`).

  2. Sequence Order (integer $1 \dots N$).

  3. Deliverable Description, Requirements, and Evaluation Guidelines (`ST-02`, `PS-07`).

  4. Milestone Type (`Interim Milestone` vs. `Final Consolidated Project Submission` — requiring exactly one final submission milestone at the end of the sequence for `ST-11`).

  5. Required File Formats (subset of supported MVP formats: `PDF`, `DOC`, `DOCX`, `PPT`, `PPTX` per `NFR-SEC: File security`).

* **FR-090:** The system must enforce sequential milestone gating (`BR-10`, `NFR-DAT`):

  1. Milestone 1 is unlocked for formal submission (`F-32`) only after the project's Topic Proposal (`F-20`) is `Approved`.

  2. Each subsequent Milestone $k$ ($k > 1$) is unlocked for formal submission only after Milestone $k-1$ has reached status `Approved` by the assigned Project Supervisor (`F-33`, `BR-10`).

* **FR-091:** The system must allow a Project Coordinator to edit milestone descriptions/guidelines or add subsequent milestones before students reach them, while preventing deletion or reordering of any milestone that already has student submissions (`F-32`).

* **FR-092:** Configured milestones and requirements must be immediately visible to all Students (`ST-03`) and assigned Supervisors (`PS-07`) in that Programme and Session.

### D. User Interaction and Behaviour

* **Access:** Project Coordinator via "Programme Configuration -> Milestones & Requirements" (`PC-13`); Student & Supervisor via "Project Workspace -> Milestones & Requirements" (`ST-03`, `PS-07`).

* **Information Viewed:** Ordered list/timeline of Programme Milestones showing Sequence Number, Title, Milestone Type (`Interim` / `Final Project`), Description & Deliverable Requirements, Allowed File Formats, Configured Deadline (`F-30`), and (in project view) Lock/Unlock/Approval state.

* **Actions Performed:** Create Milestone, Reorder Un-submitted Milestones, Edit Milestone Requirements, Publish Programme Project Guidelines (`FR-087`).

* **Validations:** Milestone Title (required, 3–150 chars, unique within Programme/Session), Sequence Order (unique positive integer), Description/Requirements (required, 20–5,000 chars), Allowed Formats (at least one format selected from `PDF`, `DOC`, `DOCX`, `PPT`, `PPTX`), exactly one final milestone designated as `Final Consolidated Project Submission`.

* **Post-Action Behaviour:** Milestones saved, project timelines initialized/updated for all projects in the Programme and Session, audit log recorded (`F-82`).

* **States:** Loading state, Empty state ("No milestones configured yet — Define your programme's milestone workflow"), Locked/Unlocked milestone visual indicators for students.

### E. Business Rules

* **BR-03:** Milestone configurations are scoped to the Coordinator's assigned Programme and Academic Session.

* **BR-09:** Supervisors approve or reject milestone submissions.

* **BR-10:** Students cannot progress to the next milestone until the preceding milestone is approved.

* **BR-28:** Milestone configuration changes are logged in `F-82`.

### F. Permissions and Access Control

* **Project Coordinator:** Full create and update access for milestones in their assigned Programme and Session.

* **Project Supervisor & Student:** Read-only access to milestones and requirements (`PS-07`, `ST-03`).

### G. Data Requirements

* **Captured:** Milestone ID, Institution ID (`F-01`), Programme ID (`F-11`), Academic Session ID (`F-12`), Sequence Number, Milestone Title, Milestone Type (`INTERIM`, `FINAL_SUBMISSION`), Description & Requirements Text, Permitted File Extensions (`PDF`, `DOC`, `DOCX`, `PPT`, `PPTX`), Deadline Timestamp (`F-30`), Created/Updated By Coordinator ID, Timestamps.

### H. Dependencies and Integrations

* **Required Features:** `F-11`, `F-12`, `F-15`, `F-20`, `F-64`, `F-66`, `F-82`.

* **Consumed By:** `F-28`, `F-30`–`F-35`, `F-40`–`F-44`, `F-50`, `F-62`.

### I. Acceptance Criteria

* **AC-F29-01 (Positive — Sequential Milestone Configuration):** Given an authenticated Project Coordinator, When they configure Milestone 1 (`Chapter 1`), Milestone 2 (`Chapter 2 & 3`), and Milestone 3 (`Final Consolidated Project` of type `FINAL_SUBMISSION`), Then the ordered milestone structure is saved and visible to all Students (`ST-03`) and Supervisors (`PS-07`) in the Programme and Session.

* **AC-F29-02 (Business Rule — Sequential Progression Gating):** Given a Student whose Topic Proposal is `Approved` and Milestone 1 is currently `Under Review` (not yet `Approved`), When the Student views Milestone 2 or attempts to upload a formal submission to Milestone 2, Then Milestone 2 is displayed as `Locked` and the system rejects any submission to Milestone 2 (`BR-10`).

* **AC-F29-03 (Data Integrity — Prevent Deleting Milestone with Submissions):** Given Milestone 1 already has at least one student submission (`F-32`), When the Coordinator attempts to delete Milestone 1, Then the system blocks the deletion to preserve academic submission history.

## F-30: Milestone Deadline Management

### A. Feature Identification

* **Feature ID:** F-30

* **Feature Name:** Milestone Deadline Management

* **Feature Category:** Project Workspace & Lifecycle (User-Facing Functionality)

* **Primary Actor:** Project Coordinator

* **Supporting Actors:** Project Supervisor (`PS-07`), Student (`ST-03`), Scheduler Service (`F-79`, `F-80`), Audit Process (`F-82`)

* **MVP Priority:** P0

* **Source User Stories:** PC-14, PS-07, ST-03

* **Short Feature Description:** Enables Project Coordinators to establish and update official submission deadlines for each configured project milestone (`F-29`) in the institution's configured timezone (`NFR-DOM`), making those deadlines visible to Students and Supervisors and driving automated reminders (`F-40`, `F-79`), overdue detection (`F-41`, `F-80`), extensions (`F-42`), and late-submission recording (`F-43`).

### B. Business Purpose

* **Problem Solved:** Without clear, timezone-consistent deadlines for each project milestone, students lack schedule targets and the platform cannot objectively determine upcoming reminders, overdue work, or late submissions.

* **Necessity for Clario:** Provides the authoritative temporal schedule for all milestone and final submissions (`PC-14`, `NFR-DOM: Deadlines and timestamps`).

* **Business/Academic Value:** Keeps the entire academic cohort aligned to the programme calendar and automates schedule enforcement.

* **Impact if Omitted:** Automated reminders (`F-40`), overdue monitoring (`F-41`), extension workflows (`F-42`), and late-submission recording (`F-43`) cannot function.

### C. Functional Requirements

* **FR-093:** The system must allow a Project Coordinator to set and update a submission Deadline Date and Time for each configured Milestone (`F-29`) within their Programme and Academic Session (`PC-14`).

* **FR-094:** All milestone deadlines must be entered, displayed, and evaluated strictly using the institution's configured IANA timezone (`NFR-DOM`, `PROP-04`, e.g., `Africa/Lagos WAT`), with the timezone label explicitly shown alongside every deadline timestamp.

* **FR-095:** The system must validate that milestone deadlines follow chronological order matching the milestone sequence (`Deadline(Milestone k) >= Deadline(Milestone k-1)`) and fall within the `Start Date` and `End Date` of the Academic Session (`F-12`).

* **FR-096:** For each individual project or group project, the system must maintain an **Effective Deadline** per milestone:

  * By default, `Effective Deadline = Programme Milestone Deadline`.

  * If the project has an `Approved` Deadline Extension (`F-42`) for that milestone, `Effective Deadline = Approved Extended Deadline`.

* **FR-097:** Whenever a Programme Milestone Deadline is set or updated by a Coordinator (or an Extension is approved in `F-42`), the system must automatically synchronize reminder schedules (`F-79`) and overdue detection triggers (`F-80`), re-evaluate late status if a deadline was extended, log the change in `F-82`, and notify affected Students and Supervisors (`F-72`).

### D. User Interaction and Behaviour

* **Access:** Project Coordinator via "Programme Configuration -> Milestones & Deadlines" (`PC-14`); Student & Supervisor via "Project Workspace -> Milestones" (`ST-03`, `PS-07`).

* **Information Viewed:** Milestone Title, Sequence Number, Programme Deadline Timestamp (with Timezone badge), Project Effective Deadline (showing "Extended to \[Date/Time\]" if an extension was approved via `F-42`), and Time Remaining / Overdue countdown badge.

* **Actions Performed:** Set Milestone Deadline, Update Milestone Deadline (`PC-14`).

* **Validations:** Deadline must be a valid date-time within the Academic Session date range (`F-12`); `Deadline(Milestone k)` must be $>$ `Deadline(Milestone k-1)`.

* **Post-Action Behaviour:** Deadline saved, scheduler jobs (`F-79`, `F-80`) updated, audit log written (`F-82`), and cohort notified if an existing deadline was changed.

* **States:** Loading, Upcoming deadline state, Due Soon warning state (within reminder window), Overdue state, Extended deadline state.

### E. Business Rules

* **BR-12:** Submissions made after the applicable Effective Deadline are automatically recorded as late (`F-43`).

* **BR-15:** Project-specific deadline extensions require Supervisor recommendation and Coordinator approval (`F-42`).

* **NFR-DOM:** Deadline interpretation must use the institution's configured timezone.

### F. Permissions and Access Control

* **Project Coordinator:** Full access to set and update programme milestone deadlines within their assigned Programme and Session.

* **Project Supervisor & Student:** Read-only access to milestone deadlines (`PS-07`, `ST-03`).

### G. Data Requirements

* **Captured:** Milestone ID (`F-29`), Programme Deadline Timestamp (stored in UTC with Institution Timezone offset metadata), Updated By Coordinator ID, Updated Timestamp; per-project Effective Deadline Timestamp (derived from `F-30` base deadline or `F-42` approved extension).

### H. Dependencies and Integrations

* **Required Features:** `F-01`, `F-12`, `F-29`, `F-64`, `F-66`, `F-72`, `F-79`, `F-80`, `F-82`.

* **Consumed By:** `F-31`, `F-32`, `F-40`, `F-41`, `F-42`, `F-43`, `F-44`.

### I. Acceptance Criteria

* **AC-F30-01 (Positive — Setting Chronological Deadlines in Institutional Timezone):** Given Milestones 1 and 2 in an institution configured with timezone `Africa/Lagos`, When the Coordinator sets Milestone 1 deadline to `2026-12-01 23:59 WAT` and Milestone 2 deadline to `2027-01-15 23:59 WAT`, Then the deadlines are saved, displayed to Students (`ST-03`) and Supervisors (`PS-07`) in `WAT`, and registered with the reminder/overdue scheduler (`F-79`, `F-80`).

* **AC-F30-02 (Validation — Out-of-Order Milestone Deadlines):** Given Milestone 1 has a deadline of `2026-12-15 23:59 WAT`, When the Coordinator attempts to set Milestone 2's deadline to an earlier date (`2026-12-01 23:59 WAT`), Then the system rejects the deadline with a chronological sequence validation error.

## F-31: Project and Milestone Progress Monitoring

### A. Feature Identification

* **Feature ID:** F-31

* **Feature Name:** Project and Milestone Progress Monitoring

* **Feature Category:** Project Workspace & Lifecycle (User-Facing Functionality)

* **Primary Actor:** Project Coordinator, Project Supervisor, Student

* **Supporting Actors:** Group Members (`ST-21`)

* **MVP Priority:** P0

* **Source User Stories:** PC-15, PC-21, PS-08, ST-09, ST-21

* **Short Feature Description:** Displays real-time project and milestone progression statuses across individual projects (`ST-09`), group projects (`ST-21`), a Supervisor's assigned portfolio (`PS-08`), and the Coordinator's entire programme cohort (`PC-15`, `PC-21`).

### B. Business Purpose

* **Problem Solved:** Without structured progress visibility, Students cannot track their stage-by-stage completion, Supervisors cannot quickly spot which of their assigned students or groups are stalling, and Coordinators cannot identify bottlenecks across the programme cohort.

* **Necessity for Clario:** Provides unified multi-level progress tracking (`Student/Group -> Supervisor -> Coordinator`).

* **Business/Academic Value:** Enables proactive academic intervention before projects fail to meet final examination readiness.

* **Impact if Omitted:** Coordinators and Supervisors would have to manually open every individual project record one by one to determine its status.

### C. Functional Requirements

* **FR-098:** For every Project (`F-21`) and each configured Milestone (`F-29`), the system must maintain and display an authoritative Milestone Progress State:

  * `Locked` (preceding topic or milestone not yet approved per `BR-10`)

  * `In Progress / Not Submitted` (currently unlocked milestone awaiting initial submission)

  * `Submitted - Awaiting Supervisor Review`

  * `Revisions Requested` (returned by Supervisor for changes)

  * `Rejected` (rejected by Supervisor; requires new submission)

  * `Approved` (formally approved by Supervisor; unlocks next milestone)

* **FR-099:** The system must display a visual Milestone Progress Tracker in the Student/Group Workspace (`ST-09`, `ST-21`) showing the status of every milestone, completed vs. total milestones (e.g., `2 of 4 Milestones Approved`), current active milestone, deadline indicator (`On Track`, `Due Soon`, `Overdue`, `Submitted Late`), and latest submission/review timestamp.

* **FR-100:** The system must provide Project Supervisors with a Progress Monitoring view (`PS-08`) across all their assigned individual and group projects showing each project's current milestone, submission state, revision count, and overdue indicator.

* **FR-101:** The system must provide Project Coordinators with a Programme Progress & Submission Monitoring dashboard (`PC-15`, `PC-21`) displaying:

  1. Aggregate programme milestone completion metrics (count and percentage of projects at each milestone and in each status).

  2. A searchable, filterable programme project table filterable by Milestone, Progress State (`Awaiting Review`, `Revisions Requested`, `Approved`, `Overdue`), Project Type (`Individual`, `Group`), and Assigned Supervisor.

### D. User Interaction and Behaviour

* **Access:** Student via "Project Workspace -> Progress Overview" (`ST-09`, `ST-21`); Supervisor via "Supervision Workspace -> Progress Tracker" (`PS-08`); Coordinator via "Programme Workspace -> Milestone & Submission Progress" (`PC-15`, `PC-21`).

* **Information Viewed:** Step-by-step milestone progress bar, status badges, completion ratio, filterable cohort/supervision matrices, and submission/revision timestamps.

* **Actions Performed:** Filter by Milestone, Filter by Submission/Approval Status, Filter by Supervisor (`PC-15`, `PC-21`), Drill down into a specific Project or Milestone Submission.

* **Validations:** Scope enforcement (`F-66`) ensures Students see only their own/group progress, Supervisors see only their assigned projects, and Coordinators see only their assigned Programme and Session.

* **Post-Action Behaviour:** Progress views automatically reflect real-time state changes whenever a topic is approved (`F-20`), a document is submitted (`F-32`), or a Supervisor records a review decision (`F-33`).

* **States:** Loading state, Empty state (when no milestones or projects exist), Filtered empty state.

### E. Business Rules

* **BR-02 & BR-03:** Strict scope isolation across Student, Supervisor, and Coordinator views.

* **BR-10:** Progress tracker visually and functionally enforces sequential milestone progression.

### F. Permissions and Access Control

* **Student:** View progress of own Individual Project (`ST-09`) or own assigned Group Project (`ST-21`).

* **Project Supervisor:** View progress of all assigned Individual and Group Projects (`PS-08`).

* **Project Coordinator:** View programme-wide and per-project progress within assigned Programme and Session (`PC-15`, `PC-21`).

### G. Data Requirements

* **Displayed:** Project ID, Student/Group Name, Assigned Supervisor, Topic Status, Per-Milestone State (`Locked`, `Not Submitted`, `Awaiting Review`, `Revisions Requested`, `Rejected`, `Approved`), Submission Version Count, Is Late/Overdue flag, Overall Milestone Completion Percentage.

### H. Dependencies and Integrations

* **Required Features:** `F-20`, `F-21`, `F-22`, `F-24`, `F-28`, `F-29`, `F-30`, `F-32`, `F-33`, `F-41`, `F-66`.

### I. Acceptance Criteria

* **AC-F31-01 (Positive — Multi-Level Progress Synchronisation):** Given a Group Project where the Designated Submitter uploads Milestone 1 (`F-32`) and the Supervisor subsequently approves Milestone 1 (`F-33`), When any member of the group (`ST-21`), the assigned Supervisor (`PS-08`), or the Programme Coordinator (`PC-15`, `PC-21`) views the progress tracker, Then Milestone 1 is shown as `Approved` and Milestone 2 is shown as `In Progress / Unlocked` across all three actor views.

* **AC-F31-02 (Positive — Coordinator Bottleneck Filtering):** Given a Programme Coordinator viewing `PC-15`/`PC-21`, When they filter the programme table by `Milestone 2` and status `Revisions Requested`, Then the system displays only the projects in their Programme and Session that are currently in `Revisions Requested` for Milestone 2.

## F-32: Milestone and Final Project Submission

### A. Feature Identification

* **Feature ID:** F-32

* **Feature Name:** Milestone and Final Project Submission

* **Feature Category:** Project Workspace & Lifecycle (User-Facing Functionality)

* **Primary Actor:** Student (and Designated Group Submitter per `F-23`)

* **Supporting Actors:** Project Supervisor (receives submission), File Storage Service (`F-76`–`F-78`), Late Submission Recording (`F-43`), Notification Services (`F-71`–`F-75`), Audit Process (`F-82`)

* **MVP Priority:** P0

* **Source User Stories:** ST-10, ST-11, ST-20

* **Short Feature Description:** Enables Students (or Designated Group Submitters on behalf of a group) to upload and formally submit milestone documents (`ST-10`) and their consolidated final project document (`ST-11`), enforcing file security rules (max $50\text{ MB}$, allowed formats `PDF`, `DOC`, `DOCX`, `PPT`, `PPTX`), interrupted upload recovery (`NFR-USA`), and formal server-validated submission confirmation (`DAT-03`).

### B. Business Purpose

* **Problem Solved:** Students need a reliable, secure way to submit academic chapters/deliverables for each project milestone and their final consolidated dissertation for examination, even under fluctuating internet connectivity.

* **Necessity for Clario:** Core execution mechanism for `ST-10` and `ST-11`, feeding supervisory review (`F-33`) and examination material access (`F-50`).

* **Business/Academic Value:** Guarantees that every formal submission is validated, virus/content-checked, versioned (`F-35`), timestamped against the institutional deadline (`F-43`), and confirmed before becoming an official academic record.

* **Impact if Omitted:** Students cannot submit milestone deliverables or final projects on Clario.

### C. Functional Requirements

* **FR-102:** The system must allow an authorised Student (the individual project owner, or the Designated Group Submitter `F-23` for a group project per `BR-08`) to upload a document and optional submission notes for an unlocked Milestone (`ST-10`) or the unlocked Final Consolidated Project milestone (`ST-11`).

* **FR-103:** The system must enforce strict file validation (`NFR-SEC: File security`) on every upload:

  1. Maximum individual file size: $50\text{ MB}$ ($52,428,800\text{ bytes}$).

  2. Accepted file formats: **`PDF`, `DOC`, `DOCX`, `PPT`, and `PPTX`** (further restricted to the subset configured for that milestone in `F-29`).

  3. True MIME/magic-byte content inspection (rejecting files whose actual binary signature does not match the claimed extension) and malicious content scanning before making the file available to other users.

* **FR-104:** In accordance with `NFR-USA: Offline behaviour` and `DAT-03` / `DAT-05`:

  1. The client must support saving submission notes/draft state locally on the user's device and queuing an interrupted file upload for automatic idempotent retry (using a unique client upload token) when connectivity returns.

  2. **An upload must NOT become a formal submission until successful server receipt, file validation, version creation (`F-78`), and formal submission confirmation (`DAT-03`).**

  3. Automatic upload retries must be idempotent and must never create duplicate formal submission versions (`NFR-USA`).

* **FR-105:** Upon successful formal submission confirmation:

  1. The system creates an immutable Document Version record (`Version 1` for initial submission, `Version N` for resubmissions via `F-35` / `F-78`).

  2. The system compares the server receipt timestamp against the milestone's Effective Deadline (`F-30` / `F-42`) in the institution's timezone and automatically records whether the submission is `On Time` or `Late` (`F-43`, `BR-12`).

  3. The milestone status transitions to `Submitted - Awaiting Supervisor Review`.

  4. The assigned Project Supervisor is notified via in-app and email notifications (`F-75`, `PS-17`).

* **FR-106:** While a milestone submission is in status `Submitted - Awaiting Supervisor Review` or `Approved`, the system must prevent the student from uploading another formal version for that milestone unless the Supervisor returns the submission with `Revisions Requested` or `Rejected` (`F-33`).

* **FR-107:** When the `Final Consolidated Project Submission` milestone (`ST-11`) is formally submitted and subsequently `Approved` by the Project Supervisor (`F-33`), the system must mark that approved final submission version as the official **Examination Document** accessible to appointed Project Examiners (`F-50`).

### D. User Interaction and Behaviour

* **Access:** Student / Designated Group Submitter via "Project Workspace -> Milestones -> \[Select Unlocked Milestone\] -> Submit Deliverable".

* **Information Viewed:** Milestone Requirements, Allowed Formats badge (`PDF, DOCX...`), Max File Size notice (`Max 50 MB`), Effective Deadline & Late Warning banner (if past deadline), File Dropzone/Selector, Upload Progress bar (with pause/retry indicator on network drop), Optional Submission Notes field, and Formal Submission Confirmation receipt (Version Number, Server Timestamp, SHA-256 Checksum/File Name, On-Time/Late badge).

* **Actions Performed:** Save Local Draft Notes, Select/Upload File, Retry Interrupted Upload, Confirm Formal Submission (`ST-10`, `ST-11`).

* **Validations:** Milestone must be `Unlocked` (`BR-10`); Actor must be the Individual Student or Designated Group Submitter (`BR-08`); File size $\le 50\text{ MB}$; File format and magic bytes must match `PDF`, `DOC`, `DOCX`, `PPT`, or `PPTX`; Active internet connection required for final formal submission confirmation (`NFR-USA`).

* **Post-Action Behaviour (Success):** Formal submission version is recorded (`DAT-01`, `DAT-03`), status updates to `Submitted - Awaiting Supervisor Review`, confirmation receipt is shown, and Supervisor notification (`F-75`) is dispatched.

* **Post-Action Behaviour (Failure):** If network drops mid-upload, UI displays "Connection interrupted — Upload queued and will retry automatically when online" (`DAT-05`); if file validation fails (e.g., $> 50\text{ MB}$ or renamed `.exe`), upload is rejected with a clear error message and no formal submission is recorded.

### E. Business Rules

* **BR-08 / DAT-04:** Only designated group submitters can make formal group submissions.

* **BR-10:** Students cannot submit to a milestone until the preceding milestone (or topic proposal for Milestone 1) is approved.

* **BR-11 / DAT-01 / DAT-02:** Every formal submission creates a preserved version without deleting previous versions.

* **BR-12 & BR-13:** Late submissions remain possible after the deadline and are automatically recorded as late (`F-43`).

### F. Permissions and Access Control

* **Student (Individual Project Owner) / Designated Group Submitter:** Full permission to upload and confirm formal milestone and final project submissions for unlocked milestones on their project.

* **Non-Designated Group Member:** Can view formal submissions and download versions, but cannot execute formal submissions (`F-23`).

* **Project Supervisor:** Read/download access to submitted documents for assigned projects (`F-33`, `F-77`).

### G. Data Requirements

* **Captured:** Submission ID, Milestone ID (`F-29`), Project ID (`F-21`), Group ID (`F-22`, nullable), Version Number (`1, 2, ...`), Submitted By User ID, Original File Name, Validated MIME Type, File Size (bytes), Storage Object Reference (`F-76`), File Integrity Hash (SHA-256), Submission Notes (optional), Server Receipt Timestamp, Effective Deadline at Submission, Is Late (boolean, `F-43`), Late Duration (minutes/hours/days, `F-43`), Submission Status (`Awaiting Review`, `Revisions Requested`, `Approved`, `Rejected`), Idempotency Upload Token.

### H. Dependencies and Integrations

* **Required Features:** `F-20`, `F-21`, `F-23`, `F-29`, `F-30`, `F-35`, `F-43`, `F-64`, `F-66`, `F-75`, `F-76`–`F-78`.

* **Consumed By:** `F-33` (Submission Review and Approval), `F-34` (Feedback & Discussion), `F-35` (Version Management), `F-43` & `F-44` (Late Penalties), `F-50` (Examination Material Access).

### I. Acceptance Criteria

* **AC-F32-01 (Positive — Valid Milestone Submission):** Given a Student with an unlocked Milestone 1, When they upload a valid $12\text{ MB}$ `DOCX` file and confirm submission before the deadline, Then the system validates the file content, stores it as `Version 1` (`F-76`, `F-78`), sets status to `Submitted - Awaiting Supervisor Review`, marks it `On Time`, and notifies the assigned Supervisor (`F-75`).

* **AC-F32-02 (Validation — File Size Over 50 MB & Disguised Extension Rejection):** Given a Student attempting to submit a milestone document, When they select a $55\text{ MB}$ PDF file OR an executable file renamed to `chapter1.pdf`, Then the system rejects the upload with a file-security validation error and does not record a formal submission (`DAT-03`).

* **AC-F32-03 (Resilience — Interrupted Upload Recovery Without Duplicate Versions):** Given a Student uploading a $30\text{ MB}$ document whose network connection drops at $60\%$, When connectivity is restored and the queued upload automatically retries with the same idempotency token, Then the upload completes and records exactly **one** formal submission version (`NFR-USA`, `DAT-05`).

## F-33: Submission Review and Approval

### A. Feature Identification

* **Feature ID:** F-33

* **Feature Name:** Submission Review and Approval

* **Feature Category:** Project Workspace & Lifecycle (User-Facing Functionality)

* **Primary Actor:** Project Supervisor

* **Supporting Actors:** Student (views review status and decision), Notification Services (`F-71`–`F-75`), Audit Process (`F-82`)

* **MVP Priority:** P0

* **Source User Stories:** PS-09, PS-11, PS-12, PS-13, ST-12

* **Short Feature Description:** Enables Project Supervisors to review milestone and final project submissions from their assigned students or groups (`PS-09`), request revisions (`PS-11`), approve satisfactory submissions to unlock the next milestone (`PS-12`), or reject unsuitable submissions (`PS-13`), while exposing real-time submission status to Students (`ST-12`).

### B. Business Purpose

* **Problem Solved:** Academic quality control requires a Supervisor to inspect each milestone submission and explicitly decide whether the student is ready to advance to the next stage or must revise their work.

* **Necessity for Clario:** Implements `BR-09` and drives sequential milestone progression (`BR-10`).

* **Business/Academic Value:** Ensures students do not accumulate fatal flaws across chapters before reaching final defence.

* **Impact if Omitted:** Submissions would remain permanently pending and students could never unlock subsequent milestones (`BR-10`) or reach examination (`F-50`).

### C. Functional Requirements

* **FR-108:** The system must allow an assigned Project Supervisor to view and download (`F-77`) the submitted document for any milestone or final submission of an assigned project (`PS-09`).

* **FR-109:** The system must allow the assigned Project Supervisor to record one of three formal review decisions on a submission currently in `Submitted - Awaiting Supervisor Review`:

  1. **Approve Submission (`PS-12`):** Transitions the submission and milestone status to `Approved`, automatically unlocks the next sequential milestone (`F-29`, `BR-10`) — or marks the project's Final Submission as `Approved for Examination` (`F-50`) if it is the final milestone — logs the critical academic decision in `F-82` (`NFR-AUD`), and notifies the Student/Group (`F-75`, `SYS-12`).

  2. **Request Revisions (`PS-11`):** Transitions the submission and milestone status to `Revisions Requested`, requires mandatory supervisory feedback (`F-34`) detailing the required improvements, re-opens the milestone for the Student/Designated Submitter to upload a revised version (`F-35`, `ST-14`), logs the decision in `F-82`, and notifies the Student/Group (`F-75`, `SYS-12`).

  3. **Reject Submission (`PS-13`):** Transitions the submission status to `Rejected`, requires mandatory supervisory feedback explaining why the submission does not satisfy milestone requirements, keeps the subsequent milestone `Locked` (`BR-10`), allows a new replacement submission version (`F-35`), logs the decision in `F-82` (`NFR-AUD`), and notifies the Student/Group (`F-75`).

* **FR-110:** The system must clearly expose the current submission status (`Awaiting Supervisor Review`, `Revisions Requested`, `Approved`, `Rejected`), decision timestamp, and reviewer identity to the Student/Group (`ST-12`), Supervisor, and Coordinator (`F-31`).

### D. User Interaction and Behaviour

* **Access:** Project Supervisor via "Supervision Workspace -> Project -> Milestone Submission Review"; Student via "Project Workspace -> Milestones" (`ST-12`).

* **Information Viewed:** Submitted File details (Name, Version Number, Upload Timestamp, On-Time/Late status, Download/Preview button), Student Submission Notes, Previous Version Comparison link (`F-35`), Review Decision selector (`Approve`, `Request Revisions`, `Reject`), and Feedback input (`F-34`).

* **Actions Performed:** Download/View Submitted Document (`PS-09`), Approve Submission (`PS-12`), Request Revisions (`PS-11`), Reject Submission (`PS-13`).

* **Validations:** Only the currently assigned Supervisor (`SEC-12`) can record a review decision; written feedback is mandatory when selecting `Request Revisions` or `Reject` ($10$–$5,000$ chars); active internet connection required (`NFR-USA`).

* **Post-Action Behaviour:** Status updates atomically, next milestone unlocks if `Approved`, audit entry is written (`F-82`), and Student/Group notification (`F-75`) is dispatched.

* **States:** Loading, Pending Review state, Decision Recorded state (`Approved` / `Revisions Requested` / `Rejected`).

### E. Business Rules

* **BR-09:** Supervisors approve or reject milestone submissions.

* **BR-10:** Students cannot progress to the next milestone until the preceding milestone is approved.

* **BR-26:** Coordinators do not intervene in routine Supervisor–Student milestone review decisions.

* **NFR-AUD:** Milestone approvals and rejections must be recorded in the audit log (`F-82`).

### F. Permissions and Access Control

* **Project Supervisor:** Full permission to review and record decisions (`Approve`, `Request Revisions`, `Reject`) strictly on submissions of projects currently assigned to them (`SEC-12`).

* **Student:** Read-only access to submission status and review decisions on their own/group project (`ST-12`).

* **Project Coordinator:** Read-only visibility of submission and approval statuses across their Programme and Session (`PC-21`).

### G. Data Requirements

* **Captured:** Review Decision ID, Submission ID (`F-32`), Milestone ID (`F-29`), Project ID (`F-21`), Version Number Reviewed, Supervisor User ID, Decision (`APPROVED`, `REVISIONS_REQUESTED`, `REJECTED`), Feedback Summary/Comment (`F-34`), Decision Timestamp.

### H. Dependencies and Integrations

* **Required Features:** `F-24`, `F-29`, `F-32`, `F-34`, `F-35`, `F-64`, `F-66`, `F-75`, `F-77`, `F-82`.

* **Consumed By:** `F-29` (Sequential unlocking), `F-31` (Progress Monitoring), `F-35` (Resubmission), `F-50` (Examiner access to approved final document), `F-62` (Completion tracking).

### I. Acceptance Criteria

* **AC-F33-01 (Positive — Milestone Approval Unlocks Next Milestone):** Given Milestone 1 has a submission in `Submitted - Awaiting Supervisor Review`, When the assigned Supervisor reviews and `Approves` the submission (`PS-12`), Then Milestone 1 status becomes `Approved`, Milestone 2 automatically changes from `Locked` to `Unlocked`, an audit record is created (`F-82`), and the Student is notified (`ST-12`, `F-75`).

* **AC-F33-02 (Positive — Request Revisions Re-opens Resubmission):** Given Milestone 1 is `Submitted - Awaiting Supervisor Review`, When the assigned Supervisor selects `Request Revisions` and enters feedback (`PS-11`), Then Milestone 1 status becomes `Revisions Requested`, Milestone 2 remains `Locked`, the Student can upload `Version 2` (`F-35`), and the Student receives a notification (`F-75`).

* **AC-F33-03 (Validation — Feedback Mandatory on Revision Request or Rejection):** Given a Supervisor reviewing a submission, When they attempt to click `Request Revisions` or `Reject` without providing feedback text, Then the system blocks the action and displays a validation error.

## F-34: Submission Feedback and Discussion

### A. Feature Identification

* **Feature ID:** F-34

* **Feature Name:** Submission Feedback and Discussion

* **Feature Category:** Project Workspace & Lifecycle (User-Facing Functionality)

* **Primary Actor:** Project Supervisor, Student

* **Supporting Actors:** Group Members, Notification Services (`F-71`–`F-75`)

* **MVP Priority:** P0

* **Source User Stories:** PS-10, PS-16, ST-13, ST-22

* **Short Feature Description:** Enables Project Supervisors to attach structured academic feedback comments (and optional annotated feedback attachments) directly to specific project submissions (`PS-10`), and enables Students and Supervisors to exchange contextual discussion comments attached strictly to a specific submission (`PS-16`, `ST-13`, `ST-22`).

### B. Business Purpose

* **Problem Solved:** Students need clear, contextual academic guidance tied directly to the specific document version they submitted, and the ability to ask clarifying questions on that feedback without resorting to un-tracked external chat apps.

* **Necessity for Clario:** Implements `PS-10`, `PS-16`, `ST-13`, and `ST-22` while strictly respecting `BR-27` ("Student–Supervisor discussions are attached to project submissions, not general-purpose messaging").

* **Business/Academic Value:** Keeps all academic critique and clarification organized by milestone and document version so both parties can verify what was discussed and resolved.

* **Impact if Omitted:** Supervisors could not explain revision requirements and students could not clarify supervisory feedback on their submissions.

### C. Functional Requirements

* **FR-111:** The system must allow the assigned Project Supervisor to record formal written feedback (`PS-10`) on any specific Milestone or Final Submission version (`F-32`, `F-35`), and optionally attach an annotated feedback document (subject to the same $50\text{ MB}$ and `PDF`, `DOC`, `DOCX`, `PPT`, `PPTX` validation rules in `FR-103`).

* **FR-112:** The system must allow the assigned Project Supervisor (`PS-16`) and the assigned Student — or any member of the assigned Project Group (`ST-22`) — to post threaded discussion comments attached directly to a specific Submission record (`BR-27`).

* **FR-113:** The system must NOT provide a free-floating, general-purpose chat or direct messaging inbox decoupled from project submissions (`BR-27`, `mvp-p.md` §10).

* **FR-114:** In accordance with `BR-26` and `BR-25`:

  1. Project Coordinators do not intervene in routine Supervisor–Student submission discussions (`BR-26`).

  2. Institutional Admins and Platform Admins are strictly blocked from viewing submission feedback or discussion threads (`BR-25`, `F-08`, `F-18`).

* **FR-115:** When a Supervisor posts feedback/comments or a Student posts a submission discussion comment, the system must preserve the comment chronologically with author identity and timestamp, and trigger an in-app/email notification to the counterpart (`F-72`, `F-75`).

### D. User Interaction and Behaviour

* **Access:** Student & Supervisor via "Project Workspace -> Milestones -> \[Select Submission Version\] -> Feedback & Discussion Thread".

* **Information Viewed:** Supervisor Formal Review Feedback card (tied to the review decision in `F-33`), optional Supervisor Annotated File download link (`F-77`), and chronological Submission Discussion Thread showing Author Name, Role badge (`Supervisor` / `Student`), Timestamp, Version tag (e.g., `v1`, `v2`), and Comment Body.

* **Actions Performed:** Post Submission Feedback (`PS-10`), Post Discussion Comment on Submission (`PS-16`, `ST-22`), View Feedback (`ST-13`), Download Annotated Feedback File.

* **Validations:** Comment text (required, 1–5,000 chars); comment must reference a valid existing Submission ID (`F-32`); local draft comment storage supported when offline, but active connection required to post (`NFR-USA`).

* **Post-Action Behaviour:** Comment is appended to the submission thread, preserved across subsequent resubmissions (`F-35`), and notifications are queued.

* **States:** Loading, Empty discussion state ("No comments on this submission yet"), Offline draft indicator.

### E. Business Rules

* **BR-25:** Institutional Admins cannot access academic feedback (`F-18`).

* **BR-26:** Coordinators do not intervene in routine Supervisor–Student interactions.

* **BR-27:** Student–Supervisor discussions are attached to project submissions, not general-purpose messaging.

### F. Permissions and Access Control

* **Project Supervisor:** Full read and write access to feedback and submission discussions on projects currently assigned to them (`SEC-12`).

* **Student (Individual or Group Member):** Full read and write access to submission discussions (`ST-13`, `ST-22`) on their own Individual or Group Project submissions (`SEC-11`).

* **Project Coordinator:** No participation in routine submission discussions (`BR-26`).

* **Institutional Admin / Platform Admin / Project Examiner:** No access (`BR-25`, `F-08`, `F-18`, `actors.md` §1.6).

### G. Data Requirements

* **Captured:** Feedback/Comment ID, Submission ID (`F-32`), Submission Version Number (`F-35`), Project ID (`F-21`), Author User ID, Author Role (`SUPERVISOR`, `STUDENT`), Entry Type (`FORMAL_REVIEW_FEEDBACK`, `DISCUSSION_COMMENT`), Comment Body, Optional Attachment File Reference (`F-76`), Created Timestamp.

### H. Dependencies and Integrations

* **Required Features:** `F-32`, `F-33`, `F-35`, `F-64`, `F-66`, `F-72`, `F-75`, `F-76`, `F-77`.

### I. Acceptance Criteria

* **AC-F34-01 (Positive — Contextual Feedback & Submission Discussion):** Given a Student has submitted `Version 1` of Milestone 1 (`F-32`), When the assigned Supervisor posts formal feedback (`PS-10`) and the Student replies with a clarifying question on that submission (`ST-22`), Then both the feedback and reply are displayed within the Milestone 1 `Version 1` discussion thread (`ST-13`, `PS-16`).

* **AC-F34-02 (Scope Boundary — No General Messaging Outside Submissions):** Given an authenticated Student or Supervisor, When they navigate the platform, Then all discussion threads are bound to specific project submissions (`BR-27`) and no standalone general-purpose chat/DM feature exists.

## F-35: Document Version Management

### A. Feature Identification

* **Feature ID:** F-35

* **Feature Name:** Document Version Management

* **Feature Category:** Project Workspace & Lifecycle (User-Facing Functionality)

* **Primary Actor:** Student, Project Supervisor

* **Supporting Actors:** Designated Group Submitter (`F-23`), Document Version Preservation Service (`F-78`)

* **MVP Priority:** P0

* **Source User Stories:** PS-14, PS-15, ST-14, ST-15

* **Short Feature Description:** Allows Students (or Designated Group Submitters) to upload revised document versions after receiving supervisory feedback (`ST-14`), preserves all previous submission versions without deletion (`BR-11`), and enables both Students and Supervisors to view, download, and compare metadata/feedback across current and historical document versions (`PS-14`, `PS-15`, `ST-15`).

### B. Business Purpose

* **Problem Solved:** Academic writing is iterative; a single milestone often undergoes multiple revisions (`v1 -> v2 -> v3`). Overwriting previous files when a student resubmits destroys academic history, prevents Supervisors from verifying whether their prior feedback was addressed (`PS-14`), and prevents Students from recovering earlier drafts (`ST-15`).

* **Necessity for Clario:** Implements user-facing version history and comparison (`BR-11`, `DAT-01`, `DAT-02`), backed by `F-78`.

* **Business/Academic Value:** Provides complete traceability of document evolution from first draft to approved milestone.

* **Impact if Omitted:** Resubmissions would overwrite earlier work, making it impossible to audit or compare revisions.

### C. Functional Requirements

* **FR-116:** When a milestone submission is in status `Revisions Requested` or `Rejected` (`F-33`), the system must allow the Student (or Designated Group Submitter `F-23`) to upload a revised document (`ST-14`) together with a "Revision Summary / Changes Made" note.

* **FR-117:** Upon server receipt and validation (`FR-103`, `DAT-03`) of a revised submission, the system must:

  1. Increment the Milestone Submission Version Number (`v2`, `v3`, $\dots$, `vN`).

  2. Preserve all previous submission versions (`v1` $\dots$ `v(N-1)`), their original files (`F-78`), their submission timestamps, and their associated supervisory feedback (`F-34`) as immutable historical records (`BR-11`, `DAT-01`, `DAT-02`).

  3. Transition the milestone status back to `Submitted - Awaiting Supervisor Review` and notify the assigned Supervisor (`F-75`).

* **FR-118:** The system must provide a Version History & Comparison view (`PS-14`, `PS-15`, `ST-15`) within each Milestone allowing the Student/Group and the assigned Supervisor to:

  1. View a chronological list of all submitted versions (`v1` through `vN`) showing Version Number, File Name, File Size, Submitted By, Submission Timestamp, On-Time/Late status, Revision Summary Note, Review Decision (`Revisions Requested`, `Rejected`, `Approved`), and Supervisor Feedback.

  2. Download/open any historical version (`ST-15`, `PS-15`, `F-77`).

  3. View any two versions side-by-side (comparing the previous version's Supervisor Feedback and file alongside the new version's Revision Summary and file) so the Supervisor can verify that requested changes were addressed (`PS-14`).

### D. User Interaction and Behaviour

* **Access:** Student & Supervisor via "Project Workspace -> Milestones -> \[Select Milestone\] -> Version History & Comparison".

* **Information Viewed:** Version timeline table (`v1`, `v2`, `v3`...), Side-by-Side Revision Review panel (Left: `Version N-1` + Supervisor Feedback; Right: `Version N` + Student Revision Note + Document Download/Preview).

* **Actions Performed:** Upload Revised Version (`ST-14`), View Version History (`ST-15`, `PS-15`), Compare Resubmission with Previous Version & Feedback (`PS-14`), Download Historical Version (`F-77`).

* **Validations:** Resubmission is only permitted when the milestone is in `Revisions Requested` or `Rejected` state; file must pass all `FR-103` validations ($\le 50\text{ MB}$, `PDF`, `DOC`, `DOCX`, `PPT`, `PPTX`); Revision Summary Note is required for resubmissions ($10$–$2,000$ chars).

* **Post-Action Behaviour:** New version `vN` becomes the active version under review while `v1..v(N-1)` remain permanently accessible in read-only history.

* **States:** Loading, Single-version state (`v1`), Multi-version comparison state (`v1..vN`).

### E. Business Rules

* **BR-08:** For group projects, only the Designated Group Submitter can upload a formal revised submission version.

* **BR-11 / DAT-01 / DAT-02:** Revised submissions create new versions without deleting previous versions.

### F. Permissions and Access Control

* **Student / Designated Group Submitter:** Upload revised versions when milestone is in `Revisions Requested` or `Rejected`; all group members can view and download all historical versions of their group's submissions (`ST-15`).

* **Project Supervisor:** View, compare, and download all current and historical submission versions for assigned projects (`PS-14`, `PS-15`).

* **Project Coordinator:** Read-only metadata visibility of version counts and statuses (`PC-21`).

### G. Data Requirements

* **Captured:** Submission Version ID, Milestone ID (`F-29`), Project ID (`F-21`), Version Number (sequential integer starting at $1$), Parent Submission Version ID (nullable for `v1`), File Storage Reference (`F-76`, `F-78`), File Name, File Size, SHA-256 Hash, Student Revision Summary Note, Submitted By User ID, Submitted Timestamp, Is Late (`F-43`), Review Status & Linked Feedback (`F-33`, `F-34`).

### H. Dependencies and Integrations

* **Required Features:** `F-23`, `F-32`, `F-33`, `F-34`, `F-64`, `F-66`, `F-75`, `F-76`, `F-77`, `F-78`.

### I. Acceptance Criteria

* **AC-F35-01 (Positive — Resubmission Creates New Version & Preserves Previous Version):** Given `Version 1` of Milestone 1 was returned by the Supervisor with `Revisions Requested`, When the Student uploads a revised document with a revision note (`ST-14`), Then the system creates `Version 2`, keeps `Version 1` and its feedback intact (`BR-11`, `DAT-02`), sets Milestone 1 back to `Submitted - Awaiting Supervisor Review`, and notifies the Supervisor.

* **AC-F35-02 (Positive — Version History Inspection & Comparison):** Given Milestone 1 has `Version 1` (`Revisions Requested`) and `Version 2` (`Awaiting Review`), When the Supervisor (`PS-14`, `PS-15`) or Student (`ST-15`) opens the Version History view, Then they can inspect both `Version 1` and `Version 2`, compare `Version 1`'s feedback against `Version 2`'s revision summary, and download either document file.

* **AC-F35-03 (Data Integrity — Historical Versions Cannot Be Deleted):** Given any recorded formal submission version (`v1`, `v2`, etc.), When any user attempts to delete or overwrite a historical version, Then the system blocks the operation (`DAT-02`).