import { describe, expect, it } from "vitest";

import {
  activateRequestBodySchema,
  emptyRequestBodySchema,
  loginRequestBodySchema,
  mfaEnrollRequestBodySchema,
  mfaVerifyRequestBodySchema,
  passwordResetBodySchema,
  sessionContextRequestBodySchema,
} from "../../../modules/auth/auth.schemas.js";
import { MAX_PASSWORD_LENGTH } from "../../../modules/auth/auth.password-policy.js";
import { MFA_CODE_MAX_LENGTH } from "../../../modules/auth/auth.totp.js";

const VALID_LOGIN = {
  identifier: "tunde.adewale@unilag.edu.ng",
  password: "Correct-Horse-Battery-Staple-99!",
  institutionCode: "UNILAG",
};

const VALID_TOKEN = "invitation-token-value";

function parse<T extends { safeParse: (data: unknown) => { success: boolean } }>(
  schema: T,
  data: unknown,
): boolean {
  return schema.safeParse(data).success;
}

describe("loginRequestBodySchema", () => {
  it("accepts a valid email identifier", () => {
    expect(parse(loginRequestBodySchema, VALID_LOGIN)).toBe(true);
  });

  it("accepts a valid institutional identifier", () => {
    expect(
      parse(loginRequestBodySchema, {
        ...VALID_LOGIN,
        identifier: "UNILAG/STAFF/0042",
      }),
    ).toBe(true);
  });

  it("rejects a missing identifier", () => {
    const { identifier: _identifier, ...rest } = VALID_LOGIN;
    expect(parse(loginRequestBodySchema, rest)).toBe(false);
  });

  it("rejects an empty identifier", () => {
    expect(
      parse(loginRequestBodySchema, { ...VALID_LOGIN, identifier: "" }),
    ).toBe(false);
  });

  it("rejects a whitespace-only identifier", () => {
    expect(
      parse(loginRequestBodySchema, { ...VALID_LOGIN, identifier: "   " }),
    ).toBe(false);
  });

  it("trims surrounding whitespace from the identifier", () => {
    const result = loginRequestBodySchema.safeParse({
      ...VALID_LOGIN,
      identifier: "  tunde.adewale@unilag.edu.ng  ",
    });

    expect(result).toMatchObject({
      success: true,
      data: { identifier: "tunde.adewale@unilag.edu.ng" },
    });
  });

  it("rejects an identifier longer than the documented maximum", () => {
    expect(
      parse(loginRequestBodySchema, {
        ...VALID_LOGIN,
        identifier: "a".repeat(321),
      }),
    ).toBe(false);
  });

  it("accepts a login request without an optional institution code", () => {
    const { institutionCode: _institutionCode, ...rest } = VALID_LOGIN;
    expect(parse(loginRequestBodySchema, rest)).toBe(true);
  });

  it("rejects an empty institution code", () => {
    expect(
      parse(loginRequestBodySchema, { ...VALID_LOGIN, institutionCode: "" }),
    ).toBe(false);
  });

  it("rejects a whitespace-only institution code", () => {
    expect(
      parse(loginRequestBodySchema, {
        ...VALID_LOGIN,
        institutionCode: "   ",
      }),
    ).toBe(false);
  });

  it("rejects a non-string institution code", () => {
    expect(
      parse(loginRequestBodySchema, {
        ...VALID_LOGIN,
        institutionCode: 1234,
      }),
    ).toBe(false);
  });

  it("rejects an institution code longer than the documented maximum", () => {
    expect(
      parse(loginRequestBodySchema, {
        ...VALID_LOGIN,
        institutionCode: "a".repeat(65),
      }),
    ).toBe(false);
  });

  it("rejects a missing password", () => {
    const { password: _password, ...rest } = VALID_LOGIN;
    expect(parse(loginRequestBodySchema, rest)).toBe(false);
  });

  it("rejects an empty password", () => {
    expect(
      parse(loginRequestBodySchema, { ...VALID_LOGIN, password: "" }),
    ).toBe(false);
  });

  it("rejects a non-string password", () => {
    expect(
      parse(loginRequestBodySchema, { ...VALID_LOGIN, password: 1234567890123 }),
    ).toBe(false);
  });

  it("rejects unknown request fields", () => {
    expect(parse(loginRequestBodySchema, { ...VALID_LOGIN, isAdmin: true })).toBe(
      false,
    );
  });

  it("accepts a login password shorter than 12 characters", () => {
    // The 12-character minimum (SEC-02) applies to account activation, not
    // login: existing users with shorter passwords must still authenticate.
    expect(
      parse(loginRequestBodySchema, { ...VALID_LOGIN, password: "short" }),
    ).toBe(true);
  });

  it("preserves the login password exactly as submitted", () => {
    const password = "  Correct-Horse-Battery-Staple-99!  ";

    const result = loginRequestBodySchema.safeParse({
      ...VALID_LOGIN,
      password,
    });

    expect(result).toMatchObject({
      success: true,
      data: { password },
    });
  });

  it("rejects a non-object body", () => {
    expect(parse(loginRequestBodySchema, ["not", "an", "object"])).toBe(false);
    expect(parse(loginRequestBodySchema, null)).toBe(false);
    expect(parse(loginRequestBodySchema, "identifier")).toBe(false);
  });
});

