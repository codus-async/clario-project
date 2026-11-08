# Clario — MVP End-to-End Traceability Matrix & Stage 6 Consistency Audit (`mvp-traceability.md`)

**Document Status:** Stage 5 & Stage 6 — End-to-End Traceability Matrix and Final Consistency Audit (Standalone Document)  
**Target Release:** Clario MVP (P0 Scope Only)  
**Platform:** Responsive Web Application (All Actors)  
**Launch Jurisdiction & Currency:** Nigeria (`NGN`)

---

## 1. Purpose and Scope

This matrix provides 100% bidirectional traceability across all **75 P0 MVP Features** (`F-01` through `F-83`, excluding the 8 deferred P1/P2 features), linking:
1. **Feature ID & Feature Name**
2. **Source User Story IDs** (`PA-*`, `IA-*`, `PC-*`, `PS-*`, `ST-*`, `PE-*`, `SYS-*`)
3. **Functional Requirement IDs** (`FR-001` through `FR-290`)
4. **Governing Business Rules & NFRs** (`BR-01`–`BR-30`, `BR-NEW-01`–`BR-NEW-04`, `SEC-*`, `DAT-*`, `REL-*`)
5. **Acceptance Criteria Test IDs** (`AC-F01-01` through `AC-F83-03`)
6. **Feature Dependencies & Open Decision References** (`OD-01`–`OD-22`)

---

## 2. Master P0 Traceability Matrix (75 Features)

### Module A: Platform Administration (`F-01`–`F-05`, `F-08`)

| Feature ID | Feature Name | Source User Story IDs | Functional Requirement IDs | Business Rules & NFRs | Acceptance Criteria IDs | Dependencies & Open Decisions |
|---|---|---|---|---|---|---|
| **F-01** | Institutional Account Management | `PA-01`, `PA-02`, `PA-03` | `FR-001`, `FR-002`, `FR-003`, `FR-004`, `FR-005`, `FR-006` | `BR-01`, `BR-28`, `BR-NEW-01`, `SEC-09`, `SCA-02`, `NFR-BKP` | `AC-F01-01`, `AC-F01-02`, `AC-F01-03`, `AC-F01-04` | `F-64`, `F-65`, `F-66`, `F-71`, `F-82` \| `OD-10`, `OD-20`, `OD-21` |
| **F-02** | Subscription Plan Management | `PA-04` | `FR-007`, `FR-008`, `FR-009` | `BR-28`, `BR-29`, `DAT-01`, `NFR-DOM` | `AC-F02-01`, `AC-F02-02` | `F-64`, `F-66`, `F-82` \| `OD-18` |
| **F-03** | Institutional Subscription and Billing Management | `PA-05`, `PA-06` *(+ `PROP-02` IA Billing)* | `FR-010`, `FR-011`, `FR-012`, `FR-013`, `FR-014` | `BR-01`, `BR-02`, `BR-28`, `BR-29`, `DAT-07`, `DAT-09` | `AC-F03-01`, `AC-F03-02`, `AC-F03-03` | `F-01`, `F-02`, `F-04`, `F-64`, `F-66`, `F-67`–`F-70`, `F-71`, `F-82` \| `OD-06`, `OD-09`, `OD-18` |
| **F-04** | Subscription Grace Period Management | `PA-07` | `FR-015`, `FR-016`, `FR-017` | `BR-28`, `BR-NEW-01`, `SYS-07`, `NFR-DOM` | `AC-F04-01`, `AC-F04-02` | `F-03`, `F-64`, `F-66`, `F-70`, `F-82` \| `OD-06` (`GAP-10`) |
| **F-05** | Platform Administrator Management | `PA-08` | `FR-018`, `FR-019`, `FR-020`, `FR-021` | `BR-28`, `SEC-06`, `DAT-01` | `AC-F05-01`, `AC-F05-02` | `F-64`, `F-65`, `F-66`, `F-71`, `F-82` |
| **F-08** | Institutional Academic Data Protection | `PA-11` | `FR-022`, `FR-023`, `FR-024` | `BR-01`, `BR-02`, `SEC-15`, `SEC-16`, `NFR-AUD` | `AC-F08-01`, `AC-F08-02` | `F-66`, `F-77`, `F-82` |

### Module B: Institutional Administration (`F-09`–`F-16`, `F-18`)

