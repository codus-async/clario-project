
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

  APP_TIMEZONE: timezoneSchema.default("Africa/Lagos")
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
