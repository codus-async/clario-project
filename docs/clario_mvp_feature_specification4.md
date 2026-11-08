# Clario — MVP Feature Specification (`mvp-features-part3.md`)

**Document Status:** Stage 2 — Feature Decomposition (Batch 4 of 5: Modules I & J)

**Target Release:** Clario MVP (P0 Scope Only)

**Platform:** Responsive Web Application (All Actors)

**Launch Jurisdiction & Currency:** Nigeria (`NGN`)

## Batch 4 Overview

* **Module I (Assessment & Grading):** `F-51`, `F-52`, `F-53`, `F-54`, `F-55`, `F-56`, `F-57`, `F-58`
* **Module J (Final Results & Project Completion):** `F-59`, `F-60`, `F-61`, `F-62` *(Note: `F-63` Incomplete Project Carry-Forward is P1 and excluded from the MVP).*

---

# Module I: Assessment and Grading

## F-51: Assessment Structure Configuration

### A. Feature Identification

* **Feature ID:** F-51
* **Feature Name:** Assessment Structure Configuration
* **Feature Category:** Assessment & Grading (User-Facing Functionality)
* **Primary Actor:** Project Coordinator
* **Supporting Actors:** Project Examiner (`F-52`–`F-55`), Project Supervisor (`F-39`, `F-56`), Final Assessment Consolidation (`F-58`), Audit Process (`F-82`)
* **MVP Priority:** P0
* **Source User Stories:** PC-26
* **Short Feature Description:** Enables Project Coordinators to configure the complete academic grading structure for their Programme and Academic Session, including assessment categories (Supervisor Performance, Examiner Document Assessment, Examiner Defence Assessment), grading criteria, mark allocations (defaulting to $30\text{ marks}$ for Supervisor Assessment per `BR-18`), weightings, pass marks, letter-grade scales, and the programme's Examiner-score consolidation method (`mvp-p.md` §2.4, §7).

### B. Business Purpose

* **Problem Solved:** Different degree programmes use different marking schemes, criterion weightings, pass thresholds, and multi-examiner score combination rules. Without a structured configuration capability, grading sheets and final score calculations would be rigid or require manual spreadsheet computation.
* **Necessity for Clario:** Implements `BR-18`, `BR-19`, and the confirmed MVP decision that the Coordinator configures the Examiner-score consolidation method per programme (`mvp-p.md` §2.4, §7).
* **Business/Academic Value:** Ensures all Supervisors and Examiners within a programme evaluate projects against a standardized, mathematically validated rubric.
* **Impact if Omitted:** Neither Supervisors (`F-56`) nor Examiners (`F-52`–`F-55`) would have grading criteria or mark allocations against which to score projects, and final consolidation (`F-58`) could not operate.

### C. Functional Requirements

* **FR-172:** The system must allow a Project Coordinator to configure an Assessment Structure (`PC-26`, `BR-19`) for their assigned Programme and Academic Session, partitioned into three core assessment components:
  1. **Supervisor Performance Assessment Component (`F-39`, `F-56`):** Default allocation of $30\text{ marks}$ (`BR-18`), configurable by the Coordinator.
  2. **Examiner Document Assessment Component (`F-52`).**
  3. **Examiner Defence Presentation Assessment Component (`F-53`).**
* **FR-173:** The system must validate that the sum of maximum marks (or percentage weightings) across the configured Supervisor Component and Consolidated Examiner Component (Document + Defence) equals the Programme's configured Total Maximum Score (default $100\text{ marks}$).
* **FR-174:** Within each assessment component, the system must allow the Coordinator to define one or more **Grading Criteria** (capturing Criterion Title, Description/Rubric Guidance, and Maximum Mark Allocation $> 0$), validating that the sum of criterion maximum marks within a component equals that component's total mark allocation.
* **FR-175:** The system must allow the Coordinator to configure the Programme's **Pass Mark Threshold** (e.g., $40\%$, $45\%$, or $50\%$) and optional **Letter Grade Scale** (e.g., `A: 70–100`, `B: 60–69`, `C: 50–59`, `D: 45–49`, `E: 40–44`, `F: 0–39`).
* **FR-176:** In accordance with `mvp-p.md` §2.4 and §7 (`GAP-01` / `OD-08`), the system must allow the Project Coordinator to configure the **Examiner-Score Consolidation Method** for the programme when multiple Examiners assess a project (`F-47`), supporting configurable selection (e.g., `Arithmetic Mean / Average of Submitted Examiner Scores`, `Weighted Examiner Panel`, or `Coordinator-Resolved Panel Score` pending final policy confirmation in `OD-08`) and configurable display/final-result rounding rules (`NFR-DOM: Academic grading`).
* **FR-177:** Once any Supervisor or Examiner has formally submitted an assessment (`F-55`, `F-56`) using the Programme's Assessment Structure in that Academic Session, the system must lock the Assessment Structure's mark allocations, criteria, and consolidation method against structural modification (unless all submitted assessments are first reset/re-opened by the Coordinator prior to result approval, with an audit log entry in `F-82`).

### D. User Interaction and Behaviour

* **Access:** Project Coordinator Workspace -> "Programme Configuration -> Assessment & Grading Structure" (`PC-26`).
* **Information Viewed:** Component Allocation summary bar (e.g., `Supervisor Performance: 30 marks` + `Examiner Document: 40 marks` + `Examiner Defence: 30 marks` = `100 marks`), Criteria tables per component, Pass Mark & Grade Scale table, Examiner Consolidation Method selector, and Structure Lock status (`Editable` vs. `Locked — Assessments in Progress`).
* **Actions Performed:** Configure Component Mark Allocations (defaulting Supervisor to $30\text{ marks}$), Add/Edit/Remove Grading Criteria, Set Pass Mark & Grade Scale, Select Examiner Consolidation Method & Rounding Rule, Activate Assessment Structure.
* **Validations:** All mark allocations $> 0$; Sum of criteria marks $=$ Component allocation; Supervisor Component $+$ Examiner Total Component $= 100$ (or configured programme total); Pass Mark between $1$ and Total Maximum Score.
* **Post-Action Behaviour:** Structure saved, grading rubrics immediately populated for `F-39`, `F-52`–`F-56`, and audit log (`F-82`) recorded.
* **States:** Loading, Draft/Default state (pre-populated with default $30\text{-mark}$ Supervisor allocation `BR-18`), Active state, Locked state (once grading begins).

### E. Business Rules

* **BR-03:** Scoped strictly to the Coordinator's assigned Programme and Academic Session.
* **BR-17:** Supervisor assessment and Examiner assessment components are structurally separate and independent.
* **BR-18:** Supervisor performance assessment has a default allocation of $30\text{ marks}$, subject to Coordinator configuration.
* **BR-19:** Coordinators configure grading categories, criteria, weightings, and pass marks.
* **MVP Decision (`mvp-p.md` §2.4, §7):** The Coordinator configures the Examiner-score consolidation method per programme.
* **Open Decision Reference (`OD-08` / `GAP-01` & `NFR-OPEN-08`):** Exact rounding modes, decimal precision, and multi-examiner discrepancy handling are tracked in `mvp-open-decisions.md`.

### F. Permissions and Access Control

* **Project Coordinator:** Full create and update access (prior to grading lock) within their assigned Programme and Session.
* **Project Examiner:** Read-only access to the Examiner Document & Defence criteria for assigned projects (`PE-06`).
* **Project Supervisor:** Read-only access to the Supervisor Performance criteria for assigned projects (`F-56`).
* **Student:** Read-only visibility of published assessment breakdown categories after result publication (`F-61`).

### G. Data Requirements

* **Captured:** Assessment Structure ID, Institution ID (`F-01`), Programme ID (`F-11`), Academic Session ID (`F-12`), Total Max Marks (default $100$), Supervisor Allocation Marks (default $30$), Examiner Document Allocation Marks, Examiner Defence Allocation Marks, Pass Mark Threshold, Examiner Consolidation Method Code, Final Display Rounding Mode (`OD-08`), Grade Scale Bands array, Criteria array (`Criterion ID`, `Component Type`, `Title`, `Description`, `Max Marks`, `Sequence Order`), Status (`Draft`, `Active`, `Locked`), Timestamps.

### H. Dependencies and Integrations

* **Required Features:** `F-11`, `F-12`, `F-15`, `F-64`, `F-66`, `F-82`.
* **Consumed By:** `F-39`, `F-52`, `F-53`, `F-54`, `F-55`, `F-56`, `F-58`, `F-61`, `F-62`.

### I. Acceptance Criteria

* **AC-F51-01 (Positive — Default 30-Mark Supervisor Allocation & Custom Criteria Setup):** Given an authenticated Project Coordinator configuring the grading structure for `B.Sc. Computer Science` (`2026/2027`), When they open Assessment Structure Configuration (`PC-26`), Then the Supervisor Performance component defaults to $30\text{ marks}$ (`BR-18`), and the Coordinator can configure criteria for Supervisor Performance ($30\text{ marks}$), Examiner Document Assessment ($40\text{ marks}$), and Examiner Defence Assessment ($30\text{ marks}$), Pass Mark ($45\text{ marks}$), and Examiner Consolidation Method (`Average`), saving the structure and logging an audit entry (`F-82`).
* **AC-F51-02 (Validation — Mismatched Criterion or Component Totals):** Given a Coordinator sets the Examiner Document Component to $40\text{ marks}$ but defines criteria totaling only $35\text{ marks}$, When they attempt to activate the Assessment Structure, Then the system rejects the configuration with a validation error indicating that criterion marks ($35$) must equal the component allocation ($40$).
* **AC-F51-03 (Data Integrity — Lock Structure Once Assessments Are Submitted):** Given at least one Examiner or Supervisor has formally submitted an assessment under the active structure, When the Coordinator attempts to alter criterion maximum marks or component weightings, Then the system blocks the modification to prevent invalidating already-submitted scores.

---

## F-52: Examiner Document Assessment

### A. Feature Identification

* **Feature ID:** F-52
* **Feature Name:** Examiner Document Assessment
* **Feature Category:** Assessment & Grading (User-Facing Functionality)
* **Primary Actor:** Project Examiner
* **Supporting Actors:** Examination Material Access (`F-50`), Assessment Structure (`F-51`), Examiner Scoring & Feedback (`F-54`), Examiner Submission (`F-55`)
* **MVP Priority:** P0
* **Source User Stories:** PE-04
* **Short Feature Description:** Enables appointed Project Examiners to evaluate the quality of an assigned project's submitted Final Consolidated Project document (`F-50`) against the Programme's configured Document Assessment criteria (`F-51`).

### B. Business Purpose

