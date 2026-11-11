import type { CoordinatorScopeContext, RoleCode, UUID } from "@clario/shared-contracts";

import type { SessionState } from "./auth.types.js";

// ---------------------------------------------------------------------------
// Ports (hexagonal boundaries). Infrastructure adapters implement these; the
// application service only ever talks to them.
// ---------------------------------------------------------------------------

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(storedHash: string, plain: string): Promise<boolean>;
  /**
   * Constant-work path used when no account matches the supplied identifier,
   * so that response timing does not reveal whether an account exists.
   */
  verifyDummy(plain: string): Promise<boolean>;
}

export interface InstitutionRecord {
  id: UUID;
  name: string;
  codeSlug: string;
  timezoneIana: string;
  accountStatus: string;
}

export interface LoginUserRecord {
  id: UUID;
  institutionId: UUID | null;
  isPlatformAdmin: boolean;
  fullName: string;
  email: string;
  institutionalIdNumber: string | null;
  accountStatus: string;
  passwordHash: string | null;
  mfaRequired: boolean;
  mfaEnrolled: boolean;
}

export interface UserRepository {
  /**
   * Returns every account matching `identifier` (email or institutional ID).
   * More than one row means the tenant is ambiguous and the caller must fail
   * closed with the generic authentication error (no enumeration oracle).
   */
  findLoginCandidates(
    identifier: string,
    institutionCode?: string,
  ): Promise<LoginUserRecord[]>;
  findById(userId: UUID): Promise<LoginUserRecord | null>;
}

export interface InstitutionRepository {
  findByCode(codeSlug: string): Promise<InstitutionRecord | null>;
  findById(institutionId: UUID): Promise<InstitutionRecord | null>;
}

export interface RoleAssignmentRepository {
  findActiveRoles(userId: UUID, institutionId: UUID): Promise<RoleCode[]>;
  findCoordinatorScopes(
    userId: UUID,
    institutionId: UUID,
  ): Promise<CoordinatorScopeContext[]>;
}

export interface NewSessionRow {
  id: UUID;
  userId: UUID;
  institutionId: UUID | null;
  activeRole: RoleCode;
  activeCoordinatorAppointmentId: UUID | null;
  mfaVerified: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  inactivityTimeoutMinutes: number;
  lastActivityAt: Date;
  expiresAt: Date;
}

export interface SessionRecord {
  id: UUID;
  userId: UUID;
  institutionId: UUID | null;
  activeRole: RoleCode;
  activeCoordinatorAppointmentId: UUID | null;
  mfaVerified: boolean;
  inactivityTimeoutMinutes: number;
  lastActivityAt: Date;
  expiresAt: Date;
  isRevoked: boolean;
  revokedReason: string | null;
}

export interface SessionRepository {
  create(row: NewSessionRow): Promise<void>;
  findById(sessionId: UUID): Promise<SessionRecord | null>;
  markRevoked(sessionId: UUID, reason: string): Promise<void>;
  touchActivity(sessionId: UUID, at: Date): Promise<void>;
}

export interface SessionStore {
  get(sessionId: UUID): Promise<SessionState | null>;
  set(state: SessionState, ttlSeconds: number): Promise<void>;
  delete(sessionId: UUID): Promise<void>;
}

export interface ProtectionCheckResult {
  locked: boolean;
  retryAfterSeconds: number | null;
}

export interface LoginProtectionStore {
  check(input: { ip: string; identifier: string }): Promise<ProtectionCheckResult>;
  recordFailure(input: { ip: string; identifier: string }): Promise<void>;
  recordSuccess(input: { ip: string; identifier: string }): Promise<void>;
}
