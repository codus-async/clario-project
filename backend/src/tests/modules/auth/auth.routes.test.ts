import express, { type Request, type Response } from "express";
import request from "supertest";
import { RoleCode } from "@clario/shared-contracts";
import { describe, expect, it } from "vitest";

import { requestContextMiddleware } from "../../../middleware/request-context.middleware.js";
import { errorHandler } from "../../../middleware/error-handler.js";
import {
  createRequireMfaVerified,
  createRequireSession,
} from "../../../modules/auth/auth.middleware.js";
import { createAuthRouter } from "../../../modules/auth/auth.routes.js";
import { hashSingleUseToken } from "../../../modules/auth/auth.token.js";
import {
  INVITATION_TOKEN,
  LOGIN_BODY,
  PASSWORD,
  PASSWORD_RESET_TOKEN,
  coordinatorScope,
  createFakeAuthFixture,
  seedAccount,
  seedCoordinatorScopes,
  seedInstitution,
  seedRoles,
  seedTenantUser,
  type FakeAuthFixture,
} from "./auth.fakes.js";

function buildApp(fixture: FakeAuthFixture): ReturnType<typeof express> {
  const app = express();

  app.use(requestContextMiddleware);
  app.use(express.json());
  app.use(
    "/api/v1/auth",
    createAuthRouter(fixture.service, fixture.accountService, fixture.config),
  );

  const requireSession = createRequireSession(fixture.service);

  app.get("/protected", requireSession, (req, res) => {
    res.status(200).json({
      userId: req.authContext?.userId,
      activeRole: req.authContext?.activeRole,
    });
  });

  app.get(
    "/admin-only",
    requireSession,
    createRequireMfaVerified(fixture.service),
    (_req: Request, res: Response) => {
      res.status(200).json({ ok: true });
    },
  );

  app.use(errorHandler);
  return app;
}

function seededFixture(roles: RoleCode[] = [RoleCode.PROJECT_SUPERVISOR]): FakeAuthFixture {
  const fixture = createFakeAuthFixture();
  seedInstitution(fixture);
  seedTenantUser(fixture);
  seedRoles(fixture, roles);
  return fixture;
}

