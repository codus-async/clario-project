import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

/**
 * Envelope encryption for the secrets carried by the transactional outbox
 * (F-71 / AGENTS.md §3.6).
 *
 * The outbox is a plain table: every row that has an `institution_id` can be
 * read by the application role, and the rows are only flagged `processed` —
 * they are never deleted. A payload that carries a live credential (the
 * single-use password-reset token) therefore stays readable for as long as
 * the table keeps the row, and to every backup of the database.
 *
 * The credential is encrypted with AES-256-GCM under an application secret
 * (`OUTBOX_PAYLOAD_ENCRYPTION_KEY`). GCM is authenticated, so a tampered
 * payload fails to decrypt instead of yielding a corrupted token.
 *
 * The *additional authenticated data* binds a ciphertext to the account and
 * event type it was issued for — the `aggregate_id` / `event_type` pair the
 * caller passes in. A payload copied into another account's row, or into a
 * row of a different event type, no longer decrypts. It is deliberately not
 * a per-row binding: any row of the same account with the same event type
 * decrypts the envelope, so the relay reads that pair from the row it
 * dispatches rather than expecting a row-unique key.
 *
 * The envelope is self-describing so the format can be rotated later:
 *
 * ```text
 * v1.<iv>.<auth-tag>.<ciphertext>   (base64url, no padding)
 * ```
 */
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH_BYTES = 32;
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const VERSION = "v1";
const SEPARATOR = ".";

/**
 * Raised when a payload cannot be encrypted or decrypted — a wrong key, a
 * truncated envelope or a tampered ciphertext. The message never contains
 * the plaintext.
 */
export class PayloadCipherError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PayloadCipherError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Decodes the configured key. The key must be exactly 32 bytes, encoded as
 * canonical base64 (no line breaks, no padding tricks) so a truncated or
 * mistyped secret fails loudly at boot instead of silently weakening the
 * cipher.
 */
function decodeKey(base64Key: string): Buffer {
  if (typeof base64Key !== "string" || base64Key.length === 0) {
    throw new PayloadCipherError(
      "The payload encryption key must be a non-empty base64 string.",
    );
  }

  const key = Buffer.from(base64Key, "base64");
  if (key.length !== KEY_LENGTH_BYTES) {
    throw new PayloadCipherError(
      `The payload encryption key must decode to ${String(KEY_LENGTH_BYTES)} bytes, got ${String(key.length)}.`,
    );
  }

  if (key.toString("base64") !== base64Key) {
    throw new PayloadCipherError(
      "The payload encryption key must be canonical base64.",
    );
  }

  return key;
}

export class PayloadCipher {
  private readonly key: Buffer;

  constructor(base64Key: string) {
    this.key = decodeKey(base64Key);
  }

  /**
   * Encrypts `plaintext` and returns the self-describing envelope. `aad` is
   * the additional authenticated data (the owning outbox row's identity).
   */
  encrypt(plaintext: string, aad: string): string {
    const iv = randomBytes(IV_LENGTH_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH_BYTES,
    });
    cipher.setAAD(Buffer.from(aad, "utf8"));

    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);

    return [
      VERSION,
      iv.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      ciphertext.toString("base64url"),
    ].join(SEPARATOR);
  }

  /**
   * Decrypts an envelope produced by {@link encrypt}. Throws
   * {@link PayloadCipherError} when the envelope is malformed, the key is
   * wrong, the AAD does not match or the ciphertext was tampered with.
   */
  decrypt(envelope: string, aad: string): string {
    const parts = typeof envelope === "string" ? envelope.split(SEPARATOR) : [];
    if (parts.length !== 4) {
      throw new PayloadCipherError(
        "The encrypted payload envelope is malformed.",
      );
    }

    const [version, ivPart, tagPart, ciphertextPart] = parts as [
      string,
      string,
      string,
      string,
    ];
    if (version !== VERSION) {
      throw new PayloadCipherError(
        `Unsupported encrypted payload version "${version}".`,
      );
    }

    const iv = Buffer.from(ivPart, "base64url");
    const authTag = Buffer.from(tagPart, "base64url");
    const ciphertext = Buffer.from(ciphertextPart, "base64url");
    if (
      iv.length !== IV_LENGTH_BYTES ||
      authTag.length !== AUTH_TAG_LENGTH_BYTES
    ) {
      throw new PayloadCipherError(
        "The encrypted payload envelope is malformed.",
      );
    }

    try {
      const decipher = createDecipheriv(ALGORITHM, this.key, iv, {
        authTagLength: AUTH_TAG_LENGTH_BYTES,
      });
      decipher.setAAD(Buffer.from(aad, "utf8"));
      decipher.setAuthTag(authTag);

      return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString("utf8");
    } catch (error) {
      throw new PayloadCipherError(
        "The encrypted payload could not be decrypted.",
        { cause: error },
      );
    }
  }
}
