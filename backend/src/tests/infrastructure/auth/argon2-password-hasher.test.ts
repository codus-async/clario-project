import { beforeEach, describe, expect, it, vi } from "vitest";

const controls = vi.hoisted(() => ({ failNextHash: false, hashCalls: 0 }));

vi.mock("@node-rs/argon2", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@node-rs/argon2")>();
  return {
    ...actual,
    hash: async (...args: Parameters<typeof actual.hash>) => {
      controls.hashCalls += 1;
      if (controls.failNextHash) {
        controls.failNextHash = false;
        throw new Error("simulated allocation failure");
      }
      return actual.hash(...args);
    },
  };
});

import { Argon2PasswordHasher } from "../../../infrastructure/auth/argon2-password-hasher.js";

describe("Argon2PasswordHasher.verifyDummy", () => {
  beforeEach(() => {
    controls.failNextHash = false;
    controls.hashCalls = 0;
  });

  it("retries the dummy hash after a rejected computation", async () => {
    const hasher = new Argon2PasswordHasher();
    controls.failNextHash = true;

    // First call: the hash computation fails. verifyDummy still resolves
    // false and must not cache the rejected promise.
    await expect(hasher.verifyDummy("anything")).resolves.toBe(false);
    expect(controls.hashCalls).toBe(1);

    // Second call recomputes instead of awaiting the cached rejection, which
    // would otherwise resolve in microseconds and reveal (by timing) that no
    // account matched.
    await expect(hasher.verifyDummy("anything")).resolves.toBe(false);
    expect(controls.hashCalls).toBe(2);
  });
});