function setCookieHeaders(response: request.Response): string[] {
  const value = response.headers["set-cookie"];
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

async function login(
  app: ReturnType<typeof express>,
): Promise<{ sessionId: string; cookie: string }> {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send(LOGIN_BODY);

  expect(response.status).toBe(200);
  const sessionId = String(response.body.session_id);
  const setCookie = setCookieHeaders(response);
  expect(setCookie.length).toBeGreaterThan(0);
  const cookie = setCookie[0]?.split(";")[0] ?? "";
  expect(cookie).toBe(`clario_sid=${sessionId}`);
  return { sessionId, cookie };
}

describe("POST /api/v1/auth/login", () => {
  it("returns 400 for a malformed JSON body", async () => {
    const app = buildApp(seededFixture());

    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("Content-Type", "application/json")
      .send("{bad json");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.detail).toContain("not valid JSON");
  });

  it("returns 413 when the body exceeds the size limit", async () => {
    const app = buildApp(seededFixture());

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "a@b.com", padding: "x".repeat(150_000) });

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("returns the session payload and sets the clario_sid cookie", async () => {
    const app = buildApp(seededFixture());

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send(LOGIN_BODY);

    expect(response.status).toBe(200);
    expect(response.body.session_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(response.body.user.id).toBeDefined();
    expect(response.body.user.full_name).toBe("Dr. Tunde Adewale");
    expect(response.body.user.institution_code).toBe("UNILAG");
    expect(response.body.user.timezone_iana).toBe("Africa/Lagos");
    expect(response.body.user.roles).toEqual([RoleCode.PROJECT_SUPERVISOR]);
    expect(response.body.active_role).toBe(RoleCode.PROJECT_SUPERVISOR);
    expect(response.body.mfa_required).toBe(false);
    expect(response.body.mfa_enrolled).toBe(false);
    expect(response.body.mfa_verified).toBe(false);
    expect(response.body.next_step).toBeNull();
    expect(response.body.inactivity_timeout_minutes).toBe(60);

    const setCookie = setCookieHeaders(response);
    expect(setCookie[0]).toContain("clario_sid=");
    expect(setCookie[0]).toContain("HttpOnly");
    expect(setCookie[0]).toContain("Secure");
    expect(setCookie[0]).toContain("SameSite=Lax");
    expect(setCookie[0]).toContain("Path=/");
  });

  it("returns the institution timezone header", async () => {
    const app = buildApp(seededFixture());

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send(LOGIN_BODY);

    expect(response.status).toBe(200);
    expect(response.headers["x-clario-institution-timezone"]).toBe(
      "Africa/Lagos",
    );
  });

  it("returns an empty coordinator appointment list for a non-coordinator", async () => {
    const app = buildApp(seededFixture());

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send(LOGIN_BODY);

    expect(response.status).toBe(200);
    expect(response.body.user.coordinator_appointments).toEqual([]);
  });

  it("returns the coordinator appointments of the account", async () => {
    const fixture = seededFixture([RoleCode.PROJECT_COORDINATOR]);
    seedCoordinatorScopes(fixture, [coordinatorScope()]);
    const app = buildApp(fixture);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send(LOGIN_BODY);

    expect(response.status).toBe(200);
    expect(response.body.user.coordinator_appointments).toEqual([
      {
        appointment_id: "33333333-3333-4333-8333-333333333333",
        programme_id: "44444444-4444-4444-8444-444444444444",
        programme_name: "B.Sc. Computer Science",
        academic_session_id: "66666666-6666-4666-8666-666666666666",
        session_label: "2026/2027",
      },
    ]);
  });

  it("records the last authenticated timestamp of the account", async () => {
    const fixture = seededFixture();
    const app = buildApp(fixture);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send(LOGIN_BODY);

    expect(response.status).toBe(200);
    expect(fixture.users.lastLoginAt.get("22222222-2222-4222-8222-222222222222"))
      .toBeInstanceOf(Date);
  });

  it("rejects a missing identifier with a validation error", async () => {
    const app = buildApp(seededFixture());

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ password: "irrelevant" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.field_errors?.[0]?.field).toBe("identifier");
  });

  it("rejects a non-object body with a validation error", async () => {
    const app = buildApp(seededFixture());

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send(["not", "an", "object"]);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns the generic authentication error for a wrong password", async () => {
    const app = buildApp(seededFixture());

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ ...LOGIN_BODY, password: "wrong" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("returns 429 when the login protection store reports a lockout", async () => {
    const fixture = seededFixture();
    fixture.protection.locked = true;
    fixture.protection.retryAfterSeconds = 1_800;
    const app = buildApp(fixture);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send(LOGIN_BODY);

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe("ACCOUNT_TEMPORARILY_LOCKED");
  });

  it("requires X-Clario-Active-Role for multi-role accounts", async () => {
    const app = buildApp(
      seededFixture([RoleCode.PROJECT_SUPERVISOR, RoleCode.PROJECT_EXAMINER]),
    );

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send(LOGIN_BODY);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.field_errors?.[0]?.field).toBe(
      "X-Clario-Active-Role",
    );
  });

  it("honours X-Clario-Active-Role on multi-role accounts", async () => {
    const app = buildApp(
      seededFixture([RoleCode.PROJECT_SUPERVISOR, RoleCode.PROJECT_EXAMINER]),
    );

    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("X-Clario-Active-Role", RoleCode.PROJECT_EXAMINER)
      .send(LOGIN_BODY);

    expect(response.status).toBe(200);
    expect(response.body.active_role).toBe(RoleCode.PROJECT_EXAMINER);
  });

  it("reports the MFA challenge as the next step for a mandatory-MFA role", async () => {
    const app = buildApp(seededFixture([RoleCode.INSTITUTIONAL_ADMIN]));

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send(LOGIN_BODY);

    expect(response.status).toBe(200);
    expect(response.body.mfa_required).toBe(true);
    expect(response.body.next_step).toBe("MFA_CHALLENGE_REQUIRED");
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("revokes the session and clears the cookie", async () => {
    const fixture = seededFixture();
    const app = buildApp(fixture);
    const { sessionId, cookie } = await login(app);

    const response = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const setCookie = setCookieHeaders(response);
    expect(setCookie[0]).toContain("clario_sid=;");
    expect(setCookie[0]).toContain("Expires=Thu, 01 Jan 1970");

    expect(fixture.sessions.rows.get(sessionId)?.isRevoked).toBe(true);
    expect(fixture.sessionStore.states.has(sessionId)).toBe(false);
  });

  it("accepts a bearer session token", async () => {
    const fixture = seededFixture();
    const app = buildApp(fixture);
    const { sessionId } = await login(app);

    const response = await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${sessionId}`);

    expect(response.status).toBe(200);
    expect(fixture.sessions.rows.get(sessionId)?.isRevoked).toBe(true);
  });

  it("rejects unauthenticated logout", async () => {
    const app = buildApp(seededFixture());

    const response = await request(app).post("/api/v1/auth/logout");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("POST /api/v1/auth/session/heartbeat", () => {
  it("extends the session for a cookie-authenticated request", async () => {
    const fixture = seededFixture();
    const app = buildApp(fixture);
    const { sessionId, cookie } = await login(app);

    const response = await request(app)
      .post("/api/v1/auth/session/heartbeat")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.session_id).toBe(sessionId);
    expect(response.body.inactivity_timeout_minutes).toBe(60);
    expect(response.body.expires_at_utc).toBeDefined();
  });

  it("rejects heartbeats without credentials", async () => {
    const app = buildApp(seededFixture());

    const response = await request(app).post(
      "/api/v1/auth/session/heartbeat",
    );

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects heartbeats for revoked sessions", async () => {
    const fixture = seededFixture();
    const app = buildApp(fixture);
    const { sessionId } = await login(app);
    await fixture.service.logout(sessionId);

    const response = await request(app)
      .post("/api/v1/auth/session/heartbeat")
      .set("Authorization", `Bearer ${sessionId}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("SESSION_EXPIRED_OR_REVOKED");
  });
});

describe("session middleware", () => {
  it("authenticates a protected route with the clario_sid cookie", async () => {
    const fixture = seededFixture();
    const app = buildApp(fixture);
    const { cookie } = await login(app);

    const response = await request(app)
      .get("/protected")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.activeRole).toBe(RoleCode.PROJECT_SUPERVISOR);
  });

  it("returns the institution timezone header on an authenticated route", async () => {
    const fixture = seededFixture();
    const app = buildApp(fixture);
    const { cookie } = await login(app);

    const response = await request(app)
      .get("/protected")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.headers["x-clario-institution-timezone"]).toBe(
      "Africa/Lagos",
    );
  });

  it("authenticates a protected route with a bearer token", async () => {
    const fixture = seededFixture();
    const app = buildApp(fixture);
    const { sessionId } = await login(app);

    const response = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${sessionId}`);

    expect(response.status).toBe(200);
    expect(response.body.userId).toBeDefined();
  });

  it("rejects requests without credentials", async () => {
    const app = buildApp(seededFixture());

    const response = await request(app).get("/protected");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects conflicting cookie and bearer credentials", async () => {
    const fixture = seededFixture();
    const app = buildApp(fixture);
    const { cookie } = await login(app);

    const response = await request(app)
      .get("/protected")
      .set("Cookie", cookie)
      .set("Authorization", "Bearer 44444444-4444-4444-8444-444444444444");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects a malformed Authorization header", async () => {
    const app = buildApp(seededFixture());

    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Basic dXNlcjpwYXNz");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects revoked sessions", async () => {
    const fixture = seededFixture();
    const app = buildApp(fixture);
    const { sessionId } = await login(app);
    await fixture.service.logout(sessionId);

    const response = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${sessionId}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("SESSION_EXPIRED_OR_REVOKED");
  });

  it("blocks suspended tenants with TENANT_SUSPENDED_F01", async () => {
    const fixture = seededFixture();
    const app = buildApp(fixture);
    const { cookie } = await login(app);

    const institution = fixture.institutions.institutions[0];
    if (institution !== undefined) {
      institution.accountStatus = "SUSPENDED";
    }

    const response = await request(app)
      .get("/protected")
      .set("Cookie", cookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("TENANT_SUSPENDED_F01");
  });
});

describe("createRequireMfaVerified", () => {
  it("blocks mandatory-MFA roles until MFA is verified", async () => {
    const fixture = seededFixture([RoleCode.INSTITUTIONAL_ADMIN]);
    const app = buildApp(fixture);
    const { cookie } = await login(app);

    const response = await request(app)
      .get("/admin-only")
      .set("Cookie", cookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("MFA_CHALLENGE_REQUIRED");
  });

  it("allows roles that do not require MFA", async () => {
    const fixture = seededFixture([RoleCode.PROJECT_SUPERVISOR]);
    const app = buildApp(fixture);
    const { cookie } = await login(app);

    const response = await request(app)
      .get("/admin-only")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
  });

  it("blocks account-level mfa_required sessions for non-mandatory roles", async () => {
    // The account is flagged mfa_required (e.g. it previously held an admin
    // role) but the active role is a supervisor, which is not in
    // MANDATORY_MFA_ROLES. The account-level flag must still gate access.
    const fixture = seededFixture([RoleCode.PROJECT_SUPERVISOR]);
    const user = fixture.users.users[0];
    expect(user).toBeDefined();
    if (user !== undefined) {
      user.mfaRequired = true;
    }
    const app = buildApp(fixture);
    const { cookie } = await login(app);

    const response = await request(app)
      .get("/admin-only")
      .set("Cookie", cookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("MFA_CHALLENGE_REQUIRED");
  });
});

describe("POST /api/v1/auth/activate", () => {
  it("activates an invited account", async () => {
    const fixture = seededFixture();
    seedAccount(fixture);
    const app = buildApp(fixture);

    const response = await request(app)
      .post("/api/v1/auth/activate")
      .send({ token: INVITATION_TOKEN, password: PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.account_status).toBe("ACTIVE");
    expect(fixture.accounts.accounts[0]?.accountStatus).toBe("ACTIVE");
  });

  it("rejects an unknown activation token", async () => {
    const fixture = seededFixture();
    seedAccount(fixture);
    const app = buildApp(fixture);

    const response = await request(app)
      .post("/api/v1/auth/activate")
      .send({ token: "not-a-real-token", password: PASSWORD });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.field_errors?.[0]?.field).toBe("token");
    expect(fixture.accounts.accounts[0]?.accountStatus).toBe("INVITED");
  });

  it("rejects a password below the SEC-02 minimum", async () => {
    const fixture = seededFixture();
    seedAccount(fixture);
    const app = buildApp(fixture);

    const response = await request(app)
      .post("/api/v1/auth/activate")
      .send({ token: INVITATION_TOKEN, password: "Short1!" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.field_errors?.[0]?.field).toBe("password");
  });

  it("rejects a compromised password", async () => {
    const fixture = seededFixture();
    seedAccount(fixture);
    fixture.compromisedPasswords.compromised.add("Password1234!");
    const app = buildApp(fixture);

    const response = await request(app)
      .post("/api/v1/auth/activate")
      .send({ token: INVITATION_TOKEN, password: "Password1234!" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("COMPROMISED_OR_WEAK_PASSWORD");
    expect(fixture.accounts.accounts[0]?.accountStatus).toBe("INVITED");
  });

  it("rejects an activation token that was already used", async () => {
    const fixture = seededFixture();
    seedAccount(fixture);
    const app = buildApp(fixture);

    const first = await request(app)
      .post("/api/v1/auth/activate")
      .send({ token: INVITATION_TOKEN, password: PASSWORD });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post("/api/v1/auth/activate")
      .send({ token: INVITATION_TOKEN, password: PASSWORD });

    expect(second.status).toBe(400);
    expect(second.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/v1/auth/password/forgot", () => {
  it("acknowledges a reset request without revealing whether the account exists", async () => {
    const fixture = seededFixture();
    seedAccount(fixture, {
      accountStatus: "ACTIVE",
      passwordHash: `fake-argon2id$${PASSWORD}`,
    });
    const app = buildApp(fixture);

    const known = await request(app)
      .post("/api/v1/auth/password/forgot")
      .send({ identifier: "tunde.adewale@unilag.edu.ng" });
    const unknown = await request(app)
      .post("/api/v1/auth/password/forgot")
      .send({ identifier: "nobody@unilag.edu.ng" });

    expect(known.status).toBe(202);
    expect(unknown.status).toBe(202);
    // Identical bodies: the endpoint is not an enumeration oracle.
    expect(known.body).toEqual(unknown.body);
    // Only the real account received a token.
    expect(fixture.accounts.issuedResets).toHaveLength(1);
  });

  it("rejects a request without an identifier", async () => {
    const app = buildApp(seededFixture());

    const response = await request(app)
      .post("/api/v1/auth/password/forgot")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.field_errors?.[0]?.field).toBe("identifier");
  });
});

describe("POST /api/v1/auth/password/reset", () => {
  it("changes the password and revokes every session of the account", async () => {
    const fixture = seededFixture();
    seedAccount(fixture, {
      accountStatus: "ACTIVE",
      passwordHash: `fake-argon2id$${PASSWORD}`,
      passwordResetTokenHash: hashSingleUseToken(PASSWORD_RESET_TOKEN),
      passwordResetExpiresAt: new Date(Date.now() + 30 * 60_000),
    });
    const app = buildApp(fixture);
    const { sessionId } = await login(app);

    const response = await request(app)
      .post("/api/v1/auth/password/reset")
      .send({ token: PASSWORD_RESET_TOKEN, password: "Brand-New-Strong-Pass-77!" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(fixture.accounts.accounts[0]?.passwordHash).toBe(
      "fake-argon2id$Brand-New-Strong-Pass-77!",
    );
    expect(fixture.sessions.rows.get(sessionId)?.isRevoked).toBe(true);
    expect(fixture.sessionStore.states.has(sessionId)).toBe(false);
  });

  it("rejects an unknown reset token", async () => {
    const app = buildApp(seededFixture());

    const response = await request(app)
      .post("/api/v1/auth/password/reset")
      .send({ token: "not-a-real-token", password: PASSWORD });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.field_errors?.[0]?.field).toBe("token");
  });

  it("rejects a password below the SEC-02 minimum", async () => {
    const app = buildApp(seededFixture());

    const response = await request(app)
      .post("/api/v1/auth/password/reset")
      .send({ token: PASSWORD_RESET_TOKEN, password: "Short1!" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.field_errors?.[0]?.field).toBe("password");
  });
});
