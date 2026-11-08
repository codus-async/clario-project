# Clario — MVP Feature Specification (`mvp-features-part4.md`)

**Document Status:** Stage 2 — Feature Decomposition (Batch 5 of 5: Modules K, L, M, N, O & P)

**Target Release:** Clario MVP (P0 Scope Only)

**Platform:** Responsive Web Application (All Actors)

**Launch Jurisdiction & Currency:** Nigeria (`NGN`)

## Batch 5 Overview

* **Module K (Authentication, Security & Access Control):** `F-64`, `F-65`, `F-66`
* **Module L (Subscription Payment Processing):** `F-67`, `F-68`, `F-69`, `F-70`
* **Module M (Notification & Communication Infrastructure):** `F-71`, `F-72`, `F-73`, `F-74`, `F-75`
* **Module N (Document Storage & Retrieval):** `F-76`, `F-77`, `F-78`
* **Module O (Scheduling & Background Processes):** `F-79`, `F-80` *(Note: `F-81` Academic Session Carry-Forward Processing is P1 and excluded from the MVP).*
* **Module P (Audit & Backup Infrastructure):** `F-82`, `F-83`

---

# Module K: Authentication, Security and Access Control

## F-64: User Authentication

### A. Feature Identification

* **Feature ID:** F-64
* **Feature Name:** User Authentication
* **Feature Category:** Authentication, Security & Access Control (Supporting System Capability & User-Facing Authentication Flow)
* **Primary Actor:** Authentication Service (Supporting System Actor)
* **Supporting Actors:** All Human Actors (Platform Admin, Institutional Admin, Project Coordinator, Project Supervisor, Student, Project Examiner), Email Service (`F-71`), Audit Process (`F-82`)
* **MVP Priority:** P0
* **Source User Stories:** SYS-01
* **Short Feature Description:** Verifies user identities before granting access to Clario, enforcing password complexity (`SEC-02`), compromised-password screening (`SEC-03`), rate limiting (`SEC-04`), adaptive temporary lockouts (`SEC-05`), mandatory Multi-Factor Authentication (`MFA`) for Platform Admins, Institutional Admins, and Project Coordinators (`SEC-06`), and email-based password recovery with Institutional Admin assistance (`SEC-08`).

### B. Business Purpose

* **Problem Solved:** Unauthorized access to academic records, grade sheets, or tenant administration compromises institutional data sovereignty and academic integrity.
* **Necessity for Clario:** Implements `SYS-01` and `SEC-01` through `SEC-08`, serving as the mandatory identity gate before any protected Clario feature can be accessed.
* **Business/Academic Value:** Protects sensitive academic and personal data (`NDPA 2023`) and enforces elevated MFA assurance for administrative and coordination roles.
* **Impact if Omitted:** The platform would have no identity verification, allowing unauthorized actors to impersonate students, supervisors, examiners, or administrators.

### C. Functional Requirements

* **FR-219:** The system must require every user to authenticate with a verified email/institutional identifier and password before accessing any protected Clario route or operation (`SYS-01`, `SEC-01`).
* **FR-220:** During account activation, password creation, or password reset, the system must enforce that passwords contain **at least $12$ characters (`SEC-02`)** and screen candidate passwords against a known compromised-password dictionary/breach list (`SEC-03`), rejecting any compromised password.
* **FR-221:** The system must rate-limit login and MFA verification attempts per IP and per account identifier (`SEC-04`) and apply adaptive temporary lockouts (`SEC-05`) upon repeated failed attempts, while avoiding permanent account lockouts to prevent denial-of-service against legitimate users.
* **FR-222:** The system must enforce **mandatory Multi-Factor Authentication (`MFA`, `SEC-06`)** for all users holding the **Platform Admin (`F-05`)**, **Institutional Admin (`F-14`)**, or **Project Coordinator (`F-14`, `F-15`)** roles (and support optional MFA for Supervisors, Examiners, and Students, subject to `OD-11` / `NFR-OPEN-10`). Users in mandatory-MFA roles must complete MFA setup and verification before accessing protected administrative or coordinator functionality.
* **FR-223:** The system must provide a self-service email-based password recovery workflow (`SEC-08`, `F-71`) using time-limited, single-use recovery tokens, and allow an Institutional Admin (`F-13`, `FR-044`) to trigger recovery or clear temporary lockouts for users within their institution.
* **FR-224:** All authentication secrets, password hashes, and MFA seeds must be stored using strong cryptographic hashing/encryption (`SEC-18`, `SEC-20`) and never exposed in logs or API responses.

### D. User Interaction and Behaviour

* **Access:** Public Login, Account Activation, MFA Verification, and Password Reset views on the responsive web application.
* **Information Viewed:** Login form (Email / Institutional ID + Password), MFA enrollment QR/secret & TOTP verification code input (for mandatory/enrolled MFA users), Password strength & $12\text{-character}$ / breach-check indicator, and Password Recovery request form.
* **Actions Performed:** Log In, Complete MFA Enrollment, Verify MFA Code, Request Password Reset Email, Set New Password.
* **Validations:** Password length $\ge 12$ chars (`SEC-02`); Password not in compromised list (`SEC-03`); Valid 6-digit MFA code; Account and Institution must be `Active` (`F-01`, `F-13`).
* **Post-Action Behaviour (Success):** Establishes an authenticated session (`F-65`) and routes the user to their role-appropriate workspace.
* **Post-Action Behaviour (Failure):** Generic credential failure message (preventing user enumeration), rate-limit/temporary lockout cooldown notice (`SEC-04`, `SEC-05`), and security event logged (`F-82`).
* **States:** Unauthenticated state, MFA Setup Required state, MFA Challenge state, Temporary Lockout cooldown state, Authenticated state.

### E. Business Rules

* **SEC-01 to SEC-08:** Mandatory authentication, $\ge 12\text{-char}$ passwords, compromised-password screening, rate limiting, adaptive temporary lockouts (no permanent lockouts), mandatory MFA for Platform Admins, Institutional Admins, and Project Coordinators, and email-based password recovery.

### F. Permissions and Access Control

* **Public / Unauthenticated Users:** Can access only Login, Account Activation (via valid token), and Password Recovery initiation endpoints.
* **Institutional Admin:** Can trigger password reset emails or clear temporary lockouts strictly for users within their own institution (`F-13`, `SEC-08`).

### G. Data Requirements

* **Captured/Protected:** User ID (`F-05`, `F-13`), Email, Password Hash (`SEC-20`), MFA Enrolled Flag, Encrypted MFA Secret & Recovery Codes, Failed Login Attempt Counter, Temporary Lockout Until Timestamp, Password Reset Token Hash & Expiry, Last Authenticated Timestamp.

### H. Dependencies and Integrations

* **Required Features:** `F-01`, `F-05`, `F-13`, `F-14`, `F-65`, `F-66`, `F-71`, `F-82`.
* **Consumed By:** All protected Clario features (`F-01`–`F-83`).

### I. Acceptance Criteria

* **AC-F64-01 (Positive — Password Policy & Compromised Password Screening):** Given a user activating their Clario account, When they enter a password of $10$ characters OR a $12\text{-character}$ password found on the compromised-password list (e.g., `Password1234!`), Then the system rejects the password (`SEC-02`, `SEC-03`); When they enter a unique $14\text{-character}$ non-compromised password, the system accepts it.
* **AC-F64-02 (Security — Mandatory MFA Enforcement for Admin & Coordinator Roles):** Given a user holding the `Platform Admin`, `Institutional Admin`, or `Project Coordinator` role, When they authenticate with a valid password, Then the system blocks access to protected routes until they complete MFA verification (`SEC-06`).
* **AC-F64-03 (Security — Rate Limiting & Temporary Lockout Without Permanent Lockout):** Given a user account subjected to repeated consecutive failed login attempts exceeding the rate-limit threshold, When another login attempt is made during the cooldown window, Then the system temporarily blocks login (`SEC-04`, `SEC-05`), logs a security event (`F-82`), and automatically restores login eligibility after the temporary lockout window expires (or when cleared by an Institutional Admin `SEC-08`).

---

## F-65: Session Management

### A. Feature Identification

* **Feature ID:** F-65
* **Feature Name:** Session Management
* **Feature Category:** Authentication, Security & Access Control (Supporting System Capability)
* **Primary Actor:** Authentication Service (Supporting System Actor)
* **Supporting Actors:** All Human Actors, Access Control Service (`F-66`)
* **MVP Priority:** P0
* **Source User Stories:** SYS-02
* **Short Feature Description:** Manages authenticated user sessions, active role/programme contexts, configurable role-based inactivity timeouts (`SEC-07`), explicit logout, and immediate server-side session revocation upon user deactivation (`F-13`), role revocation (`F-14`), or institutional suspension (`F-01`).

### B. Business Purpose

* **Problem Solved:** Unmanaged or non-expiring sessions on shared university computers or personal devices expose accounts to session hijacking and allow deactivated users or suspended tenants to continue operating.
* **Necessity for Clario:** Implements `SYS-02` and `SEC-07`.
* **Business/Academic Value:** Ensures sessions remain bound to valid, active user and tenant states and automatically expire after role-appropriate inactivity periods.
* **Impact if Omitted:** Deactivated users (`F-13`) or suspended institutions (`F-01`) would retain active access until their browser was closed.

### C. Functional Requirements

* **FR-225:** Upon successful authentication (`F-64`), the system must issue a cryptographically secure, server-verifiable session binding the User ID, Institution ID (`F-01`), MFA verification state (`SEC-06`), active Role context (`F-14`), and (for Project Coordinators) active Programme and Academic Session appointment scope (`F-15`, `BR-03`).
* **FR-226:** The system must enforce configurable **role-based session inactivity timeouts (`SEC-07`)** (e.g., shorter inactivity timeouts for `Platform Admin`, `Institutional Admin`, and `Project Coordinator` roles vs. `Supervisor`, `Examiner`, and `Student` roles, configurable per `OD-12` / `NFR-OPEN-01`), automatically invalidating sessions that exceed their inactivity threshold.
* **FR-227:** The system must immediately invalidate and revoke all active sessions for a user on the server whenever:
  1. The user explicitly logs out.
  2. The user's account is deactivated (`F-05`, `F-13`).
  3. The user's password is changed or reset (`F-64`).
  4. The user's institution is suspended (`F-01`).
  5. The user's role or Coordinator appointment is revoked (`F-14`, `F-15` — revoking or downgrading the affected role/scope context immediately).
* **FR-228:** When a session expires while a Student, Supervisor, or Examiner is composing draft notes or uploading a file on the responsive web client, the client must preserve any unsaved local draft (`NFR-USA: Offline behaviour`) so work is not lost upon re-authentication.

### D. User Interaction and Behaviour

* **Access:** Managed transparently across all authenticated requests; user-facing controls in the top navigation bar (Active Role/Scope Switcher, Session Timeout Warning modal, and "Log Out" button).
* **Information Viewed:** Current logged-in User Name, Institution Name, Active Role badge, Active Coordinator Programme & Session switcher (if user holds multiple appointments in `F-15`), and a 2-minute countdown modal before inactivity timeout expires ("Your session will expire in 2 minutes due to inactivity — Stay Logged In / Log Out").
* **Actions Performed:** Switch Active Role / Coordinator Scope Context, Extend Active Session, Log Out.
* **Validations:** Every API request validates session signature/token, server revocation status, inactivity timestamp, and tenant active status.
* **Post-Action Behaviour:** Logout or timeout clears session credentials and redirects to Login (`F-64`).
* **States:** Active session, Expiring-soon warning state, Expired/Revoked session state.

### E. Business Rules

* **BR-01, BR-02 & BR-03:** Every session is strictly bound to one Institution and the user's authorised role/programme/session scope.
* **SEC-07:** Session inactivity timeouts must be configurable according to user role (`OD-12` / `NFR-OPEN-01`).

### F. Permissions and Access Control

* **All Authenticated Actors:** Can view their own session context, switch between their own authorised roles/appointments, and log out of their own session.
* **Platform Admin / Institutional Admin:** Indirectly revoke user sessions by deactivating users (`F-05`, `F-13`) or suspending an institution (`F-01`).

### G. Data Requirements

* **Captured:** Session ID, User ID, Institution ID (`F-01`), Active Role Code (`F-14`), Active Coordinator Appointment ID (`F-15`, nullable), MFA Verified Boolean, Created Timestamp, Last Activity Timestamp, Expires At Timestamp, Revoked Flag & Revocation Reason.

### H. Dependencies and Integrations

* **Required Features:** `F-01`, `F-05`, `F-13`, `F-14`, `F-15`, `F-64`, `F-66`.

### I. Acceptance Criteria

* **AC-F65-01 (Positive — Role-Based Inactivity Timeout):** Given a Project Coordinator session configured with an inactivity timeout threshold (`SEC-07`), When the Coordinator performs no interactive activity for longer than the configured timeout duration, Then the server invalidates the session and any subsequent request requires re-authentication (`F-64`).
* **AC-F65-02 (Security — Immediate Session Termination on User Deactivation or Tenant Suspension):** Given User X has an active logged-in session in Institution A, When the Institutional Admin deactivates User X (`F-13`) OR the Platform Admin suspends Institution A (`F-01`), Then User X's next interactive request is immediately rejected and the session is terminated.

---

## F-66: Role and Scope-Based Access Control

### A. Feature Identification

* **Feature ID:** F-66
* **Feature Name:** Role and Scope-Based Access Control
* **Feature Category:** Authentication, Security & Access Control (Supporting System Capability)
* **Primary Actor:** Access Control Service (Supporting System Actor)
* **Supporting Actors:** All Human and Automated Actors, Audit Process (`F-82`)
* **MVP Priority:** P0
* **Source User Stories:** SYS-03
* **Short Feature Description:** Centrally enforces multi-tenant institutional isolation (`SEC-09`), role-based permissions (`F-14`), and fine-grained programme, academic session, project, group, and assignment boundaries (`SEC-10`–`SEC-16`, `BR-01`–`BR-03`) on every user interface route, business operation, and data query.

