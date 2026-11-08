# Clario MVP Implementation Prompts

These prompts are intended for implementing one feature at a time. Every prompt sent to the coding agent should be standalone and copy-paste-ready. It should include the applicable project context, the feature scope, and exactly one implementation stage.

Do not make the reviewer combine a global prompt, feature prompt, and stage prompt manually.

Each feature is divided into:

1. Route and authentication
2. Validation with Zod
3. Business logic checks
4. Database action
5. Response mapping
6. Tests and acceptance-criteria verification

Use one complete feature-stage prompt only after the previous stage for that feature has been completed and reviewed.

## Standalone prompt format

The following is the required format for every prompt in this document:

```text
[Project context]

[One feature with real Clario values]

[One implementation stage]

[Explicit exclusions and tests]
```

## Complete example: F-19 Stage 1

Copy and send the following as one prompt:

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement F-19 Student Project Registration.

Register a student against:
- one institution;
- one programme;
- one academic session.

The uniqueness boundary is student + programme + academic session, not student globally.

Enforce:
- STUDENT or authorised coordinator access;
- active programme and session;
- no duplicate registration in the same scope;
- coordinator appointment scope;
- audit and notification outbox events.

Cover AC-F19-01 through AC-F19-03.

Implement only Stage 1: Route and authentication.

Add the documented Express route for F-19 and enforce:
- the required authenticated role;
- verified MFA where required;
- institution scope;
- programme/session scope;
- coordinator appointment scope for coordinator requests;
- X-Clario-Active-Role when required;
- X-Clario-Coordinator-Appointment-Id for coordinator routes.

Do not implement:
- Zod request or response validation;
- project-registration business rules;
- duplicate-registration checks;
- programme or session database writes;
- audit or outbox persistence;
- response mapping beyond the repository-standard route placeholder.

Add focused route-level authorization tests covering:
- an unauthenticated request;
- a student request within the correct institution and academic scope;
- an authorized coordinator request with a valid appointment;
- a coordinator request without X-Clario-Coordinator-Appointment-Id;
- a cross-tenant request;
- a coordinator request for a different programme/session.

Do not implement later stages or unrelated features.
```

Every numbered prompt below is standalone and copy-paste-ready. The reviewer should copy one numbered prompt at a time; no global instruction or stage fragment needs to be added manually.

## Global instruction

Prepend this instruction to every prompt:

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Implement only the requested stage. Do not implement later stages, unrelated features, frontend work, refactors, or speculative abstractions.

Preserve:
- strict institution tenant isolation;
- PostgreSQL RLS;
- UTC timestamp persistence;
- institution timezone evaluation;
- audit logging;
- transactional integrity;
- documented error codes;
- idempotency requirements;
- existing API contracts.

Add focused tests for the requested stage.
```

---

# Slice 0: Platform foundation

## Prompt 0.1: Repository foundation

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Set up the Clario MVP monorepo foundation.

Create:
- /client as a Next.js TypeScript application;
- /backend as an Express TypeScript API;
- /shared for shared enums, Zod schemas, DTOs, and domain constants;
- /infrastructure for migrations and operational configuration.

Configure Prisma for PostgreSQL 16, Redis/BullMQ, environment validation, structured logging, request correlation IDs, RFC 9457 error handling, and the existing test framework.

Add only:
- GET /health;
- database connectivity check;
- Redis connectivity check;
- typed configuration loading;
- a minimal CI-safe test setup.

Do not implement authentication or business features yet.
```

## Prompt 0.2: Database and tenant context

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement the database foundation required by Clario’s schema.

Reconcile Prisma with clario_mvp_schema.sql without weakening its constraints. Support reviewed SQL migrations for:
- PostgreSQL extensions;
- database roles;
- RLS policies;
- triggers;
- tenant-scoped indexes;
- audit immutability.

Implement a transaction helper that sets:
- app.current_institution_id;
- app.is_platform_admin;
- active role context;
- active coordinator appointment context.

Add tests proving that a tenant-scoped query cannot access another institution’s records.
```

