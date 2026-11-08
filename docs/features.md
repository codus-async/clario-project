# Clario — Product Feature List

**Source:** Clario — User Stories v1.0  
**Status:** Feature extraction based on the approved discovery baseline. Outstanding decisions remain open.

## 1. Product scope

Clario manages the final-year project lifecycle within tertiary institutions, from topic proposal and allocation through supervision, milestone submissions, defence, assessment and result publication.

The feature list below consolidates related user stories into product capabilities while preserving traceability to their original IDs. Features are not additional requirements unless explicitly identified as proposed or requiring clarification.

## 2. Feature catalogue

### A. Platform administration

**Primary actor: Platform Admin**

| ID | Feature | User stories | Purpose |
|---|---|---|---|
| F-01 | Institutional Account Management | PA-01, PA-02, PA-03 | Create, manage, activate, suspend and monitor institutional accounts. |
| F-02 | Subscription Plan Management | PA-04 | Create and maintain subscription plans offered to institutions. |
| F-03 | Institutional Subscription and Billing Management | PA-05, PA-06 | Manage institutional subscriptions, billing information, payment status and renewals. |
| F-04 | Subscription Grace Period Management | PA-07 | Configure the period institutions receive to resolve expired subscriptions before restrictions apply. |
| F-05 | Platform Administrator Management | PA-08 | Create and manage platform administrators. |
| F-06 | Global Platform Configuration | PA-09 | Manage settings that apply across Clario and its institutions. |
| F-07 | Platform Support Management | PA-10 | Handle institutional platform-level support requests. |
| F-08 | Institutional Academic Data Protection | PA-11 | Prevent unrestricted Platform Admin access to confidential institutional academic records. |

**Dependencies and interactions**
- F-01 establishes the institutional account to which subscriptions belong.
- F-02 defines the plans managed through F-03.
- F-03 interacts with institutional subscription payment processing and status synchronisation.
- F-04 informs subscription access restrictions.
- F-08 depends on access-control enforcement.

### B. Institutional administration

**Primary actor: Institutional Admin**

| ID | Feature | User stories | Purpose |
|---|---|---|---|
| F-09 | Faculty Management | IA-01 | Create and manage faculties within an institution. |
| F-10 | Department Management | IA-02 | Create and manage departments within faculties. |
| F-11 | Programme Management | IA-03 | Create and manage academic programmes within departments. |
| F-12 | Academic Session Management | IA-04 | Create and manage academic sessions. |
| F-13 | Institutional User Management | IA-05, IA-06, IA-07 | Register, invite, update and deactivate institutional users. |
| F-14 | Institutional Role and Permission Management | IA-08 | Assign institutional roles and permissions. |
| F-15 | Project Coordinator Appointment | IA-09 | Appoint Coordinators to specific programmes and academic sessions. |
| F-16 | Supervisor Records Management | IA-10 | Maintain supervisor records for project assignment. |
| F-17 | Institutional Project Oversight | IA-11 | Monitor project administration across the institution. |
| F-18 | Academic Information Confidentiality | IA-12 | Prevent Institutional Admins from accessing confidential project documents and academic feedback. |

**Dependencies and interactions**
- The institutional hierarchy is Institution → Faculty → Department → Programme → Academic Session.
- F-09 through F-12 establish the structure used by user administration and academic administration.
- F-15 establishes the programme and session scope for Coordinator responsibilities.
- F-18 must be enforced alongside role and scope-based access control.

### C. Project registration, topics and allocation

**Primary actor: Project Coordinator. Supporting actors: Student and Project Supervisor.**

| ID | Feature | User stories | Purpose |
|---|---|---|---|
| F-19 | Student Project Registration | PC-01 | Register and maintain project student records within the Coordinator's assigned programme and session. |
| F-20 | Project Topic Proposal and Review Management | PC-02, PC-20, PS-01, PS-02, PS-03, PS-04, PS-05, ST-04, ST-05, ST-06, ST-07, ST-08 | Receive proposals; support Supervisor review, approval, rejection, feedback, alternative suggestions and revised proposals; expose topic status to authorised users. |
| F-21 | Project Allocation Management | PC-03, PC-04 | Establish individual or group project arrangements and assign Supervisors after topic proposals are submitted. |
| F-22 | Project Group Management | PC-05, PC-06, ST-17 | Create project groups, assign initial members and allow students to view group membership. |
| F-23 | Group Submission Authority Management | PC-07, ST-20 | Designate authorised group submitters and restrict formal group submissions to them. |
| F-24 | Supervisor Assignment Management | PC-08, PC-09 | Assign Supervisors to individual students or project groups. |

