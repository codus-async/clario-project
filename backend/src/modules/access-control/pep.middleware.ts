import { CLARIO_HTTP_HEADERS } from "@clario/shared-contracts";
import type { Request, RequestHandler, Response } from "express";

import { AppError } from "../../errors/app-error.js";
import { ERROR_CODES } from "../../errors/error-codes.js";
import {
  withTenantTransaction,
  type TenantContext,
  type TenantTransactionOptions,
} from "../../infrastructure/database/tenant-transaction.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { readBearerSession, readSessionCookie } from "../auth/auth.middleware.js";
import type { AuthSessionContext } from "../auth/auth.types.js";
import {
  PepDenialError,
  buildTenantContext,
  evaluateActiveRole,
  evaluateConfidentiality,
  evaluateMfa,
  evaluateSessionWindow,
  evaluateSubscription,
  isEnforcedPath,
  isExemptPath,
  resolvePepOptions,
} from "./pep.policy.js";
import type { PepDependencies, PepSecurityEvent } from "./pep.types.js";

/**
 * Session credential failures surface from `resolveSession` as
 * `UNAUTHENTICATED` (malformed Bearer) or `SESSION_EXPIRED_OR_REVOKED`
 * (expired, revoked, idle, Redis↔PG disagreement). The F-66 contract names
 * a single code for every "no valid session" outcome on protected routes:
 * `UNAUTHORIZED_SESSION` (REST §1.1). The rewrite stays a `PepDenialError`
 * so the security-event sink still records it as a session-gate denial
 * (FR-231). Infrastructure failures (`SERVICE_UNAVAILABLE`) and tenant
 * suspension pass through untouched.
 */
function normalizeSessionError(error: unknown): unknown {
  if (
    error instanceof AppError &&
    (error.code === ERROR_CODES.UNAUTHENTICATED ||
      error.code === ERROR_CODES.SESSION_EXPIRED_OR_REVOKED)
  ) {
    return new PepDenialError(
      ERROR_CODES.UNAUTHORIZED_SESSION,
      "session",
      "The session is missing, invalid, expired, or revoked. Please sign in again.",
    );
  }
  return error;
}

function securityEventFor(
  req: Request,
  error: PepDenialError,
): PepSecurityEvent {
  const context = req.authContext;
  return {
    gate: error.gate,
    code: error.code,
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    userId: context?.userId ?? null,
    institutionId: context?.institutionId ?? null,
    activeRole: context?.activeRole ?? null,
    detail: error.message,
  };
}

/**
 * The F-66 Policy Enforcement Point: evaluates the five gates in the order
 * mandated by the implementation prompt —
 *
 * 1. **Session** — valid server-side session with the per-role inactivity
 *    window (SEC-07). Failures normalize to `401 UNAUTHORIZED_SESSION`.
 * 2. **Active role** — `X-Clario-Active-Role` must match the persisted role
 *    and is mandatory for multi-role accounts (FR-047, F-65).
 * 3. **MFA** — mandatory for `mfaRequired` sessions and
 *    `MANDATORY_MFA_ROLES` (SEC-06) → `403 MFA_ENROLLMENT_REQUIRED`.
 * 4. **Tenant / scope / confidentiality** — cross-tenant address, BR-03
 *    coordinator appointment binding, BR-25 admin confidentiality →
 *    `403 OUT_OF_ASSIGNMENT_SCOPE` / `403 CONFIDENTIAL_ACADEMIC_RECORD_BLOCKED`;
 *    the resulting `TenantContext` is attached to `req.tenantContext` for
 *    RLS binding inside each transaction.
 * 5. **Subscription** — expired subscriptions block writes only →
 *    `402 SUBSCRIPTION_EXPIRED_RESTRICTED` (FR-243/FR-244, OD-06).
 *
 * `/api/v1/auth` is exempt so the F-64/F-65 flows stay reachable for
 * unauthenticated and `PRE_MFA` sessions. Every denial is handed to the
 * security-event sink (FR-231) before the RFC 9457 error handler renders it.
 */
export function createPolicyEnforcementPoint(
  deps: PepDependencies,
): RequestHandler {
  const options = resolvePepOptions(deps.options);
  const emit = deps.securityEvents;

  return async (req: Request, res: Response, next) => {
    try {
      if (
        !isEnforcedPath(req.path, options) ||
        isExemptPath(req.path, options)
      ) {
        next();
        return;
      }

      // Gate 1: server-side session (F-64).
      let context: AuthSessionContext;
      try {
        context = await deps.session.resolveSession({
          cookieSessionId: readSessionCookie(req.headers.cookie),
          bearerSessionId: readBearerSession(req.headers.authorization),
          ip: req.ip ?? "",
        });
      } catch (error) {
        throw normalizeSessionError(error);
      }
      evaluateSessionWindow(context, deps.authConfig);
      req.authContext = context;
      // The tenant is known now: return its authoritative timezone instead
      // of the platform default (REST contract §1.1, BR-NEW-01).
      res.setHeader(
        CLARIO_HTTP_HEADERS.INSTITUTION_TIMEZONE,
        context.institutionTimezone,
      );

      // Gate 2: active role context (FR-047, F-65).
      evaluateActiveRole(context, req.get(CLARIO_HTTP_HEADERS.ACTIVE_ROLE));

      // Gate 3: MFA (SEC-06, FR-048, FR-222).
      evaluateMfa(context);

      // Gate 4: tenant boundary + coordinator scope (BR-01, BR-03, SEC-09).
      const tenantContext = buildTenantContext({
        context,
        path: req.path,
        params: req.params,
        query: req.query,
        body: req.body,
        coordinatorAppointmentHeader: req.get(
          CLARIO_HTTP_HEADERS.COORDINATOR_APPOINTMENT_ID,
        ),
        options,
      });
      // Gate 4b: confidentiality (BR-25, SEC-14, SEC-15).
      evaluateConfidentiality(context, req.path, options);
      req.tenantContext = tenantContext;

      // Gate 5: subscription permission policy (F-70, FR-243–FR-245).
      evaluateSubscription(context, {
        method: req.method,
        path: req.path,
        options,
      });

      next();
    } catch (error) {
      if (error instanceof PepDenialError && emit !== undefined) {
        try {
          emit(securityEventFor(req, error));
        } catch {
          // A failing audit sink must never turn a denial into a 500.
        }
      }
      next(error);
    }
  };
}

/**
 * Runs `handler` inside a tenant transaction bound to the `TenantContext`
 * the PEP validated for this request (gates 4/5 above). The GUCs are bound
 * with `SET LOCAL` *inside* the transaction — PostgreSQL session variables
 * do not survive across pooled connections, so middleware-level binding
 * would be meaningless (AGENTS.md §3.1).
 *
 * Fails with `401 UNAUTHORIZED_SESSION` when a route is served without the
 * PEP (wiring error: the request never obtained an authenticated context).
 */
export async function withRequestTenantTransaction<T>(
  req: Request,
  handler: (tx: Prisma.TransactionClient) => Promise<T>,
  options: TenantTransactionOptions = {},
): Promise<T> {
  const context: TenantContext | undefined = req.tenantContext;
  if (context === undefined) {
    throw new AppError(
      ERROR_CODES.UNAUTHORIZED_SESSION,
      "The request reached a tenant-scoped handler without a policy enforcement context.",
    );
  }
  return withTenantTransaction(context, handler, options);
}
