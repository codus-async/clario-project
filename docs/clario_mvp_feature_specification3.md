# Clario — MVP Feature Specification (`mvp-features-part2.md`)

**Document Status:** Stage 2 — Feature Decomposition (Batch 3 of 5: Modules F, G & H)  
**Target Release:** Clario MVP (P0 Scope Only)  
**Platform:** Responsive Web Application (All Actors)  
**Launch Jurisdiction & Currency:** Nigeria (`NGN`)

---

## Batch 3 Overview
* **Module F (Group Collaboration):** `F-36`, `F-37`, `F-38`, `F-39`
* **Module G (Deadlines, Extensions & Late Submissions):** `F-40`, `F-41`, `F-42`, `F-43`, `F-44` *(Note: `F-45` Project Withdrawal Management is P1 and excluded from the MVP).*
* **Module H (Examination & Defence Management):** `F-46`, `F-47`, `F-48`, `F-49`, `F-50`

---

# Module F: Group Collaboration

## F-36: Shared Group Workspace

### A. Feature Identification
* **Feature ID:** F-36
* **Feature Name:** Shared Group Workspace
* **Feature Category:** Group Collaboration (User-Facing Functionality)
* **Primary Actor:** Student (Group Member)
* **Supporting Actors:** Project Supervisor, Project Coordinator, Access Control Service (`F-66`)
* **MVP Priority:** P0
* **Source User Stories:** ST-16
* **Short Feature Description:** Provides a common, permission-bounded collaborative project workspace accessible to all authorised student members of a project group (`F-22`) and their assigned Project Supervisor (`F-24`).

### B. Business Purpose
* **Problem Solved:** Students allocated to a group project need a single shared environment to view their group's topic proposal, milestone roadmap, shared working files, formal submission status, supervisory feedback, and defence schedule.
* **Necessity for Clario:** Implements `ST-16` and supports collaborative final-year projects (`BR-06`).
* **Business/Academic Value:** Ensures every group member has equal visibility into project requirements, supervisory feedback, and deadlines without duplicating project records per student.
* **Impact if Omitted:** Group members would be isolated from one another and unable to collaborate or view shared supervisory feedback.

### C. Functional Requirements
* **FR-119:** When a Project Group is created (`F-22`), the system must provision a single Shared Group Workspace (`ST-16`) linked to the Group Project (`F-21`) and grant access to every active Student member of that group (`SEC-11`) and the assigned Project Supervisor (`SEC-12`).
* **FR-120:** The Shared Group Workspace must expose a unified view of:
  1. Group Profile (Group Name/Code, Approved Topic Title, Member Roster `F-22`, Designated Group Submitter indicator `F-23`, Assigned Supervisor `F-24`).
  2. Programme Project Requirements & Guidelines (`F-28`, `F-29`).
  3. Group Topic Proposal status and history (`F-20`).
  4. Shared Working Documents repository (`F-37`).
  5. Group Milestone Progress (`F-31`, `ST-21`), Formal Group Submission Status (`F-38`), Version History (`F-35`), and Supervisor Feedback/Discussion threads (`F-33`, `F-34`).
  6. Group Defence Schedule (`F-49`).
* **FR-121:** While the workspace is shared among group members for collaboration, the system must keep each student's **published final result and individual performance score (`F-39`, `F-56`, `F-60`, `F-61`) private to that individual student** so one group member cannot view another group member's individual Supervisor performance score or final consolidated grade.

### D. User Interaction and Behaviour
* **Access:** Student (assigned to a group) upon login -> "My Group Workspace" (`ST-16`); Project Supervisor via "Assigned Projects -> Select Group".
* **Information Viewed:** Group header, Member roster with Designated Submitter badge, Shared Working Files tab (`F-37`), Formal Milestones & Submissions tab (`F-38`), Topic Proposal tab (`F-20`), Extensions tab (`F-42`), and Defence Schedule (`F-49`).
* **Actions Performed:** Navigate group tabs, view group roster, collaborate on shared working documents (`F-37`), post comments in submission discussions (`F-34`), and (if Designated Submitter `F-23`) execute formal group submissions (`F-32`).
* **Validations:** Strict verification (`F-66`, `SEC-11`) that the requesting student is an active member of the group.
* **Post-Action Behaviour:** Workspace renders in under $2\text{ seconds}$ (`PER-01`).
* **States:** Loading skeleton, Active Group Collaboration state, Examination/Completed state.

### E. Business Rules
* **BR-02 & SEC-11:** Students can only access their own individual project or their authorised Shared Group Workspace.
* **BR-06 & BR-07:** Projects can be group-based; Coordinators create groups and assign members.
* **BR-08:** All members collaborate in the Shared Group Workspace, but only Designated Group Submitters can make formal group submissions (`F-23`).

### F. Permissions and Access Control
* **Student (Group Member):** Full collaborative access to their assigned group's workspace (`ST-16`); no access to other groups (`SEC-11`); individual final grades (`F-60`, `F-61`) are restricted to each respective student.
* **Project Supervisor:** Read and review access to workspaces of groups assigned to them (`SEC-12`).
* **Project Coordinator:** Read access within their assigned Programme and Session (`BR-03`).

### G. Data Requirements
* **Displayed:** Group ID (`F-22`), Project ID (`F-21`), Member Roster (`F-22`), Designated Submitter IDs (`F-23`), Shared Working Documents (`F-37`), Milestone & Formal Submission states (`F-31`, `F-38`), Defence Schedule (`F-49`).

### H. Dependencies and Integrations
* **Required Features:** `F-21`, `F-22`, `F-23`, `F-24`, `F-28`, `F-37`, `F-38`, `F-64`, `F-66`.

### I. Acceptance Criteria
* **AC-F36-01 (Positive — Group Member Shared Workspace Access):** Given Students A, B, and C are assigned to Group `CSC-GRP-01`, When any of the three students logs in, Then they can access the `CSC-GRP-01` Shared Group Workspace (`ST-16`) and view the same milestones, shared files, and supervisory feedback.
* **AC-F36-02 (Permission — Cross-Group Isolation):** Given Student D belongs to `CSC-GRP-02`, When Student D attempts to access the `CSC-GRP-01` Shared Group Workspace, Then the system denies access with a `403 Forbidden` error (`SEC-11`).
* **AC-F36-03 (Confidentiality — Individual Grade Privacy Within a Group):** Given results are published for `CSC-GRP-01` (`F-60`), When Student A views their results in the workspace, Then Student A sees the shared Examiner assessment and their own individual Supervisor score/final grade, and cannot view Student B's or Student C's individual Supervisor score or final grade.

---

## F-37: Shared Document Management

### A. Feature Identification
* **Feature ID:** F-37
* **Feature Name:** Shared Document Management
* **Feature Category:** Group Collaboration (User-Facing Functionality)
* **Primary Actor:** Student (Group Member)
* **Supporting Actors:** Designated Group Submitter (`F-23`), Project Supervisor, File Storage Service (`F-76`–`F-78`)
* **MVP Priority:** P0
* **Source User Stories:** ST-18
* **Short Feature Description:** Enables all members of a project group to upload, replace/update, view, download, and manage shared working documents within their Shared Group Workspace (`F-36`) using asynchronous file management (without real-time collaborative editing, which is excluded from MVP).

### B. Business Purpose
* **Problem Solved:** Before a Designated Group Submitter (`F-23`) makes a formal milestone submission (`F-32`), group members need a shared repository in their workspace to exchange draft chapters, presentation slides, and combined working files.
* **Necessity for Clario:** Implements `ST-18` while respecting the MVP scope exclusion on real-time collaborative document editing (`mvp-p.md` §6, §10).
* **Business/Academic Value:** Centralizes group file collaboration inside Clario and allows a Designated Group Submitter to promote a vetted shared document into a formal milestone submission (`F-32`).
* **Impact if Omitted:** Non-submitter group members would have no way to contribute project files on the platform.

### C. Functional Requirements
* **FR-122:** The system must allow any active Student member of a Project Group (`F-22`) to upload a new shared working document or upload an updated revision of an existing shared working document within the group's Shared Document Repository (`ST-18`).
* **FR-123:** Every shared working document upload must enforce the platform file security rules (`NFR-SEC: File security`): maximum size $50\text{ MB}$ ($52,428,800\text{ bytes}$), accepted formats `PDF`, `DOC`, `DOCX`, `PPT`, and `PPTX`, and true MIME/magic-byte validation.
* **FR-124:** In accordance with `mvp-p.md` §6, "editing" a shared document in the MVP means uploading a new file revision, updating the document's title/description/target milestone tag, or archiving an obsolete working draft — **not** real-time in-browser co-authoring.
* **FR-125:** When a group member uploads a new revision of a shared working document, the system must preserve previous revisions in the shared document's revision history (`F-78`) and record which group member uploaded each revision and when.
* **FR-126:** The system must allow a Designated Group Submitter (`F-23`) to select a shared working document from `F-37` (or upload a file directly) to execute a formal Milestone or Final Project Submission (`F-32`) on behalf of the group.

### D. User Interaction and Behaviour
* **Access:** Student (Group Member) via "Shared Group Workspace -> Shared Documents" (`ST-18`).
* **Information Viewed:** Table/grid of shared working documents showing Document Title, Associated Milestone Tag (optional), Latest Revision Number, File Format & Size, Last Updated By (Group Member Name), Last Updated Timestamp, Download button, and (for Designated Submitter) "Use for Formal Submission" action.
* **Actions Performed:** Upload New Shared Document, Upload New Revision of Shared Document, Edit Document Title/Notes/Milestone Tag, Download Shared Document (`F-77`), Archive Working Draft (soft-archive, recoverable by group members).
* **Validations:** File size $\le 50\text{ MB}$; Format in `PDF`, `DOC`, `DOCX`, `PPT`, `PPTX`; Document Title (required, 3–150 chars); user must be an active member of the group (`SEC-11`).
* **Post-Action Behaviour:** File stored securely (`F-76`), revision history updated (`F-78`), and group members notified in-app (`F-72`).
* **States:** Loading, Upload progress bar (with interrupted upload retry `DAT-05`), Empty state ("No shared working documents uploaded yet"), Validation error state.

### E. Business Rules
* **BR-08:** Any group member can upload and manage shared working documents in `F-37`, but uploading a shared working document does **not** constitute a formal milestone submission (`F-32`); only the Designated Group Submitter (`F-23`) can execute a formal submission.
* **MVP Exclusion:** Real-time collaborative document editing is excluded (`mvp-p.md` §6).

### F. Permissions and Access Control
* **Student (All Group Members):** Full access to upload, update/revise, view, download, and archive shared working documents within their own group (`ST-18`, `SEC-11`).
* **Project Supervisor:** Read/download access to shared group documents if needed for supervision (`SEC-12`), while formal grading/approval operates strictly on Formal Submissions (`F-32`, `F-33`).
* **Institutional Admin / Platform Admin / Other Groups:** No access (`BR-02`, `BR-25`).

### G. Data Requirements
* **Captured:** Shared Document ID, Group ID (`F-22`), Project ID (`F-21`), Document Title, Optional Milestone Tag (`F-29`), Current Revision Number, Storage Reference (`F-76`), File Name, MIME Type, File Size, SHA-256 Checksum, Uploaded By Group Member ID, Upload Timestamp, Status (`Active`, `Archived`).

