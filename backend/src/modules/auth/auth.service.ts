import { randomUUID } from "node:crypto";
import { isIP } from "node:net";

import {
  MANDATORY_MFA_ROLES,
  RoleCode,
  type CoordinatorScopeContext,
  type UUID,
} from "@clario/shared-contracts";

import { env } from "../../config/env.js";
import { AppError } from "../../errors/app-error.js";
import { ERROR_CODES } from "../../errors/error-codes.js";
import { baseLogger } from "../../infrastructure/logging/logger.js";
import {
  inactivityTimeoutMinutesFor,
  type AuthConfig,
} from "./auth.config.js";
import { MAX_PASSWORD_LENGTH } from "./auth.password-policy.js";
import { isRoleCode } from "./auth.role-code.js";
import type {
  InstitutionRecord,
  InstitutionRepository,
  LoginProtectionStore,
  LoginUserRecord,
  PasswordHasher,
  RoleAssignmentRepository,
  SessionCreationResult,
  SessionRepository,
  SessionStore,
  UserRepository,
  VerificationSlot,
} from "./auth.ports.js";
import type {
  AuthSessionContext,
  HeartbeatResult,
  LoginInput,
  LoginResult,
  SessionCredential,
  SessionState,
} from "./auth.types.js";

/**
 * Request-field bounds of the F-64 identifier/password/institution-code
 * contract. Exported so the request-boundary Zod schemas
 * (`auth.schemas.ts`) enforce exactly the constraints `AuthService` applies,
 * keeping the HTTP edge and the application service in lock-step.
 */
export const MAX_IDENTIFIER_LENGTH = 320;
export const MAX_INSTITUTION_CODE_LENGTH = 64;

/**
 * The password bound lives with the password policy, so the login boundary
 * and the password-*creation* paths (activation, reset) share one single
 * source of truth. Re-exported here because the login boundary is what the
 * request schemas import.
 */
export { MAX_PASSWORD_LENGTH };

const MAX_USER_AGENT_LENGTH = 1_000;

const REVOKE_REASON_LOGOUT = "LOGOUT";
const REVOKE_REASON_EXPIRED = "SESSION_EXPIRED";
const REVOKE_REASON_INACTIVITY = "SESSION_INACTIVITY_TIMEOUT";
const REVOKE_REASON_RUNTIME_PERSISTENCE =
  "SESSION_RUNTIME_PERSISTENCE_FAILED";
const REVOKE_REASON_ACCOUNT_INELIGIBLE = "ACCOUNT_INELIGIBLE";
const REVOKE_REASON_TENANT_SUSPENDED = "TENANT_SUSPENDED";
const REVOKE_REASON_ROLE_REVOKED = "ROLE_REVOKED";
const REVOKE_REASON_SCOPE_REVOKED = "SCOPE_REVOKED";

export interface AuthServiceDeps {
  config: AuthConfig;
  hasher: PasswordHasher;
  users: UserRepository;
  institutions: InstitutionRepository;
  roles: RoleAssignmentRepository;
  sessions: SessionRepository;
  sessionStore: SessionStore;
  protection: LoginProtectionStore;
}

function fieldError(field: string, message: string): AppError {
  return new AppError(ERROR_CODES.VALIDATION_ERROR, message, [
    { field, message },
  ]);
}

/**
 * Single generic authentication failure. Every rejected login (unknown
 * identifier, ambiguous identifier, inactive account, suspended tenant,
 * wrong password) surfaces this exact error so that responses cannot be used
 * to enumerate accounts (F-64, SEC-04).
 */
function authenticationFailed(): AppError {
  return new AppError(
    ERROR_CODES.UNAUTHENTICATED,
    "Authentication failed. Provide a valid identifier and password.",
  );
}

function lockedOut(retryAfterSeconds: number | null): AppError {
  const detail =
    retryAfterSeconds !== null
      ? `Too many failed attempts. Try again in ${String(retryAfterSeconds)} seconds.`
      : "Too many failed attempts. Try again after the temporary lockout expires.";
  return new AppError(ERROR_CODES.ACCOUNT_TEMPORARILY_LOCKED, detail);
}

