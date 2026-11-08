# Clario — Non-Functional Requirements Specification

**Document:** Non-Functional Requirements (NFR)  
**Version:** 1.0  
**Status:** Discovery baseline established; detailed validation required  
**Product:** Clario — Multi-tenant Final-Year Project Management SaaS  
**Initial regulatory jurisdiction:** Nigeria  
**Future scope:** International expansion

---

## 1. Purpose and scope

This document defines the quality attributes, operational constraints, security requirements, data-protection requirements and technical behaviour that must govern Clario.

It covers:

1. Security and access control.
2. Privacy and data protection.
3. Reliability and availability.
4. Performance and scalability.
5. Usability and accessibility.
6. Data integrity and consistency.
7. Auditability and accountability.
8. Backup, recovery and data retention.
9. Regulatory considerations.
10. Domain-specific constraints.

### Requirement classification

- **Confirmed:** Explicitly selected during product discovery.
- **Recommended:** A proposed implementation safeguard that still requires formal approval.
- **Open:** A decision for which an exact value or operating rule has not yet been established.
- **Legal validation:** Requires review against applicable legislation and regulatory guidance.

## 2. Security requirements

### NFR-SEC: Authentication and identity

| ID | Requirement | Priority |
|---|---|---|
| SEC-01 | Clario MUST authenticate users before granting access to protected functionality. | Critical |
| SEC-02 | Passwords MUST contain at least 12 characters. | High |
| SEC-03 | Clario MUST screen passwords against known compromised-password lists. | High |
| SEC-04 | Login attempts MUST be rate-limited. | High |
| SEC-05 | Clario MUST apply adaptive protection against suspicious login activity, including temporary lockouts where appropriate. | High |
| SEC-06 | MFA MUST be mandatory for Platform Admins, Institutional Admins and Project Coordinators. | Critical |
| SEC-07 | Session inactivity timeouts MUST be configurable according to user role. | High |
| SEC-08 | Account recovery MUST support email-based password recovery, with Institutional Admin assistance where necessary. | High |

**Additional constraints:**
- MFA is not currently mandatory for Students, Supervisors or Examiners.
- Exact session timeout durations remain open.
- Permanent account lockouts should be avoided to prevent denial-of-service against legitimate users.

### NFR-SEC: Authorization and institutional isolation

| ID | Requirement | Priority |
|---|---|---|
| SEC-09 | Clario MUST enforce strict institutional data isolation. | Critical |
| SEC-10 | Users MUST only access information within their authorised institutional, programme, project and assignment scope. | Critical |
| SEC-11 | Students MUST only access their own projects or authorised group workspaces. | Critical |
| SEC-12 | Supervisors MUST only access projects and students assigned to them. | Critical |
| SEC-13 | Examiners MUST only access projects specifically assigned for examination. | Critical |
| SEC-14 | Institutional Admins MUST NOT access confidential project documents or academic feedback. | Critical |
| SEC-15 | Platform Admins MUST NOT have unrestricted default access to institutional academic records. | Critical |
| SEC-16 | Authorised Platform Admin support access to institutional data MUST be restricted and recorded in audit logs. | Critical |

### NFR-SEC: Encryption and information protection

| ID | Requirement | Priority |
|---|---|---|
| SEC-17 | Data MUST be encrypted during transmission. | Critical |
| SEC-18 | Stored data MUST be encrypted at rest. | Critical |
| SEC-19 | Encryption at rest MUST cover academic documents, personal information and backups. | Critical |
| SEC-20 | Clario MUST protect stored credentials and authentication secrets against unauthorised disclosure. | Critical |

**Open technical specification:** Exact encryption algorithms, key-management controls, key rotation intervals and secret-management procedures must be established before implementation.

### NFR-SEC: File security

- Maximum individual upload size: **50 MB**.
- Accepted formats: PDF, DOC, DOCX, PPT and PPTX.
- File extensions alone MUST NOT be treated as proof of file type.
- Recommended: validate actual file content and scan uploads for malicious content before making them available to other users.
- Documents MUST only be retrievable by authorised users.

## 3. Privacy and data protection requirements

### NFR-PRV: Data ownership and responsibilities

