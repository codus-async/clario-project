import { RoleCode } from "@clario/shared-contracts";
import { z } from "zod";

import { AppError, type FieldError } from "../../errors/app-error.js";
import { ERROR_CODES } from "../../errors/error-codes.js";
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import { prisma } from "./prisma.js";

/**
 * Tenant session context bound to every PostgreSQL transaction executed through
 * {@link withTenantTransaction}. The four values mirror `user_sessions`
 * (docs/clario_mvp_schema.sql) and the request headers
 * `X-Clario-Active-Role` / `X-Clario-Coordinator-Appointment-Id`.
 */
export interface TenantContext {
  institutionId: string | null;
  isPlatformAdmin: boolean;
  activeRole: RoleCode;
  coordinatorAppointmentId: string | null;
}

/**
 * Session GUCs bound transaction-locally by the helper. They are the values read
 * by the SQL reader functions `current_app_institution_id()`,
 * `is_platform_admin_context()`, `current_app_active_role()` and
 * `current_app_coordinator_appointment_id()`, and by every
 * `tenant_isolation_policy` row-level security policy.
 */
export const TENANT_CONTEXT_GUC = {
  institutionId: "app.current_institution_id",
  isPlatformAdmin: "app.is_platform_admin",
  activeRole: "app.active_role",
  coordinatorAppointmentId: "app.active_coordinator_appointment_id",
} as const;

/**
 * Database role adopted for the duration of the transaction so that the forced
 * `tenant_isolation_policy` row-level security rules apply (a superuser or table
 * owner bypasses RLS unless the session role is switched).
 */
export const APP_POLICY_ROLE = "clario_app_role";

export const TenantContextSchema = z.object({
  institutionId: z.uuid().nullable(),
  isPlatformAdmin: z.boolean(),
  activeRole: z.nativeEnum(RoleCode),
  coordinatorAppointmentId: z.uuid().nullable(),
});

export interface TenantTransactionOptions {
  /** Injectable client so tests can run against an isolated database. */
  client?: Pick<PrismaClient, "$transaction">;
  isolationLevel?: Prisma.TransactionIsolationLevel;
  maxWaitMs?: number;
  timeoutMs?: number;
}

function invalidContext(fieldErrors: FieldError[]): AppError {
  return new AppError(
    ERROR_CODES.OUT_OF_ASSIGNMENT_SCOPE,
    "Tenant transaction context failed validation; the session scope cannot be bound to this database transaction.",
    fieldErrors,
  );
}

function validateTenantContext(value: unknown): TenantContext {
  const parsed = TenantContextSchema.safeParse(value);
  if (!parsed.success) {
    throw invalidContext(
      parsed.error.issues.map((issue) => ({
        field: issue.path.length > 0 ? issue.path.join(".") : "context",
        message: issue.message,
      })),
    );
  }

  const context = parsed.data;
  const fieldErrors: FieldError[] = [];

  if (context.isPlatformAdmin) {
    // chk_platform_vs_tenant_user: platform admin sessions are not tenant-scoped.
    if (context.institutionId !== null) {
      fieldErrors.push({
        field: "institutionId",
        message: "Platform admin sessions are not tenant-scoped and must not carry an institutionId.",
      });
    }
    if (context.coordinatorAppointmentId !== null) {
      fieldErrors.push({
        field: "coordinatorAppointmentId",
        message: "Platform admin sessions cannot hold a coordinator appointment scope.",
      });
    }
  } else {
    if (context.institutionId === null) {
      fieldErrors.push({
        field: "institutionId",
        message: "institutionId is required for tenant-scoped sessions (BR-01, SEC-09).",
      });
    }
    // BR-03: a coordinator operates exactly one appointment scope at a time.
    if (
      context.activeRole === RoleCode.PROJECT_COORDINATOR &&
      context.coordinatorAppointmentId === null
    ) {
      fieldErrors.push({
        field: "coordinatorAppointmentId",
        message: "BR-03: an active Project Coordinator role requires an active coordinator appointment.",
      });
    }
  }

  if (fieldErrors.length > 0) {
    throw invalidContext(fieldErrors);
  }

  return context;
}

/**
 * Binds the four tenant session variables and the policy role to the *current*
 * transaction of `tx` (`SET LOCAL` semantics: every binding is discarded on
 * commit or rollback, so pooled connections never leak scope between requests).
 *
 * `set_config(..., true)` is used instead of `SET LOCAL <guc> = ...` so values are
 * passed as bind parameters rather than interpolated SQL.
 */