describe("activateRequestBodySchema", () => {
  it("accepts a valid token with a 12-character password", () => {
    expect(
      parse(activateRequestBodySchema, {
        token: VALID_TOKEN,
        password: "a".repeat(12),
      }),
    ).toBe(true);
  });

  it("accepts a valid token with a password longer than 12 characters", () => {
    expect(
      parse(activateRequestBodySchema, {
        token: VALID_TOKEN,
        password: "a".repeat(16),
      }),
    ).toBe(true);
  });

  it("rejects a missing token", () => {
    expect(
      parse(activateRequestBodySchema, { password: "a".repeat(12) }),
    ).toBe(false);
  });

  it("rejects an empty token", () => {
    expect(
      parse(activateRequestBodySchema, { token: "", password: "a".repeat(12) }),
    ).toBe(false);
  });

  it("rejects a whitespace-only token", () => {
    // No raw invitation-token format is defined anywhere in the repository
    // (only the stored `invitation_token_hash`), so whitespace-only input is
    // the only malformed case that can be established safely.
    expect(
      parse(activateRequestBodySchema, {
        token: "   ",
        password: "a".repeat(12),
      }),
    ).toBe(false);
  });

  it("rejects a non-string token", () => {
    expect(
      parse(activateRequestBodySchema, {
        token: 42,
        password: "a".repeat(12),
      }),
    ).toBe(false);
  });

  it("preserves the token value exactly as submitted", () => {
    const result = activateRequestBodySchema.safeParse({
      token: VALID_TOKEN,
      password: "a".repeat(12),
    });

    expect(result).toMatchObject({
      success: true,
      data: { token: VALID_TOKEN },
    });
  });

  it("rejects a missing password", () => {
    expect(activateRequestBodySchema.safeParse({ token: VALID_TOKEN }).success).toBe(
      false,
    );
  });

  it("rejects a password shorter than 12 characters", () => {
    expect(
      parse(activateRequestBodySchema, {
        token: VALID_TOKEN,
        password: "a".repeat(11),
      }),
    ).toBe(false);
  });

  it("accepts a password containing exactly 12 characters", () => {
    expect(
      parse(activateRequestBodySchema, {
        token: VALID_TOKEN,
        password: "a".repeat(12),
      }),
    ).toBe(true);
  });

  it("rejects a non-string password", () => {
    expect(
      parse(activateRequestBodySchema, { token: VALID_TOKEN, password: 123 }),
    ).toBe(false);
  });

  it("rejects unknown request fields", () => {
    expect(
      parse(activateRequestBodySchema, {
        token: VALID_TOKEN,
        password: "a".repeat(12),
        rememberMe: true,
      }),
    ).toBe(false);
  });

  it("does not trim the password before the length check", () => {
    // 11 real characters padded with whitespace: only whitespace is not
    // counted as missing, but the untrimmed value must reach 12 total.
    expect(
      parse(activateRequestBodySchema, {
        token: VALID_TOKEN,
        password: `${"a".repeat(11)} `,
      }),
    ).toBe(true);
    expect(
      parse(activateRequestBodySchema, {
        token: VALID_TOKEN,
        password: ` ${"a".repeat(11)}`,
      }),
    ).toBe(true);
  });

  it("rejects a password longer than the login boundary accepts", () => {
    // A password the login schema rejects would lock the account out of
    // its own login, so the activation boundary must reject it too.
    expect(
      parse(activateRequestBodySchema, {
        token: VALID_TOKEN,
        password: "a".repeat(MAX_PASSWORD_LENGTH + 1),
      }),
    ).toBe(false);
  });

  it("accepts a password of exactly the documented maximum", () => {
    expect(
      parse(activateRequestBodySchema, {
        token: VALID_TOKEN,
        password: "a".repeat(MAX_PASSWORD_LENGTH),
      }),
    ).toBe(true);
  });
});

