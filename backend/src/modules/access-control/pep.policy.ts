import {
  CLARIO_HTTP_HEADERS,
  CONFIDENTIALITY_BLOCKED_ADMIN_ROLES,
  MANDATORY_MFA_ROLES,
  RoleCode,
  SubscriptionStatus,
} from "@clario/shared-contracts";
import { z } from "zod";

import { AppError, type FieldError } from "../../errors/app-error.js";
import { ERROR_CODES, type DocumentedErrorCode } from "../../errors/error-codes.js";
import {
  TenantContextSchema,
  type TenantContext,
} from "../../infrastructure/database/tenant-transaction.js";
import {
  inactivityTimeoutMinutesFor,
  type AuthConfig,
} from "../auth/auth.config.js";
import type { AuthSessionContext } from "../auth/auth.types.js";
import type { PepGate, PepOptions } from "./pep.types.js";

/**
 * A denial raised by one of the five gates. Carries the gate tag so the
 * middleware's security-event sink (FR-231) can report *which* gate fired
 * without re-deriving it from the error code. Still an `AppError`, so the
 * RFC 9457 error handler renders it unchanged.
 */
export class PepDenialError extends AppError {
  public readonly gate: PepGate;

  constructor(
    code: DocumentedErrorCode,
    gate: PepGate,
    detail: string,
    fieldErrors?: FieldError[],
  ) {
    super(code, detail, fieldErrors);
    this.gate = gate;
  }
}

// ---------------------------------------------------------------------------
// Defaults (overridable through PepOptions)
// ---------------------------------------------------------------------------

export const DEFAULT_PEP_OPTIONS: PepOptions = {
  enforcePathPrefix: "/api/v1",
  exemptPathPrefixes: ["/api/v1/auth"],
  coordinatorPathPrefix: "/api/v1/coordinator",
  confidentialPathSegments: [
    "proposal",
    "submission",
    "document",
    "discussion",
    "assessment",
    "grade",
    "result",
    "feedback",
    "rationale",
    "milestone",
    "version",
  ],
  billingPathSegments: [
    "billing",
    "subscription",
    "renew",
    "payment",
    "invoice",
    "export",
  ],
  platformPathSegment: "platform",
};

export function resolvePepOptions(overrides?: Partial<PepOptions>): PepOptions {
  return { ...DEFAULT_PEP_OPTIONS, ...overrides };
}

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

function denial(
  code: DocumentedErrorCode,
  gate: PepGate,
  detail: string,
  fieldErrors?: FieldError[],
): PepDenialError {
  return new PepDenialError(code, gate, detail, fieldErrors);
}

// ---------------------------------------------------------------------------
// Path classifiers (gates 4 and 5)
// ---------------------------------------------------------------------------

function segmentsOf(path: string): string[] {
  return path.split("/").filter((segment) => segment.length > 0);
}

function matchesSegmentSubstrings(
  path: string,
  needles: readonly string[],
): boolean {
  const lowered = path.toLowerCase();
  return needles.some((needle) => lowered.includes(needle));
}

