# Clario — MVP UI/UX Screen Architecture, User Flows & Wireframing Specification (Part 1)

**Document:** `ui-ux-architecture-part1.md`  
**Scope:** Global Responsive Web Shell, WCAG 2.2 AA Accessibility, Offline/Upload States, Shared Authentication Views, Platform Admin Portal, and Institutional Admin Portal  
**Target Platform:** Responsive Web Application (Desktop `>= 1280px`, Tablet `768px–1279px`, Mobile Web `360px–767px`)  
**Supported Browsers:** Latest two major versions of Chrome, Edge, Firefox, and Safari (`USA-04`)

---

## 1. Global Responsive Web Shell & Navigation Architecture

Every authenticated screen in Clario renders inside a unified **Responsive Application Shell** that adapts to the user's viewport and strictly enforces role, institution, and assignment scope (`F-65`, `F-66`).

### 1.1 Global Application Shell Wireframe (Desktop & Mobile Breakpoints)

```
+--------------------------------------------------------------------------------------------------+
| [Clario Logo] | [Tenant Badge: University of Lagos (WAT)] | [Role/Scope Switcher v] | [Bell(3)] [Profile v] |
+---------------+----------------------------------------------------------------------------------+
| [Sub-Banner]  | (Conditional: Subscription Grace Period Warning / Offline Draft Mode / Session Timeout) |
+---------------+----------------------------------------------------------------------------------+
| LEFT NAV      | BREADCRUMB: Institution > Faculty > Programme > Current View                     |
| (Collapsible  +----------------------------------------------------------------------------------+
|  on Tablet/   | PAGE HEADER: Title                                     [Primary Action CTA]      |
|  Drawer on    | Subtitle / Context Metadata                                                      |
|  Mobile)      +----------------------------------------------------------------------------------+
|               |                                                                                  |
| * Dashboard   | MAIN WORKSPACE CANVAS                                                            |
| * Nav Item 2  | - KPI Summary Cards (1 col mobile, 2 col tablet, 4 col desktop)                  |
| * Nav Item 3  | - Filter & Search Bar                                                            |
| * Nav Item 4  | - Primary Data Table / Split-Pane Review / Form View                             |
| * Nav Item 5  |                                                                                  |
|               |                                                                                  |
| ------------- |                                                                                  |
| [Active Scope]|                                                                                  |
| B.Sc. CompSci |                                                                                  |
| 2026/2027     |                                                                                  |
+---------------+----------------------------------------------------------------------------------+
```

### 1.2 Global Top Header Components (`F-01`, `F-12`, `F-14`, `F-15`, `F-65`, `F-72`)
1. **Institutional Tenant & Timezone Badge (`BR-01`, `BR-NEW-01`):**
   - Displays the authenticated user's Institution Name/Code and authoritative timezone badge (e.g., `UNILAG • WAT (UTC+1)`).
   - For `Platform Admin`, displays `Clario Platform Console (Global Scope)`.
2. **Active Role & Coordinator Scope Switcher (`F-14`, `F-15`, `F-65`):**
   - If an academic staff member holds multiple roles (e.g., `Project Coordinator`, `Project Supervisor`, and `Project Examiner` per `FR-046`), this dropdown allows explicit switching of active role context without logging out.
   - When `Project Coordinator` is active and the user holds multiple Coordinator Appointments (`F-15`), a secondary selector forces selection of **exactly one `(Programme, Academic Session)` pair** at a time (`BR-03`, `FR-050`).
3. **In-App Notification Bell & Drawer Trigger (`F-72`):**
   - Displays an unread counter badge (e.g., `3` unread). Clicking opens the slide-over **Notification Center Drawer** (`SCR-GLB-05`).
4. **User Profile & Session Menu (`F-65`):**
   - Displays User Name, Institutional ID (Staff/Matric No.), Active Role pill, "Account & Security Settings" link, and "Log Out" button (`FR-227`).