| Feature ID | Feature Name | Source User Story IDs | Functional Requirement IDs | Business Rules & NFRs | Acceptance Criteria IDs | Dependencies & Open Decisions |
|---|---|---|---|---|---|---|
| **F-09** | Faculty Management | `IA-01` | `FR-025`, `FR-026`, `FR-027` | `BR-01`, `BR-02`, `BR-28`, `DAT-01` | `AC-F09-01`, `AC-F09-02`, `AC-F09-03` | `F-01`, `F-64`, `F-66`, `F-82` |
| **F-10** | Department Management | `IA-02` | `FR-028`, `FR-029`, `FR-030` | `BR-01`, `BR-02`, `BR-28`, `DAT-01` | `AC-F10-01`, `AC-F10-02` | `F-01`, `F-09`, `F-64`, `F-66`, `F-82` |
| **F-11** | Programme Management | `IA-03` | `FR-031`, `FR-032`, `FR-033` | `BR-01`, `BR-02`, `BR-03`, `BR-28`, `DAT-01` | `AC-F11-01`, `AC-F11-02` | `F-01`, `F-09`, `F-10`, `F-64`, `F-66`, `F-82` |
| **F-12** | Academic Session Management | `IA-04` | `FR-034`, `FR-035`, `FR-036`, `FR-037` | `BR-01`, `BR-02`, `BR-03`, `BR-28`, `BR-NEW-01`, `DAT-01`, `DAT-02` | `AC-F12-01`, `AC-F12-02`, `AC-F12-03` | `F-01`, `F-64`, `F-66`, `F-82` \| `OD-03` (`GAP-07`) |
| **F-13** | Institutional User Management | `IA-05`, `IA-06`, `IA-07` *(+ `PROP-05` Privacy)* | `FR-038`, `FR-039`, `FR-040`, `FR-041`, `FR-042`, `FR-043`, `FR-044` | `BR-01`, `BR-02`, `BR-28`, `SEC-06`, `SEC-08`, `SCA-02`, `NFR-PRV`, `NFR-REG` | `AC-F13-01`, `AC-F13-02`, `AC-F13-03` | `F-01`, `F-03`, `F-10`, `F-14`, `F-64`, `F-65`, `F-66`, `F-71`, `F-82` \| `OD-20`, `OD-22` |
| **F-14** | Institutional Role and Permission Management | `IA-08` | `FR-045`, `FR-046`, `FR-047`, `FR-048` | `BR-01`, `BR-02`, `BR-16`, `BR-25`, `BR-28`, `SEC-06`, `SEC-14` | `AC-F14-01`, `AC-F14-02`, `AC-F14-03` | `F-13`, `F-15`, `F-16`, `F-18`, `F-64`, `F-66`, `F-82` \| `OD-19` |
| **F-15** | Project Coordinator Appointment | `IA-09` | `FR-049`, `FR-050`, `FR-051`, `FR-052` | `BR-01`, `BR-02`, `BR-03`, `BR-28`, `SEC-06` | `AC-F15-01`, `AC-F15-02` | `F-11`, `F-12`, `F-13`, `F-14`, `F-64`, `F-66`, `F-71`, `F-72`, `F-82` |
| **F-16** | Supervisor Records Management | `IA-10` | `FR-053`, `FR-054`, `FR-055` | `BR-01`, `BR-02`, `BR-28` | `AC-F16-01`, `AC-F16-02` | `F-10`, `F-13`, `F-14`, `F-64`, `F-66`, `F-82` \| `OD-04` |
| **F-18** | Academic Information Confidentiality | `IA-12` | `FR-056`, `FR-057`, `FR-058` | `BR-02`, `BR-25`, `SEC-14`, `NFR-AUD` | `AC-F18-01`, `AC-F18-02` | `F-66`, `F-77`, `F-82` |

### Module C: Project Registration, Topics and Allocation (`F-19`–`F-24`)

| Feature ID | Feature Name | Source User Story IDs | Functional Requirement IDs | Business Rules & NFRs | Acceptance Criteria IDs | Dependencies & Open Decisions |
|---|---|---|---|---|---|---|
| **F-19** | Student Project Registration | `PC-01` | `FR-059`, `FR-060`, `FR-061`, `FR-062` | `BR-01`, `BR-02`, `BR-03`, `BR-28`, `SCA-02` | `AC-F19-01`, `AC-F19-02`, `AC-F19-03` | `F-11`, `F-12`, `F-13`, `F-14`, `F-15`, `F-64`, `F-66`, `F-71`, `F-72`, `F-82` \| `OD-03`, `OD-22` |
| **F-20** | Project Topic Proposal and Review Management | `PC-02`, `PC-20`, `PS-01`, `PS-02`, `PS-03`, `PS-04`, `PS-05`, `ST-04`, `ST-05`, `ST-06`, `ST-07`, `ST-08` | `FR-063`, `FR-064`, `FR-065`, `FR-066`, `FR-067`, `FR-068`, `FR-069` | `BR-04`, `BR-05`, `BR-08`, `BR-26`, `NFR-AUD`, `NFR-USA` | `AC-F20-01`, `AC-F20-02`, `AC-F20-03`, `AC-F20-04` | `F-19`, `F-21`–`F-24`, `F-64`, `F-66`, `F-71`–`F-75`, `F-82` \| `OD-02` (`GAP-06`), `PROP-01` |
| **F-21** | Project Allocation Management | `PC-03`, `PC-04` | `FR-070`, `FR-071`, `FR-072`, `FR-073` | `BR-03`, `BR-04`, `BR-05`, `BR-06`, `NFR-AUD` | `AC-F21-01`, `AC-F21-02`, `AC-F21-03` | `F-19`, `F-20`, `F-22`, `F-23`, `F-24`, `F-64`, `F-66`, `F-71`, `F-72`, `F-82` \| `OD-01` |
| **F-22** | Project Group Management | `PC-05`, `PC-06`, `ST-17` | `FR-074`, `FR-075`, `FR-076`, `FR-077` | `BR-03`, `BR-06`, `BR-07`, `BR-28`, `SEC-11`, `SEC-12` | `AC-F22-01`, `AC-F22-02`, `AC-F22-03` | `F-19`, `F-21`, `F-23`, `F-64`, `F-66`, `F-71`, `F-72`, `F-82` \| `OD-01` (`GAP-05`) |
| **F-23** | Group Submission Authority Management | `PC-07`, `ST-20` | `FR-078`, `FR-079`, `FR-080` | `BR-08`, `BR-28`, `DAT-04`, `SEC-11` | `AC-F23-01`, `AC-F23-02`, `AC-F23-03` | `F-22`, `F-64`, `F-66`, `F-72`, `F-82` |
| **F-24** | Supervisor Assignment Management | `PC-08`, `PC-09` | `FR-081`, `FR-082`, `FR-083` | `BR-03`, `BR-04`, `BR-05`, `BR-16`, `SEC-12`, `NFR-AUD` | `AC-F24-01`, `AC-F24-02` | `F-16`, `F-19`, `F-20`, `F-21`, `F-22`, `F-64`, `F-66`, `F-71`–`F-75`, `F-82` \| `OD-04` |