export async function applyTenantContext(
  tx: Prisma.TransactionClient,
  context: TenantContext,
): Promise<void> {
  const validated = validateTenantContext(context);

  await tx.$queryRaw`
    SELECT
      set_config(${TENANT_CONTEXT_GUC.institutionId}, ${validated.institutionId ?? ""}, true),
      set_config(${TENANT_CONTEXT_GUC.isPlatformAdmin}, ${String(validated.isPlatformAdmin)}, true),
      set_config(${TENANT_CONTEXT_GUC.activeRole}, ${validated.activeRole}, true),
      set_config(
        ${TENANT_CONTEXT_GUC.coordinatorAppointmentId},
        ${validated.coordinatorAppointmentId ?? ""},
        true
      )
  `;

  // Postgres does not allow role identifiers to be bound as parameters;
  // APP_POLICY_ROLE is a module constant and never user input.
  await tx.$executeRawUnsafe(`SET LOCAL ROLE ${APP_POLICY_ROLE}`);
}

/**
 * Runs `handler` inside a Prisma transaction whose session context is bound to
 * `context`, so every query executed through `tx` is subject to the forced
 * tenant row-level security policy (BR-01, SEC-09) and the session scope of the
 * caller (FR-047, F-65, BR-03).
 *
 * The context is validated before a connection is acquired, so an invalid
 * session scope fails fast with a documented RFC 9457 error code
 * (`OUT_OF_ASSIGNMENT_SCOPE`).
 */
export async function withTenantTransaction<T>(
  context: TenantContext,
  handler: (tx: Prisma.TransactionClient) => Promise<T>,
  options: TenantTransactionOptions = {},
): Promise<T> {
  const validated = validateTenantContext(context);
  const client = options.client ?? prisma;

  const transactionOptions: {
    isolationLevel?: Prisma.TransactionIsolationLevel;
    maxWait?: number;
    timeout?: number;
  } = {};
  if (options.isolationLevel !== undefined) {
    transactionOptions.isolationLevel = options.isolationLevel;
  }
  if (options.maxWaitMs !== undefined) {
    transactionOptions.maxWait = options.maxWaitMs;
  }
  if (options.timeoutMs !== undefined) {
    transactionOptions.timeout = options.timeoutMs;
  }

  return client.$transaction(async (tx) => {
    await applyTenantContext(tx, validated);
    return handler(tx);
  }, transactionOptions);
}

const uuidSchema = z.uuid();

/**
 * Institution-scoped transaction for pre-authentication reads (F-64).
 *
 * Login resolves role assignments and coordinator appointments before any
 * session exists, so no `activeRole` / appointment context is available to
 * satisfy {@link validateTenantContext}. This helper still binds the
 * institution GUC (every `tenant_isolation_policy` rule is driven by
 * `current_app_institution_id()`) and adopts the policy role, but deliberately
 * leaves `app.active_role` and `app.active_coordinator_appointment_id` unset:
 * any reader that depends on those variables observes NULL (fail-closed).
 *
 * Restricted to a single validated institution id so it can never be used for
 * an unscoped cross-tenant read.
 */
export async function withInstitutionScopeTransaction<T>(
  institutionId: string,
  handler: (tx: Prisma.TransactionClient) => Promise<T>,
  options: TenantTransactionOptions = {},
): Promise<T> {
  if (!uuidSchema.safeParse(institutionId).success) {
    throw invalidContext([
      {
        field: "institutionId",
        message: "institutionId must be a valid UUID to establish institution scope.",
      },
    ]);
  }

  const client = options.client ?? prisma;

  const transactionOptions: {
    isolationLevel?: Prisma.TransactionIsolationLevel;
    maxWait?: number;
    timeout?: number;
  } = {};
  if (options.isolationLevel !== undefined) {
    transactionOptions.isolationLevel = options.isolationLevel;
  }
  if (options.maxWaitMs !== undefined) {
    transactionOptions.maxWait = options.maxWaitMs;
  }
  if (options.timeoutMs !== undefined) {
    transactionOptions.timeout = options.timeoutMs;
  }

  return client.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT
        set_config(${TENANT_CONTEXT_GUC.institutionId}, ${institutionId}, true),
        set_config(${TENANT_CONTEXT_GUC.isPlatformAdmin}, ${String(false)}, true),
        set_config(${TENANT_CONTEXT_GUC.activeRole}, ${""}, true),
        set_config(${TENANT_CONTEXT_GUC.coordinatorAppointmentId}, ${""}, true)
    `;

    // APP_POLICY_ROLE is a module constant and never user input.
    await tx.$executeRawUnsafe(`SET LOCAL ROLE ${APP_POLICY_ROLE}`);

    return handler(tx);
  }, transactionOptions);
}
