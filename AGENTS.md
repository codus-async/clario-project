# Clario — Engineering Guide (AGENTS.md)

Clario is a multi-tenant SaaS for the final-year project lifecycle in Nigerian tertiary institutions. This file is the permanent engineering guide: read it before changing anything, and keep it current.

## 1. Tech stack

- **Backend**: Express 5 + TypeScript (ESM), `backend/src/server.ts` → `app.ts`; feature modules in `backend/src/modules/<name>/` (routes/controller/service/schemas/deps per module).
- **Database**: PostgreSQL 16 with **Row-Level Security** as the tenant-isolation enforcement layer (`clario_app_role`, `tenant_isolation_policy`, forced RLS).
- **Cache/queue**: Redis 7 + **BullMQ** workers (idempotent, retry-safe jobs; external side effects go through the transactional outbox).
- **Validation/errors**: **Zod** at all boundaries; **RFC 9457 Problem Details** error envelopes (`shared/src/schemas/problem-details.ts`, `backend/src/errors/problem-details.ts`).
- **Client**: Next.js 16 App Router + Tailwind 4 in `/client` (currently create-next-app scaffold).
- **Contracts**: `@clario/shared-contracts` (`/shared`) — Zod schemas, domain enums, pagination scalars — consumed by both client and backend to keep validation/enum parity.

## 2. Monorepo structure

pnpm workspace (`pnpm@10.34.9`), run all pnpm commands **from the repo root**; root `pnpm-lock.yaml` is authoritative (`client/pnpm-lock.yaml` is a stale standalone leftover).

```text
/client          Next.js web application (own AGENTS.md — read it first)
/backend         Express API, Prisma schema/migrations, workers, tests
/shared          @clario/shared-contracts (Zod/domain contracts; built to gitignored dist/)
/infrastructure  docker-compose.yml (dev Postgres 16 + Redis 7)
/docs            All product specifications (index in §4)
```

## 3. Non-negotiable invariants

These are enforced in the database (`docs/clario_mvp_schema.sql` + migrations) and asserted by `backend/src/tests/infrastructure/database/tenant-isolation.test.ts`. Never bypass them in application code.

### 3.1 Institution tenant isolation via RLS
- Every tenant table carries `institution_id`; RLS is **forced** and the only policy is `tenant_isolation_policy` (`USING`/`WITH CHECK` = `current_app_institution_id()`), which reads the session GUC `app.current_institution_id`.
- Application queries must run through `withTenantTransaction()` in `backend/src/infrastructure/database/tenant-transaction.ts`: it binds the tenant GUCs with `set_config(..., true)` (**SET LOCAL** semantics — discarded at transaction end) and does `SET LOCAL ROLE clario_app_role`. Never touch tenant tables through a direct/superuser connection outside this helper.
- Platform-admin cross-tenant reads are explicit and opt-in via the GUC flags, never the default.
- `users` and `user_sessions` are **not** RLS-protected (they are addressed by an opaque session id / token digest, and `users.institution_id` is NULL for Platform Admins). The auth module therefore reads and writes them on the plain Prisma client; the tenant-scoped auth reads (`user_role_assignments`, `coordinator_appointments`) still go through `withInstitutionScopeTransaction()`.

### 3.2 Time: UTC persistence, Africa/Lagos evaluation (BR-NEW-01)
- All persisted timestamps are `TIMESTAMPTZ` (UTC). No local-time columns.
- Deadlines, reminders, overdue detection and defence schedules are **evaluated** in the institution's configured IANA timezone — default `Africa/Lagos` (WAT, UTC+1), exposed as `APP_TIMEZONE` in env config. Display formatting also uses that timezone; storage does not.

### 3.3 Currency: NGN in integer kobo only
- Money is stored and transmitted strictly as **integer kobo** (`*_kobo BIGINT` columns, e.g. `price_kobo`, `expected_amount_kobo`). No floats, no decimal-naira columns, no intermediate naira conversion — 1 NGN = 100 kobo.

