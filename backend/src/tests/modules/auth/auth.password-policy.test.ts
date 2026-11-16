import { describe, expect, it } from "vitest";

import { AppError } from "../../../errors/app-error.js";
import { ERROR_CODES } from "../../../errors/error-codes.js";
import { LocalCompromisedPasswordChecker } from "../../../infrastructure/auth/compromised-password-checker.js";
import {
  MAX_PASSWORD_LENGTH,
  assertPasswordPolicy,
} from "../../../modules/auth/auth.password-policy.js";

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

  it("rejects leet variants whose digits form a run", async () => {
    // The digit runs are part of the word, so they are normalised to their
    // letter look-alike: `55` → `ss` and `455` → `ass`.
    for (const password of [
      "Pa55word2026!",
      "p455w0rd1234",
      "Pa55word2026",
      "p455w0rd",
    ]) {
      await expect(
        checker.isCompromised(password),
        `${password} must be rejected`,
      ).resolves.toBe(true);
    }
  });

  it("rejects a breached base word followed by a year", async () => {
    for (const password of [
      "Password2026!",
      "P@ssword2026!",
      "qwerty2026",
      "monkey2024",
    ]) {
      await expect(
        checker.isCompromised(password),
        `${password} must be rejected`,
      ).resolves.toBe(true);
    }
  });

  it("accepts a password written in a non-Latin script", async () => {
    // The screening is Unicode-aware: a letter is any code point in \p{L},
    // so a passphrase in another script is judged on its own letters
    // instead of being mistaken for a numeric pattern.
    for (const password of [
      "パスワード2026年",
      "пароль2026",
      "كلمة السر2026",
    ]) {
      await expect(
        checker.isCompromised(password),
        `${password} must be accepted`,
      ).resolves.toBe(false);
    }
  });

  it("rejects a password without a single letter", async () => {
    await expect(checker.isCompromised("12345678901234")).resolves.toBe(true);
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

  it("rejects a password longer than the login boundary accepts", async () => {
    // A password the login boundary rejects would lock the account out of
    // its own login, so the password-creation paths must reject it too.
    let caught: unknown;
    try {
      await assertPasswordPolicy("a".repeat(MAX_PASSWORD_LENGTH + 1), checker);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AppError);
    expect((caught as AppError).code).toBe(ERROR_CODES.VALIDATION_ERROR);
    expect((caught as AppError).fieldErrors?.[0]?.field).toBe("password");
  });

  it("accepts a password of exactly the maximum length", async () => {
    const password = `${"a".repeat(MAX_PASSWORD_LENGTH - 1)}b`;

    await expect(
      assertPasswordPolicy(password, checker),
    ).resolves.toBeUndefined();
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
