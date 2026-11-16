import type { UUID } from "@clario/shared-contracts";

import {
  Prisma,
  type PrismaClient,
} from "../../generated/prisma/client.js";
import { prisma } from "../database/prisma.js";
import type {
  AccountRecord,
  AccountRepository,
  ActivateAccountInput,
  ConsumePasswordResetInput,
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
 */
export class PrismaAccountRepository implements AccountRepository {
  private readonly client: PrismaClient;

  constructor(client: PrismaClient = prisma) {
    this.client = client;
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

      await tx.transactional_outbox_events.create({
        data: {
          institution_id: input.institutionId,
          event_type: PASSWORD_RESET_EVENT_TYPE,
          aggregate_type: "user",
          aggregate_id: input.userId,
          payload_jsonb: {
            email: input.email,
            full_name: input.fullName,
            token: input.rawToken,
            expires_at_utc: input.expiresAt.toISOString(),
          } satisfies Prisma.InputJsonObject,
        },
      });
    });
  }

  async consumePasswordReset(
    input: ConsumePasswordResetInput,
  ): Promise<boolean> {
    const result = await this.client.users.updateMany({
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

    return result.count > 0;
  }
}
