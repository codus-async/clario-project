import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";
import { RoleCode } from "@clario/shared-contracts";
import express from "express";
import { Redis } from "ioredis";
import { Client } from "pg";
import request from "supertest";
import { GenericContainer, Wait, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { requestContextMiddleware } from "../../../middleware/request-context.middleware.js";
import { errorHandler } from "../../../middleware/error-handler.js";
import { AppError } from "../../../errors/app-error.js";
import { PrismaClient } from "../../../generated/prisma/client.js";
import { Argon2PasswordHasher } from "../../../infrastructure/auth/argon2-password-hasher.js";
import { LocalCompromisedPasswordChecker } from "../../../infrastructure/auth/compromised-password-checker.js";
import { PrismaAccountRepository } from "../../../infrastructure/auth/prisma-account.repository.js";
import {
  PrismaInstitutionRepository,
  PrismaRoleAssignmentRepository,
  PrismaUserRepository,
} from "../../../infrastructure/auth/prisma-identity.repository.js";
import { PrismaSessionRepository } from "../../../infrastructure/auth/prisma-session.repository.js";
import { RedisLoginProtectionStore } from "../../../infrastructure/auth/redis-login-protection.store.js";
import { RedisSessionStore } from "../../../infrastructure/auth/redis-session.store.js";
import { createAuthRouter } from "../../../modules/auth/auth.routes.js";
import { hashSingleUseToken } from "../../../modules/auth/auth.token.js";
import { createRequireSession } from "../../../modules/auth/auth.middleware.js";
import { AccountService } from "../../../modules/auth/auth.account.service.js";
import { AuthService } from "../../../modules/auth/auth.service.js";
import type { PasswordHasher, VerificationSlot } from "../../../modules/auth/auth.ports.js";
import { testAuthConfig } from "./auth.fakes.js";

const BACKEND_ROOT = fileURLToPath(new URL("../../../..", import.meta.url));
const REPO_ROOT = fileURLToPath(new URL("../../../../..", import.meta.url));
const MIGRATIONS_DIR = join(BACKEND_ROOT, "prisma", "migrations");
const SCHEMA_SQL_PATH = join(REPO_ROOT, "docs", "clario_mvp_schema.sql");

const POSTGRES_USER = "clario_admin";
const POSTGRES_PASSWORD = "Clario_Dev_DB_2026_StrongPassword";
const POSTGRES_DB = "clario";

const PASSWORD = "Correct-Horse-Battery-Staple-99!";
const SUPERVISOR_EMAIL = "tunde.adewale@unilag.edu.ng";
const COORDINATOR_EMAIL = "coordinator@unilag.edu.ng";

/**
 * Wraps the real Argon2id hasher to observe how many KDF invocations run in
 * parallel — the direct proof that verification slots bound concurrent work.
 */
class CountingPasswordHasher implements PasswordHasher {
  inFlight = 0;
  maxInFlight = 0;
  private readonly inner: Argon2PasswordHasher;

  constructor(inner: Argon2PasswordHasher) {
    this.inner = inner;
  }

  async hash(plain: string): Promise<string> {
    return this.inner.hash(plain);
  }

  async verify(storedHash: string, plain: string): Promise<boolean> {
    return this.track(() => this.inner.verify(storedHash, plain));
  }

  async verifyDummy(plain: string): Promise<boolean> {
    return this.track(() => this.inner.verifyDummy(plain));
  }

  private async track<T>(fn: () => Promise<T>): Promise<T> {
    this.inFlight += 1;
    this.maxInFlight = Math.max(this.maxInFlight, this.inFlight);
    try {
      return await fn();
    } finally {
      this.inFlight -= 1;
    }
  }
}

let pgContainer: StartedTestContainer;
let redisContainer: StartedTestContainer;
let sql: Client;
let db: PrismaClient;
let redis: Redis;
let app: ReturnType<typeof express>;

let institutionId: string;
let supervisorId: string;
let coordinatorId: string;
let programmeId: string;
let academicSessionId: string;
let appointmentId: string;
let supervisorPasswordHash: string;
let countingHasher: CountingPasswordHasher;
let authService: AuthService;

function firstRow<T>(rows: readonly T[]): T {
  const row = rows[0];
  if (row === undefined) {
    throw new Error("expected at least one row in the result set");
  }
  return row;
}

beforeAll(async () => {
  pgContainer = await new GenericContainer("postgres:16")
    .withEnvironment({ POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB })
    .withExposedPorts(5432)
    .withWaitStrategy(
      Wait.forLogMessage(/database system is ready to accept connections/, 2),
    )
    .start();

  redisContainer = await new GenericContainer("redis:7-alpine")
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/, 1))
    .start();

  const connectionString = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${pgContainer.getHost()}:${String(
    pgContainer.getMappedPort(5432),
  )}/${POSTGRES_DB}`;

  sql = new Client({ connectionString });
  await sql.connect();

  const migrations = (await readdir(MIGRATIONS_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  expect(migrations.length).toBeGreaterThanOrEqual(8);
  for (const migration of migrations) {
    const statement = await readFile(
      join(MIGRATIONS_DIR, migration, "migration.sql"),
      "utf8",
    );
    await sql.query(statement);
  }

  const hasher = new Argon2PasswordHasher();
  countingHasher = new CountingPasswordHasher(hasher);
  supervisorPasswordHash = await countingHasher.hash(PASSWORD);

  const institutions = await sql.query<{ id: string }>(
    `INSERT INTO institutions (name, code_slug, primary_contact_name, primary_contact_email, account_status)
     VALUES ('Institution Alpha', 'TENA', 'Alpha Contact', 'alpha@example.edu', 'ACTIVE')
     RETURNING id`,
  );
  institutionId = firstRow(institutions.rows).id;

  const faculties = await sql.query<{ id: string }>(
    `INSERT INTO faculties (institution_id, name, code)
     VALUES ($1, 'Faculty Alpha', 'FAL') RETURNING id`,
    [institutionId],
  );
  const facultyId = firstRow(faculties.rows).id;

  const departments = await sql.query<{ id: string }>(
    `INSERT INTO departments (institution_id, faculty_id, name, code)
     VALUES ($1, $2, 'Department Alpha', 'DPT') RETURNING id`,
    [institutionId, facultyId],
  );
  const departmentId = firstRow(departments.rows).id;

  const programmes = await sql.query<{ id: string }>(
    `INSERT INTO programmes (institution_id, faculty_id, department_id, name, code)
     VALUES ($1, $2, $3, 'B.Sc. Computer Science', 'CSC') RETURNING id`,
    [institutionId, facultyId, departmentId],
  );
  programmeId = firstRow(programmes.rows).id;

  const academicSessions = await sql.query<{ id: string }>(
    `INSERT INTO academic_sessions (institution_id, session_label, start_date, end_date)
     VALUES ($1, '2026/2027', '2026-09-01', '2027-08-31') RETURNING id`,
    [institutionId],
  );
  academicSessionId = firstRow(academicSessions.rows).id;

  const supervisor = await sql.query<{ id: string }>(
    `INSERT INTO users (institution_id, is_platform_admin, full_name, email, institutional_id_number, account_status, password_hash)
     VALUES ($1, false, 'Dr. Tunde Adewale', $2, 'UNILAG/STAFF/0042', 'ACTIVE', $3)
     RETURNING id`,
    [institutionId, SUPERVISOR_EMAIL, supervisorPasswordHash],
  );
  supervisorId = firstRow(supervisor.rows).id;

  const coordinator = await sql.query<{ id: string }>(
    `INSERT INTO users (institution_id, is_platform_admin, full_name, email, institutional_id_number, account_status, password_hash)
     VALUES ($1, false, 'Prof. Grace Okafor', $2, 'UNILAG/STAFF/0077', 'ACTIVE', $3)
     RETURNING id`,
    [institutionId, COORDINATOR_EMAIL, supervisorPasswordHash],
  );
  coordinatorId = firstRow(coordinator.rows).id;

  await sql.query(
    `INSERT INTO user_role_assignments (institution_id, user_id, role_code, assigned_by_user_id)
     VALUES ($1, $2, 'PROJECT_SUPERVISOR', $2),
            ($1, $3, 'PROJECT_COORDINATOR', $2)`,
    [institutionId, supervisorId, coordinatorId],
  );

  const appointments = await sql.query<{ id: string }>(
    `INSERT INTO coordinator_appointments (institution_id, user_id, programme_id, academic_session_id, appointed_by_user_id)
     VALUES ($1, $2, $3, $4, $2) RETURNING id`,
    [institutionId, coordinatorId, programmeId, academicSessionId],
  );
  appointmentId = firstRow(appointments.rows).id;

  db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const redisConnectionString = `redis://${redisContainer.getHost()}:${String(
    redisContainer.getMappedPort(6379),
  )}`;
  redis = new Redis(redisConnectionString, { lazyConnect: true });
  await redis.connect();

  authService = new AuthService({
    config: testAuthConfig,
    hasher: countingHasher,
    users: new PrismaUserRepository(db),
    institutions: new PrismaInstitutionRepository(db),
    roles: new PrismaRoleAssignmentRepository(db),
    sessions: new PrismaSessionRepository(db),
    sessionStore: new RedisSessionStore(redis),
    protection: new RedisLoginProtectionStore(
      redis,
      testAuthConfig.protection,
    ),
  });

  const requireSession = createRequireSession(authService);

  const accountService = new AccountService({
    config: testAuthConfig,
    hasher: countingHasher,
    accounts: new PrismaAccountRepository(db),
    institutions: new PrismaInstitutionRepository(db),
    roles: new PrismaRoleAssignmentRepository(db),
    sessions: new PrismaSessionRepository(db),
    sessionStore: new RedisSessionStore(redis),
    compromisedPasswords: new LocalCompromisedPasswordChecker(),
  });

  app = express();
  app.use(requestContextMiddleware);
  app.use(express.json());
  app.use(
    "/api/v1/auth",
    createAuthRouter(authService, accountService, testAuthConfig),
  );
  app.get("/protected", requireSession, (req, res) => {
    res.status(200).json({
      userId: req.authContext?.userId,
      activeRole: req.authContext?.activeRole,
      institutionId: req.authContext?.institutionId,
    });
  });
  app.use(errorHandler);
}, 300_000);

afterAll(async () => {
  try {
    redis?.disconnect();
  } catch {
    // ignore shutdown errors
  }
  await db?.$disconnect();
  await sql?.end();
  await redisContainer?.stop();
  await pgContainer?.stop();
}, 60_000);

async function login(email: string, password = PASSWORD) {
  return request(app).post("/api/v1/auth/login").send({
    identifier: email,
    password,
    institutionCode: "TENA",
  });
}

function cookieFrom(response: request.Response): string {
  const setCookie = response.headers["set-cookie"];
  const headers = setCookie === undefined
    ? []
    : Array.isArray(setCookie)
      ? setCookie
      : [setCookie];
  expect(headers.length).toBeGreaterThan(0);
  return headers[0]?.split(";")[0] ?? "";
}

/**
 * Rewrites the stored runtime session state, keeping its TTL. It simulates the
 * passage of time without waiting for it: the expiry tests move the absolute
 * deadline or the last-activity timestamp into the past.
 */
async function patchRedisSession(
  sessionId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const key = `clario:session:${sessionId}`;
  const raw = await redis.get(key);
  expect(raw).not.toBeNull();
  const state = JSON.parse(String(raw)) as Record<string, unknown>;
  const ttl = await redis.ttl(key);
  await redis.set(
    key,
    JSON.stringify({ ...state, ...patch }),
    "EX",
    Math.max(1, ttl),
  );
}

/**
 * The fields the REST contract (§2.1) requires on a login response. The
 * implementation returns a few additional convenience fields
 * (`active_role`, `expires_at_utc`), so the contract is asserted as a
 * superset rather than an exact key set.
 */
const DOCUMENTED_LOGIN_FIELDS = [
  "session_id",
  "user",
  "mfa_required",
  "mfa_enrolled",
  "mfa_verified",
  "next_step",
  "inactivity_timeout_minutes",
];

const DOCUMENTED_LOGIN_USER_FIELDS = [
  "id",
  "full_name",
  "institution_id",
  "institution_code",
  "timezone_iana",
  "roles",
  "coordinator_appointments",
];

describe("F-64 end-to-end (PostgreSQL + Redis)", () => {
  it("records the last authenticated timestamp of the account", async () => {
    const before = await db.users.findUnique({ where: { id: supervisorId } });
    expect(before?.last_login_at).toBeNull();

    const response = await login(SUPERVISOR_EMAIL);
    expect(response.status).toBe(200);

    const after = await db.users.findUnique({ where: { id: supervisorId } });
    expect(after?.last_login_at).not.toBeNull();
    expect(after?.last_login_at?.getTime()).toBeGreaterThan(
      (before?.last_login_at?.getTime() ?? 0) - 1,
    );
  }, 120_000);

  it("returns the documented login envelope and the institution timezone header", async () => {
    const response = await login(COORDINATOR_EMAIL);
    expect(response.status).toBe(200);

    for (const field of DOCUMENTED_LOGIN_FIELDS) {
      expect(response.body).toHaveProperty(field);
    }
    for (const field of DOCUMENTED_LOGIN_USER_FIELDS) {
      expect(response.body.user).toHaveProperty(field);
    }

    expect(response.body.user).toEqual({
      id: coordinatorId,
      full_name: "Prof. Grace Okafor",
      institution_id: institutionId,
      institution_code: "TENA",
      timezone_iana: "Africa/Lagos",
      roles: [RoleCode.PROJECT_COORDINATOR],
      coordinator_appointments: [
        {
          appointment_id: appointmentId,
          programme_id: programmeId,
          programme_name: "B.Sc. Computer Science",
          academic_session_id: academicSessionId,
          session_label: "2026/2027",
        },
      ],
    });

    // A Project Coordinator is a mandatory-MFA role (SEC-06): the session
    // exists but has no full access until the challenge is completed.
    expect(response.body.mfa_required).toBe(true);
    expect(response.body.mfa_enrolled).toBe(false);
    expect(response.body.mfa_verified).toBe(false);
    expect(response.body.next_step).toBe("MFA_CHALLENGE_REQUIRED");
    expect(response.body.inactivity_timeout_minutes).toBe(30);

    // The tenant's authoritative timezone travels with the response.
    expect(response.headers["x-clario-institution-timezone"]).toBe(
      "Africa/Lagos",
    );

    await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", cookieFrom(response));
  }, 120_000);

  it("logs in, authenticates, heartbeats and logs out", async () => {
    const loginResponse = await login(SUPERVISOR_EMAIL);
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.user.roles).toEqual([
      RoleCode.PROJECT_SUPERVISOR,
    ]);
    expect(loginResponse.body.active_role).toBe(
      RoleCode.PROJECT_SUPERVISOR,
    );
    const cookie = cookieFrom(loginResponse);
    const sessionId = String(loginResponse.body.session_id);

    const row = await db.user_sessions.findUnique({ where: { id: sessionId } });
    expect(row).not.toBeNull();
    expect(row?.user_id).toBe(supervisorId);
    expect(row?.institution_id).toBe(institutionId);
    expect(row?.is_revoked).toBe(false);
    expect(row?.mfa_verified).toBe(false);
    expect(row?.inactivity_timeout_minutes).toBe(60);
    // Creation, heartbeat and expiry timestamps are all persisted.
    expect(row?.created_at).toBeInstanceOf(Date);
    expect(row?.last_activity_at).toBeInstanceOf(Date);
    expect(row?.expires_at).toBeInstanceOf(Date);
    const createdAt = row?.created_at.getTime() ?? 0;
    expect(row?.last_activity_at.getTime()).toBe(createdAt);
    expect(row?.expires_at.getTime()).toBeGreaterThan(createdAt);

    const redisState = await redis.get(`clario:session:${sessionId}`);
    expect(redisState).not.toBeNull();
    const ttl = await redis.ttl(`clario:session:${sessionId}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60 * 60);

    const protectedResponse = await request(app)
      .get("/protected")
      .set("Cookie", cookie);
    expect(protectedResponse.status).toBe(200);
    expect(protectedResponse.body.userId).toBe(supervisorId);
    expect(protectedResponse.body.institutionId).toBe(institutionId);

    const beforeHeartbeat = row?.last_activity_at?.getTime() ?? 0;
    await new Promise((resolve) => setTimeout(resolve, 25));
    const heartbeatResponse = await request(app)
      .post("/api/v1/auth/session/heartbeat")
      .set("Cookie", cookie);
    expect(heartbeatResponse.status).toBe(200);
    expect(heartbeatResponse.body.session_id).toBe(sessionId);

    const afterHeartbeat = await db.user_sessions.findUnique({
      where: { id: sessionId },
    });
    expect(afterHeartbeat?.last_activity_at.getTime()).toBeGreaterThan(
      beforeHeartbeat,
    );

    const logoutResponse = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", cookie);
    expect(logoutResponse.status).toBe(200);

    const revoked = await db.user_sessions.findUnique({
      where: { id: sessionId },
    });
    expect(revoked?.is_revoked).toBe(true);
    expect(revoked?.revoked_reason).toBe("LOGOUT");
    expect(await redis.get(`clario:session:${sessionId}`)).toBeNull();

    const afterLogout = await request(app)
      .get("/protected")
      .set("Cookie", cookie);
    expect(afterLogout.status).toBe(401);
    expect(afterLogout.body.error.code).toBe("SESSION_EXPIRED_OR_REVOKED");
  }, 120_000);

  it("resolves coordinator scope through the institution-scoped RLS read", async () => {
    const response = await login(COORDINATOR_EMAIL);

    expect(response.status).toBe(200);
    expect(response.body.active_role).toBe(RoleCode.PROJECT_COORDINATOR);

    const sessionId = String(response.body.session_id);
    const row = await db.user_sessions.findUnique({ where: { id: sessionId } });
    expect(row?.active_coordinator_appointment_id).toBe(appointmentId);
    expect(row?.inactivity_timeout_minutes).toBe(30);

    const state = JSON.parse(
      String(await redis.get(`clario:session:${sessionId}`)),
    ) as {
      activeCoordinatorScope: { appointmentId: string } | null;
      coordinatorAppointments: unknown[];
    };
    expect(state.activeCoordinatorScope?.appointmentId).toBe(appointmentId);
    expect(state.coordinatorAppointments).toHaveLength(1);

    await request(app).post("/api/v1/auth/logout").set("Cookie", cookieFrom(response));
  }, 120_000);

  it("locks the identifier after the documented failure window", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await login(SUPERVISOR_EMAIL, "wrong-password");
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHENTICATED");
    }

    const locked = await login(SUPERVISOR_EMAIL, "wrong-password");
    expect(locked.status).toBe(429);
    expect(locked.body.error.code).toBe("ACCOUNT_TEMPORARILY_LOCKED");

    // Even the correct password stays blocked for the duration of the cooldown.
    const stillLocked = await login(SUPERVISOR_EMAIL);
    expect(stillLocked.status).toBe(429);

    const lockTtl = await redis.ttl(
      `clario:login:lock:id:${SUPERVISOR_EMAIL.toLowerCase()}`,
    );
    expect(lockTtl).toBeGreaterThan(0);
    expect(lockTtl).toBeLessThanOrEqual(15 * 60);

    // Clear both protection dimensions (identifier and client IP) so the
    // remaining cases start from an unlocked state.
    const protectionKeys = await redis.keys("clario:login:*");
    if (protectionKeys.length > 0) {
      await redis.del(...protectionKeys);
    }
    expect(await redis.keys("clario:login:*")).toHaveLength(0);
  }, 120_000);

  it("locks the client IP after the documented failure window", async () => {
    // Failures against identifiers that do not exist must still count
    // towards the IP dimension (no enumeration oracle), and once the IP
    // window is exhausted every identifier from that client is locked.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await login(`ghost-${String(attempt)}@unilag.edu.ng`);
      expect(response.status).toBe(401);
    }

    const locked = await login(SUPERVISOR_EMAIL);
    expect(locked.status).toBe(429);
    expect(locked.body.error.code).toBe("ACCOUNT_TEMPORARILY_LOCKED");

    const protectionKeys = await redis.keys("clario:login:*");
    if (protectionKeys.length > 0) {
      await redis.del(...protectionKeys);
    }
  }, 120_000);

  it("blocks authentication against a suspended tenant", async () => {
    await sql.query(
      `UPDATE institutions SET account_status = 'SUSPENDED' WHERE id = $1`,
      [institutionId],
    );

    const loginResponse = await login(SUPERVISOR_EMAIL);
    expect(loginResponse.status).toBe(401);
    expect(loginResponse.body.error.code).toBe("UNAUTHENTICATED");

    await sql.query(
      `UPDATE institutions SET account_status = 'ACTIVE' WHERE id = $1`,
      [institutionId],
    );
  }, 120_000);

  it("rejects a session row that was revoked out of band", async () => {
    const loginResponse = await login(SUPERVISOR_EMAIL);
    expect(loginResponse.status).toBe(200);
    const cookie = cookieFrom(loginResponse);
    const sessionId = String(loginResponse.body.session_id);

    await sql.query(
      `UPDATE user_sessions SET is_revoked = true, revoked_reason = 'ADMIN_REVOKED' WHERE id = $1`,
      [sessionId],
    );

    const response = await request(app).get("/protected").set("Cookie", cookie);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("SESSION_EXPIRED_OR_REVOKED");
    expect(await redis.get(`clario:session:${sessionId}`)).toBeNull();
  }, 120_000);

  it("rejects a session whose absolute lifetime elapsed", async () => {
    const loginResponse = await login(SUPERVISOR_EMAIL);
    expect(loginResponse.status).toBe(200);
    const cookie = cookieFrom(loginResponse);
    const sessionId = String(loginResponse.body.session_id);

    // Move the absolute deadline into the past, exactly as the passage of
    // time would have done.
    await patchRedisSession(sessionId, {
      expiresAtUtc: new Date(Date.now() - 60_000).toISOString(),
    });

    const response = await request(app).get("/protected").set("Cookie", cookie);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("SESSION_EXPIRED_OR_REVOKED");

    // The PostgreSQL audit record records the expiry and the runtime state
    // is dropped.
    const row = await db.user_sessions.findUnique({ where: { id: sessionId } });
    expect(row?.is_revoked).toBe(true);
    expect(row?.revoked_reason).toBe("SESSION_EXPIRED");
    expect(await redis.get(`clario:session:${sessionId}`)).toBeNull();
  }, 120_000);

  it("rejects a session whose inactivity window elapsed", async () => {
    const loginResponse = await login(SUPERVISOR_EMAIL);
    expect(loginResponse.status).toBe(200);
    const cookie = cookieFrom(loginResponse);
    const sessionId = String(loginResponse.body.session_id);

    // A supervisor session has a 60 minute inactivity timeout: push the last
    // activity just beyond it.
    await patchRedisSession(sessionId, {
      lastActivityAtUtc: new Date(Date.now() - 61 * 60_000).toISOString(),
    });

    const response = await request(app).get("/protected").set("Cookie", cookie);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("SESSION_EXPIRED_OR_REVOKED");

    const row = await db.user_sessions.findUnique({ where: { id: sessionId } });
    expect(row?.is_revoked).toBe(true);
    expect(row?.revoked_reason).toBe("SESSION_INACTIVITY_TIMEOUT");
    expect(await redis.get(`clario:session:${sessionId}`)).toBeNull();
  }, 120_000);

  it("revokes sessions when the role assignment is revoked server-side", async () => {
    const loginResponse = await login(SUPERVISOR_EMAIL);
    expect(loginResponse.status).toBe(200);
    const cookie = cookieFrom(loginResponse);
    const sessionId = String(loginResponse.body.session_id);

    await sql.query(
      `UPDATE user_role_assignments SET status = 'ARCHIVED', revoked_at = NOW()
       WHERE user_id = $1 AND role_code = 'PROJECT_SUPERVISOR'`,
      [supervisorId],
    );

    const response = await request(app).get("/protected").set("Cookie", cookie);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("SESSION_EXPIRED_OR_REVOKED");

    const row = await db.user_sessions.findUnique({ where: { id: sessionId } });
    expect(row?.is_revoked).toBe(true);
    expect(row?.revoked_reason).toBe("ROLE_REVOKED");
    expect(await redis.get(`clario:session:${sessionId}`)).toBeNull();

    await sql.query(
      `UPDATE user_role_assignments SET status = 'ACTIVE', revoked_at = NULL
       WHERE user_id = $1 AND role_code = 'PROJECT_SUPERVISOR'`,
      [supervisorId],
    );
  }, 120_000);

  it("revokes coordinator sessions when the appointment is revoked server-side", async () => {
    const loginResponse = await login(COORDINATOR_EMAIL);
    expect(loginResponse.status).toBe(200);
    const cookie = cookieFrom(loginResponse);
    const sessionId = String(loginResponse.body.session_id);

    await sql.query(
      `UPDATE coordinator_appointments SET status = 'ARCHIVED', revoked_at = NOW()
       WHERE id = $1`,
      [appointmentId],
    );

    const response = await request(app).get("/protected").set("Cookie", cookie);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("SESSION_EXPIRED_OR_REVOKED");

    const row = await db.user_sessions.findUnique({ where: { id: sessionId } });
    expect(row?.is_revoked).toBe(true);
    expect(row?.revoked_reason).toBe("SCOPE_REVOKED");
    expect(await redis.get(`clario:session:${sessionId}`)).toBeNull();

    await sql.query(
      `UPDATE coordinator_appointments SET status = 'ACTIVE', revoked_at = NULL
       WHERE id = $1`,
      [appointmentId],
    );
  }, 120_000);

  it("bounds concurrent Argon2id verifications during a login burst", async () => {
    countingHasher.maxInFlight = 0;

    // Fire the burst directly at the service in a tight loop: every call
    // reaches the lock check and the slot acquisition before any (slow) KDF
    // can finish and record a failure, which is exactly the race the
    // verification slots are meant to close.
    const results = await Promise.allSettled(
      Array.from({ length: 15 }, () =>
        authService.login({
          identifier: SUPERVISOR_EMAIL,
          password: "wrong-password",
          institutionCode: "TENA",
          ip: "203.0.113.99",
          userAgent: "vitest",
        }),
      ),
    );

    const isAppError = (
      result: PromiseSettledResult<unknown>,
      code: string,
    ): boolean =>
      result.status === "rejected" &&
      result.reason instanceof AppError &&
      result.reason.code === code;

    const busyRejections = results.filter(
      (result) =>
        isAppError(result, "ACCOUNT_TEMPORARILY_LOCKED") &&
        result.status === "rejected" &&
        result.reason.message.includes("in progress"),
    );
    expect(busyRejections.length).toBeGreaterThan(0);

    // The admitted attempts ran the KDF and failed the password check.
    expect(results.filter((result) => isAppError(result, "UNAUTHENTICATED")).length).toBeGreaterThan(0);

    // The KDF must never exceed LOGIN_MAX_CONCURRENT_VERIFICATIONS (5)
    // parallel invocations for a single IP + identifier.
    expect(countingHasher.maxInFlight).toBeLessThanOrEqual(5);
    expect(countingHasher.maxInFlight).toBeGreaterThan(1);

    // Clear the failures/lock recorded by the burst (and any slot tokens).
    const protectionKeys = await redis.keys("clario:login:*");
    if (protectionKeys.length > 0) {
      await redis.del(...protectionKeys);
    }
    expect(await redis.keys("clario:login:*")).toHaveLength(0);
  }, 120_000);
});

