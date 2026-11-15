import express, { type Express } from "express";

import { env } from "./config/env.js";
import { requestContextMiddleware } from "./middleware/request-context.middleware.js";
import { errorHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { authRouter } from "./modules/auth/auth.dependencies.js";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");

  // Derives the client IP used by the F-64 login protection counters.
  app.set("trust proxy", env.TRUST_PROXY_HOPS);

  app.use(requestContextMiddleware);
  app.use(express.json({ limit: "1mb" }));

  app.use("/health", healthRouter);
  app.use("/api/v1/auth", authRouter);

  app.use(errorHandler);

  return app;
}
