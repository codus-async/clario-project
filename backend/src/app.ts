import express, { type Express } from "express";

import { requestContextMiddleware } from "./middleware/request-context.middleware.js";
import { errorHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./modules/health/health.routes.js";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");

  app.use(requestContextMiddleware);
  app.use(express.json({ limit: "1mb" }));

  app.use("/health", healthRouter);

  app.use(errorHandler);

  return app;
}