---

## 2. Global Component States, Offline Resilience & Accessibility (`WCAG 2.2 AA`)

All 75 P0 features must implement standardized UI states and accessibility primitives.

### 2.1 Standardized UI Component States

| State Category | Visual & Behavioural Specification | Applicable Features |
|---|---|---|
| **1. Loading State** | • **Initial Page/Table Load:** Shimmer skeleton placeholders matching the exact layout of KPI cards and table rows (`aria-busy="true"`, `aria-live="polite"`).<br>• **Form Submission / Action:** Primary button enters disabled state with inline spinner and action verb (e.g., `"Approving Result..."`), preventing double-clicks (`FR-233`). | All User-Facing Features (`PER-01` $< 2\text{ s}$ target) |
| **2. Empty State** | • Centered illustration/icon, clear heading explaining *why* the view is empty, and a direct contextual CTA button if the actor has creation authority.<br>• *Example (`F-29`):* `"No milestones configured for B.Sc. Computer Science (2026/2027) — [+ Configure First Milestone]"`.<br>• *Filtered Empty State:* `"No projects match your current filters — [Clear All Filters]"`. | All Directory, Table & Workspace Views |
| **3. Inline Validation & Error State** | • **Field-Level:** Red border (`#DC2626`) + warning icon (never color alone per `WCAG 1.4.1`) + specific error message below field linked via `aria-describedby`. Focus moves automatically to the first invalid field on submit.<br>• **Rule/Conflict Banner:** Top alert banner (`role="alert"`) explaining business-rule blocks (e.g., `BR-16`: *"Dr. Musa cannot be appointed Examiner because they supervised this project"*). | All Forms & Workflow Actions |
| **4. Offline Draft Preservation State (`NFR-USA`)** | • When browser `navigator.onLine` becomes `false` while a user is typing topic proposals (`F-20`), submission notes (`F-32`), discussion comments (`F-34`), or assessment rubrics (`F-52`–`F-56`):<br>  1. Top sub-banner turns Amber: `"Offline Mode — Your draft changes are saved locally on this device. Formal submissions and approvals require an active internet connection."`<br>  2. All formal action buttons (`Submit`, `Approve`, `Reject`, `Publish`) are disabled with tooltip `"Requires active connection"` (`NFR-USA`). | `F-20`, `F-32`, `F-34`, `F-35`, `F-52`–`F-56`, `F-65` |
| **5. Interrupted Upload Queue & Retry State (`DAT-03`, `DAT-05`)** | • File upload component (`F-32`, `F-35`, `F-37`, `F-76`) displays a 4-stage progress tracker:<br>  `[1. Uploading Bytes (64%)] -> [2. Server Virus & Magic-Byte Scan] -> [3. Version Preservation] -> [4. Formal Submission Confirmed]`<br>• If connectivity drops during Stage 1: Progress bar pauses in Amber state: `"Connection interrupted at 64% — Upload queued (Token #UPL-8821) and will automatically resume when online. Not yet formally submitted."`<br>• Only when Stage 4 completes does the UI render the green **Formal Submission Confirmation Receipt** (`DAT-03`). | `F-32`, `F-34`, `F-35`, `F-37`, `F-42`, `F-76` |
| **6. Session Inactivity Warning Modal (`SEC-07`, `F-65`)** | • $2\text{ minutes}$ prior to role-based inactivity expiration (`FR-226`), a focus-trapped modal (`role="alertdialog"`) appears with a live countdown (`01:59`) and two actions: `[Stay Logged In]` (primary focus) and `[Log Out Now]`. Unsaved local drafts are automatically written to encrypted local storage before expiration (`FR-228`). | All Authenticated Views (`F-65`) |