### B. Business Purpose

* **Problem Solved:** Role-Based Access Control (`RBAC`) alone is insufficient in an academic SaaS platform: knowing a user is a "Supervisor" or "Examiner" or "Coordinator" does not mean they can access *all* projects in the university. Access must be simultaneously constrained by **Tenant + Role + Programme/Session Scope + Project/Group Assignment + Workflow State**.
* **Necessity for Clario:** Implements `SYS-03`, `BR-01`–`BR-03`, `BR-08`, `BR-16`, `BR-25`, and `SEC-09`–`SEC-16`.
* **Business/Academic Value:** Guarantees zero cross-tenant data leakage and enforces strict academic confidentiality across all six human actor types.
* **Impact if Omitted:** Users could manipulate URLs or request payloads (Insecure Direct Object References — `IDOR`) to view or modify other institutions', programmes', or students' records.

### C. Functional Requirements

* **FR-229:** Every data query, mutation, and document retrieval operation in Clario must enforce **Mandatory Tenant Isolation (`BR-01`, `SEC-09`)**, verifying that the target record's `Institution ID` matches the authenticated actor's `Institution ID`.
* **FR-230:** In addition to tenant isolation and role verification (`F-14`), the authorization engine must enforce **Scope and Assignment Isolation (`BR-02`, `SEC-10`)** for each actor:
  1. **Platform Admin:** Platform-level tenant, plan, and subscription administration (`F-01`–`F-05`); denied default access to confidential institutional academic records (`F-08`, `SEC-15`, `SEC-16`).
  2. **Institutional Admin:** Scoped strictly to their single `Institution ID` for academic structure (`F-09`–`F-12`), user/role management (`F-13`–`F-16`), and institutional billing (`F-03`); strictly denied access to confidential project documents, feedback, discussions, and grades (`F-18`, `BR-25`, `SEC-14`).
  3. **Project Coordinator:** Scoped strictly to the single `Programme ID` and single `Academic Session ID` of their active Coordinator Appointment (`F-15`, `BR-03`); denied intervention in routine Supervisor–Student submission discussions (`BR-26`).
  4. **Project Supervisor:** Scoped strictly to Individual and Group Projects where they hold an `Active` Supervision Assignment (`F-24`, `F-27`, `SEC-12`); denied examination access to any project they currently or previously supervised (`F-48`, `BR-16`) and denied visibility into Examiner scores (`BR-17`).
  5. **Student:** Scoped strictly to their own Individual Project or their assigned Shared Group Workspace (`F-21`, `F-22`, `F-36`, `SEC-11`); formal group submissions restricted strictly to Designated Group Submitters (`F-23`, `BR-08`); private individual performance grades/results isolated from other group members (`FR-121`).
  6. **Project Examiner:** Scoped strictly to projects where they hold an `Active` Examiner Appointment (`F-46`, `F-48`, `SEC-13`); restricted to read-only access on final examination materials (`F-50`) and read/write on their own independent assessment sheet prior to result publication (`F-52`–`F-55`, `BR-17`, `BR-21`).
* **FR-231:** Any unauthorized access attempt (`403 Forbidden`) across tenant, programme, or project boundaries must be blocked before any data is returned and logged as a security event in `F-82`.

### D. User Interaction and Behaviour

* **Access:** Enforced transparently on all UI navigation elements, route guards, API endpoints, and file downloads (`F-77`).
* **Information Viewed:** Actors only see navigation items, lists, and action buttons permitted by their active role and assignment scope.
* **Post-Action Behaviour (Failure / Unauthorized Attempt):** Returns a standardized `403 Forbidden` access-denied response without leaking the existence or contents of out-of-scope records, and writes a security audit log entry (`F-82`).

### E. Business Rules

* **BR-01:** Every institution operates within its own institutional boundary (`SEC-09`).
* **BR-02:** Users can only access information within their authorised scope (`SEC-10`–`SEC-13`).
* **BR-03:** A Coordinator manages one programme and one academic session per assignment.
* **BR-08, BR-16, BR-17, BR-25, BR-26:** Enforced at the authorization layer.

### F. Permissions and Access Control

* **System Access Control Engine (`F-66`):** Authoritative policy enforcement point (`PEP`) for the entire Clario platform.

### G. Data Requirements

* **Evaluated Context:** Actor User ID, Actor `Institution ID`, Active Role (`F-14`), Active Coordinator (`Programme ID`, `Academic Session ID`) (`F-15`), Active Supervision `Project IDs` (`F-24`, `F-27`), Active Student `Project ID` / `Group ID` / `is_designated_submitter` (`F-19`, `F-22`, `F-23`), Active Examiner `Project IDs` (`F-46`), Resource `Institution ID`, Resource `Programme ID`, Resource `Session ID`, Resource `Project ID`, and Subscription Access State (`F-70`).

### H. Dependencies and Integrations

* **Required Features:** `F-01`, `F-08`, `F-14`, `F-15`, `F-18`, `F-21`–`F-24`, `F-27`, `F-46`, `F-48`, `F-64`, `F-65`, `F-70`, `F-82`.
* **Consumed By:** All features (`F-01`–`F-83`).

### I. Acceptance Criteria

* **AC-F66-01 (Multi-Tenant Isolation — Zero Cross-Tenant Access):** Given any authenticated user (Admin, Coordinator, Supervisor, Examiner, or Student) belonging to Institution A, When they attempt to query, view, or mutate any record belonging to Institution B by supplying Institution B's record ID, Then `F-66` blocks the request with `403 Forbidden` and logs the attempt (`SEC-09`, `BR-01`).
* **AC-F66-02 (In-Tenant Scope Isolation — Supervisor, Examiner, Coordinator & Student):** Given within Institution A, Supervisor 1 is assigned to Project 1 (not Project 2), Examiner 1 is assigned to Project 2 (not Project 1), Student 1 owns Project 1, and Coordinator 1 is appointed to Programme A (not Programme B), When any of these actors attempts to access a project or programme outside their specific assignment scope, Then `F-66` blocks the request with `403 Forbidden` (`SEC-10`–`SEC-13`, `BR-02`, `BR-03`).

---

# Module L: Subscription Payment Processing

*(Note: All subscription payments in Clario are strictly institutional SaaS payments in `NGN` (`BR-29`). Student project payments are excluded from Clario (`mvp-p.md` §10). Because the specific payment gateway provider is tracked under Open Decision `OD-09`, `F-67`–`F-69` specify provider-agnostic gateway integration contracts).*

## F-67: Institutional Subscription Payment Processing

### A. Feature Identification

* **Feature ID:** F-67
* **Feature Name:** Institutional Subscription Payment Processing
* **Feature Category:** Subscription Payment Processing (Supporting System Capability & Checkout Integration)
* **Primary Actor:** Payment Gateway & Clario Subscription Service (Supporting System Actors)
* **Supporting Actors:** Institutional Admin (`PROP-02` — initiates payment in `F-03`), Platform Admin (`F-03`), Audit Process (`F-82`)
* **MVP Priority:** P0
* **Source User Stories:** SYS-04
* **Short Feature Description:** Initiates and processes institutional SaaS subscription payments and renewals in Nigerian Naira (`NGN`) through an integrated payment gateway (`SYS-04`), enforcing exact integer minor-unit (kobo) monetary representation and idempotent transaction references (`DAT-07`, `DAT-09`).

### B. Business Purpose

* **Problem Solved:** Tertiary institutions need a reliable, automated way to pay for their initial Clario subscription and subsequent renewals online in `NGN` without manual bank-teller reconciliation delays.
* **Necessity for Clario:** Implements `SYS-04`, `BR-29`, and `mvp-p.md` §2.3 ("Institutional subscriptions use automated payment gateway integration").
* **Business/Academic Value:** Automates SaaS revenue collection and links payment initiation directly to verified subscription activation (`F-68`, `F-69`).
* **Impact if Omitted:** Institutional subscriptions could not be paid for or renewed automatically.

### C. Functional Requirements

* **FR-232:** When an Institutional Admin selects an `Active` subscription plan and initiates payment or renewal (`F-03`, `FR-013`), the Clario Subscription Service must generate a globally unique, idempotent `Payment Transaction Reference`, record the transaction in status `Pending` with the exact plan amount in `NGN` minor units (kobo, integer representation per `NFR-DOM: Subscription currency`), and initialize a checkout session with the configured external Payment Gateway (`SYS-04`).
* **FR-233:** The system must prevent creating duplicate concurrent `Pending` checkout sessions for the exact same invoice/renewal request if a user double-clicks "Pay Now" (`DAT-07`, `DAT-09`).
* **FR-234:** Upon completion or cancellation of the payment gateway checkout flow, the system must return the Institutional Admin to the Institutional Billing view (`F-03`) displaying the current transaction status (`Pending Verification`, `Paid / Verified`, or `Payment Failed — Retry Available`).
* **FR-235:** **Crucial Payment Integrity Rule (`DAT-10`):** A client-side browser redirect from the payment gateway must **never** by itself mark a subscription as `Active` or `Paid`; subscription status changes must occur only after server-side webhook verification (`F-68`) or authenticated server-to-server gateway verification API call (`F-69`).

### D. User Interaction and Behaviour

* **Access:** Triggered by Institutional Admin from "Institution Settings -> Subscription & Billing -> Pay / Renew Subscription" (`F-03`).
* **Information Viewed:** Checkout summary (Institution Name, Selected Plan Name, Billing Interval, Exact Amount in `NGN`, Unique Transaction Reference), Gateway Checkout interface, and Post-Checkout Status page.
* **Actions Performed:** Initiate Payment, Complete Gateway Checkout, Retry Failed Payment.
* **Validations:** Institution must exist (`F-01`); Selected Plan must be `Active` (`F-02`); Amount must be $> 0$ in integer kobo (`NFR-DOM`).
* **Post-Action Behaviour:** Transaction logged in `F-03` and `F-82`; awaits verified webhook (`F-68`) / server verification (`F-69`).
* **States:** Initializing Checkout, Redirected to Payment Gateway, Awaiting Server Verification, Payment Confirmed, Payment Failed / Cancelled.

### E. Business Rules

* **BR-29:** Subscription payments are strictly institutional SaaS payments in `NGN`, never student project payments.
* **DAT-07, DAT-09 & DAT-10:** Payments must be processed consistently and uniquely; payment events must be verified on the server before subscription status is changed.
* **Open Decision Reference (`OD-09`):** Specific payment gateway provider selection and finance reconciliation procedures are tracked in `mvp-open-decisions.md`.

### F. Permissions and Access Control

* **Institutional Admin:** Authorised to initiate subscription payments strictly for their own institution (`F-03`, `PROP-02`).
* **Platform Admin:** Read access to all payment transaction records across institutions (`F-03`).
* **Students / Supervisors / Examiners / Coordinators:** No access (`BR-29`).

### G. Data Requirements

* **Captured:** Payment Transaction ID, Unique Idempotency Reference, Institution ID (`F-01`), Subscription ID (`F-03`), Plan ID (`F-02`), Currency (`NGN`), Amount in Kobo (integer), Gateway Provider Identifier (`OD-09`), Gateway Checkout Session ID, Transaction Status (`INITIATED`, `PENDING_VERIFICATION`, `SUCCEEDED`, `FAILED`, `ABANDONED`), Initiated By User ID, Initiated Timestamp, Verified Timestamp (nullable), Failure Reason (nullable).

### H. Dependencies and Integrations

* **Required Features:** `F-01`, `F-02`, `F-03`, `F-68`, `F-69`, `F-82`.
* **External Integration:** External Payment Gateway API (`OD-09`).

### I. Acceptance Criteria

* **AC-F67-01 (Positive — Payment Initiation in Exact NGN Minor Units):** Given an Institutional Admin selects an Annual Plan priced at `NGN 2,500,000.00`, When they initiate payment (`SYS-04`), Then the system creates a `PENDING_VERIFICATION` transaction record with a unique reference and amount `250000000` kobo, logs the initiation in `F-82`, and launches the payment gateway checkout.
* **AC-F67-02 (Security — Unverified Browser Redirect Does Not Activate Subscription):** Given a `PENDING_VERIFICATION` payment transaction, When a user manually navigates to or spoofs the post-checkout success callback URL without a verified server webhook (`F-68`) or server-to-server verification (`F-69`), Then the subscription status remains unchanged (`DAT-10`).

---

## F-68: Payment Event Reception

### A. Feature Identification

* **Feature ID:** F-68
* **Feature Name:** Payment Event Reception
* **Feature Category:** Subscription Payment Processing (Supporting System Capability)
* **Primary Actor:** Payment Event / Webhook Sender & Clario Webhook Receiver (Supporting System Actors)
* **Supporting Actors:** Subscription Status Synchronisation Service (`F-69`), Audit Process (`F-82`)
* **MVP Priority:** P0
* **Source User Stories:** SYS-05
* **Short Feature Description:** Receives asynchronous payment status webhook events from the external payment gateway (`SYS-05`), verifies cryptographic webhook signatures (`DAT-10`), enforces idempotent duplicate-event protection (`DAT-08`), and queues verified events for subscription status synchronisation (`F-69`).

### B. Business Purpose

