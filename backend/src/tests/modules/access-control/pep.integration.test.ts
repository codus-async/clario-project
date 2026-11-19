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

import { errorHandler } from "../../../middleware/error-handler.js";
import { requestContextMiddleware } from "../../../middleware/request-context.middleware.js";
import { PrismaClient } from "../../../generated/prisma/client.js";
import { Argon2PasswordHasher } from "../../../infrastructure/auth/argon2-password-hasher.js";
import { LocalCompromisedPasswordChecker } from "../../../infrastructure/auth/compromised-password-checker.js";
import { PrismaAccountRepository } from "../../../infrastructure/auth/prisma-account.repository.js";
import { PrismaMfaRepository } from "../../../infrastructure/auth/prisma-mfa.repository.js";
import {
  PrismaInstitutionRepository,
  PrismaRoleAssignmentRepository,
  PrismaUserRepository,
} from "../../../infrastructure/auth/prisma-identity.repository.js";
import { PrismaSessionRepository } from "../../../infrastructure/auth/prisma-session.repository.js";
import { RedisLoginProtectionStore } from "../../../infrastructure/auth/redis-login-protection.store.js";
import { RedisSessionStore } from "../../../infrastructure/auth/redis-session.store.js";
import { PayloadCipher } from "../../../infrastructure/security/payload-cipher.js";
import { AccountService } from "../../../modules/auth/auth.account.service.js";
import { createAuthRouter } from "../../../modules/auth/auth.routes.js";
import { AuthService } from "../../../modules/auth/auth.service.js";
import { generateTotpCode } from "../../../modules/auth/auth.totp.js";
import {
  createPolicyEnforcementPoint,
  withRequestTenantTransaction,
} from "../../../modules/access-control/pep.middleware.js";
import { testAuthConfig } from "../auth/auth.fakes.js";

const BACKEND_ROOT = fileURLToPath(new URL("../../../..", import.meta.url));
const REPO_ROOT = fileURLToPath(new URL("../../../../..", import.meta.url));
const MIGRATIONS_DIR = join(BACKEND_ROOT, "prisma", "migrations");

const POSTGRES_USER = "clario_admin";
const POSTGRES_PASSWORD = "Clario_Dev_DB_2026_StrongPassword";
const POSTGRES_DB = "clario";

const PASSWORD = "Correct-Horse-Battery-Staple-99!";
const SUPERVISOR_EMAIL = "tunde.adewale@unilag.edu.ng";
const COORDINATOR_EMAIL = "coordinator@unilag.edu.ng";

/** Development-only outbox key; the MFA seed is sealed with it (F-71). */
const OUTBOX_KEY = "Y2xhcmlvLWRldi1vbmx5LXBheWxvYWQta2V5LTAwMDA=";

let pgContainer: StartedTestContainer;
let redisContainer: StartedTestContainer;
let sql: Client;
let db: PrismaClient;
let redis: Redis;
let app: express.Express;