### 2.2 WCAG 2.2 Level AA Compliance Specifications (`USA-03`)
1. **Color Contrast & Non-Color Indicators (`1.4.1`, `1.4.3`, `1.4.11`):**
   - Text contrast ratio $\ge 4.5:1$ for normal text and $\ge 3:1$ for large text and UI boundaries.
   - Status badges (`Approved`, `Rejected`, `Overdue`, `Submitted Late`, `Locked`) **must** pair color with a distinct icon (`✓`, `✕`, `!`, `🔒`) and explicit text label.
2. **Keyboard Navigation & Focus Management (`2.1.1`, `2.4.3`, `2.4.7`, `2.4.11`):**
   - Every interactive control (milestone accordions, file dropzones, rubric inputs, modals, role switchers) is operable via `Tab`, `Shift+Tab`, `Enter`, `Space`, and `Escape`.
   - Visible focus ring (`2px solid #2563EB`, `2px offset`) that is never obscured by sticky headers (`WCAG 2.4.11 Focus Not Obscured`).
3. **Target Size (`WCAG 2.5.8`):**
   - All interactive buttons, pagination controls, and table row action triggers maintain a minimum touch/click target of **$24 \times 24\text{ CSS pixels}$** ($44 \times 44\text{ px}$ on mobile breakpoints).
4. **Accessible Authentication (`WCAG 3.3.8`):**
   - Login (`F-64`) and MFA input fields permit password-manager paste/autofill and do not block copy-paste into password or TOTP fields.

---

## 3. Shared Authentication, Security & Notification Screens (`F-64`–`F-66`, `F-72`)

### 3.1 Screen Inventory (Shared Views)

| Screen ID | Screen Name | Feature IDs | Actors | Purpose |
|---|---|---|---|---|
| **SCR-GLB-01** | Login & Identity Verification | `F-64`, `F-65` | All Human Actors | Email/Institutional ID + Password login with rate-limit/lockout feedback. |
| **SCR-GLB-02** | Account Activation & Password Setup | `F-01`, `F-05`, `F-13`, `F-64` | Invited Users | Single-use token onboarding, $\ge 12\text{-char}$ & breach-screened password setup. |
| **SCR-GLB-03** | Mandatory MFA Enrollment & Challenge | `F-05`, `F-14`, `F-15`, `F-64` | Platform Admin, Inst. Admin, Coordinator | TOTP QR enrollment, recovery codes download, and 6-digit MFA challenge gate (`SEC-06`). |
| **SCR-GLB-04** | Password Recovery Request & Reset | `F-13`, `F-64` | All Human Actors | Self-service email recovery initiation and token-based password reset (`SEC-08`). |
| **SCR-GLB-05** | In-App Notification Center (Drawer & Full Page) | `F-40`, `F-72`–`F-75` | All Human Actors | Persistent in-app notification feed with `All`/`Unread` filter and deep-link routing. |
| **SCR-GLB-06** | Access Denied / Subscription Restricted Gate | `F-08`, `F-18`, `F-66`, `F-70` | All Human Actors | Standardized `403 Forbidden` (academic confidentiality/scope) and Subscription Expired screen. |

### 3.2 Key Wireframe: Mandatory MFA Enrollment & Challenge (`SCR-GLB-03` — `F-64`, `SEC-06`)

```
+-----------------------------------------------------------------------+
|                       CLARIO SECURITY VERIFICATION                    |
|      Multi-Factor Authentication Required for Your Role (SEC-06)      |
+-----------------------------------------------------------------------+
| STEP 1: Scan QR Code with Authenticator App   | STEP 2: Verify Code   |
| +-------------------+                         | Enter 6-digit code:   |
| |   [ QR CODE ]     |  Can't scan?            | [ _ ][ _ ][ _ ]       |
| |   [  IMAGE  ]     |   [Copy Manual Secret]   | [ _ ][ _ ][ _ ]       |
| +-------------------+                         |                       |
|                                               | [x] I have saved my   |
| Recovery Codes (Download before continuing):  |     recovery codes    |
| [Download Recovery Codes (.txt)]              |                       |
|                                               | [Verify & Activate ->]|
+-----------------------------------------------------------------------+
```

