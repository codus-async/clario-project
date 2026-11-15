import { Router } from "express";

import { createAuthController } from "./auth.controller.js";
import type { AuthConfig } from "./auth.config.js";
import { createRequireSession } from "./auth.middleware.js";
import type { AuthService } from "./auth.service.js";

/**
 * F-64 authentication routes. `POST /auth/activate` and the MFA endpoints are
 * deliberately not registered: they belong to later stages and must not be
 * exposed as placeholders.
 */
export function createAuthRouter(
  authService: AuthService,
  config: AuthConfig,
): Router {
  const controller = createAuthController({ authService, config });
  const requireSession = createRequireSession(authService);

  const router: Router = Router();

  router.post("/login", controller.login);
  router.post("/logout", requireSession, controller.logout);
  router.post("/session/heartbeat", requireSession, controller.heartbeat);

  return router;
}
