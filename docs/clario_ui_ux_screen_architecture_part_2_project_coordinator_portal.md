# Clario — MVP UI/UX Screen Architecture, User Flows & Wireframing Specification (Part 2)

**Document:** `ui-ux-architecture-part2.md`  
**Scope:** Project Coordinator Portal — Navigation Map, Screen Inventory, Wireframes, User Flows & Component States  
**Target Platform:** Responsive Web Application (Desktop `>= 1280px`, Tablet `768px–1279px`, Mobile Web `360px–767px`)  
**Governing Scope Rule (`BR-03`):** Every screen in the Project Coordinator Portal is strictly bound to the Coordinator's currently selected **`(Programme, Academic Session)`** appointment scope (`F-15`).

---

## 1. Project Coordinator Navigation Map & Information Architecture

When a user with an active `Project Coordinator` appointment (`F-15`) authenticates (including mandatory MFA verification per `SEC-06`), the Left Navigation Rail renders the following hierarchy scoped strictly to the active Programme and Academic Session (e.g., `B.Sc. Computer Science • 2026/2027`):

```
PROJECT COORDINATOR PORTAL (Scoped: 1 Programme + 1 Academic Session per BR-03)
│
├── 1. Programme Overview Dashboard (SCR-PC-01) [F-31, F-41, F-57]
│
├── 2. Cohort & Project Allocation
│   ├── 2.1 Student Cohort Registration & Roster (SCR-PC-02) [F-19]
│   ├── 2.2 Topic Proposals & Monitoring (SCR-PC-03) [F-20]
│   ├── 2.3 Project Allocation & Supervisor Assignment (SCR-PC-04) [F-21, F-24]
│   ├── 2.4 Project Groups & Designated Submitters (SCR-PC-05) [F-22, F-23]
│   └── 2.5 Supervisor Reassignment & Continuity (SCR-PC-06) [F-16, F-27]
│
├── 3. Workflow, Milestones & Exceptions
│   ├── 3.1 Milestones, Guidelines & Deadlines Config (SCR-PC-07) [F-28, F-29, F-30]
│   ├── 3.2 Cohort Milestone & Submission Progress (SCR-PC-08) [F-31]
│   ├── 3.3 Overdue Submissions Monitor (SCR-PC-09) [F-41, F-74]
│   ├── 3.4 Deadline Extension Approvals (SCR-PC-10) [F-42]
│   └── 3.5 Late Submission Policy & Penalty Overrides (SCR-PC-11) [F-43, F-44]
│
├── 4. Examinations & Defences
│   ├── 4.1 Assessment & Grading Structure Config (SCR-PC-12) [F-51]
│   ├── 4.2 Examination Panels & Examiner Appointments (SCR-PC-13) [F-46, F-47, F-48]
│   └── 4.3 Defence Schedule & Venue Management (SCR-PC-14) [F-49]
│
├── 5. Assessments & Final Results
│   ├── 5.1 Assessment Completion & Review Monitor (SCR-PC-15) [F-57]
│   └── 5.2 Result Consolidation, Approval & Atomic Publication (SCR-PC-16) [F-58, F-59, F-60]
│
└── 6. Programme Academic Decision Audit Log (SCR-PC-17) [F-82]
```

*(Explicit Scope Exclusions: `F-25` Supervisor Workload Monitoring, `F-26` Workload Limit Management, `F-45` Project Withdrawal Management, and `F-63`/`F-81` Incomplete Project Carry-Forward are P1 features and do **not** appear in the MVP Coordinator navigation).*

---

## 2. Project Coordinator Master Screen Inventory (`SCR-PC-01` to `SCR-PC-17`)