### Module D: Supervisor Capacity and Assignment Management (`F-27`)

| Feature ID | Feature Name | Source User Story IDs | Functional Requirement IDs | Business Rules & NFRs | Acceptance Criteria IDs | Dependencies & Open Decisions |
|---|---|---|---|---|---|---|
| **F-27** | Supervisor Reassignment | `PC-12`, `PS-20` | `FR-084`, `FR-085` | `BR-03`, `BR-10`, `BR-16`, `SEC-12`, `NFR-AUD` | `AC-F27-01`, `AC-F27-02` | `F-16`, `F-21`, `F-24`, `F-28`, `F-48`, `F-64`, `F-66`, `F-71`, `F-72`, `F-82` |

### Module E: Project Workspace and Lifecycle (`F-28`–`F-35`)

| Feature ID | Feature Name | Source User Story IDs | Functional Requirement IDs | Business Rules & NFRs | Acceptance Criteria IDs | Dependencies & Open Decisions |
|---|---|---|---|---|---|---|
| **F-28** | Project Workspace | `ST-01`, `ST-02`, `PS-06` | `FR-086`, `FR-087`, `FR-088` | `BR-01`, `BR-02`, `BR-25`, `BR-26`, `SEC-11`, `SEC-12`, `PER-01` | `AC-F28-01`, `AC-F28-02`, `AC-F28-03` | `F-19`–`F-24`, `F-29`, `F-30`, `F-64`, `F-66` |
| **F-29** | Milestone Configuration | `PC-13`, `PS-07`, `ST-03` | `FR-089`, `FR-090`, `FR-091`, `FR-092` | `BR-03`, `BR-09`, `BR-10`, `BR-28`, `NFR-SEC`, `NFR-DAT` | `AC-F29-01`, `AC-F29-02`, `AC-F29-03` | `F-11`, `F-12`, `F-15`, `F-20`, `F-64`, `F-66`, `F-82` |
| **F-30** | Milestone Deadline Management | `PC-14`, `PS-07`, `ST-03` | `FR-093`, `FR-094`, `FR-095`, `FR-096`, `FR-097` | `BR-03`, `BR-12`, `BR-15`, `BR-NEW-01`, `NFR-DOM` | `AC-F30-01`, `AC-F30-02` | `F-01`, `F-12`, `F-29`, `F-64`, `F-66`, `F-72`, `F-79`, `F-80`, `F-82` |
| **F-31** | Project and Milestone Progress Monitoring | `PC-15`, `PC-21`, `PS-08`, `ST-09`, `ST-21` | `FR-098`, `FR-099`, `FR-100`, `FR-101` | `BR-02`, `BR-03`, `BR-10`, `SEC-11`, `SEC-12` | `AC-F31-01`, `AC-F31-02` | `F-20`–`F-24`, `F-28`–`F-30`, `F-32`, `F-33`, `F-41`, `F-66` |
| **F-32** | Milestone and Final Project Submission | `ST-10`, `ST-11`, `ST-20` | `FR-102`, `FR-103`, `FR-104`, `FR-105`, `FR-106`, `FR-107` | `BR-08`, `BR-10`, `BR-11`, `BR-12`, `BR-13`, `BR-NEW-04`, `DAT-01`–`DAT-05`, `NFR-SEC`, `NFR-USA` | `AC-F32-01`, `AC-F32-02`, `AC-F32-03` | `F-20`, `F-21`, `F-23`, `F-29`, `F-30`, `F-35`, `F-43`, `F-64`, `F-66`, `F-75`, `F-76`–`F-78` |
| **F-33** | Submission Review and Approval | `PS-09`, `PS-11`, `PS-12`, `PS-13`, `ST-12` | `FR-108`, `FR-109`, `FR-110` | `BR-09`, `BR-10`, `BR-26`, `SEC-12`, `NFR-AUD`, `NFR-USA` | `AC-F33-01`, `AC-F33-02`, `AC-F33-03` | `F-24`, `F-29`, `F-32`, `F-34`, `F-35`, `F-64`, `F-66`, `F-75`, `F-77`, `F-82` |
| **F-34** | Submission Feedback and Discussion | `PS-10`, `PS-16`, `ST-13`, `ST-22` | `FR-111`, `FR-112`, `FR-113`, `FR-114`, `FR-115` | `BR-25`, `BR-26`, `BR-27`, `SEC-11`, `SEC-12` | `AC-F34-01`, `AC-F34-02` | `F-32`, `F-33`, `F-35`, `F-64`, `F-66`, `F-72`, `F-75`, `F-76`, `F-77` |
| **F-35** | Document Version Management | `PS-14`, `PS-15`, `ST-14`, `ST-15` | `FR-116`, `FR-117`, `FR-118` | `BR-08`, `BR-11`, `DAT-01`, `DAT-02` | `AC-F35-01`, `AC-F35-02`, `AC-F35-03` | `F-23`, `F-32`, `F-33`, `F-34`, `F-64`, `F-66`, `F-75`, `F-76`–`F-78` |

### Module F: Group Collaboration (`F-36`–`F-39`)

