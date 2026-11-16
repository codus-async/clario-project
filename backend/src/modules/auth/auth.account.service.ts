import {
  MANDATORY_MFA_ROLES,
  type UUID,
} from "@clario/shared-contracts";

import { AppError } from "../../errors/app-error.js";
import { ERROR_CODES } from "../../errors/error-codes.js";
import { baseLogger } from "../../infrastructure/logging/logger.js";
import type { AuthConfig } from "./auth.config.js";
import {
  assertPasswordPolicy,
  type CompromisedPasswordChecker,
} from "./auth.password-policy.js";
import type {
  AccountRecord,
  AccountRepository,
  InstitutionRepository,
  PasswordHasher,
  RoleAssignmentRepository,
  SessionRepository,
  SessionStore,
} from "./auth.ports.js";
import {
  generateSingleUseToken,
  hashSingleUseToken,
} from "./auth.token.js";
import {
  MAX_IDENTIFIER_LENGTH,
  MAX_INSTITUTION_CODE_LENGTH,
} from "./auth.service.js";

/**
 * Reason recorded on every session revoked by a password reset. It is part
 * of the audit trail of `user_sessions` (F-64).
 */
const REVOKE_REASON_PASSWORD_RESET = "PASSWORD_RESET";

export interface ActivateInput {
  token: string;
  password: string;
}

export interface ActivationResult {
  userId: UUID;
  accountStatus: string;
  mfaRequired: boolean;
  mfaEnrolled: boolean;
}

export interface PasswordResetRequestInput {
  identifier: string;
  institutionCode?: string;
}

export interface PasswordResetInput {
  token: string;
  password: string;
}

export interface AccountServiceDeps {
  config: AuthConfig;
  hasher: PasswordHasher;
  accounts: AccountRepository;
  institutions: InstitutionRepository;
  roles: RoleAssignmentRepository;
  sessions: SessionRepository;
  sessionStore: SessionStore;
  compromisedPasswords: CompromisedPasswordChecker;
}

/**
 * The activation token is a credential: an unknown, expired, already used
 * and tampered token are indistinguishable to the caller (SEC-04). The
 * message is deliberately identical for all of them.
 */
function invalidActivationToken(): AppError {
  const message = "The activation token is invalid or has expired.";
  return new AppError(ERROR_CODES.VALIDATION_ERROR, message, [
    { field: "token", message },
  ]);
}

/**
 * Same anti-enumeration rule as the activation token: an unknown, expired
 * and already used reset token are indistinguishable.
 */
function invalidResetToken(): AppError {
  const message = "The password reset token is invalid or has expired.";
  return new AppError(ERROR_CODES.VALIDATION_ERROR, message, [
    { field: "token", message },
  ]);
}

function fieldError(field: string, message: string): AppError {
  return new AppError(ERROR_CODES.VALIDATION_ERROR, message, [
    { field, message },
  ]);
}

/**
 * Account-lifecycle business logic of F-64: activating an invited account,
 * requesting a self-service password reset and completing it.
 *
 * It sits next to {@link AuthService} (which owns the login/session
 * lifecycle) and talks to the same ports, so both services share one
 * password hasher, one session store and one tenant model.
 */
export class AccountService {
  private readonly config: AuthConfig;
  private readonly hasher: PasswordHasher;
  private readonly accounts: AccountRepository;
  private readonly institutions: InstitutionRepository;
  private readonly roles: RoleAssignmentRepository;
  private readonly sessions: SessionRepository;
  private readonly sessionStore: SessionStore;
  private readonly compromisedPasswords: CompromisedPasswordChecker;

  constructor(deps: AccountServiceDeps) {
    this.config = deps.config;
    this.hasher = deps.hasher;
    this.accounts = deps.accounts;
    this.institutions = deps.institutions;
    this.roles = deps.roles;
    this.sessions = deps.sessions;
    this.sessionStore = deps.sessionStore;
    this.compromisedPasswords = deps.compromisedPasswords;
  }

  // -------------------------------------------------------------------------
  // POST /api/v1/auth/activate
  // -------------------------------------------------------------------------

  /**
   * Activates an invited account exactly once (F-64, AC-F64-01).
   *
   * The activation is a *conditional write*: the account is only updated
   * while it is still `INVITED` and the presented token digest still
   * matches the stored one. A second activation with the same token finds
   * no matching account and is rejected with the same generic error as an
   * unknown token.
   */
  async activate(input: ActivateInput): Promise<ActivationResult> {
    const token = this.validateToken(input.token, invalidActivationToken);
    await assertPasswordPolicy(input.password, this.compromisedPasswords);

    const tokenHash = hashSingleUseToken(token);
    const account = await this.accounts.findByInvitationTokenHash(tokenHash);
    if (account === null) {
      throw invalidActivationToken();
    }

    const now = new Date();
    if (!this.isActivationUsable(account, now)) {
      throw invalidActivationToken();
    }

    const mfaRequired = await this.resolveMfaRequired(account);
    const passwordHash = await this.hasher.hash(input.password);

    const activated = await this.accounts.activateAccount({
      userId: account.id,
      invitationTokenHash: tokenHash,
      passwordHash,
      mfaRequired,
      now,
    });
    if (!activated) {
      // Another request consumed the invitation in the meantime: the token
      // is spent and the account may already be active.
      throw invalidActivationToken();
    }

    return {
      userId: account.id,
      accountStatus: "ACTIVE",
      mfaRequired,
      mfaEnrolled: false,
    };
  }

  // -------------------------------------------------------------------------
  // POST /api/v1/auth/password/forgot
  // -------------------------------------------------------------------------