/**
 * Rejection emitted when the in-flight verification cap is reached. It is
 * thrown *before* any account lookup, so it behaves identically for every
 * identifier (no enumeration oracle) and records no failure against the
 * sliding window.
 */
function verificationBusy(): AppError {
  return new AppError(
    ERROR_CODES.ACCOUNT_TEMPORARILY_LOCKED,
    "Too many login attempts are in progress. Please try again shortly.",
  );
}

function sessionRevoked(): AppError {
  return new AppError(
    ERROR_CODES.SESSION_EXPIRED_OR_REVOKED,
    "The session is invalid, expired, or has been revoked.",
  );
}

function scopeDenied(detail: string): AppError {
  return new AppError(ERROR_CODES.OUT_OF_ASSIGNMENT_SCOPE, detail);
}

export class AuthService {
  private readonly config: AuthConfig;
  private readonly hasher: PasswordHasher;
  private readonly users: UserRepository;
  private readonly institutions: InstitutionRepository;
  private readonly roles: RoleAssignmentRepository;
  private readonly sessions: SessionRepository;
  private readonly sessionStore: SessionStore;
  private readonly protection: LoginProtectionStore;

  constructor(deps: AuthServiceDeps) {
    this.config = deps.config;
    this.hasher = deps.hasher;
    this.users = deps.users;
    this.institutions = deps.institutions;
    this.roles = deps.roles;
    this.sessions = deps.sessions;
    this.sessionStore = deps.sessionStore;
    this.protection = deps.protection;
  }

  // -------------------------------------------------------------------------
  // POST /api/v1/auth/login
  // -------------------------------------------------------------------------

  async login(input: LoginInput): Promise<LoginResult> {
    const identifier = this.validateIdentifier(input.identifier);
    const password = this.validatePassword(input.password);
    const institutionCode = this.validateInstitutionCode(
      input.institutionCode,
    );
    const activeRoleHeader = this.trimOptional(input.activeRoleHeader);
    const coordinatorAppointmentHeader = this.trimOptional(
      input.coordinatorAppointmentHeader,
    );

    const protectionKey = {
      ip: input.ip,
      identifier: identifier.toLowerCase(),
    };

    await this.assertNotLocked(protectionKey);

    // Reserve a verification slot *before* any account lookup or KDF work so
    // a concurrent burst cannot exhaust backend memory before failures are
    // recorded (review finding P1). Released on every path below.
    let slot: VerificationSlot | null;
    try {
      slot = await this.protection.acquireVerificationSlot(protectionKey);
    } catch (error) {
      baseLogger.error(
        { err: error, module: "auth" },
        "Failed to acquire verification slot",
      );
      throw new AppError(
        ERROR_CODES.SERVICE_UNAVAILABLE,
        "Login is temporarily unavailable. Please try again.",
      );
    }
    if (slot === null) {
      throw verificationBusy();
    }

    try {
      return await this.completeLogin(input, {
        identifier,
        password,
        institutionCode,
        activeRoleHeader,
        coordinatorAppointmentHeader,
        protectionKey,
      });
    } finally {
      await this.releaseVerificationSlot(protectionKey, slot);
    }
  }

