import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

/**
 * RFC 6238 TOTP and the ten single-use recovery codes that back it (SEC-06,
 * FR-224). Implemented directly on `node:crypto`: the repository carries no
 * TOTP dependency, and RFC 6238 is a thin HMAC-SHA1 wrapper over the HOTP
 * construction of RFC 4226.
 *
 * Parameters follow the documented MVP defaults (architecture §4.1):
 * SHA-1, 6 digits, a 30-second step, and a ±1-step verification window for
 * ordinary clock skew. The seed is 160 bits (RFC 4226 §4), base32-encoded
 * the way authenticator apps expect it in an `otpauth://` URI.
 *
 * Nothing in this module talks to storage: the application service decides
 * *when* a code is checked and the repository decides how the seed and the
 * recovery-code digests are persisted.
 */

/** RFC 4648 §6 base32 alphabet (no padding — the `otpauth://` convention). */
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** 160-bit seed, the RFC 4226 §4 recommendation for HMAC-SHA1. */
export const TOTP_SECRET_BYTES = 20;

export const TOTP_DIGITS = 6;

export const TOTP_PERIOD_SECONDS = 30;

/** ±1 step of clock skew accepted at verification. */
export const TOTP_WINDOW_STEPS = 1;

/** Algorithm label carried in the provisioning URI. */
export const TOTP_ALGORITHM = "SHA1";

/** Issuer label carried in the provisioning URI (`otpauth://totp/...`). */
export const TOTP_ISSUER = "Clario";

/** SEC-06 / architecture §4.1: exactly ten single-use recovery codes. */
export const RECOVERY_CODE_COUNT = 10;

/** 64 bits of entropy per recovery code, hashed before storage (FR-224). */
export const RECOVERY_CODE_BYTES = 8;

/** `XXXX-XXXX-XXXX-XXXX` — 16 hex characters in four hyphenated groups. */
const RECOVERY_CODE_GROUP_LENGTH = 4;

/**
 * Upper bound on a submitted verification value. A recovery code is 19
 * characters (`XXXX-XXXX-XXXX-XXXX`); the generous headroom absorbs the
 * whitespace copy-paste adds before `normalizeRecoveryCode` strips it, and
 * keeps a hostile payload from ever reaching the HMAC or the digest
 * comparison.
 */
export const MFA_CODE_MAX_LENGTH = 64;

const TOTP_CODE_PATTERN = /^\d{6}$/;

/**
 * Encodes bytes as unpadded RFC 4648 base32.
 */
function base32Encode(data: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";

  for (const byte of data) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return out;
}

/**
 * Decodes RFC 4648 base32. Padding, letter case and whitespace are
 * tolerated (authenticator apps and copy-paste disagree about all three);
 * any other character is rejected so a corrupted seed never silently
 * verifies against the wrong key.
 */
function base32Decode(encoded: string): Buffer {
  const cleaned = encoded
    .replace(/[\s=]/g, "")
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, (character) => {
      throw new Error(`Invalid base32 character: ${character}`);
    });

  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const character of cleaned) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index === -1) {
      throw new Error("Invalid base32 character.");
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Length-safe constant-time string comparison. `timingSafeEqual` throws on
 * mismatched lengths, which would itself be a (minor) oracle for the code
 * length — the shape check already constrains both sides, but the guard
 * keeps the helper total.
 */
function timingSafeEqualStrings(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

/**
 * RFC 4226 HOTP: HMAC-SHA1 over the 8-byte big-endian counter, truncated
 * to `digits` decimal digits.
 */
function hotp(key: Buffer, counter: number, digits: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(Math.max(0, counter)));

  const digest = createHmac("sha1", key).update(counterBuffer).digest();
  const offset = (digest[digest.length - 1] as number) & 0x0f;
  const binary =
    (((digest[offset] as number) & 0x7f) << 24) |
    ((digest[offset + 1] as number) << 16) |
    ((digest[offset + 2] as number) << 8) |
    (digest[offset + 3] as number);

  return String(binary % 10 ** digits).padStart(digits, "0");
}

/**
 * Generates a fresh base32 TOTP seed for an enrollment.
 */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(TOTP_SECRET_BYTES));
}

