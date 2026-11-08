# Clario --- Actor Register

## Product context

Clario is a multi-tenant SaaS platform for managing the complete
final-year project lifecycle in tertiary institutions, from project
allocation and supervision through submission, defence, assessment and
grading.

**Institutional hierarchy:** Institution → Faculty → Department →
Programme → Academic Session.

## 1. Human actors

### 1. Platform Admin

**Scope:** Entire Clario platform.

-   Creates, activates, suspends and manages institutional tenants.
-   Manages subscription plans, institutional subscriptions and platform
    billing.
-   Manages platform administrators and global settings.
-   Monitors platform-wide operations and handles platform-level
    support.
-   Does not have unrestricted access to confidential institutional
    academic records by default.

### 2. Institutional Admin

**Scope:** One institution.

-   Creates and manages faculties, departments, programmes and academic
    sessions.
-   Creates, invites, updates and deactivates institutional users.
-   Assigns institutional roles and manages access.
-   Appoints Project Coordinators to specific programmes.
-   Manages supervisor records and institutional settings.
-   Oversees project administration across the institution.

### 3. Project Coordinator

**Scope:** Assigned programme(s) within a department and academic
session.

-   Registers and manages projects and student project records.
-   Allocates students to individual projects or groups.
-   Creates groups, manages membership and designates group submitters.
-   Assigns supervisors to individual students or project groups.
-   Defines project milestones, requirements and deadlines.
-   Monitors submissions, approvals and project progress.
-   Appoints eligible Project Examiners to projects.
-   Schedules and manages project defences, including dates, times and
    venues.
-   Monitors assessment completion and programme-level project activity.

### 4. Project Supervisor

**Scope:** Assigned students, projects and groups.

-   Guides students through project development.
-   Reviews proposals, chapters and final submissions.
-   Provides feedback and requests revisions.
-   Approves or rejects submissions where authorised.
-   Monitors milestones, deadlines and project progress.
-   Communicates with assigned students and groups.
-   Views relevant submission, feedback and version history.

### 5. Student

**Scope:** Own individual project or authorised group workspace.

-   Accesses project requirements, milestones and deadlines.
-   Completes project activities and submits required documents.
-   Views submission status, feedback and version history.
-   Collaborates with group members where applicable.
-   Participates in group submissions; designated members may submit on
    behalf of the group.
-   Communicates with assigned supervisors.
-   Views defence schedules and published assessment results.

### 6. Project Examiner

**Scope:** Projects specifically assigned for assessment.

-   Independently evaluates assigned final-year projects.
-   Reviews final documents and assesses defence presentations.
-   Scores projects against assessment criteria.
-   Records grades and formal assessment feedback.
-   Submits assessment outcomes through the prescribed process.

**Appointment authority:** Project Coordinator.\
**Boundary:** Examiners cannot modify student submissions or supervisor
feedback, and cannot assess unassigned projects.

## 2. External and automated actors

  -----------------------------------------------------------------------
  Actor                               Responsibility
  ----------------------------------- -----------------------------------
  Authentication service              Authenticates users and manages
                                      identity sessions.

  Payment gateway                     Processes institutional
                                      subscription payments.

  Payment event/webhook sender        Sends payment status events to
                                      Clario.

  Email service                       Delivers transactional emails and
                                      notifications.

  Push notification service           Delivers mobile push notifications.

  SMS service                         Delivers SMS notifications, if
                                      enabled.

  File storage service                Stores project documents and
                                      uploaded files.

  Notification process                Dispatches notifications triggered
                                      by Clario events.

  Scheduler/background process        Runs scheduled tasks and deadline
                                      reminders.

  Audit process                       Records important user and system
                                      activities.

  Backup process                      Maintains recoverable copies of
                                      data.
  -----------------------------------------------------------------------

These supporting systems and processes are not human application roles.
Their access should be restricted to the tasks they are authorised to
perform.

## 3. Confirmed product boundaries

-   Clario supports both individual and group projects.
-   Supervisors can be assigned to individual students or project
    groups.
-   The Project Coordinator appoints Project Examiners.
-   The Project Coordinator schedules project defences.
-   Project assessment is conducted independently of supervision.
-   Payments are limited to institutional SaaS subscriptions; students
    do not make project payments through Clario.
-   Plagiarism and similarity checking are outside Clario's scope.
-   Platform-wide administration and institution-level administration
    are separate responsibilities.
-   Users' access is restricted by their institutional, programme,
    project or assignment scope.

## 4. Open access and governance decisions

The following policies still require confirmation:

1.  Who formally approves and publishes final examination results?
2.  Can a supervisor examine a project they supervised?
3.  Can one coordinator manage multiple programmes or academic sessions?
4.  Can students request changes to project groups or supervisors?
5.  What level of project-record access should Institutional Admins
    have?
6.  Should external examiners be supported as a distinct category of
    Project Examiner?