| Screen ID | Screen Title | Route Pattern | Covered P0 Features | Primary User Actions |
|---|---|---|---|---|
| **SCR-PC-01** | Programme Overview Dashboard | `/coordinator/dashboard` | `F-20`, `F-31`, `F-41`, `F-57`, `F-60` | View cohort KPIs, jump to pending extension approvals, overdue milestones, unallocated students, and projects ready for result approval/publication. |
| **SCR-PC-02** | Student Cohort Registration & Roster | `/coordinator/students` | `F-19` | Register single student, bulk import cohort CSV, filter by participation/allocation status, update student record, remove unallocated student added in error. |
| **SCR-PC-03** | Topic Proposals & Monitoring | `/coordinator/topics` | `F-20`, `F-21`, `F-24` | Monitor topic proposal statuses (`PC-20`), inspect proposal details (read-only per `BR-26`), trigger Supervisor assignment for projects with submitted proposals (`BR-05`). |
| **SCR-PC-04** | Project Allocation & Supervisor Assignment | `/coordinator/allocations` | `F-21`, `F-24` | Establish `Individual` vs. `Group` project arrangements (`PC-04`), assign/bulk-assign `Available` Supervisors (`PC-03`, `PC-08`, `PC-09`) after topic proposals are submitted. |
| **SCR-PC-05** | Project Groups & Designated Submitters | `/coordinator/groups` | `F-22`, `F-23` | Create project groups ($\ge 2$ members, `PC-05`), assign initial members (`PC-06`), designate/transfer Group Submitter authority (`PC-07`). |
| **SCR-PC-06** | Supervisor Reassignment & Continuity | `/coordinator/reassignments` | `F-16`, `F-27` | Filter projects with `Unavailable / On Leave` supervisors, reassign project to a new `Available` Supervisor with mandatory reason (`PC-12`). |
| **SCR-PC-07** | Milestones, Guidelines & Deadlines Config | `/coordinator/milestones` | `F-28`, `F-29`, `F-30` | Publish programme project guidelines (`ST-02`), define ordered milestones (`PC-13`), configure allowed file formats, set/update deadlines in institutional timezone (`PC-14`). |
| **SCR-PC-08** | Cohort Milestone & Submission Progress | `/coordinator/progress` | `F-31` | View programme-wide milestone completion funnel, filter projects by milestone stage and review status (`PC-15`, `PC-21`), inspect read-only project workspace. |
| **SCR-PC-09** | Overdue Submissions Monitor | `/coordinator/overdue` | `F-41`, `F-74` | View all projects currently past their Effective Deadline without submission (`PC-16`), filter by milestone/supervisor. |
| **SCR-PC-10** | Deadline Extension Approvals | `/coordinator/extensions` | `F-42` | Review extension requests that have been `Recommended by Supervisor` (`BR-15`) and formally `Approve` or `Reject` them (`PC-17`). |
| **SCR-PC-11** | Late Submission Policy & Penalty Overrides | `/coordinator/late-penalties` | `F-43`, `F-44` | Configure programme late penalty rules (`PC-18`), inspect late submissions, execute justified Coordinator penalty overrides/waivers (`PC-19`). |
| **SCR-PC-12** | Assessment & Grading Structure Config | `/coordinator/grading-config` | `F-51` | Configure Supervisor component (default $30\text{ marks}$ `BR-18`), Examiner Document & Defence components, criteria, pass mark, grade scale, and Examiner-score consolidation method (`PC-26`). |
| **SCR-PC-13** | Examination Panels & Examiner Appointments | `/coordinator/examiners` | `F-46`, `F-47`, `F-48` | Configure panel size (`PC-24`), create named panels, appoint eligible Project Examiners (`PC-23`) with automatic `BR-16` Supervisor conflict blocking (`PC-25`). |
| **SCR-PC-14** | Defence Schedule & Venue Management | `/coordinator/defences` | `F-49` | Schedule and reschedule oral defence dates, times (`WAT`), and physical/virtual venues (`PC-28`, `PC-29`) with Examiner timeslot conflict detection. |
| **SCR-PC-15** | Assessment Completion & Review Monitor | `/coordinator/assessments` | `F-57` | Monitor submitted vs. outstanding Examiner and Supervisor assessments (`PC-27`, `PC-33`), inspect read-only submitted grading sheets (`PC-30`), send assessor reminders. |
| **SCR-PC-16** | Result Consolidation, Approval & Atomic Publication | `/coordinator/results` | `F-58`, `F-59`, `F-60` | Review consolidated scores (`PC-30`), formally `Approve` project results (`PC-31`), and atomically `Publish` individual or batch approved project results (`PC-32`, `mvp-p.md` §8). |
| **SCR-PC-17** | Programme Academic Decision Audit Log | `/coordinator/audit-logs` | `F-82` | View and filter immutable academic decision audit logs scoped to the Coordinator's Programme and Academic Session (`FR-283`). |