* **Problem Solved:** A final-year project grade depends heavily on the written dissertation/technical report (problem formulation, literature review, methodology, implementation/analysis, and documentation quality). Examiners need a dedicated evaluation workspace linking the final submitted document (`F-50`) directly to the document grading rubric (`F-51`).
* **Necessity for Clario:** Implements `PE-04` and provides the written-document component of the independent Examiner assessment (`mvp-p.md` §7).
* **Business/Academic Value:** Separates evaluation of the written research artifact (`F-52`) from evaluation of the oral defence presentation (`F-53`), supporting both individual and group projects.
* **Impact if Omitted:** Examiners could not systematically evaluate or score the written final project document.

### C. Functional Requirements

* **FR-178:** For every project assigned to a Project Examiner (`F-46`) that has an approved/submitted Final Consolidated Project document (`F-32`, `F-50`), the system must render the **Examiner Document Assessment** rubric sheet (`PE-04`) populated with the Programme's configured Document Assessment criteria (`F-51`).
* **FR-179:** For Group Projects (`F-21`, `F-22`), the Examiner Document Assessment must be recorded at the **shared project level** (`mvp-p.md` §2.5, §7) so that the group's written dissertation receives a shared Examiner document evaluation.
* **FR-180:** The system must allow the Examiner to view/download the Final Project Document (`F-50`) alongside the Document Assessment criteria, enter scores and criterion comments for each document criterion (`F-54`), save progress as a local or server draft (`NFR-USA`), and validate that all document criteria are scored before formal Examiner Assessment submission (`F-55`).

### D. User Interaction and Behaviour

* **Access:** Project Examiner via "Examiner Workspace -> Assigned Projects -> \[Select Project\] -> Document Assessment" (`PE-04`).
* **Information Viewed:** Final Project Document viewer/download link (`F-50`), Project Title & Abstract, list of Document Assessment Criteria (`F-51`) showing Criterion Title, Rubric Description, Max Marks, Score Input field, optional Criterion Comment field, and Document Component Subtotal (`Awarded / Max Marks`).
* **Actions Performed:** Review Final Document (`PE-04`), Enter Document Criterion Scores & Comments (`F-54`), Save Draft Document Assessment, Proceed to Defence Assessment (`F-53`) / Final Submission (`F-55`).
* **Validations:** Each criterion score must be a valid number $\ge 0$ and $\le$ the criterion's configured `Max Marks` (`F-51`); Examiner must hold an `Active` appointment for the project (`SEC-13`, `F-48`).
* **Post-Action Behaviour:** Draft scores auto-save or save on click; subtotal dynamically calculates with full decimal precision (`NFR-DOM`).
* **States:** Loading, Awaiting Final Document state (if student has not yet submitted final project), Draft In-Progress state, Complete/Ready for Submission state, Submitted/Locked state (`F-55`).

### E. Business Rules

* **BR-16 & BR-17:** Conducted independently by an eligible Project Examiner who did not supervise the project.
* **MVP Group Rule (`mvp-p.md` §2.5, §7):** For group projects, Examiner project assessment (Document + Defence) is shared across the group.

### F. Permissions and Access Control

* **Project Examiner:** Full access to complete and edit (prior to result publication per `BR-21`) their own Document Assessment strictly for projects assigned to them (`SEC-13`).
* **Project Coordinator:** Read access to submitted Examiner Document Assessments (`F-57`, `F-58`).
* **Project Supervisor & Co-Examiners:** No access (`BR-17`, `F-48`).

### G. Data Requirements

* **Captured:** Examiner Document Assessment Record (part of Examiner Assessment `F-54`/`F-55`), Examiner Appointment ID (`F-46`), Project ID (`F-21`), Evaluated Final Submission Version ID (`F-32`), Document Criterion Scores array (`Criterion ID`, `Awarded Score`, `Max Score`, `Criterion Comment`), Document Component Subtotal, Document Evaluation Summary Comment, Timestamps.

### H. Dependencies and Integrations

* **Required Features:** `F-32`, `F-46`, `F-48`, `F-50`, `F-51`, `F-54`, `F-55`, `F-64`, `F-66`.

### I. Acceptance Criteria

* **AC-F52-01 (Positive — Examiner Evaluates Final Document Against Rubric):** Given Project X has a submitted Final Project Document and a configured $40\text{-mark}$ Document Assessment rubric with $4$ criteria of $10\text{ marks}$ each (`F-51`), When appointed Examiner Dr. Bello reviews the document (`PE-04`) and enters scores of `8`, `9`, `7.5`, and `8.5`, Then the system records the criterion scores and computes a Document Component Subtotal of `33.0 / 40`.
* **AC-F52-02 (Validation — Score Exceeds Criterion Maximum):** Given a Document Assessment criterion has a maximum allocation of $10\text{ marks}$, When an Examiner enters `12` for that criterion, Then the system rejects the entry with an out-of-range validation error.

---

## F-53: Examiner Defence Assessment

### A. Feature Identification

* **Feature ID:** F-53
* **Feature Name:** Examiner Defence Assessment
* **Feature Category:** Assessment & Grading (User-Facing Functionality)
* **Primary Actor:** Project Examiner
* **Supporting Actors:** Defence Scheduling (`F-49`), Assessment Structure (`F-51`), Examiner Scoring & Feedback (`F-54`), Examiner Submission (`F-55`)
* **MVP Priority:** P0
* **Source User Stories:** PE-05
* **Short Feature Description:** Enables appointed Project Examiners to evaluate a student's or project group's oral defence presentation (`PE-05`) against the Programme's configured Defence Assessment criteria (`F-51`).

### B. Business Purpose

* **Problem Solved:** Oral defence presentations test whether students genuinely understand, built, and can defend the research presented in their written dissertation. Examiners need a structured rubric during or immediately after the scheduled defence (`F-49`) to evaluate presentation quality, demonstration, and Q&A mastery.
* **Necessity for Clario:** Implements `PE-05` and provides the oral-defence component of the independent Examiner assessment (`mvp-p.md` §7).
* **Business/Academic Value:** Captures structured defence evaluation directly in Clario rather than on paper score sheets that can be lost or mis-transcribed.
* **Impact if Omitted:** Examiners could not evaluate or record scores for oral project defences.

### C. Functional Requirements

* **FR-181:** For every project assigned to a Project Examiner (`F-46`), the system must render the **Examiner Defence Assessment** rubric sheet (`PE-05`) populated with the Programme's configured Defence Assessment criteria (`F-51`) alongside the project's Defence Schedule details (`F-49`).
* **FR-182:** In accordance with `mvp-p.md` §2.5 and §7 ("Group projects receive shared Examiner project assessments and individual Supervisor performance scores"), for Group Projects (`F-21`, `F-22`), the Examiner Defence Assessment score is recorded as part of the **shared Examiner project assessment** for the group, while allowing the Examiner to include qualitative observations in the defence feedback (`F-54`).
* **FR-183:** The system must allow the Examiner to enter scores and comments for each Defence Assessment criterion (`F-54`), save drafts locally or on the server (`NFR-USA`), and compute the Defence Component Subtotal with full precision (`NFR-DOM`).

### D. User Interaction and Behaviour

* **Access:** Project Examiner via "Examiner Workspace -> Assigned Projects -> \[Select Project\] -> Defence Assessment" (`PE-05`).
* **Information Viewed:** Project Title, Student/Group Roster (`F-19`, `F-22`), Defence Date, Time & Venue (`F-49`), Presentation Slides/Supporting Files (`F-50`), list of Defence Assessment Criteria (`F-51`) showing Criterion Title, Rubric Description, Max Marks, Score Input field, optional Criterion Comment field, and Defence Component Subtotal (`Awarded / Max Marks`).
* **Actions Performed:** Evaluate Defence Presentation (`PE-05`), Enter Defence Criterion Scores & Comments (`F-54`), Save Draft Defence Assessment, Proceed to Final Examiner Assessment Submission (`F-55`).
* **Validations:** Each criterion score must be $\ge 0$ and $\le$ the criterion's `Max Marks` (`F-51`); Examiner must hold an `Active` appointment for the project (`SEC-13`, `F-48`).
* **Post-Action Behaviour:** Draft scores save and combine with the Document Component Subtotal (`F-52`) in `F-54`.
* **States:** Loading, Draft In-Progress state, Complete/Ready for Submission state, Submitted/Locked state (`F-55`).

### E. Business Rules

* **BR-16 & BR-17:** Examiner defence assessment is conducted independently of supervision (`PE-13`).
* **MVP Group Rule (`mvp-p.md` §2.5, §7):** Group projects receive a shared Examiner project assessment.

### F. Permissions and Access Control

* **Project Examiner:** Full access to complete and edit (prior to result publication per `BR-21`) their own Defence Assessment strictly for projects assigned to them (`SEC-13`).
* **Project Coordinator:** Read access to submitted Examiner Defence Assessments (`F-57`, `F-58`).
* **Project Supervisor & Co-Examiners:** No access (`BR-17`, `F-48`).

### G. Data Requirements

* **Captured:** Examiner Defence Assessment Record (part of Examiner Assessment `F-54`/`F-55`), Examiner Appointment ID (`F-46`), Project ID (`F-21`), Defence Schedule ID (`F-49`, nullable), Defence Criterion Scores array (`Criterion ID`, `Awarded Score`, `Max Score`, `Criterion Comment`), Defence Component Subtotal, Defence Evaluation Summary Comment, Timestamps.

### H. Dependencies and Integrations

* **Required Features:** `F-46`, `F-48`, `F-49`, `F-50`, `F-51`, `F-54`, `F-55`, `F-64`, `F-66`.

### I. Acceptance Criteria

* **AC-F53-01 (Positive — Examiner Scores Defence Presentation):** Given Project X has a configured $30\text{-mark}$ Defence Assessment rubric with $3$ criteria of $10\text{ marks}$ each (`F-51`), When appointed Examiner Dr. Bello evaluates the defence presentation (`PE-05`) and enters scores of `8`, `7.5`, and `9`, Then the system records the criterion scores and computes a Defence Component Subtotal of `24.5 / 30`.
* **AC-F53-02 (Validation — Negative or Out-of-Bounds Score Rejected):** Given a Defence Assessment criterion with a maximum of $10\text{ marks}$, When an Examiner enters `-2` or `15`, Then the system blocks the input with a validation error.

---

## F-54: Examiner Scoring and Feedback

### A. Feature Identification

* **Feature ID:** F-54
* **Feature Name:** Examiner Scoring and Feedback
* **Feature Category:** Assessment & Grading (User-Facing Functionality)
* **Primary Actor:** Project Examiner
* **Supporting Actors:** Assessment Structure (`F-51`), Document Assessment (`F-52`), Defence Assessment (`F-53`), Examiner Submission (`F-55`)
* **MVP Priority:** P0
* **Source User Stories:** PE-06, PE-07, PE-08
* **Short Feature Description:** Provides the unified scoring engine and formal feedback capture enabling Project Examiners to apply predefined programme grading criteria (`PE-06`), record numerical criterion scores across Document and Defence components (`PE-07`), and document formal written examination feedback (`PE-08`).