let institutionAId: string;
let institutionBId: string;
let supervisorEmail = SUPERVISOR_EMAIL;
let coordinatorEmail = COORDINATOR_EMAIL;

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

  const passwordHash = await new Argon2PasswordHasher().hash(PASSWORD);

  const institutionA = await sql.query<{ id: string }>(
    `INSERT INTO institutions (name, code_slug, primary_contact_name, primary_contact_email, account_status)
     VALUES ('Institution Alpha', 'PEPA', 'Alpha Contact', 'alpha@example.edu', 'ACTIVE')
     RETURNING id`,
  );
  institutionAId = firstRow(institutionA.rows).id;

  // A second tenant with its own faculty: invisible to A's session under RLS.
  const institutionB = await sql.query<{ id: string }>(
    `INSERT INTO institutions (name, code_slug, primary_contact_name, primary_contact_email, account_status)
     VALUES ('Institution Beta', 'PEPB', 'Beta Contact', 'beta@example.edu', 'ACTIVE')
     RETURNING id`,
  );
  institutionBId = firstRow(institutionB.rows).id;

  const facultyA = await sql.query<{ id: string }>(
    `INSERT INTO faculties (institution_id, name, code)
     VALUES ($1, 'Faculty Alpha', 'FAL') RETURNING id`,
    [institutionAId],
  );
  const facultyAId = firstRow(facultyA.rows).id;

  await sql.query(
    `INSERT INTO faculties (institution_id, name, code)
     VALUES ($1, 'Faculty Beta', 'FBE')`,
    [institutionBId],
  );

  const departmentA = await sql.query<{ id: string }>(
    `INSERT INTO departments (institution_id, faculty_id, name, code)
     VALUES ($1, $2, 'Department Alpha', 'DPT') RETURNING id`,
    [institutionAId, facultyAId],
  );
  const departmentAId = firstRow(departmentA.rows).id;

  const programme = await sql.query<{ id: string }>(
    `INSERT INTO programmes (institution_id, faculty_id, department_id, name, code)
     VALUES ($1, $2, $3, 'B.Sc. Computer Science', 'CSC') RETURNING id`,
    [institutionAId, facultyAId, departmentAId],
  );
  const programmeId = firstRow(programme.rows).id;

  const academicSession = await sql.query<{ id: string }>(
    `INSERT INTO academic_sessions (institution_id, session_label, start_date, end_date)
     VALUES ($1, '2026/2027', '2026-09-01', '2027-08-31') RETURNING id`,
    [institutionAId],
  );
  const academicSessionId = firstRow(academicSession.rows).id;

  const supervisor = await sql.query<{ id: string }>(
    `INSERT INTO users (institution_id, is_platform_admin, full_name, email, institutional_id_number, account_status, password_hash)
     VALUES ($1, false, 'Dr. Tunde Adewale', $2, 'UNILAG/STAFF/0042', 'ACTIVE', $3)
     RETURNING id`,
    [institutionAId, supervisorEmail, passwordHash],
  );
  const supervisorId = firstRow(supervisor.rows).id;

  const coordinator = await sql.query<{ id: string }>(
    `INSERT INTO users (institution_id, is_platform_admin, full_name, email, institutional_id_number, account_status, password_hash)
     VALUES ($1, false, 'Prof. Grace Okafor', $2, 'UNILAG/STAFF/0077', 'ACTIVE', $3)
     RETURNING id`,
    [institutionAId, coordinatorEmail, passwordHash],
  );
  const coordinatorId = firstRow(coordinator.rows).id;

  await sql.query(
    `INSERT INTO user_role_assignments (institution_id, user_id, role_code, assigned_by_user_id)
     VALUES ($1, $2, 'PROJECT_SUPERVISOR', $2),
            ($1, $3, 'PROJECT_COORDINATOR', $3)`,
    [institutionAId, supervisorId, coordinatorId],
  );

  await sql.query(
    `INSERT INTO coordinator_appointments (institution_id, user_id, programme_id, academic_session_id, appointed_by_user_id)
     VALUES ($1, $2, $3, $4, $2)`,
    [institutionAId, coordinatorId, programmeId, academicSessionId],
  );

  db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const redisConnectionString = `redis://${redisContainer.getHost()}:${String(
    redisContainer.getMappedPort(6379),
  )}`;
  redis = new Redis(redisConnectionString, { lazyConnect: true });
  await redis.connect();

  const hasher = new Argon2PasswordHasher();
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
    mfa: new PrismaMfaRepository(db, new PayloadCipher(OUTBOX_KEY)),
  });

  const accountService = new AccountService({
    config: testAuthConfig,
    hasher,
    accounts: new PrismaAccountRepository(db, new PayloadCipher(OUTBOX_KEY)),
    institutions: new PrismaInstitutionRepository(db),
    roles: new PrismaRoleAssignmentRepository(db),
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
  app.use(
    createPolicyEnforcementPoint({
      session: authService,
      authConfig: testAuthConfig,
    }),
  );

  // A tenant-scoped read that proves the PEP's TenantContext is what the
  // transaction actually binds (AGENTS.md §3.1: SET LOCAL inside the tx).
  app.get("/api/v1/echo", async (req, res) => {
    const result = await withRequestTenantTransaction(
      req,
      async (tx) => {
        const rows = await tx.$queryRaw<
          Array<{ institution: string | null; facultyCount: number }>
        >`
          SELECT
            current_app_institution_id() AS institution,
            (SELECT count(*) FROM faculties)::int AS "facultyCount"
        `;
        return firstRow(rows);
      },
      // The application prisma singleton points at the developer database;
      // route the helper at the container under test (AGENTS.md §8).
      { client: db },
    );
    res.status(200).json({
      boundInstitutionId: result.institution,
      visibleFacultyCount: Number(result.facultyCount),
      activeRole: req.authContext?.activeRole ?? null,
      coordinatorAppointmentId: req.tenantContext?.coordinatorAppointmentId ?? null,
    });
  });
  app.post("/api/v1/echo", async (req, res) => {
    await withRequestTenantTransaction(req, async () => undefined, {
      client: db,
    });
    res.status(200).json({ written: true });
  });
  app.get("/api/v1/institutions/:id", (req, res) => {
    res.status(200).json({ id: req.params.id });
  });
  app.get("/api/v1/coordinator/overview", (req, res) => {
    res.status(200).json({
      appointmentId: req.tenantContext?.coordinatorAppointmentId ?? null,
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

async function login(email: string): Promise<{
  cookie: string;
  sessionId: string;
}> {
  const response = await request(app).post("/api/v1/auth/login").send({
    identifier: email,
    password: PASSWORD,
    institutionCode: "PEPA",
  });
  expect(response.status).toBe(200);
  const sessionId = String(response.body.session_id);
  const setCookie = response.headers["set-cookie"];
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie ?? ""];
  return { cookie: cookies[0]?.split(";")[0] ?? "", sessionId };
}

async function patchSessionState(
  sessionId: string,
  patch: (state: Record<string, unknown>) => void,
): Promise<void> {
  const key = `clario:session:${sessionId}`;
  const raw = await redis.get(key);
  expect(raw).not.toBeNull();
  const state = JSON.parse(String(raw)) as Record<string, unknown>;
  patch(state);
  const ttl = await redis.ttl(key);
  await redis.set(key, JSON.stringify(state), "EX", Math.max(1, ttl));
}

describe("F-66 PEP against real Redis and PostgreSQL", () => {
  it("binds the session institution into every tenant transaction and hides other tenants (SEC-09)", async () => {
    const { cookie } = await login(supervisorEmail);

    const response = await request(app)
      .get("/api/v1/echo")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.headers["x-clario-institution-timezone"]).toBe(
      "Africa/Lagos",
    );
    // The GUC the RLS policy reads equals the session institution…
    expect(response.body.boundInstitutionId).toBe(institutionAId);
    // …and only Institution A's faculty is visible: Beta's row exists but is
    // filtered out by tenant_isolation_policy.
    expect(response.body.visibleFacultyCount).toBe(1);
    expect(response.body.activeRole).toBe(RoleCode.PROJECT_SUPERVISOR);

    await request(app).post("/api/v1/auth/logout").set("Cookie", cookie);
  });

  it("denies protected routes without a session (401 UNAUTHORIZED_SESSION)", async () => {
    const response = await request(app).get("/api/v1/echo");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED_SESSION");
    expect(response.headers["content-type"]).toContain(
      "application/problem+json",
    );
  });

  it("denies a session idle past its per-role inactivity window (SEC-07)", async () => {
    const { cookie, sessionId } = await login(supervisorEmail);

    // Age the Redis copy past the supervisor window; loadLiveSession then
    // treats the session as expired and the PEP reports the documented code.
    await patchSessionState(sessionId, (state) => {
      state.lastActivityAtUtc = new Date(
        Date.now() - (testAuthConfig.inactivityTimeoutMinutesByRole[
          RoleCode.PROJECT_SUPERVISOR
        ] +
          5) *
          60_000,
      ).toISOString();
    });

    const response = await request(app)
      .get("/api/v1/echo")
      .set("Cookie", cookie);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED_SESSION");

    // The idle session was revoked; a fresh login must succeed again.
    const relogin = await login(supervisorEmail);
    const allowed = await request(app)
      .get("/api/v1/echo")
      .set("Cookie", relogin.cookie);
    expect(allowed.status).toBe(200);
    await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", relogin.cookie);
  });

  it("denies a session whose stored window no longer satisfies the policy", async () => {
    const { cookie, sessionId } = await login(supervisorEmail);

    const policyWindow =
      testAuthConfig.inactivityTimeoutMinutesByRole[
        RoleCode.PROJECT_SUPERVISOR
      ];
    await patchSessionState(sessionId, (state) => {
      state.inactivityTimeoutMinutes = policyWindow + 30;
    });

    const response = await request(app)
      .get("/api/v1/echo")
      .set("Cookie", cookie);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED_SESSION");

    const relogin = await login(supervisorEmail);
    await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", relogin.cookie);
  });

  it("denies an explicitly addressed foreign institution (AC-F66-01)", async () => {
    const { cookie } = await login(supervisorEmail);

    const denied = await request(app)
      .get(`/api/v1/institutions/${institutionBId}`)
      .set("Cookie", cookie);
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe("OUT_OF_ASSIGNMENT_SCOPE");

    const allowed = await request(app)
      .get(`/api/v1/institutions/${institutionAId}`)
      .set("Cookie", cookie);
    expect(allowed.status).toBe(200);

    await request(app).post("/api/v1/auth/logout").set("Cookie", cookie);
  });

  it("blocks writes but preserves reads when the subscription is EXPIRED (FR-243/FR-244)", async () => {
    const { cookie, sessionId } = await login(supervisorEmail);

    await patchSessionState(sessionId, (state) => {
      state.subscriptionStatus = "EXPIRED";
    });

    const write = await request(app)
      .post("/api/v1/echo")
      .set("Cookie", cookie);
    expect(write.status).toBe(402);
    expect(write.body.error.code).toBe("SUBSCRIPTION_EXPIRED_RESTRICTED");

    const read = await request(app).get("/api/v1/echo").set("Cookie", cookie);
    expect(read.status).toBe(200);

    await patchSessionState(sessionId, (state) => {
      state.subscriptionStatus = "GRACE_PERIOD";
    });
    const graceWrite = await request(app)
      .post("/api/v1/echo")
      .set("Cookie", cookie);
    expect(graceWrite.status).toBe(200);

    await request(app).post("/api/v1/auth/logout").set("Cookie", cookie);
  });

  it("enforces MFA and the BR-03 appointment binding for coordinators", async () => {
    const { cookie, sessionId } = await login(coordinatorEmail);

    // Gate 3 first: the coordinator role mandates MFA (SEC-06).
    const beforeMfa = await request(app)
      .get("/api/v1/coordinator/overview")
      .set("Cookie", cookie);
    expect(beforeMfa.status).toBe(403);
    expect(beforeMfa.body.error.code).toBe("MFA_ENROLLMENT_REQUIRED");

    // The auth flow itself stays reachable through the exempt prefix.
    const enroll = await request(app)
      .post("/api/v1/auth/mfa/enroll")
      .set("Cookie", cookie)
      .send({});
    expect(enroll.status).toBe(201);
    const secret = String(enroll.body.secret);

    const verify = await request(app)
      .post("/api/v1/auth/mfa/verify")
      .set("Cookie", cookie)
      .send({ totpCode: generateTotpCode(secret) });
    expect(verify.status).toBe(200);

    // Gate 4: the appointment header is mandatory for coordinator requests.
    const withoutHeader = await request(app)
      .get("/api/v1/coordinator/overview")
      .set("Cookie", cookie);
    expect(withoutHeader.status).toBe(403);
    expect(withoutHeader.body.error.code).toBe("OUT_OF_ASSIGNMENT_SCOPE");

    const row = await db.user_sessions.findUnique({
      where: { id: sessionId },
    });
    expect(row?.active_coordinator_appointment_id).toBeTruthy();
    const appointmentId = String(row?.active_coordinator_appointment_id);

    const wrongHeader = await request(app)
      .get("/api/v1/coordinator/overview")
      .set("Cookie", cookie)
      .set(
        "X-Clario-Coordinator-Appointment-Id",
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      );
    expect(wrongHeader.status).toBe(403);
    expect(wrongHeader.body.error.code).toBe("OUT_OF_ASSIGNMENT_SCOPE");

    const withHeader = await request(app)
      .get("/api/v1/coordinator/overview")
      .set("Cookie", cookie)
      .set("X-Clario-Coordinator-Appointment-Id", appointmentId);
    expect(withHeader.status).toBe(200);
    expect(withHeader.body.appointmentId).toBe(appointmentId);

    // The bound appointment rides into the tenant transaction context.
    const echo = await request(app)
      .get("/api/v1/echo")
      .set("Cookie", cookie)
      .set("X-Clario-Coordinator-Appointment-Id", appointmentId);
    expect(echo.status).toBe(200);
    expect(echo.body.coordinatorAppointmentId).toBe(appointmentId);
    expect(echo.body.boundInstitutionId).toBe(institutionAId);

    await request(app).post("/api/v1/auth/logout").set("Cookie", cookie);
  });
});
