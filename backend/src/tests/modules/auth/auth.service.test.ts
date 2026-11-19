import { RoleCode } from "@clario/shared-contracts";
import { describe, expect, it } from "vitest";

import { AppError } from "../../../errors/app-error.js";
import { ERROR_CODES } from "../../../errors/error-codes.js";
import {
  generateTotpCode,
  hashRecoveryCode,
} from "../../../modules/auth/auth.totp.js";
import {
  LOGIN_PAYLOAD,
  PASSWORD,
  USER_ID,
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

  it("records the last authenticated timestamp of the account", async () => {
    const fixture = seededFixture();

    const result = await fixture.service.login(LOGIN_PAYLOAD);

    const lastLoginAt = fixture.users.lastLoginAt.get(USER_ID);
    expect(lastLoginAt).toBeInstanceOf(Date);
    expect(lastLoginAt?.getTime()).toBeLessThanOrEqual(Date.now());
    expect(result.state.createdAtUtc).toBe(
      (lastLoginAt as Date).toISOString(),
    );
  });

  it("keeps the login successful when the last authenticated timestamp cannot be written", async () => {
    const fixture = seededFixture();
    fixture.users.recordLoginShouldFail = true;

    const result = await fixture.service.login(LOGIN_PAYLOAD);

    // A bookkeeping failure must never invalidate an established session.
    expect(result.state.activeRole).toBe(RoleCode.PROJECT_SUPERVISOR);
    expect(fixture.sessions.rows.get(result.sessionId)?.isRevoked).toBe(false);
    expect(fixture.sessionStore.states.has(result.sessionId)).toBe(true);
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

  it("rejects invited accounts with the generic authentication error", async () => {
    const fixture = seededFixture();
    const user = fixture.users.users[0];
    expect(user).toBeDefined();
    if (user !== undefined) {
      user.accountStatus = "INVITED";
      // An invited account has not chosen a password yet.
      user.passwordHash = null;
    }

    const error = await expectAppError(
      () => fixture.service.login(LOGIN_PAYLOAD),
      ERROR_CODES.UNAUTHENTICATED,
    );

    // Anti-enumeration: an invited account is indistinguishable from an
    // unknown one.
    expect(error.message).toBe(
      "Authentication failed. Provide a valid identifier and password.",
    );
    expect(fixture.sessionStore.states.size).toBe(0);
    expect(fixture.sessions.rows.size).toBe(0);
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

  it("refuses to establish a session when the credential changed under the login", async () => {
    // A password reset that lands while the login is in flight revokes
    // every session of the account. The session row is fenced on the
    // password hash that was verified, so the login must not establish a
    // session with the old credential.
    const fixture = seededFixture();
    fixture.sessions.credentialHashOf = () => "a-different-password-hash";

    await expectAppError(
      () => fixture.service.login(LOGIN_PAYLOAD),
      ERROR_CODES.UNAUTHENTICATED,
    );

    expect(fixture.sessions.rows.size).toBe(0);
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

  it("fails with 503 when neither revocation write lands", async () => {
    const fixture = seededFixture();
    const login = await fixture.service.login(LOGIN_PAYLOAD);
    fixture.sessions.markRevokedShouldFail = true;
    fixture.sessionStore.deleteShouldFail = true;

    const error = await expectAppError(
      () => fixture.service.logout(login.sessionId),
      ERROR_CODES.SERVICE_UNAVAILABLE,
    );
    expect(error.status).toBe(503);

    // Nothing was written, so the caller must not be told the logout worked.
    expect(fixture.sessions.rows.get(login.sessionId)?.isRevoked).toBe(false);
    expect(fixture.sessionStore.states.has(login.sessionId)).toBe(true);
  });

  it("succeeds when only one of the two revocation writes lands", async () => {
    const fixture = seededFixture();
    const login = await fixture.service.login(LOGIN_PAYLOAD);
    fixture.sessions.markRevokedShouldFail = true;

    await fixture.service.logout(login.sessionId);

    // One write landed: the Redis/PostgreSQL cross-check fails closed on the
    // next request, so a 2xx here is safe.
    expect(fixture.sessions.rows.get(login.sessionId)?.isRevoked).toBe(false);
    expect(fixture.sessionStore.states.has(login.sessionId)).toBe(false);
  });
});

describe("AuthService constant-work login paths", () => {
  it("runs a single KDF on the wrong-password path", async () => {
    const fixture = seededFixture();

    await expectAppError(
      () => fixture.service.login({ ...LOGIN_PAYLOAD, password: "wrong" }),
      ERROR_CODES.UNAUTHENTICATED,
    );

    // One real verification; no second dummy burn (timing must match the
    // unknown-identifier path).
    expect(fixture.hasher.verifyCalls).toBe(1);
    expect(fixture.hasher.dummyCalls).toBe(0);
  });

  it("burns exactly one dummy KDF for an unknown identifier", async () => {
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

    expect(fixture.hasher.verifyCalls).toBe(0);
    expect(fixture.hasher.dummyCalls).toBe(1);
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

describe("AuthService verification slots", () => {
  it("rejects login before the KDF when the verification cap is reached", async () => {
    const fixture = seededFixture();
    fixture.protection.maxConcurrentVerifications = 0;

    const error = await expectAppError(
      () => fixture.service.login(LOGIN_PAYLOAD),
      ERROR_CODES.ACCOUNT_TEMPORARILY_LOCKED,
    );

    expect(error.status).toBe(429);
    expect(error.message).toContain("in progress");
    // Rejected before any account lookup: no failure recorded, no session.
    expect(fixture.protection.failures).toHaveLength(0);
    expect(fixture.protection.successes).toHaveLength(0);
    expect(fixture.sessionStore.states.size).toBe(0);
  });

  it("fails closed with 503 when the slot cannot be acquired", async () => {
    const fixture = seededFixture();
    fixture.protection.acquireShouldFail = true;

    const error = await expectAppError(
      () => fixture.service.login(LOGIN_PAYLOAD),
      ERROR_CODES.SERVICE_UNAVAILABLE,
    );
    expect(error.status).toBe(503);
    expect(fixture.protection.failures).toHaveLength(0);
  });

  it("releases the slot after a successful login", async () => {
    const fixture = seededFixture();

    await fixture.service.login(LOGIN_PAYLOAD);

    expect(fixture.protection.acquireCalls).toBe(1);
    expect(fixture.protection.releaseCalls).toBe(1);
  });

  it("releases the slot after a rejected password", async () => {
    const fixture = seededFixture();

    await expectAppError(
      () => fixture.service.login({ ...LOGIN_PAYLOAD, password: "wrong" }),
      ERROR_CODES.UNAUTHENTICATED,
    );

    expect(fixture.protection.acquireCalls).toBe(1);
    expect(fixture.protection.releaseCalls).toBe(1);
  });

  it("releases the slot when a post-acquire validation fails", async () => {
    const fixture = seededFixture([
      RoleCode.PROJECT_SUPERVISOR,
      RoleCode.PROJECT_EXAMINER,
    ]);

    await expectAppError(
      () => fixture.service.login(LOGIN_PAYLOAD),
      ERROR_CODES.VALIDATION_ERROR,
    );

    expect(fixture.protection.acquireCalls).toBe(1);
    expect(fixture.protection.releaseCalls).toBe(1);
  });
});

describe("AuthService.resolveSession role/scope revalidation", () => {
  it("revokes the session when the active role assignment is removed", async () => {
    const fixture = seededFixture();
    const login = await fixture.service.login(LOGIN_PAYLOAD);
    const rowBefore = fixture.sessions.rows.get(login.sessionId);
    expect(rowBefore).toBeDefined();
    const lastActivityBefore = rowBefore?.lastActivityAt;

    seedRoles(fixture, []);

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
    expect(row?.revokedReason).toBe("ROLE_REVOKED");
    // Activity must not be refreshed for a session revoked mid-request.
    expect(row?.lastActivityAt).toEqual(lastActivityBefore);
    expect(fixture.sessionStore.states.has(login.sessionId)).toBe(false);
  });

  it("revokes the session when any previously held role is revoked", async () => {
    const fixture = seededFixture([
      RoleCode.PROJECT_SUPERVISOR,
      RoleCode.PROJECT_EXAMINER,
    ]);
    const login = await fixture.service.login({
      ...LOGIN_PAYLOAD,
      activeRoleHeader: RoleCode.PROJECT_EXAMINER,
    });

    // The *other* role (not the active one) is revoked: FR-227 still applies.
    seedRoles(fixture, [RoleCode.PROJECT_EXAMINER]);

    await expectAppError(
      () =>
        fixture.service.resolveSession({
          cookieSessionId: login.sessionId,
          ip: "203.0.113.10",
        }),
      ERROR_CODES.SESSION_EXPIRED_OR_REVOKED,
    );
    expect(
      fixture.sessions.rows.get(login.sessionId)?.revokedReason,
    ).toBe("ROLE_REVOKED");
  });

  it("keeps the session when a role is granted after login", async () => {
    const fixture = seededFixture();
    const login = await fixture.service.login(LOGIN_PAYLOAD);

    seedRoles(fixture, [RoleCode.PROJECT_SUPERVISOR, RoleCode.PROJECT_EXAMINER]);

    const context = await fixture.service.resolveSession({
      cookieSessionId: login.sessionId,
      ip: "203.0.113.10",
    });

    expect(context.activeRole).toBe(RoleCode.PROJECT_SUPERVISOR);
    expect(fixture.sessions.rows.get(login.sessionId)?.isRevoked).toBe(false);
  });

  it("revokes a coordinator session when an appointment is revoked", async () => {
    const fixture = seededFixture([RoleCode.PROJECT_COORDINATOR]);
    const selected = coordinatorScope();
    const other = coordinatorScope({
      appointmentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    seedCoordinatorScopes(fixture, [selected, other]);
    const login = await fixture.service.login({
      ...LOGIN_PAYLOAD,
      coordinatorAppointmentHeader: selected.appointmentId,
    });

    // Only the non-selected appointment remains active.
    seedCoordinatorScopes(fixture, [other]);

    await expectAppError(
      () =>
        fixture.service.resolveSession({
          cookieSessionId: login.sessionId,
          ip: "203.0.113.10",
        }),
      ERROR_CODES.SESSION_EXPIRED_OR_REVOKED,
    );
    expect(
      fixture.sessions.rows.get(login.sessionId)?.revokedReason,
    ).toBe("SCOPE_REVOKED");
  });

  it("keeps a coordinator session when an appointment is added", async () => {
    const fixture = seededFixture([RoleCode.PROJECT_COORDINATOR]);
    const scope = coordinatorScope();
    seedCoordinatorScopes(fixture, [scope]);
    const login = await fixture.service.login(LOGIN_PAYLOAD);

    seedCoordinatorScopes(fixture, [
      scope,
      coordinatorScope({
        appointmentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    ]);

    const context = await fixture.service.resolveSession({
      cookieSessionId: login.sessionId,
      ip: "203.0.113.10",
    });
    expect(context.activeRole).toBe(RoleCode.PROJECT_COORDINATOR);
    expect(
      fixture.sessions.rows.get(login.sessionId)?.isRevoked,
    ).toBe(false);
  });

  it("skips role revalidation for platform admins", async () => {
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
    const login = await fixture.service.login({
      identifier: "admin@clario.app",
      password: PASSWORD,
      ip: "198.51.100.7",
    });

    // No role rows exist for platform admins; the session must still resolve.
    fixture.roles.findActiveRolesShouldFail = true;
    const context = await fixture.service.resolveSession({
      cookieSessionId: login.sessionId,
      ip: "198.51.100.7",
    });
    expect(context.activeRole).toBe(RoleCode.PLATFORM_ADMIN);
  });

  it("fails with 503 without revoking when revalidation cannot run", async () => {
    const fixture = seededFixture();
    const login = await fixture.service.login(LOGIN_PAYLOAD);
    fixture.roles.findActiveRolesShouldFail = true;

    const error = await expectAppError(
      () =>
        fixture.service.resolveSession({
          cookieSessionId: login.sessionId,
          ip: "203.0.113.10",
        }),
      ERROR_CODES.SERVICE_UNAVAILABLE,
    );
    expect(error.status).toBe(503);

    const row = fixture.sessions.rows.get(login.sessionId);
    expect(row?.isRevoked).toBe(false);
    expect(fixture.sessionStore.states.has(login.sessionId)).toBe(true);
  });
});

describe("AuthService.assertMfaSatisfied", () => {
  function expectThrownCode(action: () => unknown, code: string): AppError {
    let caught: unknown;
    let thrown = false;
    try {
      action();
    } catch (error) {
      caught = error;
      thrown = true;
    }
    expect(thrown, `expected ${code} to be thrown`).toBe(true);
    expect(caught).toBeInstanceOf(AppError);
    expect((caught as AppError).code).toBe(code);
    return caught as AppError;
  }

  async function contextFor(
    fixture: FakeAuthFixture,
    roles: RoleCode[],
  ) {
    seedRoles(fixture, roles);
    const login = await fixture.service.login(LOGIN_PAYLOAD);
    return fixture.service.resolveSession({
      cookieSessionId: login.sessionId,
      ip: "203.0.113.10",
    });
  }

  it("blocks full access for an institutional admin until MFA is verified", async () => {
    const fixture = seededFixture();
    const context = await contextFor(fixture, [RoleCode.INSTITUTIONAL_ADMIN]);

    expect(context.mfaRequired).toBe(true);
    expect(context.mfaVerified).toBe(false);

    const error = expectThrownCode(
      () => fixture.service.assertMfaSatisfied(context),
      ERROR_CODES.MFA_CHALLENGE_REQUIRED,
    );
    expect(error.status).toBe(403);
  });

  it("blocks full access for a project coordinator until MFA is verified", async () => {
    const fixture = seededFixture();
    seedCoordinatorScopes(fixture, [coordinatorScope()]);
    const context = await contextFor(fixture, [RoleCode.PROJECT_COORDINATOR]);

    expect(context.mfaRequired).toBe(true);
    expectThrownCode(
      () => fixture.service.assertMfaSatisfied(context),
      ERROR_CODES.MFA_CHALLENGE_REQUIRED,
    );
  });

  it("blocks full access for a platform admin until MFA is verified", async () => {
    const fixture = createFakeAuthFixture();
    fixture.users.users.push({
      id: "99999999-9999-4999-8999-999999999999",
      institutionId: null,
      isPlatformAdmin: true,
      fullName: "Root Admin",
      email: "root@clario.ng",
      institutionalIdNumber: null,
      accountStatus: "ACTIVE",
      passwordHash: "fake-argon2id$Correct-Horse-Battery-Staple-99!",
      mfaRequired: true,
      mfaEnrolled: false,
    });

    const login = await fixture.service.login({
      identifier: "root@clario.ng",
      password: PASSWORD,
      ip: "203.0.113.10",
    });
    const context = await fixture.service.resolveSession({
      cookieSessionId: login.sessionId,
      ip: "203.0.113.10",
    });

    expect(context.mfaRequired).toBe(true);
    expectThrownCode(
      () => fixture.service.assertMfaSatisfied(context),
      ERROR_CODES.MFA_CHALLENGE_REQUIRED,
    );
  });

  it("allows full access once the MFA challenge is completed", async () => {
    const fixture = seededFixture();
    const context = await contextFor(fixture, [RoleCode.INSTITUTIONAL_ADMIN]);

    expect(() =>
      fixture.service.assertMfaSatisfied({
        ...context,
        mfaVerified: true,
      }),
    ).not.toThrow();
  });

  it("does not demand MFA for a role that does not require it", async () => {
    const fixture = seededFixture();
    const context = await contextFor(fixture, [RoleCode.PROJECT_SUPERVISOR]);

    expect(context.mfaRequired).toBe(false);
    expect(() => fixture.service.assertMfaSatisfied(context)).not.toThrow();
  });

  it("demands MFA for an account flagged mfa_required even without a mandatory role", async () => {
    const fixture = seededFixture();
    const user = fixture.users.users[0];
    expect(user).toBeDefined();
    if (user !== undefined) {
      user.mfaRequired = true;
    }

    const context = await contextFor(fixture, [RoleCode.PROJECT_SUPERVISOR]);

    expect(context.mfaRequired).toBe(true);
    expectThrownCode(
      () => fixture.service.assertMfaSatisfied(context),
      ERROR_CODES.MFA_CHALLENGE_REQUIRED,
    );
  });
});

// ===========================================================================
// F-65: MFA enrollment, challenge, and session context switching
// (FR-224, SEC-06, FR-047, BR-03)
// ===========================================================================

/** The IP every F-65 challenge in these tests is attempted from. */
const CHALLENGE_IP = LOGIN_PAYLOAD.ip;

/**
 * A live, unchallenged session that has just been enrolled: the state every
 * MFA-challenge test starts from.
 */
async function enrolledSession(fixture: FakeAuthFixture) {
  const login = await fixture.service.login(LOGIN_PAYLOAD);
  const enrollment = await fixture.service.enrollMfa(login.sessionId);
  return { login, enrollment };
}

/** A 6-digit code that is guaranteed not to be the current one. */
function staleTotpCode(secret: string): string {
  const nowSeconds = Math.floor(Date.now() / 1_000);
  const current = generateTotpCode(secret, nowSeconds);
  for (const offsetSeconds of [3_600, 7_200, 86_400, 604_800]) {
    const candidate = generateTotpCode(secret, nowSeconds - offsetSeconds);
    if (candidate !== current) {
      return candidate;
    }
  }
  throw new Error("could not derive a stale TOTP code");
}

function rowOf(fixture: FakeAuthFixture, sessionId: string) {
  const row = fixture.sessions.rows.get(sessionId);
  expect(row, "session row must exist").toBeDefined();
  return row as NonNullable<typeof row>;
}

describe("AuthService.enrollMfa", () => {
  it("binds a seed and ten recovery codes, returning them exactly once", async () => {
    const fixture = seededFixture();
    const { login, enrollment } = await enrolledSession(fixture);

    expect(enrollment.secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(enrollment.provisioningUri.startsWith("otpauth://totp/")).toBe(true);
    expect(enrollment.provisioningUri).toContain(`secret=${enrollment.secret}`);
    expect(enrollment.recoveryCodes).toHaveLength(10);
    expect(new Set(enrollment.recoveryCodes).size).toBe(10);
    for (const code of enrollment.recoveryCodes) {
      expect(code).toMatch(/^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/);
    }

    // The digests — never the codes — are what storage keeps.
    expect(fixture.mfa.digestsOf(USER_ID)).toHaveLength(10);
    expect(fixture.mfa.digestsOf(USER_ID)).toContain(
      hashRecoveryCode(enrollment.recoveryCodes[0] as string),
    );

    // Enrollment flips the session's convenience copy only: the challenge
    // itself has not been answered yet.
    expect(stateOf(fixture, login.sessionId).mfaEnrolled).toBe(true);
    expect(stateOf(fixture, login.sessionId).mfaVerified).toBe(false);
    expect(rowOf(fixture, login.sessionId).mfaVerified).toBe(false);
  });

  it("issues a fresh pair when enrollment repeats before verification", async () => {
    const fixture = seededFixture();
    const login = await fixture.service.login(LOGIN_PAYLOAD);
    const first = await fixture.service.enrollMfa(login.sessionId);
    const second = await fixture.service.enrollMfa(login.sessionId);

    expect(second.secret).not.toBe(first.secret);
    expect(second.recoveryCodes).not.toEqual(first.recoveryCodes);
    // The first pair is voided, not accumulated.
    expect(fixture.mfa.digestsOf(USER_ID)).toHaveLength(10);
  });

  it("refuses to re-bind the authenticator after the challenge is answered", async () => {
    const fixture = seededFixture();
    const { login, enrollment } = await enrolledSession(fixture);
    await fixture.service.verifyMfa({
      sessionId: login.sessionId,
      code: generateTotpCode(enrollment.secret),
      ip: CHALLENGE_IP,
    });

    await expectAppError(
      () => fixture.service.enrollMfa(login.sessionId),
      ERROR_CODES.VALIDATION_ERROR,
    );
  });

  it("reports a vanished or deactivated account as UNAUTHENTICATED", async () => {
    const fixture = seededFixture();
    const login = await fixture.service.login(LOGIN_PAYLOAD);
    fixture.mfa.enrollReturnsFalse = true;

    await expectAppError(
      () => fixture.service.enrollMfa(login.sessionId),
      ERROR_CODES.UNAUTHENTICATED,
    );
  });

  it("fails closed with SERVICE_UNAVAILABLE when the write fails", async () => {
    const fixture = seededFixture();
    const login = await fixture.service.login(LOGIN_PAYLOAD);
    fixture.mfa.enrollShouldFail = true;

    await expectAppError(
      () => fixture.service.enrollMfa(login.sessionId),
      ERROR_CODES.SERVICE_UNAVAILABLE,
    );
    expect(fixture.mfa.digestsOf(USER_ID)).toBeNull();
  });

  it("fails closed when the session's runtime copy cannot be written", async () => {
    const fixture = seededFixture();
    const login = await fixture.service.login(LOGIN_PAYLOAD);
    fixture.sessionStore.setShouldFail = true;

    await expectAppError(
      () => fixture.service.enrollMfa(login.sessionId),
      ERROR_CODES.SERVICE_UNAVAILABLE,
    );
    expect(stateOf(fixture, login.sessionId).mfaEnrolled).toBe(false);
  });

  it("rejects an unknown session", async () => {
    const fixture = seededFixture();

    await expectAppError(
      () =>
        fixture.service.enrollMfa(
          "00000000-0000-4000-8000-000000000000"
        ),
      ERROR_CODES.SESSION_EXPIRED_OR_REVOKED,
    );
  });
});

describe("AuthService.verifyMfa", () => {
  it("accepts a current TOTP code and verifies the session in both copies", async () => {
    const fixture = seededFixture();
    const { login, enrollment } = await enrolledSession(fixture);

    const result = await fixture.service.verifyMfa({
      sessionId: login.sessionId,
      code: generateTotpCode(enrollment.secret),
      ip: CHALLENGE_IP,
    });

    expect(result.sessionId).toBe(login.sessionId);
    expect(result.recoveryCodesRemaining).toBe(10);
    expect(result.expiresAtUtc).toBe(rowOf(fixture, login.sessionId).expiresAt.toISOString());
    expect(result.inactivityTimeoutMinutes).toBe(
      rowOf(fixture, login.sessionId).inactivityTimeoutMinutes,
    );
    expect(stateOf(fixture, login.sessionId).mfaVerified).toBe(true);
    expect(rowOf(fixture, login.sessionId).mfaVerified).toBe(true);
    expect(fixture.protection.successes).toContainEqual({
      ip: CHALLENGE_IP,
      identifier: USER_ID,
    });
  });

  it("rejects a stale code with a 400 field error and records the failure", async () => {
    const fixture = seededFixture();
    const { login, enrollment } = await enrolledSession(fixture);

    const error = await expectAppError(
      () =>
        fixture.service.verifyMfa({
          sessionId: login.sessionId,
          code: staleTotpCode(enrollment.secret),
          ip: CHALLENGE_IP,
        }),
      ERROR_CODES.VALIDATION_ERROR,
    );

    expect(error.status).toBe(400);
    expect(
      error.fieldErrors?.some((fieldError) => fieldError.field === "totpCode"),
    ).toBe(true);
    expect(fixture.protection.failures).toContainEqual({
      ip: CHALLENGE_IP,
      identifier: USER_ID,
    });
    expect(stateOf(fixture, login.sessionId).mfaVerified).toBe(false);
    expect(rowOf(fixture, login.sessionId).mfaVerified).toBe(false);
  });

  it("accepts a recovery code, spends it, and reports the remainder", async () => {
    const fixture = seededFixture();
    const { login, enrollment } = await enrolledSession(fixture);
    const spentCode = enrollment.recoveryCodes[0] as string;

    const result = await fixture.service.verifyMfa({
      sessionId: login.sessionId,
      code: spentCode,
      ip: CHALLENGE_IP,
    });

    expect(result.recoveryCodesRemaining).toBe(9);
    const digests = fixture.mfa.digestsOf(USER_ID) ?? [];
    expect(digests).toHaveLength(9);
    expect(digests).not.toContain(hashRecoveryCode(spentCode));
    expect(stateOf(fixture, login.sessionId).mfaVerified).toBe(true);
    expect(rowOf(fixture, login.sessionId).mfaVerified).toBe(true);
  });

  it("rejects a well-formed code that was never issued", async () => {
    const fixture = seededFixture();
    const { login } = await enrolledSession(fixture);

    await expectAppError(
      () =>
        fixture.service.verifyMfa({
          sessionId: login.sessionId,
          code: "DEAD-BEEF-0000-1111",
          ip: CHALLENGE_IP,
        }),
      ERROR_CODES.VALIDATION_ERROR,
    );
    expect(fixture.mfa.digestsOf(USER_ID)).toHaveLength(10);
    expect(rowOf(fixture, login.sessionId).mfaVerified).toBe(false);
  });

  it("cannot spend the same recovery code twice", async () => {
    const fixture = seededFixture();
    const { login, enrollment } = await enrolledSession(fixture);
    const spentCode = enrollment.recoveryCodes[0] as string;

    await fixture.service.verifyMfa({
      sessionId: login.sessionId,
      code: spentCode,
      ip: CHALLENGE_IP,
    });

    await expectAppError(
      () =>
        fixture.service.verifyMfa({
          sessionId: login.sessionId,
          code: spentCode,
          ip: CHALLENGE_IP,
        }),
      ERROR_CODES.VALIDATION_ERROR,
    );
    expect(fixture.mfa.digestsOf(USER_ID)).toHaveLength(9);
  });

  it("requires enrollment before the challenge can be verified", async () => {
    const fixture = seededFixture();
    const login = await fixture.service.login(LOGIN_PAYLOAD);

    await expectAppError(
      () =>
        fixture.service.verifyMfa({
          sessionId: login.sessionId,
          code: "048291",
          ip: CHALLENGE_IP,
        }),
      ERROR_CODES.MFA_ENROLLMENT_REQUIRED,
    );
  });

  it("fails closed when the stored seed cannot be read", async () => {
    const fixture = seededFixture();
    const { login, enrollment } = await enrolledSession(fixture);
    fixture.mfa.corruptSecretFor.add(USER_ID);

    await expectAppError(
      () =>
        fixture.service.verifyMfa({
          sessionId: login.sessionId,
          code: generateTotpCode(enrollment.secret),
          ip: CHALLENGE_IP,
        }),
      ERROR_CODES.SERVICE_UNAVAILABLE,
    );
    // Nothing was consumed and no failure was charged to the user.
    expect(fixture.mfa.digestsOf(USER_ID)).toHaveLength(10);
    expect(fixture.protection.failures).toHaveLength(0);
    expect(rowOf(fixture, login.sessionId).mfaVerified).toBe(false);
  });

  it("fails closed when the enrollment cannot be read at all", async () => {
    const fixture = seededFixture();
    const { login } = await enrolledSession(fixture);
    fixture.mfa.findShouldFail = true;

    await expectAppError(
      () =>
        fixture.service.verifyMfa({
          sessionId: login.sessionId,
          code: "048291",
          ip: CHALLENGE_IP,
        }),
      ERROR_CODES.SERVICE_UNAVAILABLE,
    );
  });

  it("is refused while the account is locked out", async () => {
    const fixture = seededFixture();
    const { login, enrollment } = await enrolledSession(fixture);
    fixture.protection.locked = true;

    await expectAppError(
      () =>
        fixture.service.verifyMfa({
          sessionId: login.sessionId,
          code: generateTotpCode(enrollment.secret),
          ip: CHALLENGE_IP,
        }),
      ERROR_CODES.ACCOUNT_TEMPORARILY_LOCKED,
    );
    expect(rowOf(fixture, login.sessionId).mfaVerified).toBe(false);
  });

  it("never verifies the session when the remaining-count read fails", async () => {
    const fixture = seededFixture();
    const { login, enrollment } = await enrolledSession(fixture);
    fixture.mfa.countShouldFail = true;

    await expectAppError(
      () =>
        fixture.service.verifyMfa({
          sessionId: login.sessionId,
          code: generateTotpCode(enrollment.secret),
          ip: CHALLENGE_IP,
        }),
      ERROR_CODES.SERVICE_UNAVAILABLE,
    );
    expect(stateOf(fixture, login.sessionId).mfaVerified).toBe(false);
    expect(rowOf(fixture, login.sessionId).mfaVerified).toBe(false);
  });

  it("fails closed when the session row cannot be written", async () => {
    const fixture = seededFixture();
    const { login, enrollment } = await enrolledSession(fixture);
    fixture.sessions.updateContextShouldFail = true;

    await expectAppError(
      () =>
        fixture.service.verifyMfa({
          sessionId: login.sessionId,
          code: generateTotpCode(enrollment.secret),
          ip: CHALLENGE_IP,
        }),
      ERROR_CODES.SERVICE_UNAVAILABLE,
    );
    expect(stateOf(fixture, login.sessionId).mfaVerified).toBe(false);
  });

  it("rolls the session row back when the runtime copy cannot be written", async () => {
    const fixture = seededFixture();
    const { login, enrollment } = await enrolledSession(fixture);
    fixture.sessionStore.setShouldFail = true;

    await expectAppError(
      () =>
        fixture.service.verifyMfa({
          sessionId: login.sessionId,
          code: generateTotpCode(enrollment.secret),
          ip: CHALLENGE_IP,
        }),
      ERROR_CODES.SERVICE_UNAVAILABLE,
    );
    // The row was upgraded first and must now match the untouched Redis
    // copy again, or the next request would fail the cross-check.
    expect(rowOf(fixture, login.sessionId).mfaVerified).toBe(false);
    expect(stateOf(fixture, login.sessionId).mfaVerified).toBe(false);
  });

  it("rejects an unknown session", async () => {
    const fixture = seededFixture();

    await expectAppError(
      () =>
        fixture.service.verifyMfa({
          sessionId: "00000000-0000-4000-8000-000000000000",
          code: "048291",
          ip: CHALLENGE_IP,
        }),
      ERROR_CODES.SESSION_EXPIRED_OR_REVOKED,
    );
  });
});

describe("AuthService.updateSessionContext", () => {
  const FIRST_APPOINTMENT = "33333333-3333-4333-8333-333333333333";
  const SECOND_APPOINTMENT = "99999999-9999-4999-8999-999999999999";

  /** A supervisor/coordinator account logged in under the supervisor role. */
  async function supervisorSession() {
    const fixture = seededFixture([
      RoleCode.PROJECT_SUPERVISOR,
      RoleCode.PROJECT_COORDINATOR,
      RoleCode.STUDENT,
    ]);
    seedCoordinatorScopes(fixture, [
      coordinatorScope({ appointmentId: FIRST_APPOINTMENT }),
      coordinatorScope({ appointmentId: SECOND_APPOINTMENT }),
    ]);
    const login = await fixture.service.login({
      ...LOGIN_PAYLOAD,
      activeRoleHeader: RoleCode.PROJECT_SUPERVISOR,
    });
    return { fixture, login };
  }

  it("switches the active role and both copies of the session", async () => {
    const { fixture, login } = await supervisorSession();

    const result = await fixture.service.updateSessionContext({
      sessionId: login.sessionId,
      targetRole: RoleCode.STUDENT,
    });

    expect(result.activeRole).toBe(RoleCode.STUDENT);
    expect(result.activeCoordinatorScope).toBeNull();
    expect(stateOf(fixture, login.sessionId).activeRole).toBe(RoleCode.STUDENT);
    expect(rowOf(fixture, login.sessionId).activeRole).toBe(RoleCode.STUDENT);
    // The idle window follows the *target* role (F-64 §7).
    expect(result.inactivityTimeoutMinutes).toBe(
      fixture.config.inactivityTimeoutMinutesByRole[RoleCode.STUDENT],
    );
    expect(result.inactivityTimeoutMinutes).toBe(
      stateOf(fixture, login.sessionId).inactivityTimeoutMinutes,
    );
    expect(result.inactivityTimeoutMinutes).toBe(
      rowOf(fixture, login.sessionId).inactivityTimeoutMinutes,
    );
  });

  it("binds the coordinator role to one appointment and persists the scopes", async () => {
    const { fixture, login } = await supervisorSession();

    const result = await fixture.service.updateSessionContext({
      sessionId: login.sessionId,
      targetRole: RoleCode.PROJECT_COORDINATOR,
      coordinatorAppointmentId: SECOND_APPOINTMENT,
    });

    expect(result.activeRole).toBe(RoleCode.PROJECT_COORDINATOR);
    expect(result.activeCoordinatorScope?.appointmentId).toBe(
      SECOND_APPOINTMENT,
    );
    expect(rowOf(fixture, login.sessionId).activeCoordinatorAppointmentId).toBe(
      SECOND_APPOINTMENT,
    );
    // The idle window follows the target role: coordinator is 30 minutes,
    // supervisor (the login role) is 60.
    expect(result.inactivityTimeoutMinutes).toBe(
      fixture.config.inactivityTimeoutMinutesByRole[
        RoleCode.PROJECT_COORDINATOR
      ],
    );
    expect(result.inactivityTimeoutMinutes).not.toBe(
      fixture.config.inactivityTimeoutMinutesByRole[
        RoleCode.PROJECT_SUPERVISOR
      ],
    );
    // The fresh appointment list travels with the switch, so the next
    // revalidation compares against what the account holds *now*.
    expect(
      stateOf(fixture, login.sessionId).coordinatorAppointments.map(
        (scope) => scope.appointmentId,
      ),
    ).toEqual([FIRST_APPOINTMENT, SECOND_APPOINTMENT]);
  });

  it("clears the coordinator binding when switching away from the role", async () => {
    const fixture = seededFixture([
      RoleCode.PROJECT_COORDINATOR,
      RoleCode.STUDENT,
    ]);
    seedCoordinatorScopes(fixture, [coordinatorScope()]);
    const login = await fixture.service.login({
      ...LOGIN_PAYLOAD,
      activeRoleHeader: RoleCode.PROJECT_COORDINATOR,
    });
    expect(stateOf(fixture, login.sessionId).activeCoordinatorScope).not.toBeNull();

    const result = await fixture.service.updateSessionContext({
      sessionId: login.sessionId,
      targetRole: RoleCode.STUDENT,
    });

    expect(result.activeCoordinatorScope).toBeNull();
    expect(rowOf(fixture, login.sessionId).activeCoordinatorAppointmentId).toBe(
      null,
    );
    expect(stateOf(fixture, login.sessionId).activeCoordinatorScope).toBeNull();
  });

  it("requires an appointment when the target role is the coordinator", async () => {
    const { fixture, login } = await supervisorSession();

    const error = await expectAppError(
      () =>
        fixture.service.updateSessionContext({
          sessionId: login.sessionId,
          targetRole: RoleCode.PROJECT_COORDINATOR,
        }),
      ERROR_CODES.VALIDATION_ERROR,
    );

    expect(
      error.fieldErrors?.some(
        (fieldError) => fieldError.field === "coordinatorAppointmentId",
      ),
    ).toBe(true);
    expect(rowOf(fixture, login.sessionId).activeRole).toBe(
      RoleCode.PROJECT_SUPERVISOR,
    );
  });

  it("rejects an appointment the account does not hold", async () => {
    const { fixture, login } = await supervisorSession();

    await expectAppError(
      () =>
        fixture.service.updateSessionContext({
          sessionId: login.sessionId,
          targetRole: RoleCode.PROJECT_COORDINATOR,
          coordinatorAppointmentId: "77777777-7777-4777-8777-777777777777",
        }),
      ERROR_CODES.OUT_OF_ASSIGNMENT_SCOPE,
    );
    expect(stateOf(fixture, login.sessionId).activeRole).toBe(
      RoleCode.PROJECT_SUPERVISOR,
    );
    expect(rowOf(fixture, login.sessionId).activeRole).toBe(
      RoleCode.PROJECT_SUPERVISOR,
    );
  });

  it("rejects a role the account does not hold", async () => {
    const fixture = seededFixture([RoleCode.PROJECT_SUPERVISOR]);
    const login = await fixture.service.login(LOGIN_PAYLOAD);

    await expectAppError(
      () =>
        fixture.service.updateSessionContext({
          sessionId: login.sessionId,
          targetRole: RoleCode.PLATFORM_ADMIN,
        }),
      ERROR_CODES.OUT_OF_ASSIGNMENT_SCOPE,
    );
  });

  it("rejects an appointment id supplied for a non-coordinator target", async () => {
    const { fixture, login } = await supervisorSession();

    const error = await expectAppError(
      () =>
        fixture.service.updateSessionContext({
          sessionId: login.sessionId,
          targetRole: RoleCode.STUDENT,
          coordinatorAppointmentId: FIRST_APPOINTMENT,
        }),
      ERROR_CODES.VALIDATION_ERROR,
    );

    expect(
      error.fieldErrors?.some(
        (fieldError) => fieldError.field === "coordinatorAppointmentId",
      ),
    ).toBe(true);
  });

  it("fails closed when the appointment list cannot be loaded", async () => {
    const { fixture, login } = await supervisorSession();
    fixture.roles.findCoordinatorScopesShouldFail = true;

    await expectAppError(
      () =>
        fixture.service.updateSessionContext({
          sessionId: login.sessionId,
          targetRole: RoleCode.PROJECT_COORDINATOR,
          coordinatorAppointmentId: FIRST_APPOINTMENT,
        }),
      ERROR_CODES.SERVICE_UNAVAILABLE,
    );
    expect(stateOf(fixture, login.sessionId).activeRole).toBe(
      RoleCode.PROJECT_SUPERVISOR,
    );
  });

  it("fails closed when the session row cannot be written", async () => {
    const { fixture, login } = await supervisorSession();
    fixture.sessions.updateContextShouldFail = true;

    await expectAppError(
      () =>
        fixture.service.updateSessionContext({
          sessionId: login.sessionId,
          targetRole: RoleCode.STUDENT,
        }),
      ERROR_CODES.SERVICE_UNAVAILABLE,
    );
    expect(stateOf(fixture, login.sessionId).activeRole).toBe(
      RoleCode.PROJECT_SUPERVISOR,
    );
  });

  it("rolls the session row back when the runtime copy cannot be written", async () => {
    const { fixture, login } = await supervisorSession();
    fixture.sessionStore.setShouldFail = true;

    await expectAppError(
      () =>
        fixture.service.updateSessionContext({
          sessionId: login.sessionId,
          targetRole: RoleCode.STUDENT,
        }),
      ERROR_CODES.SERVICE_UNAVAILABLE,
    );
    // Row and Redis copy agree again, so the cross-check stays green.
    expect(rowOf(fixture, login.sessionId).activeRole).toBe(
      RoleCode.PROJECT_SUPERVISOR,
    );
    expect(stateOf(fixture, login.sessionId).activeRole).toBe(
      RoleCode.PROJECT_SUPERVISOR,
    );
  });

  it("rejects an unknown session", async () => {
    const { fixture } = await supervisorSession();

    await expectAppError(
      () =>
        fixture.service.updateSessionContext({
          sessionId: "00000000-0000-4000-8000-000000000000",
          targetRole: RoleCode.STUDENT,
        }),
      ERROR_CODES.SESSION_EXPIRED_OR_REVOKED,
    );
  });
});
