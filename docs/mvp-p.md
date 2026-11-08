# Clario — MVP Scope and Prioritisation

**Document:** Minimum Viable Product Scope  
**Product:** Clario — Multi-tenant Final-Year Project Management SaaS  
**Status:** Prioritisation finalised; detailed policy and acceptance decisions remain open.

## 1. MVP objective

Deliver a production-ready, responsive web-based platform that enables tertiary institutions to manage the complete final-year project lifecycle, from institutional setup and topic proposal through supervision, project submission, examination, grading and result publication.

The MVP must support multiple independent institutions, individual and group projects, automated institutional subscriptions and secure academic data management.

## 2. Confirmed product decisions

1. Responsive web application first; native Android and iOS applications follow later.
2. Individual and group projects are both fully supported.
3. Institutional subscriptions use automated payment gateway integration, verified webhooks and access enforcement.
4. The Coordinator configures the Examiner-score consolidation method for each programme.
5. Group projects use a shared Examiner project assessment and individual Supervisor performance scores.
6. Results may be published for completed and approved projects while other projects remain pending.

## 3. Priority definitions

- **P0 — Essential MVP:** Required for launch and production acceptance.
- **P1 — Post-MVP:** Important improvements that can follow initial validation.
- **P2 — Optional:** Enhancements that are not required for the initial product.

## 4. P0 — Essential MVP features

- **Platform administration:** F-01–F-05, F-08.
- **Institutional administration:** F-09–F-16, F-18.
- **Project registration and allocation:** F-19–F-24.
- **Supervisor reassignment:** F-27.
- **Project workspace and lifecycle:** F-28–F-35.
- **Group collaboration and assessment:** F-36–F-39.
- **Deadlines and exceptions:** F-40–F-44.
- **Examination and defence:** F-46–F-50.
- **Assessment and grading:** F-51–F-58.
- **Final results and completion:** F-59–F-62.
- **Authentication and access control:** F-64–F-66.
- **Institutional subscription processing:** F-67–F-70.
- **Email and in-app notifications:** F-71–F-75.
- **Secure document services:** F-76–F-78.
- **Deadline background processes:** F-79–F-80.
- **Audit and backup:** F-82–F-83.

## 5. P1 — Post-MVP features

- F-06: Global Platform Configuration.
- F-17: Institutional Project Oversight.
- F-25: Supervisor Workload Monitoring.
- F-26: Supervisor Workload Limit Management.
- F-45: Project Withdrawal Management.
- F-63 and F-81: Incomplete Project Carry-Forward and its automated processing.

## 6. P2 — Optional enhancements

- F-07: Dedicated Platform Support Management.
- Advanced analytics and institutional dashboards.
- Advanced workload optimisation.
- Real-time collaborative document editing.
- Advanced late-penalty configuration.
- Native Android and iOS applications.
- Push notifications and SMS.
- Advanced reporting beyond required operational and institutional data exports.

## 7. Academic grading rules

- Examiner assessment and Supervisor performance assessment remain independent.
- The Coordinator configures the Examiner-score consolidation method per programme.
- A group project receives a shared Examiner assessment.
- Each group member receives an individual Supervisor performance score.
- Final results are calculated individually using the applicable shared project assessment and individual performance score.
- The default Supervisor allocation is 30 marks, subject to Coordinator configuration.
- Intermediate grading calculations must preserve precision and apply the institution's approved rounding rules.

## 8. Result publication rule

A Coordinator may publish an individual project's result once all required assessments for that project have been completed, consolidated and approved.

Outstanding assessments for other projects must not block publication of that project's result.

Publication must be atomic at the individual project-result level: a result is either fully published or not published.

This rule supersedes the previous programme-wide publication requirement.

## 9. Mandatory non-functional requirements

The MVP must satisfy:

- Strict institutional tenant isolation.
- Secure authentication and role/scope-based authorisation.
- Mandatory MFA for Platform Admins, Institutional Admins and Project Coordinators.
- Encryption in transit and at rest, including backups.
- Secure document upload, retrieval and version preservation.
- Academic workflow and grade integrity.
- Verified, idempotent subscription payment processing.
- Tamper-resistant audit records for administrative actions and critical academic decisions.
- 99.5% monthly availability target.
- Under-two-second target for normal interactive operations.
- Capacity for 5–20 institutions, up to 5,000 users per institution and at least 1,000 concurrent users.
- Hourly backups, 30-day routine retention, one-hour RPO and four-hour RTO.
- Local drafts and queued upload retries as the only offline exceptions.
- WCAG 2.2 Level AA.
- Nigeria Data Protection Act 2023 and applicable NDPC compliance requirements.
- Monitoring and actionable operational alerts.

The MVP platform is responsive web for all roles. Native mobile applications are deferred.

## 10. Explicit exclusions

- Student project payments.
- Plagiarism and similarity checking.
- External Examiner accounts and workflows.
- General-purpose Student–Supervisor messaging.
- Coordinator intervention in routine Supervisor–Student discussions.
- General academic activity audit trails.
- Push notifications and SMS.
- Native mobile applications in the initial release.

## 11. Outstanding decisions

Before implementation of the affected workflows, define:

- Group membership-change policy.
- Alternative-topic acceptance and rejection.
- Carry-forward and session-creation rules.
- Supervisor workload limits.
- Late-submission penalty method, limits and grace period.
- Subscription grace-period permissions.
- Supervisor assessment deadline.
- Grading precision and rounding rules.
- Payment-provider and reconciliation procedures.
- Institutional termination recovery period.

## 12. MVP completion criteria

Clario is ready for MVP production release only when:

1. Every P0 feature is implemented and accepted.
2. Individual and group project workflows pass end-to-end tests.
3. Automated subscription payment, webhook verification and access enforcement pass payment-integrity tests.
4. Examiner and Supervisor assessments remain independent and produce correct individual results.
5. Project-level result publication works without blocking on other pending projects.
6. Tenant isolation, authorisation and confidentiality tests pass.
7. Document integrity, audit, backup and recovery tests pass.
8. Accessibility, performance, concurrency and privacy requirements pass their agreed acceptance tests.
9. Critical operational monitoring and failure alerts are functional.

**Product management decision:** The MVP is a complete responsive-web implementation of Clario's essential academic and institutional lifecycle. It is not a partial academic workflow or a prototype that sacrifices security, reliability or data integrity.