### H. Dependencies and Integrations
* **Required Features:** `F-22`, `F-23`, `F-32`, `F-36`, `F-64`, `F-66`, `F-72`, `F-76`–`F-78`.

### I. Acceptance Criteria
* **AC-F37-01 (Positive — Non-Submitter Member Uploads & Revises Shared Document):** Given Student B is a non-submitter member of `CSC-GRP-01`, When Student B uploads `draft_chapter2.docx` ($8\text{ MB}$) to Shared Documents (`ST-18`), Then the document is stored and immediately visible and downloadable by all members of `CSC-GRP-01`, without triggering a formal milestone submission (`BR-08`).
* **AC-F37-02 (Positive — Designated Submitter Promotes Shared Document to Formal Submission):** Given `draft_chapter2.docx` (`Revision 3`) is in `CSC-GRP-01` Shared Documents and Milestone 2 is unlocked, When Designated Submitter Student A selects that shared document and confirms a Formal Submission for Milestone 2 (`F-32`, `ST-20`), Then a formal Milestone 2 submission (`Version 1`) is recorded and sent to the Supervisor for review.
* **AC-F37-03 (Validation — File Security Enforcement on Shared Documents):** Given a group member attempting to upload a `.zip` file or a $60\text{ MB}$ `.pptx` file to Shared Documents, When the upload is initiated, Then the system rejects the file with a format/size validation error (`NFR-SEC`).

---

## F-38: Group Submission Tracking

### A. Feature Identification
* **Feature ID:** F-38
* **Feature Name:** Group Submission Tracking
* **Feature Category:** Group Collaboration (User-Facing Functionality)
* **Primary Actor:** Student (Group Member)
* **Supporting Actors:** Designated Group Submitter (`F-23`), Project Supervisor, Project Coordinator
* **MVP Priority:** P0
* **Source User Stories:** ST-19
* **Short Feature Description:** Displays the real-time formal submission status, submitting representative, timestamps, version history, and supervisory review outcomes for all formal group project requirements to every member of the project group.

### B. Business Purpose
* **Problem Solved:** Because only the Designated Group Submitter (`F-23`) can execute formal submissions on behalf of a group, non-submitter group members need complete, transparent visibility into whether their group's formal requirements have actually been submitted on time, are awaiting review, or require revision.
* **Necessity for Clario:** Implements `ST-19`, ensuring accountability within project groups.
* **Business/Academic Value:** Prevents situations where group members mistakenly believe a milestone was formally submitted when it is still sitting only in Shared Working Documents (`F-37`).
* **Impact if Omitted:** Non-submitter group members would have no visibility into the formal submission status of their group's milestones.

### C. Functional Requirements
* **FR-127:** The system must display a dedicated Group Submission Status tracker (`ST-19`) visible to all members of a Project Group within their Shared Group Workspace (`F-36`), clearly distinguishing between **Shared Working Drafts (`F-37` — Not Formally Submitted)** and **Formal Group Submissions (`F-32` — Officially Submitted to Supervisor)**.
* **FR-128:** For every configured Milestone (`F-29`) and the Final Consolidated Project Submission, the Group Submission Status tracker must display to all group members:
  1. Formal Submission Status (`Locked`, `Not Yet Submitted`, `Submitted - Awaiting Supervisor Review`, `Revisions Requested`, `Rejected`, `Approved`).
  2. Latest Formal Version Number (`v1`, `v2`, $\dots$) and Submitted File Name (with download link `F-77`).
  3. Identity of the Designated Submitter who executed the submission and the exact Server Submission Timestamp.
  4. Deadline Compliance Badge (`On Time`, `Due Soon`, `Overdue`, `Submitted Late` with late penalty info from `F-43`/`F-44`).
  5. Supervisor Review Decision, Decision Timestamp, and link to Supervisor Feedback (`F-33`, `F-34`).

### D. User Interaction and Behaviour
* **Access:** Student (Group Member) via "Shared Group Workspace -> Group Submissions & Status" (`ST-19`).
* **Information Viewed:** Comprehensive formal submission ledger for the group across Topic Proposal, Interim Milestones, and Final Submission.
* **Actions Performed:** View Formal Submission Status (`ST-19`), Download Submitted Version (`F-77`), Open Feedback & Discussion Thread (`F-34`).
* **Validations:** Read access restricted to members of the group (`SEC-11`), assigned Supervisor (`SEC-12`), and Programme Coordinator (`BR-03`).
* **Post-Action Behaviour:** Automatically updates whenever the Designated Submitter submits a document (`F-32`) or the Supervisor records a review decision (`F-33`).
* **States:** Loading, Not Submitted warning state (when a working file exists in `F-37` but no formal submission has been made in `F-32`), Submitted/Reviewed states.

### E. Business Rules
* **BR-08:** Formal group submissions are made by the Designated Group Submitter (`F-23`), and their status is transparently visible to all group members (`ST-19`).

### F. Permissions and Access Control
* **Student (All Group Members):** Full read access to their group's formal submission status and history (`ST-19`, `SEC-11`).
* **Project Supervisor & Project Coordinator:** Read access within their respective assigned scopes.

### G. Data Requirements
* **Displayed:** Milestone ID & Title (`F-29`), Formal Submission ID (`F-32`), Formal Version Number (`F-35`), Submitted By User Name (`F-23`), Server Receipt Timestamp, Effective Deadline (`F-30`/`F-42`), On-Time/Late Indicator (`F-43`), Review Status & Supervisor Feedback (`F-33`, `F-34`).

### H. Dependencies and Integrations
* **Required Features:** `F-22`, `F-23`, `F-29`, `F-30`, `F-31`, `F-32`, `F-33`, `F-34`, `F-35`, `F-36`, `F-66`.

### I. Acceptance Criteria
* **AC-F38-01 (Positive — All Group Members See Formal Submission Status & Submitter Identity):** Given Designated Submitter Student A submits `Version 1` of Milestone 1 for `CSC-GRP-01`, When Group Member Student C views the Group Submission Tracking panel (`ST-19`), Then Student C sees Milestone 1 marked `Submitted - Awaiting Supervisor Review`, submitted by `Student A`, with the exact server timestamp and downloadable file.
* **AC-F38-02 (Clarity — Distinction Between Working File and Formal Submission):** Given a file has been uploaded to Shared Working Documents (`F-37`) for Milestone 2, but the Designated Submitter has not yet submitted Milestone 2 via `F-32`, When any group member views `F-38`, Then Milestone 2 is clearly shown as `Not Yet Formally Submitted`.

---

## F-39: Individual Group Member Assessment

### A. Feature Identification
* **Feature ID:** F-39
* **Feature Name:** Individual Group Member Assessment
* **Feature Category:** Group Collaboration & Academic Assessment (User-Facing Functionality)
* **Primary Actor:** Project Supervisor
* **Supporting Actors:** Project Coordinator (configures structure in `F-51`, reviews in `F-57`/`F-58`), Student (views own published breakdown in `F-61`), Audit Process (`F-82`)
* **MVP Priority:** P0 *(Confirmed P0 in `mvp-p.md` §2, §4, §7)*
* **Source User Stories:** PS-24 *(alongside PS-21, PS-22, PS-23)*
* **Short Feature Description:** Enables Project Supervisors to evaluate and score each member of a project group individually on their personal supervision performance, participation, and contribution, so that each group member receives an individually calculated final grade when combined with the group's shared Examiner project assessment (`F-58`).

### B. Business Purpose
* **Problem Solved:** In group projects, students often contribute unequally during research and development. Awarding an identical Supervisor performance score to every member rewards free-riders and penalizes high contributors.
* **Necessity for Clario:** Implements the confirmed MVP group grading rule (`mvp-p.md` §2.5, §7): "Group projects use a shared Examiner project assessment and individual Supervisor performance scores. Final results are calculated individually using the applicable shared project assessment and individual performance score."
* **Business/Academic Value:** Ensures fair, individualized academic accountability within collaborative group projects.
* **Impact if Omitted:** Group members could not receive individual Supervisor performance scores, violating the approved MVP academic grading model.

### C. Functional Requirements
* **FR-129:** For every Group Project (`F-21`, `F-22`), the system must generate an independent Supervisor Performance Assessment sheet (`F-56`) for **each individual Student member** of the group (`PS-24`).
* **FR-130:** The system must allow the assigned Project Supervisor to evaluate each group member individually against the programme's configured Supervisor Assessment criteria (`F-51`, default total allocation of $30\text{ marks}$ per `BR-18`, configurable by the Coordinator), recording individual criterion scores and individual qualitative supervisory comments for each member.
* **FR-131:** The system must allow the Supervisor to assign different performance scores to different members of the same group based on their individual participation, effort, and engagement during supervision (`PS-21`, `PS-22`, `PS-24`).
* **FR-132:** A Group Project's Supervisor Assessment component (`F-57`) is considered complete only when the Supervisor has submitted individual performance assessments for **all** active members of that group (`F-56`, `F-58`).

### D. User Interaction and Behaviour
* **Access:** Project Supervisor via "Supervision Workspace -> Assigned Group Project -> Supervisor Performance Assessment -> Select Group Member" (`PS-24`).
* **Information Viewed:** Group Roster listing each Student Member (Name, Matriculation Number), Individual Assessment Status per member (`Not Started`, `Draft`, `Submitted`), configured Supervisor Grading Criteria & Mark Allocations (`F-51`, default $30\text{ marks}$), Member's activity summary (shared document uploads `F-37`, formal submissions `F-32`, discussion comments `F-34`), Score inputs, and Individual Feedback field.
* **Actions Performed:** Score Individual Group Member against criteria, Save Draft Assessment, Submit Individual Member Performance Assessment (`PS-23`, `PS-24`), Edit Submitted Assessment prior to Coordinator result publication.
* **Validations:** Each criterion score must be $\ge 0$ and $\le$ the criterion's maximum mark allocation (`F-51`); total Supervisor score must not exceed the configured Supervisor mark allocation (default $30\text{ marks}$); active internet connection required for formal submission (`NFR-USA`).
* **Post-Action Behaviour:** Individual member score is saved with full precision (`NFR-DOM`), feeds into that specific student's Final Assessment Consolidation (`F-58`), and records an audit entry (`F-82`, `NFR-AUD`).
* **States:** Loading, Member-by-member completion checklist (e.g., `2 of 3 Group Members Assessed`), Submitted state, Locked state (once project result is published in `F-60`).

### E. Business Rules
* **BR-17:** Supervisor assessment and Examiner assessment are independent.
* **BR-18:** Supervisor performance assessment has a default allocation of $30\text{ marks}$, subject to Coordinator configuration (`F-51`).
* **MVP Grading Rule (`mvp-p.md` §7):** A group project receives a shared Examiner assessment, and each group member receives an individual Supervisor performance score; final results are calculated individually.
* **Open Decision Reference (`OD-02B` / `GAP-02`):** Specific institutional rubric sub-criteria for individual contribution weighting within the Supervisor's allocation are configurable via `F-51` and tracked in `mvp-open-decisions.md`.