| ID | Requirement |
|---|---|
| PRV-01 | Each institution MUST act as the Data Controller for its institutional academic data. |
| PRV-02 | Clario MUST act as the Data Processor when processing institutional academic data on behalf of an institution. |
| PRV-03 | Clario MUST define its independent Data Controller responsibilities for platform administration, billing and other data processed for its own purposes. |
| PRV-04 | Institutional and platform responsibilities MUST be documented in appropriate data-processing agreements. |
| PRV-05 | Personal data MUST only be collected and processed for defined, legitimate purposes. |
| PRV-06 | Personal data collection MUST be limited to what is necessary for those purposes. |
| PRV-07 | Access to personal data MUST be restricted according to authorised responsibilities. |

### NFR-PRV: Data-subject rights

Clario MUST support workflows for:

- Access to personal information.
- Correction of inaccurate information.
- Requests for deletion or erasure.
- Restriction or objection to processing where applicable.
- Data portability and institutional data export.
- Appropriate handling of consent withdrawal where consent is the applicable lawful basis.

Deletion requests MUST be reviewed against applicable legal obligations and academic-record retention requirements. A request MUST NOT automatically delete an academic record that is legally required to be preserved.

### NFR-PRV: Students under 18

- Clario MUST support students below 18 years of age.
- An in-platform parental or guardian consent and verification process MUST be available where legally required.
- Institutions MUST have oversight of the applicable consent process.
- Age and consent verification MUST be handled using appropriate mechanisms.
- The applicable lawful basis for processing MUST be established; parental consent must not be assumed to be the lawful basis for every educational processing activity.

### NFR-PRV: International data transfers

- Nigeria is the preferred hosting location.
- International hosting is permitted.
- International transfers of institutional personal data require institutional approval under the agreed product policy.
- Applicable statutory transfer conditions and recognised safeguards MUST also be satisfied.
- The legal basis and applicable safeguards for each transfer MUST be documented.

**Important:** Institutional approval alone does not make an international transfer lawful. The Nigeria Data Protection Act establishes requirements for adequate protection and other permitted transfer grounds. See Sections 41–43.

## 4. Reliability and availability requirements

### NFR-REL: Availability

| ID | Requirement | Target |
|---|---|---|
| REL-01 | Clario MUST achieve its agreed monthly service availability target. | 99.5% |
| REL-02 | Clario MUST monitor service availability continuously. | Continuous monitoring |
| REL-03 | Planned maintenance MUST use scheduled maintenance windows. | Required |
| REL-04 | Affected institutions MUST receive advance maintenance notifications. | Required |
| REL-05 | Emergency maintenance MUST follow a documented procedure. | Required |

The MVP target of 99.5% monthly availability permits approximately 3 hours and 36 minutes of downtime in a 30-day month.

The exact uptime measurement method, permitted exclusions and service-credit arrangements remain open.

### NFR-REL: Disaster recovery

| ID | Requirement | Target |
|---|---|---|
| REL-06 | Clario MUST maintain recoverable backups. | Hourly |
| REL-07 | Maximum acceptable data loss following a recoverable incident MUST NOT exceed the RPO. | 1 hour |
| REL-08 | Clario MUST restore service within the agreed RTO following a qualifying disaster. | 4 hours |
| REL-09 | Backup restoration MUST be tested periodically. | Frequency to be defined |
| REL-10 | Backup failures MUST generate operational alerts. | Required |

**Recovery objectives:**

- RPO: 1 hour.
- RTO: 4 hours.
- Routine backup retention: 30 days.

### NFR-REL: Background processes

Clario MUST monitor and manage scheduled processes responsible for:

- Deadline reminders.
- Missed-deadline detection.
- Late-submission workflows.
- Incomplete project carry-forward.
- Notification dispatch.
- Backup operations.
- Other approved background processing.

A failure in a background process MUST be detectable and recoverable without silently losing the underlying academic event.

## 5. Performance and scalability requirements

### NFR-PER: Performance

| ID | Requirement | Target |
|---|---|---|
| PER-01 | Normal interactive operations MUST complete within the agreed response-time target. | Under 2 seconds |
| PER-02 | Uploads and downloads MUST be measured separately from normal interactive requests. | Separate targets required |
| PER-03 | Background processing MUST NOT unnecessarily block normal user interactions. | Required |
| PER-04 | System performance MUST be monitored. | Continuous monitoring |

The two-second target applies to normal interactive operations, not necessarily large file transfers, report generation or background jobs.

**Open:** The exact measurement percentile, tested network conditions and list of operations covered by the two-second target must be defined.