* **Problem Solved:** Online payments in Nigeria (bank transfers, cards, USSD, institutional mandates) often settle asynchronously after the user closes their browser. A secure, idempotent webhook receiver is essential to capture payment outcomes reliably and prevent spoofed or duplicate webhook attacks.
* **Necessity for Clario:** Implements `SYS-05`, `DAT-08`, `DAT-09`, and `DAT-10`.
* **Business/Academic Value:** Ensures every legitimate payment settlement or failure is captured and verified automatically while rejecting forged webhook requests.
* **Impact if Omitted:** Asynchronous payment completions would never reach Clario, leaving paying institutions locked out.

### C. Functional Requirements

* **FR-236:** The system must expose a dedicated HTTPS webhook endpoint to receive payment status events (`payment.succeeded`, `payment.failed`, etc.) from the configured Payment Gateway (`SYS-05`).
* **FR-237:** Upon receiving any incoming webhook request, the system must immediately validate the **cryptographic webhook signature/HMAC** against the payment provider's secret key (`DAT-10`) before parsing or acting on the payload:
  1. If the signature is missing or invalid, the system must reject the request with `401/400`, log a security alert (`F-82`, `NFR-MON`), and perform zero state changes.
* **FR-238:** For every cryptographically verified webhook event, the system must enforce **idempotent deduplication (`DAT-08`, `DAT-09`)** using the provider's unique `Event ID` and `Payment Transaction Reference`:
  1. If the `Event ID` (or a terminal success state for that `Payment Transaction Reference`) has already been processed, the system must safely acknowledge receipt (`200 OK`) and ignore the duplicate event without re-extending the subscription or double-counting the payment.
* **FR-239:** Verified, non-duplicate payment events must be persisted in an immutable Webhook Event Log and passed atomically to `F-69` (Subscription Status Synchronisation).

### D. User Interaction and Behaviour

* **Access:** Machine-to-machine HTTPS webhook endpoint invoked by the Payment Event/Webhook Sender (`actors.md` §2).
* **Validations:** TLS/HTTPS required (`SEC-17`); valid cryptographic signature header required (`DAT-10`); valid JSON payload containing known `Payment Transaction Reference` and `Event ID`.
* **Post-Action Behaviour:** Returns HTTP `200 OK` on valid receipt; triggers `F-69`; alerts operational monitoring (`NFR-MON`) if signature verification fails or if a webhook processing error occurs.

### E. Business Rules

* **DAT-08:** Duplicate payment notifications must not result in duplicate payment processing.
* **DAT-09:** Each unique payment must be processed only once.
* **DAT-10:** Payment events must be verified before subscription status is changed.

### F. Permissions and Access Control

* **External Payment Webhook Sender:** Authorised solely via cryptographic webhook signature verification (`DAT-10`).
* **Platform Admin:** Read-only access to webhook event logs for payment reconciliation and monitoring (`NFR-MON`).

### G. Data Requirements

* **Captured:** Webhook Event Log ID, Gateway Event ID (unique constraint), Payment Transaction Reference (`F-67`), Event Type, Signature Verification Status (`VERIFIED`, `REJECTED_INVALID_SIGNATURE`), Raw Payload Hash/Snapshot, Processing Status (`RECEIVED`, `PROCESSED`, `DUPLICATE_IGNORED`, `FAILED`), Received Timestamp, Processed Timestamp.

### H. Dependencies and Integrations

* **Required Features:** `F-67`, `F-69`, `F-82`.
* **External Integration:** Payment Gateway Webhook Sender (`OD-09`).

### I. Acceptance Criteria

* **AC-F68-01 (Security — Reject Forged Webhook Signature):** Given an incoming HTTP POST to the payment webhook endpoint with a forged or invalid cryptographic signature header, When `F-68` evaluates the request, Then the system rejects the event with `401 Unauthorized`, logs a security event (`F-82`), and does not invoke `F-69` (`DAT-10`).
* **AC-F68-02 (Idempotency — Duplicate Webhook Delivery Ignored):** Given a verified `payment.succeeded` webhook with `Event ID = EVT_991` for transaction `TX_100` has already been processed and extended the subscription by $1\text{ year}$, When the payment gateway delivers the exact same webhook (`EVT_991` or a second `payment.succeeded` for `TX_100`) a second and third time, Then the system returns `200 OK`, marks the delivery `DUPLICATE_IGNORED`, and does **not** extend the subscription a second time or create duplicate payment records (`DAT-08`, `DAT-09`).

---

## F-69: Subscription Status Synchronisation

### A. Feature Identification

* **Feature ID:** F-69
* **Feature Name:** Subscription Status Synchronisation
* **Feature Category:** Subscription Payment Processing (Supporting System Capability)
* **Primary Actor:** Clario Subscription Service (Supporting System Actor)
* **Supporting Actors:** Payment Event Reception (`F-68`), Subscription Access Enforcement (`F-70`), Notification Services (`F-71`–`F-73`), Audit Process (`F-82`)
* **MVP Priority:** P0
* **Source User Stories:** SYS-06
* **Short Feature Description:** Processes verified payment events (`F-68`) to atomically update institutional payment records and synchronize institutional subscription statuses (`Active`, `Grace Period`, `Expired`), validity dates, and access permissions (`F-70`).

### B. Business Purpose

* **Problem Solved:** Once a payment is verified, the institution's subscription status, validity period, user capacity ceiling, and access permissions must be updated immediately and consistently without manual intervention by a Platform Admin.
* **Necessity for Clario:** Implements `SYS-06` and `DAT-11` ("Subscription status must remain consistent with verified payment information").
* **Business/Academic Value:** Enables instant automated activation or restoration of institutional access upon verified renewal payment.
* **Impact if Omitted:** Verified payments would not activate or renew institutional subscriptions.

### C. Functional Requirements

* **FR-240:** Upon receiving a verified `payment.succeeded` event from `F-68` (and verifying that the paid amount in kobo and currency `NGN` match the expected invoice amount in `F-67`), the system must atomically in a single transaction:
  1. Mark the Payment Transaction (`F-67`) and Invoice (`F-03`) as `Paid / Succeeded`.
  2. Transition the Institution's Subscription Status (`F-03`) to `Active`.
  3. Update the subscription validity period:
     * If renewing an currently `Active` subscription before expiry, extend `Current Period End Timestamp` by the plan's billing duration starting from the existing `Current Period End Timestamp`.
     * If activating a `Pending Payment` or `Expired` subscription (or post-expiry renewal), set `Current Period Start Timestamp = Verified Payment Timestamp` and `Current Period End Timestamp = Start + Plan Billing Duration` (and clear any `Grace Period` / `Expired` restriction flags in `F-70`).
  4. Record an administrative/financial audit log entry (`F-82`, `NFR-AUD`).
  5. Dispatch payment confirmation and subscription activation notifications (`F-71`, `F-72`) to the Institutional Admin and Platform Admin.
* **FR-241:** Upon receiving a verified `payment.failed` event from `F-68`, the system must mark the Payment Transaction (`F-67`) as `Failed` with the gateway failure reason, retain the subscription's existing status (`Pending Payment`, `Active`, `Grace Period`, or `Expired`), log the event in `F-82`, and notify the Institutional Admin (`F-71`, `F-72`) with a link to retry payment (`F-03`).
* **FR-242:** If a verified payment event carries an amount mismatch (e.g., paid amount $<$ invoiced plan amount), the system must flag the transaction as `Payment Discrepancy — Requires Reconciliation`, trigger an operational payment alert (`NFR-MON`), and block automatic activation until reconciled (`OD-09`).

### D. User Interaction and Behaviour

* **Access:** Automated background/event-driven service; resulting state is immediately visible in `F-03` (Institutional Admin and Platform Admin billing views).
* **Post-Action Behaviour:** Subscription status badge in `F-03` updates to `Active`, any `F-70` access restrictions lift immediately, and receipt email (`F-71`) is sent.

### E. Business Rules

* **DAT-10 & DAT-11:** Subscription status is updated only from verified payment events and must remain strictly consistent with verified payment information.
* **NFR-AUD:** Subscription status changes and payment verifications are logged in `F-82`.

### F. Permissions and Access Control

* **Clario Subscription Service:** Sole automated authority to synchronize subscription status from verified payment events; Platform Admin can view synchronization state and reconciliation alerts (`F-03`).

### G. Data Requirements

* **Updated Records:** Payment Transaction Status (`F-67`), Invoice Status (`F-03`), Institutional Subscription Status (`F-03`), `Current Period Start Timestamp`, `Current Period End Timestamp`, `Grace Period End Timestamp` (`F-04`), Audit Log Entry (`F-82`).

### H. Dependencies and Integrations

* **Required Features:** `F-02`, `F-03`, `F-04`, `F-67`, `F-68`, `F-70`, `F-71`, `F-72`, `F-82`.

### I. Acceptance Criteria

* **AC-F69-01 (Positive — Verified Payment Activates/Renews Subscription & Lifts Restrictions):** Given Institution A's subscription is in `Grace Period` (or `Expired`) and Institutional Admin completes a verified `NGN` renewal payment (`F-67`, `F-68`), When `F-69` processes the verified event, Then the transaction is marked `Succeeded`, Institution A's subscription status transitions atomically to `Active` with the new period end date, all `F-70` access restrictions are immediately lifted, an audit record is written (`F-82`), and confirmation emails are sent (`F-71`).
* **AC-F69-02 (Exception — Payment Failure Preserves Current State & Alerts Admin):** Given Institution A initiates a renewal payment that fails at the gateway, When `F-69` processes the verified `payment.failed` event, Then the transaction is marked `Failed`, the subscription's existing expiry/grace-period state is not corrupted, and the Institutional Admin receives a payment-failure notification (`F-71`, `F-72`).

---

## F-70: Subscription Access Enforcement

### A. Feature Identification

* **Feature ID:** F-70
* **Feature Name:** Subscription Access Enforcement
* **Feature Category:** Subscription Payment Processing & Access Control (Supporting System Capability)
* **Primary Actor:** Clario Subscription Service & Access Control Service (`F-66`)
* **Supporting Actors:** Scheduler Service (`actors.md` §2), Institutional Admin, Platform Admin, Notification Services (`F-71`, `F-72`), Audit Process (`F-82`)
* **MVP Priority:** P0
* **Source User Stories:** SYS-07
* **Short Feature Description:** Continuously evaluates institutional subscription expiry and grace-period timestamps (`F-03`, `F-04`) and enforces configured grace-period warnings and post-expiry access restrictions across the institution (`SYS-07`) until a verified renewal payment (`F-69`) is completed.

### B. Business Purpose

* **Problem Solved:** As a commercial multi-tenant SaaS platform, Clario must automatically enforce subscription terms when an institution's subscription expires and its configured grace period (`F-04`) elapses, while ensuring the Institutional Admin can still log in to pay and renew (`F-03`, `F-67`).
* **Necessity for Clario:** Implements `SYS-07` and connects `F-04` (Grace Period Management) and `F-69` (Subscription Status Synchronisation) to `F-66` (Access Control).
* **Business/Academic Value:** Protects SaaS recurring revenue while providing predictable, policy-driven grace periods (`F-04`) and zero data loss during expiry.
* **Impact if Omitted:** Institutions with expired subscriptions could continue using the platform indefinitely without renewing.

### C. Functional Requirements

* **FR-243:** A scheduled background evaluation and real-time request guard (`F-66`) must monitor every institution's subscription `Current Period End Timestamp` and `Grace Period End Timestamp` (`F-03`, `F-04`) in the institution's configured timezone:
  1. **Transition to `Grace Period`:** When `Current Time > Current Period End Timestamp` and `Current Time <= Grace Period End Timestamp` (where configured Grace Period Days $> 0$), the system transitions the subscription to `Grace Period`, logs the transition in `F-82`, displays a persistent warning banner to Institutional Admins (and Coordinators), and enforces the configured **Grace Period Permission Policy (`OD-06` / `GAP-10`)**.
  2. **Transition to `Expired (Restricted)`:** When `Current Time > Grace Period End Timestamp`, the system transitions the subscription to `Expired`, logs the transition in `F-82`, dispatches urgent expiry notifications (`F-71`, `F-72`) to the Institutional Admin and Platform Admin, and enforces the configured **Post-Expiry Access Restriction Policy (`OD-06` / `GAP-10`)**.
* **FR-244:** Regardless of the restriction level configured under `OD-06` (`GAP-10`), when an institution is in `Grace Period` or `Expired` status:
  1. The **Institutional Admin** must always retain authenticated access to `F-03` and `F-67` (Subscription & Billing Portal) so they can select a plan and complete a renewal payment to restore full service, as well as data export access (`FR-006`).
  2. **All institutional academic and administrative data, documents (`F-76`–`F-78`), and audit logs (`F-82`) must remain 100% preserved and intact** (`NFR-BKP`).
* **FR-245:** Because the exact operations permitted during `Grace Period` vs. after `Expired` restrictions begin is an explicit Open Decision (`OD-06` / `GAP-10`), `F-70` must evaluate permissions against the configurable policy matrix (`FR-017`) — e.g., allowing full academic operations with warning banners during `Grace Period`, and restricting new write/submission/creation actions (or non-billing access) once `Expired` — without requiring code changes once `OD-06` is finalized.

### D. User Interaction and Behaviour

* **Access:** Automatically enforced across all institutional user sessions via `F-66`.
* **Information Viewed:**
  * *During `Grace Period`:* Institutional Admin sees a prominent top banner: *"Your institutional subscription expired on \[Date\]. You are in a \[X\]-day grace period ending on \[Grace End Date\]. Renew now to avoid service restrictions."*
  * *When `Expired` (Restricted):* Restricted actions display a clear, non-technical message: *"Institutional Subscription Expired — This operation is currently restricted. Please contact your Institutional Administrator to renew the institution's Clario subscription."* Institutional Admins are directed straight to the Subscription & Billing renewal page (`F-03`).

### E. Business Rules