## Prompt 0.3: Shared contracts

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Complete the shared contract foundation using clario_mvp_shared_contracts.ts.

Expose shared types and schemas for:
- RoleCode;
- TenantStatus;
- SubscriptionStatus;
- ProjectLifecycleStatus;
- TopicProposalStatus;
- ProjectMilestoneState;
- AssessmentSubmissionStatus;
- ResultApprovalStatus;
- RFC 9457 errors;
- cursor pagination;
- UTC timestamps;
- NGN amounts in kobo;
- allowed file types and the 50 MB limit.

Do not add feature-specific contracts that are not present in the API specification.
```

---

# Slice 1: F-64, F-65 and F-66 — Authentication and access control

## Prompt 1.1: F-64 route and authentication

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement the route and authentication layer for F-64 User Authentication.

Implement:
- POST /api/v1/auth/login;
- POST /api/v1/auth/activate;
- POST /api/v1/auth/logout;
- POST /api/v1/auth/session/heartbeat.

Authentication must support email or institutional identifier, institution code, password verification, rate limiting, adaptive temporary lockout, server-side Redis sessions, and role discovery.

Implement session middleware for protected routes using either:
- Cookie: clario_sid;
- Authorization header.

Do not implement MFA, Zod schemas, domain checks, database writes beyond session persistence, or final response mapping yet.
```

## Prompt 1.2: F-64 validation

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Add Zod validation for F-64 authentication routes.

Validate:
- login identifier;
- institution_code;
- password;
- account activation token;
- activation password with minimum length 12;
- heartbeat request;
- logout request if a request body is used.

Reject unknown fields and malformed values. Use the documented RFC 9457 error format.

Add tests for:
- valid login;
- missing identifier;
- invalid institution code;
- password shorter than 12 characters;
- malformed activation token;
- unknown request fields.
```

## Prompt 1.3: F-64 business logic

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement the business-logic checks for F-64 User Authentication.

Enforce:
- invited accounts can be activated only once;
- deactivated accounts cannot authenticate;
- invalid credentials use the standard authentication error without revealing whether the identifier exists;
- repeated failures trigger the documented temporary lockout;
- password reset and logout revoke sessions as required;
- PLATFORM_ADMIN, INSTITUTIONAL_ADMIN, and PROJECT_COORDINATOR roles require MFA before full access.

Do not implement MFA enrollment itself. Add unit tests for active, invited, deactivated, locked, and invalid-login states.
```

## Prompt 1.4: F-64 database action

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement persistence for F-64 User Authentication.

Use the existing users, sessions, password-reset, and account-status schema. Persist:
- password hashes;
- account activation state;
- session ID;
- user ID;
- institution ID;
- active role;
- MFA state;
- creation, expiry, heartbeat, and revocation timestamps.

Store sessions in Redis as required by the architecture and persist only the required audit/session metadata in PostgreSQL.

Add integration tests for session creation, expiry, revocation, and password-reset session invalidation.
```

## Prompt 1.5: F-64 response

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement response mapping for F-64 User Authentication.

For POST /api/v1/auth/login return:
- session_id;
- user id;
- full_name;
- institution_id;
- institution_code;
- timezone_iana;
- roles;
- coordinator_appointments;
- mfa_required;
- mfa_enrolled;
- mfa_verified;
- next_step;
- inactivity_timeout_minutes.

Return the documented status codes and RFC 9457 errors. Set the institution timezone response header on tenant responses.
```

## Prompt 1.6: F-65 MFA and session context

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement F-65 Session Management and MFA routes:

- POST /api/v1/auth/mfa/enroll;
- POST /api/v1/auth/mfa/verify;
- PUT /api/v1/auth/session/context.

Support TOTP enrollment, QR provisioning URI, ten recovery codes, recovery-code consumption, active-role selection, and active coordinator appointment selection.

A coordinator context must bind one appointment containing exactly one programme and one academic session.

