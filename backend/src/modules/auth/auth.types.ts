import type {
  AuthenticatedSessionContext,
  CoordinatorScopeContext,
  IANATimezone,
  RoleCode,
  SubscriptionStatus,
  UUID,
} from "@clario/shared-contracts";

/**
 * Session context attached to `req.authContext` for every authenticated
 * request. Extends the shared `AuthenticatedSessionContext` with
 * `mfa_enrolled`, which the REST/F-64 contract (§9.1) requires in the session
 * context but the shared interface does not declare yet (reported as an
 * open contract conflict; the shared type itself is left untouched).
 */
export interface AuthSessionContext extends AuthenticatedSessionContext {
  mfaEnrolled: boolean;
}

/**
 * Server-side session state persisted in Redis. It is the authoritative
 * runtime copy of the session; the `user_sessions` row in PostgreSQL is the
 * authoritative audit/revocation record and must agree with it.
 */
export interface SessionState {
  sessionId: UUID;
  userId: UUID;
  fullName: string;
  email: string;
  institutionalIdNumber: string | null;
  institutionId: UUID | null;
  institutionName: string | null;
  institutionCode: string | null;
  institutionTimezone: IANATimezone;
  subscriptionStatus: SubscriptionStatus | null;
  gracePeriodEndsAtUtc: string | null;
  assignedRoles: RoleCode[];
  activeRole: RoleCode;
  mfaRequired: boolean;
  mfaEnrolled: boolean;
  mfaVerified: boolean;
  coordinatorAppointments: CoordinatorScopeContext[];
  activeCoordinatorScope: CoordinatorScopeContext | null;
  inactivityTimeoutMinutes: number;
  createdAtUtc: string;
  expiresAtUtc: string;
  lastActivityAtUtc: string;
}

export interface LoginInput {
  identifier: string;
  password: string;
  institutionCode?: string;
  activeRoleHeader?: string;
  coordinatorAppointmentHeader?: string;
  ip: string;
  userAgent?: string;
}

export interface LoginResult {
  sessionId: UUID;
  state: SessionState;
}

export interface HeartbeatResult {
  sessionId: UUID;
  expiresAtUtc: string;
  inactivityTimeoutMinutes: number;
}

export interface SessionCredential {
  cookieSessionId?: string;
  bearerSessionId?: string;
  ip: string;
}

/**
 * Result of `POST /api/v1/auth/mfa/enroll`. The seed and the recovery codes
 * are returned exactly once and are never retrievable again: only the
 * encrypted seed and the recovery-code digests are persisted (FR-224).
 */
export interface MfaEnrollResult {
  /** Base32 TOTP seed, for manual entry into an authenticator app. */
  secret: string;
  /** `otpauth://` URI the client renders as a QR code. */
  provisioningUri: string;
  /** The ten single-use recovery codes, shown once. */
  recoveryCodes: string[];
}

export interface MfaVerifyInput {
  sessionId: UUID;
  /** 6-digit TOTP code or a single-use recovery code (SEC-06). */
  code: string;
  /** Client IP, used for the FR-221 MFA verification rate limit. */
  ip: string;
}

export interface MfaVerifyResult {
  sessionId: UUID;
  /** Recovery codes the account still has unused after this verification. */
  recoveryCodesRemaining: number;
  expiresAtUtc: string;
  inactivityTimeoutMinutes: number;
}

export interface SessionContextInput {
  sessionId: UUID;
  /** The role the session should operate under from now on (FR-047). */
  targetRole: RoleCode;
  /** Mandatory when `targetRole` is `PROJECT_COORDINATOR` (BR-03). */
  coordinatorAppointmentId?: string;
}

export interface SessionContextResult {
  sessionId: UUID;
  activeRole: RoleCode;
  /** The single appointment the coordinator context is bound to (BR-03). */
  activeCoordinatorScope: CoordinatorScopeContext | null;
  mfaRequired: boolean;
  mfaVerified: boolean;
  inactivityTimeoutMinutes: number;
  expiresAtUtc: string;
}