**Dependencies and interactions**
- Student registration precedes project participation.
- Students submit topic proposals before Supervisor assignment.
- Supervisors make academic topic decisions; Coordinators assign Supervisors.
- F-21 establishes whether a project is individual or group-based.
- F-22 and F-23 establish group membership and formal submission authority.
- Topic approval and project allocation are separate decisions.

### D. Supervisor capacity and assignment management

**Primary actor: Project Coordinator. Supporting actor: Project Supervisor.**

| ID | Feature | User stories | Purpose |
|---|---|---|---|
| F-25 | Supervisor Workload Monitoring | PC-10 | Display the number of students and groups assigned to each Supervisor. |
| F-26 | Supervisor Workload Limit Management | PC-11 | Establish and enforce Supervisor assignment capacity. |
| F-27 | Supervisor Reassignment | PC-12, PS-20 | Reassign students or groups when a Supervisor becomes unavailable and provide the new Supervisor with appropriate project access. |

**Dependencies and interactions**
- Workload monitoring depends on accurate assignment records.
- Workload enforcement depends on defined capacity rules.
- Reassignment must update project ownership and access permissions.
- The former Supervisor's post-reassignment access is not specified.

### E. Project workspace and lifecycle

**Primary actors: Student and Project Supervisor. Supporting actor: Project Coordinator.**

| ID | Feature | User stories | Purpose |
|---|---|---|---|
| F-28 | Project Workspace | ST-01, ST-02, PS-06 | Provide authorised Students and Supervisors access to their assigned project information and requirements. |
| F-29 | Milestone Configuration | PC-13, PS-07, ST-03 | Define project milestones, requirements and the expected workflow. |
| F-30 | Milestone Deadline Management | PC-14, PS-07, ST-03 | Set milestone deadlines and make them visible to Students and Supervisors. |
| F-31 | Project and Milestone Progress Monitoring | PC-15, PC-21, PS-08, ST-09, ST-21 | Display project and milestone progress at individual, group, Supervisor and programme levels. |
| F-32 | Milestone and Final Project Submission | ST-10, ST-11 | Allow Students to upload milestone documents and submit their consolidated final project. |
| F-33 | Submission Review and Approval | PS-09, PS-11, PS-12, PS-13, ST-12 | Enable Supervisors to review submissions, request revisions, approve satisfactory work and reject unsuitable work; expose submission status to Students. |
| F-34 | Submission Feedback and Discussion | PS-10, PS-16, ST-13, ST-22 | Attach academic feedback and Student–Supervisor discussions to specific project submissions. |
| F-35 | Document Version Management | PS-14, PS-15, ST-14, ST-15 | Preserve previous submission versions and allow Students and Supervisors to inspect and compare revisions. |

**Dependencies and interactions**
- Milestones and deadlines define the project workflow.
- Submission requires an applicable milestone or final-project requirement.
- Supervisor approval controls progression to the next milestone.
- Feedback and revision requests inform subsequent submissions.
- Revised submissions create new versions without deleting previous versions.
- Submission discussions remain attached to the relevant submission, not a general-purpose messaging system.

### F. Group collaboration

**Primary actor: Student. Supporting actors: Project Coordinator and Project Supervisor.**

| ID | Feature | User stories | Purpose |
|---|---|---|---|
| F-36 | Shared Group Workspace | ST-16 | Provide a common project workspace for authorised group members. |
| F-37 | Shared Document Management | ST-18 | Allow group members to upload, edit, view and manage shared project documents. |
| F-38 | Group Submission Tracking | ST-19 | Display the submission status of formal group project requirements. |
| F-39 | Individual Group Member Assessment (proposed) | PS-24 | Support individual assessment of group members if confirmed by the academic grading policy. |

**Dependencies and interactions**
- Group workspace access depends on group creation and membership.
- Shared document management depends on authorised group access and document storage.
- Formal group submissions remain restricted to designated submitters.
- F-39 is proposed, not confirmed; its applicability and method require a decision.