### 3.4 Grading precision: NUMERIC(10,4)
- All intermediate grading/penalty calculations use PostgreSQL `NUMERIC(10,4)` and must not be rounded prematurely (late-penalty deduction happens before final rounding). Final results stored/displayed at 2 decimals, `ROUND_HALF_UP`; component scores and calculation version are retained for audit.

### 3.5 Append-only audit log (F-82)
- `audit_logs` is strictly immutable: a `BEFORE UPDATE OR DELETE` trigger raises `TAMPER_PROTECTION_VIOLATION`, plus `REVOKE UPDATE, DELETE ... FROM clario_app_role`. Rows form a per-institution hash chain (`previous_row_hash` → `row_integrity_hash`, sequence numbers). Never write UPDATE/DELETE paths for it.

### 3.6 Transactional outbox (F-71–F-75)
- External side effects — notifications/emails (F-71 transactional email, F-72 in-app, F-73 dispatch, F-74 overdue, F-75 decision notifications) — are recorded as `transactional_outbox_events` **inside the business transaction** and dispatched after commit by a relay/worker (BullMQ). A notification/email failure must never roll back the academic or administrative operation (BR-NEW-04c); jobs must be idempotent.

## 4. Specification index (`/docs`)

Requirements are referenced by ID in code comments and commits (`F-64`, `FR-227`, `BR-NEW-01`, `OD-…`, `SEC-…`). Where docs and code disagree, trust the code + tests; the files below are the source for *intent*.

**Discovery baseline (what to build)**
| File | Contents |
|---|---|
| `user-strories.md` | Original user stories v1.0; §10 lists open decisions |
| `features.md` | Feature catalogue `F-01`–`F-83` with user-story mapping |
| `actors.md` | Actor register (6 human actors, institution → programme hierarchy) |
| `mvp-p.md` | MVP scope and P0/P1/P2 prioritisation |
| `nfrs.md` | Discovery-baseline non-functional requirements |

**Normative MVP specification (how to build)**
| File | Contents |
|---|---|
| `clario_mvp_feature_specification1.md` … `5.md` | Detailed feature specs in 5 batches: (1) Modules A–B, (2) Modules A–E, (3) Modules F–H (groups, deadlines), (4) Modules I–J, (5) Modules K–P |
| `consolidated_functional_requirements.md` | Master register of all 290 requirements `FR-001`–`FR-290` |
| `consolidated_acceptance_criteria.md` | Master acceptance-criteria test specification |
| `clario_mvp_business_rules_and_end_to_end_workflows.md` | Business rules `BR-01`–`BR-30`, safeguards `BR-NEW-01`–`04`, full lifecycle workflows |
| `clario_mvp_rest_and_openapi_contract_specification.md` | REST/OpenAPI 3.1 contract; §1.2 = RFC 9457 error envelope |
| `clario_mvp_system_design_and_architecture.md` | Architecture blueprint: workers, outbox relay, PEP middleware, latency SLOs |
| `clario_mvp_implementation_defaults.md` | **Approved defaults** — stack, session timeouts, §8 grading precision, config boundaries; code defaults come from here |
| `clario_mvp_implementation_prompts.md` | Copy-paste per-feature implementation prompts (route → Zod → business → DB stages) |
| `clario_mvp_schema.sql` | **Authoritative physical schema** (44 tables, RLS, triggers) — must stay in sync with Prisma migrations |
| `clario_mvp_shared_contracts.ts` | Reference TypeScript contracts that `/shared` implements |
| `clario_mvp_traceability_matrix.md` | `F ↔ FR ↔ BR` bidirectional traceability and consistency audit |
| `clario_mvp_open_decisions_and_risk_register.md` | Unresolved decisions `OD-…` — bound them with config hooks, never invent answers |

**UI**
| File | Contents |
|---|---|
| `clario_ui_ux_screen_architecture_part_1_….md` | Global shell, WCAG 2.2 AA, Platform + Institutional Admin portals |
| `clario_ui_ux_screen_architecture_part_2_….md` | Project Coordinator portal (screen inventory, wireframes, flows) |
| `clario_ui_ux_screen_architecture_part_3_….md` | Supervisor, Student, Examiner portals |