describe("passwordResetBodySchema", () => {
  it("accepts a valid token with a 12-character password", () => {
    expect(
      parse(passwordResetBodySchema, {
        token: VALID_TOKEN,
        password: "a".repeat(12),
      }),
    ).toBe(true);
  });

  it("rejects a password shorter than 12 characters", () => {
    expect(
      parse(passwordResetBodySchema, {
        token: VALID_TOKEN,
        password: "a".repeat(11),
      }),
    ).toBe(false);
  });

  it("rejects a password longer than the login boundary accepts", () => {
    // The same mismatch the activation boundary had: a reset password the
    // login schema rejects would make the account unusable.
    expect(
      parse(passwordResetBodySchema, {
        token: VALID_TOKEN,
        password: "a".repeat(MAX_PASSWORD_LENGTH + 1),
      }),
    ).toBe(false);
  });

  it("accepts a password of exactly the documented maximum", () => {
    expect(
      parse(passwordResetBodySchema, {
        token: VALID_TOKEN,
        password: "a".repeat(MAX_PASSWORD_LENGTH),
      }),
    ).toBe(true);
  });

  it("rejects unknown request fields", () => {
    expect(
      parse(passwordResetBodySchema, {
        token: VALID_TOKEN,
        password: "a".repeat(12),
        rememberMe: true,
      }),
    ).toBe(false);
  });
});

describe("emptyRequestBodySchema", () => {
  it("accepts an empty object body", () => {
    expect(parse(emptyRequestBodySchema, {})).toBe(true);
  });

  it("rejects unknown request fields", () => {
    expect(parse(emptyRequestBodySchema, { ts: 123 })).toBe(false);
    expect(parse(emptyRequestBodySchema, { isAdmin: true })).toBe(false);
  });

  it("rejects a non-object body", () => {
    expect(parse(emptyRequestBodySchema, ["x"])).toBe(false);
    expect(parse(emptyRequestBodySchema, "body")).toBe(false);
    expect(parse(emptyRequestBodySchema, null)).toBe(false);
  });
});

describe("mfaEnrollRequestBodySchema", () => {
  it("is the bodyless contract: enrollment takes no request body", () => {
    // Documented alias — F-65 §2.1 defines no body, so the enrollment edge
    // must behave exactly like logout/heartbeat.
    expect(mfaEnrollRequestBodySchema).toBe(emptyRequestBodySchema);
    expect(parse(mfaEnrollRequestBodySchema, {})).toBe(true);
  });

  it("rejects any field, so a stray body never reaches the controller", () => {
    expect(parse(mfaEnrollRequestBodySchema, { totpCode: "123456" })).toBe(
      false,
    );
    expect(parse(mfaEnrollRequestBodySchema, { secret: "AAA" })).toBe(false);
  });
});

