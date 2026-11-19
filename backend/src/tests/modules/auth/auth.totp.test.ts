import { describe, expect, it } from "vitest";

import {
  MFA_CODE_MAX_LENGTH,
  RECOVERY_CODE_COUNT,
  TOTP_DIGITS,
  TOTP_ISSUER,
  TOTP_PERIOD_SECONDS,
  TOTP_SECRET_BYTES,
  TOTP_WINDOW_STEPS,
  buildTotpProvisioningUri,
  generateRecoveryCodes,
  generateTotpCode,
  generateTotpSecret,
  hashRecoveryCode,
  isTotpCodeShape,
  normalizeRecoveryCode,
  verifyTotpCode,
} from "../../../modules/auth/auth.totp.js";

/**
 * RFC 6238 Appendix B seed: the ASCII string "12345678901234567890"
 * (RFC 4226 §Appendix B) base32-encoded the way an authenticator app
 * receives it. The vectors below are the SHA-1 entries of Appendix B
 * truncated from 8 to 6 digits — the last six decimal digits of the 8-digit
 * value, because `binary % 10^6` is exactly `(binary % 10^8) % 10^6`.
 */
const RFC_SEED_BASE32 = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

const RFC_6238_VECTORS: ReadonlyArray<{ atSeconds: number; code: string }> = [
  { atSeconds: 59, code: "287082" },
  { atSeconds: 1_111_111_109, code: "081804" },
  { atSeconds: 1_111_111_111, code: "050471" },
  { atSeconds: 1_234_567_890, code: "005924" },
  { atSeconds: 2_000_000_000, code: "279037" },
  { atSeconds: 20_000_000_000, code: "353130" },
];

const RECOVERY_CODE_PATTERN = /^[0-9A-F]{4}(?:-[0-9A-F]{4}){3}$/;

describe("TOTP (RFC 6238)", () => {
  it("matches every RFC 6238 Appendix B SHA-1 vector", () => {
    for (const vector of RFC_6238_VECTORS) {
      expect(
        verifyTotpCode(RFC_SEED_BASE32, vector.code, vector.atSeconds),
        `vector at t=${String(vector.atSeconds)}`,
      ).toBe(true);
      expect(
        generateTotpCode(RFC_SEED_BASE32, vector.atSeconds),
        `generated code at t=${String(vector.atSeconds)}`,
      ).toBe(vector.code);
    }
  });

  it("rejects a code generated for a different seed", () => {
    const otherSecret = generateTotpSecret();
    expect(
      verifyTotpCode(otherSecret, "005924", 1_234_567_890),
    ).toBe(false);
  });

  it("rejects a correct code from a step outside the ±1 window", () => {
    const atSeconds = 1_234_567_890;
    const code = generateTotpCode(RFC_SEED_BASE32, atSeconds);

    // Inside the window: current step and both neighbours.
    expect(verifyTotpCode(RFC_SEED_BASE32, code, atSeconds)).toBe(true);
    expect(
      verifyTotpCode(
        RFC_SEED_BASE32,
        code,
        atSeconds - TOTP_PERIOD_SECONDS,
      ),
    ).toBe(true);
    expect(
      verifyTotpCode(
        RFC_SEED_BASE32,
        code,
        atSeconds + TOTP_PERIOD_SECONDS,
      ),
    ).toBe(true);

    // Two steps away: expired (or not yet valid).
    expect(
      verifyTotpCode(
        RFC_SEED_BASE32,
        code,
        atSeconds - 2 * TOTP_PERIOD_SECONDS,
      ),
    ).toBe(false);
    expect(
      verifyTotpCode(
        RFC_SEED_BASE32,
        code,
        atSeconds + 2 * TOTP_PERIOD_SECONDS,
      ),
    ).toBe(false);
  });

  it("rejects values that are not six decimal digits", () => {
    const atSeconds = 1_234_567_890;
    const code = generateTotpCode(RFC_SEED_BASE32, atSeconds);

    for (const malformed of [
      "",
      "12345",
      "1234567",
      `${code}0`,
      "abcdef",
      "12345 ",
      "١٢٣٤٥٦",
    ]) {
      expect(verifyTotpCode(RFC_SEED_BASE32, malformed, atSeconds)).toBe(false);
      expect(isTotpCodeShape(malformed)).toBe(false);
    }
  });

  it("fails closed on a malformed seed instead of throwing", () => {
    expect(verifyTotpCode("not-base32-!!", "005924", 1_234_567_890)).toBe(
      false,
    );
    expect(verifyTotpCode("", "005924", 1_234_567_890)).toBe(false);
  });

  it("tolerates the casing and padding authenticator apps add to a seed", () => {
    const atSeconds = 1_234_567_890;
    const code = generateTotpCode(RFC_SEED_BASE32, atSeconds);

    expect(
      verifyTotpCode(RFC_SEED_BASE32.toLowerCase(), code, atSeconds),
    ).toBe(true);
    expect(
      verifyTotpCode(`${RFC_SEED_BASE32}=`, code, atSeconds),
    ).toBe(true);
  });

  it("round-trips a freshly generated seed", () => {
    const secret = generateTotpSecret();
    const atSeconds = 1_700_000_000;
    const code = generateTotpCode(secret, atSeconds);

    expect(code).toMatch(/^\d{6}$/);
    expect(verifyTotpCode(secret, code, atSeconds)).toBe(true);
  });
});

