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