### G. Deadlines, extensions, late submissions and withdrawal

**Primary actors: Student, Project Supervisor and Project Coordinator.**

| ID | Feature | User stories | Purpose |
|---|---|---|---|
| F-40 | Deadline Reminder Management | PS-18, ST-24 | Remind Students and Supervisors about upcoming project deadlines. |
| F-41 | Overdue Submission Monitoring | PC-16, PS-18 | Identify overdue submissions and notify the relevant Supervisor and Coordinator. |
| F-42 | Deadline Extension Management | ST-25, ST-26, PS-19, PC-17 | Allow Students to request extensions, Supervisors to recommend or decline requests, and Coordinators to approve or reject them; expose request status to Students. |
| F-43 | Late Submission Recording | ST-27 | Automatically identify and record submissions made after applicable deadlines. |
| F-44 | Late Submission Penalty Management | PC-18, PC-19, ST-27 | Calculate late penalties using configured programme rules and allow justified Coordinator overrides. |
| F-45 | Project Withdrawal Management | ST-28, ST-29, PC-22 | Allow Students to request withdrawal and Coordinators to approve or reject requests. |

**Dependencies and interactions**
- Reminders and overdue detection depend on milestone deadlines.
- An approved extension must affect the applicable deadline.
- Late submission recording supplies information used by penalty calculation.
- A late submission remains possible and may affect grades.
- Withdrawal decisions must be reflected in the relevant project status.

### H. Examination and defence management

**Primary actor: Project Coordinator. Supporting actors: Project Examiner and Student.**

| ID | Feature | User stories | Purpose |
|---|---|---|---|
| F-46 | Project Examiner Appointment | PC-23 | Appoint eligible Examiners to projects for independent assessment. |
| F-47 | Examination Panel Configuration | PC-24 | Support projects with one or multiple assigned Examiners. |
| F-48 | Examiner Eligibility and Independence Enforcement | PC-25, PE-12, PE-13 | Prevent Supervisors from examining projects they supervised and restrict Examiners to assigned projects. |
| F-49 | Defence Scheduling | PC-28, PC-29, PE-03, ST-30 | Schedule and manage defence dates, times and venues, visible to assigned Examiners and Students. |
| F-50 | Examination Material Access | PE-01, PE-02 | Give Examiners access to their assigned projects, final submitted documents and relevant examination materials. |

**Dependencies and interactions**
- Examiner appointment precedes examination access.
- Panel configuration determines the number of Examiners assigned.
- Examiner independence rules must be enforced when assignments are made.
- Defence schedules must be available to relevant Students and Examiners.
- Examination materials must be restricted to authorised Examiners.

### I. Assessment and grading

**Primary actors: Project Coordinator, Project Supervisor and Project Examiner.**

| ID | Feature | User stories | Purpose |
|---|---|---|---|
| F-51 | Assessment Structure Configuration | PC-26 | Configure assessment categories, criteria, mark allocations, weightings and pass marks. |
| F-52 | Examiner Document Assessment | PE-04 | Enable Examiners to assess final project documents. |
| F-53 | Examiner Defence Assessment | PE-05 | Enable Examiners to assess Student defence presentations. |
| F-54 | Examiner Scoring and Feedback | PE-06, PE-07, PE-08 | Apply grading criteria, record scores and provide formal examination feedback. |
| F-55 | Examiner Assessment Submission and Editing | PE-09, PE-10, PE-11 | Submit assessments, edit them before result publication and track assessment status. |
| F-56 | Supervisor Performance Assessment | PS-21, PS-22, PS-23 | Evaluate Student performance and interaction during supervision and submit an independent performance grade. |
| F-57 | Assessment Completion Monitoring | PC-27, PC-30, PC-33 | Identify incomplete assessments and allow Coordinators to review submitted Examiner and Supervisor assessments. |
| F-58 | Final Assessment Consolidation | PC-30, PC-31 | Bring together Examiner and Supervisor assessments for Coordinator review and final result approval. |

**Dependencies and interactions**
- F-51 defines the grading structure used by Examiners and Supervisors.
- Examiner assessment and Supervisor performance assessment remain independent.
- The Supervisor assessment has a default allocation of 30 marks, subject to Coordinator configuration.
- Final consolidation depends on the required assessments being submitted.
- The method for consolidating multiple Examiner scores remains unresolved.