describe("RedisLoginProtectionStore verification slots", () => {
  it("caps slots per IP/identifier dimension and frees them on release", async () => {
    const store = new RedisLoginProtectionStore(redis, {
      ...testAuthConfig.protection,
      maxConcurrentVerifications: 2,
      maxConcurrentVerificationsGlobal: 100,
    });
    const key = { ip: "198.51.100.50", identifier: "slots@example.edu" };

    const first = await store.acquireVerificationSlot(key);
    const second = await store.acquireVerificationSlot(key);
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();

    // Same dimension at capacity: rejected without reserving a token.
    expect(await store.acquireVerificationSlot(key)).toBeNull();

    // A different identifier from the same IP still counts against the IP dim.
    expect(
      await store.acquireVerificationSlot({
        ip: "198.51.100.50",
        identifier: "other@example.edu",
      }),
    ).toBeNull();

    // Release frees capacity for the next acquisition.
    await store.releaseVerificationSlot(key, first as VerificationSlot);
    const third = await store.acquireVerificationSlot(key);
    expect(third).not.toBeNull();

    const keys = await redis.keys("clario:login:conc:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }, 30_000);

  it("enforces the process-wide cap across IPs and identifiers", async () => {
    const store = new RedisLoginProtectionStore(redis, {
      ...testAuthConfig.protection,
      maxConcurrentVerifications: 100,
      maxConcurrentVerificationsGlobal: 1,
    });

    const held = await store.acquireVerificationSlot({
      ip: "198.51.100.60",
      identifier: "one@example.edu",
    });
    expect(held).not.toBeNull();

    expect(
      await store.acquireVerificationSlot({
        ip: "198.51.100.61",
        identifier: "two@example.edu",
      }),
    ).toBeNull();

    await store.releaseVerificationSlot(
      { ip: "198.51.100.60", identifier: "one@example.edu" },
      held as VerificationSlot,
    );
    expect(
      await store.acquireVerificationSlot({
        ip: "198.51.100.61",
        identifier: "two@example.edu",
      }),
    ).not.toBeNull();

    const keys = await redis.keys("clario:login:conc:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }, 30_000);

  it("keeps identifier keys disjoint from IP keys", async () => {
    const store = new RedisLoginProtectionStore(redis, {
      ...testAuthConfig.protection,
      maxConcurrentVerifications: 100,
      maxConcurrentVerificationsGlobal: 1_000,
    });
    const victimIp = "198.51.100.99";
    // A crafted identifier that looks like the IP namespace must not be able
    // to write the victim IP's lock/locklevel keys.
    const crafted = { ip: "203.0.113.77", identifier: `ip:${victimIp}` };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await store.recordFailure(crafted);
    }
    const lockedForCrafted = await store.check(crafted);
    expect(lockedForCrafted.locked).toBe(true);

    expect(await redis.exists(`clario:login:lock:id:ip:${victimIp}`)).toBe(1);
    expect(await redis.exists(`clario:login:lock:ip:${victimIp}`)).toBe(0);
    expect(await redis.exists(`clario:login:locklevel:ip:${victimIp}`)).toBe(0);

    // The victim IP itself must still be able to authenticate.
    const victimView = await store.check({
      ip: victimIp,
      identifier: "someone-else@example.edu",
    });
    expect(victimView.locked).toBe(false);

    const keys = await redis.keys("clario:login:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }, 30_000);

  it("clears only the identifier dimension on a successful login", async () => {
    const store = new RedisLoginProtectionStore(redis, {
      ...testAuthConfig.protection,
      maxConcurrentVerifications: 100,
      maxConcurrentVerificationsGlobal: 1_000,
    });
    const key = { ip: "198.51.100.88", identifier: "winner@example.edu" };

    await store.recordFailure(key);
    await store.recordFailure(key);
    expect(await redis.exists("clario:login:fail:ip:198.51.100.88")).toBe(1);
    expect(await redis.exists("clario:login:fail:id:winner@example.edu")).toBe(
      1,
    );

    await store.recordSuccess(key);

    expect(await redis.exists("clario:login:fail:id:winner@example.edu")).toBe(
      0,
    );
    // The shared IP window is left to decay on its own so one valid
    // credential cannot reset a cross-account spray counter.
    expect(await redis.exists("clario:login:fail:ip:198.51.100.88")).toBe(1);

    const keys = await redis.keys("clario:login:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }, 30_000);
});

describe("F-64 account lifecycle (PostgreSQL + Redis)", () => {
  const INVITED_EMAIL = "invited.student@tena.edu.ng";
  const RESET_EMAIL = "reset.student@tena.edu.ng";

  it("activates an invited account exactly once", async () => {
    const token = "invitation-token-for-integration";
    const tokenHash = hashSingleUseToken(token);

    const invited = await sql.query<{ id: string }>(
      `INSERT INTO users (institution_id, is_platform_admin, full_name, email, institutional_id_number, account_status, invitation_token_hash, invitation_expires_at)
       VALUES ($1, false, 'Ada Invited', $2, 'TENA/STU/9001', 'INVITED', $3, NOW() + INTERVAL '1 day')
       RETURNING id`,
      [institutionId, INVITED_EMAIL, tokenHash],
    );
    const invitedId = firstRow(invited.rows).id;

    await sql.query(
      `INSERT INTO user_role_assignments (institution_id, user_id, role_code, assigned_by_user_id)
       VALUES ($1, $2, 'STUDENT', $3)`,
      [institutionId, invitedId, supervisorId],
    );

    const activated = await request(app)
      .post("/api/v1/auth/activate")
      .send({ token, password: PASSWORD });
    expect(activated.status).toBe(200);
    expect(activated.body.account_status).toBe("ACTIVE");

    const row = await db.users.findUnique({ where: { id: invitedId } });
    expect(row?.account_status).toBe("ACTIVE");
    expect(row?.password_hash).not.toBeNull();
    // The invitation token is spent.
    expect(row?.invitation_token_hash).toBeNull();
    expect(row?.invitation_expires_at).toBeNull();

    // The replay is rejected with the generic token error.
    const replay = await request(app)
      .post("/api/v1/auth/activate")
      .send({ token, password: PASSWORD });
    expect(replay.status).toBe(400);
    expect(replay.body.error.code).toBe("VALIDATION_ERROR");

    // The activated account can now authenticate.
    const loginResponse = await login(INVITED_EMAIL);
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.user.id).toBe(invitedId);
  }, 120_000);

  it("records a transactional-email request and revokes every session on reset", async () => {
    const user = await sql.query<{ id: string }>(
      `INSERT INTO users (institution_id, is_platform_admin, full_name, email, institutional_id_number, account_status, password_hash)
       VALUES ($1, false, 'Bode Reset', $2, 'TENA/STU/9002', 'ACTIVE', $3)
       RETURNING id`,
      [institutionId, RESET_EMAIL, supervisorPasswordHash],
    );
    const userId = firstRow(user.rows).id;

    await sql.query(
      `INSERT INTO user_role_assignments (institution_id, user_id, role_code, assigned_by_user_id)
       VALUES ($1, $2, 'STUDENT', $3)`,
      [institutionId, userId, supervisorId],
    );

    const loginResponse = await login(RESET_EMAIL);
    expect(loginResponse.status).toBe(200);
    const sessionId = String(loginResponse.body.session_id);
    expect(await redis.get(`clario:session:${sessionId}`)).not.toBeNull();

    const requested = await request(app)
      .post("/api/v1/auth/password/forgot")
      .send({ identifier: RESET_EMAIL, institutionCode: "TENA" });
    expect(requested.status).toBe(202);

    // The delivery request is recorded in the transactional outbox.
    const outbox = await db.transactional_outbox_events.findFirst({
      where: { aggregate_id: userId, event_type: "AUTH_PASSWORD_RESET_REQUESTED" },
    });
    expect(outbox).not.toBeNull();
    expect(outbox?.processed).toBe(false);

    const payload = outbox?.payload_jsonb as {
      token: string;
      email: string;
    };
    expect(payload.email).toBe(RESET_EMAIL);

    // Only the digest of the token is stored on the account.
    const withToken = await db.users.findUnique({ where: { id: userId } });
    expect(withToken?.password_reset_token_hash).toBe(
      hashSingleUseToken(payload.token),
    );
    expect(withToken?.password_reset_expires_at).not.toBeNull();

    const reset = await request(app)
      .post("/api/v1/auth/password/reset")
      .send({ token: payload.token, password: "Brand-New-Strong-Pass-77!" });
    expect(reset.status).toBe(200);

    const afterReset = await db.users.findUnique({ where: { id: userId } });
    expect(afterReset?.password_reset_token_hash).toBeNull();
    expect(afterReset?.password_reset_expires_at).toBeNull();
    expect(afterReset?.password_hash).not.toBe(supervisorPasswordHash);

    // Every session of the account is revoked, in PostgreSQL and in Redis.
    const session = await db.user_sessions.findUnique({
      where: { id: sessionId },
    });
    expect(session?.is_revoked).toBe(true);
    expect(session?.revoked_reason).toBe("PASSWORD_RESET");
    expect(await redis.get(`clario:session:${sessionId}`)).toBeNull();

    // The token cannot be replayed.
    const replay = await request(app)
      .post("/api/v1/auth/password/reset")
      .send({ token: payload.token, password: "Another-Strong-Pass-88!" });
    expect(replay.status).toBe(400);
    expect(replay.body.error.code).toBe("VALIDATION_ERROR");
  }, 120_000);
});