### NFR-SCA: Launch capacity

| ID | Requirement | Target |
|---|---|---|
| SCA-01 | Clario MUST support 5–20 institutions at launch. | Confirmed |
| SCA-02 | The product MUST accommodate up to 5,000 users per institution. | Confirmed |
| SCA-03 | Clario MUST support at least 1,000 concurrent users. | Confirmed |
| SCA-04 | Capacity MUST be tested under realistic peak academic workloads. | Required |
| SCA-05 | Growth MUST NOT compromise institutional data isolation. | Critical |

The initial capacity assumptions imply approximately 25,000–100,000 registered user accounts across the launch institution range. The 1,000 concurrent-user target is a separate simultaneous-load requirement.

## 6. Usability and accessibility requirements

### NFR-USA: Platform support

- Students and Supervisors use the Android and iOS applications.
- Coordinators use the web application.
- The product MUST provide consistent academic workflow behaviour across supported platforms.

### NFR-USA: Offline behaviour

Clario requires an active internet connection for normal operations.

The only approved offline exceptions are:

1. Saving drafts locally on the user's device.
2. Queuing interrupted uploads and retrying automatically when connectivity returns.

Approvals, formal submissions, grade changes and all other operations MUST require an active internet connection.

An upload retry MUST NOT create duplicate formal submissions. A formal submission is recorded only after successful server receipt and validation.

### NFR-USA: Accessibility

- Clario MUST target **WCAG 2.2 Level AA**.
- Accessibility must be considered across web and mobile interfaces.
- Interfaces should support keyboard navigation, screen readers, sufficient contrast, visible focus states and understandable validation feedback.

### NFR-USA: Browser compatibility

The Coordinator web application MUST officially support the latest two major versions of:

- Google Chrome.
- Microsoft Edge.
- Mozilla Firefox.
- Apple Safari.

## 7. Data integrity and consistency requirements

### NFR-DAT: Academic document integrity

| ID | Requirement |
|---|---|
| DAT-01 | Every successful formal submission MUST create a preserved document version. |
| DAT-02 | Previous formal submission versions MUST NOT be deleted when a revised submission is made. |
| DAT-03 | A submission MUST only be recorded after successful receipt and validation. |
| DAT-04 | Only designated group submitters may make formal group submissions. |
| DAT-05 | Interrupted uploads MUST be recoverable through local draft preservation and retry. |
| DAT-06 | Documents MUST remain accessible only to authorised users. |

### NFR-DAT: Academic workflow consistency

Clario MUST preserve the integrity of the following workflows:

- Topic proposal and approval.
- Supervisor assignment.
- Milestone submission and approval.
- Submission revision and version history.
- Deadline and extension management.
- Examiner appointment and assessment.
- Supervisor performance assessment.
- Final result consolidation.
- Coordinator result approval.
- Programme result publication.

A student MUST NOT progress to the next milestone until the preceding milestone has been approved.

### NFR-DAT: Result publication

- Programme result publication MUST operate as one atomic operation.
- Either all approved programme results are published successfully, or none are published.
- Partial publication MUST NOT occur under the approved model.
- Publication MUST only occur after the required approvals have been completed.

### NFR-DAT: Payment consistency

| ID | Requirement |
|---|---|
| DAT-07 | Institutional subscription payments MUST be processed consistently. |
| DAT-08 | Duplicate payment notifications MUST NOT result in duplicate payment processing. |
| DAT-09 | Each unique payment MUST be processed only once. |
| DAT-10 | Payment events MUST be verified before subscription status is changed. |
| DAT-11 | Subscription status MUST remain consistent with verified payment information. |

Student project payments are outside the current product scope.

## 8. Auditability and accountability requirements

### NFR-AUD: Audit records

Clario MUST record:

**Administrative activities**
- Institutional account and configuration changes.
- User and role administration.
- Coordinator appointments.
- Platform administration actions.
- Subscription administration and relevant payment-status changes.

**Critical academic decisions**
- Topic allocation decisions.
- Supervisor assignments.
- Milestone approvals and rejections.
- Deadline-extension decisions.
- Examiner assessment submissions and changes.
- Grade changes.
- Final result approval.
- Result publication.

Audit records SHOULD contain, where applicable:

- Actor identity.
- Action performed.
- Affected record.
- Institution and relevant academic scope.
- Timestamp.
- Previous and resulting values for significant changes.
- Relevant outcome or reason.

The audit system MUST prevent unauthorised modification or deletion of audit records.

General activity tracking, such as routine navigation and every page view, is not required.

### NFR-AUD: Retention

Audit-log retention MUST be configurable according to institutional requirements and applicable legal obligations.

No universal retention duration has been approved.

## 9. Backup, recovery, export and deletion

### NFR-BKP: Backup policy

| Requirement | Approved value |
|---|---|
| Backup frequency | Hourly |
| Routine backup retention | 30 days |
| RPO | 1 hour |
| RTO | 4 hours |
| Backup encryption | Required |
| Backup recovery testing | Required; frequency open |

### NFR-BKP: Institutional data export

When an institution requests its data, Clario MUST support a complete institutional archive containing:

- Structured institutional records.
- Project records.
- Original uploaded documents.
- Relevant audit records.
- Associated metadata.

The export MUST respect access permissions and applicable privacy restrictions.

### NFR-BKP: Institutional termination

When an institution permanently terminates its subscription:

1. The institution must have an opportunity to export its data.
2. A defined recovery period must apply.
3. Remaining data must be securely deleted after that period.
4. Records subject to legal retention obligations must be preserved as required.
5. Backup copies must expire according to the applicable deletion and backup-retention policy.
6. Deletion must be documented and capable of verification.

The duration of the recovery period is not yet defined.

## 10. Domain-specific operational rules

### NFR-DOM: Academic grading

- Clario MUST preserve calculated grade values without prematurely rounding intermediate calculations.
- Institutions MUST be able to define display and final-result rounding rules.
- Grading categories, criteria, weightings and pass marks are configurable by the Coordinator within the approved institutional rules.
- Supervisor performance assessment has a default allocation of 30 marks, subject to Coordinator configuration.
- Supervisor and Examiner assessments MUST remain independent.
- Supervisors MUST NOT examine projects they supervised.

**Open:** The exact decimal precision and rounding modes must be defined for the grading configuration.

### NFR-DOM: Subscription currency and monetary values

- NGN is the launch subscription currency.
- Future multi-currency support is required.
- Subscription billing is institutional.
- Duplicate payment processing MUST be prevented.

**Recommended monetary implementation constraint:** Represent NGN monetary amounts in kobo using integer minor units or an exact decimal representation. Avoid binary floating-point calculations for financial values.

**Open:** Monetary rounding, currency conversion, exchange-rate sourcing and treatment of future currencies have not yet been approved.

### NFR-DOM: Deadlines and timestamps

- Each institution MUST have a configured timezone.
- Deadline interpretation MUST use the institution's configured timezone.
- Missed deadlines MUST be recorded automatically.
- Late submissions remain possible and may affect grades.
- Late penalties follow configured rules, subject to Coordinator override.
- Deadline extensions require Supervisor recommendation and Coordinator approval.

### NFR-DOM: Notifications

Confirmed MVP channels:

- In-app notifications.
- Email notifications.

Requirements:

- Important workflow notifications MUST be retained as in-app records.
- Failed notification deliveries MUST be retried.
- Notification failures MUST be monitored.
- Notification delivery MUST NOT determine whether the underlying academic operation succeeds.

Push notifications and SMS are not confirmed MVP requirements.

## 11. Regulatory and compliance requirements

### NFR-REG: Nigeria

The initial regulatory baseline is the **Nigeria Data Protection Act 2023 (NDPA)** and the Nigeria Data Protection Commission's applicable directives, including the **NDP Act General Application and Implementation Directive 2025 (GAID)**.

Clario MUST be designed to support:

1. Lawful, fair and transparent processing of personal data.
2. Purpose limitation and data minimisation.
3. Appropriate data security.
4. Data-subject rights.
5. Appropriate retention and deletion.
6. Accountability and documentation.
7. Data-processing agreements between institutions and Clario.
8. Appropriate handling of children’s personal data.
9. Lawful international data transfers.
10. Personal-data breach management and notification.

### NFR-REG: Breach management

Clario MUST support:

- Security incident logging.
- Investigation.
- Containment.
- Evidence preservation.
- Affected-institution notification.
- Breach assessment.
- Regulatory notification where legally required.
- Communication with affected individuals where legally required.