  /**
   * Post-lock-check login flow, executed while a verification slot is held.
   * Extracted from {@link AuthService.login} so the slot is released on every
   * exit path (success, rejected login, thrown validation/scope error).
   */
  private async completeLogin(
    input: LoginInput,
    context: {
      identifier: string;
      password: string;
      institutionCode: string | undefined;
      activeRoleHeader: string | undefined;
      coordinatorAppointmentHeader: string | undefined;
      protectionKey: { ip: string; identifier: string };
    },
  ): Promise<LoginResult> {
    const {
      identifier,
      password,
      institutionCode,
      activeRoleHeader,
      coordinatorAppointmentHeader,
      protectionKey,
    } = context;

    // Tenant resolution (anti-enumeration: an unknown institution code fails
    // with the same generic error as a wrong password).
    let institution: InstitutionRecord | null = null;
    if (institutionCode !== undefined) {
      institution = await this.institutions.findByCode(institutionCode);
      if (institution === null) {
        await this.noteLoginFailure(protectionKey, password);
        throw authenticationFailed();
      }
    }

    const candidates = await this.users.findLoginCandidates(
      identifier,
      institution?.id,
    );
    if (candidates.length !== 1) {
      await this.noteLoginFailure(protectionKey, password);
      throw authenticationFailed();
    }

    const user = candidates[0] as LoginUserRecord;
    if (user.accountStatus !== "ACTIVE" || user.passwordHash === null) {
      await this.noteLoginFailure(protectionKey, password);
      throw authenticationFailed();
    }

    if (user.isPlatformAdmin) {
      // Platform admins are never tenant-scoped; an institution code can
      // therefore never disambiguate them.
      if (institution !== null) {
        await this.noteLoginFailure(protectionKey, password);
        throw authenticationFailed();
      }
    } else {
      const tenantInstitution =
        institution ??
        (user.institutionId !== null
          ? await this.institutions.findById(user.institutionId)
          : null);
      if (
        tenantInstitution === null ||
        tenantInstitution.accountStatus !== "ACTIVE"
      ) {
        await this.noteLoginFailure(protectionKey, password);
        throw authenticationFailed();
      }
      institution = tenantInstitution;
    }

    const passwordValid = await this.hasher.verify(
      user.passwordHash,
      password,
    );
    if (!passwordValid) {
      // The real verification already performed the constant Argon2id work;
      // burning a dummy hash as well would double the KDF time for real
      // accounts and re-enable timing-based enumeration (SEC-04).
      await this.recordLoginFailure(protectionKey);
      throw authenticationFailed();
    }
    await this.recordLoginSuccess(protectionKey);

    const assignedRoles = user.isPlatformAdmin
      ? [RoleCode.PLATFORM_ADMIN]
      : await this.roles.findActiveRoles(
          user.id,
          user.institutionId as UUID,
        );
    if (assignedRoles.length === 0) {
      throw scopeDenied(
        "The account has no active role assignment, so no session can be established.",
      );
    }

    const activeRole = this.resolveActiveRole(
      assignedRoles,
      activeRoleHeader,
    );

    let coordinatorAppointments: AuthSessionContext["coordinatorAppointments"] =
      [];
    let activeCoordinatorScope: AuthSessionContext["activeCoordinatorScope"] =
      null;
    if (activeRole === RoleCode.PROJECT_COORDINATOR) {
      const scopes = await this.roles.findCoordinatorScopes(
        user.id,
        user.institutionId as UUID,
      );
      if (scopes.length === 0) {
        throw scopeDenied(
          "BR-03: the Project Coordinator role requires an active coordinator appointment.",
        );
      }
      coordinatorAppointments = scopes;
      if (scopes.length === 1) {
        activeCoordinatorScope = scopes[0] ?? null;
      } else {
        if (coordinatorAppointmentHeader === undefined) {
          throw fieldError(
            "X-Clario-Coordinator-Appointment-Id",
            "BR-03: multiple coordinator appointments exist; select one with X-Clario-Coordinator-Appointment-Id.",
          );
        }
        const selected = scopes.find(
          (scope) => scope.appointmentId === coordinatorAppointmentHeader,
        );
        if (selected === undefined) {
          throw scopeDenied(
            "BR-03: the selected coordinator appointment is not one of the account's active appointments.",
          );
        }
        activeCoordinatorScope = selected;
      }
    }

    const now = Date.now();
    const sessionId = randomUUID();
    const expiresAt = new Date(now + this.config.absoluteLifetimeMinutes * 60_000);
    const inactivityTimeoutMinutes = inactivityTimeoutMinutesFor(
      this.config,
      activeRole,
    );

    const state: SessionState = {
      sessionId,
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      institutionalIdNumber: user.institutionalIdNumber,
      institutionId: institution?.id ?? null,
      institutionName: institution?.name ?? null,
      institutionCode: institution?.codeSlug ?? null,
      institutionTimezone:
        institution?.timezoneIana ?? env.APP_TIMEZONE,
      // Subscription state is populated by F-70; left null until then.
      subscriptionStatus: null,
      gracePeriodEndsAtUtc: null,
      assignedRoles,
      activeRole,
      mfaRequired:
        user.mfaRequired || MANDATORY_MFA_ROLES.includes(activeRole),
      mfaEnrolled: user.mfaEnrolled,
      // MFA verification itself is F-65: every login starts unverified.
      mfaVerified: false,
      coordinatorAppointments,
      activeCoordinatorScope,
      inactivityTimeoutMinutes,
      createdAtUtc: new Date(now).toISOString(),
      expiresAtUtc: expiresAt.toISOString(),
      lastActivityAtUtc: new Date(now).toISOString(),
    };

    let creation: SessionCreationResult;
    try {
      creation = await this.sessions.create(
        {
          id: sessionId,
          userId: user.id,
          institutionId: state.institutionId,
          activeRole,
          activeCoordinatorAppointmentId:
            activeCoordinatorScope?.appointmentId ?? null,
          mfaVerified: false,
          ipAddress: normalizeIpAddress(input.ip),
          userAgent: normalizeUserAgent(input.userAgent),
          inactivityTimeoutMinutes,
          createdAt: new Date(now),
          lastActivityAt: new Date(now),
          expiresAt,
        },
        // The session row is fenced on the credential this login verified: a
        // password reset that lands while the login is in flight revokes
        // every session of the account, and this row can only be created
        // while the account still carries the hash that was verified.
        { passwordHash: user.passwordHash },
      );
    } catch (error) {
      baseLogger.error(
        { err: error, module: "auth" },
        "Failed to persist session row",
      );
      throw new AppError(
        ERROR_CODES.SERVICE_UNAVAILABLE,
        "The session could not be established. Please try again.",
      );
    }

    if (!creation.created) {
      // The credential changed underneath the login (a password reset): the
      // session must not be established. The failure is generic, like every
      // other authentication failure.
      baseLogger.warn(
        { module: "auth", userId: user.id },
        "Rejected the session creation because the credential changed",
      );
      throw authenticationFailed();
    }

    try {
      await this.sessionStore.set(state, this.ttlSeconds(state, now));
    } catch (error) {
      baseLogger.error(
        { err: error, module: "auth" },
        "Failed to persist runtime session state",
      );
      await this.revokeSession(sessionId, REVOKE_REASON_RUNTIME_PERSISTENCE);
      throw new AppError(
        ERROR_CODES.SERVICE_UNAVAILABLE,
        "The session could not be established. Please try again.",
      );
    }

    // F-64 §G "Last Authenticated Timestamp": only recorded once the session
    // is fully established, so a failed session write never leaves a
    // "successful" login behind. The write is best-effort — the session is
    // already valid and must not be invalidated by a bookkeeping failure.
    await this.recordLastAuthenticatedAt(user.id, new Date(now));

    return { sessionId, state };
  }