* **SYS-07:** Clario must enforce configured grace periods and subsequent access restrictions when institutional subscriptions expire.
* **Open Decision Reference (`OD-06` / `GAP-10`):** Precise permissions available to each role during the grace period and after restrictions begin are tracked in `mvp-open-decisions.md`.

### F. Permissions and Access Control

* **Clario Subscription & Access Control Services (`F-66`, `F-70`):** Automatically enforce subscription state rules across all actors of the affected tenant.

### G. Data Requirements

* **Evaluated Fields:** Institution ID (`F-01`), Subscription Status (`F-03`), `Current Period End Timestamp`, `Grace Period End Timestamp` (`F-04`), Grace Period & Post-Expiry Permission Matrix (`FR-017`, `OD-06`).

### H. Dependencies and Integrations

* **Required Features:** `F-03`, `F-04`, `F-66`, `F-67`, `F-69`, `F-71`, `F-72`, `F-82`.

### I. Acceptance Criteria

* **AC-F70-01 (Positive — Grace Period Transition & Warning Enforcement):** Given Institution A's subscription period ends at `2026-11-30 23:59:59 WAT` and has a $14\text{-day}$ grace period (`F-04`), When the clock passes `2026-11-30 23:59:59 WAT`, Then `F-70` transitions the subscription to `Grace Period`, logs the transition in `F-82`, notifies the Institutional Admin (`F-71`, `F-72`), and applies the configured Grace Period permission policy (`OD-06`).
* **AC-F70-02 (Positive — Post-Grace Period Access Restriction & Billing Access Preservation):** Given Institution A's $14\text{-day}$ grace period expires at `2026-12-14 23:59:59 WAT` without a verified payment, When a user in Institution A attempts a restricted academic write operation, Then `F-70` blocks the operation with a subscription-expired message, while the Institutional Admin retains full access to `F-03`/`F-67` to complete a renewal payment and restore access.

---

# Module M: Notification and Communication Infrastructure

*(Scope Rule: Confirmed MVP notification channels are strictly **In-App Notifications** and **Email Notifications** (`mvp-p.md` §4, §10; `NFR-DOM: Notifications`). Push notifications and SMS are excluded from the MVP. Furthermore, notification delivery failure must **never** invalidate or roll back the underlying academic or administrative operation).*

## F-71: Transactional Email Delivery

### A. Feature Identification

* **Feature ID:** F-71
* **Feature Name:** Transactional Email Delivery
* **Feature Category:** Notification & Communication Infrastructure (Supporting System Capability)
* **Primary Actor:** Email Service & Notification Process (Supporting System Actors)
* **Supporting Actors:** All Human Actors (Recipients)
* **MVP Priority:** P0
* **Source User Stories:** SYS-08
* **Short Feature Description:** Formats and delivers transactional emails generated by Clario workflows (account activation, password recovery, MFA alerts, academic topic/submission/review notifications, deadline reminders, overdue alerts, defence schedules, result publication, and subscription billing events) through an external email delivery provider (`SYS-08`).

### B. Business Purpose

* **Problem Solved:** Users are not logged into Clario 24 hours a day; external email delivery is essential to bring users back to the platform when time-sensitive academic or administrative events occur (e.g., onboarding invites, password resets, new submissions awaiting review, or defence schedule changes).
* **Necessity for Clario:** Implements `SYS-08` and serves as one of the two confirmed MVP notification channels (`NFR-DOM: Notifications`).
* **Business/Academic Value:** Ensures timely awareness of critical project lifecycle actions across all six actor roles.
* **Impact if Omitted:** Users could not receive onboarding invitations (`F-01`, `F-05`, `F-13`), password reset links (`F-64`), or external email alerts for deadlines and decisions.

### C. Functional Requirements

* **FR-246:** The system must integrate with a transactional Email Service (`SYS-08`) to send standardized, tenant-branded (displaying the Institution Name where applicable) HTML and plain-text emails to verified user email addresses.
* **FR-247:** All transactional emails must be queued and dispatched asynchronously via `F-73` so that external email-provider latency or temporary outages **never** block or roll back the triggering academic or administrative transaction (`NFR-DOM: Notifications`).
* **FR-248:** To protect academic confidentiality (`BR-25`, `SEC-14`–`SEC-15`), email bodies must contain only non-confidential summary context (e.g., *"A new submission has been uploaded for Milestone 2 on Project \[Title\]"* or *"Your final project result has been published"*) with a secure deep link requiring authentication (`F-64`, `F-66`) to view confidential documents, detailed feedback, or grades inside Clario.
* **FR-249:** The system must record delivery status (`Queued`, `Sent`, `Delivered`, `Bounced / Failed`) for every transactional email and expose delivery failures to operational monitoring (`NFR-MON`).

### D. User Interaction and Behaviour

* **Access:** Received in the recipient's external email client; deep links route into the responsive web application (`F-64`).
* **Information Viewed:** Subject line prefixed with `[Clario - {Institution Code}]`, event summary message, relevant timestamp (in institutional timezone `WAT`), and "Open in Clario" deep-link button.

### E. Business Rules

* **NFR-DOM (Notifications):** Email is a confirmed MVP channel; email delivery failure must not determine whether the underlying academic operation succeeds.

### F. Permissions and Access Control

* **Notification Process (`F-73`):** Authorised to enqueue and dispatch transactional emails.
* **Platform Admin:** Read-only access to email delivery health metrics and bounce/failure logs (`NFR-MON`).

### G. Data Requirements

* **Captured:** Email Dispatch ID, Notification Event ID (`F-72`/`F-73`), Institution ID (`F-01`, nullable for platform-level emails), Recipient User ID, Recipient Email Address, Template Code, Subject, Delivery Status (`QUEUED`, `SENT`, `DELIVERED`, `FAILED`), Retry Count (`F-73`), Provider Message ID, Last Attempt Timestamp, Error Details (nullable).

### H. Dependencies and Integrations

* **Required Features:** `F-72`, `F-73`.
* **External Integration:** External Transactional Email Service Provider (SMTP / HTTP Email API).

### I. Acceptance Criteria

* **AC-F71-01 (Positive — Asynchronous Transactional Email Delivery):** Given a Project Coordinator appoints an Examiner (`F-46`) or a Student submits a milestone (`F-32`), When the academic operation commits, Then `F-71` dispatches a formatted transactional email to the recipient containing a secure deep link to the relevant Clario view (`SYS-08`).
* **AC-F71-02 (Resilience — Email Provider Outage Does Not Roll Back Academic Action):** Given the external Email Service provider is temporarily unreachable, When a Supervisor approves a milestone submission (`F-33`) or a Coordinator publishes a project result (`F-60`), Then the milestone approval or result publication succeeds and commits normally, while the email is queued for automatic retry by `F-73` (`NFR-DOM`).

---

## F-72: In-App Notification Generation

### A. Feature Identification

* **Feature ID:** F-72
* **Feature Name:** In-App Notification Generation
* **Feature Category:** Notification & Communication Infrastructure (Supporting System Capability & User-Facing Notification Center)
* **Primary Actor:** Clario Notification Service (Supporting System Actor), All Human Actors (view in-app notifications)
* **Supporting Actors:** Notification Dispatch (`F-73`)
* **MVP Priority:** P0
* **Source User Stories:** SYS-09
* **Short Feature Description:** Generates and persists structured in-app notification records for all relevant academic and administrative events (`SYS-09`) and exposes an In-App Notification Center (with unread count badge, read/unread toggles, and deep links) to all authenticated actors.

### B. Business Purpose

* **Problem Solved:** Email delivery can be delayed by institutional spam filters or full mailboxes. Persisting every workflow notification inside Clario guarantees that users always have an authoritative, searchable in-platform record of every event affecting their projects or administration (`NFR-DOM: Notifications`).
* **Necessity for Clario:** Implements `SYS-09` and the mandatory requirement in `NFR-DOM` ("Important workflow notifications MUST be retained as in-app records").
* **Business/Academic Value:** Provides immediate in-application awareness and a permanent notification history per user.
* **Impact if Omitted:** Users would have no in-app notification center or persistent record of workflow alerts inside Clario.

### C. Functional Requirements

* **FR-250:** Whenever a qualifying academic or administrative event occurs in Clario — including tenant/user/role/appointment updates (`F-01`–`F-15`), topic proposals and decisions (`F-20`), project/group/supervisor allocations and reassignments (`F-21`–`F-24`, `F-27`), milestone/final submissions (`F-32`, `F-35`), submission reviews and discussion comments (`F-33`, `F-34`), deadline reminders (`F-40`), overdue alerts (`F-41`, `F-74`), extension requests/recommendations/decisions (`F-42`), late penalty overrides (`F-44`), examiner appointments and defence schedules (`F-46`, `F-49`), assessment submissions/edits (`F-55`, `F-56`), result publication (`F-60`), and subscription billing/expiry alerts (`F-69`, `F-70`) — the system must generate and persist an **In-App Notification record (`SYS-09`)** for each target recipient.
* **FR-251:** The system must provide every authenticated user with an **In-App Notification Center** accessible from the main navigation header, displaying:
  1. Unread notification count badge.
  2. Chronological list of notifications (filterable by `All` vs. `Unread`), showing Event Category icon, Title, Summary Message, Relative/Exact Timestamp (in institutional timezone), Read/Unread state, and target deep link.
  3. Actions to mark an individual notification as `Read` (automatically triggered on click) or `Mark All as Read`.
* **FR-252:** In-app notification records must be strictly isolated by `User ID` and `Institution ID` (`BR-01`, `BR-02`) and retained as persistent in-app records (`NFR-DOM`).

### D. User Interaction and Behaviour

* **Access:** Bell / Notification icon in the top navigation bar across all responsive web views -> Notification dropdown / full Notification History page.
* **Information Viewed:** Unread counter badge, notification cards (Title, Message, Timestamp, Unread dot indicator), and empty state ("You have no notifications").
* **Actions Performed:** Open Notification Center, Filter by Unread, Click Notification (marks as `Read` and navigates to the linked Project/Milestone/Assessment/Billing record), Mark All as Read.
* **Post-Action Behaviour:** Unread badge decrements immediately; deep-link navigation opens the target view in under $2\text{ seconds}$ (`PER-01`).

### E. Business Rules

* **BR-01 & BR-02:** Users only receive and view notifications for their own account and authorised institutional/project scope.
* **NFR-DOM:** Important workflow notifications must be retained as in-app records.

### F. Permissions and Access Control

* **All Authenticated Human Actors:** Read and mark-read access strictly for their own in-app notifications.

### G. Data Requirements

* **Captured:** Notification ID, Institution ID (`F-01`, nullable for Platform Admin), Recipient User ID, Event Type Code, Notification Title, Notification Body, Target Deep-Link Route & Resource ID, `is_read` (boolean), Read Timestamp (nullable), Created Timestamp.

### H. Dependencies and Integrations

* **Required Features:** `F-64`, `F-66`, `F-73`.
* **Consumed By:** All workflow features (`F-01`–`F-75`).

### I. Acceptance Criteria

* **AC-F72-01 (Positive — In-App Notification Generation & History Retention):** Given a Supervisor requests revisions on Student A's Milestone 1 submission (`F-33`), When the decision is saved, Then an in-app notification record is immediately generated for Student A (`SYS-09`), increments Student A's unread badge count, and remains accessible in Student A's Notification History (`NFR-DOM`).
* **AC-F72-02 (Interaction — Clicking Notification Marks Read & Navigates):** Given Student A has an unread in-app notification for Milestone 1 revisions, When Student A clicks the notification in the Notification Center, Then the notification is marked `is_read = true`, the unread counter decrements by $1$, and Student A is navigated directly to Milestone 1 Feedback & Resubmission (`F-34`, `F-35`).

---

## F-73: Notification Dispatch

### A. Feature Identification

* **Feature ID:** F-73
* **Feature Name:** Notification Dispatch
* **Feature Category:** Notification & Communication Infrastructure (Supporting System Capability)
* **Primary Actor:** Notification Process (Supporting System Actor)
* **Supporting Actors:** Transactional Email Delivery (`F-71`), In-App Notification Generation (`F-72`)
* **MVP Priority:** P0
* **Source User Stories:** SYS-10
* **Short Feature Description:** Orchestrates asynchronous multi-channel notification delivery across the confirmed MVP channels (in-app `F-72` and email `F-71`), managing queuing, idempotent deduplication, exponential-backoff retries on delivery failure, dead-letter alerting (`NFR-MON`), and transaction decoupling (`NFR-DOM`).

### B. Business Purpose

* **Problem Solved:** Without a centralized dispatch and retry orchestrator, transient network or email-gateway failures would result in silently dropped notifications, or synchronous notification calls would slow down interactive user operations beyond the $2\text{-second}$ performance target (`PER-01`).
* **Necessity for Clario:** Implements `SYS-10` and enforces the reliability and monitoring rules in `NFR-DOM: Notifications` and `NFR-REL: Background processes`.
* **Business/Academic Value:** Ensures high notification delivery reliability while keeping interactive academic operations fast and fault-isolated.
* **Impact if Omitted:** Failed email deliveries would not be retried, and notification spikes (e.g., deadline reminders for $1,000$ students) could degrade interactive platform performance (`PER-03`).

### C. Functional Requirements