---

## 4. Actor 1: Platform Admin Portal (`F-01`–`F-05`, `F-08`, `F-82`, `F-83`)

### 4.1 Platform Admin Navigation Map

```
Platform Admin Console (Global Scope)
├── 1. Platform Overview & Tenants Directory (SCR-PA-01) [F-01, F-03]
│   ├── Create Institutional Tenant Modal/Drawer (SCR-PA-02) [F-01]
│   └── Institution Detail, Suspension & Data Export View (SCR-PA-03) [F-01, F-08]
├── 2. Subscription Plans Catalogue (SCR-PA-04) [F-02]
├── 3. Institutional Subscriptions, Billing & Grace Periods (SCR-PA-05) [F-03, F-04, F-68, F-69]
├── 4. Platform Administrators (SCR-PA-06) [F-05]
├── 5. Platform Audit Logs (SCR-PA-07) [F-08, F-82]
└── 6. Backups, Disaster Recovery & System Health (SCR-PA-08) [F-83, NFR-MON]
```
*(Strict Confidentiality Boundary `F-08`: No navigation links, search bars, or routes exist in the Platform Admin Portal to browse institutional projects, student submissions, or grades).*

### 4.2 Platform Admin Screen Specifications

#### `SCR-PA-01` & `SCR-PA-03`: Institutional Account Directory & Tenant Detail (`F-01`, `F-08`)
- **KPI Summary Row:**
  1. `Total Institutions` (e.g., `14 / 20 Launch Target` `SCA-01`)
  2. `Active Subscriptions` (`12 Active`, `1 Grace Period`, `1 Expired`)
  3. `Total Platform Registered Users` (`42,850`)
  4. `Backup & RPO Status` (`Healthy — Last Hourly Backup 18 mins ago` `F-83`)
- **Tenants Directory Table:**
  - *Columns:* Institution Name, Code/Slug, Timezone (`Africa/Lagos`), Account Status (`Pending Activation`, `Active`, `Suspended`, `Pending Termination`), Subscription Status (`F-03`), Active Users (`e.g., 3,420 / 5,000`), Created Date, Actions (`View/Edit`, `Suspend/Activate`, `Export Archive`).
  - *Filters:* Account Status, Subscription Status, Search by Name/Code.
- **Create / Edit Institution Drawer (`SCR-PA-02`):**
  - *Fields:* Institution Name (required), Institution Code/Slug (required, unique), Country (`Nigeria`), Configured Timezone (IANA selector defaulting to `Africa/Lagos` `FR-001`), Primary Contact Name, Primary Contact Email (triggers onboarding invite `FR-002`), Primary Contact Phone, Initial Status.
- **Suspend / Terminate & Export Modal (`FR-003`, `FR-006`, `F-08`):**
  - Transitioning to `Suspended` or `Pending Termination` requires a mandatory **Reason for Status Change** ($10$–$500$ chars).
  - Initiating an **Institutional Data Archive Export (`FR-006`)** requires a mandatory **Institutional Support Request Reference & Justification** (`FR-024`, `SEC-16`), logging a high-priority audit entry visible to the institution's Institutional Admin.

#### `SCR-PA-04`: Subscription Plan Management (`F-02`)
- **Plans Table:** Plan Name, Plan Code, Billing Interval (`Annual`, `Semester/Session`, `Monthly`), Price in `NGN` (displayed as `₦2,500,000.00` and stored in integer kobo `250000000` `FR-007`), Max Active Users ($1\dots 5,000$), Subscribed Tenants Count, Status (`Draft`, `Active`, `Archived`), Actions (`Create Plan`, `Edit Plan`, `Archive Plan`).
- **Validation Behaviour:** If `Subscribed Tenants Count > 0`, the `Delete` action is hidden/disabled and only `Archive Plan` is permitted (`FR-009`), displaying an informational note that existing active subscriptions retain their contracted terms until renewal (`FR-008`).

