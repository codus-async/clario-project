import { describe, expect, it } from "vitest";

import {
  PayloadCipher,
  PayloadCipherError,
} from "../../../infrastructure/security/payload-cipher.js";

const KEY = "Y2xhcmlvLWRldi1vbmx5LXBheWxvYWQta2V5LTAwMDA=";
const OTHER_KEY =
  "8J3vQ0hZ6dYl0m1kQ2wE5rT7yU9iO4pA6sD8fG0hJ2k=";
const AAD = "22222222-2222-4222-8222-222222222222|AUTH_PASSWORD_RESET_REQUESTED";

describe("PayloadCipher", () => {
  it("round-trips a secret", () => {
    const cipher = new PayloadCipher(KEY);
    const envelope = cipher.encrypt("s3cr3t-reset-token", AAD);

    expect(envelope).not.toContain("s3cr3t-reset-token");
    expect(cipher.decrypt(envelope, AAD)).toBe("s3cr3t-reset-token");
  });

  it("produces a different envelope for the same plaintext", () => {
    const cipher = new PayloadCipher(KEY);

    expect(cipher.encrypt("token", AAD)).not.toBe(cipher.encrypt("token", AAD));
  });

  it("refuses a payload that was encrypted for another account", () => {
    const cipher = new PayloadCipher(KEY);
    const envelope = cipher.encrypt("token", AAD);

    expect(() =>
      cipher.decrypt(envelope, "another-user|AUTH_PASSWORD_RESET_REQUESTED"),
    ).toThrow(PayloadCipherError);
  });

  it("refuses a payload that was tampered with", () => {
    const cipher = new PayloadCipher(KEY);
    const envelope = cipher.encrypt("token", AAD);
    const parts = envelope.split(".");
    const tampered = [parts[0], parts[1], parts[2], "dGFtcGVyZWQ"].join(".");

    expect(() => cipher.decrypt(tampered, AAD)).toThrow(PayloadCipherError);
  });

  it("refuses a payload encrypted with another key", () => {
    const envelope = new PayloadCipher(KEY).encrypt("token", AAD);

    expect(() =>
      new PayloadCipher(OTHER_KEY).decrypt(envelope, AAD),
    ).toThrow(PayloadCipherError);
  });

  it("refuses a malformed envelope", () => {
    const cipher = new PayloadCipher(KEY);

    expect(() => cipher.decrypt("not-an-envelope", AAD)).toThrow(
      PayloadCipherError,
    );
  });

  it("refuses a key that is not 32 bytes", () => {
    expect(() => new PayloadCipher("c2hvcnQta2V5LTAwMDAwMDA=")).toThrow(
      PayloadCipherError,
    );
  });

  it("refuses a key that is not canonical base64", () => {
    expect(() => new PayloadCipher("not base64 at all!!")).toThrow(
      PayloadCipherError,
    );
  });
});
