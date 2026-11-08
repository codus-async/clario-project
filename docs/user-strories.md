# Clario --- User Stories

**Product discovery specification**\
**Version:** 1.0\
**Status:** Discovery baseline --- outstanding decisions are identified
in Section 10.

## 1. Product scope

Clario manages the complete final-year project lifecycle within tertiary
institutions, from project topic proposal and allocation through
supervision, milestone submissions, defence, assessment and result
publication.

**Institutional hierarchy:** Institution → Faculty → Department →
Programme → Academic Session.

### Governing product boundaries

-   Each institution operates independently.
-   Coordinators are assigned to one programme and one academic session.
-   Projects may be individual or group-based.
-   Students propose their own project topics.
-   The Project Coordinator assigns supervisors after topic proposals
    are submitted.
-   Supervisors review topics and approve or reject project milestones.
-   Students cannot progress to the next milestone until the preceding
    milestone is approved.
-   Examiners independently assess final project documents and defence
    presentations.
-   Supervisors and Examiners have separate grading responsibilities.
-   The Coordinator approves final examination results and publishes
    them after all programme results have been approved.
-   Students do not make project-related payments through Clario.
-   Plagiarism and similarity checking are outside the current scope.
-   External Examiners are excluded from the current scope.

## 2. Platform Admin

**Scope:** Entire Clario platform.

### 2.1 Institutional management

**PA-01 --- Create institutions**\
As a Platform Admin, I want to create institutional accounts, so that
new tertiary institutions can onboard onto Clario.

**PA-02 --- Manage institutional accounts**\
As a Platform Admin, I want to activate, suspend and manage
institutional accounts, so that I can control access to the platform.

**PA-03 --- Monitor institutions**\
As a Platform Admin, I want to view institutional account information
and operational status, so that I can monitor platform-wide activity.

### 2.2 Subscription management

**PA-04 --- Manage subscription plans**\
As a Platform Admin, I want to create and manage subscription plans, so
that institutions can subscribe to appropriate service packages.

**PA-05 --- Manage institutional subscriptions**\
As a Platform Admin, I want to view and manage institutional
subscriptions, so that I can oversee subscription status and renewals.

**PA-06 --- Manage billing**\
As a Platform Admin, I want to manage institutional billing information,
so that subscription payments can be administered correctly.

**PA-07 --- Manage grace periods**\
As a Platform Admin, I want to configure subscription grace periods, so
that institutions have an appropriate period to resolve expired
subscriptions before access restrictions apply.

### 2.3 Platform operations

**PA-08 --- Manage platform administrators**\
As a Platform Admin, I want to create and manage other platform
administrators, so that platform responsibilities can be distributed
appropriately.

**PA-09 --- Configure platform settings**\
As a Platform Admin, I want to manage global platform settings, so that
Clario operates consistently across institutions.

**PA-10 --- Handle platform support**\
As a Platform Admin, I want to handle platform-level support requests,
so that institutional operational problems can be resolved.

**PA-11 --- Protect institutional academic information**\
As a Platform Admin, I want platform administration to operate without
unrestricted access to confidential institutional academic records, so
that institutional data remains protected.

## 3. Institutional Admin

**Scope:** One institution.

### 3.1 Institutional structure

**IA-01 --- Manage faculties**\
As an Institutional Admin, I want to create and manage faculties, so
that the institution's academic structure is represented in Clario.

**IA-02 --- Manage departments**\
As an Institutional Admin, I want to create and manage departments
within faculties, so that academic departments can administer their
programmes.

**IA-03 --- Manage programmes**\
As an Institutional Admin, I want to create and manage academic
programmes, so that project activities can be organised according to
institutional programmes.

**IA-04 --- Manage academic sessions**\
As an Institutional Admin, I want to create and manage academic
sessions, so that project activities can be organised by academic year
or session.

### 3.2 User administration

**IA-05 --- Register institutional users**\
As an Institutional Admin, I want to create and invite institutional
users, so that students, supervisors and other authorised personnel can
access Clario.