#### `SCR-PA-05`: Institutional Subscriptions, Billing & Grace Periods (`F-03`, `F-04`, `F-68`–`F-70`)
- **Tabs:**
  1. `Institutional Subscriptions` (Filterable by `Active`, `Grace Period`, `Expired`, `Pending Payment`).
  2. `Grace Period & Restriction Policy` (`F-04` — Global Default Grace Period Days input $0\dots 90$, Per-Institution Override with mandatory justification `FR-015`, and Grace Period / Expired permission matrix toggles `FR-017` / `OD-06`).
  3. `Payment Transactions & Webhook Log` (`F-67`–`F-69` — Transaction Reference, Institution, Amount in `NGN`, Gateway Event ID, Signature Verification Status `VERIFIED`/`REJECTED`, Processing Status `PROCESSED`/`DUPLICATE_IGNORED`/`DISCREPANCY`).

#### `SCR-PA-06`: Platform Administrator Management (`F-05`)
- **Table & Actions:** Lists all Platform Admins (Name, Email, Status `Invited`/`Active`/`Deactivated`, MFA Status `Enrolled`/`Pending`, Last Login).
- **Guardrails:** The `Deactivate` button is disabled on the currently logged-in Platform Admin's own row (`FR-021`) with tooltip `"You cannot deactivate your own account"`.

#### `SCR-PA-07` & `SCR-PA-08`: Platform Audit Logs & Disaster Recovery Console (`F-82`, `F-83`)
- **Audit Log Viewer (`SCR-PA-07`):** Read-only filterable ledger (Date Range, Actor, Institution, Action Code, Outcome) with a slide-over **Before/After JSON State Diff Inspector** (`FR-281`). Zero edit or delete buttons exist (`FR-282`).
- **Backup & Disaster Recovery Console (`SCR-PA-08`):** Displays hourly backup timeline (`REL-06`), 30-day retention inventory (`FR-287`), encryption status badge (`AES-256 Encrypted`), $\text{RPO} \le 1\text{h}$ / $\text{RTO} \le 4\text{h}$ compliance indicators (`FR-288`), operational alert feed (`FR-289`, `NFR-MON`), and `[Log / Trigger Isolated Recovery Verification Drill]` (`FR-290`).

---

## 5. Actor 2: Institutional Admin Portal (`F-03`, `F-09`–`F-16`, `F-18`, `F-67`–`F-70`)

### 5.1 Institutional Admin Navigation Map

```
Institutional Admin Console (Scoped to Single Institution — BR-01)
├── 1. Institution Overview & Structure Summary (SCR-IA-01) [F-09–F-12]
├── 2. Academic Structure Management (SCR-IA-02)
│   ├── Tab A: Faculties [F-09]
│   ├── Tab B: Departments [F-10]
│   ├── Tab C: Programmes [F-11]
│   └── Tab D: Academic Sessions & Timezone [F-12, PROP-04]
├── 3. Users & Roles Directory (SCR-IA-03) [F-13, F-14]
│   ├── Single User Creation & Role Assignment Modal [F-13, F-14]
│   ├── Bulk CSV User Import Wizard (with Row Validation Preview) [F-13]
│   └── Under-18 Parental/Guardian Consent Tracker [F-13, PROP-05]
├── 4. Project Coordinator Appointments (SCR-IA-04) [F-15]
├── 5. Supervisor Eligibility Directory (SCR-IA-05) [F-16]
├── 6. Subscription & Billing Portal (SCR-IA-06) [F-03, F-04, F-67, F-69, F-70]
└── 7. Institutional Administrative Audit Logs (SCR-IA-07) [F-18, F-82]
```
*(Strict Confidentiality Boundary `F-18` / `BR-25`: Institutional Admins have zero navigation routes or UI components to view student project workspaces, topic proposals, uploaded documents, supervisory feedback, or grades).*