Administrative roles requiring MFA are:
- PLATFORM_ADMIN;
- INSTITUTIONAL_ADMIN;
- PROJECT_COORDINATOR.
```

## Prompt 1.7: F-66 policy enforcement

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement F-66 Policy Enforcement Point middleware.

Every protected tenant route must enforce these gates in order:

1. valid server-side session;
2. active role;
3. MFA where required;
4. tenant and programme/session scope;
5. subscription permission policy.

Require X-Clario-Active-Role when the user has multiple roles. Require X-Clario-Coordinator-Appointment-Id on coordinator routes.

Implement documented errors:
- 401 UNAUTHORIZED_SESSION;
- 403 MFA_ENROLLMENT_REQUIRED;
- 403 OUT_OF_ASSIGNMENT_SCOPE;
- 402 SUBSCRIPTION_EXPIRED_RESTRICTED;
- 403 CONFIDENTIAL_ACADEMIC_RECORD_BLOCKED.
```

---

# Slice 2: Platform administration

## Prompt 2.1: F-01 Institutional Account Management

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement F-01 Institutional Account Management for:

- GET /api/v1/platform/institutions;
- POST /api/v1/platform/institutions;
- GET /api/v1/platform/institutions/{institution_id};
- PATCH /api/v1/platform/institutions/{institution_id};
- POST /api/v1/platform/institutions/{institution_id}/status;
- POST /api/v1/platform/institutions/{institution_id}/exports.

Only PLATFORM_ADMIN with verified MFA may access these routes.

Enforce AC-F01-01 through AC-F01-04:
- unique institution name and code;
- default timezone Africa/Lagos;
- valid primary contact;
- required suspension/termination reason;
- audit entry;
- onboarding invitation;
- denial for non-platform administrators.
```

## Prompt 2.2: F-02 Subscription Plan Management

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement F-02 Subscription Plan Management.

Implement the documented plan-management endpoints for PLATFORM_ADMIN with verified MFA.

Store NGN amounts as integer kobo. Enforce:
- active, draft, and archived plan states;
- positive plan price;
- valid billing intervals;
- maximum user capacity;
- archived plans cannot be selected for new subscriptions;
- existing subscriptions remain unaffected by plan archival.

Cover AC-F02-01 and AC-F02-02.
```

## Prompt 2.3: F-03 and F-04 subscription state

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement F-03 Institutional Subscription and Billing Management and F-04 Subscription Grace Period Management.

Support:
- institutional billing profile updates;
- plan selection;
- pending payment transaction creation;
- active, grace-period, expired, and cancelled subscription states;
- configurable 14-day default grace period;
- institution timezone-aware grace-period timestamps.

Enforce AC-F03-01 through AC-F04-02 and preserve payment audit records.
```

## Prompt 2.4: F-05 Platform Administrator Management

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement F-05 Platform Administrator Management.

Support platform-admin invitations, activation, deactivation, MFA enforcement, and administrator listing.

Enforce:
- only PLATFORM_ADMIN with verified MFA may mutate platform administrators;
- an administrator cannot deactivate their own account;
- the last active platform administrator cannot be deactivated;
- invitations create audit and notification outbox events;
- confidential academic records remain inaccessible.

Cover AC-F05-01 and AC-F05-02.
```

## Prompt 2.5: F-08 Academic Information Confidentiality

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement F-08 Institutional Academic Data Protection.

Block PLATFORM_ADMIN and INSTITUTIONAL_ADMIN from accessing:
- project rationales;
- project documents;
- supervisor feedback and discussions;
- examiner grading sheets;
- student grades.

Return 403 CONFIDENTIAL_ACADEMIC_RECORD_BLOCKED and create an audit record for denied attempts.

Permit only documented restricted archive-export actions with a valid institutional request reference. Cover AC-F08-01 and AC-F08-02.
```

---

# Slice 3: Institutional administration

## Prompt 3.1: F-09, F-10, F-11 and F-12

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement the institutional academic hierarchy features:

- F-09 Faculty Management;
- F-10 Department Management;
- F-11 Programme Management;
- F-12 Academic Session Management.

Only INSTITUTIONAL_ADMIN with verified MFA may mutate these resources.

Enforce:
- institution-scoped uniqueness;
- active parent requirement;
- archived parent rejection;
- valid session date ranges;
- valid session status transitions;
- prevention of archiving entities with active children or active session projects;
- audit logging.

Cover AC-F09-01 through AC-F12-03.
```