**IA-06 --- Update user records**\
As an Institutional Admin, I want to update institutional user
information, so that user records remain accurate.

**IA-07 --- Deactivate users**\
As an Institutional Admin, I want to deactivate institutional users, so
that people who should no longer access the institution's workspace
cannot continue using it.

**IA-08 --- Assign institutional roles**\
As an Institutional Admin, I want to assign roles and permissions to
institutional users, so that users can access only the functions
appropriate to their responsibilities.

### 3.3 Academic administration

**IA-09 --- Appoint Project Coordinators**\
As an Institutional Admin, I want to appoint Project Coordinators to
specific programmes and academic sessions, so that project
administration has clearly assigned responsibility.

**IA-10 --- Manage supervisor records**\
As an Institutional Admin, I want to create and maintain supervisor
records, so that Coordinators can assign eligible supervisors to
projects.

**IA-11 --- Oversee project administration**\
As an Institutional Admin, I want to monitor project administration
across the institution, so that I can maintain institutional oversight.

**IA-12 --- Maintain academic data confidentiality**\
As an Institutional Admin, I want to access administrative project
information without accessing confidential project documents or academic
feedback, so that administrative responsibilities remain separate from
academic supervision.

## 4. Project Coordinator

**Scope:** Assigned programme(s) within one department and one academic
session, with the confirmed assignment rule limited to one programme and
one session per Coordinator assignment.

### 4.1 Project and student management

**PC-01 --- Register project students**\
As a Project Coordinator, I want to register and manage student project
records, so that all participating students are accounted for within my
assigned programme and session.

**PC-02 --- Receive project topic proposals**\
As a Project Coordinator, I want to receive proposed project topics from
students, so that students can begin the project allocation process.

**PC-03 --- Assign supervisors after topic proposals**\
As a Project Coordinator, I want to assign supervisors to students or
groups after topic proposals have been submitted, so that each proposal
receives appropriate academic review.

**PC-04 --- Manage project assignments**\
As a Project Coordinator, I want to manage individual and group project
assignments, so that every student has a recognised project arrangement.

### 4.2 Group management

**PC-05 --- Create project groups**\
As a Project Coordinator, I want to create project groups and assign
students to them, so that collaborative projects can be managed as
shared academic activities.

**PC-06 --- Manage group membership**\
As a Project Coordinator, I want to manage the initial membership of
project groups, so that each group has clearly defined members.

**PC-07 --- Designate group submitters**\
As a Project Coordinator, I want to designate authorised group
submitters, so that formal project submissions are made by approved
group representatives.

**PC-08 --- Assign group supervisors**\
As a Project Coordinator, I want to assign supervisors to project
groups, so that collaborative projects receive appropriate academic
supervision.

### 4.3 Supervisor management

**PC-09 --- Assign individual supervisors**\
As a Project Coordinator, I want to assign supervisors to individual
students, so that each student has an assigned academic supervisor.

**PC-10 --- Monitor supervisor workloads**\
As a Project Coordinator, I want to view the number of students and
groups assigned to each supervisor, so that I can distribute supervision
responsibilities appropriately.

**PC-11 --- Enforce supervisor workload limits**\
As a Project Coordinator, I want to establish and enforce supervisor
workload limits, so that supervisors are not assigned more projects than
their permitted capacity.

**PC-12 --- Reassign supervisors**\
As a Project Coordinator, I want to reassign students or groups when a
supervisor becomes unavailable, so that project supervision can continue
without unnecessary interruption.

### 4.4 Milestones and deadlines

**PC-13 --- Define project milestones**\
As a Project Coordinator, I want to define project milestones and their
requirements, so that students and supervisors have a structured project
workflow.

**PC-14 --- Set milestone deadlines**\
As a Project Coordinator, I want to establish deadlines for project
milestones, so that students know when their submissions are expected.

**PC-15 --- Monitor milestone completion**\
As a Project Coordinator, I want to monitor milestone completion across
my programme, so that I can identify projects that are progressing or
falling behind.