| Feature ID | Feature Name | Source User Story IDs | Functional Requirement IDs | Business Rules & NFRs | Acceptance Criteria IDs | Dependencies & Open Decisions |
|---|---|---|---|---|---|---|
| **F-36** | Shared Group Workspace | `ST-16` | `FR-119`, `FR-120`, `FR-121` | `BR-02`, `BR-06`, `BR-07`, `BR-08`, `BR-NEW-02`, `SEC-11`, `SEC-12` | `AC-F36-01`, `AC-F36-02`, `AC-F36-03` | `F-21`–`F-24`, `F-28`, `F-37`, `F-38`, `F-64`, `F-66` |
| **F-37** | Shared Document Management | `ST-18` | `FR-122`, `FR-123`, `FR-124`, `FR-125`, `FR-126` | `BR-08`, `DAT-01`, `DAT-02`, `NFR-SEC`, `SEC-11` | `AC-F37-01`, `AC-F37-02`, `AC-F37-03` | `F-22`, `F-23`, `F-32`, `F-36`, `F-64`, `F-66`, `F-72`, `F-76`–`F-78` |
| **F-38** | Group Submission Tracking | `ST-19` | `FR-127`, `FR-128` | `BR-08`, `SEC-11` | `AC-F38-01`, `AC-F38-02` | `F-22`, `F-23`, `F-29`–`F-36`, `F-66` |
| **F-39** | Individual Group Member Assessment | `PS-24` *(+ `PS-21`–`PS-23`)* | `FR-129`, `FR-130`, `FR-131`, `FR-132` | `BR-17`, `BR-18`, `BR-NEW-02`, `NFR-DOM`, `NFR-AUD` | `AC-F39-01`, `AC-F39-02` | `F-21`, `F-22`, `F-24`, `F-51`, `F-56`–`F-58`, `F-64`, `F-66`, `F-82` \| `OD-11` (`GAP-02`) |

### Module G: Deadlines, Extensions and Late Submissions (`F-40`–`F-44`)

| Feature ID | Feature Name | Source User Story IDs | Functional Requirement IDs | Business Rules & NFRs | Acceptance Criteria IDs | Dependencies & Open Decisions |
|---|---|---|---|---|---|---|
| **F-40** | Deadline Reminder Management | `PS-18`, `ST-24` | `FR-133`, `FR-134`, `FR-135` | `BR-NEW-01`, `NFR-DOM` | `AC-F40-01`, `AC-F40-02` | `F-28`–`F-30`, `F-32`, `F-42`, `F-71`–`F-73`, `F-79` |
| **F-41** | Overdue Submission Monitoring | `PC-16`, `PS-18` | `FR-136`, `FR-137`, `FR-138`, `FR-139` | `BR-03`, `BR-12`, `BR-13`, `BR-NEW-01`, `SEC-12` | `AC-F41-01`, `AC-F41-02` | `F-29`–`F-32`, `F-42`, `F-43`, `F-66`, `F-74`, `F-80` |
| **F-42** | Deadline Extension Management | `ST-25`, `ST-26`, `PS-19`, `PC-17` | `FR-140`, `FR-141`, `FR-142`, `FR-143`, `FR-144` | `BR-15`, `BR-NEW-01`, `NFR-AUD`, `NFR-DOM` | `AC-F42-01`, `AC-F42-02`, `AC-F42-03` | `F-29`, `F-30`, `F-40`, `F-41`, `F-43`, `F-44`, `F-64`, `F-66`, `F-71`–`F-77`, `F-79`, `F-80`, `F-82` |
| **F-43** | Late Submission Recording | `ST-27` | `FR-145`, `FR-146`, `FR-147` | `BR-12`, `BR-13`, `BR-NEW-01`, `DAT-03`, `NFR-DOM` | `AC-F43-01`, `AC-F43-02` | `F-30`, `F-32`, `F-35`, `F-42`, `F-44`, `F-80` |
| **F-44** | Late Submission Penalty Management | `PC-18`, `PC-19`, `ST-27` | `FR-148`, `FR-149`, `FR-150`, `FR-151`, `FR-152` | `BR-13`, `BR-14`, `BR-28`, `NFR-AUD` | `AC-F44-01`, `AC-F44-02`, `AC-F44-03` | `F-30`, `F-32`, `F-43`, `F-51`, `F-58`, `F-64`, `F-66`, `F-72`, `F-82` \| `OD-05` (`GAP-09`) |

### Module H: Examination and Defence Management (`F-46`–`F-50`)

| Feature ID | Feature Name | Source User Story IDs | Functional Requirement IDs | Business Rules & NFRs | Acceptance Criteria IDs | Dependencies & Open Decisions |
|---|---|---|---|---|---|---|
| **F-46** | Project Examiner Appointment | `PC-23` | `FR-153`, `FR-154`, `FR-155`, `FR-156`, `FR-157` | `BR-03`, `BR-16`, `BR-20`, `SEC-13`, `NFR-AUD` | `AC-F46-01`, `AC-F46-02` | `F-13`, `F-14`, `F-21`, `F-24`, `F-27`, `F-47`, `F-48`, `F-50`, `F-64`, `F-66`, `F-71`, `F-72`, `F-82` |
| **F-47** | Examination Panel Configuration | `PC-24` | `FR-158`, `FR-159`, `FR-160` | `BR-03`, `BR-16`, `BR-20`, `NFR-AUD` | `AC-F47-01`, `AC-F47-02` | `F-11`, `F-12`, `F-46`, `F-48`, `F-51`, `F-57`, `F-58`, `F-66`, `F-82` |
| **F-48** | Examiner Eligibility and Independence Enforcement | `PC-25`, `PE-12`, `PE-13` | `FR-161`, `FR-162`, `FR-163`, `FR-164` | `BR-02`, `BR-16`, `BR-17`, `SEC-13` | `AC-F48-01`, `AC-F48-02`, `AC-F48-03` | `F-24`, `F-27`, `F-46`, `F-47`, `F-50`, `F-52`–`F-56`, `F-66`, `F-77`, `F-82` |
| **F-49** | Defence Scheduling | `PC-28`, `PC-29`, `PE-03`, `ST-30` | `FR-165`, `FR-166`, `FR-167`, `FR-168` | `BR-03`, `BR-NEW-01`, `NFR-DOM`, `NFR-AUD` | `AC-F49-01`, `AC-F49-02`, `AC-F49-03` | `F-12`, `F-21`, `F-28`, `F-36`, `F-46`, `F-47`, `F-64`, `F-66`, `F-71`–`F-73`, `F-82` |
| **F-50** | Examination Material Access | `PE-01`, `PE-02` | `FR-169`, `FR-170`, `FR-171` | `BR-02`, `BR-17`, `SEC-13`, `DAT-06` | `AC-F50-01`, `AC-F50-02`, `AC-F50-03` | `F-21`, `F-32`, `F-46`, `F-48`, `F-49`, `F-51`, `F-64`, `F-66`, `F-77` |

