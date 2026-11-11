import {
  RoleCode,
  type CoordinatorScopeContext,
  type UUID,
} from "@clario/shared-contracts";

import { EnvironmentSchema } from "../../../config/env.js";
import {
  resolveAuthConfig,
  type AuthConfig,
} from "../../../modules/auth/auth.config.js";
import type {
  InstitutionRecord,
  InstitutionRepository,
  LoginProtectionStore,
  LoginUserRecord,
  NewSessionRow,
  PasswordHasher,
  ProtectionCheckResult,
  RoleAssignmentRepository,
  SessionRecord,
  SessionRepository,
  SessionStore,
  UserRepository,
} from "../../../modules/auth/auth.ports.js";
import { AuthService } from "../../../modules/auth/auth.service.js";
import type { SessionState } from "../../../modules/auth/auth.types.js";

export const testAuthConfig: AuthConfig = resolveAuthConfig(
  EnvironmentSchema.parse({
    NODE_ENV: "test",
    PORT: "3000",
    DATABASE_URL: "postgresql://user:pass@localhost:5432/clario",
    DIRECT_URL: "postgresql://user:pass@localhost:5432/clario",
    REDIS_URL: "redis://localhost:6379",
    LOG_LEVEL: "info",
  }),
);

export class FakePasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `fake-argon2id$${plain}`;
  }

  async verify(storedHash: string, plain: string): Promise<boolean> {
    return storedHash === `fake-argon2id$${plain}`;
  }

  async verifyDummy(): Promise<boolean> {
    return false;
  }
}

export class FakeUserRepository implements UserRepository {
  users: LoginUserRecord[] = [];

  async findLoginCandidates(
    identifier: string,
    institutionId?: UUID,
  ): Promise<LoginUserRecord[]> {
    const needle = identifier.toLowerCase();
    return this.users
      .filter(
        (user) =>
          (institutionId === undefined || user.institutionId === institutionId) &&
          (user.email.toLowerCase() === needle ||
            (user.institutionalIdNumber?.toLowerCase() ?? "") === needle),
      )
      .slice(0, 2);
  }

  async findById(userId: UUID): Promise<LoginUserRecord | null> {
    return this.users.find((user) => user.id === userId) ?? null;
  }
}

export class FakeInstitutionRepository implements InstitutionRepository {
  institutions: InstitutionRecord[] = [];

  async findByCode(codeSlug: string): Promise<InstitutionRecord | null> {
    const needle = codeSlug.toLowerCase();
    return (
      this.institutions.find(
        (institution) => institution.codeSlug.toLowerCase() === needle,
      ) ?? null
    );
  }

  async findById(institutionId: UUID): Promise<InstitutionRecord | null> {
    return (
      this.institutions.find(
        (institution) => institution.id === institutionId,
      ) ?? null
    );
  }
}

export class FakeRoleAssignmentRepository implements RoleAssignmentRepository {
  roles = new Map<string, RoleCode[]>();
  coordinatorScopes = new Map<string, CoordinatorScopeContext[]>();

  async findActiveRoles(
    userId: UUID,
    institutionId: UUID,
  ): Promise<RoleCode[]> {
    return [...(this.roles.get(`${userId}:${institutionId}`) ?? [])];
  }

  async findCoordinatorScopes(
    userId: UUID,
    institutionId: UUID,
  ): Promise<CoordinatorScopeContext[]> {
    return [
      ...(this.coordinatorScopes.get(`${userId}:${institutionId}`) ?? []),
    ];
  }
}

interface StoredSessionRow extends NewSessionRow {
  isRevoked: boolean;
  revokedReason: string | null;
}

export class FakeSessionRepository implements SessionRepository {
  rows = new Map<string, StoredSessionRow>();
  createShouldFail = false;

  async create(row: NewSessionRow): Promise<void> {
    if (this.createShouldFail) {
      throw new Error("postgres unavailable");
    }
    this.rows.set(row.id, { ...row, isRevoked: false, revokedReason: null });
  }

  async findById(sessionId: UUID): Promise<SessionRecord | null> {
    const row = this.rows.get(sessionId);
    if (row === undefined) {
      return null;
    }
    return { ...row };
  }

  async markRevoked(sessionId: UUID, reason: string): Promise<void> {
    const row = this.rows.get(sessionId);
    if (row !== undefined) {
      row.isRevoked = true;
      row.revokedReason = reason;
    }
  }

  async touchActivity(sessionId: UUID, at: Date): Promise<void> {
    const row = this.rows.get(sessionId);
    if (row !== undefined) {
      row.lastActivityAt = at;
    }
  }
}

export class FakeSessionStore implements SessionStore {
  states = new Map<string, SessionState>();
  ttls = new Map<string, number>();
  setShouldFail = false;

  async get(sessionId: UUID): Promise<SessionState | null> {
    return this.states.get(sessionId) ?? null;
  }