**PC-16 --- Monitor overdue submissions**\
As a Project Coordinator, I want to receive notifications about overdue
submissions, so that I can monitor late project activities.

**PC-17 --- Decide deadline extensions**\
As a Project Coordinator, I want to approve or reject extension requests
following Supervisor recommendations, so that exceptional deadline
arrangements remain controlled.

### 4.5 Late submission management

**PC-18 --- Configure late submission penalties**\
As a Project Coordinator, I want to configure late submission penalty
rules, so that the effect of missed deadlines on student grades follows
the programme's grading policy.

**PC-19 --- Override late penalties**\
As a Project Coordinator, I want to override automatically calculated
late submission penalties where justified, so that exceptional
circumstances can be handled appropriately.

### 4.6 Topic and submission monitoring

**PC-20 --- Monitor topic approval**\
As a Project Coordinator, I want to monitor the approval status of
proposed project topics, so that I can identify students whose topics
have not yet been approved.

**PC-21 --- Monitor submission progress**\
As a Project Coordinator, I want to view project submissions, milestone
approvals and revision statuses, so that I can monitor the overall
progress of assigned projects.

### 4.7 Withdrawal management

**PC-22 --- Review withdrawal requests**\
As a Project Coordinator, I want to review student project withdrawal
requests, so that I can approve or reject requests based on the
circumstances.

### 4.8 Examination management

**PC-23 --- Appoint Project Examiners**\
As a Project Coordinator, I want to appoint one or more eligible Project
Examiners to projects, so that final project assessments can be
conducted independently of supervision.

**PC-24 --- Configure examination panels**\
As a Project Coordinator, I want to configure the number of examiners
assigned to a project, so that examination arrangements can accommodate
different panel structures.

**PC-25 --- Enforce examiner independence**\
As a Project Coordinator, I want examiner assignments to exclude
supervisors who supervised the same project, so that assessment remains
independent.

**PC-26 --- Configure grading structures**\
As a Project Coordinator, I want to configure assessment categories,
grading criteria, mark allocations, weightings and pass marks, so that
projects are assessed according to the programme's academic
requirements.

**PC-27 --- Monitor assessment completion**\
As a Project Coordinator, I want to monitor examiner and supervisor
assessment submissions, so that I can identify incomplete project
assessments.

### 4.9 Defence management

**PC-28 --- Schedule project defences**\
As a Project Coordinator, I want to schedule project defences with
dates, times and venues, so that students and examiners know when
examinations will take place.

**PC-29 --- Manage defence schedules**\
As a Project Coordinator, I want to update and manage defence schedules,
so that examination arrangements can be adjusted when necessary.

### 4.10 Final results

**PC-30 --- Review submitted assessments**\
As a Project Coordinator, I want to review completed examiner and
supervisor assessments, so that final project results can be checked
before publication.

**PC-31 --- Approve final results**\
As a Project Coordinator, I want to approve final examination results,
so that only authorised results proceed to publication.

**PC-32 --- Publish programme results**\
As a Project Coordinator, I want to publish final results after all
programme results have been approved, so that students receive their
official project assessment outcomes together.

**PC-33 --- Monitor programme assessment status**\
As a Project Coordinator, I want to view outstanding assessments and
unpublished results, so that I can ensure the programme's examination
process reaches completion.

## 5. Project Supervisor

**Scope:** Assigned students, individual projects and project groups.

### 5.1 Project topic review

**PS-01 --- Review proposed topics**\
As a Project Supervisor, I want to review project topics submitted by my
assigned students or groups, so that I can determine whether their
proposed topics are academically suitable.

**PS-02 --- Approve project topics**\
As a Project Supervisor, I want to approve suitable project topics, so
that students can proceed with their projects.

**PS-03 --- Reject project topics**\
As a Project Supervisor, I want to reject unsuitable project topics and
provide feedback, so that students understand why their proposals cannot
proceed.