* **FR-253:** The Notification Dispatch service (`SYS-10`) must accept domain events from Clario features and dispatch them across the two confirmed MVP channels: **In-App (`F-72`)** and **Email (`F-71`)** (explicitly excluding Push and SMS per `mvp-p.md` §10).
* **FR-254:** Dispatch processing must run asynchronously in the background (`PER-03`) so that notification generation and external email transmission never block normal user interactions or cause an academic database transaction to fail if notification delivery fails (`NFR-DOM`).
* **FR-255:** When an email delivery attempt (`F-71`) fails due to a transient error, `F-73` must automatically schedule and execute **retries with exponential backoff** (e.g., up to $5$ retry attempts), recording each attempt and its status (`NFR-DOM`).
* **FR-256:** If a notification exhausts all configured retry attempts without succeeding, `F-73` must mark the dispatch record as `Permanently Failed (Dead-Letter)`, preserve the underlying in-app notification (`F-72`), and trigger an operational monitoring alert (`NFR-MON`, `NFR-REL`).
* **FR-257:** `F-73` must enforce idempotency using a unique `(Event ID, Recipient User ID, Channel)` key so that retried background jobs never send duplicate emails or create duplicate in-app notifications for the same event.

### D. User Interaction and Behaviour

* **Access:** Automated background dispatch service; delivery status and failure alerts are visible to Platform Admins in operational monitoring (`NFR-MON`).

### E. Business Rules

* **NFR-DOM (Notifications):**
  1. Confirmed MVP channels are strictly in-app and email.
  2. Failed notification deliveries must be retried.
  3. Notification failures must be monitored.
  4. Notification delivery must not determine whether the underlying academic operation succeeds.

### F. Permissions and Access Control

* **Notification Process:** Internal system service permission to read event payloads and invoke `F-71` and `F-72`.

### G. Data Requirements

* **Captured:** Dispatch Job ID, Source Domain Event ID, Recipient User ID, Channel (`IN_APP`, `EMAIL`), Idempotency Key, Dispatch Status (`PENDING`, `PROCESSING`, `DELIVERED`, `RETRY_SCHEDULED`, `FAILED_DEAD_LETTER`), Attempt Count, Max Attempts, Next Retry Timestamp, Last Error Message, Timestamps.

### H. Dependencies and Integrations

* **Required Features:** `F-71`, `F-72`.
* **Consumed By:** `F-40`, `F-74`, `F-75`, and all event-producing features.

### I. Acceptance Criteria

* **AC-F73-01 (Resilience — Automatic Retry on Transient Email Failure):** Given `F-73` attempts to dispatch an email via `F-71` and the email provider returns a transient `503 Service Unavailable` error on Attempt 1, When the retry backoff timer elapses, Then `F-73` automatically retries delivery, marks the job `DELIVERED` upon Attempt 2 success, and does not duplicate the already-created in-app notification (`F-72`).
* **AC-F73-02 (Monitoring — Dead-Letter Alert After Exhausted Retries):** Given an email dispatch fails across all configured retry attempts, When the final retry attempt fails, Then `F-73` transitions the job to `FAILED_DEAD_LETTER` and emits an operational alert (`NFR-MON`), while the user's in-app notification (`F-72`) remains intact and accessible.

---

## F-74: Overdue Submission Notifications

### A. Feature Identification

* **Feature ID:** F-74
* **Feature Name:** Overdue Submission Notifications
* **Feature Category:** Notification & Communication Infrastructure (Supporting System Capability)
* **Primary Actor:** Scheduler (`F-80`) & Notification Process (`F-73`)
* **Supporting Actors:** Project Supervisor (`PS-18`), Project Coordinator (`PC-16`), Student (`ST-24`)
* **MVP Priority:** P0
* **Source User Stories:** SYS-11 *(alongside PC-16, PS-18)*
* **Short Feature Description:** Automatically generates and dispatches in-app (`F-72`) and email (`F-71`) notifications to the assigned Project Supervisor (`PS-18`), the Programme's Project Coordinator (`PC-16`), and the affected Student/Group whenever the Missed Deadline Detection service (`F-80`) identifies an overdue milestone or final project submission (`SYS-11`).

### B. Business Purpose

* **Problem Solved:** When a milestone deadline passes without a formal submission, Supervisors and Coordinators need immediate, automated notification rather than having to manually check the dashboard every day.
* **Necessity for Clario:** Implements `SYS-11` ("The scheduler and notification process must identify overdue submissions and notify the assigned Supervisor and Project Coordinator"), supporting `F-41` (`PC-16`, `PS-18`).
* **Business/Academic Value:** Ensures rapid supervisory and administrative awareness of missed deadlines across the cohort.
* **Impact if Omitted:** Supervisors and Coordinators would not be proactively notified when assigned projects miss a deadline (`SYS-11`).

### C. Functional Requirements

* **FR-258:** When `F-80` (Missed Deadline Detection) transitions an unsubmitted project milestone to `Overdue` (`F-41`) past its Effective Deadline (`F-30` / `F-42`), `F-74` must automatically generate and dispatch via `F-73` (both In-App `F-72` and Email `F-71`):
  1. An **Overdue Supervision Alert** to the project's currently assigned **Project Supervisor (`PS-18`)** identifying the Student/Group Name, Project Title, Overdue Milestone Title, and Effective Deadline passed.
  2. An **Overdue Programme Alert** (individual or batched per milestone deadline) to the Programme's appointed **Project Coordinator (`PC-16`)** summarizing the project(s) that have become overdue for that milestone.
  3. An **Overdue Submission Notice** to the **Student** (or all **Group Members** of a Group Project, highlighting the Designated Submitter `F-23`) informing them that the deadline has passed and any subsequent submission will be recorded as `Late` (`F-43`).
* **FR-259:** `F-74` must enforce idempotency per `(Project ID, Milestone ID, Effective Deadline Timestamp)` so that repeated runs of the `F-80` background scheduler do not spam the Supervisor and Coordinator with duplicate overdue notifications for the exact same missed deadline event.

### D. User Interaction and Behaviour

* **Access:** Delivered via In-App Notification Center (`F-72`) and Email (`F-71`) with deep links to the Overdue Submissions Monitoring view (`F-41`) or the specific Project Workspace (`F-28` / `F-36`).

### E. Business Rules

* **SYS-11:** Overdue submissions must notify the assigned Project Supervisor and Project Coordinator.
* **NFR-DOM:** Evaluated strictly in the institution's configured timezone; delivered via in-app and email channels.

### F. Permissions and Access Control

* **Notification Process (`F-73`, `F-74`):** Dispatches overdue notifications strictly to the project's assigned Supervisor (`SEC-12`), the Programme's appointed Coordinator (`BR-03`), and the project's Student/Group Members (`SEC-11`).

### G. Data Requirements

* **Captured:** Overdue Notification Event ID, Project ID (`F-21`), Milestone ID (`F-29`), Effective Deadline Timestamp (`F-30`/`F-42`), Recipient Supervisor ID (`F-24`), Recipient Coordinator ID (`F-15`), Recipient Student ID(s) (`F-19`/`F-22`), Dispatch Status (`F-73`), Timestamp.

### H. Dependencies and Integrations

* **Required Features:** `F-30`, `F-41`, `F-42`, `F-71`, `F-72`, `F-73`, `F-80`.

### I. Acceptance Criteria

* **AC-F74-01 (Positive — Supervisor & Coordinator Notified Upon Missed Deadline):** Given Project X has not submitted Milestone 2 by its Effective Deadline of `2027-01-15 23:59 WAT`, When `F-80` detects the missed deadline, Then `F-74` dispatches in-app and email overdue notifications (`F-71`–`F-73`) to Project X's assigned Supervisor (`PS-18`), the Programme's Project Coordinator (`PC-16`), and Project X's Student(s) (`SYS-11`).
* **AC-F74-02 (Idempotency — No Duplicate Overdue Spam on Subsequent Scheduler Runs):** Given `F-74` has already dispatched the initial overdue notification for Project X's Milestone 2 deadline (`2027-01-15 23:59 WAT`), When `F-80` runs again one hour later while Project X is still unsubmitted, Then `F-74` does not send duplicate initial overdue notifications for that same deadline timestamp.

---

## F-75: Academic Decision and Submission Notifications

### A. Feature Identification

* **Feature ID:** F-75
* **Feature Name:** Academic Decision and Submission Notifications
* **Feature Category:** Notification & Communication Infrastructure (Supporting System Capability)
* **Primary Actor:** Clario Notification Service (`F-72`, `F-73`)
* **Supporting Actors:** Project Supervisor (`PS-17`), Student (`ST-23`), Project Coordinator
* **MVP Priority:** P0
* **Source User Stories:** SYS-12, PS-17, ST-23
* **Short Feature Description:** Automatically notifies assigned Project Supervisors via in-app and email channels when students or groups submit or resubmit project documents or topic proposals (`PS-17`), and notifies Students (and Group Members) when Supervisors or Coordinators record academic decisions such as topic approvals/rejections/alternatives, milestone approvals, revision requests, rejections, extension decisions, or result publications (`SYS-12`, `ST-23`).

### B. Business Purpose

* **Problem Solved:** The supervision loop (`Student submits -> Supervisor reviews -> Student acts on decision`) stalls if Supervisors do not know when a student has uploaded a deliverable (`PS-17`) or if Students do not know when their Supervisor has approved their milestone or requested revisions (`ST-23`, `SYS-12`).
* **Necessity for Clario:** Implements `SYS-12`, `PS-17`, and `ST-23`.
* **Business/Academic Value:** Accelerates turnaround times across topic approval, milestone reviews, and revision cycles.
* **Impact if Omitted:** Supervisors and Students would have to manually poll the workspace to discover new submissions or academic decisions.

### C. Functional Requirements

* **FR-260:** **Submission Notifications to Supervisors (`PS-17`):** Whenever an assigned Student (or Designated Group Submitter `F-23`) formally submits or resubmits:
  1. A Topic Proposal or Revised Topic Proposal (`F-20`, once a Supervisor is assigned),
  2. An Interim Milestone Document or Revised Version (`F-32`, `F-35`),
  3. A Final Consolidated Project Document (`F-32`), or
  4. A Deadline Extension Request (`F-42`),
  the system must automatically generate and dispatch an in-app (`F-72`) and email (`F-71`) notification via `F-73` to the project's currently assigned **Project Supervisor** (and notify the Coordinator for initial unassigned topic proposals `F-20`).
* **FR-261:** **Academic Decision Notifications to Students (`SYS-12`, `ST-23`):** Whenever a Supervisor or Coordinator records any of the following academic decisions on a project:
  1. Topic Proposal `Approved`, `Rejected` (with feedback), or `Alternative Topic Suggested` (`F-20`),
  2. Milestone or Final Submission `Approved`, `Revisions Requested` (with feedback), or `Rejected` (`F-33`, `SYS-12`, `ST-23`),
  3. New Supervisor formal feedback or submission discussion comment (`F-34`),
  4. Supervisor Assignment (`F-24`) or Supervisor Reassignment (`F-27`),
  5. Deadline Extension `Recommended`/`Declined` by Supervisor or `Approved`/`Rejected` by Coordinator (`F-42`),
  6. Defence Schedule published or updated (`F-49`), or
  7. Final Project Result `Published` (`F-60`),
  the system must automatically generate and dispatch an in-app (`F-72`) and email (`F-71`) notification via `F-73` to the assigned **Student** (or to **all active Student members** of the Project Group `F-22`).

### D. User Interaction and Behaviour

* **Access:** Delivered via In-App Notification Center (`F-72`) and Email (`F-71`), containing direct deep links to the specific Topic Proposal (`F-20`), Milestone Submission/Feedback (`F-33`, `F-34`), Extension Request (`F-42`), Defence Schedule (`F-49`), or Published Result (`F-60`).

### E. Business Rules

* **SYS-12, PS-17 & ST-23:** Mandatory in-app and email notifications for student submissions and supervisory/academic decisions.
* **NFR-DOM:** Notification dispatch failure must never roll back the underlying submission or academic review decision.

### F. Permissions and Access Control

* **Notification Process (`F-73`, `F-75`):** Dispatches notifications strictly to the authorised Student/Group Members (`SEC-11`) and the currently assigned Project Supervisor (`SEC-12`).

### G. Data Requirements

* **Captured:** Academic Notification Event ID, Triggering Feature & Record ID (`Topic Proposal ID`, `Submission ID`, `Review Decision ID`, `Extension ID`, `Publication ID`), Project ID (`F-21`), Event Type, Recipient User IDs, Dispatch Status (`F-73`), Timestamp.

### H. Dependencies and Integrations

* **Required Features:** `F-20`, `F-24`, `F-27`, `F-32`, `F-33`, `F-34`, `F-35`, `F-42`, `F-49`, `F-60`, `F-71`, `F-72`, `F-73`.

### I. Acceptance Criteria

* **AC-F75-01 (Positive — Supervisor Notified on Student Document Submission `PS-17`):** Given Student A (or Designated Submitter of Group 1) confirms a formal submission for Milestone 2 (`F-32`) or uploads a revised version (`F-35`), When the submission is recorded, Then `F-75` dispatches both an in-app notification (`F-72`) and an email notification (`F-71`) to the assigned Project Supervisor (`PS-17`).
* **AC-F75-02 (Positive — Student & Group Members Notified on Supervisor Approval or Revision Request `SYS-12`, `ST-23`):** Given the assigned Supervisor records `Approved` or `Revisions Requested` on Group 1's Milestone 2 submission (`F-33`), When the decision is saved, Then `F-75` dispatches both in-app and email notifications (`F-71`, `F-72`) to **all** members of Group 1 (`ST-23`, `SYS-12`).

---

# Module N: Document Storage and Retrieval

## F-76: Secure Document Storage

### A. Feature Identification