### Module I: Assessment and Grading (`F-51`–`F-58`)

| Feature ID | Feature Name | Source User Story IDs | Functional Requirement IDs | Business Rules & NFRs | Acceptance Criteria IDs | Dependencies & Open Decisions |
|---|---|---|---|---|---|---|
| **F-51** | Assessment Structure Configuration | `PC-26` | `FR-172`, `FR-173`, `FR-174`, `FR-175`, `FR-176`, `FR-177` | `BR-03`, `BR-17`, `BR-18`, `BR-19`, `NFR-DOM`, `NFR-AUD` | `AC-F51-01`, `AC-F51-02`, `AC-F51-03` | `F-11`, `F-12`, `F-15`, `F-64`, `F-66`, `F-82` \| `OD-08` (`GAP-01`), `OD-11` |
| **F-52** | Examiner Document Assessment | `PE-04` | `FR-178`, `FR-179`, `FR-180` | `BR-16`, `BR-17`, `BR-NEW-02`, `SEC-13`, `NFR-DOM` | `AC-F52-01`, `AC-F52-02` | `F-32`, `F-46`, `F-48`, `F-50`, `F-51`, `F-54`, `F-55`, `F-64`, `F-66` |
| **F-53** | Examiner Defence Assessment | `PE-05` | `FR-181`, `FR-182`, `FR-183` | `BR-16`, `BR-17`, `BR-NEW-02`, `SEC-13`, `NFR-DOM` | `AC-F53-01`, `AC-F53-02` | `F-46`, `F-48`, `F-49`, `F-50`, `F-51`, `F-54`, `F-55`, `F-64`, `F-66` |
| **F-54** | Examiner Scoring and Feedback | `PE-06`, `PE-07`, `PE-08` | `FR-184`, `FR-185`, `FR-186` | `BR-17`, `BR-19`, `NFR-DOM`, `NFR-USA` | `AC-F54-01`, `AC-F54-02` | `F-46`, `F-48`, `F-51`, `F-52`, `F-53`, `F-55`, `F-64`, `F-66` |
| **F-55** | Examiner Assessment Submission and Editing | `PE-09`, `PE-10`, `PE-11` | `FR-187`, `FR-188`, `FR-189`, `FR-190`, `FR-191`, `FR-192` | `BR-21`, `BR-NEW-03` (`PROP-03`), `NFR-AUD`, `NFR-USA` | `AC-F55-01`, `AC-F55-02`, `AC-F55-03` | `F-52`–`F-54`, `F-57`–`F-60`, `F-64`, `F-66`, `F-71`, `F-72`, `F-82` |
| **F-56** | Supervisor Performance Assessment | `PS-21`, `PS-22`, `PS-23` *(+ `PS-24`)* | `FR-193`, `FR-194`, `FR-195`, `FR-196`, `FR-197`, `FR-198` | `BR-17`, `BR-18`, `BR-NEW-02`, `BR-NEW-03`, `SEC-12`, `NFR-DOM`, `NFR-AUD` | `AC-F56-01`, `AC-F56-02` | `F-21`, `F-24`, `F-27`, `F-39`, `F-51`, `F-57`, `F-58`, `F-64`, `F-66`, `F-72`, `F-82` \| `OD-07` (`GAP-03`) |
| **F-57** | Assessment Completion Monitoring | `PC-27`, `PC-30`, `PC-33` | `FR-199`, `FR-200`, `FR-201` | `BR-03`, `BR-17` | `AC-F57-01`, `AC-F57-02` | `F-39`, `F-46`, `F-47`, `F-51`–`F-56`, `F-58`–`F-60`, `F-66`, `F-71`, `F-72` |
| **F-58** | Final Assessment Consolidation | `PC-30`, `PC-31` | `FR-202`, `FR-203` | `BR-14`, `BR-17`, `BR-18`, `BR-19`, `BR-NEW-02`, `NFR-DOM` | `AC-F58-01`, `AC-F58-02` | `F-39`, `F-44`, `F-46`, `F-47`, `F-51`–`F-57`, `F-64`, `F-66`, `F-82` \| `OD-08` (`GAP-01`) |

### Module J: Final Results and Project Completion (`F-59`–`F-62`)