**PS-04 --- Suggest alternative topics**\
As a Project Supervisor, I want to suggest alternative project topics,
so that students can consider more appropriate research directions.

**PS-05 --- Review revised proposals**\
As a Project Supervisor, I want to review revised topics submitted by
students, so that I can determine whether their changes address my
previous feedback.

### 5.2 Project supervision

**PS-06 --- View assigned projects**\
As a Project Supervisor, I want to view all students and groups assigned
to me, so that I can manage my supervision responsibilities.

**PS-07 --- Access project requirements**\
As a Project Supervisor, I want to view project milestones, requirements
and deadlines, so that I can guide students according to the programme's
expectations.

**PS-08 --- Monitor project progress**\
As a Project Supervisor, I want to monitor the progress of assigned
students and groups, so that I can identify projects requiring
attention.

### 5.3 Submission review and approval

**PS-09 --- Review submissions**\
As a Project Supervisor, I want to review documents submitted by my
assigned students or groups, so that I can assess their academic
progress.

**PS-10 --- Provide submission feedback**\
As a Project Supervisor, I want to provide comments and feedback
directly on project submissions, so that students understand what needs
improvement.

**PS-11 --- Request revisions**\
As a Project Supervisor, I want to request revisions to unsatisfactory
submissions, so that students can address identified problems before
progressing.

**PS-12 --- Approve submissions**\
As a Project Supervisor, I want to approve satisfactory milestone
submissions, so that students can proceed to subsequent project
milestones.

**PS-13 --- Reject submissions**\
As a Project Supervisor, I want to reject submissions that do not
satisfy milestone requirements, so that students cannot progress with
academically inadequate work.

**PS-14 --- Review resubmissions**\
As a Project Supervisor, I want to compare revised submissions with
previous versions, so that I can verify whether students have addressed
my feedback.

**PS-15 --- Access version history**\
As a Project Supervisor, I want to access previous document versions, so
that I can track changes made throughout project development.

### 5.4 Communication

**PS-16 --- Discuss submissions**\
As a Project Supervisor, I want to exchange comments with students
within specific project submissions, so that academic discussions remain
connected to the relevant work.

**PS-17 --- Receive submission notifications**\
As a Project Supervisor, I want to receive in-app and email
notifications when assigned students submit documents, so that I can
review their work promptly.

**PS-18 --- Receive deadline notifications**\
As a Project Supervisor, I want to receive reminders about upcoming and
overdue student submissions, so that I can monitor submission schedules.

### 5.5 Extensions and exceptional situations

**PS-19 --- Recommend deadline extensions**\
As a Project Supervisor, I want to recommend or decline student deadline
extension requests, so that the Coordinator can make an informed
decision.

**PS-20 --- Continue supervision after reassignment**\
As a Project Supervisor, I want to access projects assigned to me
following a supervisor reassignment, so that I can continue their
academic guidance.

### 5.6 Supervisor assessment

**PS-21 --- Assess student performance**\
As a Project Supervisor, I want to evaluate each student's performance
throughout the project, so that their effort and participation in the
supervision process contribute to their final grade.

**PS-22 --- Assess student interaction**\
As a Project Supervisor, I want to evaluate students' interactions and
engagement during supervision, so that their academic commitment is
reflected in the assessment.

**PS-23 --- Submit supervisor grades**\
As a Project Supervisor, I want to submit my independent performance
assessment before final result compilation, so that my contribution is
included in the student's final result.

**PS-24 --- Assess group members individually (proposed)**\
As a Project Supervisor, I want to assess individual members of a
project group, so that each student's performance receives an
appropriate assessment.

*PS-24 is a proposed requirement arising from the individual performance
grading model. Its applicability to group projects needs confirmation.*

## 6. Student

**Scope:** Own individual project or authorised group workspace.

### 6.1 Project onboarding

**ST-01 --- Access project workspace**\
As a Student, I want to access my assigned project workspace, so that I
can manage my project activities in one place.