---

## 3. Detailed Screen Wireframes, User Flows & Component States

### 3.1 `SCR-PC-01`: Programme Overview Dashboard (`F-20`, `F-31`, `F-41`, `F-57`, `F-60`)

```
+--------------------------------------------------------------------------------------------------+
| PROGRAMME OVERVIEW: B.Sc. Computer Science (Session: 2026/2027 • Active)    [Timezone: WAT UTC+1]|
+--------------------------------------------------------------------------------------------------+
| [KPI 1: Cohort Roster]  | [KPI 2: Topic Status]   | [KPI 3: Active Milestones]| [KPI 4: Results]  |
| 180 Registered Students | 142 Approved            | 19 Overdue Submissions   | 45 Published      |
| 120 Individual | 20 Grp | 18 Awaiting Sup. Assign | 4 Pending Extension Appr | 12 Ready to Publ. |
+-------------------------+-------------------------+--------------------------+-------------------+
| ACTION REQUIRED QUEUES (Tabbed Priority Panel)                                                   |
| [ (18) Awaiting Supervisor ] [ (4) Extension Approvals ] [ (19) Overdue ] [ (12) Ready Results ] |
+--------------------------------------------------------------------------------------------------+
| Project / Student         | Arrangement | Topic Proposal Title        | Submitted At     | Action|
|---------------------------|-------------|-----------------------------|------------------|-------|
| Adeyemi, Tunde (CSC/22/01)| Individual  | Federated Learning for IoT  | 02 Nov 2026 14:10| [Assign Sup]
| Group CSC-GRP-04 (3 Mem.) | Group       | Automated Grading Rubric NLP| 02 Nov 2026 16:45| [Assign Sup]
+--------------------------------------------------------------------------------------------------+
| PROGRAMME MILESTONE COMPLETION FUNNEL (F-31)                                                     |
| Topic Proposal      [========================================--------] 142 / 140 Projects (88%)  |
| Milestone 1: Ch. 1  [================================----------------] 110 / 140 Projects (78%)  |
| Milestone 2: Ch. 2  [====================----------------------------]  72 / 140 Projects (51%)  |
| Final Dissertation  [========----------------------------------------]  28 / 140 Projects (20%)  |
+--------------------------------------------------------------------------------------------------+
```

* **Component States:**
  * *Unconfigured Programme Onboarding State:* If Milestones (`F-29`) or Assessment Structure (`F-51`) have not yet been configured for the session, displays a guided 3-step Setup Checklist banner: `(1) Configure Milestones & Deadlines -> (2) Configure Grading Structure -> (3) Register Cohort Students`.
  * *Loading State:* 4 KPI card skeletons + funnel bar skeletons.

---

### 3.2 `SCR-PC-02` to `SCR-PC-06`: Cohort Registration, Topics, Allocation, Groups & Reassignment (`F-19`–`F-24`, `F-27`)

#### A. Wireframe — `SCR-PC-04` & `SCR-PC-05`: Project Allocation, Group Management & Supervisor Assignment