* **Feature ID:** F-76
* **Feature Name:** Secure Document Storage
* **Feature Category:** Document Storage & Retrieval (Supporting System Capability)
* **Primary Actor:** File Storage Service (Supporting System Actor)
* **Supporting Actors:** Milestone & Final Submission (`F-32`), Shared Document Management (`F-37`), Submission Feedback (`F-34`), Deadline Extension Evidence (`F-42`)
* **MVP Priority:** P0
* **Source User Stories:** SYS-13
* **Short Feature Description:** Securely validates, scans, encrypts, and stores uploaded project documents (`SYS-13`), enforcing the $50\text{ MB}$ maximum file size, accepted formats (`PDF`, `DOC`, `DOCX`, `PPT`, `PPTX`), content-type verification, encryption in transit and at rest (`SEC-17`–`SEC-19`), and non-public tenant-partitioned storage.

### B. Business Purpose

* **Problem Solved:** Academic dissertations and project deliverables are high-value intellectual property and potential vectors for malicious file uploads. Storing files in public buckets or without strict binary content validation and encryption exposes institutions to data breaches and malware distribution.
* **Necessity for Clario:** Implements `SYS-13`, `SEC-17`–`SEC-19`, and `NFR-SEC: File security`.
* **Business/Academic Value:** Guarantees durability, confidentiality, and integrity (via cryptographic checksums) for every document uploaded to Clario.
* **Impact if Omitted:** Milestone submissions (`F-32`) and shared group documents (`F-37`) could not be stored securely.

### C. Functional Requirements

* **FR-262:** The File Storage Service (`SYS-13`) must store all uploaded documents in private, non-public object storage logically partitioned by `Institution ID` (`BR-01`, `SEC-09`) and encrypted both in transit (`TLS`, `SEC-17`) and at rest (`SEC-18`, `SEC-19`).
* **FR-263:** Before marking any uploaded file as valid and available (`DAT-03`), `F-76` must enforce `NFR-SEC: File security`:
  1. Reject any individual file exceeding **$50\text{ MB}$ ($52,428,800\text{ bytes}$)**.
  2. Accept **only** files matching the approved MVP formats: **`PDF`, `DOC`, `DOCX`, `PPT`, and `PPTX`**.
  3. Inspect the actual file binary header / magic bytes and structure (not merely the filename extension) to verify that the file content genuinely matches `PDF`, `DOC`, `DOCX`, `PPT`, or `PPTX`.
  4. Scan the uploaded file for malware/malicious content (`NFR-SEC: File security`) and quarantine/reject any infected file before it can be accessed by any other user.
* **FR-264:** For every stored file object, the system must compute and store a cryptographic integrity hash (`SHA-256`), original sanitized filename, validated MIME type, byte size, uploading `User ID`, `Institution ID`, and `Project ID`.
* **FR-265:** To support interrupted upload recovery (`NFR-USA: Offline behaviour`, `DAT-05`), `F-76` must support resumable/chunked or idempotent token-bound upload sessions so a dropped connection can resume or retry cleanly without creating orphan or duplicate formal submissions (`DAT-03`).

### D. User Interaction and Behaviour

* **Access:** Invoked by `F-32` (Milestone & Final Submissions), `F-34` (Supervisor Annotated Feedback files), `F-35` (Revised Submissions), `F-37` (Shared Group Documents), and `F-42` (Extension Supporting Evidence).
* **Post-Action Behaviour (Success):** Returns an immutable `Storage Object ID` and `SHA-256` checksum to the calling feature upon complete receipt and validation (`DAT-03`).
* **Post-Action Behaviour (Failure):** Immediately purges invalid/infected temp uploads and returns a structured validation error (`FileTooLarge`, `UnsupportedFileFormat`, `ContentMismatch`, `MaliciousContentDetected`).

### E. Business Rules

* **BR-01:** Tenant storage partitioning.
* **NFR-SEC (File Security):** Max $50\text{ MB}$; formats strictly `PDF`, `DOC`, `DOCX`, `PPT`, `PPTX`; file extension alone is never treated as proof of file type.
* **DAT-03 & DAT-05:** Formal submission is recorded only after successful server receipt and validation; interrupted uploads are recoverable via retry.

### F. Permissions and Access Control

* **File Storage Service:** Internal system service; direct public URL access to storage buckets is completely disabled (`DAT-06`). All human retrieval must pass through `F-77`.

### G. Data Requirements

* **Captured:** Storage Object ID (immutable UUID), Institution ID (`F-01`), Project ID (`F-21`), Uploaded By User ID, Sanitized Original File Name, Validated Extension (`pdf`, `doc`, `docx`, `ppt`, `pptx`), Validated MIME Type, File Size (bytes $\le 52,428,800$), `SHA-256` Checksum, Malware Scan Status (`CLEAN`, `REJECTED_INFECTED`), Encryption Key Reference (`SEC-19`), Upload Session Idempotency Token, Created Timestamp.

### H. Dependencies and Integrations

* **Required Features:** `F-64`, `F-66`, `F-77`, `F-78`.
* **Consumed By:** `F-32`, `F-34`, `F-35`, `F-37`, `F-42`, `F-50`, `F-83`.

### I. Acceptance Criteria

* **AC-F76-01 (Positive — Validated & Encrypted Storage of Supported Document):** Given an authorised user uploads a valid $18\text{ MB}$ `PDF` file, When `F-76` receives the upload, Then `F-76` verifies the PDF binary signature and malware scan, encrypts the file at rest (`SEC-19`), records its `SHA-256` hash, and returns a valid `Storage Object ID` (`SYS-13`).
* **AC-F76-02 (Security — Reject Disguised File Content & Oversized Files):** Given a user renames a Windows executable (`malware.exe`) or HTML script (`exploit.html`) to `dissertation.pdf` (or uploads a $51\text{ MB}$ `.docx` file), When `F-76` inspects the upload, Then `F-76` detects the binary header mismatch (or size violation), rejects and deletes the upload, and prevents any submission record from being created (`NFR-SEC`, `DAT-03`).

---

## F-77: Authorised Document Retrieval

### A. Feature Identification

* **Feature ID:** F-77
* **Feature Name:** Authorised Document Retrieval
* **Feature Category:** Document Storage & Retrieval & Security Enforcement (Supporting System Capability)
* **Primary Actor:** File Storage Service & Access Control Service (`F-66`)
* **Supporting Actors:** Student, Project Supervisor, Project Examiner, Project Coordinator, Audit Process (`F-82`)
* **MVP Priority:** P0
* **Source User Stories:** SYS-14
* **Short Feature Description:** Enforces strict role, tenant, project, and assignment-scope authorization checks (`F-66`, `DAT-06`) before allowing any user to view or download a stored project document (`SYS-14`), blocking Platform Admins (`F-08`), Institutional Admins (`F-18`), and unassigned users.

### B. Business Purpose

* **Problem Solved:** Even if application UI screens hide download links from unauthorized users, documents remain vulnerable if storage URLs are predictable, publicly accessible, or shared across sessions without per-request authorization checks.
* **Necessity for Clario:** Implements `SYS-14`, `DAT-06` ("Documents must remain accessible only to authorised users"), `SEC-11`–`SEC-15`, `F-08`, and `F-18`.
* **Business/Academic Value:** Protects confidential student research and unpublished dissertations against unauthorized downloading.
* **Impact if Omitted:** Confidential project documents could be downloaded by Institutional Admins, Platform Admins, unassigned Examiners, or users from other institutions.

### C. Functional Requirements

* **FR-266:** Every request to view or download a stored document (`F-76`, `F-78`) must be authenticated (`F-64`) and evaluated by `F-66` against the document's `Institution ID`, `Project ID`, and `Document Category` before any file bytes or time-limited signed stream are served (`SYS-14`, `DAT-06`):
  1. **Student:** Permitted to retrieve documents belonging to their own Individual Project or their assigned Group Project (`SEC-11`).
  2. **Project Supervisor:** Permitted to retrieve documents belonging to projects where they hold an `Active` Supervision Assignment (`SEC-12`).
  3. **Project Examiner:** Permitted to retrieve **only** the official Final Consolidated Project submission documents (and examination materials `F-50`) for projects where they hold an `Active` Examiner Appointment (`SEC-13`); blocked from retrieving intermediate milestone working drafts or supervisor annotated feedback files (`BR-17`).
  4. **Project Coordinator:** Permitted to retrieve formal project submission documents within their assigned Programme and Academic Session (`BR-03`).
  5. **Institutional Admin:** **Strictly blocked (`403 Forbidden`)** from retrieving any student project document (`F-18`, `BR-25`, `SEC-14`).
  6. **Platform Admin:** **Strictly blocked (`403 Forbidden`)** from retrieving any student project document by default (`F-08`, `SEC-15`), except as part of an explicitly requested, audited full institutional archive export (`FR-006`, `SEC-16`).
* **FR-267:** If authorization succeeds, `F-77` must stream the decrypted file over HTTPS (`SEC-17`) with `Content-Disposition` headers preserving the sanitized original filename and short-lived cache/signature validity so URLs cannot be shared externally.
* **FR-268:** If authorization fails, `F-77` must return `403 Forbidden` and record an unauthorized document-access attempt in `F-82`.

### D. User Interaction and Behaviour

* **Access:** Invoked whenever an authorised user clicks "Download" or "View Document" in `F-28`, `F-32`, `F-33`, `F-34`, `F-35`, `F-37`, `F-42`, or `F-50`.
* **Post-Action Behaviour:** Authorised downloads begin within the interactive performance target; unauthorized requests return an access-denied error.

### E. Business Rules

* **BR-01 & BR-02:** Strict institutional and project-scope isolation.
* **BR-25:** Institutional Admins cannot access confidential project documents (`F-18`).
* **DAT-06:** Documents must remain accessible only to authorised users.

### F. Permissions and Access Control

* **Enforced Matrix:** See `FR-266` (Student, Assigned Supervisor, Appointed Examiner for Final Document, Appointed Programme Coordinator allowed; Institutional Admin, Platform Admin, and all unassigned users denied).

### G. Data Requirements

* **Evaluated Metadata:** Storage Object ID (`F-76`), Document Category (`MILESTONE_SUBMISSION`, `FINAL_PROJECT_SUBMISSION`, `SHARED_GROUP_WORKING_DOC`, `SUPERVISOR_FEEDBACK_ATTACHMENT`, `EXTENSION_EVIDENCE`), Institution ID, Programme ID, Session ID, Project ID, Requesting User ID & Active Role/Scope (`F-65`, `F-66`).

### H. Dependencies and Integrations

* **Required Features:** `F-08`, `F-18`, `F-64`, `F-65`, `F-66`, `F-76`, `F-78`, `F-82`.

### I. Acceptance Criteria

* **AC-F77-01 (Positive — Authorised Student, Supervisor & Examiner Retrieval):** Given Project X's Final Consolidated Project document is stored in `F-76`, When Project X's Student, Project X's assigned Supervisor, or Project X's appointed Examiner requests the document (`SYS-14`), Then `F-77` verifies their assignment and serves the document over HTTPS.
* **AC-F77-02 (Permission — Block Institutional Admin, Platform Admin, Unassigned Staff & Other Students):** Given Project X's document is stored in `F-76`, When an Institutional Admin (`F-18`), a Platform Admin (`F-08`), a Student from Project Y, or an Examiner not appointed to Project X attempts to download the document via its object ID/URL, Then `F-77` denies the request with `403 Forbidden` and logs the attempt in `F-82` (`DAT-06`).
* **AC-F77-03 (Scope — Examiner Restricted from Intermediate Milestone Drafts):** Given Examiner Dr. Bello is appointed to examine Project X (`F-46`), When Dr. Bello attempts to download an intermediate Milestone 1 draft or a Supervisor annotated feedback file from `F-34`, Then `F-77` denies access, restricting Dr. Bello strictly to the Final Examination Package (`F-50`, `BR-17`).

---

## F-78: Document Version Preservation

### A. Feature Identification

* **Feature ID:** F-78
* **Feature Name:** Document Version Preservation
* **Feature Category:** Document Storage & Retrieval (Supporting System Capability)
* **Primary Actor:** File Storage Service (Supporting System Actor)
* **Supporting Actors:** Document Version Management (`F-35`), Milestone & Final Submission (`F-32`), Shared Document Management (`F-37`)
* **MVP Priority:** P0
* **Source User Stories:** SYS-15
* **Short Feature Description:** Enforces immutable, append-only storage versioning (`SYS-15`) so that whenever a revised submission (`F-35`) or updated shared document (`F-37`) is uploaded, a distinct storage object and version record are created and all previous file versions are permanently preserved against overwrite or deletion (`BR-11`, `DAT-01`, `DAT-02`).

### B. Business Purpose

* **Problem Solved:** If storage objects are overwritten in place using the same storage key when a student uploads `Version 2`, `Version 1` is irrecoverably destroyed at the storage layer even if metadata rows exist.
* **Necessity for Clario:** Implements `SYS-15`, `BR-11`, `DAT-01`, and `DAT-02` at the storage and persistence layer, backing the user-facing `F-35` capability.
* **Business/Academic Value:** Guarantees non-repudiation and permanent recoverability of every historical submission version throughout the academic session.
* **Impact if Omitted:** Previous submission files could be overwritten or deleted, violating `BR-11` and `DAT-02`.

### C. Functional Requirements

* **FR-269:** Every formal submission (`F-32`) and every resubmission (`F-35`) must be written to a **new, immutable `Storage Object ID` (`F-76`)** and assigned a monotonically increasing integer `Version Number` ($1, 2, \dots, N$) within its `(Project ID, Milestone ID)` scope (`SYS-15`, `DAT-01`).
* **FR-270:** The storage layer must prohibit in-place mutation, overwrite, or deletion of any `Storage Object ID` linked to a confirmed formal submission version (`BR-11`, `DAT-02`), except during a verified post-termination institutional data purge after the mandatory recovery period (`NFR-BKP`, `OD-10`).
* **FR-271:** Each preserved version record must maintain an unbroken pointer to its `Storage Object ID`, `SHA-256` checksum, upload timestamp, submitting user, and parent version (`Version N-1`), enabling `F-35` and `F-77` to retrieve any historical version on demand.

