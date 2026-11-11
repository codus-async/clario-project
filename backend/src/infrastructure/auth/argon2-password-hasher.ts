import { randomBytes } from "node:crypto";

import { Algorithm, hash, verify } from "@node-rs/argon2";

import type { PasswordHasher } from "../../modules/auth/auth.ports.js";

/**
 * Argon2id parameters mandated by the architecture document
 * (clario_mvp_system_design_and_architecture.md §4): memory 64 MiB
 * (65536 KiB), time cost 3, parallelism 4.
 */
const ARGON2ID_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 4,
} as const;

export class Argon2PasswordHasher implements PasswordHasher {
  private dummyHash: Promise<string> | null = null;

  hash(plain: string): Promise<string> {
    return hash(plain, ARGON2ID_OPTIONS);
  }

  async verify(storedHash: string, plain: string): Promise<boolean> {
    try {
      return await verify(storedHash, plain);
    } catch {
      // Malformed or truncated hashes are treated as a mismatch rather than
      // an infrastructure failure.
      return false;
    }
  }

  async verifyDummy(plain: string): Promise<boolean> {
    this.dummyHash ??= hash(
      randomBytes(16).toString("hex"),
      ARGON2ID_OPTIONS,
    );
    try {
      await verify(await this.dummyHash, plain);
    } catch {
      // The result is irrelevant; only the work performed matters.
    }
    return false;
  }
}