```
+--------------------------------------------------------------------------------------------------+
| PROJECT ALLOCATION & GROUPS (B.Sc. Computer Science • 2026/2027)   [+ Create Group] [Bulk Assign]|
+--------------------------------------------------------------------------------------------------+
| Tabs: [ All Cohort Students (180) ] [ Individual Projects (120) ] [ Project Groups (20) ]        |
| Filter: [Allocation: All v] [Topic: Proposal Submitted v] [Supervisor: Unassigned v] [Search...] |
+--------------------------------------------------------------------------------------------------+
| [x] | Student / Group       | Type       | Topic Status         | Assigned Supervisor | Actions  |
|-----|-----------------------|------------|----------------------|---------------------|----------|
| [x] | CSC/2022/045 - Okon, E| Individual | Submitted (Awaiting) | Unassigned          | [Assign] |
| [x] | CSC-GRP-01 (3 Members)| Group      | Submitted (Awaiting) | Unassigned          | [Assign] |
|     |  • Bello, A. [SUBMITTER] (CSC/22/02)                                            | [Manage  |
|     |  • Chukwu, K. [Member]   (CSC/22/08)                                            |  Group]  |
|     |  • Daudu, M.  [Member]   (CSC/22/19)                                            |          |
| [ ] | CSC/2022/051 - Eze, N.| Individual | No Topic Proposed    | -- (Locked BR-04)   | [Locked] |
+--------------------------------------------------------------------------------------------------+

  +--- MODAL: CREATE / MANAGE PROJECT GROUP & DESIGNATED SUBMITTER (F-22, F-23) -----------------+
  | Group Name / Code *: [ CSC-2027-GRP-01                    ]                                  |
  | Select Unallocated Cohort Students (Minimum 2 required) *:                                   |
  | +------------------------------------------------------------------------------------------+ |
  | | Student Name & Matric No.       | Role in Group           | Designated Submitter (BR-08) | |
  | |---------------------------------|-------------------------|------------------------------| |
  | | Bello, Aminu (CSC/2022/002)     | Member                  | (•) Designated Submitter     | |
  | | Chukwu, Kelechi (CSC/2022/008)  | Member                  | ( ) Designated Submitter     | |
  | | Daudu, Musa (CSC/2022/019)      | Member                  | ( ) Designated Submitter     | |
  | +------------------------------------------------------------------------------------------+ |
  | [i] Rule BR-08: All members share the Group Workspace, but only Designated Submitter(s)      |
  |     can execute formal topic, milestone, and final project submissions.                      |
  |                                                            [Cancel]  [Save Project Group]    |
  +----------------------------------------------------------------------------------------------+
```

#### B. Interaction Rules & Validations (`F-19`–`F-24`, `F-27`)
1. **Sequencing Enforcement (`BR-04`, `BR-05`):**
   * On `SCR-PC-03` and `SCR-PC-04`, if a student or group has Topic Status `No Topic Proposed`, the **"Assign Supervisor"** button is disabled with a tooltip/inline explanation: *"Supervisor assignment is unlocked after the student or group submits a topic proposal (BR-04, BR-05)."*
2. **Group Size & Submitter Validation (`F-22`, `F-23`):**
   * Creating a group requires selecting $\ge 2$ unallocated students from the current Programme and Session (`FR-074`) and toggling `Designated Submitter` on for at least $1$ member (`FR-078`).
3. **Supervisor Reassignment Modal (`SCR-PC-06`, `F-27`):**
   * Displays a warning filter for any project whose Supervisor was marked `Unavailable / On Leave` by the Institutional Admin (`F-16`).
   * Selecting a new `Available` Supervisor requires entering a mandatory **Reassignment Reason ($10$–$500$ chars, `FR-084`)** and displays a handover confirmation summary: *"All approved topics, approved milestones, version histories, and pending submissions will transfer seamlessly to the new Supervisor (`PS-20`). Neither the former nor the new Supervisor will be eligible to examine this project (`BR-16`)."*

---

### 3.3 `SCR-PC-07` to `SCR-PC-11`: Milestones, Deadlines, Extensions & Late Penalty Overrides (`F-29`–`F-31`, `F-41`–`F-44`)

#### A. Wireframe — `SCR-PC-07`: Milestones, Guidelines & Deadlines Configuration (`F-29`, `F-30`)