### F. Permissions and Access Control
* **Project Supervisor:** Full access to create, submit, and update (before result publication) individual performance assessments strictly for members of groups assigned to them (`SEC-12`).
* **Project Coordinator:** Read access to submitted individual Supervisor assessments within their Programme and Session (`F-57`, `F-58`).
* **Project Examiner:** **No access** to Supervisor performance scores (`BR-17`).
* **Student (Group Member):** Read access strictly to **their own** individual Supervisor score and feedback only **after** results are published (`F-60`, `F-61`); never able to view another group member's individual score.

### G. Data Requirements
* **Captured:** Individual Supervisor Assessment ID, Project ID (`F-21`), Group ID (`F-22`), Student User ID (`F-13`), Student Registration ID (`F-19`), Supervisor User ID (`F-24`), Criterion Scores array (`Criterion ID`, `Score Awarded`, `Max Marks`), Total Supervisor Score (exact decimal precision), Supervisor Qualitative Feedback, Assessment Status (`Draft`, `Submitted`, `Locked`), Submitted/Updated Timestamps.

### H. Dependencies and Integrations
* **Required Features:** `F-21`, `F-22`, `F-24`, `F-51` (Assessment Structure Configuration), `F-56` (Supervisor Performance Assessment), `F-57`, `F-58`, `F-64`, `F-66`, `F-82`.

### I. Acceptance Criteria
* **AC-F39-01 (Positive — Distinct Individual Supervisor Scores for Members of the Same Group):** Given Group `CSC-GRP-01` has members Student A, Student B, and Student C and a $30\text{-mark}$ Supervisor allocation, When the assigned Supervisor submits individual performance scores of `28/30` for Student A, `24/30` for Student B, and `19/30` for Student C (`PS-24`), Then the system records each student's distinct score independently and uses each student's respective score during Final Assessment Consolidation (`F-58`).
* **AC-F39-02 (Validation — Incomplete Group Member Assessment Blocks Group Consolidation):** Given `CSC-GRP-01` has $3$ members and the Supervisor has submitted scores for only $2$ members, When the Coordinator views Assessment Completion Monitoring (`F-57`) or attempts to approve final results (`F-59`) for `CSC-GRP-01`, Then the system flags `CSC-GRP-01` as having an incomplete Supervisor assessment (missing Student C) and prevents result approval until all $3$ members are assessed.

---

# Module G: Deadlines, Extensions, Late Submissions and Withdrawal

*(Note: `F-45` Project Withdrawal Management (`ST-28`, `ST-29`, `PC-22`) is classified as **P1** in `mvp-p.md` §5 and is excluded from the MVP implementation specification).*

## F-40: Deadline Reminder Management

### A. Feature Identification
* **Feature ID:** F-40
* **Feature Name:** Deadline Reminder Management
* **Feature Category:** Deadlines & Exceptions (User-Facing Functionality)
* **Primary Actor:** Student, Project Supervisor
* **Supporting Actors:** Project Coordinator (configures milestone deadlines in `F-30`), Deadline Reminder Scheduler (`F-79`), Notification Services (`F-71`–`F-73`)
* **MVP Priority:** P0
* **Source User Stories:** PS-18, ST-24
* **Short Feature Description:** Delivers automated in-app and email reminders to Students (and Group Members) and their assigned Project Supervisors prior to upcoming milestone and final submission deadlines (`F-30`, `F-42`).

### B. Business Purpose
* **Problem Solved:** Students and Supervisors juggle multiple academic obligations; without proactive reminders ahead of milestone due dates, avoidable missed deadlines and late penalties increase across the cohort.
* **Necessity for Clario:** Implements `ST-24` and `PS-18` (upcoming deadline reminders), driven by background scheduling (`F-79`).
* **Business/Academic Value:** Improves on-time milestone submission rates and gives Supervisors advance notice of incoming review workloads.
* **Impact if Omitted:** Users would receive no proactive alerts before deadlines expire.

### C. Functional Requirements
* **FR-133:** For every project with an unlocked or upcoming Milestone (`F-29`) that has not yet been formally submitted (`F-32`) or approved (`F-33`), the system must trigger automated upcoming deadline reminders (`F-79`) based on the project's **Effective Deadline** (`F-30` base deadline or `F-42` approved extended deadline) in the institution's configured timezone (`NFR-DOM`).
* **FR-134:** By default, the system must support configurable reminder intervals before the Effective Deadline (e.g., $7\text{ days}$, $3\text{ days}$, and $24\text{ hours}$ prior to the deadline), dispatching both an **in-app notification (`F-72`)** and an **email notification (`F-71`)** via `F-73` to:
  1. The assigned Student (or all members of the Project Group, highlighting the Designated Submitter `F-23`) (`ST-24`).
  2. The assigned Project Supervisor (`PS-18`).
* **FR-135:** Once a formal submission (`F-32`) is confirmed for a milestone, the system must automatically suppress any remaining pre-deadline submission reminders for that specific project and milestone.

### D. User Interaction and Behaviour
* **Access:** Received via In-App Notification Center (`F-72`) and user Email inbox (`F-71`), with deep links directly to the relevant Milestone in the Project Workspace (`F-28` / `F-36`).
* **Information Viewed:** Notification message displaying Project Title, Milestone Title, Effective Deadline Date/Time (with institutional timezone, e.g., `WAT`), Time Remaining, and direct action link ("View Milestone / Upload Submission").
* **Actions Performed:** View Reminder Notification, Mark Notification Read, Click Deep Link to navigate to Milestone Submission (`F-32`).
* **Validations:** Reminders must only be sent to projects where the milestone is not yet `Submitted - Awaiting Review` or `Approved`.
* **Post-Action Behaviour:** Clicking the reminder navigates the user to the milestone panel.
* **States:** Unread notification badge, Read state, Due-Soon banner inside the Project Workspace.

### E. Business Rules
* **NFR-DOM (Deadlines & Timestamps):** All reminder triggers are calculated using the institution's configured timezone.
* **NFR-DOM (Notifications):** Confirmed MVP channels are strictly in-app and email; push notifications and SMS are excluded.

### F. Permissions and Access Control
* **Student / Group Members:** Receive reminders only for their own project's milestones (`ST-24`).
* **Project Supervisor:** Receives upcoming deadline reminders only for projects assigned to them (`PS-18`).

### G. Data Requirements
* **Captured/Displayed:** Reminder Event ID, Project ID (`F-21`), Milestone ID (`F-29`), Effective Deadline Timestamp (`F-30`/`F-42`), Reminder Interval (`7d`, `3d`, `24h`), Recipient User IDs, Dispatch Status (`F-73`), Timestamp.

### H. Dependencies and Integrations
* **Required Features:** `F-28`, `F-29`, `F-30`, `F-32`, `F-42`, `F-71`, `F-72`, `F-73`, `F-79` (Deadline Reminder Scheduling).

### I. Acceptance Criteria
* **AC-F40-01 (Positive — Upcoming Deadline Reminder Delivery):** Given Milestone 1 has an Effective Deadline of `2026-12-10 23:59 WAT` and Project X has not yet submitted Milestone 1, When the $24\text{-hour}$ reminder threshold (`2026-12-09 23:59 WAT`) is reached (`F-79`), Then the system generates and dispatches in-app and email reminders (`F-71`–`F-73`) to the Student(s) of Project X (`ST-24`) and their assigned Supervisor (`PS-18`).
* **AC-F40-02 (Suppression — No Reminder After Submission):** Given Project X formally submits Milestone 1 at `2026-12-08 14:00 WAT` ($3\text{ days}$ before the deadline), When the $24\text{-hour}$ reminder threshold (`2026-12-09 23:59 WAT`) is reached, Then no pre-deadline submission reminder is sent to Project X for Milestone 1.

---

## F-41: Overdue Submission Monitoring

### A. Feature Identification
* **Feature ID:** F-41
* **Feature Name:** Overdue Submission Monitoring
* **Feature Category:** Deadlines & Exceptions (User-Facing Functionality)
* **Primary Actor:** Project Coordinator, Project Supervisor
* **Supporting Actors:** Student, Missed Deadline Detection Service (`F-80`), Overdue Notification Service (`F-74`)
* **MVP Priority:** P0
* **Source User Stories:** PC-16, PS-18
* **Short Feature Description:** Automatically identifies projects that have passed a milestone's Effective Deadline without an approved/submitted deliverable, exposes dedicated overdue monitoring views to Supervisors (`PS-18`) and Coordinators (`PC-16`), and triggers overdue alerts (`F-74`).

### B. Business Purpose
* **Problem Solved:** Once a milestone deadline passes, Supervisors and Coordinators need immediate visibility into which specific students or groups have failed to submit so they can follow up before the project falls irrecoverably behind.
* **Necessity for Clario:** Implements `PC-16` and `PS-18` (overdue monitoring), backed by `F-80` (Missed Deadline Detection) and `F-74` (Overdue Submission Notifications).
* **Business/Academic Value:** Automates exception tracking across hundreds of projects in a programme cohort.
* **Impact if Omitted:** Overdue projects would go unnoticed unless manually audited by the Coordinator or Supervisor.

### C. Functional Requirements
* **FR-136:** When the Missed Deadline Detection background process (`F-80`) detects that a milestone's Effective Deadline (`F-30` / `F-42`) has passed in the institution's timezone and the project has not made a formal submission (`F-32`) for that milestone, the system must mark the project's milestone state with an active `Overdue` flag.
* **FR-137:** Upon marking a milestone as `Overdue`, the system must trigger `F-74` to send in-app and email overdue notifications to the assigned Project Supervisor (`PS-18`), the Programme's Project Coordinator (`PC-16`), and the Student/Group Members.
* **FR-138:** The system must provide a dedicated Overdue Submissions Monitoring filter/view in:
  1. The **Supervisor Workspace (`PS-18`)**, listing all assigned projects with currently overdue milestones, showing Student/Group Name, Milestone Title, Effective Deadline, Duration Overdue (e.g., `2 days 4 hours overdue`), and Extension Status (`None`, `Pending`, `Rejected`).
  2. The **Coordinator Workspace (`PC-16`)**, listing all overdue projects across the assigned Programme and Academic Session, filterable by Milestone, Assigned Supervisor, and Project Type (`Individual` / `Group`).
* **FR-139:** If an overdue project subsequently receives an approved Deadline Extension (`F-42`) to a future date, or makes a Late Submission (`F-32`, `F-43`), the active `Overdue (Unsubmitted)` flag must update accordingly (transitioning to `On Track (Extended)` or `Submitted Late - Awaiting Review`).

### D. User Interaction and Behaviour
* **Access:** Project Coordinator via "Programme Workspace -> Overdue Submissions" (`PC-16`); Project Supervisor via "Supervision Workspace -> Overdue Submissions" (`PS-18`).
* **Information Viewed:** Overdue counter badge in navigation, table of overdue projects showing Student/Group, Matriculation Number(s), Assigned Supervisor, Overdue Milestone, Effective Deadline (with timezone), Time Elapsed Since Deadline, and quick link to Project Workspace.
* **Actions Performed:** View/Filter Overdue Projects (`PC-16`, `PS-18`), Drill down into Project Workspace.
* **Validations:** Scoped strictly to the Supervisor's assigned projects (`SEC-12`) or the Coordinator's assigned Programme and Session (`BR-03`).
* **Post-Action Behaviour:** Real-time update of overdue list when submissions or extensions occur.
* **States:** Loading, Zero-overdue state ("No overdue submissions at this time"), Active overdue alert state.

