import { MANDATORY_MFA_ROLES } from "@clario/shared-contracts";
import { parse as parseCookie } from "cookie";
import type { RequestHandler } from "express";

import { AppError } from "../../errors/app-error.js";
import { ERROR_CODES } from "../../errors/error-codes.js";
import { SESSION_COOKIE_NAME } from "./auth.config.js";
import type { AuthService } from "./auth.service.js";

function readSessionCookie(cookieHeader: string | undefined): string | undefined {
  if (cookieHeader === undefined) {
    return undefined;
  }
  const value = parseCookie(cookieHeader)[SESSION_COOKIE_NAME];
  if (value === undefined || value.length === 0) {
    return undefined;
  }
  return value;
}

function readBearerSession(authorization: string | undefined): string | undefined {
  if (authorization === undefined) {
    return undefined;
  }
  const separatorIndex = authorization.indexOf(" ");
  const scheme =
    separatorIndex === -1
      ? authorization
      : authorization.slice(0, separatorIndex);
  const value =
    separatorIndex === -1
      ? ""
      : authorization.slice(separatorIndex + 1).trim();

  if (scheme.toLowerCase() !== "bearer" || value.length === 0) {
    throw new AppError(
      ERROR_CODES.UNAUTHENTICATED,
      "The Authorization header must use the Bearer scheme with a session token.",
    );
  }
  return value;
}

/**
 * Session middleware for protected routes (F-64, SEC-07). Accepts either the
 * `clario_sid` cookie or `Authorization: Bearer <session-id>`, resolves the
 * server-side session and attaches it to `req.authContext`.
 *
 * It deliberately does **not** enforce MFA verification: `/auth/mfa/*`
 * endpoints must stay reachable for `PRE_MFA` sessions (F-65). Routes that
 * require a fully verified session stack {@link createRequireMfaVerified}
 * after this middleware.
 */
export function createRequireSession(
  authService: AuthService,
): RequestHandler {
  return async (req, _res, next) => {
    try {
      const context = await authService.resolveSession({
        cookieSessionId: readSessionCookie(req.headers.cookie),
        bearerSessionId: readBearerSession(req.headers.authorization),
        ip: req.ip ?? "",
      });
      req.authContext = context;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Route guard for endpoints that require a fully authenticated MFA state
 * (SEC-06, FR-048): the active role must either not require MFA or the
 * session must have completed MFA verification.
 */
export const createRequireMfaVerified: RequestHandler = (req, _res, next) => {
  const context = req.authContext;
  if (context === undefined) {
    next(
      new AppError(
        ERROR_CODES.UNAUTHENTICATED,
        "Authentication credentials were not provided.",
      ),
    );
    return;
  }

  if (
    MANDATORY_MFA_ROLES.includes(context.activeRole) &&
    !context.mfaVerified
  ) {
    next(
      new AppError(
        ERROR_CODES.MFA_CHALLENGE_REQUIRED,
        "MFA verification is required before this action can be performed.",
      ),
    );
    return;
  }

  next();
};