**ST-02 --- View project requirements**\
As a Student, I want to view project requirements, guidelines and
expectations, so that I understand what is required to complete my
project.

**ST-03 --- View project milestones**\
As a Student, I want to view my project milestones and deadlines, so
that I can organise my work according to the expected project schedule.

### 6.2 Topic proposal

**ST-04 --- Propose project topics**\
As a Student, I want to submit my proposed project topic, so that I can
pursue a research subject of my choice.

**ST-05 --- Track topic approval**\
As a Student, I want to view the approval status of my proposed topic,
so that I know whether I can proceed with my research.

**ST-06 --- Understand topic rejection**\
As a Student, I want to view feedback when my proposed topic is
rejected, so that I understand what needs to change.

**ST-07 --- Submit revised topics**\
As a Student, I want to submit revised project topics, so that I can
address my Supervisor's concerns.

**ST-08 --- Consider alternative topics**\
As a Student, I want to review alternative topics suggested by my
Supervisor, so that I can decide whether to accept an alternative
research direction.

### 6.3 Project execution and submission

**ST-09 --- Work on project milestones**\
As a Student, I want to complete project activities according to the
defined milestones, so that I can progress systematically towards
project completion.

**ST-10 --- Upload milestone documents**\
As a Student, I want to upload the required project documents for each
milestone, so that my Supervisor can review my work.

**ST-11 --- Submit final project**\
As a Student, I want to submit my consolidated final project document,
so that my completed work can proceed to examination.

**ST-12 --- Track submission status**\
As a Student, I want to view the status of my submissions, so that I
know whether they are awaiting review, approved or require revision.

**ST-13 --- View Supervisor feedback**\
As a Student, I want to access feedback attached to my submissions, so
that I understand the changes required.

**ST-14 --- Resubmit revised documents**\
As a Student, I want to upload revised document versions after receiving
feedback, so that I can address the Supervisor's requirements.

**ST-15 --- Access document version history**\
As a Student, I want to view previous versions of my submissions, so
that I can track my document development and recover earlier work when
necessary.

### 6.4 Group collaboration

**ST-16 --- Access group workspace**\
As a Student assigned to a group project, I want to access a shared
group workspace, so that I can collaborate with my fellow group members.

**ST-17 --- View group members**\
As a Student, I want to view the members of my assigned project group,
so that I know who is participating in the project.

**ST-18 --- Manage shared documents**\
As a Student, I want to upload, edit, view and manage shared project
documents, so that group members can collaborate on their work.

**ST-19 --- View group submission status**\
As a Student, I want to view the submission status of my group, so that
I know whether the group's formal project requirements have been
fulfilled.

**ST-20 --- Submit on behalf of a group**\
As a designated group submitter, I want to submit project documents on
behalf of my group, so that formal submissions can be made through an
authorised representative.

**ST-21 --- Track group project progress**\
As a Student, I want to monitor the progress of my group's project
milestones, so that I can understand how the group is progressing.

### 6.5 Communication and feedback

**ST-22 --- Discuss project submissions**\
As a Student, I want to comment on and discuss my project submissions
with my Supervisor, so that I can receive clarification and guidance
about my work.

**ST-23 --- Receive feedback notifications**\
As a Student, I want to receive notifications when my Supervisor
approves a submission or requests revisions, so that I can respond
promptly.

### 6.6 Deadlines and exceptional situations

**ST-24 --- Receive deadline reminders**\
As a Student, I want to receive in-app and email reminders about
upcoming project deadlines, so that I can submit my work on time.

**ST-25 --- Request deadline extensions**\
As a Student, I want to request an extension for a project milestone, so
that I can explain circumstances preventing me from meeting the original
deadline.

**ST-26 --- Track extension requests**\
As a Student, I want to view the status and decision on my extension
requests, so that I know whether additional time has been granted.

**ST-27 --- Understand late submission penalties**\
As a Student, I want to see when a submission is marked late and
understand its grading consequences, so that I know how missed deadlines
affect my assessment.

