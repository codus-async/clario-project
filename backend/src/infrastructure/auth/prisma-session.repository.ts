import type { RoleCode, UUID } from "@clario/shared-contracts";

import type { PrismaClient } from "../../generated/prisma/client.js";
import { prisma } from "../database/prisma.js";
import type {
  NewSessionRow,
  SessionContextPatch,
  SessionCreationResult,
  SessionCredentialFence,
  SessionRecord,
  SessionRepository,
} from "../../modules/auth/auth.ports.js";
import { toRoleCode } from "../../modules/auth/auth.role-code.js";

function toSessionRecord(row: {
  id: string;
  user_id: string;
  institution_id: string | null;
  active_role: string;
  active_coordinator_appointment_id: string | null;
  mfa_verified: boolean;
  inactivity_timeout_minutes: number;
  last_activity_at: Date;
  expires_at: Date;
  is_revoked: boolean;
  revoked_reason: string | null;
}): SessionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    institutionId: row.institution_id,
    activeRole: toRoleCode(row.active_role),
    activeCoordinatorAppointmentId: row.active_coordinator_appointment_id,
    mfaVerified: row.mfa_verified,
    inactivityTimeoutMinutes: row.inactivity_timeout_minutes,
    lastActivityAt: row.last_activity_at,
    expiresAt: row.expires_at,
    isRevoked: row.is_revoked,
    revokedReason: row.revoked_reason,
  };
}

/**
 * PostgreSQL `user_sessions` persistence (F-64). The table is deliberately
 * not force-RLS protected: it is addressed by unguessable session id and is
 * the authoritative revocation/audit record for the Redis runtime state.
 */
export class PrismaSessionRepository implements SessionRepository {
  private readonly client: PrismaClient;

  constructor(client: PrismaClient = prisma) {
    this.client = client;
  }

  /**
   * Creates the session row, fenced on the credential the login verified.
   *
   * The row is written inside a transaction that first locks the account row
   * (`SELECT ... FOR UPDATE`) and only proceeds while the account still
   * carries that exact password hash:
   *
   * - a password reset that already committed changed the hash, so the
   *   locked row no longer matches and no session is created;
   * - a password reset that is still running holds the row lock, so this
   *   transaction waits for it; the reset then revokes the sessions of the
   *   account in its own transaction and the (re-checked) hash no longer
   *   matches, so no session is created either.
   *
   * Either way a password reset can never leave a live session behind that
   * was authenticated with the old password.
   */
  async create(
    row: NewSessionRow,
    fence: SessionCredentialFence,
  ): Promise<SessionCreationResult> {
    return this.client.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM users
        WHERE id = ${row.userId}::uuid
          AND password_hash = ${fence.passwordHash}
        FOR UPDATE
      `;

      if (locked.length === 0) {
        // The credential changed (or the account is gone): no session.
        return { created: false, reason: "CREDENTIAL_CHANGED" } as const;
      }

      await tx.user_sessions.create({
        data: {
          id: row.id,
          user_id: row.userId,
          institution_id: row.institutionId,
          active_role: row.activeRole,
          active_coordinator_appointment_id:
            row.activeCoordinatorAppointmentId,
          mfa_verified: row.mfaVerified,
          ip_address: row.ipAddress,
          user_agent: row.userAgent,
          inactivity_timeout_minutes: row.inactivityTimeoutMinutes,
          created_at: row.createdAt,
          last_activity_at: row.lastActivityAt,
          expires_at: row.expiresAt,
        },
      });

      return { created: true } as const;
    });
  }

  async findById(sessionId: UUID): Promise<SessionRecord | null> {
    const row = await this.client.user_sessions.findUnique({
      where: { id: sessionId },
    });
    return row === null ? null : toSessionRecord(row);
  }

  async markRevoked(sessionId: UUID, reason: string): Promise<void> {
    await this.client.user_sessions.updateMany({
      where: { id: sessionId, is_revoked: false },
      data: { is_revoked: true, revoked_reason: reason },
    });
  }

  async touchActivity(sessionId: UUID, at: Date): Promise<void> {
    await this.client.user_sessions.updateMany({
      where: { id: sessionId, is_revoked: false },
      data: { last_activity_at: at },
    });
  }

  /**
   * Applies an F-65 context patch (MFA upgrade or active-role switch) to a
   * live row and reports whether one existed. Only *present* fields are
   * written, so a patch can revert a single column (the compensation path in
   * `AuthService.persistSessionUpgrade`) without touching the others; the
   * `is_revoked` fence means a session revoked mid-flight is never
   * resurrected by the write.
   */
  async updateContext(
    sessionId: UUID,
    patch: SessionContextPatch,
  ): Promise<boolean> {
    const data: {
      active_role?: RoleCode;
      active_coordinator_appointment_id?: string | null;
      mfa_verified?: boolean;
      inactivity_timeout_minutes?: number;
    } = {};
    if (patch.activeRole !== undefined) {
      data.active_role = patch.activeRole;
    }
    if (patch.activeCoordinatorAppointmentId !== undefined) {
      data.active_coordinator_appointment_id =
        patch.activeCoordinatorAppointmentId;
    }
    if (patch.mfaVerified !== undefined) {
      data.mfa_verified = patch.mfaVerified;
    }
    if (patch.inactivityTimeoutMinutes !== undefined) {
      data.inactivity_timeout_minutes = patch.inactivityTimeoutMinutes;
    }

    const result = await this.client.user_sessions.updateMany({
      where: { id: sessionId, is_revoked: false },
      data,
    });
    return result.count > 0;
  }
}
