import { RoleCode } from "@clario/shared-contracts";
import { describe, expect, it } from "vitest";

import { AppError } from "../../../errors/app-error.js";
import { ERROR_CODES } from "../../../errors/error-codes.js";
import { hashSingleUseToken } from "../../../modules/auth/auth.token.js";
import {
  INVITATION_TOKEN,
  PASSWORD,
  PASSWORD_RESET_TOKEN,
  createFakeAuthFixture,
  seedAccount,
  seedInstitution,
  seedRoles,
  seedSessionState,
  type FakeAccountRecord,
  type FakeAuthFixture,
} from "./auth.fakes.js";

const NEW_PASSWORD = "Correct-Horse-Battery-Staple-99!";

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

function fixtureWithAccount(
  overrides: Partial<FakeAccountRecord> = {},
): FakeAuthFixture {
  const fixture = createFakeAuthFixture();
  seedInstitution(fixture);
  seedAccount(fixture, overrides);
  return fixture;
}

describe("AccountService.activate", () => {
  it("activates an invited account and stores the password hash", async () => {
    const fixture = fixtureWithAccount();

    const result = await fixture.accountService.activate({
      token: INVITATION_TOKEN,
      password: NEW_PASSWORD,
    });

    expect(result.accountStatus).toBe("ACTIVE");
    expect(result.mfaRequired).toBe(false);
    expect(result.mfaEnrolled).toBe(false);

    const account = fixture.accounts.accounts[0];
    expect(account?.accountStatus).toBe("ACTIVE");
    expect(account?.passwordHash).toBe(`fake-argon2id$${NEW_PASSWORD}`);
    // The invitation token is spent: it can never be replayed.
    expect(account?.invitationTokenHash).toBeNull();
    expect(account?.invitationExpiresAt).toBeNull();
  });

  it("activates an invited account only once", async () => {
    const fixture = fixtureWithAccount();

    await fixture.accountService.activate({
      token: INVITATION_TOKEN,
      password: NEW_PASSWORD,
    });

    const error = await expectAppError(
      () =>
        fixture.accountService.activate({
          token: INVITATION_TOKEN,
          password: "Another-Strong-Passphrase-42!",
        }),
      ERROR_CODES.VALIDATION_ERROR,
    );
    expect(error.fieldErrors?.[0]?.field).toBe("token");

    // The replay did not change the stored password.
    const account = fixture.accounts.accounts[0];
    expect(account?.passwordHash).toBe(`fake-argon2id$${NEW_PASSWORD}`);
  });

  it("rejects an unknown invitation token", async () => {
    const fixture = fixtureWithAccount();

    const error = await expectAppError(
      () =>
        fixture.accountService.activate({
          token: "not-a-real-token",
          password: NEW_PASSWORD,
        }),
      ERROR_CODES.VALIDATION_ERROR,
    );
    expect(error.fieldErrors?.[0]?.field).toBe("token");
    expect(fixture.accounts.accounts[0]?.accountStatus).toBe("INVITED");
  });

  it("rejects an expired invitation", async () => {
    const fixture = fixtureWithAccount({
      invitationExpiresAt: new Date(Date.now() - 60_000),
    });

    await expectAppError(
      () =>
        fixture.accountService.activate({
          token: INVITATION_TOKEN,
          password: NEW_PASSWORD,
        }),
      ERROR_CODES.VALIDATION_ERROR,
    );
    expect(fixture.accounts.accounts[0]?.accountStatus).toBe("INVITED");
  });

  it("rejects a password shorter than the SEC-02 minimum", async () => {
    const fixture = fixtureWithAccount();

    const error = await expectAppError(
      () =>
        fixture.accountService.activate({
          token: INVITATION_TOKEN,
          password: "Short1!",
        }),
      ERROR_CODES.VALIDATION_ERROR,
    );
    expect(error.fieldErrors?.[0]?.field).toBe("password");
    expect(fixture.accounts.accounts[0]?.accountStatus).toBe("INVITED");
  });

  it("rejects a password on the compromised-password list", async () => {
    const fixture = fixtureWithAccount();
    fixture.compromisedPasswords.compromised.add("Password1234!");

    const error = await expectAppError(
      () =>
        fixture.accountService.activate({
          token: INVITATION_TOKEN,
          password: "Password1234!",
        }),
      ERROR_CODES.COMPROMISED_OR_WEAK_PASSWORD,
    );
    expect(error.fieldErrors?.[0]?.field).toBe("password");
    expect(fixture.accounts.accounts[0]?.accountStatus).toBe("INVITED");
  });

  it("flags mandatory MFA for an institutional admin account", async () => {
    const fixture = fixtureWithAccount();
    seedRoles(fixture, [RoleCode.INSTITUTIONAL_ADMIN]);

    const result = await fixture.accountService.activate({
      token: INVITATION_TOKEN,
      password: NEW_PASSWORD,
    });

    expect(result.mfaRequired).toBe(true);
    expect(fixture.accounts.accounts[0]?.mfaRequired).toBe(true);
  });

  it("flags mandatory MFA for a project coordinator account", async () => {
    const fixture = fixtureWithAccount();
    seedRoles(fixture, [RoleCode.PROJECT_COORDINATOR]);

    const result = await fixture.accountService.activate({
      token: INVITATION_TOKEN,
      password: NEW_PASSWORD,
    });

    expect(result.mfaRequired).toBe(true);
  });

  it("does not flag MFA for a student account", async () => {
    const fixture = fixtureWithAccount();
    seedRoles(fixture, [RoleCode.STUDENT]);

    const result = await fixture.accountService.activate({
      token: INVITATION_TOKEN,
      password: NEW_PASSWORD,
    });

    expect(result.mfaRequired).toBe(false);
  });

  it("flags mandatory MFA for a platform admin account", async () => {
    const fixture = fixtureWithAccount({
      isPlatformAdmin: true,
      institutionId: null,
      email: "root@clario.ng",
    });

    const result = await fixture.accountService.activate({
      token: INVITATION_TOKEN,
      password: NEW_PASSWORD,
    });

    expect(result.mfaRequired).toBe(true);
  });
});

