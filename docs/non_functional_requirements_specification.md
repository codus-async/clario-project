# Clario — Non-Functional Requirements and Release Gates Specification (`mvp-nfrs.md`)

**Document Status:** Stage 5 — Non-Functional Requirements & Release Gates Master Specification (Standalone Document)

**Target Release:** Clario MVP (P0 Scope Only)

**Platform:** Responsive Web Application (All Actors)

**Launch Jurisdiction & Currency:** Nigeria (`NGN`)

---

## 1. Purpose and Scope

This document defines the quality attributes, operational constraints, security requirements, data-protection mandates, and quantitative release gates that Clario and all 75 P0 features must satisfy before production deployment and ongoing operation.

---

## 2. Master Non-Functional Requirements Catalogue

### 2.1 Security and Authentication (`NFR-SEC`)

| NFR ID | Quality Attribute | Target Requirement / Constraint | Verification Method |
|---|---|---|---|
| **SEC-01** | Authentication Gate | Clario MUST authenticate users before granting access to any protected route or functionality (`SYS-01`). | Automated security & penetration test. |
| **SEC-02** | Password Length | Passwords MUST contain at least $12$ characters. | Automated input validation test. |
| **SEC-03** | Compromised Password Screening | Clario MUST screen candidate passwords against known compromised-password lists, rejecting breached passwords. | API integration test against breach dictionary. |
| **SEC-04** | Login Rate Limiting | Login and MFA verification attempts MUST be rate-limited per IP and account identifier. | Load/stress test (simulating brute force). |
| **SEC-05** | Adaptive Temporary Lockouts | Clario MUST apply adaptive temporary lockouts upon repeated failed logins, avoiding permanent account lockouts. | Integration test verifying lockout and cooldown expiry. |
| **SEC-06** | Mandatory MFA | Multi-Factor Authentication (`MFA`) MUST be mandatory for Platform Admins, Institutional Admins, and Project Coordinators. | Role-based authentication & enforcement test. |
| **SEC-07** | Session Inactivity Timeouts | Session inactivity timeouts MUST be configurable by user role (`OD-12`). | Session lifecycle verification test. |
| **SEC-08** | Account Recovery | Account recovery MUST support self-service email token recovery with Institutional Admin assistance (`FR-044`). | End-to-end recovery workflow test. |

### 2.2 Multi-Tenant Isolation & Authorization (`NFR-SEC` / `NFR-PRV`)

| NFR ID | Quality Attribute | Target Requirement / Constraint | Verification Method |
|---|---|---|---|
| **SEC-09** | Tenant Isolation | Clario MUST enforce strict institutional data isolation (`BR-01`), ensuring zero cross-tenant data visibility. | Automated cross-tenant IDOR penetration test. |
| **SEC-10** | Scope Authorization | Users MUST only access information within their authorised institutional, programme, project, and assignment scope (`BR-02`). | Role & scope boundary authorization test matrix. |
| **SEC-11** | Student Scope | Students MUST only access their own individual project or authorised group workspace (`FR-119`). | Student access authorization audit. |
| **SEC-12** | Supervisor Scope | Supervisors MUST only access projects and students assigned to them (`FR-086`, `FR-088`). | Supervisor boundary enforcement test. |
| **SEC-13** | Examiner Scope | Examiners MUST only access projects and final documents specifically assigned for examination (`FR-169`, `FR-170`). | Examiner scoping and IDOR penetration test. |
| **SEC-14** | Institutional Admin Confidentiality | Institutional Admins MUST NOT access confidential project documents, feedback, discussions, or grades (`BR-25`, `F-18`). | Explicit authorization test denying IA access to `F-20`, `F-32`, `F-34`, `F-58`. |
| **SEC-15** | Platform Admin Confidentiality | Platform Admins MUST NOT have default access to institutional academic records (`BR-25`, `F-08`). | Platform Admin access authorization audit. |
| **SEC-16** | Audited Support Access | Authorised Platform Admin diagnostic or export support access must be restricted and recorded in audit logs (`FR-006`, `FR-024`). | Audit log verification for support sessions. |

### 2.3 Encryption & Information Protection (`NFR-SEC`)