### E. Business Rules
* **BR-12 & BR-13:** Missed deadlines are automatically detected; late submissions remain possible after a deadline is missed and are recorded as late (`F-43`).
* **NFR-DOM:** Overdue detection uses the institution's configured timezone.

### F. Permissions and Access Control
* **Project Coordinator:** View all overdue projects within their assigned Programme and Session (`PC-16`).
* **Project Supervisor:** View overdue projects strictly among their assigned students and groups (`PS-18`, `SEC-12`).
* **Student:** Views overdue indicator on their own/group milestone (`F-28`, `F-31`).

### G. Data Requirements
* **Captured/Displayed:** Overdue Record / Flag, Project ID (`F-21`), Milestone ID (`F-29`), Effective Deadline Timestamp, Detected Overdue Timestamp (`F-80`), Current Overdue Duration, Resolution State (`Still Overdue`, `Resolved via Extension`, `Submitted Late`).

### H. Dependencies and Integrations
* **Required Features:** `F-29`, `F-30`, `F-31`, `F-32`, `F-42`, `F-43`, `F-66`, `F-74` (Overdue Submission Notifications), `F-80` (Missed Deadline Detection).

### I. Acceptance Criteria
* **AC-F41-01 (Positive — Automatic Overdue Detection & Supervisor/Coordinator Alerting):** Given Milestone 1's Effective Deadline (`2026-12-01 23:59 WAT`) passes and Project Y has not submitted Milestone 1, When `F-80` runs, Then Project Y is flagged as `Overdue` for Milestone 1, appears in both the Supervisor's (`PS-18`) and Coordinator's (`PC-16`) Overdue Monitoring views, and triggers overdue notifications (`F-74`).
* **AC-F41-02 (State Transition — Late Submission Clears Unsubmitted Overdue Flag):** Given Project Y is `Overdue` for Milestone 1, When Project Y uploads and confirms a formal submission two days after the deadline (`F-32`), Then Project Y moves from `Overdue (Unsubmitted)` to `Submitted Late - Awaiting Review` (`F-43`).

---

## F-42: Deadline Extension Management

### A. Feature Identification
* **Feature ID:** F-42
* **Feature Name:** Deadline Extension Management
* **Feature Category:** Deadlines & Exceptions (User-Facing Functionality)
* **Primary Actor:** Student (requests), Project Supervisor (recommends/declines), Project Coordinator (approves/rejects)
* **Supporting Actors:** Notification Services (`F-71`–`F-75`), Scheduler (`F-79`, `F-80`), Audit Process (`F-82`)
* **MVP Priority:** P0
* **Source User Stories:** ST-25, ST-26, PS-19, PC-17
* **Short Feature Description:** Implements a two-tier academic exception workflow allowing Students (or Designated Group Submitters) to request a milestone deadline extension (`ST-25`), assigned Supervisors to review and recommend or decline the request (`PS-19`), and Project Coordinators to formally approve or reject the extension (`PC-17`), while exposing request status to Students (`ST-26`).

### B. Business Purpose
* **Problem Solved:** Legitimate medical, technical, or research contingencies occasionally prevent a student or group from meeting a milestone deadline. Unilateral supervisor extensions would undermine programme consistency, while bypassing the supervisor would leave the Coordinator without context on whether the student's excuse is genuine.
* **Necessity for Clario:** Implements `BR-15` ("Deadline extensions require Supervisor recommendation and Coordinator approval") across `ST-25`, `ST-26`, `PS-19`, and `PC-17`.
* **Business/Academic Value:** Provides a controlled, auditable two-stage approval process that updates the project's Effective Deadline (`F-30`) and prevents unfair late penalties (`F-43`, `F-44`).
* **Impact if Omitted:** Students with valid emergencies would be automatically penalized as late without a structured recourse workflow.

### C. Functional Requirements
* **FR-140:** The system must allow a Student (or any Group Member / Designated Submitter for a group project) to submit a Deadline Extension Request (`ST-25`) for a specific Milestone (`F-29`), capturing:
  1. Target Milestone (`F-29`).
  2. Requested New Deadline Date & Time (in the institution's timezone).
  3. Detailed Justification / Reason for Extension.
  4. Optional Supporting Evidence Document (validated per `FR-103`: $\le 50\text{ MB}$, `PDF`, `DOC`, `DOCX`, `PPT`, `PPTX`).
* **FR-141:** Upon submission, the extension request status must be set to `Pending Supervisor Recommendation`, visible to the Student/Group (`ST-26`) and the assigned Project Supervisor (`PS-19`), and trigger a notification to the Supervisor (`F-72`, `F-73`).
* **FR-142:** The system must allow the assigned Project Supervisor (`PS-19`) to review the extension request and record one of two actions with mandatory supervisory comments:
  1. **Recommend Extension:** Transitions status to `Recommended by Supervisor - Pending Coordinator Approval`, optionally adjusts the recommended new deadline date/time, and notifies the Project Coordinator (`PC-17`) and Student (`ST-26`).
  2. **Decline Recommendation:** Transitions status to `Declined by Supervisor` (or forwards to Coordinator marked `Not Recommended by Supervisor` per `BR-15`), records the Supervisor's rationale, logs the action in `F-82`, and notifies the Student (`ST-26`) and Coordinator. *(Note: Because `BR-15` states "Deadline extensions require Supervisor recommendation and Coordinator approval," a request declined by the Supervisor cannot be approved unless a Supervisor recommendation is present).*
* **FR-143:** For any extension request in status `Recommended by Supervisor - Pending Coordinator Approval`, the system must allow the Project Coordinator (`PC-17`) to record the final decision:
  1. **Approve Extension:** Sets status to `Approved`, updates the project's **Effective Deadline** (`FR-096`) for that milestone to the approved extended date/time, recalculates reminder/overdue schedules (`F-79`, `F-80`), clears or recalculates any `Late` flag if a submission was made within the newly approved extended deadline (`F-43`, `F-44`), records a critical academic audit log entry (`F-82`, `NFR-AUD`), and notifies the Student/Group and Supervisor (`F-71`–`F-75`).
  2. **Reject Extension:** Sets status to `Rejected by Coordinator` with mandatory Coordinator decision notes, retains the previous Effective Deadline, logs the decision in `F-82` (`NFR-AUD`), and notifies the Student/Group and Supervisor.
* **FR-144:** The system must allow the Student/Group to track the complete status history and comments of their extension requests (`ST-26`).

### D. User Interaction and Behaviour
* **Access:** Student via "Project Workspace -> Extensions -> Request Extension" (`ST-25`, `ST-26`); Supervisor via "Supervision Workspace -> Extension Requests" (`PS-19`); Coordinator via "Programme Workspace -> Extension Approvals" (`PC-17`).
* **Information Viewed:** Milestone Title, Original/Current Effective Deadline, Requested Extended Deadline, Student Reason & Supporting Document, Supervisor Recommendation Status & Comments, Coordinator Final Decision & Comments, and Status Timeline (`Pending Supervisor Recommendation` -> `Recommended - Pending Coordinator Approval` -> `Approved` / `Rejected`).
* **Actions Performed:**
  * *Student:* Submit Extension Request (`ST-25`), View Extension Status (`ST-26`).
  * *Project Supervisor:* Recommend Extension or Decline Extension Request (`PS-19`).
  * *Project Coordinator:* Approve Extension or Reject Extension (`PC-17`).
* **Validations:** Requested Extended Deadline must be chronologically after the current Effective Deadline for that milestone and within the Academic Session `End Date` (`F-12`); Justification and Supervisor/Coordinator decision comments are required ($10$–$2,000$ chars); Coordinator cannot `Approve` an extension request that has not been recommended by the assigned Supervisor (`BR-15`).
* **Post-Action Behaviour:** Status transitions persist atomically, Effective Deadline (`F-30`) and schedulers (`F-79`, `F-80`) synchronize on approval, audit log (`F-82`) is written, and notifications are dispatched.
* **States:** Loading, Empty state ("No extension requests submitted"), Pending Supervisor, Pending Coordinator, Approved, Declined/Rejected.

### E. Business Rules
* **BR-15:** Deadline extensions require Supervisor recommendation and Coordinator approval.
* **NFR-AUD:** Deadline-extension decisions must be recorded in the audit log (`F-82`).
* **NFR-DOM:** Extended deadlines are evaluated in the institution's configured timezone.

### F. Permissions and Access Control
* **Student / Group Member:** Create and view extension requests strictly for their own project (`ST-25`, `ST-26`, `SEC-11`).
* **Project Supervisor:** Recommend or decline extension requests strictly for projects currently assigned to them (`PS-19`, `SEC-12`).
* **Project Coordinator:** Approve or reject supervisor-recommended extension requests strictly within their assigned Programme and Session (`PC-17`, `BR-03`).

### G. Data Requirements
* **Captured:** Extension Request ID, Institution ID (`F-01`), Programme ID (`F-11`), Academic Session ID (`F-12`), Project ID (`F-21`), Milestone ID (`F-29`), Original Effective Deadline, Requested Extended Deadline, Approved Extended Deadline (nullable), Student Reason, Optional Supporting Document Reference (`F-76`), Requested By User ID, Request Timestamp, Supervisor User ID, Supervisor Decision (`RECOMMENDED`, `DECLINED`), Supervisor Comments, Supervisor Decision Timestamp, Coordinator User ID, Coordinator Decision (`APPROVED`, `REJECTED`), Coordinator Comments, Coordinator Decision Timestamp, Overall Request Status.

### H. Dependencies and Integrations
* **Required Features:** `F-29`, `F-30`, `F-40`, `F-41`, `F-43`, `F-44`, `F-64`, `F-66`, `F-71`–`F-77`, `F-79`, `F-80`, `F-82`.

### I. Acceptance Criteria
* **AC-F42-01 (Positive — End-to-End Extension Request, Supervisor Recommendation & Coordinator Approval):** Given Milestone 1 has an original deadline of `2026-12-01 23:59 WAT`, When a Student requests an extension to `2026-12-08 23:59 WAT` (`ST-25`), the assigned Supervisor recommends the request (`PS-19`), and the Project Coordinator approves the request (`PC-17`), Then the request status becomes `Approved` (`ST-26`), the project's Effective Deadline for Milestone 1 updates to `2026-12-08 23:59 WAT`, an audit record is logged (`F-82`), and a submission made on `2026-12-06` is recorded as `On Time`.
* **AC-F42-02 (Business Rule — Coordinator Cannot Approve Without Supervisor Recommendation):** Given a Student has submitted an extension request that is still `Pending Supervisor Recommendation` or was `Declined by Supervisor`, When the Project Coordinator views the request, Then the system prevents the Coordinator from approving the extension (`BR-15`).
* **AC-F42-03 (Validation — Requested Date Must Be After Current Deadline):** Given a Milestone Effective Deadline of `2026-12-01 23:59 WAT`, When a Student attempts to request an extended deadline of `2026-11-28 23:59 WAT`, Then the system rejects the request with a date validation error.

---

## F-43: Late Submission Recording

### A. Feature Identification
* **Feature ID:** F-43
* **Feature Name:** Late Submission Recording
* **Feature Category:** Deadlines & Exceptions (Supporting System Capability & User-Facing Status)
* **Primary Actor:** Student (submits late work & views late status)
* **Supporting Actors:** Missed Deadline Detection (`F-80`), Milestone Submission (`F-32`), Late Penalty Management (`F-44`), Project Supervisor, Project Coordinator
* **MVP Priority:** P0
* **Source User Stories:** ST-27
* **Short Feature Description:** Automatically detects, timestamps, and records any formal milestone or final project submission made after the applicable Effective Deadline (`F-30` / `F-42`), preserving the exact lateness duration and exposing the late status to the Student, Supervisor, and Coordinator.

### B. Business Purpose
* **Problem Solved:** Academic programmes allow students to submit work after a missed deadline (`BR-13`) rather than permanently locking them out of their degree, but require objective, tamper-proof recording of the fact and duration of lateness.
* **Necessity for Clario:** Implements `BR-12` ("Missed deadlines are automatically recorded as late") and `BR-13` ("Late submissions remain possible and can affect grades"), providing the factual input required by `F-44` (Late Submission Penalty Management).
* **Business/Academic Value:** Eliminates disputes over whether a submission was late by comparing the authoritative server receipt timestamp against the institution's timezone deadline.
* **Impact if Omitted:** Late submissions could not be distinguished from on-time submissions, and automated late penalties (`F-44`) could not be calculated.

### C. Functional Requirements
* **FR-145:** The system must permit a Student (or Designated Group Submitter `F-23`) to upload and confirm a formal milestone or final project submission (`F-32`, `F-35`) even after the milestone's Effective Deadline (`F-30` / `F-42`) has passed (`BR-13`), provided the Academic Session is still `Active` (`F-12`) and project results have not been approved/published (`F-59`, `F-60`).
* **FR-146:** At the moment a formal submission is confirmed on the server (`DAT-03`), the system must compare `Server Receipt Timestamp` against the project's `Effective Deadline Timestamp` for that milestone (evaluated in the institution's configured timezone `NFR-DOM`):
  * If `Server Receipt Timestamp <= Effective Deadline Timestamp` (plus any configured programme grace buffer from `F-44` / `OD-05`), the submission version is recorded with `is_late = false` (`On Time`).
  * If `Server Receipt Timestamp > Effective Deadline Timestamp` (beyond any configured grace buffer), the submission version is automatically recorded with `is_late = true` (`Late` per `BR-12`) and the exact `Late Duration` (in minutes, hours, and calendar days) is calculated and stored.