Under Section 40 of the NDPA, qualifying personal-data breaches must be reported to the Commission within the statutory 72-hour period; high-risk breaches may also require communication to affected individuals.

### NFR-REG: Children’s personal data

Clario MUST support the age and consent verification safeguards applicable under Section 31 of the NDPA.

The product's consent workflow must be designed around the applicable legal basis and statutory exceptions, not a blanket assumption that every educational processing activity requires parental consent.

### NFR-REG: International expansion

Before entering another country, Clario MUST undergo a jurisdiction-specific compliance review covering:

- Data protection and privacy.
- International data transfers.
- Children's personal data.
- Academic record retention.
- Security and breach notification.
- Data-subject rights.
- Applicable education-sector obligations.

International expansion MUST NOT rely solely on the Nigerian compliance baseline.

## 12. Monitoring and operational observability

Clario MUST monitor:

| Monitoring area | Required capability |
|---|---|
| Availability | Uptime and service health |
| Performance | Response times and application latency |
| Application reliability | Errors and failed operations |
| Infrastructure | Storage capacity and resource health |
| Background processing | Failed and delayed jobs |
| Security | Suspicious activity and security events |
| Payments | Payment reconciliation and processing alerts |
| Backups | Backup completion and verification |
| Notifications | Delivery failures and retry status |

The system MUST generate actionable alerts for operational failures requiring investigation.

## 13. Confirmed product constraints

The following are outside the current product scope:

- Student project payment processing.
- Plagiarism and similarity checking.
- External Examiner accounts and workflows.
- General-purpose Student–Supervisor messaging.
- Coordinator intervention in routine Supervisor–Student discussions.
- General academic activity audit trails.
- Push notifications and SMS as confirmed MVP channels.

The system MUST preserve the distinction between project supervision, examination, academic administration and platform administration.

## 14. Outstanding requirements requiring resolution

These are not approved implementation rules yet.

### Academic governance

| ID | Outstanding decision |
|---|---|
| GAP-01 | How multiple Examiner grades are consolidated. |
| GAP-02 | How individual contributions are assessed in group projects. |
| GAP-03 | Supervisor assessment submission deadline. |
| GAP-04 | Handling outstanding assessments when programme publication is otherwise ready. |

### Academic workflow

| ID | Outstanding decision |
|---|---|
| GAP-05 | Whether and how group membership can change after allocation. |
| GAP-06 | Student acceptance or rejection of an alternative topic proposed by a Supervisor. |
| GAP-07 | How automatic carry-forward interacts with manual academic-session setup. |
| GAP-08 | Supervisor workload limits. |
| GAP-09 | Late-submission penalty calculation, limits and grace periods. |

### Subscription and operations

| ID | Outstanding decision |
|---|---|
| GAP-10 | Permissions available during the subscription grace period and after restrictions begin. |
| NFR-OPEN-01 | Exact session inactivity timeout values by role. |
| NFR-OPEN-02 | Performance measurement percentile and endpoint coverage. |
| NFR-OPEN-03 | Maintenance downtime treatment in availability calculations. |
| NFR-OPEN-04 | Encryption algorithms and key-management requirements. |
| NFR-OPEN-05 | Audit-log retention periods. |
| NFR-OPEN-06 | Institutional data recovery-period duration after termination. |
| NFR-OPEN-07 | Exact backup restoration testing frequency. |
| NFR-OPEN-08 | Grade decimal precision and rounding modes. |
| NFR-OPEN-09 | Monetary rounding and future currency-conversion rules. |
| NFR-OPEN-10 | Examiner MFA and privileged-access requirements. |
| NFR-OPEN-11 | Data-subject request handling timelines and operational ownership. |
| NFR-OPEN-12 | Data export format, archive integrity and delivery procedure. |

## 15. Acceptance and validation

Before Clario is considered ready for production, the NFRs should be validated through:

- Security and tenant-isolation testing.
- Authentication and access-control testing.
- Performance and concurrency testing.
- Upload interruption and retry testing.
- Duplicate payment and webhook testing.
- Academic workflow consistency testing.
- Atomic result-publication testing.
- Backup restoration and disaster-recovery exercises.
- Accessibility testing against WCAG 2.2 AA.
- Data export and deletion verification.
- Privacy and regulatory compliance review.

**Completion criterion:** Every confirmed requirement must have an identifiable verification method and must pass its acceptance test before production release.

---

**End of document**