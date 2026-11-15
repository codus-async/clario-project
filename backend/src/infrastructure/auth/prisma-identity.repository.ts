import type { CoordinatorScopeContext, RoleCode, UUID } from "@clario/shared-contracts";

import type { PrismaClient } from "../../generated/prisma/client.js";
import { prisma } from "../database/prisma.js";
import { withInstitutionScopeTransaction } from "../database/tenant-transaction.js";
import type {
  InstitutionRecord,
  InstitutionRepository,
  LoginUserRecord,
  RoleAssignmentRepository,
  UserRepository,
} from "../../modules/auth/auth.ports.js";
import { toRoleCode } from "../../modules/auth/auth.role-code.js";

function toLoginUserRecord(row: {
  id: string;
  institution_id: string | null;
  is_platform_admin: boolean;
  full_name: string;
  email: string;
  institutional_id_number: string | null;
  account_status: string;
  password_hash: string | null;
  mfa_required: boolean;
  mfa_enrolled: boolean;
}): LoginUserRecord {
  return {
    id: row.id,
    institutionId: row.institution_id,
    isPlatformAdmin: row.is_platform_admin,
    fullName: row.full_name,
    email: row.email,
    institutionalIdNumber: row.institutional_id_number,
    accountStatus: row.account_status,
    passwordHash: row.password_hash,
    mfaRequired: row.mfa_required,
    mfaEnrolled: row.mfa_enrolled,
  };
}

function toInstitutionRecord(row: {
  id: string;
  name: string;
  code_slug: string;
  timezone_iana: string;
  account_status: string;
}): InstitutionRecord {
  return {
    id: row.id,
    name: row.name,
    codeSlug: row.code_slug,
    timezoneIana: row.timezone_iana,
    accountStatus: row.account_status,
  };
}

export class PrismaUserRepository implements UserRepository {
  private readonly client: PrismaClient;

  constructor(client: PrismaClient = prisma) {
    this.client = client;
  }

  async findLoginCandidates(
    identifier: string,
    institutionId?: UUID,
  ): Promise<LoginUserRecord[]> {
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
        ],
      },
      // A second row only exists to detect tenant ambiguity; the generic
      // authentication failure is raised by the service either way.
      take: 2,
    });

    return rows.map(toLoginUserRecord);
  }

  async findById(userId: UUID): Promise<LoginUserRecord | null> {
    const row = await this.client.users.findUnique({ where: { id: userId } });
    return row === null ? null : toLoginUserRecord(row);
  }
}

export class PrismaInstitutionRepository implements InstitutionRepository {
  private readonly client: PrismaClient;

  constructor(client: PrismaClient = prisma) {
    this.client = client;
  }

  async findByCode(codeSlug: string): Promise<InstitutionRecord | null> {
    const row = await this.client.institutions.findUnique({
      where: { code_slug: codeSlug },
    });
    return row === null ? null : toInstitutionRecord(row);
  }

  async findById(institutionId: UUID): Promise<InstitutionRecord | null> {
    const row = await this.client.institutions.findUnique({
      where: { id: institutionId },
    });
    return row === null ? null : toInstitutionRecord(row);
  }
}

/**
 * Reads `user_role_assignments` and `coordinator_appointments` through the
 * institution-scoped RLS transaction: both tables are force-RLS protected and
 * login resolves them before any session (and therefore any active role)
 * exists.
 */
export class PrismaRoleAssignmentRepository implements RoleAssignmentRepository {
  private readonly client: PrismaClient;

  constructor(client: PrismaClient = prisma) {
    this.client = client;
  }

  async findActiveRoles(
    userId: UUID,
    institutionId: UUID,
  ): Promise<RoleCode[]> {
    return withInstitutionScopeTransaction(
      institutionId,
      async (tx) => {
        const rows = await tx.user_role_assignments.findMany({
          where: {
            user_id: userId,
            institution_id: institutionId,
            status: "ACTIVE",
          },
          select: { role_code: true },
        });
        return rows.map((row) => toRoleCode(row.role_code));
      },
      { client: this.client },
    );
  }

  async findCoordinatorScopes(
    userId: UUID,
    institutionId: UUID,
  ): Promise<CoordinatorScopeContext[]> {
    return withInstitutionScopeTransaction(
      institutionId,
      async (tx) => {
        const rows = await tx.coordinator_appointments.findMany({
          where: {
            user_id: userId,
            institution_id: institutionId,
            status: "ACTIVE",
          },
          include: {
            programmes: {
              select: { name: true, code: true, department_id: true },
            },
            academic_sessions: { select: { session_label: true } },
          },
        });

        return rows.map((row) => ({
          appointmentId: row.id,
          programmeId: row.programme_id,
          programmeName: row.programmes.name,
          programmeCode: row.programmes.code,
          departmentId: row.programmes.department_id,
          academicSessionId: row.academic_session_id,
          academicSessionLabel: row.academic_sessions.session_label,
        }));
      },
      { client: this.client },
    );
  }
}
