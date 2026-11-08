# Clario MVP — Implementation Defaults and Architecture Decisions

**Status:** Approved implementation defaults  
**Product:** Clario MVP  
**Jurisdiction:** Nigeria  
**Currency:** NGN, stored in integer Kobo  
**Default timezone:** `Africa/Lagos`

This document records the technical and policy defaults finalized for implementation. Values identified as configurable remain environment- or institution-level configuration rather than hard-coded business logic.

## 1. Technology Stack and Repository Structure

- Runtime: Node.js
- Language: TypeScript
- Backend: Express
- Client: Next.js with TypeScript
- Repository model: Monorepo

Recommended structure:

```text
/client           Next.js web application
/backend          Express API and worker processes
/shared           Shared TypeScript contracts and domain constants
/infrastructure   Deployment, migrations, and operational configuration
```

The shared package is consumed by both the client and backend to preserve API, enum, validation, and domain-constant parity.

## 2. Data and Object Storage

- Database: Managed PostgreSQL 16
- Cache and queue backend: Managed Redis 7
- Object storage: S3-compatible encrypted object storage
- Deployment provider: AWS
- Storage layout:
  - Separate quarantine bucket for newly uploaded files
  - Separate immutable vault bucket for approved files

Files are promoted from quarantine to the immutable vault only after server-side validation, magic-byte inspection, and malware scanning.

## 3. Worker Runtime and Asynchronous Processing

- Worker runtime: TypeScript
- Queue: BullMQ backed by Redis
- Event mechanism: Transactional outbox
- Jobs must be idempotent and safe to retry.

Workers handle:

- Malware scanning and file promotion
- Email delivery
- Deadline reminders
- Overdue transitions
- Archive exports
- Payment reconciliation

External failures must not roll back completed academic or administrative transactions.

## 4. Payment Provider

- Provider: Paystack
- Integration pattern: Provider adapter
- Local and staging environments: Paystack test credentials
- Production: Paystack live credentials only
- Webhooks: Separate endpoints per environment

Payment processing must retain:

- HMAC signature verification before processing
- Idempotent webhook handling
- Duplicate-event detection
- Explicit reconciliation-failure states
- Audit records for payment state changes

The provider adapter must allow a future payment provider to be added without changing domain logic.

## 5. Email Provider

- Provider: Amazon SES
- Integration pattern: Email adapter
- Development and staging: SES sandbox
- Production: SES production access

The system must track delivery, bounce, complaint, and failure outcomes. Email failures must be observable and must not silently affect the underlying transaction.

## 6. Deployment Model

Clario will use a managed AWS deployment with independently deployable, stateless services:

- Next.js client
- Express API
- BullMQ worker
- Scheduler or scheduled worker process where required

Managed services:

- PostgreSQL
- Redis
- S3 object storage
- Secrets management
- Monitoring and alerting

CI/CD must support separate staging and production environments. Credentials and provider secrets must not be stored in source control.

## 7. Session Timeout Defaults

| Role | Idle timeout |
|---|---:|
| Platform Admin | 30 minutes |
| Institutional Admin | 30 minutes |
| Project Coordinator | 30 minutes |
| Project Supervisor | 60 minutes |
| Project Examiner | 60 minutes |
| Student | 60 minutes |

Additional rules:

- Absolute session lifetime: 12 hours
- Logout revokes the current session immediately.
- Password reset revokes all existing sessions.
- Required administrative roles remain subject to MFA.
- Timeout values remain configuration-driven.

## 8. Grading Precision and Rounding

- Intermediate calculations use PostgreSQL `NUMERIC(10,4)`.
- Intermediate values must not be rounded prematurely.
- Final results are stored and displayed to 2 decimal places.
- Rounding mode: `ROUND_HALF_UP`.
- Component scores, intermediate values, rounding mode, and calculation version are preserved for auditability.

For group projects, Examiner assessment remains shared by project while Supervisor performance assessment remains individual per student.

## 9. Subscription Grace-Period Permissions

### Grace period

- Full academic access remains available.
- Renewal warnings are displayed persistently.
- Institutional Administrators retain billing and renewal access.
- Relevant administrators receive notifications.

### Expired state