  // -------------------------------------------------------------------------
  // POST /api/v1/auth/logout
  // -------------------------------------------------------------------------

  async logout(sessionId: UUID): Promise<void> {
    const result = await this.revokeSession(sessionId, REVOKE_REASON_LOGOUT);
    // A single failed write is still safe: the Redis/PostgreSQL cross-check
    // fails closed on the next request. If *neither* write lands the session
    // stays fully usable, so the caller must not be told the logout succeeded.
    if (!result.rowRevoked && !result.stateCleared) {
      throw new AppError(
        ERROR_CODES.SERVICE_UNAVAILABLE,
        "The session could not be logged out. Please try again.",
      );
    }
  }

  // -------------------------------------------------------------------------
  // POST /api/v1/auth/session/heartbeat
  // -------------------------------------------------------------------------

  async heartbeat(sessionId: UUID): Promise<HeartbeatResult> {
    const state = await this.loadLiveSession(sessionId);

    const now = Date.now();
    const refreshed = this.refreshActivity(state, now);
    await this.persistActivity(sessionId, refreshed, now);

    return {
      sessionId,
      expiresAtUtc: refreshed.expiresAtUtc,
      inactivityTimeoutMinutes: refreshed.inactivityTimeoutMinutes,
    };
  }

  // -------------------------------------------------------------------------
  // Session middleware support
  // -------------------------------------------------------------------------

