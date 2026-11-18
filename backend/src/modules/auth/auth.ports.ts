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
  /**
   * Records the "last authenticated" timestamp of an account (F-64 §G).
   *
   * The write is best-effort by contract: a failed write must never turn a
   * successful authentication into an error, so the caller logs and carries
   * on. `users` is not RLS protected (it is addressed by the opaque session
   * id), so this goes through the plain Prisma client.
   */
  recordLogin(userId: UUID, at: Date): Promise<void>;
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
  /** Creation timestamp of the session (audit metadata). */
  createdAt: Date;
  /** Last activity (heartbeat) timestamp of the session. */
  lastActivityAt: Date;
  /** Absolute expiry timestamp of the session. */
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

/**
 * The credential a session was established with.
 *
 * The session row is only created while the account still carries this
 * exact password hash. It closes the window in which a login that is in
 * flight *while* a password reset lands could establish a session with the
 * old password: the reset writes the new hash and revokes every session of
 * the account in one transaction, and the session row can only be created
 * against the hash the login actually verified.
 */
export interface SessionCredentialFence {
  /** The password hash the session was authenticated against. */
  passwordHash: string;
}

/**
 * Outcome of a (fenced) session creation.
 */
export type SessionCreationResult =
  | { created: true }
  | { created: false; reason: "CREDENTIAL_CHANGED" };

export interface SessionRepository {
  /**
   * Creates the session row, fenced on the credential it was authenticated
   * with. The row is only written while the account still carries that
   * exact password hash, so a password reset that lands in the meantime
   * either rejects the creation or revokes the row — never leaves a live
   * session behind.
   */
  create(
    row: NewSessionRow,
    fence: SessionCredentialFence,
  ): Promise<SessionCreationResult>;
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

/**
 * Reservation for one in-flight Argon2id verification. Slots are acquired
 * *before* the KDF runs and released once the request finishes, so the
 * configured caps bound concurrent memory/CPU even when no failure has been
 * recorded yet (review finding P1).
 */
export interface VerificationSlot {
  token: string;
}

export interface LoginProtectionStore {
  check(input: { ip: string; identifier: string }): Promise<ProtectionCheckResult>;
  recordFailure(input: { ip: string; identifier: string }): Promise<void>;
  recordSuccess(input: { ip: string; identifier: string }): Promise<void>;
  /**
   * Reserves a verification slot for the IP, identifier and process-wide
   * dimensions. Returns `null` when any dimension is at capacity (the caller
   * must reject without running the KDF). Throws when Redis is unavailable.
   */
  acquireVerificationSlot(
    input: { ip: string; identifier: string },
  ): Promise<VerificationSlot | null>;
  /** Releases a previously acquired slot. Best-effort: failures are logged. */
  releaseVerificationSlot(
    input: { ip: string; identifier: string },
    slot: VerificationSlot,
  ): Promise<void>;
}

/**
 * An account as seen by the account-lifecycle flows (activation, password
 * reset). Deliberately narrower than {@link LoginUserRecord}: it carries the
 * single-use token digests and their expiry, and nothing about a live login.
 */
export interface AccountRecord {
  id: UUID;
  institutionId: UUID | null;
  isPlatformAdmin: boolean;
  fullName: string;
  email: string;
  accountStatus: string;
  mfaRequired: boolean;
  invitationTokenHash: string | null;
  invitationExpiresAt: Date | null;
  passwordResetTokenHash: string | null;
  passwordResetExpiresAt: Date | null;
}

export interface ActivateAccountInput {
  userId: UUID;
  /** Digest of the invitation token that was presented. */
  invitationTokenHash: string;
  passwordHash: string;
  mfaRequired: boolean;
  now: Date;
}

export interface IssuePasswordResetInput {
  userId: UUID;
  institutionId: UUID | null;
  /** Digest of the freshly generated reset token. */
  tokenHash: string;
  /** The raw token, handed to the transactional email (F-71). */
  rawToken: string;
  email: string;
  fullName: string;
  expiresAt: Date;
  now: Date;
}

export interface ConsumePasswordResetInput {
  userId: UUID;
  /** Digest of the reset token that was presented. */
  tokenHash: string;
  passwordHash: string;
  /** Reason recorded on every session the reset revokes. */
  revokeReason: string;
  now: Date;
}

export interface ConsumePasswordResetResult {
  /**
   * Whether the reset was applied. `false` when the token was already
   * consumed or expired — in that case nothing was written and no session
   * was revoked.
   */
  applied: boolean;
  /**
   * The ids of the sessions that were revoked by the *same* transaction that
   * stored the new password, so the caller can also drop the matching
   * runtime state.
   */
  revokedSessionIds: UUID[];
}

/**
 * Persistence of the account-lifecycle state (F-64).
 *
 * The token-consuming methods are deliberately *conditional writes*: they
 * only apply when the account is still in the expected state and the
 * presented token digest still matches. That makes "an invited account can
 * be activated only once" and "a reset token can be used only once"
 * database-enforced invariants rather than application-level races.
 */
export interface AccountRepository {
  findByInvitationTokenHash(
    tokenHash: string,
  ): Promise<AccountRecord | null>;
  findByPasswordResetTokenHash(
    tokenHash: string,
  ): Promise<AccountRecord | null>;
  /**
   * Finds the single active account matching an identifier (email or
   * institutional ID). Returns `null` when no account matches, when more
   * than one matches (ambiguous tenant), or when the matched account is not
   * active — the caller must not be able to tell those cases apart.
   */
  findActiveByIdentifier(
    identifier: string,
    institutionId?: UUID,
  ): Promise<AccountRecord | null>;
  /**
   * Activates an invited account. Returns `false` when the account is no
   * longer `INVITED`, the token no longer matches or the invitation has
   * expired — in every case nothing was written.
   */
  activateAccount(input: ActivateAccountInput): Promise<boolean>;
  /**
   * Stores the reset token and records the transactional-email request in
   * the same transaction, so a stored token always has a delivery request
   * (and never the other way round).
   */
  issuePasswordReset(input: IssuePasswordResetInput): Promise<void>;
  /**
   * Applies the new password, clears the reset token and revokes every
   * session of the account in **one** transaction.
   *
   * The three writes belong together: a session that survived a password
   * reset is a session that keeps the old credential alive, and a split
   * write (revoke first, then the password) leaves a window in which a
   * login in flight creates a session the reset has already passed.
   *
   * Returns `applied: false` when the token was already consumed or expired
   * — in that case nothing was written and no session was revoked.
   */
  consumePasswordReset(
    input: ConsumePasswordResetInput,
  ): Promise<ConsumePasswordResetResult>;
}