### B. Business Purpose

* **Problem Solved:** Examination outcomes require both objective criterion-by-criterion numerical scores and a documented qualitative explanation justifying the examination outcome for students and the institution.
* **Necessity for Clario:** Implements `PE-06`, `PE-07`, and `PE-08`, uniting `F-52` (Document) and `F-53` (Defence) into a complete Examiner Assessment sheet ready for submission (`F-55`).
* **Business/Academic Value:** Prevents arithmetic summation errors, enforces rubric boundaries (`F-51`), preserves decimal precision (`NFR-DOM`), and captures formal examination feedback for post-publication breakdown (`F-61`).
* **Impact if Omitted:** Examiners could not compute total examination scores or record formal written justification for their grades.

### C. Functional Requirements

* **FR-184:** The system must render a unified Examiner Grading & Feedback sheet (`PE-06`, `PE-07`, `PE-08`) for each assigned project that enforces the Programme's Assessment Structure (`F-51`), combining:
  1. All configured **Examiner Document Assessment Criteria (`F-52`)** and their awarded scores.
  2. All configured **Examiner Defence Assessment Criteria (`F-53`)** and their awarded scores.
  3. Automatic, exact-precision calculation (`NFR-DOM`) of:
     $$\text{Examiner Total Score} = \sum (\text{Document Criterion Scores}) + \sum (\text{Defence Criterion Scores})$$
     against the configured Maximum Examiner Allocation (e.g., $70\text{ marks}$ when Supervisor allocation is $30\text{ marks}$).
  4. A mandatory **Formal Examination Feedback (`PE-08`)** text section capturing the Examiner's overall evaluation, strengths, weaknesses, and any recommended post-defence corrections.
* **FR-185:** The system must support saving local drafts (`NFR-USA`) and server-side `Draft` assessments so an Examiner can score the written document (`F-52`) before the defence date and complete the defence scores (`F-53`) and formal feedback (`PE-08`) during/after the defence before submitting (`F-55`).
* **FR-186:** All intermediate and total Examiner score calculations must preserve full decimal precision without premature rounding (`NFR-DOM: Academic grading`).

### D. User Interaction and Behaviour

* **Access:** Project Examiner via "Examiner Workspace -> Assigned Projects -> \[Select Project\] -> Grading & Feedback Sheet" (`PE-06`–`PE-08`).
* **Information Viewed:** Criterion-by-criterion scoring table (Document section + Defence section), live calculated subtotals and Total Examiner Score (`e.g., 57.50 / 70.00`), Formal Examination Feedback text editor (`PE-08`), and Draft/Submitted status badge.
* **Actions Performed:** Enter/Update Criterion Scores (`PE-06`, `PE-07`), Enter/Update Formal Examination Feedback (`PE-08`), Save Draft.
* **Validations:** Every criterion score must be numeric, $\ge 0$, and $\le$ `Criterion Max Marks`; Formal Examination Feedback (`PE-08`) is required before formal submission (`F-55`, minimum $20$–$5,000$ chars).
* **Post-Action Behaviour:** Subtotals and Total Examiner Score update instantaneously; draft changes are saved without exposing scores to the Coordinator's final consolidation until formally submitted in `F-55`.
* **States:** Loading, Local/Server Draft Saved state, Validation Error state, Submitted state.

### E. Business Rules

* **BR-17:** Examiner scoring and feedback are completely independent of Supervisor assessment.
* **BR-19:** Scoring strictly follows the Coordinator's configured grading categories, criteria, and mark allocations (`F-51`).
* **NFR-DOM:** Intermediate grading calculations preserve precision without premature rounding.

### F. Permissions and Access Control

* **Project Examiner:** Full read/write access to their own scoring and feedback sheet for assigned projects prior to result publication (`SEC-13`, `BR-21`).
* **Project Coordinator:** Read access to submitted Examiner scores and formal feedback (`F-57`, `F-58`).
* **Student:** Read access to published assessment breakdown and formal feedback after result publication (`F-60`, `F-61`).

### G. Data Requirements

* **Captured:** Examiner Assessment ID, Examiner Appointment ID (`F-46`), Project ID (`F-21`), Examiner User ID, Document Criterion Scores (`F-52`), Document Subtotal, Defence Criterion Scores (`F-53`), Defence Subtotal, Examiner Total Score (exact decimal), Formal Examination Feedback Text (`PE-08`), Status (`Pending`, `Draft`, `Submitted`, `Published/Locked`), Timestamps.

### H. Dependencies and Integrations

* **Required Features:** `F-46`, `F-48`, `F-51`, `F-52`, `F-53`, `F-55`, `F-64`, `F-66`.

### I. Acceptance Criteria

* **AC-F54-01 (Positive — Exact Precision Calculation & Formal Feedback Capture):** Given an Examiner scores `33.25 / 40` on Document Criteria (`F-52`) and `24.50 / 30` on Defence Criteria (`F-53`) and enters formal examination feedback (`PE-08`), When the sheet calculates the total, Then the Examiner Total Score is recorded with exact precision as `57.75 / 70.00` without premature integer rounding (`NFR-DOM`).
* **AC-F54-02 (Validation — Missing Criterion Score or Feedback Blocks Submission Readiness):** Given an Examiner has left one Defence criterion blank or left the Formal Examination Feedback (`PE-08`) empty, When they attempt to formally submit the assessment (`F-55`), Then the system highlights the missing fields and prevents formal submission, while allowing the Examiner to save as `Draft`.

---

## F-55: Examiner Assessment Submission and Editing

### A. Feature Identification

* **Feature ID:** F-55
* **Feature Name:** Examiner Assessment Submission and Editing
* **Feature Category:** Assessment & Grading (User-Facing Functionality)
* **Primary Actor:** Project Examiner
* **Supporting Actors:** Project Coordinator (`F-57`–`F-60`), Notification Services (`F-71`–`F-73`), Audit Process (`F-82`)
* **MVP Priority:** P0
* **Source User Stories:** PE-09, PE-10, PE-11
* **Short Feature Description:** Enables Project Examiners to formally submit completed project assessments (`PE-09`), edit their submitted assessments at any time before the Project Coordinator publishes the project's final results (`PE-10`, `BR-21`), and track the status of each assigned assessment (`PE-11`).

### B. Business Purpose

* **Problem Solved:** Examiners need to formally sign off and submit their completed grading sheets so the Coordinator can consolidate results (`F-58`), while retaining the ability to correct clerical scoring mistakes before results are officially published (`BR-21`).
* **Necessity for Clario:** Implements `PE-09`, `PE-10`, `PE-11`, and `BR-21`, including the approved `PROP-03` safeguard that invalidates a stale Coordinator approval if an Examiner edits a score after `F-59` approval but prior to `F-60` publication.
* **Business/Academic Value:** Balances grading flexibility with strict result integrity and auditability (`NFR-AUD`).
* **Impact if Omitted:** Examiners could not finalize their assessments or correct pre-publication errors, and Coordinators could not know which assessments are ready for consolidation.

### C. Functional Requirements

* **FR-187:** The system must allow an appointed Project Examiner to formally submit a completed Examiner Assessment (`PE-09`) once all required Document criteria (`F-52`), Defence criteria (`F-53`), and Formal Examination Feedback (`F-54`, `PE-08`) are valid and an active internet connection is present (`NFR-USA`).
* **FR-188:** Upon formal Examiner Assessment submission (`PE-09`), the system must:
  1. Transition the Examiner's assessment status (`PE-11`) to `Submitted`.
  2. Record a tamper-resistant academic audit log entry (`F-82`, `NFR-AUD`) capturing the submitted criterion scores, total score, and timestamp.
  3. Trigger `F-57` (Assessment Completion Monitoring) and `F-58` (Final Assessment Consolidation) updates and notify the Project Coordinator (`F-72`).
* **FR-189:** In accordance with `BR-21` (`PE-10`), the system must allow the Project Examiner to re-open and edit their `Submitted` assessment for a project **at any time before the Coordinator publishes that project's final result (`F-60`)**, requiring a mandatory Edit Reason ($10$–$500$ chars).
* **FR-190:** In accordance with approved `PROP-03`, if an Examiner edits and re-submits an assessment **after** the Project Coordinator had already approved the project's consolidated final result (`F-59`) — but **before** the result is published (`F-60`) — the system must atomically:
  1. Record the updated Examiner assessment and log the previous and new scores + Edit Reason in `F-82` (`NFR-AUD`).
  2. Automatically recalculate the project's Final Assessment Consolidation (`F-58`).
  3. **Revert the project's Final Result Approval status (`F-59`) from `Approved` back to `Pending Coordinator Re-Approval`** so an un-reviewed score change can never be published silently.
  4. Dispatch an immediate high-priority notification (`F-71`, `F-72`) to the Project Coordinator alerting them that an Examiner modified a submitted assessment and re-approval is required.
* **FR-191:** Once a project's final result is **Published (`F-60`)**, the system must permanently transition the Examiner's assessment status (`PE-11`) to `Published (Locked)` and block any further Examiner edits (`BR-21`).
* **FR-192:** The system must display the real-time status of every assigned examination (`Pending`, `Draft`, `Submitted`, `Published`) in the Examiner Workspace (`PE-11`).

### D. User Interaction and Behaviour

* **Access:** Project Examiner via "Examiner Workspace -> Assigned Projects" (`PE-11`) and "Project Grading Sheet -> Submit / Edit Assessment" (`PE-09`, `PE-10`).
* **Information Viewed:** Assessment Status badge (`Pending`, `Draft`, `Submitted`, `Published`), Last Submitted/Edited Timestamp, Revision History of own edits, and (when editing a submitted assessment) mandatory "Reason for Editing Submitted Assessment" input.
* **Actions Performed:** Submit Completed Assessment (`PE-09`), Edit Submitted Assessment (`PE-10`), View Assessment Status (`PE-11`).
* **Validations:** All `F-52`, `F-53`, and `F-54` fields must be complete; Edit Reason required when modifying an already-submitted assessment; action blocked if project result status is `Published` (`F-60`, `BR-21`).
* **Post-Action Behaviour:** Status updates, consolidation (`F-58`) recalculates, audit log (`F-82`) records old and new values, and Coordinator is notified.
* **States:** `Pending` (not started), `Draft` (saved, not submitted), `Submitted` (editable until publication), `Published` (read-only locked).

### E. Business Rules