### 5.2 Institutional Admin User Flows & Wireframes

#### 5.2.1 Academic Structure Hierarchy Setup Flow (`SCR-IA-02` — `F-09` to `F-12`)
```
[Step 1: Create Faculty (F-09)] 
       │  (Validates unique Faculty Name & Code within Institution)
       ▼
[Step 2: Create Department under Active Faculty (F-10)]
       │  (Validates parent Faculty is Active; unique Dept Code)
       ▼
[Step 3: Create Programme under Active Department (F-11)]
       │  (e.g., B.Sc. Computer Science [BENG-CSC])
       ▼
[Step 4: Create & Activate Academic Session (F-12)]
       │  (e.g., 2026/2027, Start: 2026-10-01, End: 2027-07-31, Timezone: Africa/Lagos)
       ▼
[Unlocks: Project Coordinator Appointment (F-15) for (Programme + Session)]
```
- **Destructive/Archive Safeguards (`FR-027`, `FR-030`, `FR-033`, `FR-037`):**
  - Attempting to archive a Faculty with active Departments, a Department with active Programmes, or a Programme with active Session projects displays a blocking modal listing the active child entities that must be archived or closed first.
  - Clicking `[Close Academic Session]` (`FR-037`) opens a high-friction confirmation dialog requiring the Admin to type the session label (e.g., `2026/2027`) to confirm that all projects and results in that session will become permanently read-only.

#### 5.2.2 Users Directory, Bulk CSV Import & Role Compatibility (`SCR-IA-03` — `F-13`, `F-14`)
- **Capacity Meter Bar (`FR-039`, `SCA-02`):** Displayed at the top of the Users Directory: `"Active & Invited Users: 3,420 / 5,000 Plan Limit (68.4%)"`.
- **Role Compatibility Matrix Control (`FR-046`, `FR-047`):**
  - In the "Assign Roles" checkboxes: selecting `[x] Student` automatically disables `Institutional Admin`, `Project Coordinator`, `Project Supervisor`, and `Project Examiner` checkboxes with inline explanation (`FR-046`).
  - Selecting `Institutional Admin` or `Project Coordinator` displays an automatic badge: `"Requires Mandatory MFA on Login (SEC-06)"` (`FR-048`).
- **Bulk CSV Import 3-Step Wizard (`FR-038`):**
  - *Step 1:* Download CSV Template & Upload `.csv` file.
  - *Step 2 (Validation Preview Table):* Displays parsed rows split into `Valid Rows Ready to Import (245)` and `Rows with Errors (3)` (highlighting duplicate emails, invalid Matric/Staff IDs, or plan capacity overflow with exact line numbers).
  - *Step 3:* Confirm Import & Dispatch Activation Emails (`F-71`).
- **Account Recovery & Under-18 Consent Actions (`FR-041`, `FR-044`):**
  - Each user row includes actions to `Send Password Reset Email`, `Clear Temporary Login Lockout` (`SEC-08`), `Deactivate User` (revoking active sessions immediately per `FR-043`), and (for students flagged `Under-18`) `Manage Guardian Consent Status` (`Pending`, `Verified`, `Statutory Educational Basis`).