* **FR-147:** The system must clearly display the `Submitted Late` badge, the Effective Deadline, the Server Receipt Timestamp, the calculated `Late Duration`, and any applicable grading consequence/penalty (`F-44`) to the Student/Group (`ST-27`), the Project Supervisor, and the Project Coordinator.

### D. User Interaction and Behaviour
* **Access:** Displayed automatically on Milestone Submission panels (`F-32`), Version History (`F-35`), Group Submission Tracking (`F-38`), and Late Penalty views (`F-44`, `ST-27`).
* **Information Viewed:** Prior to submitting past a deadline, the Student sees a prominent warning banner: *"The deadline for this milestone passed on [Effective Deadline WAT]. Your submission will be recorded as LATE and may be subject to programme late-submission penalties."* After submission, the receipt and version record display `Submitted Late (+X days, Y hours after deadline)`.
* **Actions Performed:** Proceed with Late Formal Submission (`F-32`), View Late Submission Status & Grading Consequence (`ST-27`).
* **Validations:** Timestamp comparison must use authoritative server clock in the institution's timezone (`NFR-DOM`), never the client device's local clock.
* **Post-Action Behaviour:** Late submission record immediately triggers `F-44` penalty evaluation.
* **States:** Pre-submission late warning state, Post-submission `Submitted Late` state.

### E. Business Rules
* **BR-12:** Missed deadlines are automatically recorded as late.
* **BR-13:** Late submissions remain possible and can affect grades.
* **NFR-DOM:** Deadline comparison uses the institution's configured timezone.

### F. Permissions and Access Control
* **System (`F-32` / `F-80`):** Automatically calculates and locks the `is_late` and `Late Duration` attributes on every submission version; no human actor can falsify the server receipt timestamp.
* **Student, Project Supervisor, Project Coordinator:** Read access to late submission status and duration within their authorised project/programme scope.

### G. Data Requirements
* **Captured:** Submission Version ID (`F-32`, `F-35`), Effective Deadline Timestamp at Receipt, Server Receipt Timestamp, `is_late` (boolean), `late_duration_minutes` (integer), `late_duration_days_ceil` (integer), Linked Late Penalty Record ID (`F-44`, nullable).

### H. Dependencies and Integrations
* **Required Features:** `F-30`, `F-32`, `F-35`, `F-42`, `F-44`, `F-80`.

### I. Acceptance Criteria
* **AC-F43-01 (Positive — Automatic Late Recording Past Effective Deadline):** Given Milestone 1 has an Effective Deadline of `2026-12-01 23:59:00 WAT` (and zero grace period), When a Student confirms a formal submission at `2026-12-02 02:14:00 WAT`, Then the system allows the submission (`BR-13`), automatically marks the version `is_late = true` (`BR-12`), records a late duration of `2 hours 15 minutes`, and displays the `Submitted Late` status and penalty impact to the Student (`ST-27`).
* **AC-F43-02 (Integrity — Client Clock Manipulation Ignored):** Given a Student whose device clock is manually set back to `2026-11-30` while the authoritative server time in `WAT` is `2026-12-03` (past the `2026-12-01` deadline), When the Student confirms a submission, Then the system evaluates lateness using the server timestamp and records the submission as `Late`.

---

## F-44: Late Submission Penalty Management

### A. Feature Identification
* **Feature ID:** F-44
* **Feature Name:** Late Submission Penalty Management
* **Feature Category:** Deadlines & Exceptions & Grading (User-Facing Functionality)
* **Primary Actor:** Project Coordinator
* **Supporting Actors:** Student (`ST-27` — views penalty rules and applied/overridden penalty), Project Supervisor, Final Assessment Consolidation (`F-58`), Audit Process (`F-82`)
* **MVP Priority:** P0
* **Source User Stories:** PC-18, PC-19, ST-27
* **Short Feature Description:** Enables Project Coordinators to configure programme-level late submission penalty rules (`PC-18`), automatically calculates late penalties on late submissions recorded by `F-43`, allows Coordinators to override or waive calculated penalties with mandatory justification (`PC-19`), and exposes late penalty rules and applied deductions to Students (`ST-27`).

### B. Business Purpose
* **Problem Solved:** When a submission is recorded as late (`F-43`), academic programmes need consistent, transparent enforcement of their grading deduction policy, paired with an auditable Coordinator override mechanism for extenuating circumstances where a retroactive waiver/adjustment is warranted.
* **Necessity for Clario:** Implements `BR-13` and `BR-14` ("Late penalties follow configured rules, subject to Coordinator override") across `PC-18`, `PC-19`, and `ST-27`.
* **Business/Academic Value:** Ensures fair, predictable application of programme late-submission policies while preserving human administrative discretion with full auditability.
* **Impact if Omitted:** Coordinators would have to manually compute and deduct late penalties outside the platform, or students would not know how late submissions affect their grades (`ST-27`).

### C. Functional Requirements
* **FR-148:** The system must allow a Project Coordinator to configure Late Submission Penalty Rules (`PC-18`) for their assigned Programme and Academic Session. Because exact institutional penalty formulas, caps, and grace buffers are tracked under Open Decision `OD-05` (`GAP-09`), the configuration engine must support:
  1. **Enable/Disable Late Penalties** for the programme/milestone.
  2. **Configurable Grace Buffer** (in minutes/hours after the deadline before penalties begin, default $0$).
  3. **Configurable Penalty Calculation Mode** (selectable from standard academic modes pending `OD-05` confirmation: e.g., `No Automated Grade Deduction / Advisory Only`, `Flat Mark/Percentage Deduction per Day Late`, or `Fixed Flat Deduction for Late Submission`).
  4. **Configurable Maximum Penalty Cap** (e.g., maximum mark deduction or floor at the programme pass mark).
* **FR-149:** Whenever `F-43` records a late submission (`is_late = true`) on a milestone subject to late penalties, the system must automatically calculate the `Calculated Late Penalty` according to the programme's configured rule (`FR-148`) and attach the penalty record to the project.
* **FR-150:** The system must allow the Project Coordinator (`PC-19`) to **Override or Waive** any automatically calculated late submission penalty for a specific student or project group by specifying:
  1. Override Action (`Waive Penalty Completely (Set to 0)` or `Adjust Penalty Value`).
  2. Overridden Penalty Value ($\ge 0$ and $\le$ Calculated Penalty).
  3. Mandatory Justification / Reason for Override ($10$–$1,000$ chars).
* **FR-151:** Every late penalty configuration change (`PC-18`) and every Coordinator penalty override (`PC-19`) must be recorded in the tamper-resistant audit log (`F-82`, `NFR-AUD`) with previous and resulting values.
* **FR-152:** The system must display the programme's configured late penalty policy, the calculated penalty for any late submission, and any Coordinator override status (`Active Penalty`, `Overridden`, `Waived`) to the Student/Group (`ST-27`) and carry the effective penalty into Final Assessment Consolidation (`F-58`).

### D. User Interaction and Behaviour
* **Access:** Project Coordinator via "Programme Configuration -> Late Submission Policy" (`PC-18`) and "Programme Workspace -> Late Submissions & Penalty Overrides" (`PC-19`); Student via "Project Workspace -> Milestones / Late Submission Details" (`ST-27`).
* **Information Viewed:** Programme Late Penalty Rule summary card, Late Submissions table (Student/Group, Milestone, Effective Deadline, Submitted Timestamp, Late Duration, Automatically Calculated Penalty, Override Status, Effective Applied Penalty, Override Reason), and Override modal.
* **Actions Performed:** Configure Programme Late Penalty Rules (`PC-18`), Override/Waive Late Penalty (`PC-19`), View Late Penalty & Grading Consequence (`ST-27`).
* **Validations:** Grace buffer $\ge 0\text{ minutes}$; Penalty rate $\ge 0$; Max Penalty Cap $\ge 0$; Coordinator Override requires a mandatory written justification ($10$–$1,000$ chars) and cannot be modified after the project's final result is `Published` (`F-60`).
* **Post-Action Behaviour:** Penalty override recalculates the project's consolidated net score (`F-58`), logs an audit entry (`F-82`), and notifies the Student/Group (`F-72`).
* **States:** Loading, No-penalty configured state, Penalty Applied state, Penalty Overridden/Waived state.

### E. Business Rules
* **BR-13:** Late submissions remain possible and can affect grades.
* **BR-14:** Late penalties follow configured rules, subject to Coordinator override.
* **NFR-AUD:** Late penalty configuration changes and Coordinator overrides must be logged in `F-82`.
* **Open Decision Reference (`OD-05` / `GAP-09`):** Exact default penalty calculation method, penalty limits, and grace periods are tracked in `mvp-open-decisions.md`. *(Note: "Advanced late-penalty configuration" is P2 per `mvp-p.md` §6; the MVP implements the foundational programme-level rule and Coordinator override).*