## Prompt 3.2: F-13, F-14, F-15 and F-16

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement:

- F-13 Institutional User Management;
- F-14 Institutional Role and Permission Management;
- F-15 Project Coordinator Appointment;
- F-16 Supervisor Records Management.

Enforce:
- institution-scoped users and roles;
- valid role codes;
- mandatory MFA for administrative roles;
- one coordinator appointment per programme/session scope;
- supervisor eligibility states;
- no cross-tenant assignment;
- invitation and audit events.

Cover AC-F13-01 through AC-F16-02.
```

## Prompt 3.3: F-18 confidentiality

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement F-18 Academic Information Confidentiality for institutional administrators.

Allow INSTITUTIONAL_ADMIN to view permitted academic metadata only. Block access to:
- topic proposal rationales;
- project documents;
- supervisor feedback;
- discussions;
- grades;
- examiner assessment details.

Apply the confidentiality guard consistently to direct endpoints, nested resources, list endpoints, and document retrieval. Add denied-access audit tests.
```

---

# Slice 4: Project registration and allocation

## Prompt 4.1: F-19 Student Project Registration

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement F-19 Student Project Registration.

Register a student against:
- one institution;
- one programme;
- one academic session.

The uniqueness boundary is student + programme + academic session, not student globally.

Enforce:
- STUDENT or authorised coordinator access;
- active programme and session;
- no duplicate registration in the same scope;
- coordinator appointment scope;
- audit and notification outbox events.

Cover AC-F19-01 through AC-F19-03.
```

## Prompt 4.2: F-20 Topic Proposal and Review

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement F-20 Project Topic Proposal and Review Management.

Support the documented student submission and supervisor/coordinator review routes.

Enforce:
- topic proposal precedes supervisor assignment;
- only the student or designated group submitter can submit;
- proposal states:
  SUBMITTED_AWAITING_SUPERVISOR,
  UNDER_SUPERVISOR_REVIEW,
  APPROVED,
  REJECTED,
  ALTERNATIVE_SUGGESTED,
  SUPERSEDED;
- proposal rationale confidentiality;
- audit history;
- notification outbox events.

Use the approved configurable behavior for alternative-topic acceptance from OD-02.
```

## Prompt 4.3: F-21, F-22 and F-23

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement:

- F-21 Project Allocation Management;
- F-22 Project Group Management;
- F-23 Group Submission Authority Management.

Only PROJECT_COORDINATOR within the active appointment scope may create projects, groups, memberships, and designated submitters.

Enforce:
- individual or group project type;
- minimum group size of 2;
- students cannot self-create or transfer groups;
- designated submitter-only formal submissions;
- append-only membership history;
- audited coordinator changes;
- OD-01’s fixed-membership default with a future administrative override boundary.

Cover AC-F21-01 through AC-F23-03.
```

## Prompt 4.4: F-24 and F-27

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement:

- F-24 Supervisor Assignment Management;
- F-27 Supervisor Reassignment.

Enforce:
- approved or submitted topic before assignment;
- supervisor eligibility AVAILABLE;
- coordinator appointment scope;
- current assignment uniqueness;
- historical supervision ledger;
- reassignment preserves prior history;
- reassigned supervisors remain recorded as former supervisors;
- all mutations are audited.

Cover AC-F24-01, AC-F24-02, AC-F27-01, and AC-F27-02.
```

---

# Slice 5: Project workspace and submissions

## Prompt 5.1: F-28, F-29 and F-31

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement:

- F-28 Project Workspace;
- F-29 Milestone Configuration;
- F-31 Project Progress Tracking.

Enforce project visibility by:
- institution;
- programme/session;
- project membership;
- supervisor assignment;
- coordinator appointment.