```
+--------------------------------------------------------------------------------------------------+
| MILESTONES, GUIDELINES & DEADLINES (B.Sc. Computer Science • 2026/2027)    [+ Add Milestone]     |
+--------------------------------------------------------------------------------------------------+
| PROGRAMME PROJECT REQUIREMENTS & GUIDELINES (Visible in all Student/Supervisor Workspaces ST-02) |
| [ Rich Text / Markdown Guidelines Editor...                               ] [Update Guidelines]  |
+--------------------------------------------------------------------------------------------------+
| ORDERED MILESTONE WORKFLOW (Sequential Gating Enforced per BR-10)                                |
+--------------------------------------------------------------------------------------------------+
| Seq | Milestone Title             | Type              | Allowed Formats   | Deadline (WAT UTC+1) |
|-----|-----------------------------|-------------------|-------------------|----------------------|
| #1  | Chapter 1: Introduction     | Interim Milestone | PDF, DOC, DOCX    | 01 Dec 2026 23:59 WAT|
|     | [38 Submissions Recorded — Deletion & Reordering Locked]            | [Edit Details/Date]  |
|-----|-----------------------------|-------------------|-------------------|----------------------|
| #2  | Chapter 2 & 3: Lit & Method | Interim Milestone | PDF, DOC, DOCX    | 15 Jan 2027 23:59 WAT|
|     | [0 Submissions]                                                     | [Edit] [Move] [Del]  |
|-----|-----------------------------|-------------------|-------------------|----------------------|
| #3  | Final Consolidated Project  | FINAL SUBMISSION  | PDF, DOCX, PPTX   | 30 Apr 2027 23:59 WAT|
|     | (Locked as Final Examination Deliverable ST-11)                     | [Edit Details/Date]  |
+--------------------------------------------------------------------------------------------------+
```

#### B. Wireframe — `SCR-PC-10` & `SCR-PC-11`: Extension Approvals (`F-42`) & Late Penalty Overrides (`F-44`)

```
+--------------------------------------------------------------------------------------------------+
| DEADLINE EXTENSION APPROVALS (F-42 — Two-Tier Rule BR-15)                                        |
+--------------------------------------------------------------------------------------------------+
| Project / Student   | Milestone | Current Due | Requested Due | Supervisor Rec. (`PS-19`) |Action|
|---------------------|-----------|-------------|---------------|---------------------------|------|
| CSC/22/14 - Obi, C. | Ch. 1 (#1)| 01 Dec 2026 | 08 Dec 2026   | [RECOMMENDED] Dr. Okonkwo | [Rev]|
|                     |           | 23:59 WAT   | 23:59 WAT     | "Medical cert verified"   |      |
|---------------------|-----------|-------------|---------------|---------------------------|------|
| CSC-GRP-03          | Ch. 1 (#1)| 01 Dec 2026 | 10 Dec 2026   | [PENDING SUPERVISOR]      | [Lck]|
|                     |           |             |               | Awaiting Supervisor (`BR-15`)|   |
+--------------------------------------------------------------------------------------------------+

+--------------------------------------------------------------------------------------------------+
| LATE SUBMISSIONS & PENALTY OVERRIDES (F-43, F-44)                  [Configure Late Policy PC-18] |
| Active Rule: 2.0 Marks / Day Late • Grace Buffer: 0 mins • Max Penalty Cap: 10.0 Marks (OD-05)   |
+--------------------------------------------------------------------------------------------------+
| Project / Student   | Milestone | Effective Due | Server Receipt| Late Duration | Penalty |Action|
|---------------------|-----------|---------------|---------------|---------------|---------|------|
| CSC/22/31 - Lawal, S| Final (#3)| 30 Apr 23:59  | 03 May 10:15  | +2d 10h 16m   | 6.0 Mks |[Over-|
|                     |           | WAT           | WAT (LATE)    | (3 Days Ceil) | Active  | ride]|
|---------------------|-----------|---------------|---------------|---------------|---------|------|
| CSC-GRP-02          | Final (#3)| 30 Apr 23:59  | 01 May 04:12  | +0d 04h 13m   | 0.0 Mks |[View |
|                     |           | WAT           | WAT (LATE)    | (Waived PC-19)| WAIVED  | Audit|
+--------------------------------------------------------------------------------------------------+
```