### J. Final results and project completion

**Primary actor: Project Coordinator. Supporting actor: Student.**

| ID | Feature | User stories | Purpose |
|---|---|---|---|
| F-59 | Final Result Approval | PC-31 | Allow Coordinators to approve final examination results before publication. |
| F-60 | Programme Result Publication | PC-32, ST-31 | Publish final project results after all programme results have been approved. |
| F-61 | Assessment Breakdown Access | ST-32 | Allow Students to view the published breakdown of Supervisor and Examiner assessments. |
| F-62 | Project Completion Tracking | ST-33 | Display whether a Student's project has fulfilled the required academic completion conditions. |
| F-63 | Incomplete Project Carry-Forward | SYS-18 | Carry incomplete projects into the subsequent academic session according to the established carry-forward rule. |

**Dependencies and interactions**
- Assessment completion and consolidation precede final result approval.
- Results must be approved before publication.
- Students access results and assessment breakdowns after publication.
- Project completion conditions must account for the applicable academic requirements.
- Carry-forward must preserve the required project continuity, subject to the unresolved session rules.

### K. Authentication, security and access control

**Supporting actor: Authentication service. Used by all human actors.**

| ID | Feature | User stories | Purpose |
|---|---|---|---|
| F-64 | User Authentication | SYS-01 | Verify user identities before granting access to Clario. |
| F-65 | Session Management | SYS-02 | Manage authenticated sessions and authentication state. |
| F-66 | Role and Scope-Based Access Control | SYS-03 | Enforce permissions according to institutional, programme, project and assignment boundaries. |

**Dependencies and interactions**
- Authentication precedes access to protected functionality.
- Access control must enforce institutional isolation and actor responsibilities.
- Supervisors and Examiners must only access their authorised projects.
- Students must only access their own projects or authorised group workspace.
- Institutional Admins and Platform Admins must respect academic confidentiality boundaries.

### L. Subscription payment processing

**Supporting actors: Payment gateway, webhook sender and Clario subscription service.**

| ID | Feature | User stories | Purpose |
|---|---|---|---|
| F-67 | Institutional Subscription Payment Processing | SYS-04 | Process payments made by institutions for their Clario subscriptions. |
| F-68 | Payment Event Reception | SYS-05 | Receive payment status events from the payment provider. |
| F-69 | Subscription Status Synchronisation | SYS-06 | Process verified payment events and update institutional subscription status. |
| F-70 | Subscription Access Enforcement | SYS-07 | Apply configured grace periods and access restrictions when subscriptions expire. |

**Dependencies and interactions**
- Payment processing generates payment events.
- Verified payment events update subscription status.
- Subscription status and grace-period rules determine institutional access restrictions.
- These features concern institutional subscriptions, not student project payments.

### M. Notification and communication infrastructure

**Supporting actors: Email service and notification service.**

| ID | Feature | User stories | Purpose |
|---|---|---|---|
| F-71 | Transactional Email Delivery | SYS-08 | Deliver transactional emails generated by Clario. |
| F-72 | In-App Notification Generation | SYS-09 | Generate notifications for relevant academic and administrative events. |
| F-73 | Notification Dispatch | SYS-10 | Deliver notifications through supported in-app and email channels. |
| F-74 | Overdue Submission Notifications | SYS-11 | Notify assigned Supervisors and Coordinators about overdue submissions. |
| F-75 | Academic Decision and Submission Notifications | SYS-12, PS-17, ST-23 | Notify Students about approvals and revision requests and Supervisors about new submissions. |

**Dependencies and interactions**
- Academic and administrative events trigger notifications.
- The scheduler supports deadline-related events.
- Notification dispatch uses the supported delivery channels.
- Confirmed MVP channels are in-app and email; push notifications and SMS are not included.

### N. Document storage and retrieval

**Supporting actor: File storage service.**

| ID | Feature | User stories | Purpose |
|---|---|---|---|
| F-76 | Secure Document Storage | SYS-13 | Securely store uploaded project documents. |
| F-77 | Authorised Document Retrieval | SYS-14 | Make project documents available only to users with appropriate permissions. |
| F-78 | Document Version Preservation | SYS-15 | Preserve previous submission versions when revised documents are uploaded. |