**ST-28 --- Request project withdrawal**\
As a Student, I want to request withdrawal from my project, so that I
can formally communicate my inability or decision not to continue.

**ST-29 --- Track withdrawal decisions**\
As a Student, I want to view the status of my withdrawal request, so
that I know whether it has been approved or rejected.

### 6.7 Examination and results

**ST-30 --- View defence schedules**\
As a Student, I want to view my project defence date, time and venue, so
that I can prepare for my examination.

**ST-31 --- View final assessment results**\
As a Student, I want to access my published final project results, so
that I know the outcome of my project assessment.

**ST-32 --- View assessment breakdown**\
As a Student, I want to view the published breakdown of my supervisor
and examiner assessments, so that I understand how my final grade was
determined.

**ST-33 --- Track project completion**\
As a Student, I want to view the completion status of my project, so
that I know whether all academic requirements have been fulfilled.

## 7. Project Examiner

**Scope:** Projects specifically assigned for assessment.

### 7.1 Examination assignments

**PE-01 --- View assigned projects**\
As a Project Examiner, I want to view projects assigned to me, so that I
can identify the projects I am responsible for assessing.

**PE-02 --- Access examination materials**\
As a Project Examiner, I want to access the final submitted project
documents and relevant examination materials, so that I can prepare for
assessment.

**PE-03 --- View defence schedules**\
As a Project Examiner, I want to view assigned project defence
schedules, so that I can attend examinations at the designated times and
venues.

### 7.2 Project assessment

**PE-04 --- Review final projects**\
As a Project Examiner, I want to review assigned final project
documents, so that I can evaluate the quality of the completed research.

**PE-05 --- Assess defence presentations**\
As a Project Examiner, I want to evaluate student defence presentations,
so that I can assess their ability to explain and defend their research.

**PE-06 --- Apply grading criteria**\
As a Project Examiner, I want to assess projects against predefined
grading criteria, so that examinations follow an established academic
standard.

**PE-07 --- Record assessment scores**\
As a Project Examiner, I want to record scores against the applicable
assessment criteria, so that the student's examination performance is
formally documented.

**PE-08 --- Provide examination feedback**\
As a Project Examiner, I want to record formal assessment feedback, so
that students and the institution have a documented explanation of the
examination outcome.

### 7.3 Assessment submission

**PE-09 --- Submit examination assessments**\
As a Project Examiner, I want to submit my completed assessment, so that
my examination results can be considered during final result
compilation.

**PE-10 --- Edit submitted assessments**\
As a Project Examiner, I want to edit my submitted assessment before the
Coordinator publishes final results, so that I can correct errors or
update an assessment when necessary.

**PE-11 --- View assessment status**\
As a Project Examiner, I want to know whether my assessment is pending,
submitted or published, so that I can track my examination
responsibilities.

### 7.4 Assessment independence

**PE-12 --- Access only assigned projects**\
As a Project Examiner, I want to access only projects assigned to me for
examination, so that assessment access remains restricted to authorised
responsibilities.

**PE-13 --- Maintain assessment independence**\
As a Project Examiner, I want to assess projects independently of their
supervision activities, so that my examination decisions are not
influenced by an inappropriate supervisory role.

## 8. Supporting system actors and automated interactions

These are system responsibilities, not human user stories.

### 8.1 Authentication service

**SYS-01 --- Authenticate users**\
The authentication service must verify user identities before granting
access to Clario.

**SYS-02 --- Manage sessions**\
The authentication service must manage user sessions and authentication
state.

**SYS-03 --- Enforce authorised access**\
Clario must enforce permissions according to institutional, programme,
project and assignment scope.

### 8.2 Payment gateway and webhook

**SYS-04 --- Process subscription payments**\
The payment gateway must process institutional subscription payments.

**SYS-05 --- Receive payment events**\
The webhook sender must deliver payment status events to Clario.

**SYS-06 --- Update subscription status**\
Clario must process verified payment events and update the relevant
institutional subscription status.

