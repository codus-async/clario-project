import { performance } from "node:perf_hooks";
import type { Request, Response, NextFunction } from "express";

import { runWithRequestLogger } from "../config/request-context.js";
import { baseLogger } from "../infrastructure/logging/logger.js";
import { CLARIO_HTTP_HEADERS } from "@clario/shared-contracts";
import { createRequestId } from "../utils/request.id.js";

export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const incomingRequestId = req.get(CLARIO_HTTP_HEADERS.REQUEST_ID);
  const requestId = createRequestId(incomingRequestId);

  req.requestId = requestId;

  res.setHeader(CLARIO_HTTP_HEADERS.REQUEST_ID, requestId);

  const requestLogger = baseLogger.child({ requestId });

  const startedAt = performance.now();

  res.on("finish", () => {
    requestLogger.info(
      {
        module: "http",
        method: req.method,
        statusCode: res.statusCode,
        responseTimeMs: Math.round(performance.now() - startedAt),
      },
      "Request completed",
    );
  });

  runWithRequestLogger(requestLogger, next);
}