- Academic access becomes read-only.
- Permitted existing academic records remain viewable.
- New academic writes, submissions, assessments, and administrative mutations are blocked.
- Institutional Administrators retain billing and renewal access.
- Platform Administrators retain subscription-management access.

These permissions must be implemented through a centralized, configurable permission matrix rather than duplicated in controllers.

## 10. Supervisor Assessment Deadline

- Configurable per programme and academic session
- Default: 7 calendar days after final project submission
- Stored timestamps: UTC
- Deadline evaluation: institution-configured IANA timezone
- Result consolidation and approval are blocked until required Supervisor assessments are complete.
- Reminder and overdue jobs must be idempotent.

Coordinators may configure a different deadline without changing application code.

## 11. Configuration Boundaries

The following values must remain configurable:

- Session timeout values
- Subscription grace-period duration
- Grace-period permission matrix
- Supervisor assessment deadline
- Payment provider credentials and settings
- Email provider credentials and settings
- Grading precision and rounding settings
- Object-storage bucket names
- Worker retry and backoff policies
- Cloud environment sizing and deployment settings

Configuration changes must be validated, auditable where operationally significant, and separated from source-code changes whenever the underlying product decision is expected to vary by institution or environment.

## 12. Governing Documentation

These decisions should be implemented alongside:

- `mvp-p.md`
- `clario_mvp_system_design_and_architecture.md`
- `clario_mvp_rest_and_openapi_contract_specification.md`
- `clario_mvp_schema.sql`
- `clario_mvp_shared_contracts.ts`
- `clario_mvp_open_decisions_and_risk_register.md`

## 13. Complete Engineering Stack

### Runtime and backend

- Node.js 22 LTS
- TypeScript 5.x
- Express modular monolith
- Feature modules organized around controllers, services, repositories, and domain logic
- Separate TypeScript worker processes for asynchronous jobs

### Database access and migrations

- Prisma for application queries and generated client access
- Prisma migrations for application schema changes
- Reviewed SQL migrations for PostgreSQL-specific features, including:
  - Row-Level Security policies
  - Triggers
  - Database roles
  - Extensions
  - Other database-specific invariants

The existing PostgreSQL schema remains authoritative for domain constraints and must be reconciled with the migration history.

### Validation and API contracts

- Zod schemas for request, response, and shared domain validation
- OpenAPI 3.1 generated from validation schemas
- Versioned API documentation published as part of the build or release process
- REST API using RFC 9457 Problem Details errors
- Cursor pagination for list endpoints
- Idempotency keys for payments, submissions, and other retry-sensitive commands

### Frontend

- Next.js with TypeScript
- App Router
- Server Components by default
- Client Components only where interactivity requires them
- Tailwind CSS
- shadcn/ui
- TanStack Query for server state
- Local React state for local UI state unless a stronger shared-state requirement is established

### Testing

- Vitest for unit and domain tests
- Supertest for Express API tests
- Testcontainers for PostgreSQL, Redis, and integration dependencies
- Playwright for browser and end-to-end tests

Tests must cover both successful workflows and authorization, tenant-isolation, idempotency, state-transition, and failure scenarios.

## 14. AWS Infrastructure

### Compute and networking

- ECS/Fargate for containerized services
- Application Load Balancer for public API traffic
- Separate deployable services for:
  - Next.js client
  - Express API
  - BullMQ worker
  - Scheduler or scheduled worker

### Infrastructure as code

- Terraform
- Remote state with controlled access and state locking
- Reusable modules for staging and production
- Infrastructure changes reviewed through pull requests

### CI/CD

- GitHub Actions
- Protected staging and production environments
- OIDC federation from GitHub Actions to AWS
- No long-lived AWS credentials in repository secrets
- Automated checks before deployment

### Secrets and configuration

- AWS Secrets Manager for credentials and sensitive secrets
- AWS Systems Manager Parameter Store for non-secret configuration
- Environment-specific configuration for local, staging, and production

### Observability

- Structured JSON application logs sent to CloudWatch
- OpenTelemetry for traces and metrics
- CloudWatch alarms for application, worker, infrastructure, and integration failures
- Actionable alerts for payment, email, malware-scanning, queue, and database failures

## 15. Authentication and Security Implementation