**SYS-07 --- Apply subscription restrictions**\
Clario must enforce configured grace periods and subsequent access
restrictions when institutional subscriptions expire.

### 8.3 Email and notification services

**SYS-08 --- Deliver email notifications**\
The email service must deliver transactional emails to users.

**SYS-09 --- Generate in-app notifications**\
Clario must generate notifications for relevant project and
administrative events.

**SYS-10 --- Dispatch notifications**\
The notification process must deliver notifications through the
supported in-app and email channels.

**SYS-11 --- Notify about overdue submissions**\
The scheduler and notification process must identify overdue submissions
and notify the assigned Supervisor and Project Coordinator.

**SYS-12 --- Notify about academic decisions**\
Clario must notify students when their submissions are approved or
returned for revision.

*Push notifications and SMS are not included in the confirmed MVP
notification channels.*

### 8.4 File storage service

**SYS-13 --- Store project documents**\
The file storage service must securely store uploaded project documents.

**SYS-14 --- Retrieve project documents**\
The file storage service must make authorised project documents
available to users according to their permissions.

**SYS-15 --- Preserve document versions**\
Clario must preserve previous submission versions when students upload
revised documents.

### 8.5 Scheduler and background processes

**SYS-16 --- Schedule deadline reminders**\
The scheduler must trigger reminders before project milestone deadlines.

**SYS-17 --- Detect missed deadlines**\
The scheduler must identify submissions that have passed their deadlines
and initiate the late-submission workflow.

**SYS-18 --- Process incomplete project carry-forward**\
Clario must carry incomplete projects into the subsequent academic
session according to the confirmed carry-forward decision.

### 8.6 Audit process

**SYS-19 --- Record administrative activities**\
The audit process must record important administrative actions so that
institutional and platform administration can be reviewed.

### 8.7 Backup process

**SYS-20 --- Maintain recoverable data**\
The backup process must maintain recoverable copies of platform data so
that information can be restored when necessary.

## 9. Cross-cutting business rules

  -----------------------------------------------------------------------
  ID                                  Business rule
  ----------------------------------- -----------------------------------
  BR-01                               Every institution operates within
                                      its own institutional boundary.

  BR-02                               Users can only access information
                                      within their authorised scope.

  BR-03                               A Coordinator manages one programme
                                      and one academic session per
                                      assignment.

  BR-04                               Students propose project topics
                                      before supervisor assignment.

  BR-05                               Coordinators assign supervisors
                                      after topic proposals are
                                      submitted.

  BR-06                               Projects can be individual or
                                      group-based.

  BR-07                               Coordinators create groups and
                                      assign their members.

  BR-08                               Only designated group submitters
                                      can make formal group submissions.

  BR-09                               Supervisors approve or reject
                                      milestone submissions.

  BR-10                               Students cannot progress to the
                                      next milestone until the preceding
                                      milestone is approved.

  BR-11                               Revised submissions create new
                                      versions without deleting previous
                                      versions.

  BR-12                               Missed deadlines are automatically
                                      recorded as late.

  BR-13                               Late submissions remain possible
                                      and can affect grades.

  BR-14                               Late penalties follow configured
                                      rules, subject to Coordinator
                                      override.

  BR-15                               Deadline extensions require
                                      Supervisor recommendation and
                                      Coordinator approval.

  BR-16                               Supervisors cannot examine projects
                                      they supervised.

  BR-17                               Supervisor assessment and Examiner
                                      assessment are independent.

  BR-18                               Supervisor performance assessment
                                      has a default allocation of 30
                                      marks, subject to Coordinator
                                      configuration.

  BR-19                               Coordinators configure grading
                                      categories, criteria, weightings
                                      and pass marks.

  BR-20                               Examination panels can contain one
                                      or multiple examiners.

  BR-21                               Examiners can edit submitted
                                      assessments until the Coordinator
                                      publishes results.

  BR-22                               The Coordinator approves final
                                      examination results.

  BR-23                               Final results are published after
                                      all programme results have been
                                      approved.

  BR-24                               Incomplete projects automatically
                                      carry forward to the next academic
                                      session.

  BR-25                               Institutional Admins cannot access
                                      confidential project documents or
                                      academic feedback.

  BR-26                               Coordinators do not intervene in
                                      routine Supervisor--Student
                                      interactions.

  BR-27                               Student--Supervisor discussions are
                                      attached to project submissions,
                                      not general-purpose messaging.

  BR-28                               Administrative audit logging is
                                      within scope; a general academic
                                      activity audit trail is not
                                      confirmed.

  BR-29                               Subscription payments are
                                      institutional payments, not student
                                      project payments.

  BR-30                               Plagiarism and similarity checking
                                      are outside the current product
                                      scope.
  -----------------------------------------------------------------------