  async set(state: SessionState, ttlSeconds: number): Promise<void> {
    if (this.setShouldFail) {
      throw new Error("redis unavailable");
    }
    this.states.set(state.sessionId, state);
    this.ttls.set(state.sessionId, ttlSeconds);
  }

  async delete(sessionId: UUID): Promise<void> {
    this.states.delete(sessionId);
    this.ttls.delete(sessionId);
  }
}

export class FakeProtectionStore implements LoginProtectionStore {
  locked = false;
  retryAfterSeconds: number | null = null;
  failures: Array<{ ip: string; identifier: string }> = [];
  successes: Array<{ ip: string; identifier: string }> = [];

  async check(): Promise<ProtectionCheckResult> {
    return {
      locked: this.locked,
      retryAfterSeconds: this.retryAfterSeconds,
    };
  }

  async recordFailure(input: { ip: string; identifier: string }): Promise<void> {
    this.failures.push(input);
  }

  async recordSuccess(input: { ip: string; identifier: string }): Promise<void> {
    this.successes.push(input);
  }
}

export interface FakeAuthFixture {
  service: AuthService;
  hasher: FakePasswordHasher;
  users: FakeUserRepository;
  institutions: FakeInstitutionRepository;
  roles: FakeRoleAssignmentRepository;
  sessions: FakeSessionRepository;
  sessionStore: FakeSessionStore;
  protection: FakeProtectionStore;
  config: AuthConfig;
}

export function createFakeAuthFixture(): FakeAuthFixture {
  const hasher = new FakePasswordHasher();
  const users = new FakeUserRepository();
  const institutions = new FakeInstitutionRepository();
  const roles = new FakeRoleAssignmentRepository();
  const sessions = new FakeSessionRepository();
  const sessionStore = new FakeSessionStore();
  const protection = new FakeProtectionStore();

  const service = new AuthService({
    config: testAuthConfig,
    hasher,
    users,
    institutions,
    roles,
    sessions,
    sessionStore,
    protection,
  });

  return {
    service,
    hasher,
    users,
    institutions,
    roles,
    sessions,
    sessionStore,
    protection,
    config: testAuthConfig,
  };
}

export const INSTITUTION_ID = "11111111-1111-4111-8111-111111111111";
export const USER_ID = "22222222-2222-4222-8222-222222222222";

export function seedInstitution(
  fixture: FakeAuthFixture,
  overrides: Partial<InstitutionRecord> = {},
): InstitutionRecord {
  const institution: InstitutionRecord = {
    id: INSTITUTION_ID,
    name: "University of Lagos",
    codeSlug: "UNILAG",
    timezoneIana: "Africa/Lagos",
    accountStatus: "ACTIVE",
    ...overrides,
  };
  fixture.institutions.institutions.push(institution);
  return institution;
}

export function seedTenantUser(
  fixture: FakeAuthFixture,
  overrides: Partial<LoginUserRecord> = {},
): LoginUserRecord {
  const user: LoginUserRecord = {
    id: USER_ID,
    institutionId: INSTITUTION_ID,
    isPlatformAdmin: false,
    fullName: "Dr. Tunde Adewale",
    email: "tunde.adewale@unilag.edu.ng",
    institutionalIdNumber: "UNILAG/STAFF/0042",
    accountStatus: "ACTIVE",
    passwordHash: "fake-argon2id$Correct-Horse-Battery-Staple-99!",
    mfaRequired: false,
    mfaEnrolled: false,
    ...overrides,
  };
  fixture.users.users.push(user);
  return user;
}

export function seedRoles(
  fixture: FakeAuthFixture,
  roles: RoleCode[],
  userId: UUID = USER_ID,
  institutionId: UUID = INSTITUTION_ID,
): void {
  fixture.roles.roles.set(`${userId}:${institutionId}`, [...roles]);
}

export function coordinatorScope(
  overrides: Partial<CoordinatorScopeContext> = {},
): CoordinatorScopeContext {
  return {
    appointmentId: "33333333-3333-4333-8333-333333333333",
    programmeId: "44444444-4444-4444-8444-444444444444",
    programmeName: "B.Sc. Computer Science",
    programmeCode: "CSC",
    departmentId: "55555555-5555-4555-8555-555555555555",
    academicSessionId: "66666666-6666-4666-8666-666666666666",
    academicSessionLabel: "2026/2027",
    ...overrides,
  };
}

export function seedCoordinatorScopes(
  fixture: FakeAuthFixture,
  scopes: CoordinatorScopeContext[],
  userId: UUID = USER_ID,
  institutionId: UUID = INSTITUTION_ID,
): void {
  fixture.roles.coordinatorScopes.set(
    `${userId}:${institutionId}`,
    [...scopes],
  );
}

export const PASSWORD = "Correct-Horse-Battery-Staple-99!";

export const LOGIN_PAYLOAD = {
  identifier: "tunde.adewale@unilag.edu.ng",
  password: PASSWORD,
  institutionCode: "UNILAG",
  ip: "203.0.113.10",
  userAgent: "vitest",
};
