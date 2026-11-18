import type { UUID } from "@clario/shared-contracts";

import { env } from "../../config/env.js";
import {
  Prisma,
  type PrismaClient,
} from "../../generated/prisma/client.js";
import { prisma } from "../database/prisma.js";
import { PayloadCipher } from "../security/payload-cipher.js";
import type {
  AccountRecord,
  AccountRepository,
  ActivateAccountInput,
  ConsumePasswordResetInput,
  ConsumePasswordResetResult,
  IssuePasswordResetInput,
} from "../../modules/auth/auth.ports.js";

/**
 * Event type of the transactional-email request recorded for a password
 * reset (F-71). The relay/worker that turns it into an email is a later
 * feature; recording the request inside the business transaction is what
 * F-64 owns (AGENTS.md §3.6).
 */
const PASSWORD_RESET_EVENT_TYPE = "AUTH_PASSWORD_RESET_REQUESTED";

interface AccountRow {
  id: string;
  institution_id: string | null;
  is_platform_admin: boolean;
  full_name: string;
  email: string;
  account_status: string;
  mfa_required: boolean;
  invitation_token_hash: string | null;
  invitation_expires_at: Date | null;
  password_reset_token_hash: string | null;
  password_reset_expires_at: Date | null;
}

function toAccountRecord(row: AccountRow): AccountRecord {
  return {
    id: row.id,
    institutionId: row.institution_id,
    isPlatformAdmin: row.is_platform_admin,
    fullName: row.full_name,
    email: row.email,
    accountStatus: row.account_status,
    mfaRequired: row.mfa_required,
    invitationTokenHash: row.invitation_token_hash,
    invitationExpiresAt: row.invitation_expires_at,
    passwordResetTokenHash: row.password_reset_token_hash,
    passwordResetExpiresAt: row.password_reset_expires_at,
  };
}

/**
 * PostgreSQL persistence of the account-lifecycle state (F-64).
 *
 * `users` is not force-RLS protected (it is addressed by an opaque token
 * digest, and its `institution_id` is NULL for Platform Admins), so these
 * writes run on the plain Prisma client — exactly like the existing login
 * lookups. The tenant-scoped tables (`user_role_assignments`,
 * `coordinator_appointments`) are *not* touched here; they are read through
 * the institution-scoped RLS transaction by
 * `PrismaRoleAssignmentRepository`.
 *
 * The password reset spans two tables (`users` and `user_sessions`), so this
 * adapter also performs the bulk session revocation of a reset: the write
 * of the new password and the revocation of the account's sessions have to
 * be a single transaction, and they belong to one credential change.
 */
export class PrismaAccountRepository implements AccountRepository {
  private readonly client: PrismaClient;
  private readonly cipher: PayloadCipher;

  constructor(
    client: PrismaClient = prisma,
    cipher: PayloadCipher = new PayloadCipher(
      env.OUTBOX_PAYLOAD_ENCRYPTION_KEY,
    ),
  ) {
    this.client = client;
    this.cipher = cipher;
  }

  async findByInvitationTokenHash(
    tokenHash: string,
  ): Promise<AccountRecord | null> {
    const row = await this.client.users.findFirst({
      where: { invitation_token_hash: tokenHash },
    });
    return row === null ? null : toAccountRecord(row);
  }

  async findByPasswordResetTokenHash(
    tokenHash: string,
  ): Promise<AccountRecord | null> {
    const row = await this.client.users.findFirst({
      where: { password_reset_token_hash: tokenHash },
    });
    return row === null ? null : toAccountRecord(row);
  }

  async findActiveByIdentifier(
    identifier: string,
    institutionId?: UUID,
  ): Promise<AccountRecord | null> {
    const rows = await this.client.users.findMany({
      where: {
        AND: [
          ...(institutionId !== undefined
            ? [{ institution_id: institutionId }]
            : []),
          {
            OR: [
              { email: identifier },
              { institutional_id_number: identifier },
            ],
          },
          { account_status: "ACTIVE" },
        ],
      },
      // A second row only exists to detect tenant ambiguity; the caller
      // treats every non-unique match as "no account".
      take: 2,
    });

    if (rows.length !== 1) {
      return null;
    }

    return toAccountRecord(rows[0] as AccountRow);
  }

