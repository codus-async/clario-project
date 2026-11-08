import type { RequestHandler } from "express";

import { AppError } from "../../errors/app-error.js";
import { ERROR_CODES } from "../../errors/error-codes.js";
import { checkHealth } from "./health.service.js";

export const getHealth: RequestHandler = async (_req, res) => {
  const result = await checkHealth();

  if (result.status !== "ok") {
    throw new AppError(
      ERROR_CODES.SERVICE_UNAVAILABLE,
      "One or more required service dependencies are unavailable.",
    );
  }

  res.status(200).json(result);
};
