import { afterEach, describe, expect, it, vi } from "vitest";

import { EnvironmentSchema } from "../../config/env.js";

const validEnv = {
  NODE_ENV: "test",
  PORT: "3000",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/clario",
  DIRECT_URL: "postgresql://user:pass@localhost:5432/clario",
  REDIS_URL: "redis://localhost:6379",
  LOG_LEVEL: "info",
};

describe("EnvironmentSchema", () => {
  it("accepts a valid configuration", () => {
    const result = EnvironmentSchema.safeParse(validEnv);

    expect(result.success).toBe(true);
  });

  it("rejects an invalid NODE_ENV", () => {
    const result = EnvironmentSchema.safeParse({
      ...validEnv,
      NODE_ENV: "staging",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a missing PORT", () => {
    const { PORT: _PORT, ...rest } = validEnv;
    const result = EnvironmentSchema.safeParse(rest);

    expect(result.success).toBe(false);
  });

  it("rejects a non-numeric PORT", () => {
    const result = EnvironmentSchema.safeParse({
      ...validEnv,
      PORT: "not-a-number",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a missing DATABASE_URL", () => {
    const { DATABASE_URL: _DATABASE_URL, ...rest } = validEnv;
    const result = EnvironmentSchema.safeParse(rest);

    expect(result.success).toBe(false);
  });

  it("rejects a non-PostgreSQL DATABASE_URL", () => {
    const result = EnvironmentSchema.safeParse({
      ...validEnv,
      DATABASE_URL: "mysql://user:pass@localhost:3306/clario",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a missing DIRECT_URL", () => {
    const { DIRECT_URL: _DIRECT_URL, ...rest } = validEnv;
    const result = EnvironmentSchema.safeParse(rest);

    expect(result.success).toBe(false);
  });

  it("rejects a missing REDIS_URL", () => {
    const { REDIS_URL: _REDIS_URL, ...rest } = validEnv;
    const result = EnvironmentSchema.safeParse(rest);

    expect(result.success).toBe(false);
  });

  it("rejects a non-Redis REDIS_URL", () => {
    const result = EnvironmentSchema.safeParse({
      ...validEnv,
      REDIS_URL: "http://localhost:6379",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid LOG_LEVEL", () => {
    const result = EnvironmentSchema.safeParse({
      ...validEnv,
      LOG_LEVEL: "verbose",
    });

    expect(result.success).toBe(false);
  });

  it("defaults APP_TIMEZONE when omitted", () => {
    const result = EnvironmentSchema.safeParse(validEnv);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.APP_TIMEZONE).toBe("Africa/Lagos");
    }
  });
});

describe("env module load", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("throws Invalid environment configuration when NODE_ENV is invalid", async () => {
    vi.stubEnv("NODE_ENV", "staging");
    vi.resetModules();

    await expect(import("../../config/env.js")).rejects.toThrow(
      /Invalid environment configuration/,
    );
  });

  it("throws Invalid environment configuration when PORT is not a number", async () => {
    vi.stubEnv("PORT", "not-a-port");
    vi.resetModules();

    await expect(import("../../config/env.js")).rejects.toThrow(
      /Invalid environment configuration/,
    );
  });

  it("throws Invalid environment configuration when LOG_LEVEL is invalid", async () => {
    vi.stubEnv("LOG_LEVEL", "verbose");
    vi.resetModules();

    await expect(import("../../config/env.js")).rejects.toThrow(
      /Invalid environment configuration/,
    );
  });
});