#### 5.2.3 Project Coordinator Appointment Screen (`SCR-IA-04` — `F-15`, `BR-03`)
```
+--------------------------------------------------------------------------------------------------+
| PROJECT COORDINATOR APPOINTMENTS (F-15)                           [+ Appoint Coordinator]        |
| Rule BR-03: Each Coordinator appointment is bound to ONE Programme and ONE Academic Session.     |
+--------------------------------------------------------------------------------------------------+
| Filter: [Faculty: All v] [Department: All v] [Programme: All v] [Session: 2026/2027 (Active) v]  |
+--------------------------------------------------------------------------------------------------+
| Coordinator Name  | Staff ID | Programme                | Academic Session | MFA Status | Action |
|-------------------|----------|--------------------------|------------------|------------|--------|
| Dr. Tunde Adewale | STF-0192 | B.Sc. Computer Science   | 2026/2027        | Enrolled   |Manage v|
| Prof. Ngozi Eze   | STF-0041 | B.Sc. Software Eng.      | 2026/2027        | Enrolled   |Manage v|
| Dr. Tunde Adewale | STF-0192 | B.Sc. Cyber Security     | 2026/2027        | Enrolled   |Manage v|
+--------------------------------------------------------------------------------------------------+
```
- **Appoint Coordinator Modal (`FR-049`–`FR-052`):**
  1. `Select Staff User` (searchable dropdown of active non-student users).
  2. `Select Programme` (single-select dropdown of active Programmes `F-11`).
  3. `Select Academic Session` (single-select dropdown of `Upcoming` or `Active` Sessions `F-12`).
  4. Submitting grants the `Project Coordinator` role (`F-14`), flags mandatory MFA (`SEC-06`), logs in `F-82`, and notifies the appointee (`F-71`, `F-72`).

#### 5.2.4 Institutional Subscription & Billing Portal (`SCR-IA-06` — `F-03`, `F-67`–`F-70`)
```
+--------------------------------------------------------------------------------------------------+
| SUBSCRIPTION & BILLING PORTAL (F-03 / F-67)                                                      |
+--------------------------------------------------------------------------------------------------+
| [!] GRACE PERIOD WARNING BANNER (Visible when Status = Grace Period):                            |
| Your institutional subscription expired on 30 Nov 2026. You have 11 days remaining in your       |
| grace period (ends 14 Dec 2026 23:59 WAT) before access restrictions apply. [Renew Now]          |
+--------------------------------------------------------------------------------------------------+
| CURRENT SUBSCRIPTION CARD                     | BILLING PROFILE CARD                             |
| Plan: Clario University Enterprise (Annual)   | Legal Name: University of Lagos                  |
| Status: [ ACTIVE ]                            | Billing Email: bursary-it@unilag.edu.ng          |
| Current Period: 01 Dec 2025 – 30 Nov 2026 WAT | Tax / RC No: RC-0001928                          |
| Capacity: 3,420 / 5,000 Active Users          | Currency: Nigerian Naira (NGN)                   |
| [Select Plan / Renew Subscription (NGN)]      | [Edit Billing Information]                       |
+-----------------------------------------------+--------------------------------------------------+
| PAYMENT & INVOICE HISTORY                                                                        |
| Ref             | Date             | Plan        | Amount (NGN)      | Status       | Receipt    |
|-----------------|------------------|-------------|-------------------|--------------|------------|
| TX-UNILAG-0092  | 01 Dec 2025      | Enterprise  | NGN 2,500,000.00  | [SUCCEEDED]  | [Download] |
| TX-UNILAG-0104  | 02 Dec 2026      | Enterprise  | NGN 2,500,000.00  | [FAILED]     | [Retry Pay]|
+--------------------------------------------------------------------------------------------------+
```
- **Payment Checkout & Verification Behaviour (`FR-232`–`FR-235`):**
  - Clicking `[Select Plan / Renew Subscription]` validates that the selected plan's `Max User Capacity >= Current Active Users` (`AC-F03-02`).
  - Clicking `[Proceed to Payment Gateway]` disables the button (`"Initializing Secure Checkout..."`), generates a unique idempotent transaction reference (`F-67`), and launches the payment gateway checkout in `NGN`.
  - Upon return from the gateway, the screen displays a live polling/webhook verification state (`"Awaiting Server Payment Verification (DAT-10)..."`) until `F-68` and `F-69` confirm the cryptographic webhook and transition the badge to `[ACTIVE]`.