describe("generateTotpSecret", () => {
  it("produces a 160-bit base32 seed", () => {
    const secret = generateTotpSecret();
    // ceil(20 * 8 / 5) = 32 unpadded base32 characters.
    expect(secret).toHaveLength(Math.ceil((TOTP_SECRET_BYTES * 8) / 5));
    expect(secret).toMatch(/^[A-Z2-7]+$/);
  });

  it("produces a different seed on every call", () => {
    const secrets = new Set(
      Array.from({ length: 20 }, () => generateTotpSecret()),
    );
    expect(secrets.size).toBe(20);
  });
});

describe("isTotpCodeShape", () => {
  it("accepts exactly six decimal digits", () => {
    expect(isTotpCodeShape("000000")).toBe(true);
    expect(isTotpCodeShape("999999")).toBe(true);
  });

  it("rejects anything else — including every recovery-code form", () => {
    expect(isTotpCodeShape("")).toBe(false);
    expect(isTotpCodeShape("12345")).toBe(false);
    expect(isTotpCodeShape("1234567")).toBe(false);
    expect(isTotpCodeShape("1234 56")).toBe(false);
    expect(isTotpCodeShape("ABCDEF")).toBe(false);
    expect(isTotpCodeShape("ABCD-EFGH-IJKL-MNOP")).toBe(false);
  });
});

describe("recovery codes (SEC-06, FR-224)", () => {
  it("generates exactly ten codes in XXXX-XXXX-XXXX-XXXX form", () => {
    const codes = generateRecoveryCodes();

    expect(codes).toHaveLength(RECOVERY_CODE_COUNT);
    for (const code of codes) {
      expect(code).toMatch(RECOVERY_CODE_PATTERN);
    }
    expect(new Set(codes).size).toBe(RECOVERY_CODE_COUNT);
  });

  it("normalizes separators, case and stray whitespace to one form", () => {
    expect(normalizeRecoveryCode("abcd-ef01-2345-6789")).toBe(
      "ABCDEF0123456789",
    );
    expect(normalizeRecoveryCode(" ABCDEF0123456789 ")).toBe(
      "ABCDEF0123456789",
    );
    expect(normalizeRecoveryCode("abcd ef01 2345 6789")).toBe(
      "ABCDEF0123456789",
    );
  });

  it("hashes every spelling of the same code to one digest", () => {
    const digest = hashRecoveryCode("ABCD-EF01-2345-6789");

    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(hashRecoveryCode("abcdef0123456789")).toBe(digest);
    expect(hashRecoveryCode(" abcd-ef01-2345-6789 ")).toBe(digest);
    expect(hashRecoveryCode("ABCD-EF01-2345-678A")).not.toBe(digest);
  });
});

describe("buildTotpProvisioningUri", () => {
  it("builds the otpauth:// URI an authenticator app scans", () => {
    const uri = buildTotpProvisioningUri({
      secret: RFC_SEED_BASE32,
      account: "tunde.adewale@unilag.edu.ng",
    });

    expect(uri.startsWith("otpauth://totp/")).toBe(true);
    expect(uri).toContain(`Clario:tunde.adewale%40unilag.edu.ng`);
    expect(uri).toContain(`secret=${RFC_SEED_BASE32}`);
    expect(uri).toContain(`issuer=${TOTP_ISSUER}`);
    expect(uri).toContain(`algorithm=SHA1`);
    expect(uri).toContain(`digits=${String(TOTP_DIGITS)}`);
    expect(uri).toContain(`period=${String(TOTP_PERIOD_SECONDS)}`);
  });

  it("honours an explicit issuer", () => {
    const uri = buildTotpProvisioningUri({
      secret: RFC_SEED_BASE32,
      account: "admin@unilag.edu.ng",
      issuer: "UNILAG Clario",
    });

    expect(uri).toContain("issuer=UNILAG+Clario");
    expect(uri).toContain(`${encodeURIComponent("UNILAG Clario")}:`);
  });

  it("declares the documented verification window", () => {
    // Guards the parameter the RFC vectors above depend on.
    expect(TOTP_WINDOW_STEPS).toBe(1);
    expect(TOTP_PERIOD_SECONDS).toBe(30);
    expect(TOTP_DIGITS).toBe(6);
    expect(MFA_CODE_MAX_LENGTH).toBeGreaterThanOrEqual(19);
  });
});