* **Interaction & Validation Rules (`F-30`, `F-42`, `F-44`):**
  * **Chronological Deadline Validation (`FR-095`):** If the Coordinator edits Milestone #2's deadline to a timestamp earlier than Milestone #1's deadline, inline validation blocks saving.
  * **Two-Tier Extension Gate (`BR-15`, `FR-143`):** On `SCR-PC-10`, the **"Approve Extension"** button is strictly disabled for any request whose Supervisor Recommendation status is `Pending Supervisor` or `Declined by Supervisor`.
  * **Late Penalty Override Modal (`PC-19`, `FR-150`):** Clicking `[Override]` opens a modal displaying Calculated Penalty (`6.0 Marks`), Radio selector (`Waive Completely (Set to 0.0)` vs. `Adjust Penalty Value`), New Penalty Input (`0.0` to `6.0`), and a mandatory **Justification Reason (`10–1,000 chars`)** audited in `F-82`.

---

### 3.4 `SCR-PC-12` to `SCR-PC-14`: Grading Structure, Examiner Appointments & Defence Scheduling (`F-46`–`F-49`, `F-51`)

#### A. Wireframe — `SCR-PC-12`: Assessment & Grading Structure Configuration (`F-51`)

```
+--------------------------------------------------------------------------------------------------+
| ASSESSMENT & GRADING STRUCTURE (B.Sc. Computer Science • 2026/2027)        [Status: Editable]    |
+--------------------------------------------------------------------------------------------------+
| 1. COMPONENT MARK ALLOCATION (Must sum to 100.0 Marks)                                           |
| +------------------------------+ +------------------------------+ +----------------------------+ |
| | Supervisor Performance (F-56)| | Examiner Document (F-52)     | | Examiner Defence (F-53)    | |
| | Allocation: [ 30.0 ] Marks   | | Allocation: [ 40.0 ] Marks   | | Allocation: [ 30.0 ] Marks | |
| | (Default: 30 Marks per BR-18)| |                              | |                            | |
| +------------------------------+ +------------------------------+ +----------------------------+ |
| Total Allocation Check: 30.0 + 40.0 + 30.0 = 100.0 / 100.0 Marks [VALID]                         |
+--------------------------------------------------------------------------------------------------+
| 2. MULTI-EXAMINER CONSOLIDATION & ROUNDING RULES (mvp-p.md §2.4, §7 • OD-08)                     |
| Examiner Panel Consolidation Method *: [ Arithmetic Mean (Average of Submitted Examiners) v ]    |
| Final Result Rounding Rule *:          [ Round Half-Up (2 Decimal Places, e.g., 64.55)    v ]    |
| Programme Pass Mark Threshold *:       [ 45.0 ] / 100.0 Marks                                    |
+--------------------------------------------------------------------------------------------------+
| 3. GRADING CRITERIA BY COMPONENT                                           [+ Add Criterion]     |
| Tab: [ Supervisor Criteria (30.0 Mks) ] [ Examiner Document (40.0 Mks) ] [ Examiner Defence (30)]|
|--------------------------------------------------------------------------------------------------|
| # | Criterion Title                       | Rubric Guidance                     | Max Marks      |
|---|---------------------------------------|-------------------------------------|----------------|
| 1 | Research Diligence & Milestone Quality| Consistency across chapters (`PS-21`)| 20.0 Marks    |
| 2 | Supervision Engagement & Interaction  | Responsiveness to feedback (`PS-22`) | 10.0 Marks    |
+--------------------------------------------------------------------------------------------------+
|                                                        [Save Draft]  [Activate Grading Structure]|
+--------------------------------------------------------------------------------------------------+
```

#### B. Wireframe — `SCR-PC-13` & `SCR-PC-14`: Examiner Panel Appointment (`F-46`–`F-48`) & Defence Scheduling (`F-49`)