- Argon2id for password hashing
- TOTP-based MFA
- Secure server-side sessions
- Opaque session IDs in `HttpOnly`, `Secure`, `SameSite` cookies
- Session state stored in Redis
- Immediate server-side session revocation on logout
- All-session revocation after password reset

The application must continue to enforce the documented role, tenant, programme, project, assignment, subscription, and MFA policies independently of the session mechanism.

## 16. File Malware Scanning

- ClamAV running in an isolated worker
- Signature updates managed as an operational requirement
- Files remain quarantined until scanning succeeds
- Scan failures produce explicit failed or rejected states
- Only successfully validated files may be promoted to the immutable vault

## 17. Repository and Package Management

- pnpm workspaces
- Corepack-managed package manager version
- Committed lockfile
- Monorepo packages for:
  - `client`
  - `backend`
  - `shared`
  - Infrastructure and deployment configuration as appropriate

## 18. API and Session Conventions

- REST resource-oriented endpoints
- RFC 9457 Problem Details error envelope
- Cursor-based pagination
- Idempotency-Key support for retry-sensitive commands
- Opaque Redis-backed cookie sessions
- OpenAPI documentation generated and validated in CI

## 19. Release Strategy

- Trunk-based development
- Automatic deployment to staging after successful protected checks
- Explicit protected promotion to production
- Production deployment requires successful tests, migration checks, and approval rules
- Database migrations run as a controlled deployment step before application rollout when required

## 20. Coding and Architecture Patterns

### Domain and business logic

- Controllers remain thin.
- Application services represent use cases and orchestration.
- Domain entities, value objects, and domain services own business rules and state transitions.
- Business rules must not be hidden in HTTP controllers or database adapters.
- Domain logic should be testable without Express, Prisma, Redis, or external providers.

### Module dependency direction

- Dependencies point inward toward the domain and application layers.
- Infrastructure depends on application and domain contracts.
- Feature modules communicate through explicit interfaces.
- Direct access to another module's persistence implementation is not allowed.
- Cross-module events or application interfaces should be used where direct coupling would create a dependency cycle.

### Repository pattern

- Repository interfaces are defined in the application or domain layer.
- Prisma-backed repository implementations belong in infrastructure.
- Use cases depend on repository interfaces rather than Prisma directly.
- Queries and persistence operations must enforce tenant and authorization scope through the appropriate application boundary.

### API controllers

Each controller should:

1. Parse and validate HTTP input.
2. Resolve authenticated and request-scoped context.
3. Call one application use case.
4. Map the result to an HTTP response.

Controllers must not contain domain calculations, multi-step orchestration, or direct database queries.

### Transactions

- The application use case owns the transaction boundary.
- Repositories participate in the transaction supplied by the use case.
- Multi-write operations that must be atomic use one transaction.
- External side effects are recorded through the transactional outbox and dispatched after commit.
- Repository methods must not silently open independent transactions inside an existing use case transaction.

## 21. Validation and Error Handling

### Validation

- Validate requests, responses, queue payloads, and external webhook payloads at system boundaries with Zod.
- Enforce business invariants again in application/domain logic.
- Enforce data integrity again in PostgreSQL through constraints, RLS, triggers, and transaction rules where applicable.
- Validation must be explicit; invalid input must produce a documented error rather than a silent default.

### Error handling

- Use typed domain and application errors for expected failures.
- Centralized Express error middleware maps typed errors to the documented RFC 9457 Problem Details envelope.
- Unexpected errors are logged with a request or job correlation ID and return a safe generic response.
- Error responses must not expose secrets, stack traces, credentials, or confidential academic data.
- Error codes should identify the violated business rule where applicable.

## 22. TypeScript and Code Organization

### Type safety

- TypeScript strict mode is mandatory.
- `any` is prohibited.
- Unsafe casts require a localized, documented justification and should be removed when a proper type guard or contract can be introduced.
- External data is treated as unknown until validated.
- Shared types and schemas must remain consistent between client and backend.

### Naming and structure

- Organize code by feature rather than by one global technical layer.
- Variables and functions use `camelCase`.
- Types, classes, React components, and enums use `PascalCase`.
- Constants use the existing project convention consistently.
- HTTP route paths use kebab-case where multiple words are required.
- Test files remain adjacent to the code they primarily test or in the established test directory for that layer.

