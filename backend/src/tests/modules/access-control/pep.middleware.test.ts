import { RoleCode, SubscriptionStatus } from "@clario/shared-contracts";
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { AppError } from "../../../errors/app-error.js";
import { errorHandler } from "../../../middleware/error-handler.js";
import { requestContextMiddleware } from "../../../middleware/request-context.middleware.js";
import {
  inactivityTimeoutMinutesFor,
  type AuthConfig,
} from "../../../modules/auth/auth.config.js";
import type {
  AuthSessionContext,
  SessionCredential,
} from "../../../modules/auth/auth.types.js";
import {
  createPolicyEnforcementPoint,
} from "../../../modules/access-control/pep.middleware.js";
import type {
  PepSecurityEvent,
  PepSessionPort,
} from "../../../modules/access-control/pep.types.js";
import { testAuthConfig } from "../auth/auth.fakes.js";

const INSTITUTION_A = "11111111-1111-4111-8111-111111111111";
const INSTITUTION_B = "22222222-2222-4222-8222-222222222222";
const APPOINTMENT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function sessionContext(
  overrides: Partial<AuthSessionContext> = {},
): AuthSessionContext {
  const activeRole = overrides.activeRole ?? RoleCode.PROJECT_SUPERVISOR;
  return {
    sessionId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    userId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    fullName: "Dr. Tunde Adewale",
    email: "tunde.adewale@unilag.edu.ng",
    institutionalIdNumber: "UNILAG/STAFF/0042",
    institutionId: INSTITUTION_A,
    institutionName: "University of Lagos",
    institutionCode: "UNILAG",
    institutionTimezone: "Africa/Lagos",
    subscriptionStatus: null,
    gracePeriodEndsAtUtc: null,
    assignedRoles: [RoleCode.PROJECT_SUPERVISOR],
    activeRole,
    mfaRequired: false,
    mfaEnrolled: false,
    mfaVerified: false,
    coordinatorAppointments: [],
    activeCoordinatorScope: null,
    // The session's window must satisfy the active role's own policy or
    // gate 1 rejects it (SEC-07).
    inactivityTimeoutMinutes: inactivityTimeoutMinutesFor(
      testAuthConfig,
      activeRole,
    ),
    expiresAtUtc: new Date(Date.now() + 60 * 60_000).toISOString(),
    ...overrides,
  };
}

function coordinatorScope() {
  return {
    appointmentId: APPOINTMENT_ID,
    programmeId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    programmeName: "B.Sc. Computer Science",
    programmeCode: "CSC",
    departmentId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    academicSessionId: "99999999-9999-4999-8999-999999999999",
    academicSessionLabel: "2026/2027",
  };
}

function coordinatorSession(
  overrides: Partial<AuthSessionContext> = {},
): AuthSessionContext {
  return sessionContext({
    assignedRoles: [RoleCode.PROJECT_COORDINATOR],
    activeRole: RoleCode.PROJECT_COORDINATOR,
    mfaRequired: true,
    mfaVerified: true,
    coordinatorAppointments: [coordinatorScope()],
    activeCoordinatorScope: coordinatorScope(),
    ...overrides,
  });
}

function adminSession(
  overrides: Partial<AuthSessionContext> = {},
): AuthSessionContext {
  return sessionContext({
    assignedRoles: [RoleCode.INSTITUTIONAL_ADMIN],
    activeRole: RoleCode.INSTITUTIONAL_ADMIN,
    mfaRequired: true,
    mfaVerified: true,
    ...overrides,
  });
}

interface AppFixture {
  app: express.Express;
  events: PepSecurityEvent[];
  credentials: SessionCredential[];
}

/**
 * Builds a minimal app that mirrors `createApp`'s ordering: request context,
 * JSON body parsing, the exempt auth router, the PEP, sample protected
 * routes, and the RFC 9457 error handler.
 */
