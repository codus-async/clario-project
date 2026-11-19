import type { UUID } from "@clario/shared-contracts";

import { env } from "../../config/env.js";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { baseLogger } from "../logging/logger.js";
import { prisma } from "../database/prisma.js";
import { PayloadCipher } from "../security/payload-cipher.js";
import type {
  EnrollMfaInput,
  MfaEnrollmentState,
  MfaRepository,
} from "../../modules/auth/auth.ports.js";

/**
 * AAD binding of the encrypted TOTP seed to its account row: the envelope
 * carried by another user (or another column) no longer decrypts, so a
 * copy/paste or a bad migration fails loudly instead of verifying against
 * the wrong account (same rationale as the outbox envelope AAD).
 */
function mfaSecretAad(userId: UUID): string {
  return `AUTH_MFA_TOTP|${userId}`;
}

function asStringDigests(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

/**
 * `users` MFA persistence (F-65, SEC-06, FR-224).
 *
 * The TOTP seed never touches the database in clear text: it is sealed
 * under `OUTBOX_PAYLOAD_ENCRYPTION_KEY` with the account-bound AAD above,
 * the same envelope machinery the outbox uses for live credentials. The ten
 * recovery codes are stored only as SHA-256 digests and are consumed with a
 * conditional write, so single-use is enforced by the database rather than
 * by read-then-write application logic.
 *
 * Like the rest of the auth module's user reads, this goes through the
 * plain Prisma client: `users` is deliberately not RLS-protected
 * (AGENTS.md §3.1) and is addressed by the session's own user id.
 */
export class PrismaMfaRepository implements MfaRepository {
  private readonly client: PrismaClient;
  private readonly cipher: PayloadCipher;

  constructor(
    client: PrismaClient = prisma,
    cipher: PayloadCipher = new PayloadCipher(
      env.OUTBOX_PAYLOAD_ENCRYPTION_KEY,
    ),
  ) {
    this.client = client;
    this.cipher = cipher;
  }

  async findEnrollment(userId: UUID): Promise<MfaEnrollmentState> {
    const row = await this.client.users.findUnique({
      where: { id: userId },
      select: { mfa_enrolled: true, mfa_secret_encrypted: true },
    });

    if (row === null || !row.mfa_enrolled) {
      return { enrolled: false, secret: null };
    }
    if (row.mfa_secret_encrypted === null) {
      // Enrolled without a seed — a corrupt row. Reported as enrolled with
      // an unusable seed so the service fails closed (503) rather than
      // inviting a re-enrollment over a broken setup.
      return { enrolled: true, secret: null };
    }

    try {
      return {
        enrolled: true,
        secret: this.cipher.decrypt(
          row.mfa_secret_encrypted,
          mfaSecretAad(userId),
        ),
      };
    } catch (error) {
      // `decrypt` fails only on a wrong key, a tampered envelope or an AAD
      // mismatch — all of which mean "seed unreadable", never "not
      // enrolled". Logged here so the 503 the service raises has a cause.
      baseLogger.error(
        { err: error, module: "auth", userId },
        "Failed to decrypt the stored MFA seed",
      );
      return { enrolled: true, secret: null };
    }
  }

  async enroll(input: EnrollMfaInput): Promise<boolean> {
    const envelope = this.cipher.encrypt(
      input.secret,
      mfaSecretAad(input.userId),
    );

    const result = await this.client.users.updateMany({
      where: { id: input.userId, account_status: "ACTIVE" },
      data: {
        mfa_enrolled: true,
        mfa_secret_encrypted: envelope,
        mfa_recovery_codes_hash: input.recoveryCodeHashes,
        updated_at: input.now,
      },
    });

    return result.count > 0;
  }

  /**
   * Single-use consumption (FR-224): the row is rewritten only while the
   * stored digest array still equals the one this call read. Two concurrent
   * submissions of the same code therefore cannot both consume it — the
   * loser's `updateMany` matches zero rows and reports `false`.
   */
  async consumeRecoveryCode(
    userId: UUID,
    codeDigest: string,
    now: Date,
  ): Promise<boolean> {
    const row = await this.client.users.findUnique({
      where: { id: userId },
      select: { mfa_recovery_codes_hash: true },
    });
    if (row === null || !Array.isArray(row.mfa_recovery_codes_hash)) {
      return false;
    }

    const stored = row.mfa_recovery_codes_hash;
    const digests = asStringDigests(stored);
    const index = digests.indexOf(codeDigest);
    if (index < 0) {
      return false;
    }

    const remaining = [
      ...digests.slice(0, index),
      ...digests.slice(index + 1),
    ];
    const result = await this.client.users.updateMany({
      where: {
        id: userId,
        // Compare against the *raw* stored value (not the filtered copy), so
        // a concurrent write to the same column invalidates this attempt.
        mfa_recovery_codes_hash: { equals: stored },
      },
      data: {
        mfa_recovery_codes_hash: remaining,
        updated_at: now,
      },
    });

    return result.count > 0;
  }

  async countRecoveryCodes(userId: UUID): Promise<number> {
    const row = await this.client.users.findUnique({
      where: { id: userId },
      select: { mfa_recovery_codes_hash: true },
    });
    if (row === null) {
      return 0;
    }
    return asStringDigests(row.mfa_recovery_codes_hash).length;
  }
}
