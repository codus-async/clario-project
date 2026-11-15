import express from "express";
import request from "supertest";
import { RoleCode } from "@clario/shared-contracts";
import { describe, expect, it, vi } from "vitest";

import { errorHandler } from "../../../middleware/error-handler.js";
import { requestContextMiddleware } from "../../../middleware/request-context.middleware.js";
import { createAuthRouter } from "../../../modules/auth/auth.routes.js";
import {
  LOGIN_BODY,
  createFakeAuthFixture,
  seedInstitution,
  seedRoles,
  seedTenantUser,
  type FakeAuthFixture,
} from "./auth.fakes.js";

function buildApp(fixture: FakeAuthFixture): ReturnType<typeof express> {
  const app = express();

  app.use(requestContextMiddleware);
  app.use(express.json());
  app.use("/api/v1/auth", createAuthRouter(fixture.service, fixture.config));
  app.use(errorHandler);

  return app;
}

function seededFixture(): FakeAuthFixture {
  const fixture = createFakeAuthFixture();
  seedInstitution(fixture);
  seedTenantUser(fixture);
  seedRoles(fixture, [RoleCode.PROJECT_SUPERVISOR]);
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
  return { sessionId, cookie };
}

describe("F-64 validation errors (RFC 9457)", () => {
  it("returns the documented Problem Details envelope for a missing identifier", async () => {
    const app = buildApp(seededFixture());

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ password: "irrelevant" });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      title: "Validation Error",
      status: 400,
      detail: "identifier is required.",
      instance: "/api/v1/auth/login",
      field_errors: [
        { field: "identifier", message: "identifier is required." },
      ],
    });
    expect(Number.isNaN(Date.parse(response.body.error.timestamp_utc))).toBe(
      false,
    );
    expect(typeof response.body.error.institution_timezone).toBe("string");
  });

  it("identifies unknown request fields in field_errors", async () => {
    const app = buildApp(seededFixture());

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ ...LOGIN_BODY, isAdmin: true });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.field_errors).toEqual([
      { field: "isAdmin", message: "Unknown field." },
    ]);
  });

  it("identifies an invalid optional institution code", async () => {
    const app = buildApp(seededFixture());

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ ...LOGIN_BODY, institutionCode: "   " });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.field_errors).toEqual([
      { field: "institutionCode", message: "institutionCode must not be empty." },
    ]);
  });

  it("never includes submitted password values in the error response", async () => {
    const app = buildApp(seededFixture());

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "", password: "TopSecret-Passw0rd!" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(JSON.stringify(response.body)).not.toContain("TopSecret-Passw0rd!");
  });

  it("maps a non-object login body to the body-level detail", async () => {
    const app = buildApp(seededFixture());

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send(["not", "an", "object"]);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.detail).toBe(
      "A JSON object request body is required.",
    );
    expect(response.body.error.field_errors).toBeUndefined();
  });
});

describe("login request validation vs the application service", () => {
  it("rejects an invalid login body before the login service runs", async () => {
    const fixture = seededFixture();
    const app = buildApp(fixture);
    const loginSpy = vi.spyOn(fixture.service, "login");

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "tunde.adewale@unilag.edu.ng" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(loginSpy).not.toHaveBeenCalled();
  });

  it("passes a valid login body through to the login service", async () => {
    const fixture = seededFixture();
    const app = buildApp(fixture);
    const loginSpy = vi.spyOn(fixture.service, "login");

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send(LOGIN_BODY);

    expect(response.status).toBe(200);
    expect(loginSpy).toHaveBeenCalledTimes(1);
  });

  it("does not reject a login password shorter than 12 characters", async () => {
    // SEC-02's 12-character minimum belongs to account activation; a short
    // existing password must still reach credential verification.
    const fixture = seededFixture();
    const app = buildApp(fixture);
    const loginSpy = vi.spyOn(fixture.service, "login");

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ ...LOGIN_BODY, password: "short" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
    expect(loginSpy).toHaveBeenCalledTimes(1);
  });

  it("maps unexpected service failures through the central error handler", async () => {
    const fixture = seededFixture();
    const app = buildApp(fixture);
    vi.spyOn(fixture.service, "login").mockRejectedValue(
      new Error("postgres unavailable"),
    );

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send(LOGIN_BODY);

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(JSON.stringify(response.body)).not.toContain(
      "postgres unavailable",
    );
  });
});

describe("logout request validation vs the application service", () => {
  it("accepts a bodyless logout", async () => {
    const fixture = seededFixture();
    const app = buildApp(fixture);
    const { cookie } = await login(app);
    const logoutSpy = vi.spyOn(fixture.service, "logout");

    const response = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(logoutSpy).toHaveBeenCalledTimes(1);
  });

  it("rejects unexpected logout body fields before any service call", async () => {
    const fixture = seededFixture();
    const app = buildApp(fixture);
    const { cookie } = await login(app);
    const logoutSpy = vi.spyOn(fixture.service, "logout");
    const resolveSessionSpy = vi.spyOn(fixture.service, "resolveSession");

    const response = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", cookie)
      .send({ reason: "bye" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.field_errors).toEqual([
      { field: "reason", message: "Unknown field." },
    ]);
    expect(resolveSessionSpy).not.toHaveBeenCalled();
    expect(logoutSpy).not.toHaveBeenCalled();
  });

  it("rejects an invalid logout body before authentication resolves", async () => {
    const fixture = seededFixture();
    const app = buildApp(fixture);
    const resolveSessionSpy = vi.spyOn(fixture.service, "resolveSession");

    const response = await request(app)
      .post("/api/v1/auth/logout")
      .send({ reason: "bye" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(resolveSessionSpy).not.toHaveBeenCalled();
  });
});

describe("heartbeat request validation vs the application service", () => {
  it("accepts a bodyless heartbeat", async () => {
    const fixture = seededFixture();
    const app = buildApp(fixture);
    const { cookie } = await login(app);
    const heartbeatSpy = vi.spyOn(fixture.service, "heartbeat");

    const response = await request(app)
      .post("/api/v1/auth/session/heartbeat")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(heartbeatSpy).toHaveBeenCalledTimes(1);
  });

  it("rejects unexpected heartbeat body fields before any service call", async () => {
    const fixture = seededFixture();
    const app = buildApp(fixture);
    const { cookie } = await login(app);
    const heartbeatSpy = vi.spyOn(fixture.service, "heartbeat");
    const resolveSessionSpy = vi.spyOn(fixture.service, "resolveSession");

    const response = await request(app)
      .post("/api/v1/auth/session/heartbeat")
      .set("Cookie", cookie)
      .send({ ts: 1_700_000_000 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.field_errors).toEqual([
      { field: "ts", message: "Unknown field." },
    ]);
    expect(resolveSessionSpy).not.toHaveBeenCalled();
    expect(heartbeatSpy).not.toHaveBeenCalled();
  });
});