  async activateAccount(input: ActivateAccountInput): Promise<boolean> {
    const result = await this.client.users.updateMany({
      where: {
        id: input.userId,
        account_status: "INVITED",
        invitation_token_hash: input.invitationTokenHash,
        invitation_expires_at: { gt: input.now },
      },
      data: {
        account_status: "ACTIVE",
        password_hash: input.passwordHash,
        mfa_required: input.mfaRequired,
        invitation_token_hash: null,
        invitation_expires_at: null,
        updated_at: input.now,
      },
    });

    return result.count > 0;
  }

  async issuePasswordReset(input: IssuePasswordResetInput): Promise<void> {
    await this.client.$transaction(async (tx) => {
      const updated = await tx.users.updateMany({
        where: { id: input.userId, account_status: "ACTIVE" },
        data: {
          password_reset_token_hash: input.tokenHash,
          password_reset_expires_at: input.expiresAt,
          updated_at: input.now,
        },
      });

      if (updated.count === 0) {
        // The account was deactivated between the lookup and this write:
        // there is nothing to send a reset link to.
        return;
      }

      // The reset token is a live credential, so it is never stored in
      // clear text: the payload carries the encrypted envelope, and the
      // relay decrypts it with the same key. The envelope is bound to the
      // account and the event type, not to this row: only a row carrying
      // the same `aggregate_id` and `event_type` decrypts it, so it cannot
      // be replayed against another account or another event type. The
      // relay purges the payload after the dispatch — the row itself must
      // never keep a readable credential.
      const tokenEnvelope = this.cipher.encrypt(
        input.rawToken,
        `${input.userId}|${PASSWORD_RESET_EVENT_TYPE}`,
      );

      await tx.transactional_outbox_events.create({
        data: {
          institution_id: input.institutionId,
          event_type: PASSWORD_RESET_EVENT_TYPE,
          aggregate_type: "user",
          aggregate_id: input.userId,
          payload_jsonb: {
            email: input.email,
            full_name: input.fullName,
            token_encrypted: tokenEnvelope,
            expires_at_utc: input.expiresAt.toISOString(),
          } satisfies Prisma.InputJsonObject,
        },
      });
    });
  }

  /**
   * Applies the new password, clears the reset token and revokes every
   * session of the account in one transaction.
   *
   * The revocation belongs to the same transaction as the password write:
   * a session that survives a password reset is a session that keeps the
   * old credential usable, and splitting the two writes opens a window in
   * which a login in flight creates a session the reset has already passed.
   */
  async consumePasswordReset(
    input: ConsumePasswordResetInput,
  ): Promise<ConsumePasswordResetResult> {
    return this.client.$transaction(async (tx) => {
      const updated = await tx.users.updateMany({
        where: {
          id: input.userId,
          password_reset_token_hash: input.tokenHash,
          password_reset_expires_at: { gt: input.now },
        },
        data: {
          password_hash: input.passwordHash,
          password_reset_token_hash: null,
          password_reset_expires_at: null,
          updated_at: input.now,
        },
      });

      if (updated.count === 0) {
        // The token was consumed (or expired) in the meantime: nothing is
        // written and no session is revoked.
        return { applied: false, revokedSessionIds: [] };
      }

      const revoked = await tx.user_sessions.updateManyAndReturn({
        where: { user_id: input.userId, is_revoked: false },
        data: { is_revoked: true, revoked_reason: input.revokeReason },
        select: { id: true },
      });

      return {
        applied: true,
        revokedSessionIds: revoked.map((row) => row.id),
      };
    });
  }
}