/**
 * The current TOTP code for a base32 seed. Exported so tests (and the
 * enrollment round-trip) can produce the value an authenticator app would.
 */
export function generateTotpCode(
  secretBase32: string,
  atSeconds: number = Math.floor(Date.now() / 1000),
): string {
  const key = base32Decode(secretBase32);
  const counter = Math.floor(atSeconds / TOTP_PERIOD_SECONDS);
  return hotp(key, counter, TOTP_DIGITS);
}

/**
 * Verifies a 6-digit TOTP code against a base32 seed, accepting the
 * current step and ±`TOTP_WINDOW_STEPS` neighbouring steps.
 *
 * A malformed seed or a code that is not 6 digits fails closed with
 * `false`; no exception reaches the caller, because an exception path that
 * differs from a wrong-code path would be observable.
 */
export function verifyTotpCode(
  secretBase32: string,
  code: string,
  atSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!TOTP_CODE_PATTERN.test(code)) {
    return false;
  }

  let key: Buffer;
  try {
    key = base32Decode(secretBase32);
  } catch {
    return false;
  }
  if (key.length === 0) {
    return false;
  }

  const counter = Math.floor(atSeconds / TOTP_PERIOD_SECONDS);
  for (
    let offset = -TOTP_WINDOW_STEPS;
    offset <= TOTP_WINDOW_STEPS;
    offset += 1
  ) {
    const expected = hotp(key, counter + offset, TOTP_DIGITS);
    if (timingSafeEqualStrings(expected, code)) {
      return true;
    }
  }

  return false;
}

/**
 * Whether a submitted value has the shape of a TOTP code. Used to route a
 * submission to the TOTP check or to the recovery-code check — a recovery
 * code never has six decimal digits, so the two paths cannot collide.
 */
export function isTotpCodeShape(code: string): boolean {
  return TOTP_CODE_PATTERN.test(code);
}

/**
 * Formats 16 hex characters as `XXXX-XXXX-XXXX-XXXX`.
 */
function formatRecoveryCode(hex: string): string {
  const groups: string[] = [];
  for (let index = 0; index < hex.length; index += RECOVERY_CODE_GROUP_LENGTH) {
    groups.push(hex.slice(index, index + RECOVERY_CODE_GROUP_LENGTH));
  }
  return groups.join("-");
}

/**
 * Generates the ten single-use recovery codes handed out at enrollment
 * (SEC-06). They are shown to the account holder exactly once; only their
 * digests are ever persisted (FR-224).
 */
export function generateRecoveryCodes(
  count: number = RECOVERY_CODE_COUNT,
): string[] {
  const codes: string[] = [];
  for (let index = 0; index < count; index += 1) {
    codes.push(
      formatRecoveryCode(randomBytes(RECOVERY_CODE_BYTES).toString("hex").toUpperCase()),
    );
  }
  return codes;
}

/**
 * Canonical form of a recovery code as it is hashed: uppercased with every
 * separator removed, so `abcd-ef01-2345-6789`, `ABCDEF0123456789` and a
 * copy-pasted value with stray whitespace all hash identically.
 */
export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * SHA-256 digest of a recovery code in canonical form. Recovery codes are
 * high-entropy random material, so — exactly like the single-use account
 * tokens in `auth.token.ts` — a plain SHA-256 digest is sufficient and
 * keeps the digest indexable for the single-use conditional write.
 */
export function hashRecoveryCode(code: string): string {
  return createHash("sha256")
    .update(normalizeRecoveryCode(code), "utf8")
    .digest("hex");
}

/**
 * The `otpauth://` provisioning URI an authenticator app scans (REST
 * contract §2.1: "QR provisioning URI"). The client renders it as a QR
 * code; this module never produces an image.
 */
export function buildTotpProvisioningUri(input: {
  secret: string;
  account: string;
  issuer?: string;
}): string {
  const issuer = input.issuer ?? TOTP_ISSUER;
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(input.account)}`;
  const query = new URLSearchParams({
    secret: input.secret,
    issuer,
    algorithm: TOTP_ALGORITHM,
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}