### Mutation and data handling

- Prefer immutable DTOs and value objects where practical.
- Controlled mutation is allowed inside domain aggregates when it preserves invariants.
- Do not mutate request payloads or shared objects unexpectedly.
- Use explicit copy/transform operations when crossing API, application, domain, and persistence boundaries.

## 23. Logging and Observability Coding Rules

- Use structured JSON logs.
- Include severity, timestamp, service, environment, request ID or job ID, and relevant feature/module context.
- Redact passwords, tokens, cookies, payment secrets, MFA secrets, document contents, and unnecessary personal data.
- Never log full authorization headers, session cookies, webhook secrets, or uploaded file contents.
- Use audit logging for security-sensitive and business-critical actions; application logs are not a substitute for audit records.
- Log failures with enough context to diagnose the operation without exposing confidential data.

## 24. Testing Patterns

Use layered tests:

- Unit tests for domain rules, value objects, calculations, and state transitions.
- Integration tests for use cases, repositories, Express routes, PostgreSQL, Redis, queues, and transaction behavior.
- Playwright tests for critical end-to-end user journeys.

Tests must prioritize observable behavior and include:

- Successful workflows
- Validation failures
- Authorization and tenant-isolation negatives
- Idempotency and retry behavior
- State-transition boundaries
- Transaction rollback behavior
- Worker and provider failure behavior
- Regression coverage for previously fixed defects

### Test doubles and external services

- Prefer deterministic fakes and Testcontainers for infrastructure-dependent tests.
- Mock only external provider boundaries where a deterministic local implementation is not appropriate.
- Provider adapters must have contract tests covering request mapping, response mapping, signature verification, and failure handling.
- Avoid mocking domain logic or repository behavior in tests intended to verify integration between those components.

## 25. Documentation and Comments

- Prefer clear names and simple control flow over explanatory comments.
- Comments should explain non-obvious decisions, invariants, security constraints, or compatibility workarounds.
- Do not add comments that merely repeat what the code does.
- Public API contracts, configuration options, and operational procedures must be documented.
- Update directly related documentation when behavior or an architectural decision changes.

## 26. Collaboration and Review Standards

### Commits and pull requests

- Keep commits and pull requests small and feature-scoped.
- Prefer vertical slices that include implementation, tests, and directly related documentation.
- Reference the relevant feature, functional requirement, acceptance criterion, or business rule.
- Avoid mixing unrelated refactors with feature work.

### Review evidence

Before merge, reviewers should verify:

- Relevant acceptance criteria are covered.
- Negative authorization and tenant-isolation cases are tested.
- Database migrations and rollback implications are understood.
- Audit and outbox behavior is present where required.
- Error handling and observability are adequate.
- Regression impact has been considered.
- No secrets or sensitive data are introduced.

### Feature flags

- Use feature flags for unresolved policy decisions, risky integrations, and staged rollouts.
- Do not use flags to conceal incomplete core behavior indefinitely.
- Flags must have an owner, documented default, scope, and removal plan.
- Security and tenant-isolation checks must never be disabled by ordinary product flags.

### Configuration access

- A typed configuration module validates required values at application startup.
- Feature code must not read `process.env` directly.
- Missing or invalid configuration must fail explicitly during startup or deployment validation.
- Secrets and environment-specific values come from the approved secret/configuration stores.

### Dependency policy

- Keep dependencies minimal and purposeful.
- Pin dependency resolution through the committed lockfile.
- Review licenses and maintenance health before adding packages.
- Run automated vulnerability scans.
- Patch dependencies regularly, prioritizing security updates.

## 27. Feature Definition of Done

A feature is not complete until the applicable vertical slice includes:

- API contract and implementation
- Domain logic and state transitions
- Persistence and migrations
- UI behavior
- Authorization and scope enforcement
- Audit and transactional outbox behavior where required
- Unit, integration, and end-to-end tests where applicable
- Error handling and observability
- Directly related documentation

The feature must pass its acceptance criteria and must not introduce unrelated behavior changes.

## 28. Cross-Cutting Engineering Priorities

The backend and client must be designed and reviewed with the following priorities, in combination:

