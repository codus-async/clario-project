import type { UUID } from "@clario/shared-contracts";

import type { PrismaClient } from "../../generated/prisma/client.js";
import { prisma } from "../database/prisma.js";
import type {
  NewSessionRow,
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

  async create(row: NewSessionRow): Promise<void> {
    await this.client.user_sessions.create({
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
        last_activity_at: row.lastActivityAt,
        expires_at: row.expiresAt,
      },
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
}
