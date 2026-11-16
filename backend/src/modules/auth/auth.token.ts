import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;

/**
 * Generates the cryptographically random, single-use token used by the
 * account activation (invitation) and the self-service password reset flows
 * (F-64).
 *
 * The raw value is only ever handed to the account holder; Clario persists
 * nothing but its digest (see {@link hashSingleUseToken}).
 */
export function generateSingleUseToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/**
 * Hashes a single-use token with SHA-256.
 *
 * The persisted columns (`invitation_token_hash` /
 * `password_reset_token_hash`) are `CHAR(64)`, which is exactly the length
 * of the hex digest, so the digest is stored verbatim. SHA-256 is used
 * instead of Argon2id because the token is high-entropy random material:
 * there is no low-entropy guessing attack for a slow KDF to blunt, and the
 * lookup must stay indexable.
 */
export function hashSingleUseToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
