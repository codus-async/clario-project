import { parse as parseCookie } from "cookie";
import { CLARIO_HTTP_HEADERS } from "@clario/shared-contracts";
import type { RequestHandler } from "express";

import { AppError } from "../../errors/app-error.js";
import { ERROR_CODES } from "../../errors/error-codes.js";
import { SESSION_COOKIE_NAME } from "./auth.config.js";
import type { AuthService } from "./auth.service.js";

/**
 * Reads the opaque session id from the `clario_sid` cookie (F-64, REST §2.1).
 * Exported for the F-66 PEP, which resolves the same credential set.
 */
export function readSessionCookie(
  cookieHeader: string | undefined,
): string | undefined {
  if (cookieHeader === undefined) {
    return undefined;
  }
  const value = parseCookie(cookieHeader)[SESSION_COOKIE_NAME];
  if (value === undefined || value.length === 0) {
    return undefined;
  }
  return value;
}

/**
 * Reads the session id from `Authorization: Bearer <session-id>`. Throws
 * `UNAUTHENTICATED` for a malformed header; the F-66 PEP normalizes that to
 * `UNAUTHORIZED_SESSION` on protected routes.
 */
export function readBearerSession(
  authorization: string | undefined,
): string | undefined {
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
  return async (req, res, next) => {
    try {
      const context = await authService.resolveSession({
        cookieSessionId: readSessionCookie(req.headers.cookie),
        bearerSessionId: readBearerSession(req.headers.authorization),
        ip: req.ip ?? "",
      });
      req.authContext = context;
      // The tenant is known now: return its authoritative timezone instead of
      // the platform default (REST contract §1.1, BR-NEW-01).
      res.setHeader(
        CLARIO_HTTP_HEADERS.INSTITUTION_TIMEZONE,
        context.institutionTimezone,
      );
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Route guard for endpoints that require a fully authenticated MFA state
 * (SEC-06, FR-048, FR-222): MFA verification is required when either the
 * account is flagged `mfa_required` or the session's active role is one of
 * `MANDATORY_MFA_ROLES`. Checking both matters because `mfaRequired` in the
 * session context can be true for an active role that is *not* on the
 * mandatory list (e.g. the account previously held an admin role).
 *
 * The rule itself lives in `AuthService.assertMfaSatisfied`; this middleware
 * only adapts it to the request/response cycle.
 */
export function createRequireMfaVerified(
  authService: AuthService,
): RequestHandler {
  return (req, _res, next) => {
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

    try {
      authService.assertMfaSatisfied(context);
    } catch (error) {
      next(error);
      return;
    }

    next();
  };
}
