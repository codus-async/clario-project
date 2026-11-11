import { RoleCode } from "@clario/shared-contracts";
import { describe, expect, it } from "vitest";

import { AppError } from "../../../errors/app-error.js";
import { ERROR_CODES } from "../../../errors/error-codes.js";
import {
  LOGIN_PAYLOAD,
  PASSWORD,
  coordinatorScope,
  createFakeAuthFixture,
  seedCoordinatorScopes,
  seedInstitution,
  seedRoles,
  seedTenantUser,
  type FakeAuthFixture,
} from "./auth.fakes.js";

async function expectAppError(
  action: () => Promise<unknown>,
  code: string,
): Promise<AppError> {
  let caught: unknown;
  let rejected = false;
  try {
    await action();
  } catch (error) {
    caught = error;
    rejected = true;
  }
  expect(rejected, `expected ${code} to be thrown`).toBe(true);
  expect(caught).toBeInstanceOf(AppError);
  expect((caught as AppError).code).toBe(code);
  return caught as AppError;
}

function seededFixture(
  roles: RoleCode[] = [RoleCode.PROJECT_SUPERVISOR],
): FakeAuthFixture {
  const fixture = createFakeAuthFixture();
  seedInstitution(fixture);
  seedTenantUser(fixture);
  seedRoles(fixture, roles);
  return fixture;
}

function stateOf(fixture: FakeAuthFixture, sessionId: string) {
  const state = fixture.sessionStore.states.get(sessionId);
  expect(state, "runtime session state must exist").toBeDefined();
  return state as NonNullable<typeof state>;
}