Implement milestone states:
- LOCKED;
- IN_PROGRESS_NOT_SUBMITTED;
- SUBMITTED_AWAITING_REVIEW;
- REVISIONS_REQUESTED;
- REJECTED;
- APPROVED.

Milestone 1 requires an approved topic proposal. Each later milestone requires the previous milestone to be approved.
```

## Prompt 5.2: F-32, F-33, F-34 and F-35

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement:

- F-32 Formal Submission;
- F-33 Milestone Review;
- F-34 Feedback and Discussions;
- F-35 Document Version Management.

Enforce:
- Idempotency-Key on formal submission POST routes;
- designated submitter-only formal group submissions;
- sequential milestone gating;
- late submissions remain possible while the session is active;
- supervisor decisions APPROVED, REVISIONS_REQUESTED, or REJECTED;
- revised submissions create new versions;
- previous versions cannot be deleted;
- confidential academic access restrictions;
- audit and outbox events.
```

---

# Slice 6: Collaboration, deadlines and penalties

## Prompt 6.1: F-36, F-37 and F-38

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement:

- F-36 Shared Group Workspace;
- F-37 Shared Working Documents;
- F-38 Group Collaboration and Review.

Allow group members to collaborate on working files without granting them formal-submission authority.

Enforce:
- group membership scope;
- project scope;
- document category restrictions;
- version preservation;
- no access after removal from the group unless the policy explicitly permits historical access;
- no access to confidential supervisor or examiner material.
```

## Prompt 6.2: F-39 Supervisor Performance Assessment

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement F-39 Supervisor Performance Assessment.

For group projects, bind the supervisor assessment to:
- project_id;
- student_user_id.

Do not bind supervisor performance scores only to project_id.

Enforce:
- supervisor assignment;
- individual student result scope;
- default supervisor allocation of 30 marks;
- independent assessment from examiner scores;
- assessment deadline configuration;
- assessment edit rules before publication;
- audit history.
```

## Prompt 6.3: F-40, F-41, F-42, F-43 and F-44

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement:

- F-40 Deadline Configuration;
- F-41 Deadline Monitoring;
- F-42 Deadline Extension Requests;
- F-43 Late Submission Recording;
- F-44 Late Penalty Calculation.

Use UTC persistence and Africa/Lagos timezone evaluation by default.

Use these approved defaults:
- supervisor assessment deadline: 7 calendar days after final submission;
- subscription grace period: 14 days;
- late penalty default: zero deduction until configured;
- supported modes: disabled/advisory, flat marks per day, percentage per day, fixed flat deduction.

Enforce student request -> supervisor recommendation -> coordinator approval for extensions. Record late status and penalty changes in the audit log.
```

---

# Slice 7: Examination and defence

## Prompt 7.1: F-46, F-47 and F-48

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement:

- F-46 Examiner Appointment;
- F-47 Examination Panel;
- F-48 Examiner Conflict-of-Interest Protection.

A PROJECT_COORDINATOR may appoint one or more PROJECT_EXAMINER accounts.

Before insertion, check project_supervision_history. Reject both:
- current supervisors;
- former/reassigned supervisors.

Use error code:
409 BR_16_EXAMINER_SUPERVISOR_CONFLICT.

All examiners must be scoped to the institution and project. Add tests for current, former, unrelated, cross-tenant, and duplicate appointments.
```

## Prompt 7.2: F-49 and F-50

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement:

- F-49 Defence Scheduling;
- F-50 Examination Material Access.

Enforce:
- project and appointment scope;
- valid defence schedule states SCHEDULED, RESCHEDULED, COMPLETED;
- examiner access only to permitted examination materials;
- examiners cannot view supervisor assessments, co-examiner scores, or intermediate supervisor feedback;
- institutional and platform administrators cannot access confidential academic material.

Cover the relevant F-49/F-50 acceptance criteria and denied-access audit logging.
```

---

# Slice 8: Assessment and grading

## Prompt 8.1: F-51 and F-52

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement:

- F-51 Assessment Structure Configuration;
- F-52 Examiner Criteria and Weighting Configuration.

Allow the coordinator to configure:
- grading categories;
- criteria;
- maximum marks;
- weightings;
- pass mark;
- examiner consolidation method;
- rounding mode.

Use NUMERIC(10,4) for intermediate calculations and preserve calculation version metadata.

The default supervisor allocation is 30.0000 out of 100.0000.
```