### D. User Interaction and Behaviour

* **Access:** Supporting system capability invoked automatically by `F-32`, `F-35`, and `F-37`.

### E. Business Rules

* **BR-11 / DAT-01 / DAT-02:** Every successful formal submission creates a preserved document version; previous formal submission versions must never be deleted when a revised submission is made.

### F. Permissions and Access Control

* **File Storage Service:** Enforces append-only immutability on formal submission objects; no human actor has permission to delete a formal submission version (`DAT-02`).

### G. Data Requirements

* **Captured/Preserved:** Version Chain ID, Project ID (`F-21`), Milestone ID (`F-29`), Version Number ($1 \dots N$), Previous Version ID (nullable for $v1$), Immutable Storage Object ID (`F-76`), `SHA-256` Checksum, Created Timestamp.

### H. Dependencies and Integrations

* **Required Features:** `F-76`, `F-77`.
* **Consumed By:** `F-32`, `F-35`, `F-37`, `F-83`.

### I. Acceptance Criteria

* **AC-F78-01 (Integrity — Distinct Immutable Storage Objects per Version):** Given `Version 1` of Milestone 1 is stored with `Storage Object ID = OBJ_01` and hash `H1`, When the Student uploads `Version 2` (`F-35`), Then `F-78` stores `Version 2` under a distinct `Storage Object ID = OBJ_02` with hash `H2`, and `OBJ_01` remains byte-identical (`H1`) and retrievable via `F-77` (`SYS-15`, `DAT-01`, `DAT-02`).
* **AC-F78-02 (Protection — Block Deletion or Overwrite of Preserved Version):** Given `OBJ_01` is bound to a confirmed formal submission version, When any API or storage call attempts to delete or overwrite `OBJ_01`, Then `F-78` rejects the operation (`DAT-02`).

---

# Module O: Scheduling and Background Processes

*(Note: `F-81` Academic Session Carry-Forward Processing (`SYS-18`) is classified as **P1** in `mvp-p.md` §5 and is excluded from the MVP implementation specification).*

## F-79: Deadline Reminder Scheduling

### A. Feature Identification

* **Feature ID:** F-79
* **Feature Name:** Deadline Reminder Scheduling
* **Feature Category:** Scheduling & Background Processes (Supporting System Capability)
* **Primary Actor:** Scheduler / Background Process (Supporting System Actor)
* **Supporting Actors:** Milestone Deadline Management (`F-30`), Deadline Extension Management (`F-42`), Deadline Reminder Management (`F-40`), Notification Dispatch (`F-73`)
* **MVP Priority:** P0
* **Source User Stories:** SYS-16
* **Short Feature Description:** Continuously evaluates upcoming milestone and final submission Effective Deadlines across all active institutions in their configured timezones and triggers scheduled reminder events (`SYS-16`) for `F-40` and `F-73`.

### B. Business Purpose

* **Problem Solved:** Upcoming deadline reminders (`F-40`) must fire reliably at exact time offsets before each milestone's Effective Deadline without requiring a human user to be logged in to trigger them.
* **Necessity for Clario:** Implements `SYS-16` and `NFR-REL: Background processes`.
* **Business/Academic Value:** Automates cohort-wide reminder scheduling across multiple institutions and dynamically adapts when Coordinators change deadlines (`F-30`) or approve extensions (`F-42`).
* **Impact if Omitted:** `F-40` (Deadline Reminder Management) could not automatically trigger upcoming deadline reminders.

### C. Functional Requirements

* **FR-272:** The Scheduler service (`SYS-16`) must maintain and evaluate reminder schedules for every active milestone (`F-29`) and project (`F-21`) based on the project's current **Effective Deadline** (`F-30` base deadline or `F-42` approved extended deadline) in the institution's configured IANA timezone (`NFR-DOM`).
* **FR-273:** When a configured reminder threshold (e.g., $7\text{ days}$, $3\text{ days}$, or $24\text{ hours}$ before the Effective Deadline) is reached for a project that has not yet submitted that milestone (`F-32`), `F-79` must emit an idempotent `DeadlineReminderDue` event to `F-40` and `F-73`.
* **FR-274:** Whenever a Coordinator updates a Milestone Deadline (`F-30`) or approves a Deadline Extension (`F-42`), `F-79` must automatically recalculate the pending reminder trigger timestamps for the affected project(s).
* **FR-275:** In accordance with `NFR-REL: Background processes`, `F-79` must log job execution health, detect any failed or delayed scheduler run, automatically recover/catch up missed reminder windows on restart without duplicating already-sent reminders, and emit operational alerts on failure (`NFR-MON`).

### D. User Interaction and Behaviour

* **Access:** Automated background scheduler; job health, lag, and failure alerts are exposed to Platform Admins in operational monitoring (`NFR-MON`).

### E. Business Rules

* **NFR-DOM:** All deadline reminder calculations use the institution's configured timezone.
* **NFR-REL:** A failure in a background process must be detectable and recoverable without silently losing the underlying academic event.

### F. Permissions and Access Control

* **Scheduler Service:** Internal background service permission to read milestone deadlines/submission states and enqueue reminder events.

### G. Data Requirements

* **Captured:** Scheduled Reminder Job ID, Institution ID (`F-01`), Project ID (`F-21`), Milestone ID (`F-29`), Effective Deadline Timestamp, Reminder Threshold Code (`7D`, `3D`, `24H`), Scheduled Trigger Timestamp, Job Status (`SCHEDULED`, `TRIGGERED`, `SUPPRESSED_ALREADY_SUBMITTED`, `SUPERSEDED_BY_EXTENSION`, `FAILED`), Execution Timestamp.

### H. Dependencies and Integrations

* **Required Features:** `F-29`, `F-30`, `F-32`, `F-40`, `F-42`, `F-73`.

### I. Acceptance Criteria

* **AC-F79-01 (Positive — Dynamic Rescheduling Upon Approved Extension):** Given Project X's Milestone 1 deadline is `2026-12-01 23:59 WAT` and an extension is approved to `2026-12-10 23:59 WAT` (`F-42`), When the extension is approved, Then `F-79` marks the old reminder schedule as `SUPERSEDED_BY_EXTENSION` and schedules new reminder triggers relative to `2026-12-10 23:59 WAT` (`SYS-16`).
* **AC-F79-02 (Reliability — Catch-Up Recovery After Scheduler Restart):** Given the scheduler process experiences a $10\text{-minute}$ restart window during which a `24H` reminder threshold passed, When `F-79` resumes, Then it detects the un-triggered threshold, fires the reminder event exactly once (`NFR-REL`), and logs the recovery.

---

## F-80: Missed Deadline Detection

### A. Feature Identification

* **Feature ID:** F-80
* **Feature Name:** Missed Deadline Detection
* **Feature Category:** Scheduling & Background Processes (Supporting System Capability)
* **Primary Actor:** Scheduler / Background Process (Supporting System Actor)
* **Supporting Actors:** Overdue Submission Monitoring (`F-41`), Late Submission Recording (`F-43`), Overdue Submission Notifications (`F-74`)
* **MVP Priority:** P0
* **Source User Stories:** SYS-17
* **Short Feature Description:** Continuously monitors milestone and final project Effective Deadlines across all active institutions, identifies projects that have passed their deadline without a formal submission (`SYS-17`), transitions them to `Overdue` (`F-41`), triggers overdue notifications (`F-74`), and activates the late-submission workflow (`F-43`, `F-44`).

### B. Business Purpose

* **Problem Solved:** The moment a milestone deadline expires, the platform must automatically transition unsubmitted projects to `Overdue` and alert the Supervisor and Coordinator without waiting for a student to log in.
* **Necessity for Clario:** Implements `SYS-17`, `BR-12`, and `NFR-REL: Background processes`.
* **Business/Academic Value:** Ensures timely, objective detection of missed deadlines across all programmes and institutions.
* **Impact if Omitted:** Unsubmitted projects would not be automatically flagged as overdue (`F-41`) and overdue alerts (`F-74`) would never fire.

### C. Functional Requirements

* **FR-276:** The Missed Deadline Detection background service (`SYS-17`) must evaluate active milestones (`F-29`) across all `Active` Academic Sessions (`F-12`) against the authoritative server clock in each institution's configured timezone (`NFR-DOM`).
* **FR-277:** When `Current Time > Effective Deadline Timestamp` (plus any configured grace buffer `F-44`) and a project's milestone status is still `Unlocked / Not Submitted` (or `Revisions Requested` / `Rejected` past an applicable deadline without an active submission under review), `F-80` must atomically:
  1. Mark the project milestone as `Overdue` in `F-41`.
  2. Emit an idempotent `MissedDeadlineDetected` event to `F-74` to notify the assigned Project Supervisor, Project Coordinator, and Student/Group (`SYS-11`).
  3. Enable the Late Submission workflow (`F-43`, `F-44`) so that any subsequent formal submission for that milestone is automatically recorded as `Late` (`BR-12`).
* **FR-278:** In accordance with `NFR-REL: Background processes`, `F-80` must be idempotent, monitored continuously (`NFR-MON`), and capable of automatic catch-up recovery if a scheduled run is delayed or fails, ensuring zero missed-deadline events are silently lost.

### D. User Interaction and Behaviour

* **Access:** Automated background process; results surface in `F-41` (Overdue Submission Monitoring), `F-43` (Late Submission Recording), and `F-74` (Overdue Notifications).

### E. Business Rules

* **BR-12:** Missed deadlines are automatically recorded/flagged as late.
* **NFR-DOM:** Evaluated strictly using the institution's configured timezone.
* **NFR-REL:** Background process failures must be detectable and recoverable without losing the underlying academic event.

### F. Permissions and Access Control

* **Scheduler Service (`F-80`):** Internal system authority to mark overdue flags (`F-41`) and emit `F-74` events.

### G. Data Requirements

* **Captured:** Missed Deadline Detection Job ID, Institution ID (`F-01`), Project ID (`F-21`), Milestone ID (`F-29`), Effective Deadline Timestamp, Detected Timestamp, Detection Status (`DETECTED_OVERDUE`, `RESOLVED_BY_EXTENSION`, `RESOLVED_BY_LATE_SUBMISSION`), Notification Event Reference (`F-74`).

### H. Dependencies and Integrations

* **Required Features:** `F-29`, `F-30`, `F-32`, `F-41`, `F-42`, `F-43`, `F-44`, `F-74`.

### I. Acceptance Criteria

* **AC-F80-01 (Positive — Missed Deadline Detection & Workflow Initiation):** Given Milestone 2's Effective Deadline is `2027-01-15 23:59:00 WAT` and Project X has not submitted Milestone 2, When the server clock passes `2027-01-15 23:59:00 WAT` and `F-80` executes (`SYS-17`), Then Project X is marked `Overdue` in `F-41`, `F-74` overdue notifications are triggered, and the milestone enters the Late Submission state (`F-43`, `BR-12`).
* **AC-F80-02 (Reliability — Failure Alerting & Idempotent Recovery):** Given a transient database/worker interruption delays an `F-80` execution cycle, When the worker recovers, Then `F-80` processes all deadlines that elapsed during the interruption without losing any missed-deadline event or duplicating already-processed overdue flags (`NFR-REL`).

---

# Module P: Audit and Backup Infrastructure

## F-82: Administrative and Critical Academic Audit Logging

### A. Feature Identification

* **Feature ID:** F-82
* **Feature Name:** Administrative and Critical Academic Audit Logging *(preserving original feature ID `F-82` and covering both Administrative Actions and Critical Academic Decisions as mandated by `mvp-p.md` §9 and `nfrs.md` §8 `NFR-AUD`)*
* **Feature Category:** Audit & Backup Infrastructure (Supporting System Capability & Administrative Audit Viewer)
* **Primary Actor:** Audit Process (Supporting System Actor), Platform Admin & Institutional Admin (view scoped audit logs)
* **Supporting Actors:** Project Coordinator, All Feature Services
* **MVP Priority:** P0
* **Source User Stories:** SYS-19
* **Short Feature Description:** Records immutable, tamper-resistant audit logs (`SYS-19`, `NFR-AUD`) for all administrative activities and critical academic decisions across Clario, capturing actor identity, action, target record, institutional/programme scope, timestamp, previous and resulting values, and reason/justification.

### B. Business Purpose

* **Problem Solved:** In multi-tenant academic management and grading systems, disputes or security investigations require an unimpeachable, tamper-proof record of who changed a grade, who approved or published a result, who overrode a late penalty, who reassigned a supervisor, or who modified user roles and subscriptions.
* **Necessity for Clario:** Implements `SYS-19`, `BR-28`, `mvp-p.md` §9 ("Tamper-resistant audit records for administrative actions and critical academic decisions"), and `nfrs.md` §8 (`NFR-AUD`).
* **Business/Academic Value:** Provides full institutional accountability, regulatory compliance (`NDPA 2023`), and forensic traceability while avoiding noisy logging of routine page views (`BR-28`).
* **Impact if Omitted:** Grade modifications, penalty overrides, role changes, or unauthorized access attempts could occur without an accountable audit trail.

### C. Functional Requirements

