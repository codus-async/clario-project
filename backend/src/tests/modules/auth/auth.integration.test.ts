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
import { PrismaClient } from "../../../generated/prisma/client.js";
import { Argon2PasswordHasher } from "../../../infrastructure/auth/argon2-password-hasher.js";
import {
  PrismaInstitutionRepository,
  PrismaRoleAssignmentRepository,
  PrismaUserRepository,
} from "../../../infrastructure/auth/prisma-identity.repository.js";
import { PrismaSessionRepository } from "../../../infrastructure/auth/prisma-session.repository.js";
import { RedisLoginProtectionStore } from "../../../infrastructure/auth/redis-login-protection.store.js";
import { RedisSessionStore } from "../../../infrastructure/auth/redis-session.store.js";
import { createAuthRouter } from "../../../modules/auth/auth.routes.js";
import { createRequireSession } from "../../../modules/auth/auth.middleware.js";
import { AuthService } from "../../../modules/auth/auth.service.js";
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

let pgContainer: StartedTestContainer;
let redisContainer: StartedTestContainer;
let sql: Client;
let db: PrismaClient;
let redis: Redis;
let app: ReturnType<typeof express>;

let institutionId: string;
let supervisorId: string;
let coordinatorId: string;
let appointmentId: string;
let supervisorPasswordHash: string;

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
  supervisorPasswordHash = await hasher.hash(PASSWORD);

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
  const programmeId = firstRow(programmes.rows).id;

  const academicSessions = await sql.query<{ id: string }>(
    `INSERT INTO academic_sessions (institution_id, session_label, start_date, end_date)
     VALUES ($1, '2026/2027', '2026-09-01', '2027-08-31') RETURNING id`,
    [institutionId],
  );
  const academicSessionId = firstRow(academicSessions.rows).id;

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

  const authService = new AuthService({
    config: testAuthConfig,
    hasher,
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

  app = express();
  app.use(requestContextMiddleware);
  app.use(express.json());
  app.use("/api/v1/auth", createAuthRouter(authService, testAuthConfig));
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
    ip: "203.0.113.10",
    userAgent: "vitest",
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

describe("F-64 end-to-end (PostgreSQL + Redis)", () => {
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
      `clario:login:lock:${SUPERVISOR_EMAIL.toLowerCase()}`,
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
});