## Prompt 8.2: F-53, F-54 and F-55

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement:

- F-53 Examiner Assessment;
- F-54 Examiner Panel Consolidation;
- F-55 Examiner Assessment Submission and Editing.

For group projects, examiner assessments must bind to project_id and be shared across group members.

Support:
- one or more examiners;
- arithmetic mean;
- weighted panel;
- coordinator-resolved consolidation;
- examiner blind grading;
- draft and submitted states;
- editing until publication;
- no edits after publication.

Preserve intermediate score precision and record assessment audit history.
```

## Prompt 8.3: F-56, F-57 and F-58

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement:

- F-56 Supervisor Assessment Submission;
- F-57 Assessment Completion Monitoring;
- F-58 Consolidated Student Results.

For each student, calculate the result using:
- the shared project examiner result;
- that student’s individual supervisor performance result;
- configured grading weights;
- configured late penalty;
- configured rounding mode.

Do not expose examiner scores to supervisors or supervisor scores to examiners.

Block consolidation while any required assessment is incomplete.
```

---

# Slice 9: Approval, publication and completion

## Prompt 9.1: F-59 Final Result Approval

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement F-59 Coordinator Final Result Approval.

Require:
- all required examiner assessments submitted;
- all required supervisor assessments submitted;
- successful result consolidation;
- active coordinator appointment;
- project-level scope.

Use a transaction with row locks on the project and all associated assessments.

Transition only valid result states:
- CONSOLIDATED_PENDING_APPROVAL;
- APPROVED_READY_FOR_PUBLICATION;
- PENDING_COORDINATOR_REAPPROVAL;
- PUBLISHED.

Record the approval action in the immutable audit log.
```

## Prompt 9.2: F-60, F-61 and F-62

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement:

- F-60 Project-Level Result Publication;
- F-61 Student Result Access;
- F-62 Project Completion Tracking.

Publication must be atomic for one project and must not wait for other incomplete projects in the programme.

Lock:
- the project;
- examiner assessments;
- supervisor assessments;
- consolidated student results.

After publication:
- assessments become locked;
- results become visible only to permitted actors;
- project completion state updates atomically;
- audit and notification outbox events are created.

Use error code:
409 BR_21_ASSESSMENT_LOCKED_POST_PUBLICATION.
```

---

# Slice 10: Payments and subscription enforcement

## Prompt 10.1: F-67 and F-68

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement:

- F-67 Payment Initiation;
- F-68 Payment Webhook Verification.

Use the Paystack provider adapter.

Payment initiation must require Idempotency-Key and create one pending transaction per unique idempotency key.

Webhook processing must:
1. verify X-Paystack-Signature using HMAC before parsing the payload;
2. identify duplicate gateway events;
3. persist the raw event identity;
4. transition the payment transaction safely;
5. create reconciliation failures when local and gateway states disagree;
6. write audit records.

Invalid signatures must not mutate payment or subscription state.
```

## Prompt 10.2: F-69 and F-70

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement:

- F-69 Institutional Subscription State Management;
- F-70 Subscription Access Enforcement.

Use these states:
- PENDING_PAYMENT;
- ACTIVE;
- GRACE_PERIOD;
- EXPIRED;
- CANCELLED.

During GRACE_PERIOD:
- preserve full academic access;
- show renewal warnings;
- retain billing access.

During EXPIRED:
- allow read-only academic access;
- block submissions, assessments, and administrative mutations;
- preserve Institutional Admin billing access;
- preserve Platform Admin subscription-management access.

Implement the policy centrally in the PEP, not in individual controllers.
```

---

# Slice 11: Notifications and background workers

## Prompt 11.1: Transactional outbox

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement the transactional outbox required by F-71 through F-75.