* **BR-21:** Examiners can edit submitted assessments until the Coordinator publishes results.
* **BR-NEW-02 (Approved under `PROP-03`):** Any Examiner edit to a submitted assessment after Coordinator result approval (`F-59`) and before publication (`F-60`) automatically resets the project's result approval status to `Pending Approval` and recalculates consolidation (`F-58`).
* **NFR-AUD:** Examiner assessment submissions and any subsequent edits/grade changes must be logged in `F-82` with previous and resulting values.

### F. Permissions and Access Control

* **Project Examiner:** Submit and edit (before publication of that project's result) strictly their own assessment for assigned projects (`SEC-13`, `BR-21`).
* **Project Coordinator:** Read access to Examiner submission status and edit audit history (`F-57`, `F-58`).

### G. Data Requirements

* **Captured:** Examiner Assessment ID (`F-54`), Submission Status (`PENDING`, `DRAFT`, `SUBMITTED`, `PUBLISHED_LOCKED`), Initial Submitted Timestamp, Last Edited Timestamp, Revision Number, Edit Reason (for post-submission edits), Previous Score Snapshot (stored in `F-82`).

### H. Dependencies and Integrations

* **Required Features:** `F-52`, `F-53`, `F-54`, `F-57`, `F-58`, `F-59`, `F-60`, `F-64`, `F-66`, `F-71`, `F-72`, `F-82`.

### I. Acceptance Criteria

* **AC-F55-01 (Positive — Formal Examiner Assessment Submission):** Given Examiner Dr. Bello has completed all Document and Defence criteria and Formal Feedback for Project X, When Dr. Bello clicks "Submit Assessment" (`PE-09`), Then the assessment status changes to `Submitted` (`PE-11`), an audit log entry is recorded (`F-82`), and the score becomes available to the Coordinator in `F-57` and `F-58`.
* **AC-F55-02 (Positive & Safeguard — Examiner Edit After Coordinator Approval Resets Approval `PROP-03`):** Given Project X's consolidated result was `Approved` by the Coordinator (`F-59`) but is **not yet `Published` (`F-60`)**, When Examiner Dr. Bello edits a criterion score on Project X (`PE-10`, `BR-21`) with reason `Corrected transcription error on Q&A criterion`, Then the system saves the updated score, recalculates Project X's consolidated score (`F-58`), reverts Project X's approval status from `Approved` to `Pending Coordinator Re-Approval`, logs the old and new scores in `F-82`, and notifies the Coordinator.
* **AC-F55-03 (Boundary — Editing Blocked After Project Result Publication):** Given Project X's final result has been `Published` by the Coordinator (`F-60`), When Examiner Dr. Bello views Project X (`PE-11`) or attempts to edit their submitted assessment (`PE-10`), Then the status is `Published (Locked)` and the system rejects any edit attempt (`BR-21`).

---

## F-56: Supervisor Performance Assessment

### A. Feature Identification

* **Feature ID:** F-56
* **Feature Name:** Supervisor Performance Assessment
* **Feature Category:** Assessment & Grading (User-Facing Functionality)
* **Primary Actor:** Project Supervisor
* **Supporting Actors:** Project Coordinator (`F-51`, `F-57`, `F-58`), Individual Group Member Assessment (`F-39`), Notification Services (`F-71`, `F-72`), Audit Process (`F-82`)
* **MVP Priority:** P0
* **Source User Stories:** PS-21, PS-22, PS-23 *(and PS-24 via `F-39`)*
* **Short Feature Description:** Enables Project Supervisors to independently evaluate each assigned student's performance (`PS-21`) and supervisory engagement/interaction (`PS-22`) throughout the project against the Programme's configured Supervisor Assessment criteria (default $30\text{ marks}$ per `BR-18`), and submit an independent performance grade (`PS-23`) before final result compilation.

### B. Business Purpose

* **Problem Solved:** Final-year project assessment is not based solely on a 30-minute oral defence; a student's sustained research effort, milestone diligence, and engagement during months of supervision must contribute to their final grade.
* **Necessity for Clario:** Implements `PS-21`, `PS-22`, `PS-23`, `BR-17`, and `BR-18` (default $30\text{-mark}$ allocation, configurable by the Coordinator in `F-51`).
* **Business/Academic Value:** Captures the Supervisor's longitudinal evaluation of each student independently of the Examination Panel's assessment (`BR-17`).
* **Impact if Omitted:** The Supervisor's portion of the final grade (default $30\text{ marks}$) would be missing, preventing final result consolidation (`F-58`).

### C. Functional Requirements

* **FR-193:** The system must allow the assigned Project Supervisor to evaluate each assigned Student's performance (`PS-21`) and supervisory interaction/engagement (`PS-22`) using the Programme's configured Supervisor Performance Assessment criteria (`F-51`, default total allocation of $30\text{ marks}$ per `BR-18`).
* **FR-194:** For **Individual Projects**, the Supervisor completes and submits one Supervisor Performance Assessment for the individual student; for **Group Projects**, in accordance with `F-39` and `mvp-p.md` §2.5 / §7, the Supervisor completes and submits an **individual** Supervisor Performance Assessment for each student member of the group (`PS-24`).
* **FR-195:** The Supervisor Performance Assessment must remain strictly independent of the Examiner Assessment (`BR-17`): the Supervisor must not see the Examiners' scores while grading, and Examiners must not see the Supervisor's performance scores.
* **FR-196:** Upon formal submission of a Supervisor Performance Assessment (`PS-23`), the system must:
  1. Validate that all configured Supervisor criteria are scored within their maximum mark limits and mandatory supervisory assessment feedback is provided.
  2. Transition the Supervisor Assessment status to `Submitted`.
  3. Record a tamper-resistant academic audit log entry (`F-82`, `NFR-AUD`).
  4. Feed the submitted score (with full decimal precision `NFR-DOM`) into `F-57` and `F-58` and notify the Project Coordinator (`F-72`).
* **FR-197:** Consistent with `PROP-03` and `NFR-AUD`, the system must allow a Project Supervisor to edit a submitted Supervisor Performance Assessment prior to that project's result publication (`F-60`) with a mandatory Edit Reason; if the project's result had already been approved (`F-59`) but not yet published (`F-60`), the edit must automatically revert the project's result approval status to `Pending Coordinator Re-Approval`, recalculate `F-58`, log the grade change in `F-82`, and notify the Coordinator. Once the project's result is `Published` (`F-60`), the Supervisor Performance Assessment is permanently locked.
* **FR-198:** The system must support a configurable Supervisor Assessment Submission Deadline per programme (`OD-07` / `GAP-03`) so Coordinators can track overdue Supervisor assessments in `F-57`.

### D. User Interaction and Behaviour

* **Access:** Project Supervisor via "Supervision Workspace -> Assigned Projects -> \[Select Project\] -> Supervisor Performance Assessment" (`PS-21`–`PS-23`).
* **Information Viewed:** Student Name & Matriculation Number (or Group Member selector `F-39`), Student Supervision History summary (Milestone submission timeliness `F-43`, Revision iterations `F-35`, Discussion activity `F-34`), Supervisor Assessment Criteria (`F-51`, default $30\text{ marks}$ total) covering performance (`PS-21`) and interaction/engagement (`PS-22`), Score inputs, Qualitative Performance Feedback field, and Assessment Status (`Not Started`, `Draft`, `Submitted`, `Published/Locked`).
* **Actions Performed:** Enter Criterion Scores & Feedback, Save Draft, Submit Supervisor Performance Grade (`PS-23`), Edit Submitted Grade (prior to publication with mandatory reason).
* **Validations:** Each criterion score $\ge 0$ and $\le$ `Criterion Max Marks`; Total Score $\le$ configured Supervisor allocation (default $30\text{ marks}$); Qualitative Feedback required ($15$–$3,000$ chars); active internet connection required for formal submission (`NFR-USA`).
* **Post-Action Behaviour:** Score persists with exact precision, audit log (`F-82`) is written, and Coordinator monitoring/consolidation (`F-57`, `F-58`) updates.
* **States:** Loading, Draft state, Submitted state, Locked state (post-publication).

### E. Business Rules

* **BR-17:** Supervisor assessment and Examiner assessment are independent.
* **BR-18:** Supervisor performance assessment has a default allocation of $30\text{ marks}$, subject to Coordinator configuration (`F-51`).
* **NFR-AUD:** Supervisor grade submissions and any subsequent grade changes must be recorded in `F-82`.
* **Open Decision Reference (`OD-07` / `GAP-03`):** Exact deadline for Supervisors to submit performance grades relative to defence scheduling/examination is tracked in `mvp-open-decisions.md`.

### F. Permissions and Access Control

* **Project Supervisor:** Full access to score, submit, and edit (prior to result publication) performance assessments strictly for students/groups currently assigned to them (`SEC-12`).
* **Project Coordinator:** Read access to submitted Supervisor assessments within their assigned Programme and Session (`F-57`, `F-58`).
* **Project Examiner:** **No access** (`BR-17`).
* **Student:** Read access to their own published Supervisor score and feedback only after result publication (`F-60`, `F-61`).

### G. Data Requirements

* **Captured:** Supervisor Assessment ID, Project ID (`F-21`), Group ID (`F-22`, nullable), Student User ID (`F-13`), Supervisor User ID (`F-24`), Criterion Scores array (`Criterion ID`, `Awarded Score`, `Max Score`), Total Supervisor Score (exact decimal out of configured allocation, default $30$), Qualitative Performance & Interaction Feedback, Status (`Pending`, `Draft`, `Submitted`, `Published_Locked`), Edit Reason (if modified post-submission), Timestamps.

### H. Dependencies and Integrations

* **Required Features:** `F-21`, `F-24`, `F-27`, `F-39`, `F-51`, `F-57`, `F-58`, `F-64`, `F-66`, `F-72`, `F-82`.

### I. Acceptance Criteria

* **AC-F56-01 (Positive — Independent Supervisor Performance Grade Submission):** Given a Programme with the default $30\text{-mark}$ Supervisor allocation (`BR-18`) split into Performance ($20\text{ marks}$, `PS-21`) and Supervision Interaction ($10\text{ marks}$, `PS-22`), When the assigned Supervisor scores a student `17.5 / 20` and `8.5 / 10` with qualitative feedback and submits (`PS-23`), Then the system records the independent Supervisor score of `26.0 / 30.0`, logs an audit entry (`F-82`), and updates `F-57` and `F-58`.
* **AC-F56-02 (Independence — Supervisor Cannot See Examiner Scores):** Given Examiners have already submitted their assessments (`F-55`) for Project X, When the Project Supervisor opens Project X's Supervisor Performance Assessment sheet (`F-56`), Then the Examiners' scores and feedback are not visible to the Supervisor (`BR-17`).

---

## F-57: Assessment Completion Monitoring

### A. Feature Identification

* **Feature ID:** F-57
* **Feature Name:** Assessment Completion Monitoring
* **Feature Category:** Assessment & Grading (User-Facing Functionality)
* **Primary Actor:** Project Coordinator
* **Supporting Actors:** Project Examiner (`F-55`), Project Supervisor (`F-56`), Notification Services (`F-71`, `F-72`)
* **MVP Priority:** P0
* **Source User Stories:** PC-27, PC-30, PC-33
* **Short Feature Description:** Provides Project Coordinators with a comprehensive programme-wide Assessment Completion & Review dashboard to monitor submitted vs. outstanding Examiner and Supervisor assessments (`PC-27`, `PC-33`) and inspect individual submitted assessment sheets (`PC-30`).

### B. Business Purpose

* **Problem Solved:** Before a Coordinator can consolidate, approve (`F-59`), and publish (`F-60`) a project's result, they must know which projects have all required Examiner panel assessments and Supervisor performance assessments completed, and which specific Examiners or Supervisors are holding up completion.
* **Necessity for Clario:** Implements `PC-27`, `PC-30` (reviewing submitted assessments), and `PC-33` (viewing outstanding assessments and unpublished results).
* **Business/Academic Value:** Gives Coordinators real-time visibility into examination progress across the entire programme and enables targeted follow-up on outstanding assessments while allowing completed projects to proceed to publication (`mvp-p.md` §8).
* **Impact if Omitted:** Coordinators would be blind to missing Examiner or Supervisor grades and unable to review submitted grading sheets before approval.

### C. Functional Requirements

* **FR-199:** The system must provide the Project Coordinator with a real-time **Assessment Completion Monitoring Dashboard (`PC-27`, `PC-33`)** for their assigned Programme and Academic Session, displaying for every project:
  1. Project Title, Type (`Individual` / `Group`), and Student Name(s) & Matriculation Number(s).
  2. **Supervisor Assessment Status:** `Submitted` vs. `Pending/Incomplete` (for Group Projects, showing `X of Y Group Members Assessed` per `F-39`) and the assigned Supervisor's name.
  3. **Examiner Panel Assessment Status:** `X of M Appointed Examiners Submitted` (e.g., `2 of 2 Submitted` vs. `1 of 2 Submitted — Pending: Dr. Eze`) per `F-46` and `F-47`.
  4. **Overall Project Assessment Readiness Status:**
     * `Awaiting Assessments` (one or more required Supervisor or Examiner assessments not yet submitted)
     * `Ready for Consolidation & Approval` (all required Examiner and Supervisor assessments submitted)
     * `Approved - Ready to Publish` (`F-59` approved, awaiting `F-60` publication)
     * `Published` (`F-60` published to student(s))
* **FR-200:** The system must allow the Project Coordinator (`PC-30`) to drill down into any project and inspect the full read-only details of every submitted Examiner Assessment (`F-52`–`F-55` criterion scores, subtotals, formal feedback, and edit history) and every submitted Supervisor Performance Assessment (`F-39`, `F-56` criterion scores, total score, and qualitative feedback).
* **FR-201:** The system must allow the Coordinator to filter the cohort by Assessment Readiness Status (`Incomplete Supervisor Assessment`, `Incomplete Examiner Assessment`, `Ready for Approval`, `Approved & Unpublished`, `Published`) (`PC-27`, `PC-33`) and trigger a reminder notification (`F-71`, `F-72`) to any Supervisor or Examiner with an outstanding assessment.

### D. User Interaction and Behaviour

* **Access:** Project Coordinator Workspace -> "Assessments & Results -> Assessment Completion Monitoring" (`PC-27`, `PC-30`, `PC-33`).
* **Information Viewed:** Programme KPI summary cards (`Total Projects`, `Incomplete Assessments`, `Ready for Approval`, `Approved (Unpublished)`, `Published`), filterable project assessment matrix, and detailed Submitted Assessment Inspector drawer/modal (`PC-30`).
* **Actions Performed:** Filter by Outstanding Assessment Type (`PC-27`, `PC-33`), Inspect Submitted Examiner & Supervisor Assessment Sheets (`PC-30`), Send Assessment Reminder to Supervisor/Examiner, Navigate to Consolidation & Approval (`F-58`, `F-59`).
* **Validations:** Scoped strictly to the Coordinator's assigned Programme and Session (`BR-03`); Coordinator can inspect submitted scores (`PC-30`) but cannot directly alter an Examiner's or Supervisor's raw criterion scores.
* **Post-Action Behaviour:** Dashboard updates in real time as `F-55` and `F-56` submissions arrive.
* **States:** Loading, Empty state, Filtered states for outstanding vs. complete projects.

### E. Business Rules

* **BR-03:** Scoped strictly to the Coordinator's assigned Programme and Academic Session.
* **BR-17:** Supervisor and Examiner assessments are displayed distinctly for Coordinator review (`PC-30`).

### F. Permissions and Access Control

* **Project Coordinator:** Full read and monitoring access across all projects within their assigned Programme and Session (`PC-27`, `PC-30`, `PC-33`).
* **All Other Actors:** No access to the programme-wide monitoring dashboard.

### G. Data Requirements

* **Displayed:** Project ID (`F-21`), Student/Group Roster, Appointed Examiner Count vs. Submitted Examiner Count (`F-46`, `F-47`, `F-55`), Supervisor Assessment Submitted Count vs. Required Student Count (`F-39`, `F-56`), Individual Submitted Assessment Sheets (`PC-30`), Result Approval & Publication Status (`F-59`, `F-60`).

### H. Dependencies and Integrations

* **Required Features:** `F-39`, `F-46`, `F-47`, `F-51`–`F-56`, `F-58`, `F-59`, `F-60`, `F-66`, `F-71`, `F-72`.

### I. Acceptance Criteria

* **AC-F57-01 (Positive — Identifying Incomplete Examiner & Supervisor Assessments):** Given Project A has `2 of 2` Examiner assessments submitted and `1 of 1` Supervisor assessment submitted, while Project B has `1 of 2` Examiner assessments submitted and `0 of 1` Supervisor assessment submitted, When the Coordinator views Assessment Completion Monitoring (`PC-27`, `PC-33`), Then Project A is badged `Ready for Consolidation & Approval` and Project B is badged `Awaiting Assessments` with the exact missing Examiner and Supervisor names highlighted.
* **AC-F57-02 (Positive — Coordinator Reviews Submitted Assessments `PC-30`):** Given Project A has completed Examiner and Supervisor assessments, When the Coordinator clicks "Review Assessments" (`PC-30`), Then the system displays each Examiner's Document scores, Defence scores, and Formal Feedback alongside the Supervisor's Performance scores and feedback.

---

## F-58: Final Assessment Consolidation

### A. Feature Identification

* **Feature ID:** F-58
* **Feature Name:** Final Assessment Consolidation
* **Feature Category:** Assessment & Grading (User-Facing Functionality & Calculation Engine)
* **Primary Actor:** Project Coordinator
* **Supporting Actors:** Assessment Structure (`F-51`), Examiner Assessments (`F-52`–`F-55`), Supervisor Assessments (`F-39`, `F-56`), Late Penalty Management (`F-44`), Audit Process (`F-82`)
* **MVP Priority:** P0
* **Source User Stories:** PC-30, PC-31
* **Short Feature Description:** Automatically consolidates submitted Examiner assessment(s) and independent Supervisor performance assessment(s) — applying the programme's configured multi-examiner consolidation method, group-shared vs. individual-member grading rules, and any effective late penalties (`F-44`) — to produce each student's consolidated final project score, grade, and pass/fail outcome for Coordinator review and approval (`F-59`).

### B. Business Purpose

* **Problem Solved:** Manual consolidation of multiple Examiners' document and defence scores, individual Supervisor performance scores (especially across group members), and late submission penalties is error-prone and risks rounding inaccuracies.
* **Necessity for Clario:** Implements the confirmed MVP academic grading consolidation rules (`mvp-p.md` §2.4, §2.5, §7) and prepares each student's result for Coordinator approval (`F-59`).
* **Business/Academic Value:** Guarantees mathematically consistent, auditable grade computation for both individual and group projects while preserving intermediate decimal precision (`NFR-DOM`).
* **Impact if Omitted:** Submitted Examiner and Supervisor assessments could not be combined into a final project score or grade.

### C. Functional Requirements

* **FR-202:** Once all required Examiner Assessments (`F-47`, `F-55`) and Supervisor Performance Assessments (`F-39`, `F-56`) for a project are in `Submitted` status, the system must automatically execute **Final Assessment Consolidation** for that project (`mvp-p.md` §7):
  1. **Step 1 — Consolidate Examiner Score ($E_{\text{consolidated}}$):**
     * If a single Examiner is assigned ($M = 1$), $E_{\text{consolidated}} = E_1$ (where $E_1 = \text{Document Subtotal}_1 + \text{Defence Subtotal}_1$).
     * If multiple Examiners are assigned ($M > 1$), the system combines $E_1, E_2, \dots, E_M$ using the Programme's configured **Examiner-Score Consolidation Method (`F-51`)** (e.g., Arithmetic Mean: $E_{\text{consolidated}} = \frac{1}{M}\sum_{i=1}^{M} E_i$, or configured weighted/Coordinator-resolved method per `OD-08`), preserving full floating/decimal precision without premature intermediate rounding (`NFR-DOM`).
     * Similarly, consolidated Document ($D_{\text{consolidated}}$) and Defence ($V_{\text{consolidated}}$) sub-components are preserved for the student's breakdown (`F-61`).
  2. **Step 2 — Combine with Individual Supervisor Score ($S_k$) per Student $k$:**
     * For an **Individual Project**, the student's Gross Score is:
       $$\text{Gross Score} = E_{\text{consolidated}} + S_{\text{student}}$$
     * For a **Group Project (`mvp-p.md` §2.5, §7)**, every group member $k \in \{1 \dots G\}$ receives the **same shared** $E_{\text{consolidated}}$ combined with their **own individual** Supervisor Performance Score $S_k$ (`F-39`):
       $$\text{Gross Score}_k = E_{\text{consolidated}} + S_k$$
  3. **Step 3 — Apply Effective Late Submission Penalties ($P_{\text{effective}}$ from `F-44`):**
     * $$\text{Net Unrounded Score}_k = \max\left(0,\; \text{Gross Score}_k - P_{\text{effective}}\right)$$
  4. **Step 4 — Apply Programme Final Display Rounding & Grade Classification (`F-51`, `OD-08`):**
     * Apply the institution/programme's approved final rounding rule (`NFR-DOM`, `OD-08`) to $\text{Net Unrounded Score}_k$ to produce $\text{Final Score}_k$, map $\text{Final Score}_k$ to the Programme's configured Letter Grade Scale (`F-51`), and determine Academic Outcome (`Pass` if $\text{Final Score}_k \ge \text{Pass Mark Threshold}$, else `Fail`).
* **FR-203:** The system must present a complete **Consolidated Result Sheet (`PC-30`, `PC-31`)** to the Project Coordinator for each project showing:
  1. Each Examiner's individual Document score, Defence score, Total score, and Formal Feedback.
  2. The Consolidated Examiner Score ($E_{\text{consolidated}}$) and consolidation method used.
  3. Each Student's Individual Supervisor Score ($S_k$) and feedback (`F-39`, `F-56`).
  4. Any Late Penalty applied or overridden (`F-44`).
  5. Both the exact unrounded calculation and the rounded Final Score, Letter Grade, and Pass/Fail status for each student, ready for Final Result Approval (`F-59`).

### D. User Interaction and Behaviour

* **Access:** Project Coordinator via "Programme Workspace -> Assessments & Results -> Consolidation & Approval" (`PC-30`, `PC-31`).
* **Information Viewed:** Project Consolidated Result Sheet showing side-by-side Examiner Panel scores, Consolidated Examiner Score, Student-by-Student Supervisor Score (1 row for Individual Project; $G$ rows for a Group Project of $G$ members), Late Penalty deduction (`F-44`), Unrounded Score, Final Rounded Score, Letter Grade, Pass/Fail badge, and Consolidation Status (`Incomplete Assessments`, `Consolidated - Pending Approval`, `Approved`, `Published`).
* **Actions Performed:** Review Consolidated Result Breakdown (`PC-30`), Trigger/Refresh Consolidation, Proceed to Approve Final Result (`F-59`).
* **Validations:** Consolidation cannot transition to `Ready for Approval` unless all appointed Examiners (`F-46`, `F-47`) and the assigned Supervisor (for all group members `F-39`) have status `Submitted`.
* **Post-Action Behaviour:** Consolidated result records are persisted for each student on the project and unlocked for `F-59` Coordinator approval.
* **States:** Loading, Incomplete Prerequisite Assessments state (listing missing assessors), Consolidated & Ready for Approval state, Approved state, Published state.

### E. Business Rules

* **BR-17:** Examiner and Supervisor assessments are independent inputs to consolidation.
* **BR-18 & BR-19:** Uses the Coordinator's configured mark allocations (default $30\text{ marks}$ Supervisor), pass marks, and Examiner consolidation method (`F-51`).
* **MVP Group Consolidation Rule (`mvp-p.md` §2.5, §7):** Group projects receive a shared Examiner project assessment and individual Supervisor performance scores; each group member receives an individually calculated final result.
* **NFR-DOM:** Intermediate grading calculations must preserve precision and apply the institution's approved rounding rules only at final display/result determination (`OD-08`).

### F. Permissions and Access Control

* **Project Coordinator:** Full access to view and manage assessment consolidation within their assigned Programme and Session.
* **Project Supervisor & Project Examiner:** No access to the consolidated result sheet.
* **Student:** Read-only access to their own consolidated breakdown only **after** publication (`F-60`, `F-61`).

### G. Data Requirements

* **Captured:** Consolidated Result Record ID (one per Student), Project ID (`F-21`), Group ID (`F-22`, nullable), Student User ID (`F-13`), Consolidated Examiner Document Score (exact decimal), Consolidated Examiner Defence Score (exact decimal), Consolidated Examiner Total Score ($E_{\text{consolidated}}$, exact decimal), Individual Supervisor Score ($S_k$, exact decimal), Gross Score (exact decimal), Effective Late Penalty Deducted (`F-44`), Net Unrounded Final Score (exact decimal), Final Rounded Score, Letter Grade, Pass/Fail Status (`PASS`, `FAIL`), Consolidation Method Snapshot, Consolidation Timestamp.

### H. Dependencies and Integrations

* **Required Features:** `F-39`, `F-44`, `F-46`, `F-47`, `F-51`–`F-57`, `F-64`, `F-66`, `F-82`.
* **Consumed By:** `F-59` (Final Result Approval), `F-60` (Project Result Publication), `F-61` (Assessment Breakdown Access), `F-62` (Project Completion Tracking).

### I. Acceptance Criteria

* **AC-F58-01 (Positive — Group Project Shared Examiner + Individual Supervisor Consolidation):** Given Group `CSC-GRP-01` (with members Student A and Student B) is evaluated by $2$ Examiners under an `Average` consolidation rule (`Examiner 1` scores `55.5 / 70`, `Examiner 2` scores `60.5 / 70`, giving shared $E_{\text{consolidated}} = 58.0 / 70$), and the Supervisor submits individual scores of $S_A = 27.0 / 30$ for Student A and $S_B = 20.0 / 30$ for Student B (with $0$ late penalty), When `F-58` consolidates the results, Then Student A receives an individual consolidated score of `85.0 / 100` (`58.0 + 27.0`) and Student B receives an individual consolidated score of `78.0 / 100` (`58.0 + 20.0`).
* **AC-F58-02 (Precision — No Premature Rounding of Intermediate Averages):** Given $3$ Examiners score a project `50 / 70`, `51 / 70`, and `50 / 70` (average $= 50.3333\dots$) and the Supervisor scores `25.33 / 30`, When `F-58` calculates the student's score, Then the intermediate Examiner average retains full decimal precision before adding `25.33` (`75.6633\dots`), and rounding is applied only at the final step according to the programme's rounding rule (`NFR-DOM`).

---

# Module J: Final Results and Project Completion

*(Note: `F-63` Incomplete Project Carry-Forward (`SYS-18`, `BR-24`) is classified as **P1** in `mvp-p.md` §5 and is excluded from the MVP implementation specification).*

## F-59: Final Result Approval

### A. Feature Identification

* **Feature ID:** F-59
* **Feature Name:** Final Result Approval
* **Feature Category:** Final Results & Completion (User-Facing Functionality)
* **Primary Actor:** Project Coordinator
* **Supporting Actors:** Final Assessment Consolidation (`F-58`), Project Result Publication (`F-60`), Audit Process (`F-82`)
* **MVP Priority:** P0
* **Source User Stories:** PC-31
* **Short Feature Description:** Enables Project Coordinators to formally review and approve consolidated final examination results at the individual project level (`PC-31`, `BR-22`) as a mandatory gate before result publication (`F-60`).

### B. Business Purpose

* **Problem Solved:** Automated score consolidation (`F-58`) must be verified and formally signed off by the academic Project Coordinator before official grades are released to students.
* **Necessity for Clario:** Implements `BR-22` ("The Coordinator approves final examination results") and `PC-31`, serving as the mandatory governance gate prior to `F-60` publication.
* **Business/Academic Value:** Prevents unverified or incomplete grades from being accidentally published to students.
* **Impact if Omitted:** Unapproved grades could be exposed to students, violating academic governance and `NFR-DAT: Result publication`.

### C. Functional Requirements

* **FR-204:** The system must allow a Project Coordinator to formally **Approve (`PC-31`, `BR-22`)** the consolidated final result(s) (`F-58`) of any Individual Project or Group Project within their assigned Programme and Academic Session, **if and only if**:
  1. All appointed Project Examiners (`F-46`, `F-47`) have formally `Submitted` their assessments (`F-55`).
  2. The assigned Project Supervisor has formally `Submitted` the Supervisor Performance Assessment (`F-56`) for the student (or for **all** active student members of a Group Project per `F-39`).
  3. Final Assessment Consolidation (`F-58`) is complete and up to date.
* **FR-205:** The system must support both single-project result approval and batch selection approval for multiple projects that satisfy `FR-204`.
* **FR-206:** Upon Coordinator approval of a project's final result:
  1. The project's Result Status transitions from `Consolidated - Pending Approval` to `Approved - Ready for Publication`.
  2. For a Group Project, approving the project's result approves the consolidated individual result records of all members of that group.
  3. The system records a tamper-resistant critical academic audit log entry (`F-82`, `NFR-AUD`) capturing the Coordinator ID, Project ID, Student ID(s), approved scores/grades, and approval timestamp.
* **FR-207:** Prior to publication (`F-60`), the Coordinator may revoke/un-approve an `Approved` result (returning it to `Consolidated - Pending Approval`) if an adjustment to a late penalty override (`F-44`) or examiner/supervisor re-evaluation is needed; furthermore, as specified in `FR-190` (`PROP-03`), any edit by an Examiner (`F-55`) or Supervisor (`F-56`) before publication automatically reverts the status to `Pending Coordinator Re-Approval`.

### D. User Interaction and Behaviour

* **Access:** Project Coordinator Workspace -> "Assessments & Results -> Result Approval & Publication" (`PC-31`).
* **Information Viewed:** Table of consolidated projects showing Project Title, Student/Group Member(s), Consolidated Examiner Score, Individual Supervisor Score(s), Late Penalty, Final Score & Grade, Pass/Fail Outcome, and Result Status (`Incomplete`, `Pending Approval`, `Approved`, `Published`).
* **Actions Performed:** Inspect Consolidated Result Sheet (`F-58`), Approve Project Result (`PC-31`), Batch Approve Selected Ready Projects, Un-approve Result (if not yet published).
* **Validations:** All required Examiner and Supervisor assessments for that project must be `Submitted`; MFA-authenticated Coordinator session required (`SEC-06`); active internet connection required (`NFR-USA`).
* **Post-Action Behaviour:** Project Result Status becomes `Approved - Ready for Publication`, audit log (`F-82`) is written, and the "Publish Result" action (`F-60`) is unlocked for that project.
* **States:** Disabled approval button (when assessments are incomplete), Ready for Approval state, Approved state, Re-Approval Required warning state (if an assessor edited a score post-approval per `PROP-03`).

### E. Business Rules

* **BR-03:** Scoped strictly to the Coordinator's assigned Programme and Academic Session.
* **BR-22:** The Coordinator approves final examination results.
* **NFR-DAT & MVP Publication Rule (`mvp-p.md` §8):** A project's result must be approved before it can be published (`F-60`).
* **NFR-AUD:** Final result approvals must be recorded in the audit log (`F-82`).

### F. Permissions and Access Control

* **Project Coordinator:** Sole authority to approve final project results within their assigned Programme and Session (`BR-22`).
* **All Other Actors:** No permission to approve results.

### G. Data Requirements

* **Captured:** Result Approval ID, Project ID (`F-21`), Consolidated Result ID(s) (`F-58`), Approval Status (`PENDING_APPROVAL`, `APPROVED`, `REQUIRES_REAPPROVAL`, `PUBLISHED`), Approved By Coordinator User ID, Approved Timestamp, Snapshot Hash of Approved Scores.

### H. Dependencies and Integrations

* **Required Features:** `F-39`, `F-55`, `F-56`, `F-57`, `F-58`, `F-64`, `F-66`, `F-82`.
* **Consumed By:** `F-60` (Project Result Publication).

### I. Acceptance Criteria

* **AC-F59-01 (Positive — Coordinator Approves Completed Project Result):** Given Project X has all required Examiner and Supervisor assessments submitted and consolidated in `F-58`, When the Project Coordinator clicks "Approve Result" (`PC-31`), Then Project X's result status transitions to `Approved - Ready for Publication`, an immutable audit record is logged (`F-82`), and Project X becomes eligible for publication (`F-60`).
* **AC-F59-02 (Validation — Block Approval When Any Required Assessment Is Missing):** Given Project Y is missing one Examiner assessment or one group member's Supervisor assessment, When the Coordinator attempts to approve Project Y's result, Then the system blocks the approval and identifies the outstanding assessment(s).

---

## F-60: Programme / Project Result Publication

### A. Feature Identification

* **Feature ID:** F-60
* **Feature Name:** Programme / Project Result Publication *(preserving original feature catalogue ID `F-60` while implementing the superseding Project-Level Publication Rule from `mvp-p.md` §2.6, §8)*
* **Feature Category:** Final Results & Completion (User-Facing Functionality)
* **Primary Actor:** Project Coordinator
* **Supporting Actors:** Student (`ST-31`), Project Examiner (`PE-11`), Project Supervisor, Notification Services (`F-71`–`F-75`), Audit Process (`F-82`)
* **MVP Priority:** P0
* **Source User Stories:** PC-32, ST-31
* **Short Feature Description:** Enables Project Coordinators to atomically publish approved final project results at the **individual project level** (or in batches of approved projects) once all required assessments for that project are completed, consolidated, and approved (`mvp-p.md` §8), without blocking on outstanding assessments for other pending projects in the programme, and exposes published results to Students (`ST-31`).

### B. Business Purpose

* **Problem Solved:** In a cohort of $200$ projects, a few delayed projects (e.g., medical deferrals or rescheduled defences) should not prevent the other $195$ completed and approved projects from having their official results published.
* **Necessity for Clario:** Implements `PC-32`, `ST-31`, and the superseding **Result Publication Rule (`mvp-p.md` §2.6, §8)**: *"A Coordinator may publish an individual project's result once all required assessments for that project have been completed, consolidated and approved. Outstanding assessments for other projects must not block publication of that project's result. Publication must be atomic at the individual project-result level."*
* **Business/Academic Value:** Eliminates programme-wide publication bottlenecks while guaranteeing atomic, tamper-proof result release per project.
* **Impact if Omitted:** Students could never view their official final project grades (`ST-31`) on Clario.

### C. Functional Requirements

* **FR-208:** The system must allow a Project Coordinator to publish the final result of any individual Project (`F-21`) within their assigned Programme and Academic Session **as soon as that specific project's result is in status `Approved - Ready for Publication` (`F-59`)**, regardless of whether other projects in the same Programme and Session still have pending/incomplete assessments (`mvp-p.md` §8).
* **FR-209:** The system must also allow a Project Coordinator to select and publish multiple `Approved` projects simultaneously (e.g., "Publish Selected Approved Projects" or "Publish All Currently Approved Projects"), while leaving any unapproved/incomplete projects in their current pending state.
* **FR-210:** Publication must be **strictly atomic at the individual project-result level (`mvp-p.md` §8)**:
  1. For an Individual Project, the student's final result, assessment breakdown (`F-61`), project completion status (`F-62`), and assessment lock (`BR-21`) either all transition to `Published` together in a single atomic transaction, or none transition if an error occurs.
  2. For a Group Project, all group members' individual consolidated results (`F-58`), assessment breakdowns (`F-61`), completion statuses (`F-62`), and assessment locks (`BR-21`) for that project transition atomically together.
* **FR-211:** Immediately upon atomic publication of a project's result:
  1. All Examiner Assessments (`F-55`, `BR-21`), Supervisor Performance Assessments (`F-56`), and Late Penalty Overrides (`F-44`) for that project are permanently locked against further modification.
  2. The published Final Score, Letter Grade, and Pass/Fail outcome become visible to the Student (or each respective Group Member privately per `FR-121`) in their Project Workspace (`ST-31`), along with the Assessment Breakdown (`F-61`) and Project Completion status (`F-62`).
  3. A tamper-resistant critical academic audit log entry (`F-82`, `NFR-AUD`) is recorded.
  4. In-app and email result-publication notifications (`F-71`–`F-75`) are dispatched to the Student(s)/Group Members (without notification failure rolling back the published result per `NFR-DOM: Notifications`).
* **FR-212:** Before a project's result is `Published`, the system must strictly hide all Examiner scores, Supervisor performance scores, and consolidated grades from the Student(s).

### D. User Interaction and Behaviour

* **Access:** Project Coordinator via "Programme Workspace -> Assessments & Results -> Result Approval & Publication" (`PC-32`); Student via "Project Workspace -> Defence & Results" (`ST-31`).
* **Information Viewed:**
  * *Coordinator:* List of projects filterable by `Approved - Ready to Publish` vs. `Pending Assessments` vs. `Published`, with "Publish Project Result" action on each `Approved` project and "Publish All Approved Projects ($K$ ready)" batch action.
  * *Student (`ST-31`):* Before publication: *"Your final project result has not been published yet."* After publication: Official Result Card displaying Project Title, Final Score (e.g., `85.0 / 100`), Letter Grade (`A`), Academic Outcome badge (`PASS`), Publication Timestamp, and link to Assessment Breakdown (`F-61`).
* **Actions Performed:** Publish Individual Project Result (`PC-32`), Batch Publish Approved Projects, View Published Final Result (`ST-31`).
* **Validations:** Target project's result must be in status `Approved` (`F-59`); active internet connection and MFA-authenticated Coordinator session required (`NFR-USA`, `SEC-06`).
* **Post-Action Behaviour:** Result atomically transitions to `Published`, assessments lock (`BR-21`), audit entry is written (`F-82`), and Student notification is queued (`F-71`–`F-75`).
* **States:** `Unpublished (Pending / Under Review)`, `Approved (Ready to Publish)`, `Published (Final & Locked)`.

### E. Business Rules

* **BR-21:** Examiners can edit submitted assessments only until the Coordinator publishes that project's result.
* **BR-22:** The Coordinator approves final examination results before publication.
* **BR-23 (Updated per `mvp-p.md` §2.6, §8):** A Coordinator may publish an individual project's result once all required assessments for that project have been completed, consolidated, and approved; outstanding assessments for other projects must not block publication of that project's result. Publication is atomic at the individual project-result level.
* **NFR-AUD:** Result publication must be recorded in the audit log (`F-82`).

### F. Permissions and Access Control

* **Project Coordinator:** Sole authority to publish approved project results within their assigned Programme and Session (`PC-32`).
* **Student:** Read-only access strictly to their own published final result (`ST-31`, `SEC-11`, `FR-121`).
* **Project Examiner & Project Supervisor:** Read-only visibility that the project's result is `Published` (`PE-11`).

### G. Data Requirements

* **Captured/Displayed:** Publication Event ID, Project ID (`F-21`), Consolidated Result ID(s) (`F-58`), Publication Status (`UNPUBLISHED`, `PUBLISHED`), Published By Coordinator User ID, Published Timestamp, Student Final Score, Letter Grade, Pass/Fail Outcome.

### H. Dependencies and Integrations

* **Required Features:** `F-55`, `F-56`, `F-58`, `F-59`, `F-61`, `F-62`, `F-64`, `F-66`, `F-71`–`F-75`, `F-82`.

### I. Acceptance Criteria

* **AC-F60-01 (Positive — Project-Level Result Publication Without Blocking on Other Pending Projects):** Given a Programme has $50$ projects where Project 1 is `Approved` (`F-59`) and Projects 2 through 50 still have incomplete Examiner or Supervisor assessments, When the Project Coordinator clicks "Publish Result" for Project 1 (`PC-32`), Then Project 1's result is published immediately and visible to Project 1's Student(s) (`ST-31`), without being blocked by Projects 2–50 (`mvp-p.md` §8).
* **AC-F60-02 (Atomicity — Atomic Project-Result Publication):** Given Group Project `CSC-GRP-01` (with $3$ members) is `Approved`, When the Coordinator publishes `CSC-GRP-01`'s result, Then all $3$ members' individual results and breakdowns (`F-61`) transition to `Published` atomically and all Examiner/Supervisor assessments for `CSC-GRP-01` lock simultaneously; if a database/system fault interrupts the transaction mid-operation, the entire project's publication rolls back cleanly so no partial publication occurs (`mvp-p.md` §8).
* **AC-F60-03 (Validation — Cannot Publish Unapproved Result):** Given Project 2's result is in `Consolidated - Pending Approval` (not yet approved via `F-59`), When the Coordinator attempts to publish Project 2's result, Then the system blocks publication and requires Coordinator approval first (`BR-22`).

---

## F-61: Assessment Breakdown Access

### A. Feature Identification

* **Feature ID:** F-61
* **Feature Name:** Assessment Breakdown Access
* **Feature Category:** Final Results & Completion (User-Facing Functionality)
* **Primary Actor:** Student
* **Supporting Actors:** Final Assessment Consolidation (`F-58`), Project Result Publication (`F-60`), Access Control Service (`F-66`)
* **MVP Priority:** P0
* **Source User Stories:** ST-32
* **Short Feature Description:** Enables Students to view the transparent, published breakdown of their final project grade (`ST-32`) — showing the Supervisor Performance component, Examiner Document Assessment component, Examiner Defence Assessment component, any applied/overridden Late Submission Penalties (`F-44`), and formal examination/supervisory feedback — once their project's result has been published (`F-60`).

### B. Business Purpose

* **Problem Solved:** Showing a student only a single final number (e.g., `64%`) without showing how their Supervisor performance, written dissertation, oral defence, and any late penalties contributed to that grade leads to grade disputes and prevents academic learning.
* **Necessity for Clario:** Implements `ST-32`.
* **Business/Academic Value:** Provides transparent academic accountability to students while preserving group-member grade privacy (`FR-121`).
* **Impact if Omitted:** Students could not understand how their final project grade was determined (`ST-32`).

### C. Functional Requirements

* **FR-213:** Once a project's result is `Published` (`F-60`), the system must allow the Student (or each respective Student member of a Group Project) to view their **Published Assessment Breakdown (`ST-32`)** containing:
  1. **Supervisor Performance Component:** Score awarded out of configured maximum allocation (e.g., `26.0 / 30.0`, `F-39`/`F-56`), criterion breakdown, and Supervisor performance feedback for that student.
  2. **Examiner Document Assessment Component:** Consolidated Examiner Document score out of configured maximum allocation (e.g., `32.5 / 40.0`, `F-52`/`F-58`).
  3. **Examiner Defence Assessment Component:** Consolidated Examiner Defence score out of configured maximum allocation (e.g., `25.5 / 30.0`, `F-53`/`F-58`).
  4. **Consolidated Examiner Total Score:** Combined Examiner score (e.g., `58.0 / 70.0`) and Formal Examination Feedback (`F-54`, `PE-08`).
  5. **Late Submission Penalty Adjustment (`F-44`):** Gross Score, Effective Late Penalty Deducted (showing `0.00` or `Waived by Coordinator` if overridden), Final Score, Letter Grade, Pass Mark Threshold, and Academic Outcome (`Pass` / `Fail`).
* **FR-214:** For a Group Project, each group member viewing `F-61` must see the group's shared Examiner Document and Defence scores alongside **only their own** individual Supervisor Performance score and their own final result (`FR-121`).
* **FR-215:** If a project's result is **not yet `Published` (`F-60`)**, the system must block Student access to `F-61` (`403 Forbidden / Not Yet Published`).

### D. User Interaction and Behaviour

* **Access:** Student via "Project Workspace -> Defence & Results -> View Assessment Breakdown" (`ST-32`).
* **Information Viewed:** Structured Grade Breakdown Card (Component Table: `Supervisor Performance`, `Examiner Document Assessment`, `Examiner Defence Assessment`, `Gross Total`, `Late Penalty Deduction`, `Final Published Score & Grade`) and Formal Assessment Feedback panels (Supervisor Performance Feedback + Examiner Formal Feedback).
* **Actions Performed:** View Published Assessment Breakdown (`ST-32`), Print/Download Personal Result Slip (read-only view).
* **Validations:** Project result must be `Published` (`F-60`); requesting user must be the Student owner of that result record (`SEC-11`).
* **Post-Action Behaviour:** Breakdown renders in under $2\text{ seconds}$ (`PER-01`).
* **States:** Locked/Unpublished state (prior to `F-60`), Published Breakdown state.

### E. Business Rules

* **BR-02 & SEC-11:** A Student can only view their own published assessment breakdown.
* **MVP Group Rule (`mvp-p.md` §7):** Breakdown reflects the shared Examiner project assessment and the student's individual Supervisor performance score.

### F. Permissions and Access Control

* **Student:** Read-only access to their own published assessment breakdown (`ST-32`, `SEC-11`).
* **Project Coordinator:** Read access to all student breakdowns in their assigned Programme and Session.
* **Institutional Admin / Platform Admin:** No access (`BR-25`, `F-08`, `F-18`).

### G. Data Requirements

* **Displayed:** Student Consolidated Result Record (`F-58`), Component Scores & Max Allocations (`F-51`), Late Penalty Record (`F-44`), Supervisor Qualitative Feedback (`F-39`/`F-56`), Examiner Formal Feedback (`F-54`), Publication Timestamp (`F-60`).

### H. Dependencies and Integrations

* **Required Features:** `F-39`, `F-44`, `F-51`–`F-56`, `F-58`, `F-60`, `F-64`, `F-66`.

### I. Acceptance Criteria

* **AC-F61-01 (Positive — Student Views Published Breakdown of Supervisor & Examiner Assessments):** Given Student A's project result has been `Published` (`F-60`), When Student A opens the Assessment Breakdown view (`ST-32`), Then Student A sees their Supervisor Performance score (`27.0 / 30`), Consolidated Examiner Document score (`33.5 / 40`), Consolidated Examiner Defence score (`24.5 / 30`), Late Penalty (`0.0`), Final Score (`85.0 / 100`), Grade (`A`), and formal feedback.
* **AC-F61-02 (Permission — Breakdown Hidden Before Publication):** Given Student A's project result is `Approved` (`F-59`) but not yet `Published` (`F-60`), When Student A attempts to view the Assessment Breakdown (`ST-32`), Then the system hides all scores and feedback until publication occurs.

---

## F-62: Project Completion Tracking

### A. Feature Identification

* **Feature ID:** F-62
* **Feature Name:** Project Completion Tracking
* **Feature Category:** Final Results & Completion (User-Facing Functionality)
* **Primary Actor:** Student
* **Supporting Actors:** Project Coordinator, Project Supervisor
* **MVP Priority:** P0
* **Source User Stories:** ST-33
* **Short Feature Description:** Evaluates and displays a clear academic completion checklist and overall Project Completion Status (`In Progress`, `Awaiting Examination / Results`, `Completed (Passed)`, `Incomplete / Failed`) to the Student (`ST-33`), Supervisor, and Coordinator based on the fulfilment of all required academic stages.

### B. Business Purpose

* **Problem Solved:** Students need an unambiguous indicator showing whether they have fulfilled every mandatory academic condition required to complete their final-year project (approved topic, all milestones approved, final consolidated dissertation submitted and approved, oral defence completed, and passing final result published).
* **Necessity for Clario:** Implements `ST-33`.
* **Business/Academic Value:** Eliminates graduation clearance ambiguity for students, supervisors, and programme coordinators.
* **Impact if Omitted:** Students would lack a definitive completion status summarizing whether all project requirements have been satisfied (`ST-33`).

### C. Functional Requirements

* **FR-216:** For every Student registered in a Programme and Academic Session (`F-19`), the system must automatically evaluate and display a **Project Completion Checklist & Status (`ST-33`)** based on the following academic completion conditions:
  1. **Condition 1 — Topic Approved:** Project Topic Proposal is `Approved` (`F-20`).
  2. **Condition 2 — All Interim Milestones Approved:** Every configured Interim Milestone (`F-29`) has status `Approved` (`F-33`, `BR-10`).
  3. **Condition 3 — Final Consolidated Project Submitted & Approved:** The Final Consolidated Project Submission (`F-32`, `ST-11`) is submitted and `Approved` by the Supervisor (`F-33`).
  4. **Condition 4 — Examination & Assessments Completed:** All required Examiner Assessments (`F-55`) and the Student's Supervisor Performance Assessment (`F-39`, `F-56`) are submitted.
  5. **Condition 5 — Final Result Published & Passed:** The Student's Final Result is `Published` (`F-60`) and the Student's `Final Score >= Programme Pass Mark Threshold` (`F-51`, `F-58`).
* **FR-217:** When all five conditions in `FR-216` are satisfied, the system must transition the Student's Project Completion Status to **`Completed — All Academic Requirements Fulfilled` (`ST-33`)**.
* **FR-218:** If the project result is `Published` (`F-60`) and `Final Score < Programme Pass Mark Threshold`, the system must display the status as **`Assessed — Did Not Meet Pass Threshold (Failed)`**; if any stage prior to publication is still pending, the system must display **`In Progress`** with the exact fulfilled and remaining checklist items clearly indicated.

### D. User Interaction and Behaviour

* **Access:** Student via "Project Workspace -> Project Completion Status" (`ST-33`, also summarized on the workspace header `F-28` / `F-36`); Coordinator & Supervisor via their respective project monitoring tables (`F-31`, `F-57`).
* **Information Viewed:** Overall Completion Status badge (`In Progress`, `Completed`, `Failed / Incomplete`) and a 5-step Academic Completion Checklist showing a green checkmark, completion timestamp, or pending indicator for each condition (`Topic Approved`, `Interim Milestones Approved (N/N)`, `Final Dissertation Approved`, `Defence & Examination Completed`, `Final Result Published & Passed`).
* **Actions Performed:** View Project Completion Status and Checklist (`ST-33`).
* **Validations:** Read-only derived state; cannot be manually toggled to `Completed` if any underlying academic condition in `FR-216` is unfulfilled.
* **Post-Action Behaviour:** Automatically updates in real time as each lifecycle gate (`F-20`, `F-33`, `F-55`, `F-56`, `F-60`) is completed.
* **States:** `In Progress (X of 5 Requirements Met)`, `Completed (All Requirements Fulfilled)`, `Incomplete / Failed`.

### E. Business Rules

* **BR-10:** Sequential milestone approvals are required for progression and completion.
* **BR-22 & BR-23:** Official completion requires Coordinator result approval (`F-59`) and publication (`F-60`).
* *(Note: Automated Incomplete Project Carry-Forward `F-63` / `F-81` is P1 and excluded from the MVP).*

### F. Permissions and Access Control

* **Student:** Read-only access to their own Project Completion Status and checklist (`ST-33`, `SEC-11`).
* **Project Supervisor:** Read-only access to completion status of assigned students/groups (`SEC-12`).
* **Project Coordinator:** Read-only access to completion status across all students in their assigned Programme and Session (`BR-03`).

### G. Data Requirements

* **Displayed:** Student Registration ID (`F-19`), Project ID (`F-21`), Checklist Condition Booleans & Timestamps (`topic_approved`, `interim_milestones_approved`, `final_submission_approved`, `assessments_completed`, `result_published_and_passed`), Derived Overall Completion Status (`IN_PROGRESS`, `COMPLETED`, `FAILED_INCOMPLETE`), Completion Timestamp.

### H. Dependencies and Integrations

* **Required Features:** `F-19`, `F-20`, `F-29`, `F-31`, `F-32`, `F-33`, `F-51`, `F-55`, `F-56`, `F-58`, `F-59`, `F-60`.

### I. Acceptance Criteria

* **AC-F62-01 (Positive — Project Transitions to Completed Upon Passing Result Publication):** Given Student A has an `Approved` topic (`F-20`), all interim and final milestones `Approved` (`F-33`), all Examiner and Supervisor assessments submitted (`F-55`, `F-56`), and a consolidated score of `72.0 / 100` (above the `45.0` pass mark), When the Coordinator publishes Student A's result (`F-60`), Then Student A's Project Completion Status (`ST-33`) automatically updates to `Completed — All Academic Requirements Fulfilled` with all $5$ checklist conditions marked complete.
* **AC-F62-02 (Negative — Published Failing Result Does Not Mark Project Completed):** Given Student B has completed all submissions and defence, but their published final score (`F-60`) is `38.0 / 100` (below the `45.0` pass mark), When Student B views their Project Completion Status (`ST-33`), Then Condition 5 shows `Did Not Meet Pass Mark` and the overall status is `Assessed — Did Not Meet Pass Threshold` rather than `Completed`.
* **AC-F62-03 (In-Progress Tracking — Clear Visibility of Remaining Conditions):** Given Student C has an `Approved` topic and `2 of 3` interim milestones approved, When Student C views `ST-33`, Then the checklist shows `Topic Approved` as complete and clearly identifies `Interim Milestones (2/3 Approved)`, `Final Project Submission`, `Examination`, and `Result Publication` as pending.