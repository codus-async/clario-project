import { Router } from "express";

import { createAuthController } from "./auth.controller.js";
import type { AuthConfig } from "./auth.config.js";
import { createRequireSession } from "./auth.middleware.js";
import { emptyRequestBodySchema, loginRequestBodySchema } from "./auth.schemas.js";
import type { AuthService } from "./auth.service.js";
import { createBodyValidator } from "./auth.validation.js";

/**
 * F-64 authentication routes. Every registered route validates its request
 * body with the module's strict Zod schema before the controller runs
 * (F-64 §6). `POST /auth/activate` and the MFA endpoints are deliberately
 * not registered: they belong to later stages and must not be exposed as
 * placeholders.
 */
export function createAuthRouter(
  authService: AuthService,
  config: AuthConfig,
): Router {
  const controller = createAuthController({ authService, config });
  const requireSession = createRequireSession(authService);

  const router: Router = Router();

  router.post(
    "/login",
    createBodyValidator(loginRequestBodySchema),
    controller.login,
  );
  router.post(
    "/logout",
    createBodyValidator(emptyRequestBodySchema),
    requireSession,
    controller.logout,
  );
  router.post(
    "/session/heartbeat",
    createBodyValidator(emptyRequestBodySchema),
    requireSession,
    controller.heartbeat,
  );

  return router;
}