When an academic, administrative, payment, or security transaction creates a notification, write the outbox event in the same database transaction.

Implement:
- event type;
- aggregate type and ID;
- institution ID;
- recipient;
- payload;
- delivery channel;
- retry count;
- dispatch status.

Do not send email directly from request handlers.
```

## Prompt 11.2: F-71 through F-75

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement:

- F-71 Email Notifications;
- F-72 In-App Notifications;
- F-73 Notification Templates;
- F-74 Notification Preferences;
- F-75 Notification Delivery Tracking.

Use Amazon SES through an email adapter.

Workers must be:
- idempotent;
- retryable;
- observable;
- safe against duplicate delivery;
- isolated from academic transactions.

Track delivered, bounced, complained, failed, retry-scheduled, and dead-letter states.
```

## Prompt 11.3: F-79 and F-80

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement:

- F-79 Deadline Reminder Processing;
- F-80 Overdue Transition Processing.

Use BullMQ workers and institution-configured IANA timezones.

Implement idempotent jobs for:
- upcoming deadline reminders;
- supervisor assessment reminders;
- late-submission detection;
- overdue state transitions.

A failed notification must not roll back a deadline or academic-state transition.
```

---

# Slice 12: Secure document services

## Prompt 12.1: F-76 and F-78

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement:

- F-76 Malware Scanning and File Validation;
- F-78 Document Version Storage.

Use:
- 50 MB maximum file size;
- PDF, DOC, DOCX, PPT, and PPTX only;
- quarantine storage for new uploads;
- extension and MIME validation;
- magic-byte inspection;
- asynchronous malware scanning;
- immutable vault promotion;
- append-only document versions.

A file is not a formal academic submission until server receipt, validation, scanning, and version creation succeed.
```

## Prompt 12.2: F-77

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement F-77 Secure Document Retrieval.

Every download must enforce:
- institution scope;
- project scope;
- role and assignment scope;
- document-category confidentiality;
- platform/institutional administrator restrictions.

Use short-lived signed URLs or streamed responses. Never expose raw object-storage keys.

Log denied retrieval attempts with the actor, institution, project, document, reason, and correlation ID.
```

---

# Slice 13: Audit, backup and recovery

## Prompt 13.1: F-82

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement F-82 Tamper-Resistant Audit Logging.

Audit:
- tenant mutations;
- role and appointment changes;
- project allocation;
- supervision changes;
- submissions;
- assessment decisions;
- result approval and publication;
- payment state changes;
- webhook verification failures;
- denied confidential-data access;
- document retrieval denials.

Each record must include:
- institution_id;
- actor;
- action;
- entity;
- previous state;
- new state;
- request correlation ID;
- UTC timestamp.

Prevent application users from updating or deleting audit records.
```

## Prompt 13.2: F-83

```text
Work only within the Clario MVP scope.

Follow the repository conventions defined in:
- clario_mvp_implementation_defaults.md
- clario_mvp_rest_and_openapi_contract_specification.md
- clario_mvp_schema.sql
- clario_mvp_shared_contracts.ts
- clario_mvp_business_rules_and_end_to_end_workflows.md
- consolidated_acceptance_criteria.md

Use Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, RFC 9457 Problem Details, and the existing modular-monolith structure.

Preserve strict institution tenant isolation, PostgreSQL RLS, UTC timestamp persistence, institution timezone evaluation, audit logging, transactional integrity, documented error codes, idempotency requirements, and existing API contracts.

Implement F-83 Backup and Recovery Infrastructure.

Configure and verify:
- hourly backups;
- encrypted backups;
- 30-day routine retention;
- one-hour RPO;
- four-hour RTO;
- restore verification;
- monitoring and alerts for failed backups.

Add an automated recovery verification procedure. Do not treat backup configuration as complete until a restore test produces evidence that the database and required object metadata can be recovered.
```

---

# Reference stage checklists

The following checklists document the five-stage workflow. They are reference material only; do not send them by themselves. The numbered prompts above are the copy-paste-ready prompts and already contain their own project context.

## Stage 1: Route and authentication