  /**
   * Issues a single-use password-reset token for an active account.
   *
   * The response is identical whether or not the account exists: an
   * unknown identifier, a deactivated account and an ambiguous identifier
   * all produce the same generic acknowledgement, so the endpoint cannot be
   * used to enumerate accounts (SEC-04).
   *
   * Each request replaces the previous token, so only the newest reset link
   * is ever usable. The *dispatch* rate limit (how many reset emails a
   * client may trigger) belongs to the transactional-email feature (F-71),
   * which owns the relay; the login protection counters of SEC-04 are
   * deliberately not reused here, because a reset request must never lock
   * the account out of its own login.
   */
  async requestPasswordReset(
    input: PasswordResetRequestInput,
  ): Promise<void> {
    const identifier = this.validateIdentifier(input.identifier);
    const institutionCode = this.validateInstitutionCode(
      input.institutionCode,
    );

    let institutionId: UUID | undefined;
    if (institutionCode !== undefined) {
      const institution = await this.institutions.findByCode(institutionCode);
      if (institution === null) {
        return;
      }
      institutionId = institution.id;
    }

    const account = await this.accounts.findActiveByIdentifier(
      identifier,
      institutionId,
    );
    if (account === null) {
      return;
    }

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + this.config.passwordResetTokenTtlMinutes * 60_000,
    );
    const rawToken = generateSingleUseToken();

    // The token digest and the transactional-email request (F-71) are
    // written in one transaction, so a stored token always has a delivery
    // request behind it.
    await this.accounts.issuePasswordReset({
      userId: account.id,
      institutionId: account.institutionId,
      tokenHash: hashSingleUseToken(rawToken),
      rawToken,
      email: account.email,
      fullName: account.fullName,
      expiresAt,
      now,
    });
  }

  // -------------------------------------------------------------------------
  // POST /api/v1/auth/password/reset
  // -------------------------------------------------------------------------

  /**
   * Completes a password reset (F-64, FR-227).
   *
   * Ordering matters: the account's sessions are revoked *before* the new
   * password is stored. If the password write then fails, the account keeps
   * its old password and the (still unconsumed) token can be used again —
   * the user is logged out but never left with an old password on a live
   * session. The reverse order would leave sessions usable with a password
   * the account holder believes to have abandoned.
   */
  async resetPassword(input: PasswordResetInput): Promise<void> {
    const token = this.validateToken(input.token, invalidResetToken);
    await assertPasswordPolicy(input.password, this.compromisedPasswords);

    const tokenHash = hashSingleUseToken(token);
    const account = await this.accounts.findByPasswordResetTokenHash(
      tokenHash,
    );
    if (account === null) {
      throw invalidResetToken();
    }

    const now = new Date();
    if (
      account.accountStatus !== "ACTIVE" ||
      account.passwordResetExpiresAt === null ||
      account.passwordResetExpiresAt.getTime() <= now.getTime()
    ) {
      throw invalidResetToken();
    }

    const passwordHash = await this.hasher.hash(input.password);

    await this.revokeAllSessions(account.id);

    const applied = await this.accounts.consumePasswordReset({
      userId: account.id,
      tokenHash,
      passwordHash,
      now,
    });
    if (!applied) {
      // The token was consumed by a concurrent request (single-use).
      throw invalidResetToken();
    }
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  /**
   * Revokes every session of the account in PostgreSQL (the authoritative
   * revocation record) and drops the matching runtime state in Redis.
   *
   * A failure to delete a runtime state is not fatal: the next request
   * cross-checks the Redis state against the revoked row and fails closed.
   */
  private async revokeAllSessions(userId: UUID): Promise<void> {
    let revokedSessionIds: UUID[];
    try {
      revokedSessionIds = await this.sessions.revokeAllForUser(
        userId,
        REVOKE_REASON_PASSWORD_RESET,
      );
    } catch (error) {
      baseLogger.error(
        { err: error, module: "auth" },
        "Failed to revoke sessions after password reset",
      );
      throw new AppError(
        ERROR_CODES.SERVICE_UNAVAILABLE,
        "The password could not be reset. Please try again.",
      );
    }

    for (const sessionId of revokedSessionIds) {
      try {
        await this.sessionStore.delete(sessionId);
      } catch (error) {
        baseLogger.warn(
          { err: error, module: "auth" },
          "Failed to delete runtime session state after password reset",
        );
      }
    }
  }

  private isActivationUsable(account: AccountRecord, now: Date): boolean {
    return (
      account.accountStatus === "INVITED" &&
      account.invitationExpiresAt !== null &&
      account.invitationExpiresAt.getTime() > now.getTime()
    );
  }

  /**
   * Decides whether the account must enrol in MFA (SEC-06, AC-F64-02).
   *
   * Platform Admins always require MFA — the database constraint
   * `chk_platform_vs_tenant_user` demands `mfa_required = TRUE` for them
   * anyway. For tenant accounts the flag is raised when the account holds
   * one of the `MANDATORY_MFA_ROLES` (Institutional Admin, Project
   * Coordinator).
   */
  private async resolveMfaRequired(account: AccountRecord): Promise<boolean> {
    if (account.isPlatformAdmin) {
      return true;
    }

    if (account.institutionId === null) {
      return account.mfaRequired;
    }

    const roles = await this.roles.findActiveRoles(
      account.id,
      account.institutionId,
    );
    return (
      account.mfaRequired ||
      roles.some((role) => MANDATORY_MFA_ROLES.includes(role))
    );
  }

  private validateToken(
    value: string,
    invalid: () => AppError,
  ): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw invalid();
    }
    // The token is used exactly as presented: it is never trimmed, because
    // the digest of a trimmed token would not match the stored digest.
    return value;
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

  private validateInstitutionCode(
    value: string | undefined,
  ): string | undefined {
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
}