```
+--------------------------------------------------------------------------------------------------+
| EXAMINER APPOINTMENTS & PANELS (F-46, F-47, F-48)     [Default Panel Size: 2 Examiners]          |
+--------------------------------------------------------------------------------------------------+
| Project             | Supervised By (Excluded BR-16) | Appointed Panel Examiners   | Defence Slot|
|---------------------|--------------------------------|-----------------------------|-------------|
| CSC/22/01 - Adeyemi | Dr. Okonkwo (Current)          | 1. Prof. Balogun (Appointed)| 20 May 2027 |
|                     | Dr. Musa (Former - F-27)       | 2. Dr. Bello (Appointed)    | 10:00 WAT   |
|                     |                                | [2/2 Panel Complete]        | Venue: ELT-2|
+--------------------------------------------------------------------------------------------------+

  +--- MODAL: APPOINT PROJECT EXAMINERS (Enforcing F-48 / BR-16) --------------------------------+
  | Project: CSC/22/01 — Federated Learning for IoT                                              |
  | Required Panel Size: 2 Examiners                                                             |
  | Search & Select Examiners:                                                                   |
  | [x] Prof. Balogun (Department of Computer Science) — [Eligible]                              |
  | [x] Dr. Bello (Department of Computer Science)     — [Eligible]                              |
  | [ ] Dr. Okonkwo (Department of Computer Science)   — [DISABLED: Current Supervisor (BR-16)]  |
  | [ ] Dr. Musa (Department of Computer Science)      — [DISABLED: Former Supervisor (BR-16)]   |
  |                                                              [Cancel]  [Confirm Appointments]|
  +----------------------------------------------------------------------------------------------+
```

* **Interaction & Validation Rules (`F-46`–`F-49`, `F-51`):**
  * **Supervisor-Examiner Independence Guard (`BR-16`, `FR-161`):** In `SCR-PC-13`, any staff member who is the current Supervisor (`F-24`) or a former reassigned Supervisor (`F-27`) of the target project is visually badged `[DISABLED: Project Supervisor — BR-16]` and blocked from selection.
  * **Defence Timeslot Conflict Warning (`FR-166`):** In `SCR-PC-14`, if the Coordinator schedules a defence from `10:00–10:45 WAT` on `20 May 2027` for a project whose appointed Examiner is already scheduled in another room during that window, an inline conflict alert highlights the overlapping Examiner and timeslot before saving.

---

### 3.5 `SCR-PC-15` & `SCR-PC-16`: Assessment Completion, Consolidation, Approval & Atomic Project-Level Publication (`F-57`–`F-60`)

#### A. Wireframe — `SCR-PC-16`: Result Consolidation, Approval & Atomic Project-Level Publication

```
+--------------------------------------------------------------------------------------------------+
| FINAL RESULTS: CONSOLIDATION, APPROVAL & PUBLICATION (B.Sc. Computer Science • 2026/2027)        |
+--------------------------------------------------------------------------------------------------+
| [!] PROJECT-LEVEL PUBLICATION RULE (mvp-p.md §8): You may approve and publish any project whose  |
|     assessments are complete. Pending projects do NOT block completed projects from publication. |
+--------------------------------------------------------------------------------------------------+
| Filter: [Status: All (140) v] [Ready for Approval (8)] [Approved - Ready to Publish (12)]        |
| Batch Actions: [Approve Selected Ready Projects (8)]  [Publish Selected Approved Projects (12)]  |
+--------------------------------------------------------------------------------------------------+
| [x] | Project / Student(s)  | Examiner Panel | Supervisor   | Late Pen.| Final Score | Status/CTA|
|     |                       | (70.0 Shared)  | (30.0 Indiv) | (`F-44`) | & Grade     |           |
|-----|-----------------------|----------------|--------------|----------|-------------|-----------|
| [x] | CSC/22/01 - Adeyemi, T| 58.00 / 70     | 26.00 / 30   | 0.00     | 84.00 (A)   | [APPROVED]|
|     | (Individual Project)  | (2/2 Submitted)| (Submitted)  |          | PASS        | [Publish] |
|-----|-----------------------|----------------|--------------|----------|-------------|-----------|
| [x] | Group CSC-GRP-01      | 58.00 / 70     | 3/3 Members  | 0.00     | Individual  | [APPROVED]|
|     |  • Bello, A. (Subm.)  |  Shared: 58.00 |  Indiv: 27.00| 0.00     |  85.00 (A)  | [Publish  |
|     |  • Chukwu, K.         |  Shared: 58.00 |  Indiv: 20.00| 0.00     |  78.00 (A)  |  Group    |
|     |  • Daudu, M.          |  Shared: 58.00 |  Indiv: 15.00| 0.00     |  73.00 (A)  |  Atomic]  |
|-----|-----------------------|----------------|--------------|----------|-------------|-----------|
| [ ] | CSC/22/09 - Nwachukwu | 54.50 / 70     | 24.00 / 30   | -4.00    | 74.50 (A)   | [RE-APPR. |
|     | [!] Examiner Edited   | (Edited 10m ago| (Submitted)  |          | PASS        |  REQUIRED]|
|     |     Score (`PROP-03`) |  by Dr. Bello) |              |          |             | [Review]  |
|-----|-----------------------|----------------|--------------|----------|-------------|-----------|
| [ ] | CSC/22/18 - Ojo, F.   | 1/2 Submitted  | Pending      | --       | Incomplete  | [Awaiting |
|     |                       | (Missing: Eze) |              |          |             |  Assess.] |
+--------------------------------------------------------------------------------------------------+
```

