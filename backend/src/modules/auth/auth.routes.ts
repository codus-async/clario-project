import { Router } from "express";

import { createAuthController } from "./auth.controller.js";
import type { AuthConfig } from "./auth.config.js";
import { createRequireSession } from "./auth.middleware.js";
import {
  activateRequestBodySchema,
  emptyRequestBodySchema,
  loginRequestBodySchema,
  mfaEnrollRequestBodySchema,
  mfaVerifyRequestBodySchema,
  passwordResetBodySchema,
  passwordResetRequestBodySchema,
  sessionContextRequestBodySchema,
} from "./auth.schemas.js";
import type { AuthService } from "./auth.service.js";
import type { AccountService } from "./auth.account.service.js";
import { createBodyValidator } from "./auth.validation.js";

/**
 * F-64/F-65 authentication routes. Every registered route validates its
 * request body with the module's strict Zod schema before the controller
 * runs (F-64 §6).
 *
 * The two MFA endpoints and the context switch sit behind `requireSession`
 * only — never the MFA gate — because a `PRE_MFA` session must be able to
 * reach `/mfa/enroll` and `/mfa/verify`; `createRequireSession` resolves the
 * session without demanding `mfa_verified`, and `createRequireMfaVerified`
 * stays available for the routes that do (F-65 §4).
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
    "/mfa/enroll",
    createBodyValidator(mfaEnrollRequestBodySchema),
    requireSession,
    controller.mfaEnroll,
  );
  router.post(
    "/mfa/verify",
    createBodyValidator(mfaVerifyRequestBodySchema),
    requireSession,
    controller.mfaVerify,
  );
  router.put(
    "/session/context",
    createBodyValidator(sessionContextRequestBodySchema),
    requireSession,
    controller.sessionContext,
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