describe("AuthService.login", () => {
  it("establishes a session for a valid single-role account", async () => {
    const fixture = seededFixture();

    const result = await fixture.service.login(LOGIN_PAYLOAD);

    expect(result.state.activeRole).toBe(RoleCode.PROJECT_SUPERVISOR);
    expect(result.state.inactivityTimeoutMinutes).toBe(60);
    expect(result.state.mfaVerified).toBe(false);
    expect(result.state.mfaRequired).toBe(false);
    expect(result.state.institutionCode).toBe("UNILAG");
    expect(result.state.institutionTimezone).toBe("Africa/Lagos");

    const row = fixture.sessions.rows.get(result.sessionId);
    expect(row, "session row must be persisted").toBeDefined();
    expect(row?.isRevoked).toBe(false);
    expect(row?.activeRole).toBe(RoleCode.PROJECT_SUPERVISOR);

    expect(fixture.sessionStore.states.has(result.sessionId)).toBe(true);
    expect(fixture.protection.successes).toHaveLength(1);
    expect(fixture.protection.failures).toHaveLength(0);
  });

  it("computes the absolute expiry and a bounded redis ttl", async () => {
    const fixture = seededFixture();
    const before = Date.now();

    const result = await fixture.service.login(LOGIN_PAYLOAD);

    const expiresAt = Date.parse(result.state.expiresAtUtc);
    expect(expiresAt).toBeGreaterThanOrEqual(
      before + 720 * 60_000 - 1_000,
    );
    // The ttl is capped by the inactivity window (60 minutes for students).
    expect(fixture.sessionStore.ttls.get(result.sessionId)).toBe(60 * 60);
  });

  it("requires X-Clario-Active-Role when the account holds multiple roles", async () => {
    const fixture = seededFixture([
      RoleCode.PROJECT_SUPERVISOR,
      RoleCode.PROJECT_EXAMINER,
    ]);

    const error = await expectAppError(
      () => fixture.service.login(LOGIN_PAYLOAD),
      ERROR_CODES.VALIDATION_ERROR,
    );
    expect(error.fieldErrors?.[0]?.field).toBe("X-Clario-Active-Role");
    expect(fixture.sessionStore.states.size).toBe(0);
  });

  it("binds the active role selected by X-Clario-Active-Role", async () => {
    const fixture = seededFixture([
      RoleCode.PROJECT_SUPERVISOR,
      RoleCode.PROJECT_EXAMINER,
    ]);

    const result = await fixture.service.login({
      ...LOGIN_PAYLOAD,
      activeRoleHeader: RoleCode.PROJECT_EXAMINER,
    });

    expect(result.state.activeRole).toBe(RoleCode.PROJECT_EXAMINER);
    expect(result.state.inactivityTimeoutMinutes).toBe(60);
  });

  it("rejects an active-role header for a role the account does not hold", async () => {
    const fixture = seededFixture([
      RoleCode.PROJECT_SUPERVISOR,
      RoleCode.PROJECT_EXAMINER,
    ]);

    await expectAppError(
      () =>
        fixture.service.login({
          ...LOGIN_PAYLOAD,
          activeRoleHeader: RoleCode.STUDENT,
        }),
      ERROR_CODES.OUT_OF_ASSIGNMENT_SCOPE,
    );
  });

  it("rejects a malformed active-role header", async () => {
    const fixture = seededFixture([
      RoleCode.PROJECT_SUPERVISOR,
      RoleCode.PROJECT_EXAMINER,
    ]);

    await expectAppError(
      () =>
        fixture.service.login({
          ...LOGIN_PAYLOAD,
          activeRoleHeader: "SUPERUSER",
        }),
      ERROR_CODES.VALIDATION_ERROR,
    );
  });

  it("returns the generic authentication error for an unknown identifier", async () => {
    const fixture = createFakeAuthFixture();
    seedInstitution(fixture);

    await expectAppError(
      () =>
        fixture.service.login({
          ...LOGIN_PAYLOAD,
          identifier: "ghost@unilag.edu.ng",
        }),
      ERROR_CODES.UNAUTHENTICATED,
    );

    expect(fixture.protection.failures).toHaveLength(1);
    expect(fixture.sessionStore.states.size).toBe(0);
  });

  it("returns the generic authentication error for an ambiguous identifier", async () => {
    const fixture = createFakeAuthFixture();
    seedInstitution(fixture);
    seedTenantUser(fixture, { email: "shared@unilag.edu.ng" });
    seedTenantUser(fixture, {
      id: "77777777-7777-4777-8777-777777777777",
      institutionId: "88888888-8888-4888-8888-888888888888",
      email: "shared@unilag.edu.ng",
    });

    await expectAppError(
      () =>
        fixture.service.login({
          ...LOGIN_PAYLOAD,
          institutionCode: undefined,
          identifier: "shared@unilag.edu.ng",
        }),
      ERROR_CODES.UNAUTHENTICATED,
    );
    expect(fixture.protection.failures).toHaveLength(1);
  });

  it("rejects deactivated accounts with the generic authentication error", async () => {
    const fixture = seededFixture();
    const user = fixture.users.users[0];
    expect(user).toBeDefined();
    if (user !== undefined) {
      user.accountStatus = "DEACTIVATED";
    }

    await expectAppError(
      () => fixture.service.login(LOGIN_PAYLOAD),
      ERROR_CODES.UNAUTHENTICATED,
    );
    expect(fixture.protection.failures).toHaveLength(1);
  });

  it("rejects suspended tenants with the generic error at login", async () => {
    const fixture = seededFixture();
    const institution = fixture.institutions.institutions[0];
    expect(institution).toBeDefined();
    if (institution !== undefined) {
      institution.accountStatus = "SUSPENDED";
    }

    const error = await expectAppError(
      () => fixture.service.login(LOGIN_PAYLOAD),
      ERROR_CODES.UNAUTHENTICATED,
    );
    // Anti-enumeration: the tenant status must not be revealed pre-auth.
    expect(error.code).not.toBe(ERROR_CODES.TENANT_SUSPENDED_F01);
    expect(fixture.protection.failures).toHaveLength(1);
  });

  it("rejects an unknown institution code with the generic error", async () => {
    const fixture = seededFixture();

    await expectAppError(
      () =>
        fixture.service.login({
          ...LOGIN_PAYLOAD,
          institutionCode: "NOPE",
        }),
      ERROR_CODES.UNAUTHENTICATED,
    );
    expect(fixture.protection.failures).toHaveLength(1);
    expect(fixture.sessionStore.states.size).toBe(0);
  });

  it("rejects a wrong password and records the failure", async () => {
    const fixture = seededFixture();

    await expectAppError(
      () =>
        fixture.service.login({
          ...LOGIN_PAYLOAD,
          password: "wrong-password",
        }),
      ERROR_CODES.UNAUTHENTICATED,
    );

    expect(fixture.protection.failures).toHaveLength(1);
    expect(fixture.protection.successes).toHaveLength(0);
    expect(fixture.sessionStore.states.size).toBe(0);
  });

  it("surfaces the documented lockout without recording another failure", async () => {
    const fixture = seededFixture();
    fixture.protection.locked = true;
    fixture.protection.retryAfterSeconds = 900;

    const error = await expectAppError(
      () => fixture.service.login(LOGIN_PAYLOAD),
      ERROR_CODES.ACCOUNT_TEMPORARILY_LOCKED,
    );

    expect(error.status).toBe(429);
    expect(error.message).toContain("900");
    expect(fixture.protection.failures).toHaveLength(0);
  });

  it("rejects a missing identifier", async () => {
    const fixture = seededFixture();

    await expectAppError(
      () =>
        fixture.service.login({
          ...LOGIN_PAYLOAD,
          identifier: "   ",
        }),
      ERROR_CODES.VALIDATION_ERROR,
    );
  });

  it("rejects an empty password", async () => {
    const fixture = seededFixture();

    await expectAppError(
      () => fixture.service.login({ ...LOGIN_PAYLOAD, password: "" }),
      ERROR_CODES.VALIDATION_ERROR,
    );
  });

  it("marks mandatory-MFA roles as MFA required", async () => {
    const fixture = seededFixture([RoleCode.INSTITUTIONAL_ADMIN]);

    const result = await fixture.service.login(LOGIN_PAYLOAD);

    expect(result.state.mfaRequired).toBe(true);
    expect(result.state.mfaEnrolled).toBe(false);
    expect(result.state.mfaVerified).toBe(false);
    expect(result.state.inactivityTimeoutMinutes).toBe(30);
  });

  it("establishes a platform admin session without a tenant", async () => {
    const fixture = createFakeAuthFixture();
    fixture.users.users.push({
      id: "99999999-9999-4999-8999-999999999999",
      institutionId: null,
      isPlatformAdmin: true,
      fullName: "Platform Admin",
      email: "admin@clario.app",
      institutionalIdNumber: null,
      accountStatus: "ACTIVE",
      passwordHash: `fake-argon2id$${PASSWORD}`,
      mfaRequired: true,
      mfaEnrolled: true,
    });

    const result = await fixture.service.login({
      identifier: "admin@clario.app",
      password: PASSWORD,
      ip: "198.51.100.7",
    });

    expect(result.state.activeRole).toBe(RoleCode.PLATFORM_ADMIN);
    expect(result.state.institutionId).toBeNull();
    expect(result.state.institutionCode).toBeNull();
    expect(result.state.mfaRequired).toBe(true);
    expect(result.state.mfaEnrolled).toBe(true);
    expect(result.state.assignedRoles).toEqual([RoleCode.PLATFORM_ADMIN]);
  });

  it("denies login when the account has no active role assignment", async () => {
    const fixture = seededFixture([]);
    seedRoles(fixture, []);

    await expectAppError(
      () => fixture.service.login(LOGIN_PAYLOAD),
      ERROR_CODES.OUT_OF_ASSIGNMENT_SCOPE,
    );
    expect(fixture.sessionStore.states.size).toBe(0);
  });

  it("auto-binds a single coordinator appointment", async () => {
    const fixture = seededFixture([RoleCode.PROJECT_COORDINATOR]);
    const scope = coordinatorScope();
    seedCoordinatorScopes(fixture, [scope]);

    const result = await fixture.service.login(LOGIN_PAYLOAD);

    expect(result.state.activeCoordinatorScope?.appointmentId).toBe(
      scope.appointmentId,
    );
    expect(
      fixture.sessions.rows.get(result.sessionId)
        ?.activeCoordinatorAppointmentId,
    ).toBe(scope.appointmentId);
  });

  it("requires X-Clario-Coordinator-Appointment-Id for multiple appointments", async () => {
    const fixture = seededFixture([RoleCode.PROJECT_COORDINATOR]);
    seedCoordinatorScopes(fixture, [
      coordinatorScope(),
      coordinatorScope({
        appointmentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    ]);

    const error = await expectAppError(
      () => fixture.service.login(LOGIN_PAYLOAD),
      ERROR_CODES.VALIDATION_ERROR,
    );
    expect(error.fieldErrors?.[0]?.field).toBe(
      "X-Clario-Coordinator-Appointment-Id",
    );
  });

  it("rejects a coordinator appointment the account does not hold", async () => {
    const fixture = seededFixture([RoleCode.PROJECT_COORDINATOR]);
    seedCoordinatorScopes(fixture, [
      coordinatorScope(),
      coordinatorScope({
        appointmentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    ]);

    await expectAppError(
      () =>
        fixture.service.login({
          ...LOGIN_PAYLOAD,
          coordinatorAppointmentHeader: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        }),
      ERROR_CODES.OUT_OF_ASSIGNMENT_SCOPE,
    );
  });

  it("denies a coordinator role without any active appointment", async () => {
    const fixture = seededFixture([RoleCode.PROJECT_COORDINATOR]);
    seedCoordinatorScopes(fixture, []);

    await expectAppError(
      () => fixture.service.login(LOGIN_PAYLOAD),
      ERROR_CODES.OUT_OF_ASSIGNMENT_SCOPE,
    );
  });

  it("fails with 503 when the session row cannot be persisted", async () => {
    const fixture = seededFixture();
    fixture.sessions.createShouldFail = true;

    await expectAppError(
      () => fixture.service.login(LOGIN_PAYLOAD),
      ERROR_CODES.SERVICE_UNAVAILABLE,
    );
    expect(fixture.sessionStore.states.size).toBe(0);
  });

  it("revokes the session row when runtime state cannot be stored", async () => {
    const fixture = seededFixture();
    fixture.sessionStore.setShouldFail = true;

    const error = await expectAppError(
      () => fixture.service.login(LOGIN_PAYLOAD),
      ERROR_CODES.SERVICE_UNAVAILABLE,
    );
    expect(error.status).toBe(503);

    const rows = [...fixture.sessions.rows.values()];
    expect(rows).toHaveLength(1);
    expect(rows[0]?.isRevoked).toBe(true);
    expect(rows[0]?.revokedReason).toBe(
      "SESSION_RUNTIME_PERSISTENCE_FAILED",
    );
  });
});

describe("AuthService.resolveSession", () => {
  it("rejects requests without credentials", async () => {
    const fixture = seededFixture();

    await expectAppError(
      () => fixture.service.resolveSession({ ip: "203.0.113.10" }),
      ERROR_CODES.UNAUTHENTICATED,
    );
  });

  it("rejects conflicting cookie and bearer credentials", async () => {
    const fixture = seededFixture();

    await expectAppError(
      () =>
        fixture.service.resolveSession({
          cookieSessionId: "11111111-1111-4111-8111-111111111111",
          bearerSessionId: "22222222-2222-4222-8222-222222222222",
          ip: "203.0.113.10",
        }),
      ERROR_CODES.UNAUTHENTICATED,
    );
  });

  it("rejects unknown sessions", async () => {
    const fixture = seededFixture();

    await expectAppError(
      () =>
        fixture.service.resolveSession({
          cookieSessionId: "44444444-4444-4444-8444-444444444444",
          ip: "203.0.113.10",
        }),
      ERROR_CODES.SESSION_EXPIRED_OR_REVOKED,
    );
  });

  it("returns the session context and refreshes activity", async () => {
    const fixture = seededFixture();
    const login = await fixture.service.login(LOGIN_PAYLOAD);
    const beforeTtl = fixture.sessionStore.ttls.get(login.sessionId);

    const context = await fixture.service.resolveSession({
      cookieSessionId: login.sessionId,
      ip: "203.0.113.10",
    });

    expect(context.sessionId).toBe(login.sessionId);
    expect(context.userId).toBe(login.state.userId);
    expect(context.activeRole).toBe(RoleCode.PROJECT_SUPERVISOR);
    expect(context.email).toBe("tunde.adewale@unilag.edu.ng");
    expect(context.mfaEnrolled).toBe(false);
    expect(context.expiresAtUtc).toBe(login.state.expiresAtUtc);

    const state = stateOf(fixture, login.sessionId);
    expect(Date.parse(state.lastActivityAtUtc)).toBeGreaterThanOrEqual(
      Date.parse(login.state.lastActivityAtUtc),
    );
    expect(fixture.sessionStore.ttls.get(login.sessionId)).toBe(beforeTtl);
  });

  it("fails closed when Redis and PostgreSQL disagree on the active role", async () => {
    const fixture = seededFixture();
    const login = await fixture.service.login(LOGIN_PAYLOAD);

    const row = fixture.sessions.rows.get(login.sessionId);
    expect(row).toBeDefined();
    if (row !== undefined) {
      row.activeRole = RoleCode.INSTITUTIONAL_ADMIN;
    }

    await expectAppError(
      () =>
        fixture.service.resolveSession({
          cookieSessionId: login.sessionId,
          ip: "203.0.113.10",
        }),
      ERROR_CODES.SESSION_EXPIRED_OR_REVOKED,
    );
    expect(fixture.sessionStore.states.has(login.sessionId)).toBe(false);
  });

  it("fails closed when the session row has been revoked", async () => {
    const fixture = seededFixture();
    const login = await fixture.service.login(LOGIN_PAYLOAD);
    await fixture.sessions.markRevoked(login.sessionId, "ADMIN_REVOKED");

    await expectAppError(
      () =>
        fixture.service.resolveSession({
          cookieSessionId: login.sessionId,
          ip: "203.0.113.10",
        }),
      ERROR_CODES.SESSION_EXPIRED_OR_REVOKED,
    );
    expect(fixture.sessionStore.states.has(login.sessionId)).toBe(false);
  });

  it("expires sessions that exceed the inactivity window", async () => {
    const fixture = seededFixture();
    const login = await fixture.service.login(LOGIN_PAYLOAD);
    const stale = new Date(Date.now() - 61 * 60_000).toISOString();

    const state = stateOf(fixture, login.sessionId);
    fixture.sessionStore.states.set(login.sessionId, {
      ...state,
      lastActivityAtUtc: stale,
    });

    await expectAppError(
      () =>
        fixture.service.resolveSession({
          cookieSessionId: login.sessionId,
          ip: "203.0.113.10",
        }),
      ERROR_CODES.SESSION_EXPIRED_OR_REVOKED,
    );

    const row = fixture.sessions.rows.get(login.sessionId);
    expect(row?.isRevoked).toBe(true);
    expect(row?.revokedReason).toBe("SESSION_INACTIVITY_TIMEOUT");
    expect(fixture.sessionStore.states.has(login.sessionId)).toBe(false);
  });

  it("expires sessions past their absolute lifetime", async () => {
    const fixture = seededFixture();
    const login = await fixture.service.login(LOGIN_PAYLOAD);

    const state = stateOf(fixture, login.sessionId);
    fixture.sessionStore.states.set(login.sessionId, {
      ...state,
      expiresAtUtc: new Date(Date.now() - 1_000).toISOString(),
    });

    await expectAppError(
      () =>
        fixture.service.resolveSession({
          cookieSessionId: login.sessionId,
          ip: "203.0.113.10",
        }),
      ERROR_CODES.SESSION_EXPIRED_OR_REVOKED,
    );

    const row = fixture.sessions.rows.get(login.sessionId);
    expect(row?.revokedReason).toBe("SESSION_EXPIRED");
  });

  it("rejects deactivated users and revokes their sessions", async () => {
    const fixture = seededFixture();
    const login = await fixture.service.login(LOGIN_PAYLOAD);

    const user = fixture.users.users[0];
    expect(user).toBeDefined();
    if (user !== undefined) {
      user.accountStatus = "DEACTIVATED";
    }

    await expectAppError(
      () =>
        fixture.service.resolveSession({
          cookieSessionId: login.sessionId,
          ip: "203.0.113.10",
        }),
      ERROR_CODES.UNAUTHENTICATED,
    );

    const row = fixture.sessions.rows.get(login.sessionId);
    expect(row?.revokedReason).toBe("ACCOUNT_INELIGIBLE");
    expect(fixture.sessionStore.states.has(login.sessionId)).toBe(false);
  });

  it("rejects suspended tenants with TENANT_SUSPENDED_F01", async () => {
    const fixture = seededFixture();
    const login = await fixture.service.login(LOGIN_PAYLOAD);

    const institution = fixture.institutions.institutions[0];
    expect(institution).toBeDefined();
    if (institution !== undefined) {
      institution.accountStatus = "SUSPENDED";
    }

    const error = await expectAppError(
      () =>
        fixture.service.resolveSession({
          cookieSessionId: login.sessionId,
          ip: "203.0.113.10",
        }),
      ERROR_CODES.TENANT_SUSPENDED_F01,
    );
    expect(error.status).toBe(403);
    expect(fixture.sessionStore.states.has(login.sessionId)).toBe(false);
  });
});

describe("AuthService.logout", () => {
  it("revokes the session row and clears runtime state", async () => {
    const fixture = seededFixture();
    const login = await fixture.service.login(LOGIN_PAYLOAD);

    await fixture.service.logout(login.sessionId);

    const row = fixture.sessions.rows.get(login.sessionId);
    expect(row?.isRevoked).toBe(true);
    expect(row?.revokedReason).toBe("LOGOUT");
    expect(fixture.sessionStore.states.has(login.sessionId)).toBe(false);
  });
});

describe("AuthService.heartbeat", () => {
  it("extends the inactivity window without moving the absolute expiry", async () => {
    const fixture = seededFixture();
    const login = await fixture.service.login(LOGIN_PAYLOAD);

    const state = stateOf(fixture, login.sessionId);
    fixture.sessionStore.states.set(login.sessionId, {
      ...state,
      lastActivityAtUtc: new Date(Date.now() - 10 * 60_000).toISOString(),
    });

    const result = await fixture.service.heartbeat(login.sessionId);

    expect(result.sessionId).toBe(login.sessionId);
    expect(result.expiresAtUtc).toBe(login.state.expiresAtUtc);
    expect(result.inactivityTimeoutMinutes).toBe(60);

    const refreshed = stateOf(fixture, login.sessionId);
    expect(Date.parse(refreshed.lastActivityAtUtc)).toBeGreaterThan(
      Date.now() - 5_000,
    );
    expect(fixture.sessionStore.ttls.get(login.sessionId)).toBe(60 * 60);
  });

  it("rejects heartbeats for unknown sessions", async () => {
    const fixture = seededFixture();

    await expectAppError(
      () =>
        fixture.service.heartbeat("44444444-4444-4444-8444-444444444444"),
      ERROR_CODES.SESSION_EXPIRED_OR_REVOKED,
    );
  });
});