**Dependencies and interactions**
- Storage supports milestone, final-project and group document submissions.
- Retrieval must respect role and project access permissions.
- Version preservation supports the user-facing document version management capability.

### O. Scheduling and background processes

**Supporting actor: Scheduler and background processes.**

| ID | Feature | User stories | Purpose |
|---|---|---|---|
| F-79 | Deadline Reminder Scheduling | SYS-16 | Trigger reminders before milestone deadlines. |
| F-80 | Missed Deadline Detection | SYS-17 | Identify submissions that have passed their applicable deadlines and initiate late-submission processing. |
| F-81 | Academic Session Carry-Forward Processing | SYS-18 | Automatically carry incomplete projects into the next academic session. |

**Dependencies and interactions**
- Reminder scheduling supports deadline notifications.
- Missed deadline detection supports overdue monitoring and late-submission recording.
- Carry-forward processing supports incomplete project continuity.

### P. Audit and backup infrastructure

**Supporting actors: Audit process and backup process.**

| ID | Feature | User stories | Purpose |
|---|---|---|---|
| F-82 | Administrative Audit Logging | SYS-19 | Record important administrative activities for subsequent review. |
| F-83 | Data Backup and Recovery | SYS-20 | Maintain recoverable copies of platform data so information can be restored when necessary. |

**Scope restriction**
- Administrative audit logging is included.
- A general academic activity audit trail is not confirmed.
- Backup frequency, retention and recovery objectives remain unspecified.

## 3. Feature consolidation and duplication analysis

Related stories have been consolidated without removing their individual requirements.

| Area | Consolidation |
|---|---|
| Topic proposal and topic monitoring | Keep proposal, review and status tracking within F-20. |
| Project progress and submission status | Use shared project and milestone status information through F-31 and F-33. |
| Individual and group Supervisor assignment | Consolidate into F-24. |
| Deadline reminders and overdue notifications | Use one deadline event process supporting F-40, F-41 and F-74. |
| Extension requests and decisions | Consolidate into F-42 with actor-specific actions. |
| Submission review and feedback | Keep decisions in F-33 and submission discussions in F-34. |
| Document versions | F-35 is the user-facing capability; F-78 is the supporting storage responsibility. |
| Examiner document and defence assessment | Keep separate assessment components under the broader examiner assessment workflow. |
| Assessment monitoring and consolidation | F-57 monitors completion; F-58 prepares assessments for final approval. |
| Subscription payment lifecycle | F-67 through F-70 form one connected payment and access-control process. |
| Institutional academic structure | F-09 through F-12 are related entity-management capabilities. |
| Notification infrastructure | F-71 through F-75 share event generation and delivery responsibilities. |

**Do not merge these distinct responsibilities:**
- Topic approval and project allocation.
- Project supervision and project examination.
- Supervisor and Examiner grading.
- Group collaboration and formal group submission.
- Milestone approval and final result approval.
- Document storage and user-facing version history.

## 4. Missing requirements and clarification areas

The following are unresolved requirements from the discovery baseline. They must not be treated as confirmed behaviour.

### Priority 1 — Academic governance

| ID | Issue | Related features | Required clarification |
|---|---|---|---|
| GAP-01 | Multiple examiner grade consolidation | F-47, F-54, F-58 | Average scores, Coordinator-determined score or configurable method? |
| GAP-02 | Group project assessment | F-39, F-56 | How should individual contributions affect each member's grade? |
| GAP-03 | Supervisor assessment deadline | F-56, F-57 | When must Supervisors submit performance grades? |
| GAP-04 | Programme result publication | F-59, F-60 | Does one outstanding assessment block publication for the entire programme? |

### Priority 2 — Workflow rules

| ID | Issue | Related features | Required clarification |
|---|---|---|---|
| GAP-05 | Group membership changes | F-22, F-36 | Can membership change after initial allocation? |
| GAP-06 | Alternative topic acceptance | F-20 | How does a Student accept or reject an alternative topic? |
| GAP-07 | Incomplete project carry-forward | F-63, F-81 | How does automatic carry-forward interact with manual session setup? |
| GAP-08 | Supervisor workload limits | F-25, F-26 | What are the individual and group workload limits? |
| GAP-09 | Late submission policy | F-43, F-44 | What are the penalty calculation, limits and grace periods? |

### Priority 3 — Subscription rules