### F. Permissions and Access Control
* **Project Coordinator:** Full access to configure late penalty rules (`PC-18`) and execute justified penalty overrides (`PC-19`) within their assigned Programme and Session.
* **Student / Group Members:** Read-only access to the programme's late penalty policy and their own project's late submission penalty/override status (`ST-27`, `SEC-11`).
* **Project Supervisor:** Read-only visibility of late status on assigned projects.

### G. Data Requirements
* **Captured:**
  * *Rule Config:* Rule ID, Programme ID (`F-11`), Academic Session ID (`F-12`), Penalties Enabled (boolean), Grace Period Minutes, Calculation Mode, Penalty Value per Unit, Max Penalty Cap, Applicable Milestone Scope.
  * *Project Penalty Record:* Penalty Record ID, Project ID (`F-21`), Submission Version ID (`F-32`), Late Duration (`F-43`), Calculated Penalty Value, Is Overridden (boolean), Overridden Penalty Value (nullable), Effective Penalty Value, Override Reason (nullable), Overridden By Coordinator ID (nullable), Override Timestamp.

### H. Dependencies and Integrations
* **Required Features:** `F-30`, `F-32`, `F-43`, `F-51`, `F-58`, `F-64`, `F-66`, `F-72`, `F-82`.

### I. Acceptance Criteria
* **AC-F44-01 (Positive — Automated Penalty Calculation & Student Visibility):** Given a Programme configured with a late penalty rule of `2 marks per day late (capped at 10 marks)` (`PC-18`), When a Student submits the Final Project $3\text{ days}$ after the Effective Deadline (`F-43`), Then the system automatically calculates a `6-mark` late penalty and displays the late status and `6-mark` deduction consequence to the Student (`ST-27`) and Coordinator.
* **AC-F44-02 (Positive — Justified Coordinator Penalty Override):** Given a project has an automatically calculated `6-mark` late penalty, When the Project Coordinator overrides the penalty to `0 marks (Waived)` and enters justification `Verified hospital admission certificate provided` (`PC-19`), Then the Effective Penalty becomes `0 marks`, the consolidation engine (`F-58`) applies zero deduction, and an audit log entry (`F-82`) records the previous value (`6`), new value (`0`), Coordinator ID, and justification.
* **AC-F44-03 (Validation — Override Requires Justification):** Given a Coordinator attempting to override a late penalty (`PC-19`), When they submit the override without entering a justification reason, Then the system rejects the override with a validation error.

---

# Module H: Examination and Defence Management

*(Scope Reminder: External Examiner accounts and workflows are explicitly excluded from the MVP per `mvp-p.md` §10. All examination features below apply strictly to institutional **Project Examiners** appointed by the Project Coordinator).*

## F-46: Project Examiner Appointment

### A. Feature Identification
* **Feature ID:** F-46
* **Feature Name:** Project Examiner Appointment
* **Feature Category:** Examination & Defence Management (User-Facing Functionality)
* **Primary Actor:** Project Coordinator
* **Supporting Actors:** Project Examiner (receives assignment), Eligibility & Independence Enforcement (`F-48`), Panel Configuration (`F-47`), Notification Services (`F-71`, `F-72`), Audit Process (`F-82`)
* **MVP Priority:** P0
* **Source User Stories:** PC-23
* **Short Feature Description:** Enables Project Coordinators to appoint one or more eligible institutional Project Examiners to individual and group projects within their Programme and Academic Session for independent assessment.

### B. Business Purpose
* **Problem Solved:** Final-year projects require independent academic evaluation separate from supervision. Coordinators need a structured way to assign eligible academic staff as Project Examiners to specific projects or examination panels.
* **Necessity for Clario:** Implements `PC-23` and establishes the assignment scope (`SEC-13`) required for Examiners to access examination materials (`F-50`) and submit assessments (`F-52`–`F-55`).
* **Business/Academic Value:** Ensures every project has clearly appointed, conflict-free Examiners prior to defence day.
* **Impact if Omitted:** No Project Examiner could access any project (`SEC-13`) or record document/defence scores (`F-52`–`F-55`).

### C. Functional Requirements
* **FR-153:** The system must allow a Project Coordinator to appoint one or more eligible users holding the `Project Examiner` role (`F-14`) within the institution to any Individual Project or Group Project (`F-21`) in their assigned Programme and Academic Session (`PC-23`).
* **FR-154:** Before persisting any Examiner appointment, the system must invoke `F-48` (Examiner Eligibility and Independence Enforcement) to verify that the selected Examiner is **not** the current or former Project Supervisor (`F-24`, `F-27`) of that project (`BR-16`).
* **FR-155:** The system must support appointing Examiners to projects individually or in bulk (e.g., assigning a panel of Examiners to a batch of projects scheduled for the same defence session), respecting the panel configuration (`F-47`).
* **FR-156:** Upon Examiner appointment, the system must:
  1. Grant the appointed Examiner scoped examination access (`SEC-13`) to the assigned project (`F-50`).
  2. Initialize the Examiner's assessment record (`Pending Submission` in `F-55`).
  3. Record a critical academic audit log entry (`F-82`, `NFR-AUD`).
  4. Dispatch in-app and email appointment notifications (`F-71`, `F-72`) to the appointed Examiner.
* **FR-157:** The system must allow a Project Coordinator to replace or remove an appointed Examiner on a project prior to result approval/publication (`F-59`, `F-60`) if the Examiner becomes unavailable, revoking the removed Examiner's access (`F-66`) and logging the change in `F-82`.