  /**
   * SEC-06 / FR-048 / AC-F64-02: an account that must enrol in MFA — or an
   * account whose *active role* is one of the `MANDATORY_MFA_ROLES`
   * (Platform Admin, Institutional Admin, Project Coordinator) — has no
   * full access until the MFA challenge has been completed.
   *
   * The rule lives in the application service (not in the middleware) so it
   * is part of the F-64 business logic and can be asserted directly in
   * unit tests. `createRequireMfaVerified` is the thin HTTP adapter.
   */
  assertMfaSatisfied(context: AuthSessionContext): void {
    const mfaMandatory =
      context.mfaRequired ||
      MANDATORY_MFA_ROLES.includes(context.activeRole);

    if (mfaMandatory && !context.mfaVerified) {
      throw new AppError(
        ERROR_CODES.MFA_CHALLENGE_REQUIRED,
        "MFA verification is required before this action can be performed.",
      );
    }
  }

  /**
   * Resolves the session behind `cookie` / `Authorization: Bearer`
   * credentials, enforces absolute and inactivity expiry, cross-checks the
   * Redis state against the authoritative `user_sessions` row, re-checks
   * account, tenant, and role/appointment eligibility (FR-227), and refreshes
   * activity.
   */
  async resolveSession(
    credential: SessionCredential,
  ): Promise<AuthSessionContext> {
    const sessionId = this.resolveSessionId(credential);
    const state = await this.loadLiveSession(sessionId);

    const user = await this.users.findById(state.userId);
    if (user === null || user.accountStatus !== "ACTIVE") {
      await this.revokeSession(sessionId, REVOKE_REASON_ACCOUNT_INELIGIBLE);
      throw authenticationFailed();
    }

    if (state.institutionId !== null) {
      const institution = await this.institutions.findById(
        state.institutionId,
      );
      if (institution === null) {
        await this.revokeSession(sessionId, REVOKE_REASON_ACCOUNT_INELIGIBLE);
        throw authenticationFailed();
      }
      if (institution.accountStatus !== "ACTIVE") {
        await this.revokeSession(sessionId, REVOKE_REASON_TENANT_SUSPENDED);
        throw new AppError(
          ERROR_CODES.TENANT_SUSPENDED_F01,
          "This institution is suspended and cannot access Clario.",
        );
      }
    }

    // Revalidate role assignments and coordinator scope *before* refreshing
    // activity, so a revoked session is never extended (FR-227 item 5).
    await this.assertRoleScopeStillValid(state);

    const now = Date.now();
    const refreshed = this.refreshActivity(state, now);
    await this.persistActivity(sessionId, refreshed, now);

    return toAuthSessionContext(refreshed);
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  /**
   * FR-227 item 5: revalidate the session's role assignments — and, for a
   * Project Coordinator, appointment scope — against the authoritative tables
   * on every request so revocations take effect immediately instead of at
   * session expiry. Only *removals* revoke the session: roles granted after
   * login are picked up at the next authentication (live role switching is
   * F-65).
   *
   * A datastore failure fails the request with 503 but never revokes: a
   * transient database blip must not log every user out.
   */
  private async assertRoleScopeStillValid(state: SessionState): Promise<void> {
    const institutionId = state.institutionId;
    if (institutionId === null) {
      // Platform admins are not tenant-scoped; account status (already
      // checked above) is their only eligibility signal.
      return;
    }

    const freshRoles = await this.loadRolesForRevalidation(
      state.userId,
      institutionId,
    );
    const freshRoleSet = new Set(freshRoles);
    const activeRoleStillAssigned = freshRoleSet.has(state.activeRole);
    const noRoleRemoved = state.assignedRoles.every((role) =>
      freshRoleSet.has(role),
    );
    if (!activeRoleStillAssigned || !noRoleRemoved) {
      await this.revokeSession(state.sessionId, REVOKE_REASON_ROLE_REVOKED);
      throw sessionRevoked();
    }

    if (state.activeRole !== RoleCode.PROJECT_COORDINATOR) {
      return;
    }

    const freshScopes = await this.loadCoordinatorScopesForRevalidation(
      state.userId,
      institutionId,
    );
    const freshAppointmentIds = new Set(
      freshScopes.map((scope) => scope.appointmentId),
    );
    const noScopeRemoved = state.coordinatorAppointments.every((scope) =>
      freshAppointmentIds.has(scope.appointmentId),
    );
    if (!noScopeRemoved) {
      await this.revokeSession(state.sessionId, REVOKE_REASON_SCOPE_REVOKED);
      throw sessionRevoked();
    }
  }

  private async loadRolesForRevalidation(
    userId: UUID,
    institutionId: UUID,
  ): Promise<RoleCode[]> {
    try {
      return await this.roles.findActiveRoles(userId, institutionId);
    } catch (error) {
      baseLogger.error(
        { err: error, module: "auth" },
        "Role revalidation query failed",
      );
      throw new AppError(
        ERROR_CODES.SERVICE_UNAVAILABLE,
        "The request could not be completed. Please try again.",
      );
    }
  }

  private async loadCoordinatorScopesForRevalidation(
    userId: UUID,
    institutionId: UUID,
  ): Promise<CoordinatorScopeContext[]> {
    try {
      return await this.roles.findCoordinatorScopes(userId, institutionId);
    } catch (error) {
      baseLogger.error(
        { err: error, module: "auth" },
        "Coordinator scope revalidation query failed",
      );
      throw new AppError(
        ERROR_CODES.SERVICE_UNAVAILABLE,
        "The request could not be completed. Please try again.",
      );
    }
  }

  private async releaseVerificationSlot(
    key: { ip: string; identifier: string },
    slot: VerificationSlot,
  ): Promise<void> {
    try {
      await this.protection.releaseVerificationSlot(key, slot);
    } catch (error) {
      // The slot expires on its own; a failed release only holds capacity for
      // the remainder of the TTL.
      baseLogger.warn(
        { err: error, module: "auth" },
        "Failed to release verification slot",
      );
    }
  }

  private resolveSessionId(credential: SessionCredential): UUID {
    const { cookieSessionId, bearerSessionId } = credential;

    if (cookieSessionId === undefined && bearerSessionId === undefined) {
      throw new AppError(
        ERROR_CODES.UNAUTHENTICATED,
        "Authentication credentials were not provided.",
      );
    }

    if (
      cookieSessionId !== undefined &&
      bearerSessionId !== undefined &&
      cookieSessionId !== bearerSessionId
    ) {
      throw new AppError(
        ERROR_CODES.UNAUTHENTICATED,
        "Conflicting session credentials were supplied.",
      );
    }

    return (cookieSessionId ?? bearerSessionId) as UUID;
  }

  /**
   * Loads the runtime session and enforces absolute + inactivity expiry and
   * Redis/PostgreSQL agreement. Any disagreement fails closed.
   */
  private async loadLiveSession(sessionId: UUID): Promise<SessionState> {
    const state = await this.sessionStore.get(sessionId);
    if (state === null) {
      throw new AppError(
        ERROR_CODES.SESSION_EXPIRED_OR_REVOKED,
        "The session is invalid, expired, or has been revoked.",
      );
    }

    const now = Date.now();
    if (Date.parse(state.expiresAtUtc) <= now) {
      await this.revokeSession(sessionId, REVOKE_REASON_EXPIRED);
      throw new AppError(
        ERROR_CODES.SESSION_EXPIRED_OR_REVOKED,
        "The session is invalid, expired, or has been revoked.",
      );
    }

    const idleDeadline =
      Date.parse(state.lastActivityAtUtc) +
      state.inactivityTimeoutMinutes * 60_000;
    if (idleDeadline <= now) {
      await this.revokeSession(sessionId, REVOKE_REASON_INACTIVITY);
      throw new AppError(
        ERROR_CODES.SESSION_EXPIRED_OR_REVOKED,
        "The session is invalid, expired, or has been revoked.",
      );
    }

    const row = await this.sessions.findById(sessionId);
    if (
      row === null ||
      row.isRevoked ||
      row.userId !== state.userId ||
      row.institutionId !== state.institutionId ||
      row.activeRole !== state.activeRole ||
      row.mfaVerified !== state.mfaVerified ||
      (row.activeCoordinatorAppointmentId ?? null) !==
        (state.activeCoordinatorScope?.appointmentId ?? null)
    ) {
      await this.revokeSession(sessionId, REVOKE_REASON_EXPIRED);
      throw new AppError(
        ERROR_CODES.SESSION_EXPIRED_OR_REVOKED,
        "The session is invalid, expired, or has been revoked.",
      );
    }

    return state;
  }

  private refreshActivity(state: SessionState, now: number): SessionState {
    return {
      ...state,
      lastActivityAtUtc: new Date(now).toISOString(),
    };
  }

  private async persistActivity(
    sessionId: UUID,
    state: SessionState,
    now: number,
  ): Promise<void> {
    await this.sessions.touchActivity(sessionId, new Date(now));
    await this.sessionStore.set(state, this.ttlSeconds(state, now));
  }

  private ttlSeconds(state: SessionState, now: number): number {
    const absoluteRemaining = Math.floor(
      (Date.parse(state.expiresAtUtc) - now) / 1_000,
    );
    const idleWindow = state.inactivityTimeoutMinutes * 60;
    return Math.max(1, Math.min(absoluteRemaining, idleWindow));
  }

  private async revokeSession(
    sessionId: UUID,
    reason: string,
  ): Promise<{ rowRevoked: boolean; stateCleared: boolean }> {
    let rowRevoked = false;
    try {
      await this.sessions.markRevoked(sessionId, reason);
      rowRevoked = true;
    } catch (error) {
      baseLogger.warn(
        { err: error, module: "auth", reason },
        "Failed to revoke session row",
      );
    }
    let stateCleared = false;
    try {
      await this.sessionStore.delete(sessionId);
      stateCleared = true;
    } catch (error) {
      baseLogger.warn(
        { err: error, module: "auth", reason },
        "Failed to delete runtime session state",
      );
    }
    return { rowRevoked, stateCleared };
  }

  private async assertNotLocked(key: {
    ip: string;
    identifier: string;
  }): Promise<void> {
    let result;
    try {
      result = await this.protection.check(key);
    } catch (error) {
      baseLogger.error(
        { err: error, module: "auth" },
        "Login protection check failed",
      );
      throw new AppError(
        ERROR_CODES.SERVICE_UNAVAILABLE,
        "Login is temporarily unavailable. Please try again.",
      );
    }
    if (result.locked) {
      throw lockedOut(result.retryAfterSeconds);
    }
  }

  private async recordLoginFailure(key: {
    ip: string;
    identifier: string;
  }): Promise<void> {
    try {
      await this.protection.recordFailure(key);
    } catch (error) {
      baseLogger.warn(
        { err: error, module: "auth" },
        "Failed to record login failure",
      );
    }
  }

  /**
   * Shared rejected-login path: records the failed attempt against both the
   * IP and identifier sliding windows and burns the same Argon2id work as a
   * real verification, so neither the counters nor the response timing reveal
   * whether the identifier exists (SEC-04).
   */
  private async noteLoginFailure(
    key: { ip: string; identifier: string },
    password: string,
  ): Promise<void> {
    await this.recordLoginFailure(key);
    try {
      await this.hasher.verifyDummy(password);
    } catch (error) {
      baseLogger.warn(
        { err: error, module: "auth" },
        "Dummy password verification failed",
      );
    }
  }

  private async recordLoginSuccess(key: {
    ip: string;
    identifier: string;
  }): Promise<void> {
    try {
      await this.protection.recordSuccess(key);
    } catch (error) {
      baseLogger.warn(
        { err: error, module: "auth" },
        "Failed to reset login protection counters",
      );
    }
  }

  /**
   * F-64 §G "Last Authenticated Timestamp". Never fails the login: the
   * session is already established and a missing timestamp is a bookkeeping
   * problem, not an authentication failure.
   */
  private async recordLastAuthenticatedAt(
    userId: UUID,
    at: Date,
  ): Promise<void> {
    try {
      await this.users.recordLogin(userId, at);
    } catch (error) {
      baseLogger.warn(
        { err: error, module: "auth" },
        "Failed to record the last authenticated timestamp",
      );
    }
  }

  private validateIdentifier(value: string): string {
    if (typeof value !== "string") {
      throw fieldError("identifier", "identifier must be a string.");
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw fieldError("identifier", "identifier is required.");
    }
    if (trimmed.length > MAX_IDENTIFIER_LENGTH) {
      throw fieldError(
        "identifier",
        `identifier must be at most ${String(MAX_IDENTIFIER_LENGTH)} characters.`,
      );
    }
    return trimmed;
  }

  private validatePassword(value: string): string {
    if (typeof value !== "string") {
      throw fieldError("password", "password must be a string.");
    }
    if (value.length === 0) {
      throw fieldError("password", "password is required.");
    }
    if (value.length > MAX_PASSWORD_LENGTH) {
      throw fieldError(
        "password",
        `password must be at most ${String(MAX_PASSWORD_LENGTH)} characters.`,
      );
    }
    return value;
  }

  private validateInstitutionCode(value: string | undefined): string | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (typeof value !== "string") {
      throw fieldError(
        "institutionCode",
        "institutionCode must be a string.",
      );
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw fieldError("institutionCode", "institutionCode must not be empty.");
    }
    if (trimmed.length > MAX_INSTITUTION_CODE_LENGTH) {
      throw fieldError(
        "institutionCode",
        `institutionCode must be at most ${String(MAX_INSTITUTION_CODE_LENGTH)} characters.`,
      );
    }
    return trimmed;
  }