## 5. Commands (same order as CI, `.github/workflows/ci.yml`)

```bash
pnpm install --frozen-lockfile
pnpm --filter @clario/shared-contracts build   # mandatory first step
pnpm -r --if-present typecheck
pnpm --filter client lint
pnpm --filter backend build
pnpm --filter client build
cp .env.example .env                           # required before backend tests
pnpm --filter backend test
```

- Order matters: `shared` resolves via its **gitignored** `dist/`, so nothing typechecks until it is built. (Backend's `typecheck` script rebuilds it itself; plain `tsc` does not.)
- There are no root-level lint/typecheck/test scripts, and backend has no lint script — use `--filter`/`-r` as above.
- Single test file: `pnpm --filter backend exec vitest run src/tests/health.test.ts` (path is relative to `backend/`).

## 6. Env and dev services

- One **root** `.env` (gitignored) feeds everything; `backend/src/config/env.ts` loads it and Zod-validates eagerly — importing backend config without a valid `.env` throws at import time. Bootstrap with `cp .env.example .env`.
- `infrastructure/docker/docker-compose.yml` runs Postgres 16 on host port **5433** and Redis 7 on **6380** (non-default ports, to avoid clashes with other local containers). `.env.example` already points `DATABASE_URL`/`DIRECT_URL`/`REDIS_URL` at those ports — keep them aligned. Compose reads `POSTGRES_PASSWORD` from the environment.
- `OUTBOX_PAYLOAD_ENCRYPTION_KEY` (base64, 32 bytes) is **required**: it encrypts the live credentials carried by transactional-outbox payloads (F-71). `.env.example` ships a development placeholder that the config rejects when `NODE_ENV=production`.
- Backend dev: `pnpm --filter backend dev` (tsx watch, `PORT=3000`). `next dev` also defaults to port 3000 — pick another port when running both.

## 7. Prisma and schema (easy to get wrong)

- Always use the `prisma7` scripts: `pnpm --filter backend db:generate | db:migrate:dev | db:validate | db:studio`. They pass `--config prisma7.config.ts`, which loads the root `.env`. The plain `prisma` binary is v8 RC and only used by `postinstall: prisma skills sync` (non-fatal, `|| exit 0`) — don't mix the two.
- The generated client is **committed** at `backend/src/generated/prisma` (unlike `dist/`, which is gitignored). Run `db:generate` after every schema change and commit the regenerated files.
- `docs/clario_mvp_schema.sql` is the authoritative physical schema. `tenant-isolation.test.ts` enforces that Prisma migrations match it: exactly **44 tables, 90 indexes, 7 triggers**, RLS `tenant_isolation_policy` forced on every tenant table, and `prisma7 migrate diff` reporting `No difference detected`. Any schema change therefore needs all of: `prisma/schema.prisma` edit, new migration, `docs/clario_mvp_schema.sql` kept in sync, `db:generate`, and the counts above updated if tables/indexes/triggers change.

## 8. Tests

- Vitest; suite lives in `backend/src/tests/**/*.test.ts` (preferences in `test-preferences.json`).
- Full `pnpm --filter backend test` **requires a Docker daemon**: `modules/auth/auth.integration.test.ts` and `infrastructure/database/tenant-isolation.test.ts` start testcontainers (postgres:16, redis:7-alpine) with a 300s setup timeout. Everything else mocks prisma/redis and needs no services.
- The quick no-Docker checks are `src/tests/app.test.ts`, `src/tests/health.test.ts`, and `src/tests/middleware/*.test.ts` (CI re-runs exactly these as its "integration" step).

## 9. Client / Next.js

- Read `client/AGENTS.md` before touching `client/`: Next 16 differs from what you know; guides are in `client/node_modules/next/dist/docs/` (resolve from `client/`, not the repo root).
- The `<!-- BEGIN:nextjs-agent-rules -->` block in `client/AGENTS.md` is re-added by `next dev` — commit it with your work rather than stripping it from the diff.
- Lint with `pnpm --filter client lint` (flat `eslint.config.mjs`, ignores `.next/`).