```text
Implement only the route and authentication layer for the specified Clario feature.

Add the documented Express route and enforce:
- the required authenticated role;
- verified MFA where required;
- institution scope;
- programme/session scope;
- project or assignment scope;
- X-Clario-Active-Role when required;
- X-Clario-Coordinator-Appointment-Id on coordinator routes;
- Idempotency-Key on payment, submission, and retry-sensitive POST routes.

Do not implement Zod validation, business logic, database writes, or response mapping yet. Add route-level authorization tests.
```

## Stage 2: Zod validation

```text
Implement only request and response validation for the specified Clario feature.

Add Zod schemas for:
- path parameters;
- query parameters;
- required headers;
- request body;
- documented response data.

Reject unknown fields and malformed values. Enforce the documented limits, enums, dates, integer kobo amounts, UTC timestamp formats, file constraints, and pagination rules.

Use RFC 9457 Problem Details for validation failures. Do not add business rules or database actions. Add valid, invalid, boundary, and malformed-input tests.
```

## Stage 3: Business logic checks

```text
Implement only the domain-service checks for the specified Clario feature.

Inputs already pass Zod validation. Enforce every applicable documented rule, including:
- tenant and assignment scope;
- actor permissions;
- lifecycle state transitions;
- parent and child state;
- duplicate and conflict checks;
- topic-before-supervisor assignment;
- designated-submitter rules;
- sequential milestone gating;
- current/former supervisor conflict;
- blind grading;
- assessment completeness;
- publication locks;
- subscription restrictions;
- timezone-aware deadline rules.

Use the documented domain error codes. Do not put database queries in the controller. Add unit tests for every allowed and rejected business case.
```

## Stage 4: Database action

```text
Implement only the persistence layer for the specified Clario feature.

Use the existing Prisma and reviewed-SQL migration conventions. Preserve:
- PostgreSQL constraints;
- RLS;
- tenant-scoped indexes;
- append-only history;
- audit immutability;
- idempotency records;
- transactional outbox writes;
- row locking where required;
- atomic state transitions.

Use a transaction whenever the feature changes multiple related records. Add repository or integration tests. Do not weaken constraints or duplicate controller logic.
```

## Stage 5: Response

```text
Implement only response mapping for the specified Clario feature.

Return the exact status codes and response shape documented for the endpoint. Map typed domain errors to RFC 9457 Problem Details with:
- error code;
- title;
- status;
- detail;
- instance;
- timestamp_utc;
- institution_timezone;
- field_errors when applicable.

Include pagination metadata and X-Clario-Institution-Timezone where required. Do not change authorization, validation, business rules, or persistence.
```

## Stage 6: Feature completion review

```text
Review the completed Clario feature against its feature specification, API contract, schema, business rules, and acceptance criteria.

Check:
- route and authentication;
- Zod validation;
- business rules;
- transaction boundaries;
- tenant isolation and RLS;
- response contract;
- audit behavior;
- outbox behavior;
- idempotency;
- positive, negative, boundary, conflict, and permission tests.

Report concrete gaps only. Include the feature ID, acceptance-criteria ID, file, line, severity, and recommended fix. Do not refactor unrelated code.
```

---

# Final MVP review prompt

```text
Review the completed Clario MVP implementation against:

- clario_mvp_traceability_matrix.md;
- consolidated_acceptance_criteria.md;
- clario_mvp_rest_and_openapi_contract_specification.md;
- clario_mvp_schema.sql;
- clario_mvp_business_rules_and_end_to_end_workflows.md;
- clario_mvp_implementation_defaults.md.

Check every P0 feature from F-01 through F-83, excluding the documented P1/P2 features.

For each feature, verify:
- route and authentication;
- Zod validation;
- business rules;
- database transaction boundaries;
- tenant isolation and RLS;
- response contract;
- audit logging;
- outbox behavior;
- idempotency;
- positive, negative, boundary, and permission tests.

Report concrete gaps only. Include the feature ID, acceptance-criteria ID, file, line, severity, and recommended fix. Do not refactor unrelated code.
```