| NFR ID | Quality Attribute | Target Requirement / Constraint | Verification Method |
|---|---|---|---|
| **SEC-17** | Transmission Encryption | Data MUST be encrypted in transit using strong TLS (`TLS 1.2+`). | SSL/TLS configuration scanner. |
| **SEC-18** | Storage Encryption | Stored data MUST be encrypted at rest (`AES-256`). | Cloud infrastructure configuration audit. |
| **SEC-19** | Backup Encryption | Encryption at rest MUST cover academic documents, personal data, and routine backups (`F-83`). | Backup storage inspection & decryption test. |
| **SEC-20** | Credential Protection | Stored credentials, password hashes (`Argon2id`/`bcrypt`), and MFA secrets MUST be protected against unauthorized disclosure. | Database security audit and code review. |

### 2.4 Privacy and Data Protection (`NFR-PRV` / `NFR-REG`)

| NFR ID | Quality Attribute | Target Requirement / Constraint | Verification Method |
|---|---|---|---|
| **PRV-01** | Data Controller | Each institution MUST act as the Data Controller for its institutional academic data (`nfrs.md` §3). | Legal DPA contract review. |
| **PRV-02** | Data Processor | Clario MUST act as the Data Processor when processing institutional academic data on behalf of an institution. | Legal DPA contract review. |
| **PRV-03** | Platform Data Control | Clario MUST define its independent Data Controller responsibilities for platform administration and billing. | Compliance policy review. |
| **PRV-05** | Purpose Limitation | Personal data must be collected and processed strictly for defined, legitimate purposes under `NDPA 2023`. | Data flow and minimization audit. |
| **PRV-08** | Under-18 Safeguards | Clario MUST support students below 18 years of age, capturing parental/guardian consent where required (`FR-041`, `PROP-05`). | Under-18 registration & consent workflow test. |
| **PRV-09** | International Transfers | International hosting/transfers of institutional personal data require institutional approval and satisfy `NDPA 2023` transfer safeguards. | Cross-border transfer compliance audit. |

### 2.5 Reliability and Availability (`NFR-REL`)

| NFR ID | Quality Attribute | Target Requirement / Constraint | Verification Method |
|---|---|---|---|
| **REL-01** | Monthly Availability | Clario MUST achieve at least **99.5% monthly availability** (permitting $\le 3\text{h } 36\text{m}$ downtime/month). | Uptime monitoring and SLA reporting tools. |
| **REL-02** | Continuous Monitoring | Clario MUST monitor service availability and application health continuously. | Synthetic uptime monitoring probes. |
| **REL-06** | Backup Frequency | Clario MUST maintain automated recoverable backups **at least hourly** (`F-83`). | Automated backup execution verification. |
| **REL-07** | Recovery Point Objective ($\text{RPO}$) | Maximum acceptable data loss following a recoverable incident MUST NOT exceed **1 hour** (`F-83`). | Backup timestamp interval audit. |
| **REL-08** | Recovery Time Objective ($\text{RTO}$) | Clario MUST restore service and data within **4 hours** following a qualifying disaster (`F-83`). | Timed disaster recovery drill ($\text{RTO}$ measurement). |
| **REL-09** | Restoration Testing | Backup restoration MUST be tested periodically (`F-83`, `OD-17`). | Scheduled DR drill execution logs. |
| **REL-10** | Backup Failure Alerting | Backup failures MUST generate high-severity operational alerts (`REL-10`, `F-83`). | Alerting integration test. |

### 2.6 Performance and Scalability (`NFR-PER` / `NFR-SCA`)

| NFR ID | Quality Attribute | Target Requirement / Constraint | Verification Method |
|---|---|---|---|
| **PER-01** | Interactive Response Time | Normal interactive operations MUST complete within **under 2 seconds** ($p95$). | Automated performance and latency test. |
| **PER-02** | File Transfer Handling | Uploads/downloads ($\le 50\text{ MB}$) MUST be measured separately from normal interactive requests. | File transfer throughput benchmark. |
| **SCA-01** | Launch Capacity (Tenants) | Clario MUST support **5–20 institutions** at launch. | Multi-tenant tenant-scaling simulation. |
| **SCA-02** | User Capacity per Tenant | The product MUST accommodate up to **5,000 users per institution**. | Tenant volume load test. |
| **SCA-03** | Concurrent Users | Clario MUST support at least **1,000 concurrent users** simultaneously. | Concurrent load generation test (e.g., Locust/JMeter). |

### 2.7 Usability and Accessibility (`NFR-USA`)

