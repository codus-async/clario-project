import type { ErrorRequestHandler } from "express";

import { AppError } from "../errors/app-error.js";
import { ERROR_METADATA } from "../errors/error-codes.js";
import type { ErrorResponse } from "../errors/problem-details.js";
import { env } from "../config/env.js";
import { getRequestLogger } from "../config/request-context.js";
import { baseLogger } from "../infrastructure/logging/logger.js";

/**
 * body-parser (express.json) failures — malformed JSON and oversized bodies —
 * arrive as plain Errors carrying `type`/`status` instead of AppError. They
 * are client errors and must surface as 4xx, not fall through to the 500
 * branch. Only the two documented body-parser types are mapped; anything else
 * keeps the unexpected-error behaviour below.
 */
function bodyParserErrorResponse(
  error: unknown,
): { status: number; code: "VALIDATION_ERROR" | "PAYLOAD_TOO_LARGE"; detail: string } | null {
  const candidate = error as { type?: unknown };
  if (typeof candidate.type !== "string") {
    return null;
  }
  if (candidate.type === "entity.parse.failed") {
    return {
      status: 400,
      code: "VALIDATION_ERROR",
      detail: "The request body is not valid JSON.",
    };
  }
  if (candidate.type === "entity.too.large") {
    return {
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
      detail: "The request body exceeds the configured size limit.",
    };
  }
  return null;
}

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  req,
  res,
  next,
): void => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const timestamp = new Date().toISOString();

  const institutionTimezone =
    res.getHeader("X-Clario-Institution-Timezone")?.toString() ??
    env.APP_TIMEZONE;

  if (error instanceof AppError) {
    const response: ErrorResponse = {
      error: {
        code: error.code,
        title: error.title,
        status: error.status,
        detail: error.message,
        instance: req.path,
        timestamp_utc: timestamp,
        institution_timezone: institutionTimezone,
        ...(error.fieldErrors
          ? { field_errors: error.fieldErrors }
          : {}),
      },
    };

    res.status(error.status).json(response);
    return;
  }

  const parserError = bodyParserErrorResponse(error);
  if (parserError !== null) {
    const parserResponse: ErrorResponse = {
      error: {
        code: parserError.code,
        title: ERROR_METADATA[parserError.code].title,
        status: parserError.status,
        detail: parserError.detail,
        instance: req.path,
        timestamp_utc: timestamp,
        institution_timezone: institutionTimezone,
      },
    };
    res.status(parserError.status).json(parserResponse);
    return;
  }

  const requestLogger = getRequestLogger() ?? baseLogger;

  requestLogger.error(
    {
      err: error,
      module: "error-handler",
      requestId: req.requestId,
      method: req.method,
      path: req.path,
    },
    "Unexpected application error",
  );

  const response: ErrorResponse = {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      title: "Internal Server Error",
      status: 500,
      detail: "An unexpected error occurred. Please try again later.",
      instance: req.path,
      timestamp_utc: timestamp,
      institution_timezone: institutionTimezone,
    },
  };

  res.status(500).json(response);
};