### D. User Interaction and Behaviour
* **Access:** Project Coordinator Workspace -> "Examinations -> Examiner Appointments" (`PC-23`).
* **Information Viewed:** Table of projects in the Programme and Session showing Project Title, Student/Group Name, Current & Former Supervisor(s) (flagged as excluded from examining per `BR-16`), Required Panel Size (`F-47`), Currently Appointed Examiners, and Examiner Assessment Status (`Pending`, `Submitted`).
* **Actions Performed:** Appoint Examiner(s) to Project, Bulk Assign Examination Panel, Remove/Replace Unsubmitted Examiner.
* **Validations:** Examiner must be an `Active` user in the institution holding the `Project Examiner` role (`F-14`); Examiner must pass `F-48` independence check (`BR-16`); duplicate appointment of the same Examiner to the same project is prevented.
* **Post-Action Behaviour:** Appointment saved, `F-50` examination material access granted, audit record logged (`F-82`), and Examiner notified (`F-71`, `F-72`).
* **States:** Loading, Unassigned state, Partially Assigned Panel state, Fully Assigned Panel state, Conflict error state (if Coordinator attempts to select the project's Supervisor).

### E. Business Rules
* **BR-03:** Scoped strictly to the Coordinator's assigned Programme and Academic Session.
* **BR-16:** Supervisors cannot examine projects they supervised.
* **BR-20:** Examination panels can contain one or multiple examiners (`F-47`).
* **NFR-AUD:** Examiner appointments and removals are logged in `F-82`.

### F. Permissions and Access Control
* **Project Coordinator:** Full authority to appoint and manage Project Examiners within their assigned Programme and Session.
* **Project Examiner:** Read-only access to their own examination appointments (`PE-01`, `SEC-13`).

### G. Data Requirements
* **Captured:** Examiner Appointment ID, Institution ID (`F-01`), Programme ID (`F-11`), Academic Session ID (`F-12`), Project ID (`F-21`), Examiner User ID (`F-13`), Appointment Status (`Active`, `Removed`), Appointed By Coordinator ID, Appointed Timestamp, Removed Timestamp & Reason (nullable).

### H. Dependencies and Integrations
* **Required Features:** `F-13`, `F-14`, `F-21`, `F-24`, `F-27`, `F-47`, `F-48`, `F-50`, `F-64`, `F-66`, `F-71`, `F-72`, `F-82`.
* **Consumed By:** `F-49` (Defence Scheduling), `F-50` (Examination Material Access), `F-52`–`F-55` (Examiner Assessment), `F-57` & `F-58` (Monitoring & Consolidation).

### I. Acceptance Criteria
* **AC-F46-01 (Positive — Appointing Eligible Examiner to Project):** Given Dr. Bello holds the `Project Examiner` role and did not supervise Project X, When the Project Coordinator appoints Dr. Bello to examine Project X (`PC-23`), Then the appointment is saved, Dr. Bello gains access to Project X's examination materials (`F-50`), an audit log entry is recorded (`F-82`), and Dr. Bello receives a notification.
* **AC-F46-02 (Positive — Replacing Unavailable Examiner Before Publication):** Given Examiner A was appointed to Project X but has not submitted an assessment and becomes unavailable, When the Coordinator replaces Examiner A with eligible Examiner B, Then Examiner A's access to Project X is revoked (`SEC-13`), Examiner B gains access, and the change is logged in `F-82`.

---

## F-47: Examination Panel Configuration

### A. Feature Identification
* **Feature ID:** F-47
* **Feature Name:** Examination Panel Configuration
* **Feature Category:** Examination & Defence Management (User-Facing Functionality)
* **Primary Actor:** Project Coordinator
* **Supporting Actors:** Project Examiner, Final Assessment Consolidation (`F-58`), Audit Process (`F-82`)
* **MVP Priority:** P0
* **Source User Stories:** PC-24
* **Short Feature Description:** Enables Project Coordinators to configure single-examiner or multi-examiner panel structures for their Programme and Academic Session (or specific projects), defining how many Project Examiners are assigned to evaluate each project and how panel completion is tracked.

### B. Business Purpose
* **Problem Solved:** Different academic programmes (and sometimes different degree tracks) use different examination arrangements — some assign a single internal Examiner per project, while others use a 2-person or 3-person examination panel.
* **Necessity for Clario:** Implements `BR-20` ("Examination panels can contain one or multiple examiners") and `PC-24`, governing when a project's examination assessment is considered complete (`F-57`) and how panel scores are consolidated (`F-51`, `F-58`).
* **Business/Academic Value:** Supports both single-examiner and multi-examiner academic governance models without hardcoding a fixed number of examiners.
* **Impact if Omitted:** The system could not know how many Examiner assessments are expected for a project before allowing result consolidation (`F-58`) and approval (`F-59`).

### C. Functional Requirements
* **FR-158:** The system must allow a Project Coordinator to configure the default Examination Panel Size (minimum required Examiners per project, integer $\ge 1$, e.g., $1$ for Single Examiner or $2\dots N$ for Multi-Examiner Panel) for their Programme and Academic Session (`PC-24`, `BR-20`), and optionally adjust the panel size for specific projects or reusable named Examination Panels (e.g., `Panel A - Software Systems`, `Panel B - Networks & AI`).
* **FR-159:** The system must allow a Project Coordinator to create reusable named Examination Panels within their Programme and Session (consisting of $1$ or more eligible Project Examiners) and assign projects to a panel, automatically validating each panel member against `F-48` (`BR-16`) for every assigned project.
* **FR-160:** In Assessment Completion Monitoring (`F-57`) and Final Assessment Consolidation (`F-58`), a project's Examiner Assessment component must only be marked `Complete` when **all** active Examiners appointed to that project's panel (`F-46`, `F-47`) have formally submitted their assessments (`F-55`).

### D. User Interaction and Behaviour
* **Access:** Project Coordinator Workspace -> "Examinations -> Panel Configuration" (`PC-24`).
* **Information Viewed:** Programme Default Panel Size setting, list of named Examination Panels (Panel Name, Member Examiners, Assigned Projects Count, Assigned Defence Venue/Schedule `F-49`), and per-project appointed Examiner count vs. required panel size.
* **Actions Performed:** Set Programme Default Panel Size, Create/Edit Named Examination Panel, Assign Projects to Panel (with automatic `F-48` conflict detection).
* **Validations:** Required Panel Size must be an integer $\ge 1$ (e.g., $1$ to $10$); if assigning a project to a named panel where one of the panel members is that project's Supervisor (`BR-16`), the system must flag the conflict (`F-48`) and exclude that Supervisor from examining that project or require a substitute Examiner for that project.
* **Post-Action Behaviour:** Panel configuration saved, Examiner appointments (`F-46`) created/updated, and audit entry recorded (`F-82`).
* **States:** Loading, Single-Examiner mode, Multi-Examiner Panel mode, Conflict warning state if a panel member supervised one of the selected projects.

### E. Business Rules
* **BR-16:** Supervisors cannot examine projects they supervised, even when assigned via a multi-member Examination Panel.
* **BR-20:** Examination panels can contain one or multiple examiners.
* **MVP Decision (`mvp-p.md` §2.4, §7):** The Coordinator configures the Examiner-score consolidation method per programme (`F-51`, `F-58`).

### F. Permissions and Access Control
* **Project Coordinator:** Full access to configure panel structures and named panels within their assigned Programme and Session.
* **Project Examiner:** Read-only visibility of their own panel assignments (`PE-01`, `PE-03`).

### G. Data Requirements
* **Captured:** Panel Configuration ID, Programme ID (`F-11`), Academic Session ID (`F-12`), Default Required Examiners Count ($\ge 1$), Named Panel ID (optional), Panel Name, Panel Member Examiner IDs (`F-46`), Linked Project IDs (`F-21`).

### H. Dependencies and Integrations
* **Required Features:** `F-11`, `F-12`, `F-46`, `F-48`, `F-51`, `F-57`, `F-58`, `F-66`, `F-82`.

### I. Acceptance Criteria
* **AC-F47-01 (Positive — Multi-Examiner Panel Configuration & Completion Gating):** Given a Coordinator configures a 3-Examiner panel (`Examiner 1`, `Examiner 2`, `Examiner 3`) for Project X (`PC-24`, `BR-20`), When `Examiner 1` and `Examiner 2` submit their assessments (`F-55`) while `Examiner 3` has not yet submitted, Then the system shows Project X as `2 of 3 Examiner Assessments Submitted (Incomplete)` (`F-57`) and prevents final result approval (`F-59`) until `Examiner 3` also submits.
* **AC-F47-02 (Positive — Single-Examiner Configuration):** Given a Coordinator configures a Single-Examiner structure ($1$ Examiner required) for Project Y and appoints `Examiner 1`, When `Examiner 1` submits their assessment (`F-55`), Then the Examiner assessment component for Project Y is immediately marked `Complete (1 of 1)`.

---

## F-48: Examiner Eligibility and Independence Enforcement

### A. Feature Identification
* **Feature ID:** F-48
* **Feature Name:** Examiner Eligibility and Independence Enforcement
* **Feature Category:** Examination & Defence Management & Security Enforcement (Supporting System Capability & Access Control)
* **Primary Actor:** Project Coordinator (during appointment), Project Examiner (subject of enforcement)
* **Supporting Actors:** Access Control Service (`F-66`), Audit Process (`F-82`)
* **MVP Priority:** P0
* **Source User Stories:** PC-25, PE-12, PE-13
* **Short Feature Description:** Enforces strict academic conflict-of-interest and authorization rules preventing any current or former Project Supervisor from being appointed to examine or score a project they supervised (`BR-16`, `PC-25`, `PE-13`), restricting Project Examiners strictly to their assigned projects (`PE-12`, `SEC-13`), and isolating Examiner grading from Supervisor grading (`BR-17`).

### B. Business Purpose
* **Problem Solved:** Academic examination integrity is compromised if a Supervisor can grade their own supervisee as an Examiner, if an Examiner can browse unassigned student projects, or if Examiners and Supervisors can see/alter each other's scores during assessment.
* **Necessity for Clario:** Enforces `BR-16`, `BR-17`, and `SEC-13` across appointment (`F-46`), material access (`F-50`), and grading (`F-52`–`F-56`).
* **Business/Academic Value:** Guarantees objective, independent examination outcomes across every institution on Clario.
* **Impact if Omitted:** Supervisors could examine their own students, violating core university examination regulations (`BR-16`).

### C. Functional Requirements
* **FR-161:** When a Project Coordinator selects or bulk-assigns Project Examiners (`F-46`, `F-47`), the system must automatically exclude and block any user who is currently assigned (`F-24`) or was previously assigned prior to a reassignment (`F-27`) as a Project Supervisor for that project (`PC-25`, `BR-16`).
* **FR-162:** Conversely, if a Project Coordinator attempts to reassign a project (`F-27`) to a new Supervisor who is already appointed as a Project Examiner (`F-46`) on that project, the system must block the reassignment unless the Examiner appointment is first removed.
* **FR-163:** The system must enforce strict assignment-scoped access control (`PE-12`, `SEC-13`, `F-66`): a Project Examiner can view and access **only** projects to which they hold an `Active` Examiner Appointment (`F-46`), and cannot view, modify, or comment on student milestone drafts, supervisory discussions (`F-34`), or Supervisor performance grades (`F-39`, `F-56`).
* **FR-164:** Where multiple Examiners are appointed to a project panel (`F-47`), each Examiner must record and submit their assessment (`F-52`–`F-55`) independently (`PE-13`) without viewing or editing another Examiner's individual scores or feedback, and without viewing the Supervisor's performance score (`BR-17`).

### D. User Interaction and Behaviour
* **Access:** Automatically enforced in Examiner selection dropdowns (`F-46`, `F-47`), Examiner Workspace routes (`F-50`, `F-52`–`F-55`), and API authorization middleware (`F-66`).
* **Information Viewed:** In `F-46`, the project's Supervisor(s) are badged `Ineligible — Project Supervisor (BR-16)` and disabled from selection; in the Examiner Workspace (`PE-01`), only assigned projects appear.
* **Post-Action Behaviour (Failure/Violation Attempt):** Any API attempt to appoint a project's Supervisor as its Examiner, or any attempt by an Examiner to access an unassigned project or view Supervisor scores, is rejected with `403 Forbidden / Conflict of Interest (BR-16)` and logged in `F-82`.

### E. Business Rules
* **BR-02 & SEC-13:** Examiners can only access projects specifically assigned to them for examination (`PE-12`).
* **BR-16:** Supervisors cannot examine projects they supervised (`PC-25`, `PE-13`).
* **BR-17:** Supervisor assessment and Examiner assessment are independent (`PE-13`).

### F. Permissions and Access Control
* **System Access Control (`F-66`):** Enforces `BR-16`, `BR-17`, and `SEC-13` on all appointment, document retrieval (`F-77`), and grading operations.

### G. Data Requirements
* **Evaluated Relationships:** Project Supervision History (`F-24`, `F-27` — all current and historical Supervisor User IDs for `Project ID`) vs. Candidate Examiner User ID (`F-46`); Active Examiner Appointments (`F-46`) vs. Requested Resource `Project ID`.

### H. Dependencies and Integrations
* **Required Features:** `F-24`, `F-27`, `F-46`, `F-47`, `F-50`, `F-52`–`F-56`, `F-66`, `F-77`, `F-82`.

### I. Acceptance Criteria
* **AC-F48-01 (Business Rule — Block Supervisor from Examining Supervised Project):** Given Dr. Musa is the assigned Project Supervisor for Project Z (either Individual or Group), When the Project Coordinator attempts to appoint Dr. Musa as a Project Examiner for Project Z (`F-46`, `F-47`), Then the system blocks the appointment and displays a conflict-of-interest error (`BR-16`, `PC-25`).
* **AC-F48-02 (Permission — Block Examiner Access to Unassigned Project):** Given Dr. Bello is appointed as Project Examiner for Project X but not Project Y, When Dr. Bello attempts to view Project Y or download Project Y's final document (`F-50`, `F-77`), Then the system denies access with a `403 Forbidden` response (`PE-12`, `SEC-13`).
* **AC-F48-03 (Independence — Blind Grading Between Examiners and Supervisor):** Given Dr. Bello is examining Project X, When Dr. Bello opens the Project X examination grading sheet (`F-52`–`F-54`), Then Dr. Bello cannot view the Project Supervisor's performance score (`F-56`) or any co-examiner's scores (`BR-17`, `PE-13`).

---

## F-49: Defence Scheduling

### A. Feature Identification
* **Feature ID:** F-49
* **Feature Name:** Defence Scheduling
* **Feature Category:** Examination & Defence Management (User-Facing Functionality)
* **Primary Actor:** Project Coordinator
* **Supporting Actors:** Project Examiner (`PE-03`), Student (`ST-30`), Project Supervisor, Notification Services (`F-71`–`F-73`), Audit Process (`F-82`)
* **MVP Priority:** P0
* **Source User Stories:** PC-28, PC-29, PE-03, ST-30
* **Short Feature Description:** Enables Project Coordinators to schedule, update, and manage oral project defence dates, times, and physical/virtual venues for projects within their Programme and Academic Session (`PC-28`, `PC-29`), making defence schedules visible to assigned Project Examiners (`PE-03`), Students/Groups (`ST-30`), and Supervisors.

### B. Business Purpose
* **Problem Solved:** Oral project defences require coordinating students, groups, examination panels, dates, timeslots, and venues. Without centralized defence scheduling and change notifications, students and examiners risk missing or double-booking examination sessions.
* **Necessity for Clario:** Implements `PC-28`, `PC-29`, `PE-03`, and `ST-30`.
* **Business/Academic Value:** Provides a single source of truth for defence logistics in the institution's configured timezone (`NFR-DOM`).
* **Impact if Omitted:** Examiners and students would not know when or where project defences take place, and updates to defence schedules would not reach participants reliably.

### C. Functional Requirements
* **FR-165:** The system must allow a Project Coordinator to schedule a Project Defence (`PC-28`) for one or more projects (individually or as a batch/session assigned to an Examination Panel `F-47`) within their assigned Programme and Academic Session, specifying:
  1. Defence Date (within the Academic Session `F-12`).
  2. Start Time and End Time (in the institution's configured timezone `NFR-DOM`).
  3. Defence Venue / Location (physical room/hall name and/or virtual meeting link/instructions).
  4. Optional Defence Instructions/Notes for Students and Examiners.
* **FR-166:** When scheduling or updating a defence (`PC-28`, `PC-29`), the system must check for and warn the Coordinator of any **Examiner Schedule Conflict** (where an appointed Examiner `F-46` is already scheduled for another overlapping defence timeslot in another room/panel at the same date and time).
* **FR-167:** The system must allow the Project Coordinator to update/reschedule defence dates, times, or venues (`PC-29`) at any time prior to result approval/publication, logging the schedule creation or update in `F-82`.
* **FR-168:** Whenever a defence schedule is published or updated (`PC-28`, `PC-29`), the system must:
  1. Display the defence schedule immediately in the **Student/Group Workspace (`ST-30`, `F-28`, `F-36`)** and the **Examiner Workspace (`PE-03`)** (and to the assigned Supervisor).
  2. Dispatch in-app and email notifications (`F-71`–`F-73`) to the assigned Student(s)/Group Members, appointed Project Examiner(s), and assigned Supervisor detailing the defence date, time (with timezone), and venue.

### D. User Interaction and Behaviour
* **Access:** Project Coordinator via "Programme Workspace -> Examinations -> Defence Schedule" (`PC-28`, `PC-29`); Project Examiner via "Examiner Workspace -> Defence Schedule" (`PE-03`); Student via "Project Workspace -> Defence & Results" (`ST-30`).
* **Information Viewed:** Defence Calendar/Table view showing Project Title, Student/Group Name & Matriculation Number(s), Appointed Examiner(s)/Panel (`F-46`, `F-47`), Defence Date, Start–End Time (with institutional timezone badge, e.g., `WAT`), Venue/Location, Defence Instructions, and Schedule Status (`Scheduled`, `Rescheduled`, `Completed`).
* **Actions Performed:** Schedule Project Defence (`PC-28`), Batch-Schedule Panel Defences, Update/Reschedule Defence (`PC-29`), View Assigned Defence Schedule (`PE-03`, `ST-30`).
* **Validations:** Defence Date & Time must be valid and within the Academic Session (`F-12`); `End Time > Start Time`; Venue (required, 3–250 chars); warns or blocks overlapping timeslot conflicts for the same Examiner or Student.
* **Post-Action Behaviour:** Schedule persists, views update for Students (`ST-30`) and Examiners (`PE-03`), notifications (`F-71`–`F-73`) are sent, and audit record (`F-82`) is written.
* **States:** Loading, Unscheduled state ("Defence not yet scheduled"), Scheduled state, Rescheduled alert banner.

### E. Business Rules
* **BR-03:** Defence scheduling is scoped to the Coordinator's assigned Programme and Academic Session.
* **NFR-DOM:** All defence dates and times use the institution's configured timezone.

### F. Permissions and Access Control
* **Project Coordinator:** Full create and update access for defence schedules within their assigned Programme and Session (`PC-28`, `PC-29`).
* **Project Examiner:** Read-only access to defence schedules of projects assigned to them (`PE-03`, `SEC-13`).
* **Student / Group Members:** Read-only access to their own project's defence schedule (`ST-30`, `SEC-11`).
* **Project Supervisor:** Read-only access to defence schedules of their supervised projects (`SEC-12`).

### G. Data Requirements
* **Captured:** Defence Schedule ID, Institution ID (`F-01`), Programme ID (`F-11`), Academic Session ID (`F-12`), Project ID (`F-21`), Panel ID (`F-47`, nullable), Defence Date, Start Time, End Time (stored with Institution Timezone), Venue/Location, Instructions/Notes (optional), Schedule Status (`Scheduled`, `Rescheduled`, `Completed`), Created/Updated By Coordinator ID, Timestamps.

### H. Dependencies and Integrations
* **Required Features:** `F-12`, `F-21`, `F-28`, `F-36`, `F-46`, `F-47`, `F-64`, `F-66`, `F-71`–`F-73`, `F-82`.

### I. Acceptance Criteria
* **AC-F49-01 (Positive — Schedule Defence & Notify Student and Examiners):** Given Project X has appointed Examiners `Examiner 1` and `Examiner 2`, When the Project Coordinator schedules Project X's defence for `2027-05-20`, `10:00–10:45 WAT` at `Engineering Lecture Theatre 2` (`PC-28`), Then the schedule is visible to the Student(s) (`ST-30`) and both Examiners (`PE-03`), and in-app/email notifications (`F-71`–`F-73`) are sent to all participants.
* **AC-F49-02 (Positive — Reschedule Defence Venue/Time):** Given Project X's defence is scheduled for `10:00 WAT` at `ELT 2`, When the Coordinator updates the schedule to `14:00 WAT` at `Computer Lab 1` (`PC-29`), Then the updated time and venue are immediately reflected in `ST-30` and `PE-03`, an audit entry is logged (`F-82`), and a reschedule notification is dispatched.
* **AC-F49-03 (Validation — Examiner Overlapping Timeslot Conflict Detection):** Given `Examiner 1` is already scheduled for a defence on `2027-05-20` from `10:00–10:45 WAT` in `Room A`, When the Coordinator attempts to schedule `Examiner 1` for another defence at `10:15–11:00 WAT` on the same date in `Room B`, Then the system flags an Examiner scheduling conflict.

---

## F-50: Examination Material Access

### A. Feature Identification
* **Feature ID:** F-50
* **Feature Name:** Examination Material Access
* **Feature Category:** Examination & Defence Management (User-Facing Functionality)
* **Primary Actor:** Project Examiner
* **Supporting Actors:** Authorised Document Retrieval Service (`F-77`), Access Control Service (`F-66`)
* **MVP Priority:** P0
* **Source User Stories:** PE-01, PE-02
* **Short Feature Description:** Provides appointed Project Examiners with a dedicated Examiner Workspace listing all projects assigned to them (`PE-01`) and granting secure, read-only access to each assigned project's final submitted project documents, abstract/topic details, defence schedule, and programme grading rubric (`PE-02`).

### B. Business Purpose
* **Problem Solved:** Project Examiners need streamlined access to the official final project dissertation/presentation files and examination criteria for the specific projects they are appointed to evaluate, without exposing intermediate supervisory drafts or unassigned projects.
* **Necessity for Clario:** Implements `PE-01` and `PE-02`, enforcing `SEC-13` and `F-77`.
* **Business/Academic Value:** Ensures Examiners evaluate the exact official Final Consolidated Project submission (`ST-11`, `F-32`) in a dedicated, distraction-free examination interface.
* **Impact if Omitted:** Appointed Examiners could not view their assigned project list or read the final project documents they are required to grade (`F-52`).

### C. Functional Requirements
* **FR-169:** The system must provide every authenticated Project Examiner with an **Examiner Workspace (`PE-01`)** displaying all Individual and Group Projects currently assigned to them (`F-46`), filterable by Academic Session, Programme, Defence Date (`F-49`), and Examiner Assessment Status (`Pending`, `Draft Saved`, `Submitted`, `Published/Locked` per `PE-11`).
* **FR-170:** When an Examiner selects an assigned project in the Examiner Workspace, the system must grant read-only access (`PE-02`, `F-77`) to the project's **Examination Package**, consisting of:
  1. Project Metadata: Approved Project Title & Abstract (`F-20`), Project Type (`Individual` or `Group`), and Student Name(s) & Matriculation Number(s) (`F-19`, `F-22`).
  2. Official Final Submitted Project Document(s) (`F-32` `Final Consolidated Project Submission` version — downloadable/viewable via `F-77`).
  3. Scheduled Defence Date, Time, Venue, and Instructions (`F-49`, `PE-03`).
  4. Programme Examination Rubric & Grading Criteria (`F-51`) alongside the Examiner's own Document & Defence Assessment grading sheet (`F-52`–`F-55`).
* **FR-171:** To preserve assessment independence (`BR-17`, `actors.md` §1.6), the Examination Material Access view must **not** allow the Examiner to modify student submissions, view or modify intermediate milestone supervisory feedback/discussions (`F-33`, `F-34`), or view the Supervisor's performance assessment (`F-56`).

### D. User Interaction and Behaviour
* **Access:** Project Examiner upon login -> "Examiner Workspace -> Assigned Projects" (`PE-01`) -> select project -> "Examination Materials & Grading" (`PE-02`).
* **Information Viewed:** Assigned Projects list (Title, Student/Group, Programme, Defence Date/Time/Venue, Assessment Status badge); Project Examination view showing Final Document Download/Preview card, Project Abstract, Group Member Roster (for group projects), Defence Schedule card, and Assessment Rubric panel (`F-52`–`F-55`).
* **Actions Performed:** View Assigned Projects (`PE-01`), Filter by Assessment/Defence Status, View/Download Final Project Document (`PE-02`, `F-77`), Navigate to Document/Defence Assessment (`F-52`–`F-55`).
* **Validations:** Strict verification (`F-66`, `F-77`, `SEC-13`) that the requesting Examiner holds an `Active` Examiner Appointment (`F-46`) for that project.
* **Post-Action Behaviour:** Authorised final document downloads via time-limited signed retrieval (`F-77`); workspace loads in under $2\text{ seconds}$ (`PER-01`).
* **States:** Loading, Empty state ("No projects currently assigned to you for examination"), Final Submission Pending state (if Coordinator appointed the Examiner before the student's final project document was submitted), Ready for Examination state.

### E. Business Rules
* **BR-02 & SEC-13:** Examiners can only access projects and documents specifically assigned to them (`PE-12`).
* **BR-17 & Actor Boundary (`actors.md` §1.6):** Examiners cannot modify student submissions or supervisor feedback, and cannot view Supervisor performance grades.

### F. Permissions and Access Control
* **Project Examiner:** Read-only access to project metadata, defence schedule, and final submitted documents strictly for projects assigned to them (`PE-01`, `PE-02`, `SEC-13`, `F-77`).
* **All Unassigned Examiners:** Denied access (`403 Forbidden`).

### G. Data Requirements
* **Displayed:** Examiner Appointment ID (`F-46`), Project ID (`F-21`), Project Title & Abstract (`F-20`), Student/Group Roster (`F-19`, `F-22`), Final Project Submission File Reference, File Name, Size, Version & Timestamp (`F-32`, `F-77`), Defence Schedule (`F-49`), Assessment Rubric & Examiner Assessment Status (`F-51`–`F-55`).

### H. Dependencies and Integrations
* **Required Features:** `F-21`, `F-32`, `F-46`, `F-48`, `F-49`, `F-51`, `F-64`, `F-66`, `F-77`.
* **Consumed By:** `F-52` (Examiner Document Assessment), `F-53` (Examiner Defence Assessment), `F-54` (Examiner Scoring and Feedback), `F-55` (Examiner Assessment Submission and Editing).

### I. Acceptance Criteria
* **AC-F50-01 (Positive — Examiner Views Assigned Projects & Downloads Final Document):** Given Dr. Bello is appointed as a Project Examiner for Project X (`F-46`) and Project X has a submitted Final Consolidated Project document (`F-32`), When Dr. Bello opens the Examiner Workspace (`PE-01`) and selects Project X (`PE-02`), Then Project X appears in Dr. Bello's assigned list and Dr. Bello can view and download the final submitted project document (`F-77`).
* **AC-F50-02 (Boundary — Examiner Cannot Modify Student Submissions or View Supervisory Discussions):** Given Dr. Bello is viewing Project X in the Examiner Workspace, When Dr. Bello inspects the project, Then no controls exist to alter the student's submitted document, and intermediate milestone supervisory discussion threads (`F-34`) and Supervisor performance scores (`F-56`) are not exposed (`actors.md` §1.6, `BR-17`).
* **AC-F50-03 (Permission — Revoked Examiner Loses Material Access Immediately):** Given Dr. Bello was previously appointed to Project X and subsequently removed/replaced by the Coordinator (`F-46`), When Dr. Bello attempts to view Project X or download its final document (`F-77`), Then the system denies access with a `403 Forbidden` error (`SEC-13`).