| ID | Issue | Related features | Required clarification |
|---|---|---|---|
| GAP-10 | Subscription restrictions | F-04, F-70 | Which permissions remain available during the grace period and after restrictions begin? |

### Additional implementation clarifications

| Area | Related features | Clarification needed |
|---|---|---|
| Group document editing | F-37 | Does editing mean shared file management or real-time collaborative editing? |
| Extension deadline changes | F-30, F-42 | How do approved extensions affect reminders and late penalties? |
| Supervisor reassignment | F-27 | Does the former Supervisor retain access after reassignment? |
| Topic notifications | F-20, F-75 | Which topic decisions trigger notifications? |
| Project completion | F-62 | What exact academic conditions determine completion? |
| Platform settings | F-06 | Which settings are global rather than institution-specific? |
| Platform support | F-07 | What minimum support request and resolution workflow is required? |
| Institutional oversight | F-17, F-18 | Which administrative project information is visible without exposing academic records? |
| Backup and recovery | F-83 | What backup frequency, retention and recovery objectives are required? |

## 5. Unnecessary complexity and scope controls

These capabilities are approved or proposed in the stories but need tighter definition to prevent unnecessary implementation complexity.

| Feature or area | Concern | Recommendation |
|---|---|---|
| Global Platform Configuration | No specific global settings have been identified. | Define required settings before implementation. |
| Platform Support Management | Could expand into a full customer-support ticketing system. | Define the minimum institutional support workflow. |
| Institutional Project Oversight | Could duplicate Coordinator monitoring or expose confidential records. | Restrict it to authorised administrative information. |
| Supervisor Workload Limits | Capacity rules are undefined. | Resolve workload calculations before enforcement. |
| Group Document Management | Could be interpreted as real-time collaborative editing. | Confirm whether shared file management is sufficient. |
| Project Completion Tracking | Completion conditions are undefined. | Establish explicit academic completion rules. |
| Backup and Recovery | Operational recovery requirements are unspecified. | Define recovery and retention requirements. |

### Explicitly outside the current scope

- Student project payment processing.
- Plagiarism and similarity checking.
- External Examiner accounts and workflows.
- General-purpose Student–Supervisor messaging.
- Coordinator intervention in routine Supervisor–Student discussions.
- General academic activity audit trails.
- Push notifications and SMS as confirmed MVP channels.

## 6. Recommended logical product modules

| Module | Features | Responsibility |
|---|---|---|
| Platform Administration | F-01–F-08 | Institutional onboarding and platform subscriptions. |
| Institutional Administration | F-09–F-18 | Academic structure, institutional users and oversight. |
| Project Administration | F-19–F-27 | Registration, topics, allocation, groups and supervision assignments. |
| Project Workspace | F-28–F-39 | Requirements, milestones, submissions, feedback, versions and collaboration. |
| Deadline and Exception Management | F-40–F-45 | Reminders, overdue submissions, extensions, penalties and withdrawals. |
| Examination Management | F-46–F-50 | Examiner appointments, panels, defence scheduling and examination access. |
| Assessment and Grading | F-51–F-58 | Grading structures, assessment and result preparation. |
| Results Management | F-59–F-63 | Approval, publication, assessment breakdown and carry-forward. |
| Platform Services | F-64–F-83 | Authentication, access control, payments, notifications, storage, scheduling, audit and backups. |

## 7. Strategic recommendations

1. Resolve the outstanding academic governance questions before finalising grading and results behaviour.
2. Preserve the distinction between administrative, supervisory and examination responsibilities.
3. Define project state transitions, particularly topic approval, milestone approval, examination and result publication.
4. Consolidate overlapping capabilities without losing user-story traceability.
5. Keep user-facing product features separate from supporting system services.
6. Classify features into MVP and subsequent releases only after validating their dependencies and outstanding requirements.
7. Do not introduce additional capabilities without a supporting user need.

## 8. Next phase

The recommended next deliverable is **Feature Acceptance Criteria**.

For each feature, define:
- Preconditions.
- Actor permissions.
- Expected behaviour.
- Business rules.
- Success conditions.
- Failure and exception conditions.
- Dependencies on other features.
- Traceability to the original user stories.

The feature catalogue is an organised extraction of the approved discovery baseline, not a fully validated development backlog. Outstanding decisions must remain open until confirmed.
