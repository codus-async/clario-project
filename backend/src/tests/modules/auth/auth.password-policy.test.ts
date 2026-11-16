import { describe, expect, it } from "vitest";

import { AppError } from "../../../errors/app-error.js";
import { ERROR_CODES } from "../../../errors/error-codes.js";
import { LocalCompromisedPasswordChecker } from "../../../infrastructure/auth/compromised-password-checker.js";
import { assertPasswordPolicy } from "../../../modules/auth/auth.password-policy.js";

/** A unique 14-character password (AC-F64-01 "accepts" case). */
const UNIQUE_PASSWORD = "N7#vQk2$Lm9xZp";

describe("LocalCompromisedPasswordChecker", () => {
  const checker = new LocalCompromisedPasswordChecker();

  it("rejects the documented 12-character compromised password", async () => {
    // AC-F64-01: "a 12-character password found on the compromised-password
    // list (e.g., Password1234!)".
    await expect(checker.isCompromised("Password1234!")).resolves.toBe(true);
  });

  it("rejects well-known breached passwords and their variants", async () => {
    for (const password of [
      "password",
      "password1234",
      "Password1234",
      "P@ssw0rd123",
      "123456789012",
      "qwertyuiop12",
      "letmein1234",
      "iloveyou1234",
      "aaaaaaaaaaaa",
    ]) {
      await expect(
        checker.isCompromised(password),
        `${password} must be rejected`,
      ).resolves.toBe(true);
    }
  });

  it("accepts a unique 14-character password", async () => {
    await expect(checker.isCompromised(UNIQUE_PASSWORD)).resolves.toBe(false);
  });
});

describe("assertPasswordPolicy", () => {
  const checker = new LocalCompromisedPasswordChecker();

  it("rejects a password shorter than the SEC-02 minimum", async () => {
    let caught: unknown;
    try {
      await assertPasswordPolicy("Short1!", checker);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AppError);
    expect((caught as AppError).code).toBe(ERROR_CODES.VALIDATION_ERROR);
    expect((caught as AppError).fieldErrors?.[0]?.field).toBe("password");
  });

  it("rejects a compromised password with its own documented code", async () => {
    let caught: unknown;
    try {
      await assertPasswordPolicy("Password1234!", checker);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AppError);
    expect((caught as AppError).code).toBe(
      ERROR_CODES.COMPROMISED_OR_WEAK_PASSWORD,
    );
    expect((caught as AppError).fieldErrors?.[0]?.field).toBe("password");
  });

  it("accepts a unique 14-character password", async () => {
    await expect(
      assertPasswordPolicy(UNIQUE_PASSWORD, checker),
    ).resolves.toBeUndefined();
  });
});