export function isExemptPath(path: string, options: PepOptions): boolean {
  return options.exemptPathPrefixes.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function isEnforcedPath(path: string, options: PepOptions): boolean {
  const prefix = options.enforcePathPrefix;
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function isCoordinatorPath(path: string, options: PepOptions): boolean {
  const prefix = options.coordinatorPathPrefix;
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Platform Admin surfaces (`/api/v1/platform/...`) are never academic records. */
export function isPlatformAdminPath(path: string, options: PepOptions): boolean {
  return segmentsOf(path).some(
    (segment) => segment.toLowerCase() === options.platformPathSegment,
  );
}

/**
 * BR-25 / SEC-14 / SEC-15: does this route serve confidential academic
 * material (topic proposals, submissions, documents, discussions,
 * assessments, grades, results, feedback, milestones)? Project *metadata*
 * routes (`/projects/{id}`) intentionally stay unclassified so admins can
 * still see non-confidential metadata (FR-230).
 */
export function isConfidentialAcademicPath(
  path: string,
  options: PepOptions,
): boolean {
  if (isPlatformAdminPath(path, options)) {
    return false;
  }
  return matchesSegmentSubstrings(path, options.confidentialPathSegments);
}

/** FR-244: billing / renewal / data-export routes an IA must always reach. */
export function isBillingRenewalPath(path: string, options: PepOptions): boolean {
  return matchesSegmentSubstrings(path, options.billingPathSegments);
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0].trim();
  }
  return undefined;
}

/**
 * Collects every institution id the request explicitly names — path segment
 * (`/institutions/{id}`), route params, query string, and JSON body — so a
 * tenant mismatch can be denied before any data query runs (AC-F66-01,
 * SEC-09). Record-level isolation stays with RLS; this catches the explicit
 * cross-tenant address.
 */
export function collectTargetInstitutionIds(input: {
  path: string;
  params: Record<string, unknown>;
  query: unknown;
  body: unknown;
}): string[] {
  const targets = new Set<string>();

  const pathPattern =
    /\/institutions\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;
  for (const match of input.path.matchAll(pathPattern)) {
    const id = match[1];
    if (id !== undefined) {
      targets.add(id.toLowerCase());
    }
  }

  const fromRecord = (record: unknown): void => {
    if (record === null || typeof record !== "object") {
      return;
    }
    const entries = record as Record<string, unknown>;
    for (const key of ["institution_id", "institutionId"]) {
      const value = asString(entries[key]);
      if (value !== undefined && isUuid(value)) {
        targets.add(value.toLowerCase());
      }
    }
  };

  fromRecord(input.params);
  fromRecord(input.query);
  fromRecord(input.body);

  return [...targets];
}

// ---------------------------------------------------------------------------
// Gate 1 — server-side session validity (SEC-07, FR-227)
// ---------------------------------------------------------------------------

/**
 * `AuthService.resolveSession` already enforces absolute expiry, Redis↔PG
 * agreement, and the *stored* inactivity deadline. This gate adds the policy
 * cross-check: the session's inactivity window must satisfy the currently
 * configured per-role window, so a state whose window was written under an
 * older (or tampered) configuration can never outlive the policy (SEC-07).
 */
export function evaluateSessionWindow(
  context: AuthSessionContext,
  config: AuthConfig,
): void {
  const policyWindow = inactivityTimeoutMinutesFor(config, context.activeRole);
  const sessionWindow = context.inactivityTimeoutMinutes;

  if (
    !Number.isFinite(sessionWindow) ||
    sessionWindow <= 0 ||
    sessionWindow > policyWindow
  ) {
    throw denial(
      ERROR_CODES.UNAUTHORIZED_SESSION,
      "session",
      "The session's inactivity window does not satisfy the configured policy for this role. Please sign in again.",
    );
  }
}

// ---------------------------------------------------------------------------
// Gate 2 — active role context (FR-047, F-65, REST §1.1)
// ---------------------------------------------------------------------------

/**
 * The `X-Clario-Active-Role` header must mirror the session's persisted
 * active role; it never *selects* a different role — switching is F-65 and
 * persists through `PUT /auth/session/context`. With multiple assigned roles
 * the header is mandatory so the request cannot fall back to an unintended
 * context; with a single role the session's role is authoritative.
 */
export function evaluateActiveRole(
  context: AuthSessionContext,
  activeRoleHeader: string | undefined,
): void {
  const header = activeRoleHeader?.trim();

  if (header === undefined || header.length === 0) {
    if (context.assignedRoles.length > 1) {
      throw denial(
        ERROR_CODES.OUT_OF_ASSIGNMENT_SCOPE,
        "role",
        "This account holds multiple roles; send X-Clario-Active-Role, or switch the active role via PUT /api/v1/auth/session/context.",
      );
    }
    return;
  }

  const validRole = (Object.values(RoleCode) as string[]).includes(header);
  if (
    !validRole ||
    !context.assignedRoles.includes(header as RoleCode) ||
    header !== context.activeRole
  ) {
    throw denial(
      ERROR_CODES.OUT_OF_ASSIGNMENT_SCOPE,
      "role",
      "X-Clario-Active-Role must match the session's active role; switch roles via PUT /api/v1/auth/session/context.",
      [{ field: CLARIO_HTTP_HEADERS.ACTIVE_ROLE, message: "Active role mismatch." }],
    );
  }
}

// ---------------------------------------------------------------------------
// Gate 3 — MFA (SEC-06, FR-048, FR-222)
// ---------------------------------------------------------------------------

/**
 * Enforces the same rule as `AuthService.assertMfaSatisfied` but with the
 * PEP-specific code the F-66 contract mandates (`MFA_ENROLLMENT_REQUIRED`,
 * distinct from the auth flow's `MFA_CHALLENGE_REQUIRED`). Kept here rather
 * than delegated so the gate stays a pure, unit-testable function.
 */
export function evaluateMfa(context: AuthSessionContext): void {
  const mandatory =
    context.mfaRequired || MANDATORY_MFA_ROLES.includes(context.activeRole);

  if (mandatory && !context.mfaVerified) {
    throw denial(
      ERROR_CODES.MFA_ENROLLMENT_REQUIRED,
      "mfa",
      "MFA enrollment and verification are required for this role before this request can be processed.",
    );
  }
}

// ---------------------------------------------------------------------------
// Gate 4 — tenant boundary + coordinator scope + confidentiality
// ---------------------------------------------------------------------------

export interface TenantScopeInput {
  context: AuthSessionContext;
  path: string;
  params: Record<string, unknown>;
  query: unknown;
  body: unknown;
  coordinatorAppointmentHeader: string | undefined;
  options: PepOptions;
}

function scopeDenied(
  detail: string,
  field?: string,
): AppError {
  return denial(
    ERROR_CODES.OUT_OF_ASSIGNMENT_SCOPE,
    "tenant_scope",
    detail,
    field !== undefined
      ? [{ field, message: detail }]
      : undefined,
  );
}

/**
 * Builds the `TenantContext` the request will bind to every database
 * transaction, denying before construction:
 *
 * 1. **Cross-tenant address** (BR-01, SEC-09, AC-F66-01): any explicitly
 *    named institution id must equal the session's institution. Platform
 *    Admin sessions (`institutionId === null`) are exempt — cross-tenant
 *    administration is their purpose.
 * 2. **Coordinator scope** (BR-03, REST §1.1): `X-Clario-Coordinator-
 *    Appointment-Id` is mandatory whenever the active role is
 *    `PROJECT_COORDINATOR` *or* the path is a coordinator route, and must
 *    equal the session's active appointment.
 *
 * Confidentiality is a sibling check — {@link evaluateConfidentiality}.
 */
export function buildTenantContext(input: TenantScopeInput): TenantContext {
  const { context, path, options } = input;
  const isPlatformAdmin = context.activeRole === RoleCode.PLATFORM_ADMIN;

  if (!isPlatformAdmin && context.institutionId === null) {
    throw scopeDenied(
      "This session has no institutional scope; it cannot address tenant resources (BR-01).",
      "institutionId",
    );
  }

  const targets = collectTargetInstitutionIds({
    path,
    params: input.params,
    query: input.query,
    body: input.body,
  });
  if (!isPlatformAdmin) {
    const sessionInstitution = (context.institutionId ?? "").toLowerCase();
    if (targets.some((target) => target !== sessionInstitution)) {
      throw scopeDenied(
        "The addressed institution is outside this session's tenant boundary (SEC-09).",
        "institution_id",
      );
    }
  }

  const coordinatorRoute =
    isCoordinatorPath(path, options) ||
    context.activeRole === RoleCode.PROJECT_COORDINATOR;
  const appointmentHeader = input.coordinatorAppointmentHeader?.trim();

  if (coordinatorRoute) {
    if (appointmentHeader === undefined || !isUuid(appointmentHeader)) {
      throw scopeDenied(
        "BR-03: coordinator requests must carry X-Clario-Coordinator-Appointment-Id bound to one appointment.",
        CLARIO_HTTP_HEADERS.COORDINATOR_APPOINTMENT_ID,
      );
    }
    const activeAppointmentId =
      context.activeCoordinatorScope?.appointmentId.toLowerCase();
    if (activeAppointmentId !== appointmentHeader.toLowerCase()) {
      throw scopeDenied(
        "X-Clario-Coordinator-Appointment-Id must equal the session's active coordinator appointment (BR-03).",
        CLARIO_HTTP_HEADERS.COORDINATOR_APPOINTMENT_ID,
      );
    }
  }

  const tenantContext: TenantContext = {
    institutionId: context.institutionId,
    isPlatformAdmin,
    activeRole: context.activeRole,
    coordinatorAppointmentId:
      context.activeRole === RoleCode.PROJECT_COORDINATOR
        ? (context.activeCoordinatorScope?.appointmentId ?? null)
        : null,
  };

  // Same validation `withTenantTransaction` applies, surfaced at the gate so
  // an inconsistent session fails with a documented RFC 9457 code before a
  // connection is ever checked out.
  const parsed = TenantContextSchema.safeParse(tenantContext);
  if (!parsed.success) {
    throw scopeDenied(
      "The session scope cannot be bound to this request (BR-01, BR-03).",
      parsed.error.issues[0]?.path.join(".") ?? "context",
    );
  }
  return parsed.data;
}

/**
 * BR-25 / SEC-14 / SEC-15: Institutional Admins and Platform Admins are
 * blocked from confidential academic records — proposals, submissions,
 * documents, discussions, assessments, grades, results, feedback — while
 * non-confidential metadata and every route of the other four roles stay
 * reachable.
 */
export function evaluateConfidentiality(
  context: AuthSessionContext,
  path: string,
  options: PepOptions,
): void {
  if (!CONFIDENTIALITY_BLOCKED_ADMIN_ROLES.includes(context.activeRole)) {
    return;
  }
  if (!isConfidentialAcademicPath(path, options)) {
    return;
  }
  throw denial(
    ERROR_CODES.CONFIDENTIAL_ACADEMIC_RECORD_BLOCKED,
    "tenant_scope",
    "Institutional and Platform Admins are blocked from confidential academic records (BR-25, SEC-14, SEC-15).",
  );
}

// ---------------------------------------------------------------------------
// Gate 5 — subscription permission policy (F-70, FR-243–FR-245, OD-06)
// ---------------------------------------------------------------------------

const WRITE_METHODS: ReadonlySet<string> = new Set([
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

function isReadMethod(method: string): boolean {
  return !WRITE_METHODS.has(method.toUpperCase());
}

function subscriptionDetail(status: SubscriptionStatus): string {
  switch (status) {
    case SubscriptionStatus.EXPIRED:
      return "The institution's subscription has expired; renew to resume write operations. Read-only access is preserved (FR-244).";
    case SubscriptionStatus.PENDING_PAYMENT:
      return "The institution's subscription is pending payment; complete the payment to resume write operations (OD-06).";
    case SubscriptionStatus.CANCELLED:
      return "The institution's subscription is cancelled; renew to resume write operations (OD-06).";
    default:
      return "The institution's subscription does not permit this operation (FR-243).";
  }
}

/**
 * FR-243/FR-244 with the OD-06 defaults: `ACTIVE` and `GRACE_PERIOD` allow
 * everything (grace keeps full academic access plus an admin warning);
 * `EXPIRED`, `PENDING_PAYMENT` and `CANCELLED` block **writes only** — reads
 * and data export stay available so nothing is lost. Platform Admin sessions
 * and an Institutional Admin's billing/renewal/data-export routes are always
 * reachable so renewal can actually happen. `null` means F-70 has not
 * populated a status yet (login writes `null` until then), so no policy is
 * enforced.
 */
export function evaluateSubscription(
  context: AuthSessionContext,
  input: { method: string; path: string; options: PepOptions },
): void {
  if (context.institutionId === null) {
    // Platform Admin sessions are not bound to an institutional subscription.
    return;
  }

  const status = context.subscriptionStatus;
  if (
    status === null ||
    status === SubscriptionStatus.ACTIVE ||
    status === SubscriptionStatus.GRACE_PERIOD
  ) {
    return;
  }

  if (isReadMethod(input.method)) {
    return;
  }

  if (
    context.activeRole === RoleCode.INSTITUTIONAL_ADMIN &&
    isBillingRenewalPath(input.path, input.options)
  ) {
    return;
  }

  throw denial(
    ERROR_CODES.SUBSCRIPTION_EXPIRED_RESTRICTED,
    "subscription",
    subscriptionDetail(status),
  );
}
