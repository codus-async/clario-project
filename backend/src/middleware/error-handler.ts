import type { ErrorRequestHandler } from "express";

import { AppError } from "../errors/app-error.js";
import type { ErrorResponse } from "../errors/problem-details.js";
import { env } from "../config/env.js";
import { getRequestLogger } from "../config/request-context.js";
import { baseLogger } from "../infrastructure/logging/logger.js";

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