## 10. Outstanding requirements and gaps

The following points were not fully resolved during discovery. They must
remain open rather than being treated as confirmed requirements.

### Priority 1 --- Academic governance

**GAP-01 --- Multiple examiner grade consolidation**\
When a project has multiple examiners, how are their scores combined? -
Average of all examiner scores. - Coordinator determines the final
consolidated score. - Configurable examination-panel grading method.

**GAP-02 --- Supervisor grading for group projects**\
The Supervisor assesses each student's performance individually. The
exact method for assessing individual contributions within a shared
group project remains undefined.

**GAP-03 --- Supervisor assessment deadline**\
The deadline for Supervisors to submit performance grades relative to
examination and final result compilation has not been established.

**GAP-04 --- Programme result publication**\
Results are published after all programme results have been approved.
The handling of an outstanding assessment that delays the entire
programme's publication needs clarification.

### Priority 2 --- Workflow rules

**GAP-05 --- Group membership changes**\
The current interpretation is that group membership is fixed after
initial allocation. No student-initiated group transfer or
membership-change workflow is included.

**GAP-06 --- Alternative topic acceptance**\
When a Supervisor proposes an alternative topic, the student's
acceptance or rejection process needs a defined outcome.

**GAP-07 --- Incomplete project carry-forward**\
Incomplete projects automatically carry forward into the next session,
while new academic sessions require manual project-record creation. The
relationship between automatic carry-forward and manual session setup
needs to be defined.

**GAP-08 --- Supervisor workload limits**\
Workload limits are enforceable, but the actual limits and whether they
differ between individual and group projects remain undefined.

**GAP-09 --- Late submission policy**\
Penalties are configurable, but the exact calculation method, penalty
limits and applicable grace periods remain undefined.

**GAP-10 --- Subscription restrictions**\
The grace period is configurable, but the precise permissions available
during the grace period and after restrictions begin remain undefined.

## 11. Product management notes

The discovery establishes several important product distinctions:

1.  **Topic approval is separate from project allocation.** Students
    propose topics, Coordinators assign Supervisors, and Supervisors
    decide whether topics are academically suitable.
2.  **Supervision is separate from examination.** Supervisors guide
    students and assess their performance, while independent Examiners
    assess submitted projects and defence presentations.
3.  **Milestone approval controls progression.** Students cannot proceed
    until the Supervisor approves the preceding milestone.
4.  **Group collaboration is distinct from formal submission.** All
    members collaborate, but designated members submit on behalf of the
    group.
5.  **Grading is configurable.** Coordinators control the grading
    structure, including the Supervisor's default 30-mark allocation.
6.  **Result publication is centrally controlled.** The Coordinator
    approves results and publishes them after programme-level approval
    is complete.

### Recommended next phase

Proceed to acceptance criteria and feature extraction.

1.  **Acceptance Criteria:** Define the conditions each user story must
    satisfy.
2.  **Feature Extraction:** Translate validated user stories into
    concrete product capabilities.
3.  **MVP Classification:** Separate essential MVP functionality from
    subsequent releases.

The catalogue is a consolidated discovery baseline, not yet a fully
validated development backlog. The outstanding gaps should remain
visible during subsequent planning.