describe("mfaVerifyRequestBodySchema", () => {
  it("accepts a 6-digit TOTP code", () => {
    expect(parse(mfaVerifyRequestBodySchema, { totpCode: "048291" })).toBe(
      true,
    );
  });

  it("accepts a recovery code", () => {
    expect(
      parse(mfaVerifyRequestBodySchema, {
        totpCode: "ABCD-EF01-2345-6789",
      }),
    ).toBe(true);
  });

  it("trims whitespace around the submitted code", () => {
    const result = mfaVerifyRequestBodySchema.safeParse({
      totpCode: "  048291  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totpCode).toBe("048291");
    }
  });

  it("rejects a missing, empty or whitespace-only code", () => {
    expect(parse(mfaVerifyRequestBodySchema, {})).toBe(false);
    expect(parse(mfaVerifyRequestBodySchema, { totpCode: "" })).toBe(false);
    expect(parse(mfaVerifyRequestBodySchema, { totpCode: "   " })).toBe(false);
  });

  it("rejects a code longer than the documented bound", () => {
    expect(
      parse(mfaVerifyRequestBodySchema, {
        totpCode: "a".repeat(MFA_CODE_MAX_LENGTH + 1),
      }),
    ).toBe(false);
    expect(
      parse(mfaVerifyRequestBodySchema, {
        totpCode: "a".repeat(MFA_CODE_MAX_LENGTH),
      }),
    ).toBe(true);
  });

  it("rejects unknown request fields", () => {
    expect(
      parse(mfaVerifyRequestBodySchema, {
        totpCode: "048291",
        recoveryCode: "ABCD-EF01-2345-6789",
      }),
    ).toBe(false);
    expect(parse(mfaVerifyRequestBodySchema, ["048291"])).toBe(false);
  });
});

describe("sessionContextRequestBodySchema", () => {
  it("accepts a target role without an appointment", () => {
    expect(parse(sessionContextRequestBodySchema, { targetRole: "STUDENT" })).toBe(
      true,
    );
    expect(
      parse(sessionContextRequestBodySchema, {
        targetRole: "PROJECT_SUPERVISOR",
      }),
    ).toBe(true);
  });

  it("accepts the coordinator target with its appointment id", () => {
    expect(
      parse(sessionContextRequestBodySchema, {
        targetRole: "PROJECT_COORDINATOR",
        coordinatorAppointmentId: "33333333-3333-4333-8333-333333333333",
      }),
    ).toBe(true);
  });

  it("accepts every documented role code", () => {
    for (const targetRole of [
      "PLATFORM_ADMIN",
      "INSTITUTIONAL_ADMIN",
      "PROJECT_COORDINATOR",
      "PROJECT_SUPERVISOR",
      "PROJECT_EXAMINER",
      "STUDENT",
    ]) {
      expect(parse(sessionContextRequestBodySchema, { targetRole })).toBe(true);
    }
  });

  it("rejects a role outside the documented enum", () => {
    expect(parse(sessionContextRequestBodySchema, { targetRole: "ADMIN" })).toBe(
      false,
    );
    expect(
      parse(sessionContextRequestBodySchema, { targetRole: "coordinator" }),
    ).toBe(false);
    expect(parse(sessionContextRequestBodySchema, {})).toBe(false);
  });

  it("rejects an appointment id that is not a UUID", () => {
    expect(
      parse(sessionContextRequestBodySchema, {
        targetRole: "PROJECT_COORDINATOR",
        coordinatorAppointmentId: "not-a-uuid",
      }),
    ).toBe(false);
  });

  it("rejects unknown request fields", () => {
    expect(
      parse(sessionContextRequestBodySchema, {
        targetRole: "STUDENT",
        sessionId: "44444444-4444-4444-8444-444444444444",
      }),
    ).toBe(false);
  });
});