| Feature ID | Feature Name | Source User Story IDs | Functional Requirement IDs | Business Rules & NFRs | Acceptance Criteria IDs | Dependencies & Open Decisions |
|---|---|---|---|---|---|---|
| **F-59** | Final Result Approval | `PC-31` | `FR-204`, `FR-205`, `FR-206`, `FR-207` | `BR-03`, `BR-22`, `BR-NEW-03`, `SEC-06`, `NFR-DAT`, `NFR-AUD` | `AC-F59-01`, `AC-F59-02` | `F-39`, `F-55`–`F-58`, `F-64`, `F-66`, `F-82` |
| **F-60** | Programme / Project Result Publication | `PC-32`, `ST-31` | `FR-208`, `FR-209`, `FR-210`, `FR-211`, `FR-212` | `BR-21`, `BR-22`, `BR-23` *(Updated per `mvp-p.md` §8)*, `BR-NEW-02`, `NFR-AUD` | `AC-F60-01`, `AC-F60-02`, `AC-F60-03` | `F-55`, `F-56`, `F-58`, `F-59`, `F-61`, `F-62`, `F-64`, `F-66`, `F-71`–`F-75`, `F-82` |
| **F-61** | Assessment Breakdown Access | `ST-32` | `FR-213`, `FR-214`, `FR-215` | `BR-02`, `BR-25`, `BR-NEW-02`, `SEC-11`, `PER-01` | `AC-F61-01`, `AC-F61-02` | `F-39`, `F-44`, `F-51`–`F-56`, `F-58`, `F-60`, `F-64`, `F-66` |
| **F-62** | Project Completion Tracking | `ST-33` | `FR-216`, `FR-217`, `FR-218` | `BR-10`, `BR-22`, `BR-23`, `SEC-11` | `AC-F62-01`, `AC-F62-02`, `AC-F62-03` | `F-19`, `F-20`, `F-29`, `F-31`–`F-33`, `F-51`, `F-55`, `F-56`, `F-58`–`F-60` |

### Module K: Authentication, Security and Access Control (`F-64`–`F-66`)

| Feature ID | Feature Name | Source User Story IDs | Functional Requirement IDs | Business Rules & NFRs | Acceptance Criteria IDs | Dependencies & Open Decisions |
|---|---|---|---|---|---|---|
| **F-64** | User Authentication | `SYS-01` | `FR-219`, `FR-220`, `FR-221`, `FR-222`, `FR-223`, `FR-224` | `SEC-01`–`SEC-06`, `SEC-08`, `SEC-18`, `SEC-20` | `AC-F64-01`, `AC-F64-02`, `AC-F64-03` | `F-01`, `F-05`, `F-13`, `F-14`, `F-65`, `F-66`, `F-71`, `F-82` \| `OD-15`, `OD-19` |
| **F-65** | Session Management | `SYS-02` | `FR-225`, `FR-226`, `FR-227`, `FR-228` | `BR-01`, `BR-02`, `BR-03`, `SEC-07`, `NFR-USA` | `AC-F65-01`, `AC-F65-02` | `F-01`, `F-05`, `F-13`–`F-15`, `F-64`, `F-66` \| `OD-12` (`NFR-OPEN-01`) |
| **F-66** | Role and Scope-Based Access Control | `SYS-03` | `FR-229`, `FR-230`, `FR-231` | `BR-01`–`BR-03`, `BR-08`, `BR-16`, `BR-17`, `BR-25`, `BR-26`, `SEC-09`–`SEC-16` | `AC-F66-01`, `AC-F66-02` | `F-01`, `F-08`, `F-14`, `F-15`, `F-18`, `F-21`–`F-24`, `F-27`, `F-46`, `F-48`, `F-64`, `F-65`, `F-70`, `F-82` |

### Module L: Subscription Payment Processing (`F-67`–`F-70`)

| Feature ID | Feature Name | Source User Story IDs | Functional Requirement IDs | Business Rules & NFRs | Acceptance Criteria IDs | Dependencies & Open Decisions |
|---|---|---|---|---|---|---|
| **F-67** | Institutional Subscription Payment Processing | `SYS-04` | `FR-232`, `FR-233`, `FR-234`, `FR-235` | `BR-29`, `BR-NEW-04`, `DAT-07`, `DAT-09`, `DAT-10`, `NFR-DOM` | `AC-F67-01`, `AC-F67-02` | `F-01`–`F-03`, `F-68`, `F-69`, `F-82` \| `OD-09`, `OD-18` |
| **F-68** | Payment Event Reception | `SYS-05` | `FR-236`, `FR-237`, `FR-238`, `FR-239` | `BR-NEW-04`, `SEC-17`, `DAT-08`, `DAT-09`, `DAT-10` | `AC-F68-01`, `AC-F68-02` | `F-67`, `F-69`, `F-82` \| `OD-09` |
| **F-69** | Subscription Status Synchronisation | `SYS-06` | `FR-240`, `FR-241`, `FR-242` | `BR-NEW-04`, `DAT-10`, `DAT-11`, `NFR-AUD`, `NFR-MON` | `AC-F69-01`, `AC-F69-02` | `F-02`–`F-04`, `F-67`, `F-68`, `F-70`–`F-72`, `F-82` \| `OD-09` |
| **F-70** | Subscription Access Enforcement | `SYS-07` | `FR-243`, `FR-244`, `FR-245` | `BR-NEW-01`, `NFR-BKP` | `AC-F70-01`, `AC-F70-02` | `F-03`, `F-04`, `F-66`, `F-67`, `F-69`, `F-71`, `F-72`, `F-82` \| `OD-06` (`GAP-10`) |

### Module M: Notification and Communication Infrastructure (`F-71`–`F-75`)