| NFR ID | Quality Attribute | Target Requirement / Constraint | Verification Method |
|---|---|---|---|
| **USA-01** | Platform Support | Responsive web application for all actors (Platform Admin, Institutional Admin, Coordinator, Supervisor, Student, Examiner). | Cross-browser & device UI verification. |
| **USA-02** | Offline Behaviour | Active internet connection required for normal operations; local draft storage and automatic queued upload retries are the only offline exceptions (`NFR-USA`). | Network-drop simulation test. |
| **USA-03** | Accessibility Standard | Clario MUST target **WCAG 2.2 Level AA** compliance across web interfaces. | Automated accessibility audit (axe-core/WAVE) + manual screen-reader test. |
| **USA-04** | Browser Compatibility | Coordinator web application MUST support the latest two major versions of Chrome, Edge, Firefox, and Safari. | Cross-browser test suite. |

---

## 3. Pre-Production Release Gates (`REL-GATE-01` through `REL-GATE-10`)

Clario is strictly prohibited from entering production release until all ten release gates are verified and signed off by the Product Manager, Lead Architect, QA Lead, and Security Lead (`mvp-p.md` §12).

| Gate ID | Release Gate Name | Mandatory Verification Criteria & Acceptance Condition | Responsible Lead |
|---|---|---|---|
| **GATE-01** | **Complete P0 Feature Verification** | All 75 P0 features (`F-01`–`F-83`, excluding P1/P2) are fully implemented, and all corresponding Acceptance Criteria (`AC-F01-01` through `AC-F83-03`) pass automated and manual QA test suites. | QA Lead |
| **GATE-02** | **Multi-Tenant Isolation & IDOR Sign-Off** | Automated cross-tenant penetration testing confirms zero data leakage between distinct institutional tenants (`BR-01`, `SEC-09`). | Security Lead |
| **GATE-03** | **Subscription Payment & Webhook Integrity** | Automated test suites verify $100\%$ success on subscription payment initiation (`F-67`), cryptographic webhook signature verification (`F-68`), idempotent deduplication (`DAT-08`), and atomic state synchronisation (`F-69`). | Backend Lead / QA Lead |
| **GATE-04** | **Independent Assessment & Grading Integrity** | End-to-end testing confirms that Supervisor performance assessments and Examiner panel assessments remain strictly independent (`BR-17`), aggregate correctly per programme rules (`F-51`), and calculate accurate individual grades for both individual and group projects (`BR-NEW-02`, `F-58`). | Academic Domain Analyst / QA Lead |
| **GATE-05** | **Atomic Project-Level Result Publication** | End-to-end testing confirms that project result publication (`F-60`) operates atomically at the individual project level (`mvp-p.md` §8) without blocking on other pending projects, and correctly locks assessments against post-publication edits (`BR-21`). | Lead Architect / QA Lead |
| **GATE-06** | **Confidentiality & Access Control Sign-Off** | Authorization test matrix verifies that Institutional Admins (`F-18`) and Platform Admins (`F-08`) are strictly blocked from accessing confidential student project documents, feedback, and grades (`BR-25`, `SEC-14`, `SEC-15`). | Security Lead |
| **GATE-07** | **Document Integrity & Upload Resilience** | File security tests confirm $50\text{ MB}$ limit, allowed formats (`PDF`, `DOC`, `DOCX`, `PPT`, `PPTX`), magic-byte inspection, malware scanning, version preservation (`F-78`), and interrupted upload recovery (`NFR-USA`, `DAT-05`). | Security Lead / Backend Lead |
| **GATE-08** | **Audit Trail & Tamper Resistance** | Audit log verification confirms that all administrative actions and critical academic decisions (`NFR-AUD`) are recorded with before/after state diffs, and that audit records are tamper-resistant and immutable (`FR-282`). | Security Lead |
| **GATE-09** | **Disaster Recovery & Backup Verification** | A full disaster recovery drill (`REL-09`) successfully restores production state, object storage (`F-76`), and audit logs (`F-82`) into an isolated environment within the $4\text{-hour}$ `RTO` ($\text{RTO} \le 4\text{ h}$, `REL-08`) with zero data loss beyond the $1\text{-hour}$ backup window ($\text{RPO} \le 1\text{ h}$, `REL-07`). | DevOps Lead |
| **GATE-10** | **Performance, Concurrency & Accessibility Gate** | Load testing confirms $< 2\text{-second}$ interactive response times ($p95$) under $1,000$ concurrent users (`SCA-03`), and automated accessibility audit confirms adherence to **WCAG 2.2 Level AA**. | QA Lead / Frontend Lead |

---

**End of Document**