import pino, { type Logger } from "pino";
import { env } from "../../config/env.js";

const baseLogger = pino({
  level: env.LOG_LEVEL,

  base: {
    service: "clario-api",
    environment: env.NODE_ENV,
  },

  timestamp: pino.stdTimeFunctions.isoTime,

  redact: {
    paths: [
      "password",
      "*.password",
      "authorization",
      "*.authorization",
      "cookie",
      "*.cookie",
      "set-cookie",
      "*.set-cookie",
      "accessToken",
      "*.accessToken",
      "refreshToken",
      "*.refreshToken",
      "DATABASE_URL",
      "DIRECT_URL",
      "REDIS_URL",
    ],
    censor: "[REDACTED]",
  },
});

export function getLogger(moduleName: string): Logger {
  return baseLogger.child({
    module: moduleName,
  });
}

export { baseLogger };