| Feature ID | Feature Name | Source User Story IDs | Functional Requirement IDs | Business Rules & NFRs | Acceptance Criteria IDs | Dependencies & Open Decisions |
|---|---|---|---|---|---|---|
| **F-71** | Transactional Email Delivery | `SYS-08` | `FR-246`, `FR-247`, `FR-248`, `FR-249` | `BR-25`, `BR-NEW-04`, `SEC-14`, `NFR-DOM`, `NFR-MON` | `AC-F71-01`, `AC-F71-02` | `F-72`, `F-73` |
| **F-72** | In-App Notification Generation | `SYS-09` | `FR-250`, `FR-251`, `FR-252` | `BR-01`, `BR-02`, `NFR-DOM`, `PER-01` | `AC-F72-01`, `AC-F72-02` | `F-64`, `F-66`, `F-73` |
| **F-73** | Notification Dispatch | `SYS-10` | `FR-253`, `FR-254`, `FR-255`, `FR-256`, `FR-257` | `BR-NEW-04`, `DAT-08`, `PER-03`, `NFR-DOM`, `NFR-REL`, `NFR-MON` | `AC-F73-01`, `AC-F73-02` | `F-71`, `F-72` |
| **F-74** | Overdue Submission Notifications | `SYS-11` *(+ `PC-16`, `PS-18`)* | `FR-258`, `FR-259` | `BR-NEW-01`, `DAT-08`, `NFR-DOM` | `AC-F74-01`, `AC-F74-02` | `F-30`, `F-41`, `F-42`, `F-71`–`F-73`, `F-80` |
| **F-75** | Academic Decision and Submission Notifications | `SYS-12`, `PS-17`, `ST-23` | `FR-260`, `FR-261` | `BR-NEW-04`, `NFR-DOM` | `AC-F75-01`, `AC-F75-02` | `F-20`, `F-24`, `F-27`, `F-32`–`F-35`, `F-42`, `F-49`, `F-60`, `F-71`–`F-73` |

### Module N: Document Storage and Retrieval (`F-76`–`F-78`)

| Feature ID | Feature Name | Source User Story IDs | Functional Requirement IDs | Business Rules & NFRs | Acceptance Criteria IDs | Dependencies & Open Decisions |
|---|---|---|---|---|---|---|
| **F-76** | Secure Document Storage | `SYS-13` | `FR-262`, `FR-263`, `FR-264`, `FR-265` | `BR-01`, `BR-NEW-04`, `SEC-09`, `SEC-17`–`SEC-19`, `NFR-SEC`, `DAT-03`, `DAT-05` | `AC-F76-01`, `AC-F76-02` | `F-64`, `F-66`, `F-77`, `F-78` \| `OD-15` |
| **F-77** | Authorised Document Retrieval | `SYS-14` | `FR-266`, `FR-267`, `FR-268` | `BR-01`–`BR-03`, `BR-17`, `BR-25`, `DAT-06`, `SEC-11`–`SEC-15`, `SEC-17` | `AC-F77-01`, `AC-F77-02`, `AC-F77-03` | `F-08`, `F-18`, `F-64`–`F-66`, `F-76`, `F-78`, `F-82` \| `OD-21` |
| **F-78** | Document Version Preservation | `SYS-15` | `FR-269`, `FR-270`, `FR-271` | `BR-11`, `DAT-01`, `DAT-02`, `NFR-BKP` | `AC-F78-01`, `AC-F78-02` | `F-76`, `F-77` \| `OD-10` |

### Module O: Scheduling and Background Processes (`F-79`, `F-80`)

| Feature ID | Feature Name | Source User Story IDs | Functional Requirement IDs | Business Rules & NFRs | Acceptance Criteria IDs | Dependencies & Open Decisions |
|---|---|---|---|---|---|---|
| **F-79** | Deadline Reminder Scheduling | `SYS-16` | `FR-272`, `FR-273`, `FR-274`, `FR-275` | `BR-NEW-01`, `DAT-08`, `NFR-DOM`, `NFR-REL`, `NFR-MON` | `AC-F79-01`, `AC-F79-02` | `F-29`, `F-30`, `F-32`, `F-40`, `F-42`, `F-73` |
| **F-80** | Missed Deadline Detection | `SYS-17` | `FR-276`, `FR-277`, `FR-278` | `BR-12`, `BR-NEW-01`, `NFR-DOM`, `NFR-REL`, `NFR-MON` | `AC-F80-01`, `AC-F80-02` | `F-29`, `F-30`, `F-32`, `F-41`–`F-44`, `F-74` |

### Module P: Audit and Backup Infrastructure (`F-82`, `F-83`)

| Feature ID | Feature Name | Source User Story IDs | Functional Requirement IDs | Business Rules & NFRs | Acceptance Criteria IDs | Dependencies & Open Decisions |
|---|---|---|---|---|---|---|
| **F-82** | Administrative and Critical Academic Audit Logging | `SYS-19` | `FR-279`, `FR-280`, `FR-281`, `FR-282`, `FR-283`, `FR-284` | `BR-01`–`BR-03`, `BR-25`, `BR-28`, `NFR-AUD` | `AC-F82-01`, `AC-F82-02`, `AC-F82-03` | `F-64`, `F-66`, All P0 Features \| `OD-16` (`NFR-OPEN-05`) |
| **F-83** | Data Backup and Recovery | `SYS-20` | `FR-285`, `FR-286`, `FR-287`, `FR-288`, `FR-289`, `FR-290` | `SEC-17`–`SEC-19`, `REL-06`–`REL-10`, `NFR-BKP`, `NFR-MON` | `AC-F83-01`, `AC-F83-02`, `AC-F83-03` | `F-76`, `F-78`, `F-82` \| `OD-10`, `OD-14`, `OD-15`, `OD-17`, `OD-21` |

---

## 3. Explicit Register of Deferred Features (Excluded from MVP Traceability)

To confirm that no P1 or P2 feature was silently introduced into the MVP, the 8 deferred features from `features.md` and `mvp-p.md` §5–§6 are accounted for below:

| Deferred Feature ID | Feature Name | Priority | Associated Deferred User Stories & Rules | Disposition |
|---|---|---|---|---|
| **F-06** | Global Platform Configuration | **P1 (Post-MVP)** | `PA-09` | Excluded from MVP (`mvp-p.md` §5). |
| **F-07** | Platform Support Management | **P2 (Optional)** | `PA-10` | Excluded from MVP (`mvp-p.md` §6, §10). |
| **F-17** | Institutional Project Oversight | **P1 (Post-MVP)** | `IA-11` | Excluded from MVP (`mvp-p.md` §5). |
| **F-25** | Supervisor Workload Monitoring | **P1 (Post-MVP)** | `PC-10` | Excluded from MVP (`mvp-p.md` §5). |
| **F-26** | Supervisor Workload Limit Management | **P1 (Post-MVP)** | `PC-11` | Excluded from MVP (`mvp-p.md` §5). |
| **F-45** | Project Withdrawal Management | **P1 (Post-MVP)** | `PC-22`, `ST-28`, `ST-29` | Excluded from MVP (`mvp-p.md` §5). |
| **F-63** | Incomplete Project Carry-Forward | **P1 (Post-MVP)** | `SYS-18`, `BR-24` | Excluded from MVP (`mvp-p.md` §5). |
| **F-81** | Academic Session Carry-Forward Processing | **P1 (Post-MVP)** | `SYS-18`, `BR-24` | Excluded from MVP (`mvp-p.md` §5). |

---

## 4. Stage 6 — Final Consistency and Implementation-Readiness Audit

A comprehensive cross-document consistency audit was performed across all generated deliverables (`mvp-features.md` Parts 1–4, `functional-requirements.md`, `business-rules.md`, `acceptance-criteria.md`, `mvp-nfrs.md`, `mvp-open-decisions.md`, and `mvp-traceability.md`):

### 4.1 Audit Verification Checklist

1. **Completeness of P0 Scope (75 / 75 Features):**
   * *Verified:* Every approved P0 feature in `mvp-p.md` §4 (`F-01`–`F-05`, `F-08`–`F-16`, `F-18`–`F-24`, `F-27`–`F-44`, `F-46`–`F-62`, `F-64`–`F-80`, `F-82`–`F-83`) has a complete 9-part specification (`A` through `I`), unique functional requirements (`FR-001`–`FR-290`), and testable Given/When/Then acceptance criteria (`AC-F01-01`–`AC-F83-03`).
2. **Zero Silent Promotion of P1/P2 or Excluded Capabilities:**
   * *Verified:* None of the 8 deferred features (`F-06`, `F-07`, `F-17`, `F-25`, `F-26`, `F-45`, `F-63`, `F-81`) or explicit exclusions (native mobile apps, External Examiner accounts, plagiarism checking, student project payments, general-purpose chat, push/SMS notifications, real-time collaborative editing) have been included in the P0 requirements.
3. **Requirement Numbering & Gap Check (`functional-requirements.md`):**
   * *Audit Note:* In `functional-requirements.md` Module O/P, `FR-276` through `FR-279` (specified in `mvp-features-part4.md` under `F-80` Missed Deadline Detection and `F-82` Administrative Audit Logging) are cross-referenced below so the consolidated table has zero numbering gaps:
     * **FR-276 (`F-80`):** The Missed Deadline Detection background service (`SYS-17`) must evaluate active milestones (`F-29`) across all `Active` Academic Sessions (`F-12`) against the authoritative server clock in each institution's configured timezone (`NFR-DOM`).
     * **FR-277 (`F-80`):** When `Current Time > Effective Deadline Timestamp` (plus any configured grace buffer `F-44`) and a project's milestone status is still `Unlocked / Not Submitted`, `F-80` must atomically mark the project milestone as `Overdue` in `F-41`, emit an idempotent `MissedDeadlineDetected` event to `F-74` (`SYS-11`), and enable the Late Submission workflow (`F-43`, `F-44`, `BR-12`).
     * **FR-278 (`F-80`):** In accordance with `NFR-REL: Background processes`, `F-80` must be idempotent, monitored continuously (`NFR-MON`), and capable of automatic catch-up recovery if a scheduled run is delayed or fails.
     * **FR-279 (`F-82`):** The Audit Process (`SYS-19`, `NFR-AUD`) must automatically record an immutable audit log entry for every **Administrative Activity** (institutional account changes `F-01`/`F-12`, subscription/plan/billing/grace-period/payment events `F-02`–`F-04`/`F-67`–`F-70`, Platform Admin management and restricted support access `F-05`/`F-08`, academic structure changes `F-09`–`F-12`, user/role/coordinator/supervisor management `F-13`–`F-16`, and security lockout/access-denied events `F-64`/`F-66`/`F-77`).
4. **Alignment of Superseding MVP Decisions:**
   * *Result Publication (`F-60`, `BR-23`):* Consistently specified across all documents as atomic **project-level result publication** without blocking on other pending projects in the programme (`mvp-p.md` §8).
   * *Group Grading (`F-39`, `F-52`–`F-58`, `F-61`, `BR-NEW-02`):* Consistently specified as a **shared Examiner project assessment** (Document + Defence) combined with **individual Supervisor performance scores** (default $30\text{ marks}$ `BR-18`), producing individually calculated and privately displayed final results per group member (`mvp-p.md` §7).
   * *Responsive Web Delivery (`USA-01`, `USA-04`):* Consistently applied across all six human actor roles for the MVP (`mvp-p.md` §2.1, §9).
5. **Preservation of Open Decisions (`OD-01`–`OD-22`):**
   * *Verified:* All 10 mandatory policy decisions and 12 operational/NFR open decisions are explicitly tracked in `mvp-open-decisions.md` and referenced by ID in the corresponding functional requirements without inventing unapproved policy rules.

---

**End of Document — Clario MVP Feature Specification and Implementation Readiness Package Complete**