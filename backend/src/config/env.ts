
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadEnv } from "dotenv";
import { z } from "zod";

const backendConfigDir = path.dirname(
  fileURLToPath(import.meta.url)
);
const repoRoot = path.resolve(
  backendConfigDir,
  "../../.."
);

loadEnv({
  path: path.join(repoRoot, ".env"),
});

const postgresUrlSchema = z
  .string()
  .url()
  .refine(
    (value) =>
      ["postgres:", "postgresql:"].includes(
        new URL(value).protocol
      ),
    "Must be a valid PostgreSQL connection URL"
  );

const redisUrlSchema = z
  .string()
  .url()
  .refine(
    (value) =>
      ["redis:", "rediss:"].includes(
        new URL(value).protocol
      ),
    "Must be a valid Redis connection URL"
  );

const timezoneSchema = z.string().refine(
  (value) => {
    try {
      new Intl.DateTimeFormat("en-US", {
        timeZone: value
      });

      return true;
    } catch {
      return false;
    }
  },
  "Must be a valid IANA timezone"
);

const positiveMinutes = z.coerce.number().int().positive();

/**
 * F-64 / F-65 configuration. Every authentication threshold and timeout stays
 * configuration-driven (implementation defaults §7, §11); the defaults below
 * are the values documented in clario_mvp_implementation_defaults.md §7 and
 * clario_mvp_system_design_and_architecture.md §4.1.
 */
export const EnvironmentSchema = z.object({
  NODE_ENV: z.enum([
    "development",
    "test",
    "production"
  ]),

  PORT: z.coerce.number().int().positive(),

  DATABASE_URL: postgresUrlSchema,

  DIRECT_URL: postgresUrlSchema,

  REDIS_URL: redisUrlSchema,

  LOG_LEVEL: z.enum([
    "fatal",
    "error",
    "warn",
    "info",
    "debug",
    "trace"
  ]),

  APP_TIMEZONE: timezoneSchema.default("Africa/Lagos"),

  /** Express `trust proxy` hop count used to derive the client IP (0 = disabled). */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),

  SESSION_ABSOLUTE_LIFETIME_MINUTES: positiveMinutes.default(720),

  SESSION_INACTIVITY_TIMEOUT_MINUTES_PLATFORM_ADMIN:
    positiveMinutes.default(30),
  SESSION_INACTIVITY_TIMEOUT_MINUTES_INSTITUTIONAL_ADMIN:
    positiveMinutes.default(30),
  SESSION_INACTIVITY_TIMEOUT_MINUTES_PROJECT_COORDINATOR:
    positiveMinutes.default(30),
  SESSION_INACTIVITY_TIMEOUT_MINUTES_PROJECT_SUPERVISOR:
    positiveMinutes.default(60),
  SESSION_INACTIVITY_TIMEOUT_MINUTES_PROJECT_EXAMINER:
    positiveMinutes.default(60),
  SESSION_INACTIVITY_TIMEOUT_MINUTES_STUDENT:
    positiveMinutes.default(60),

  LOGIN_MAX_FAILED_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_FAILURE_WINDOW_MINUTES: positiveMinutes.default(15),
  LOGIN_LOCKOUT_BASE_COOLDOWN_MINUTES: positiveMinutes.default(15),
  LOGIN_LOCKOUT_COOLDOWN_MULTIPLIER:
    z.coerce.number().min(1).default(2),
  LOGIN_LOCKOUT_MAX_COOLDOWN_MINUTES: positiveMinutes.default(60)
});

export type Environment = z.infer<
  typeof EnvironmentSchema
>;

const result = EnvironmentSchema.safeParse(process.env);

if (!result.success) {
  const errors = result.error.issues
    .map(
      (issue) =>
        `${issue.path.join(".")}: ${issue.message}`
    )
    .join("\n");

  throw new Error(
    `Invalid environment configuration:\n${errors}`
  );
}

export const env: Readonly<Environment> = Object.freeze(
  result.data
);
