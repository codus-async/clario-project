import { describe, expect, it } from "vitest";

import {
  activateRequestBodySchema,
  emptyRequestBodySchema,
  loginRequestBodySchema,
} from "../../../modules/auth/auth.schemas.js";

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