describe("AccountService.requestPasswordReset", () => {
  it("issues a single-use token for an active account", async () => {
    const fixture = fixtureWithAccount({
      accountStatus: "ACTIVE",
      passwordHash: `fake-argon2id$${PASSWORD}`,
    });

    await fixture.accountService.requestPasswordReset({
      identifier: "tunde.adewale@unilag.edu.ng",
      institutionCode: "UNILAG",
    });

    expect(fixture.accounts.issuedResets).toHaveLength(1);
    const issued = fixture.accounts.issuedResets[0];
    expect(issued?.userId).toBe(fixture.accounts.accounts[0]?.id);
    expect(issued?.rawToken).not.toBe("");
    expect(issued?.tokenHash).not.toBe(issued?.rawToken);
    expect(issued?.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("does not reveal that an unknown identifier has no account", async () => {
    const fixture = fixtureWithAccount({ accountStatus: "ACTIVE" });

    await expect(
      fixture.accountService.requestPasswordReset({
        identifier: "nobody@unilag.edu.ng",
      }),
    ).resolves.toBeUndefined();

    expect(fixture.accounts.issuedResets).toHaveLength(0);
  });

  it("does not issue a token for a deactivated account", async () => {
    const fixture = fixtureWithAccount({ accountStatus: "DEACTIVATED" });

    await fixture.accountService.requestPasswordReset({
      identifier: "tunde.adewale@unilag.edu.ng",
    });

    expect(fixture.accounts.issuedResets).toHaveLength(0);
  });

  it("does not issue a token for an unknown institution code", async () => {
    const fixture = fixtureWithAccount({ accountStatus: "ACTIVE" });

    await fixture.accountService.requestPasswordReset({
      identifier: "tunde.adewale@unilag.edu.ng",
      institutionCode: "UNKNOWN",
    });

    expect(fixture.accounts.issuedResets).toHaveLength(0);
  });
});

describe("AccountService.resetPassword", () => {
  function seededActiveAccount(): FakeAuthFixture {
    const fixture = fixtureWithAccount({
      accountStatus: "ACTIVE",
      passwordHash: `fake-argon2id$${PASSWORD}`,
      passwordResetTokenHash: hashSingleUseToken(PASSWORD_RESET_TOKEN),
      passwordResetExpiresAt: new Date(Date.now() + 30 * 60_000),
    });
    return fixture;
  }

  it("stores the new password and revokes every session of the account", async () => {
    const fixture = seededActiveAccount();
    const userId = fixture.accounts.accounts[0]?.id as string;

    // Two live sessions of the account.
    await fixture.sessions.create({
      id: "session-one",
      userId,
      institutionId: fixture.accounts.accounts[0]?.institutionId ?? null,
      activeRole: RoleCode.STUDENT,
      activeCoordinatorAppointmentId: null,
      mfaVerified: false,
      ipAddress: null,
      userAgent: null,
      inactivityTimeoutMinutes: 60,
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60_000),
    });
    await fixture.sessions.create({
      id: "session-two",
      userId,
      institutionId: fixture.accounts.accounts[0]?.institutionId ?? null,
      activeRole: RoleCode.STUDENT,
      activeCoordinatorAppointmentId: null,
      mfaVerified: false,
      ipAddress: null,
      userAgent: null,
      inactivityTimeoutMinutes: 60,
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60_000),
    });
    seedSessionState(fixture, "session-one");

    await fixture.accountService.resetPassword({
      token: PASSWORD_RESET_TOKEN,
      password: NEW_PASSWORD,
    });

    expect(fixture.accounts.accounts[0]?.passwordHash).toBe(
      `fake-argon2id$${NEW_PASSWORD}`,
    );
    // The reset token is consumed.
    expect(fixture.accounts.accounts[0]?.passwordResetTokenHash).toBeNull();

    // Every session of the account is revoked, in PostgreSQL and Redis.
    expect(fixture.sessions.rows.get("session-one")?.isRevoked).toBe(true);
    expect(fixture.sessions.rows.get("session-two")?.isRevoked).toBe(true);
    expect(fixture.sessions.rows.get("session-one")?.revokedReason).toBe(
      "PASSWORD_RESET",
    );
    expect(fixture.sessionStore.states.has("session-one")).toBe(false);
  });

  it("rejects a reset token that was already used", async () => {
    const fixture = seededActiveAccount();

    await fixture.accountService.resetPassword({
      token: PASSWORD_RESET_TOKEN,
      password: NEW_PASSWORD,
    });

    const error = await expectAppError(
      () =>
        fixture.accountService.resetPassword({
          token: PASSWORD_RESET_TOKEN,
          password: "Another-Strong-Passphrase-42!",
        }),
      ERROR_CODES.VALIDATION_ERROR,
    );
    expect(error.fieldErrors?.[0]?.field).toBe("token");
  });

  it("rejects an expired reset token", async () => {
    const fixture = fixtureWithAccount({
      accountStatus: "ACTIVE",
      passwordResetTokenHash: hashSingleUseToken(PASSWORD_RESET_TOKEN),
      passwordResetExpiresAt: new Date(Date.now() - 60_000),
    });

    await expectAppError(
      () =>
        fixture.accountService.resetPassword({
          token: PASSWORD_RESET_TOKEN,
          password: NEW_PASSWORD,
        }),
      ERROR_CODES.VALIDATION_ERROR,
    );
  });

  it("rejects a password that does not satisfy the password policy", async () => {
    const fixture = seededActiveAccount();
    fixture.compromisedPasswords.compromised.add("Password1234!");

    await expectAppError(
      () =>
        fixture.accountService.resetPassword({
          token: PASSWORD_RESET_TOKEN,
          password: "Password1234!",
        }),
      ERROR_CODES.COMPROMISED_OR_WEAK_PASSWORD,
    );

    // Nothing was applied: the old password is still in place.
    expect(fixture.accounts.accounts[0]?.passwordHash).toBe(
      `fake-argon2id$${PASSWORD}`,
    );
  });

  it("fails closed when the sessions cannot be revoked", async () => {
    const fixture = seededActiveAccount();
    fixture.sessions.revokeAllForUserShouldFail = true;

    await expectAppError(
      () =>
        fixture.accountService.resetPassword({
          token: PASSWORD_RESET_TOKEN,
          password: NEW_PASSWORD,
        }),
      ERROR_CODES.SERVICE_UNAVAILABLE,
    );

    // The password was not changed while the old sessions stay revoked.
    expect(fixture.accounts.accounts[0]?.passwordHash).toBe(
      `fake-argon2id$${PASSWORD}`,
    );
  });
});