* **FR-279:** The Audit Process (`SYS-19`, `NFR-AUD`) must automatically record an immutable audit log entry for every **Administrative Activity**:
  1. Institutional account creation, configuration, timezone updates, activation, suspension, data export, and termination initiation (`F-01`, `F-12`).
  2. Subscription plan creation/updates (`F-02`), institutional subscription/billing updates (`F-03`), grace-period changes (`F-04`), and verified payment/subscription status transitions (`F-67`–`F-70`).
  3. Platform Admin account management (`F-05`) and any restricted Platform Admin support/diagnostic access (`F-08`, `SEC-16`).
  4. Faculty, Department, Programme, and Academic Session creation, updates, and status transitions (`F-09`–`F-12`).
  5. Institutional User registration/import, profile updates, password recovery triggers, and deactivation (`F-13`), Role assignments/revocations (`F-14`), Coordinator appointments (`F-15`), and Supervisor eligibility changes (`F-16`).
  6. Security events: failed login lockouts (`F-64`) and unauthorized access attempts (`403 Forbidden` in `F-08`, `F-18`, `F-66`, `F-77`).
* **FR-280:** The Audit Process (`NFR-AUD`, `mvp-p.md` §9) must automatically record an immutable audit log entry for every **Critical Academic Decision**:
  1. Student cohort registration (`F-19`), Project allocation (`F-21`), Group creation/membership changes (`F-22`), and Designated Submitter changes (`F-23`).
  2. Topic Proposal approvals, rejections, and alternative topic suggestions (`F-20`).
  3. Supervisor assignments (`F-24`) and Supervisor reassignments (`F-27`).
  4. Milestone configurations and deadline changes (`F-29`, `F-30`).
  5. Milestone and Final Submission approvals, revision requests, and rejections (`F-33`).
  6. Deadline extension recommendations, approvals, and rejections (`F-42`).
  7. Late submission penalty rule changes and Coordinator penalty overrides (`F-44`).
  8. Project Examiner appointments/removals (`F-46`), Panel configurations (`F-47`), and Defence schedule creations/updates (`F-49`).
  9. Assessment Structure configuration changes (`F-51`).
  10. Examiner Assessment submissions and post-submission edits (`F-55`).
  11. Supervisor Performance Assessment submissions and post-submission edits (`F-39`, `F-56`).
  12. Final Result Approvals (`F-59`) and Project Result Publications (`F-60`).
* **FR-281:** Every audit record must capture (`NFR-AUD`):
  1. Unique `Audit Entry ID` and cryptographic integrity chain/hash.
  2. `Actor Identity` (`User ID`, `Full Name`, `Role`, `IP Address` / `System Service Name`).
  3. `Action Performed` (standardized event code).
  4. `Affected Record Type` and `Affected Record ID`.
  5. `Institution ID` (`F-01`) and relevant `Academic Scope` (`Programme ID`, `Academic Session ID`, `Project ID` where applicable).
  6. Authoritative `Server Timestamp` (UTC + Institutional Timezone).
  7. `Previous Value` and `Resulting Value` (for updates, status changes, grade edits, and overrides — respecting `F-08`/`F-18` confidentiality in admin views).
  8. `Outcome` (`SUCCESS`, `DENIED`, `FAILED`) and `Reason / Justification` (where applicable).
* **FR-282:** **Tamper Resistance (`NFR-AUD`, `mvp-p.md` §9):** The system must strictly prohibit any user or administrator (including Platform Admins and Institutional Admins) from modifying, overwriting, or deleting any recorded audit log entry.
* **FR-283:** The system must provide scoped, read-only Audit Log viewers:
  1. **Platform Admin:** Views platform-level administrative and security audit logs (without exposing confidential academic content per `F-08`).
  2. **Institutional Admin:** Views administrative audit logs scoped strictly to their own institution (`BR-01`, `F-18` — excluding confidential academic feedback/scores).
  3. **Project Coordinator:** Views academic decision audit logs scoped strictly to their assigned Programme and Academic Session (`BR-03`).
* **FR-284:** Audit log retention must be configurable per institutional policy and legal obligations (`NFR-AUD: Retention`, `OD-15` / `NFR-OPEN-05`).

### D. User Interaction and Behaviour

* **Access:** Platform Admin via "Platform Console -> Audit Logs"; Institutional Admin via "Institution Console -> Administrative Audit Logs"; Project Coordinator via "Programme Workspace -> Academic Decision Audit Log".
* **Information Viewed:** Filterable, searchable, paginated audit table (filterable by Date Range, Actor, Action Type, Affected Entity, and Outcome) and detail drawer showing timestamp, actor, scope, reason, and before/after state diff.
* **Actions Performed:** View/Filter Audit Logs, Export Scoped Audit Log (CSV/JSON for institutional archive `FR-006`). No Create, Edit, or Delete actions exist for any human user.

### E. Business Rules

* **BR-01, BR-02, BR-08, BR-25 & BR-28:** Scoped audit visibility; general routine browsing/page-view tracking is excluded (`BR-28`), while administrative actions and critical academic decisions (`NFR-AUD`) are mandatory.
* **NFR-AUD:** Audit records must be protected against unauthorized modification or deletion.

### F. Permissions and Access Control

* **Audit Process:** Append-only write access.
* **Platform Admin, Institutional Admin, Project Coordinator:** Scoped read-only access per `FR-283`.
* **No Actor:** Update or delete access (`403/405 Method Not Allowed`).

### G. Data Requirements

* **Captured/Preserved:** Audit Entry ID, Institution ID (nullable for global events), Programme ID (nullable), Academic Session ID (nullable), Project ID (nullable), Actor User ID / System Actor, Actor Role, Action Code, Target Entity Type, Target Entity ID, Previous State Snapshot (JSON), Resulting State Snapshot (JSON), Justification/Reason Text, Outcome, IP/User-Agent Metadata, Integrity Hash, Immutable Created Timestamp.

### H. Dependencies and Integrations

* **Required Features:** `F-64`, `F-66`.
* **Consumed By:** All administrative and critical academic features (`F-01`–`F-83`).

### I. Acceptance Criteria

* **AC-F82-01 (Positive — Comprehensive Audit Capture With Before/After Values):** Given a Project Coordinator overrides a late penalty (`F-44`) OR an Examiner edits a submitted score (`F-55`) OR an Institutional Admin changes a user's role (`F-14`), When the action commits, Then `F-82` automatically writes an audit record containing Actor ID, Role, Institution/Programme Scope, Timestamp, Previous Value, Resulting Value, and Reason (`SYS-19`, `NFR-AUD`).
* **AC-F82-02 (Tamper Resistance — Immutability of Audit Records):** Given an existing audit log record in `F-82`, When any actor (including an authenticated Platform Admin or Institutional Admin) attempts to edit, overwrite, or delete the audit record, Then the system rejects the operation and preserves the record unaltered (`NFR-AUD`).
* **AC-F82-03 (Confidentiality & Tenant Isolation in Audit Views):** Given an Institutional Admin of Institution A viewing the Administrative Audit Log, When they query audit records, Then they cannot see any audit records from Institution B (`BR-01`) and cannot see confidential academic feedback or student grade values in Institution A (`F-18`, `BR-25`).

---

## F-83: Data Backup and Recovery

### A. Feature Identification

* **Feature ID:** F-83
* **Feature Name:** Data Backup and Recovery
* **Feature Category:** Audit & Backup Infrastructure (Supporting System Capability)
* **Primary Actor:** Backup Process (Supporting System Actor), Platform Admin (monitors backup status & executes recovery drills)
* **Supporting Actors:** File Storage Service (`F-76`–`F-78`), Audit Process (`F-82`)
* **MVP Priority:** P0
* **Source User Stories:** SYS-20
* **Short Feature Description:** Maintains automated, encrypted **hourly backups** of all platform databases, uploaded academic documents (`F-76`–`F-78`), and audit logs (`F-82`) with a **30-day routine retention period**, enforcing a **Recovery Point Objective (`RPO`) of $1\text{ hour}$**, a **Recovery Time Objective (`RTO`) of $4\text{ hours}$**, operational failure alerting (`REL-10`), and periodic restoration verification (`SYS-20`, `NFR-BKP`, `NFR-REL`).

### B. Business Purpose

* **Problem Solved:** Hardware failures, storage corruption, or catastrophic operational incidents could otherwise result in the permanent loss of students' final-year dissertations, examination grades, and institutional records.
* **Necessity for Clario:** Implements `SYS-20`, `REL-06`–`REL-10`, and `NFR-BKP` (`mvp-p.md` §9).
* **Business/Academic Value:** Guarantees business continuity and academic data survivability within strict, contractually defined recovery bounds ($\text{RPO} \le 1\text{ hour}$, $\text{RTO} \le 4\text{ hours}$).
* **Impact if Omitted:** A qualifying infrastructure disaster could cause permanent loss of academic records and violate `mvp-p.md` §9 and §12 release criteria.

### C. Functional Requirements

* **FR-285:** The Backup Process (`SYS-20`, `REL-06`, `NFR-BKP`) must automatically execute recoverable backups **at least once every hour (Hourly Backups)** covering:
  1. All structured relational/transactional data across all institutional tenants (`F-01`–`F-75`).
  2. All uploaded project documents and preserved document versions (`F-76`, `F-78`).
  3. All administrative and academic audit records (`F-82`).
* **FR-286:** Every backup archive and snapshot must be **encrypted in transit and at rest (`SEC-17`, `SEC-18`, `SEC-19`, `NFR-BKP`)** and stored in a fault-isolated secondary storage location separate from primary production compute/storage.
* **FR-287:** The backup system must enforce a **routine backup retention period of $30\text{ days}$ (`NFR-BKP`)**, automatically expiring routine snapshots older than $30\text{ days}$ in accordance with the data-retention and post-termination deletion policy (`NFR-BKP: Institutional termination`, `OD-10`).
* **FR-288:** The backup and recovery architecture must satisfy:
  1. **Recovery Point Objective ($\text{RPO}$): $\le 1\text{ hour}$ (`REL-07`)** — maximum acceptable data loss following a recoverable incident must never exceed $1\text{ hour}$.
  2. **Recovery Time Objective ($\text{RTO}$): $\le 4\text{ hours}$ (`REL-08`)** — complete service and data restoration following a qualifying disaster must complete within $4\text{ hours}$.
* **FR-289:** The system must continuously monitor backup execution and integrity (`REL-10`, `NFR-MON`): any delayed, incomplete, or failed hourly backup job must immediately generate a high-severity operational alert to Platform Admins.
* **FR-290:** The system must support **periodic backup restoration testing (`REL-09`)** into an isolated recovery-verification environment (without disrupting live production tenants) and log the restoration drill outcome, duration (verifying $\text{RTO} \le 4\text{ hours}$), and data-integrity checksum verification in `F-82` (with exact drill schedule tracked under `OD-17` / `NFR-OPEN-07`).

### D. User Interaction and Behaviour

* **Access:** Automated background infrastructure service; Platform Admin accesses "Platform Console -> Operations -> Backups & Disaster Recovery" to view backup status, retention inventory, failure alerts, and recovery test logs.
* **Information Viewed:** Latest Successful Backup Timestamp, Current $\text{RPO}$ Compliance badge (`Healthy < 1h` vs. `Breach Risk`), Backup Retention list ($30\text{ days}$), Encryption Status (`Encrypted`), Last Restoration Drill Timestamp & Measured $\text{RTO}$, and Operational Alerts.

### E. Business Rules

* **REL-06 to REL-10 & NFR-BKP:**
  * Backup frequency: **Hourly**.
  * Routine backup retention: **$30\text{ days}$**.
  * $\text{RPO}$: **$1\text{ hour}$**.
  * $\text{RTO}$: **$4\text{ hours}$**.
  * Backup encryption: **Mandatory (`SEC-19`)**.
  * Backup recovery testing: **Mandatory (`REL-09`)**.
  * Backup failure alerts: **Mandatory (`REL-10`)**.

### F. Permissions and Access Control

* **Backup Process:** Automated system permission to read/snapshot encrypted production stores and write to isolated backup storage.
* **Platform Admin:** Authorised to monitor backup health and trigger/verify isolated recovery drills (`F-82` audited); cannot use backups to bypass `F-08` academic confidentiality in production.

### G. Data Requirements

* **Captured:** Backup Job ID, Backup Type (`HOURLY_INCREMENTAL`, `FULL_SNAPSHOT`), Scope (`DATABASE`, `OBJECT_STORAGE`, `AUDIT_LOGS`), Start Timestamp, Completion Timestamp, Backup Size (bytes), Encryption Key ID (`SEC-19`), Integrity Checksum (`SHA-256`), Retention Expiry Timestamp (`Created + 30 days`), Status (`COMPLETED`, `FAILED`), Recovery Drill Log ID & Measured Restoration Duration (`RTO`).

### H. Dependencies and Integrations

* **Required Features:** `F-76`, `F-78`, `F-82`.

### I. Acceptance Criteria

* **AC-F83-01 (Positive — Automated Encrypted Hourly Backup & 30-Day Retention):** Given Clario is running in production, When each hourly backup schedule triggers (`REL-06`), Then `F-83` captures a consistent backup of structured data, uploaded documents (`F-76`, `F-78`), and audit logs (`F-82`), encrypts the backup at rest (`SEC-19`), sets its routine retention expiry to $30\text{ days}$, and logs completion (`SYS-20`).
* **AC-F83-02 (Disaster Recovery — RPO <= 1 Hour & RTO <= 4 Hours Verification):** Given a simulated qualifying disaster in a recovery-testing exercise (`REL-09`), When restoration is executed from the latest hourly backup, Then full platform service, tenant isolation (`BR-01`), project documents (`SHA-256` verified), and audit records are restored within $4\text{ hours}$ ($\text{RTO} \le 4\text{ h}$, `REL-08`) with zero data loss beyond the $1\text{-hour}$ backup window ($\text{RPO} \le 1\text{ h}$, `REL-07`).
* **AC-F83-03 (Monitoring — Immediate Alert on Backup Failure):** Given an hourly backup job encounters a storage or network error, When the backup job fails (`REL-10`), Then `F-83` immediately emits a high-priority operational alert (`NFR-MON`) to Platform Admins and schedules an automatic retry.