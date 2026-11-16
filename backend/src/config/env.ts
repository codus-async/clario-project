
import { Buffer } from "node:buffer";
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
 * The development-only key that ships in `.env.example`. It is a valid
 * 32-byte key so a fresh checkout boots, and it is rejected outright in
 * production — a deployment that still carries it is refused at startup
 * rather than silently encrypting live credentials with a public key.
 */
export const PAYLOAD_ENCRYPTION_KEY_PLACEHOLDER =
  "Y2xhcmlvLWRldi1vbmx5LXBheWxvYWQta2V5LTAwMDA=";

/**
 * Base64-encoded 32-byte key that encrypts the secrets carried by
 * transactional-outbox payloads (F-71). A single-use password-reset token
 * is a live credential, so it must never be readable in the database.
 */
const payloadEncryptionKeySchema = z
  .string()
  .min(1, "OUTBOX_PAYLOAD_ENCRYPTION_KEY is required.")
  .refine((value) => {
    const decoded = Buffer.from(value, "base64");
    return decoded.length === 32 && decoded.toString("base64") === value;
  }, "Must be a base64-encoded 32-byte key.");

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

  /** Lifetime of the single-use self-service password-reset token. */
  PASSWORD_RESET_TOKEN_TTL_MINUTES: positiveMinutes.default(30),

  /**
   * Base64-encoded 32-byte key used to encrypt the secrets carried by the
   * transactional outbox (F-71). Required in every environment: the
   * password-reset token must never sit in the database in clear text.
   */
  OUTBOX_PAYLOAD_ENCRYPTION_KEY: payloadEncryptionKeySchema,

  LOGIN_MAX_FAILED_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_FAILURE_WINDOW_MINUTES: positiveMinutes.default(15),
  LOGIN_LOCKOUT_BASE_COOLDOWN_MINUTES: positiveMinutes.default(15),
  LOGIN_LOCKOUT_COOLDOWN_MULTIPLIER:
    z.coerce.number().min(1).default(2),
  LOGIN_LOCKOUT_MAX_COOLDOWN_MINUTES: positiveMinutes.default(60),

  /**
   * Upper bound on in-flight Argon2id verifications per client IP and per
   * login identifier. Reservations are taken *before* the KDF runs so a burst
   * of concurrent logins cannot exhaust backend memory (review finding P1).
   */
  LOGIN_MAX_CONCURRENT_VERIFICATIONS: z.coerce
    .number()
    .int()
    .positive()
    .default(5),

  /**
   * Process-wide cap on in-flight Argon2id verifications. Bounds total memory
   * even when a distributed attack uses many distinct IPs/identifiers.
   */
  LOGIN_MAX_CONCURRENT_VERIFICATIONS_GLOBAL: z.coerce
    .number()
    .int()
    .positive()
    .default(16)
}).superRefine((data, ctx) => {
  // `cooldownSecondsFor` computes min(base × multiplier^n, max); a base above
  // the max would silently never apply, so reject the misconfiguration at
  // startup instead.
  if (
    data.LOGIN_LOCKOUT_MAX_COOLDOWN_MINUTES <
    data.LOGIN_LOCKOUT_BASE_COOLDOWN_MINUTES
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["LOGIN_LOCKOUT_MAX_COOLDOWN_MINUTES"],
      message:
        "must be >= LOGIN_LOCKOUT_BASE_COOLDOWN_MINUTES (the base cooldown would never apply otherwise)",
    });
  }

  if (
    data.NODE_ENV === "production" &&
    data.OUTBOX_PAYLOAD_ENCRYPTION_KEY ===
      PAYLOAD_ENCRYPTION_KEY_PLACEHOLDER
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["OUTBOX_PAYLOAD_ENCRYPTION_KEY"],
      message:
        "must not be the documented development placeholder in production (generate one with: node -e \"console.log(require('node:crypto').randomBytes(32).toString('base64'))\")",
    });
  }
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