  private trimOptional(value: string | undefined): string | undefined {
    if (value === undefined) {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  /**
   * FR-047 / F-65 active-role selection:
   * - exactly one assigned role → that role (a contradicting header is denied);
   * - multiple assigned roles → `X-Clario-Active-Role` is mandatory and must
   *   name one of the assigned roles.
   */
  private resolveActiveRole(
    assignedRoles: RoleCode[],
    activeRoleHeader: string | undefined,
  ): RoleCode {
    if (activeRoleHeader === undefined) {
      if (assignedRoles.length === 1) {
        return assignedRoles[0] as RoleCode;
      }
      throw fieldError(
        "X-Clario-Active-Role",
        "X-Clario-Active-Role is required because the account holds multiple roles.",
      );
    }

    if (!isRoleCode(activeRoleHeader)) {
      throw fieldError(
        "X-Clario-Active-Role",
        "X-Clario-Active-Role must be a documented role code.",
      );
    }
    if (!assignedRoles.includes(activeRoleHeader)) {
      throw scopeDenied(
        "The requested active role is not assigned to this account.",
      );
    }
    return activeRoleHeader;
  }
}

function toAuthSessionContext(state: SessionState): AuthSessionContext {
  return {
    sessionId: state.sessionId,
    userId: state.userId,
    fullName: state.fullName,
    email: state.email,
    institutionalIdNumber: state.institutionalIdNumber,
    institutionId: state.institutionId,
    institutionName: state.institutionName,
    institutionCode: state.institutionCode,
    institutionTimezone: state.institutionTimezone,
    subscriptionStatus: state.subscriptionStatus,
    gracePeriodEndsAtUtc: state.gracePeriodEndsAtUtc,
    assignedRoles: state.assignedRoles,
    activeRole: state.activeRole,
    mfaRequired: state.mfaRequired,
    mfaEnrolled: state.mfaEnrolled,
    mfaVerified: state.mfaVerified,
    coordinatorAppointments: state.coordinatorAppointments,
    activeCoordinatorScope: state.activeCoordinatorScope,
    inactivityTimeoutMinutes: state.inactivityTimeoutMinutes,
    expiresAtUtc: state.expiresAtUtc,
  };
}

function normalizeIpAddress(ip: string): string | null {
  const trimmed = ip.trim();
  if (trimmed.length === 0) {
    return null;
  }
  // `isIP` mirrors what PostgreSQL accepts for the INET column.
  return isIP(trimmed) === 0 ? null : trimmed;
}

function normalizeUserAgent(userAgent: string | undefined): string | null {
  if (userAgent === undefined) {
    return null;
  }
  const trimmed = userAgent.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed.slice(0, MAX_USER_AGENT_LENGTH);
}
