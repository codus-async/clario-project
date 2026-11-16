import { Router } from "express";

import { createAuthController } from "./auth.controller.js";
import type { AuthConfig } from "./auth.config.js";
import { createRequireSession } from "./auth.middleware.js";
import {
  activateRequestBodySchema,
  emptyRequestBodySchema,
  loginRequestBodySchema,
  passwordResetBodySchema,
  passwordResetRequestBodySchema,
} from "./auth.schemas.js";
import type { AuthService } from "./auth.service.js";
import type { AccountService } from "./auth.account.service.js";
import { createBodyValidator } from "./auth.validation.js";

/**
 * F-64 authentication routes. Every registered route validates its request
 * body with the module's strict Zod schema before the controller runs
 * (F-64 §6). The MFA endpoints are deliberately not registered: they belong
 * to F-65 and must not be exposed as placeholders.
 */
export function createAuthRouter(
  authService: AuthService,
  accountService: AccountService,
  config: AuthConfig,
): Router {
  const controller = createAuthController({ authService, accountService, config });
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
  router.post(
    "/activate",
    createBodyValidator(activateRequestBodySchema),
    controller.activate,
  );
  router.post(
    "/password/forgot",
    createBodyValidator(passwordResetRequestBodySchema),
    controller.requestPasswordReset,
  );
  router.post(
    "/password/reset",
    createBodyValidator(passwordResetBodySchema),
    controller.resetPassword,
  );

  return router;
}