#### B. Step-by-Step User Flow — Coordinator Review, Approval & Atomic Publication (`F-57`–`F-60`)
1. **Step 1 — Inspect Submitted Assessments (`PC-30`, `SCR-PC-15` / `SCR-PC-16`):**
   * Coordinator clicks `[Review]` on any project row to open a slide-over **Consolidated Assessment Inspector Drawer** showing:
     * Each Examiner's individual Document criterion scores (`F-52`), Defence criterion scores (`F-53`), Total score, Formal Examination Feedback (`F-54`), and any post-submission edit reason (`F-55`).
     * The Consolidated Examiner Score ($E_{\text{consolidated}}$) and exact unrounded calculation (`F-58`).
     * The Supervisor's Performance criterion scores (`F-56` — or member-by-member breakdown `F-39` for a Group Project) and qualitative feedback.
     * Any Late Submission Penalty or Coordinator Override (`F-44`).
2. **Step 2 — Formal Result Approval (`PC-31`, `F-59`):**
   * Once all required Examiner and Supervisor assessments for that project are `Submitted`, the `[Approve Result]` button is enabled.
   * Clicking `[Approve Result]` transitions the project from `Consolidated - Pending Approval` to `Approved - Ready for Publication` and logs an audit entry (`F-82`).
3. **Step 3 — Post-Approval Edit Reset Safeguard (`BR-NEW-03` / `PROP-03`):**
   * If an Examiner (`F-55`) or Supervisor (`F-56`) edits their submitted score after Step 2 (`Approved`) but before Step 4 (`Published`), the row automatically displays a high-visibility amber badge `[RE-APPROVAL REQUIRED — Assessor Edited Score]`, recalculates the consolidated score, disables `[Publish]` until the Coordinator reviews the diff and clicks `[Approve Result]` again.
4. **Step 4 — Atomic Project-Level Publication (`PC-32`, `F-60`, `mvp-p.md` §8):**
   * Coordinator clicks `[Publish]` on a single `Approved` project (or selects multiple `Approved` projects and clicks `[Publish Selected Approved Projects]`), even while other projects (like `CSC/22/18 - Ojo, F.`) remain incomplete.
   * A confirmation modal states: *"Publishing this project's result will atomically release final grades and assessment breakdowns to the student(s) and permanently lock all Examiner and Supervisor assessments for this project against further editing (`BR-21`). Proceed?"*
   * Upon confirmation, the transaction commits atomically (`FR-210`), row status becomes `[PUBLISHED — Locked]`, audit logs are written (`F-82`), and student notifications are dispatched (`F-75`).