function buildApp(
  session: AuthSessionContext | Error,
  authConfig: AuthConfig = testAuthConfig,
): AppFixture {
  const events: PepSecurityEvent[] = [];
  const credentials: SessionCredential[] = [];
  const port: PepSessionPort = {
    async resolveSession(credential) {
      credentials.push(credential);
      if (session instanceof Error) {
        throw session;
      }
      return session;
    },
  };

  const app = express();
  app.use(requestContextMiddleware);
  app.use(express.json());

  // The exempt F-64 surface: reachable with no session at all.
  app.get("/api/v1/auth/ping", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use(
    createPolicyEnforcementPoint({
      session: port,
      authConfig,
      securityEvents: (event) => {
        events.push(event);
      },
    }),
  );

  const echo = (req: express.Request, res: express.Response): void => {
    res.status(200).json({
      activeRole: req.authContext?.activeRole ?? null,
      tenantContext: req.tenantContext ?? null,
    });
  };
  app.get("/api/v1/projects", echo);
  app.post("/api/v1/projects", echo);
  app.get("/api/v1/institutions/:id", echo);
  app.get("/api/v1/coordinator/appointments", echo);
  app.post("/api/v1/coordinator/appointments", echo);
  app.get("/api/v1/platform/institutions", echo);
  app.post("/api/v1/billing/renew", echo);
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use(errorHandler);
  return { app, events, credentials };
}

function expectProblem(
  response: request.Response,
  status: number,
  code: string,
): void {
  expect(response.status).toBe(status);
  expect(response.headers["content-type"]).toContain(
    "application/problem+json",
  );
  expect(response.body.error.code).toBe(code);
  expect(response.body.error.status).toBe(status);
  expect(typeof response.body.error.title).toBe("string");
  expect(typeof response.body.error.detail).toBe("string");
  expect(response.body.error.instance).toBeTruthy();
  expect(typeof response.body.error.timestamp_utc).toBe("string");
  expect(response.body.error.institution_timezone).toBeTruthy();
}

// ---------------------------------------------------------------------------
// Gate 1 — session
// ---------------------------------------------------------------------------

describe("gate 1: session", () => {
  it("returns 401 UNAUTHORIZED_SESSION when no credentials are presented", async () => {
    const { app, events } = buildApp(
      new AppError("UNAUTHENTICATED", "Authentication credentials were not provided."),
    );

    const response = await request(app).get("/api/v1/projects");

    expectProblem(response, 401, "UNAUTHORIZED_SESSION");
    expect(events).toHaveLength(1);
    expect(events[0]?.gate).toBe("session");
    expect(events[0]?.code).toBe("UNAUTHORIZED_SESSION");
    expect(events[0]?.path).toBe("/api/v1/projects");
    expect(events[0]?.requestId).toBeTruthy();
  });

  it("normalizes an expired/revoked session to UNAUTHORIZED_SESSION", async () => {
    const { app } = buildApp(
      new AppError(
        "SESSION_EXPIRED_OR_REVOKED",
        "The session is invalid, expired, or has been revoked.",
      ),
    );

    const response = await request(app).get("/api/v1/projects");

    expectProblem(response, 401, "UNAUTHORIZED_SESSION");
  });

  it("normalizes a malformed Authorization header to UNAUTHORIZED_SESSION", async () => {
    const { app, credentials } = buildApp(sessionContext());

    const response = await request(app)
      .get("/api/v1/projects")
      .set("Authorization", "Basic dXNlcjpwYXNz");

    expectProblem(response, 401, "UNAUTHORIZED_SESSION");
    expect(credentials).toHaveLength(0);
  });

  it("passes tenant suspension through as its own documented code", async () => {
    const { app } = buildApp(
      new AppError("TENANT_SUSPENDED_F01", "This institution is suspended and cannot access Clario."),
    );

    const response = await request(app).get("/api/v1/projects");

    expectProblem(response, 403, "TENANT_SUSPENDED_F01");
  });

  it("passes infrastructure failures through as 503", async () => {
    const { app } = buildApp(
      new AppError("SERVICE_UNAVAILABLE", "Please try again."),
    );

    const response = await request(app).get("/api/v1/projects");

    expectProblem(response, 503, "SERVICE_UNAVAILABLE");
  });

  it("resolves the cookie credential and returns the institution timezone", async () => {
    const { app, credentials } = buildApp(sessionContext());

    const response = await request(app)
      .get("/api/v1/projects")
      .set("Cookie", "clario_sid=session-from-cookie");

    expect(response.status).toBe(200);
    expect(credentials[0]?.cookieSessionId).toBe("session-from-cookie");
    expect(credentials[0]?.bearerSessionId).toBeUndefined();
    expect(response.headers["x-clario-institution-timezone"]).toBe(
      "Africa/Lagos",
    );
    expect(response.body.tenantContext).toEqual({
      institutionId: INSTITUTION_A,
      isPlatformAdmin: false,
      activeRole: RoleCode.PROJECT_SUPERVISOR,
      coordinatorAppointmentId: null,
    });
  });

  it("resolves the Bearer credential", async () => {
    const { app, credentials } = buildApp(sessionContext());

    const response = await request(app)
      .get("/api/v1/projects")
      .set("Authorization", "Bearer session-from-bearer");

    expect(response.status).toBe(200);
    expect(credentials[0]?.bearerSessionId).toBe("session-from-bearer");
  });

  it("denies a session whose inactivity window exceeds the policy", async () => {
    const { app } = buildApp(
      sessionContext({ inactivityTimeoutMinutes: 10_000 }),
    );

    const response = await request(app).get("/api/v1/projects");

    expectProblem(response, 401, "UNAUTHORIZED_SESSION");
  });

  it("leaves /health outside the enforced prefix", async () => {
    const { app } = buildApp(
      new AppError("UNAUTHENTICATED", "no session"),
    );

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
  });

  it("keeps the exempt auth surface reachable without a session", async () => {
    const { app, credentials } = buildApp(
      new AppError("UNAUTHENTICATED", "no session"),
    );

    const response = await request(app).get("/api/v1/auth/ping");

    expect(response.status).toBe(200);
    expect(credentials).toHaveLength(0);
  });

  it("does not treat lookalike prefixes as exempt", async () => {
    const { app } = buildApp(
      new AppError("UNAUTHENTICATED", "no session"),
    );

    const response = await request(app).get("/api/v1/authorizations");

    expectProblem(response, 401, "UNAUTHORIZED_SESSION");
  });
});

// ---------------------------------------------------------------------------
// Gate 2 — active role
// ---------------------------------------------------------------------------

describe("gate 2: active role", () => {
  it("requires X-Clario-Active-Role for a multi-role account", async () => {
    const { app } = buildApp(
      sessionContext({
        assignedRoles: [RoleCode.PROJECT_SUPERVISOR, RoleCode.STUDENT],
        activeRole: RoleCode.PROJECT_SUPERVISOR,
      }),
    );

    const response = await request(app).get("/api/v1/projects");

    expectProblem(response, 403, "OUT_OF_ASSIGNMENT_SCOPE");
    expect(response.body.error.detail).toContain("X-Clario-Active-Role");
  });

  it("accepts a header matching the persisted active role", async () => {
    const { app, events } = buildApp(
      sessionContext({
        assignedRoles: [RoleCode.PROJECT_SUPERVISOR, RoleCode.STUDENT],
        activeRole: RoleCode.STUDENT,
      }),
    );

    const response = await request(app)
      .get("/api/v1/projects")
      .set("X-Clario-Active-Role", RoleCode.STUDENT);

    expect(response.status).toBe(200);
    expect(response.body.activeRole).toBe(RoleCode.STUDENT);
    expect(events).toHaveLength(0);
  });

  it("rejects a header that selects a different assigned role (F-65 switching only)", async () => {
    const { app } = buildApp(
      sessionContext({
        assignedRoles: [RoleCode.PROJECT_SUPERVISOR, RoleCode.STUDENT],
        activeRole: RoleCode.PROJECT_SUPERVISOR,
      }),
    );

    const response = await request(app)
      .get("/api/v1/projects")
      .set("X-Clario-Active-Role", RoleCode.STUDENT);

    expectProblem(response, 403, "OUT_OF_ASSIGNMENT_SCOPE");
    expect(response.body.error.detail).toContain("session/context");
  });

  it("rejects a header naming an unassigned role", async () => {
    const { app } = buildApp(sessionContext());

    const response = await request(app)
      .get("/api/v1/projects")
      .set("X-Clario-Active-Role", RoleCode.PLATFORM_ADMIN);

    expectProblem(response, 403, "OUT_OF_ASSIGNMENT_SCOPE");
  });
});

// ---------------------------------------------------------------------------
// Gate 3 — MFA
// ---------------------------------------------------------------------------

describe("gate 3: MFA", () => {
  it("blocks an unverified coordinator with MFA_ENROLLMENT_REQUIRED", async () => {
    const { app, events } = buildApp(
      coordinatorSession({ mfaEnrolled: false, mfaVerified: false }),
    );

    const response = await request(app).get("/api/v1/projects");

    expectProblem(response, 403, "MFA_ENROLLMENT_REQUIRED");
    expect(events[0]?.gate).toBe("mfa");
  });

  it("lets a verified coordinator through once the appointment header binds the scope", async () => {
    const { app } = buildApp(coordinatorSession());

    const response = await request(app)
      .get("/api/v1/projects")
      .set("X-Clario-Coordinator-Appointment-Id", APPOINTMENT_ID);

    expect(response.status).toBe(200);
  });

  it("requires the appointment header on any route while the coordinator role is active (BR-03)", async () => {
    const { app } = buildApp(coordinatorSession());

    const response = await request(app).get("/api/v1/projects");

    expectProblem(response, 403, "OUT_OF_ASSIGNMENT_SCOPE");
  });

  it("lets an unverified supervisor through (MFA not mandatory for the role)", async () => {
    const { app } = buildApp(sessionContext());

    const response = await request(app).get("/api/v1/projects");

    expect(response.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Gate 4 — tenant boundary, coordinator scope, confidentiality
// ---------------------------------------------------------------------------

describe("gate 4: tenant and scope", () => {
  it("denies an explicit cross-tenant institution address (AC-F66-01)", async () => {
    const { app, events } = buildApp(sessionContext());

    const response = await request(app).get(
      `/api/v1/institutions/${INSTITUTION_B}`,
    );

    expectProblem(response, 403, "OUT_OF_ASSIGNMENT_SCOPE");
    expect(events[0]?.gate).toBe("tenant_scope");
  });

  it("allows an in-tenant institution address", async () => {
    const { app } = buildApp(sessionContext());

    const response = await request(app).get(
      `/api/v1/institutions/${INSTITUTION_A}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.tenantContext.institutionId).toBe(INSTITUTION_A);
  });

  it("denies a cross-tenant institution_id in the query string", async () => {
    const { app } = buildApp(sessionContext());

    const response = await request(app)
      .get("/api/v1/projects")
      .query({ institution_id: INSTITUTION_B });

    expectProblem(response, 403, "OUT_OF_ASSIGNMENT_SCOPE");
  });

  it("requires the appointment header on coordinator routes (BR-03)", async () => {
    const { app } = buildApp(coordinatorSession());

    const response = await request(app).get(
      "/api/v1/coordinator/appointments",
    );

    expectProblem(response, 403, "OUT_OF_ASSIGNMENT_SCOPE");
    expect(response.body.error.detail).toContain(
      "X-Clario-Coordinator-Appointment-Id",
    );
  });

  it("rejects an appointment the session is not bound to", async () => {
    const { app } = buildApp(coordinatorSession());

    const response = await request(app)
      .get("/api/v1/coordinator/appointments")
      .set(
        "X-Clario-Coordinator-Appointment-Id",
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      );

    expectProblem(response, 403, "OUT_OF_ASSIGNMENT_SCOPE");
  });

  it("accepts the session's own appointment and binds it to the tenant context", async () => {
    const { app, events } = buildApp(coordinatorSession());

    const response = await request(app)
      .post("/api/v1/coordinator/appointments")
      .set("X-Clario-Coordinator-Appointment-Id", APPOINTMENT_ID);

    expect(response.status).toBe(200);
    expect(response.body.tenantContext.coordinatorAppointmentId).toBe(
      APPOINTMENT_ID,
    );
    expect(events).toHaveLength(0);
  });

  it("blocks an Institutional Admin on confidential academic routes (BR-25)", async () => {
    const { app, events } = buildApp(adminSession());

    const response = await request(app).get(
      "/api/v1/projects/123/submissions",
    );

    expectProblem(response, 403, "CONFIDENTIAL_ACADEMIC_RECORD_BLOCKED");
    expect(events[0]?.code).toBe("CONFIDENTIAL_ACADEMIC_RECORD_BLOCKED");
  });

  it("allows an Institutional Admin on non-confidential metadata", async () => {
    const { app } = buildApp(adminSession());

    const response = await request(app).get("/api/v1/projects");

    expect(response.status).toBe(200);
  });

  it("blocks a Platform Admin on confidential academic routes (SEC-15)", async () => {
    const { app } = buildApp(
      sessionContext({
        assignedRoles: [RoleCode.PLATFORM_ADMIN],
        activeRole: RoleCode.PLATFORM_ADMIN,
        institutionId: null,
        institutionName: null,
        institutionCode: null,
        mfaRequired: true,
        mfaVerified: true,
      }),
    );

    const blocked = await request(app).get(
      "/api/v1/projects/123/submissions",
    );
    expectProblem(blocked, 403, "CONFIDENTIAL_ACADEMIC_RECORD_BLOCKED");

    const allowed = await request(app).get("/api/v1/platform/institutions");
    expect(allowed.status).toBe(200);
  });

  it("lets a Platform Admin address any institution", async () => {
    const { app } = buildApp(
      sessionContext({
        assignedRoles: [RoleCode.PLATFORM_ADMIN],
        activeRole: RoleCode.PLATFORM_ADMIN,
        institutionId: null,
        institutionName: null,
        institutionCode: null,
        mfaRequired: true,
        mfaVerified: true,
      }),
    );

    const response = await request(app).get(
      `/api/v1/institutions/${INSTITUTION_B}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.tenantContext.isPlatformAdmin).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Gate 5 — subscription
// ---------------------------------------------------------------------------

describe("gate 5: subscription", () => {
  it("allows all traffic while F-70 has not populated a status", async () => {
    const { app } = buildApp(sessionContext());

    const response = await request(app).post("/api/v1/projects");

    expect(response.status).toBe(200);
  });

  it("allows writes during GRACE_PERIOD (OD-06 default)", async () => {
    const { app } = buildApp(
      sessionContext({ subscriptionStatus: SubscriptionStatus.GRACE_PERIOD }),
    );

    const response = await request(app).post("/api/v1/projects");

    expect(response.status).toBe(200);
  });

  it("blocks writes when EXPIRED with 402 but keeps reads available", async () => {
    const { app, events } = buildApp(
      sessionContext({ subscriptionStatus: SubscriptionStatus.EXPIRED }),
    );

    const write = await request(app).post("/api/v1/projects");
    expectProblem(write, 402, "SUBSCRIPTION_EXPIRED_RESTRICTED");
    expect(events[0]?.gate).toBe("subscription");

    const read = await request(app).get("/api/v1/projects");
    expect(read.status).toBe(200);
  });

  it("keeps an Institutional Admin's renewal route reachable when EXPIRED", async () => {
    const { app } = buildApp(
      adminSession({ subscriptionStatus: SubscriptionStatus.EXPIRED }),
    );

    const renewal = await request(app).post("/api/v1/billing/renew");
    expect(renewal.status).toBe(200);

    const academicWrite = await request(app).post("/api/v1/projects");
    expectProblem(academicWrite, 402, "SUBSCRIPTION_EXPIRED_RESTRICTED");
  });
});

// ---------------------------------------------------------------------------
// Security events (FR-231)
// ---------------------------------------------------------------------------

describe("security events (FR-231)", () => {
  it("records every denial with gate, code, and request identity", async () => {
    const { app, events } = buildApp(
      new AppError("UNAUTHENTICATED", "no session"),
    );

    await request(app).get("/api/v1/projects");

    expect(events).toHaveLength(1);
    const event = events[0];
    expect(event).toMatchObject({
      gate: "session",
      code: "UNAUTHORIZED_SESSION",
      method: "GET",
      path: "/api/v1/projects",
      userId: null,
      institutionId: null,
    });
  });

  it("records the acting user for post-session denials", async () => {
    const { app, events } = buildApp(adminSession());

    await request(app).get("/api/v1/projects/123/submissions");

    expect(events).toHaveLength(1);
    expect(events[0]?.userId).toBe("dddddddd-dddd-4ddd-8ddd-dddddddddddd");
    expect(events[0]?.institutionId).toBe(INSTITUTION_A);
    expect(events[0]?.activeRole).toBe(RoleCode.INSTITUTIONAL_ADMIN);
  });

  it("does not emit events for allowed requests", async () => {
    const { app, events } = buildApp(sessionContext());

    await request(app).get("/api/v1/projects");

    expect(events).toHaveLength(0);
  });
});