1. Organization
2. Scalability
3. Reusability
4. Modularity
5. Performance
6. Quality assurance
7. Clean code

These priorities are engineering constraints, not optional future improvements. A feature that works functionally but creates avoidable coupling, duplication, performance risk, or untestable code is not complete.

### Organization

- Organize code by business feature and bounded responsibility.
- Keep related domain logic, use cases, persistence adapters, routes, UI components, and tests discoverable together.
- Use consistent naming, file placement, import boundaries, and module conventions.
- Keep infrastructure, configuration, shared contracts, and product features clearly separated.
- Prefer predictable project structure over clever or inconsistent abstractions.

### Scalability

- Keep API and worker processes stateless so they can scale horizontally.
- Design database queries for tenant scope, pagination, indexing, and expected concurrency.
- Move slow, retryable, or externally dependent work to asynchronous workers.
- Avoid global mutable state and process-local assumptions.
- Define explicit limits for uploads, pagination, batch operations, queue retries, and resource-heavy requests.
- Ensure client data-fetching patterns do not create unnecessary requests or unbounded payloads.

### Reusability

- Reuse shared contracts, validation schemas, domain constants, UI primitives, and infrastructure helpers.
- Extract reusable code only when the abstraction represents a stable shared concept.
- Do not duplicate authorization, error mapping, formatting, loading, or empty-state behavior across features.
- Keep provider integrations behind adapters so domain logic remains provider-independent.
- Prefer composition and explicit interfaces over copy-and-modify implementations.

### Modularity

- Keep feature modules independently understandable and testable.
- Enforce dependency direction and avoid circular dependencies.
- Expose the smallest public interface necessary from each module.
- Do not allow UI components, controllers, or domain modules to reach into another module's internal implementation.
- Use application interfaces and domain events for intentional cross-module collaboration.
- Keep client modules aligned with backend capabilities without coupling the client to persistence details.

### Performance

#### Backend

- Measure and optimize database access rather than guessing.
- Use appropriate indexes, bounded queries, cursor pagination, and projection of required fields.
- Avoid N+1 queries and unbounded eager loading.
- Keep request handlers focused on interactive work; use workers for long-running operations.
- Define and monitor latency targets, queue age, database utilization, and error rates.
- Cache only where ownership, invalidation, tenant scope, and stale-data behavior are explicit.

#### Client

- Prefer server rendering and server data access where appropriate.
- Use TanStack Query caching, deduplication, and invalidation deliberately.
- Keep client bundles, rendered lists, and network payloads bounded.
- Use pagination or virtualization for large collections.
- Avoid unnecessary re-renders and broad client-side state when local state or server state is sufficient.
- Provide loading, error, empty, and retry states without blocking unrelated parts of the interface.
- Measure core user journeys and protect accessibility while optimizing performance.

### Quality assurance

- Every feature must have tests at the appropriate unit, integration, and end-to-end levels.
- Test behavior, contracts, authorization boundaries, failure modes, and regression risks.
- Backend tests must cover tenant isolation, transaction behavior, idempotency, retries, and worker failures where applicable.
- Client tests must cover permissions, form validation, loading/error/empty states, keyboard behavior, and critical user journeys.
- Run formatting, linting, type-checking, automated tests, dependency scans, and contract validation in CI.
- Production defects must result in regression tests when technically appropriate.

### Clean code

- Prefer small functions with one clear responsibility.
- Use explicit names and straightforward control flow.
- Remove dead code, unused abstractions, duplicated logic, and obsolete flags.
- Keep side effects at clear boundaries.
- Avoid premature abstraction, speculative generalization, and hidden behavior.
- Make invalid states difficult to represent through types, validation, and domain invariants.
- Refactor tightly coupled code when implementing a feature, but avoid unrelated rewrites.

### Engineering review checklist

For each backend or client change, reviewers should ask:

- Is the code in the correct feature/module boundary?
- Does it introduce duplication or an unstable abstraction?
- Can it scale with tenant count, user count, data volume, and concurrent requests?
- Are expensive operations bounded or asynchronous?
- Is the behavior reusable without leaking implementation details?
- Are authorization, error, loading, empty, and failure states complete?
- Is the change observable and testable?
- Does the implementation remain clear to the next engineer?
