import { CLARIO_HTTP_HEADERS } from "@clario/shared-contracts";
import type { RequestHandler } from "express";

import { AppError } from "../../errors/app-error.js";
import { ERROR_CODES } from "../../errors/error-codes.js";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  type AuthConfig,
} from "./auth.config.js";
import type { AuthService } from "./auth.service.js";
import type { LoginResult } from "./auth.types.js";

interface LoginBody {
  identifier: string;
  password: string;
  institutionCode?: string;
}

/**
 * Narrows the raw JSON body without Zod: full schema validation (including
 * unknown-field rejection) is the dedicated F-64 validation stage and is
 * deliberately not implemented here.
 */
function parseLoginBody(body: unknown): LoginBody {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      "A JSON object request body is required.",
    );
  }

  const record = body as Record<string, unknown>;
  const { identifier, password, institutionCode } = record;

  if (identifier === undefined) {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      "identifier is required.",
      [{ field: "identifier", message: "identifier is required." }],
    );
  }
  if (typeof identifier !== "string") {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      "identifier must be a string.",
      [{ field: "identifier", message: "identifier must be a string." }],
    );
  }

  if (password === undefined) {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      "password is required.",
      [{ field: "password", message: "password is required." }],
    );
  }
  if (typeof password !== "string") {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      "password must be a string.",
      [{ field: "password", message: "password must be a string." }],
    );
  }

  if (institutionCode !== undefined && typeof institutionCode !== "string") {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      "institutionCode must be a string.",
      [
        {
          field: "institutionCode",
          message: "institutionCode must be a string.",
        },
      ],
    );
  }

  return {
    identifier,
    password,
    ...(typeof institutionCode === "string"
      ? { institutionCode }
      : {}),
  };
}

/**
 * Login payload. The documented final response mapping (implementation
 * prompt stage "F-64 response") is a later stage; this route returns the
 * session identifier, bound identity, MFA state and inactivity timeout only.
 */
function loginResponse(result: LoginResult): Record<string, unknown> {
  const { state } = result;
  return {
    session_id: state.sessionId,
    user: {
      id: state.userId,
      full_name: state.fullName,
      institution_id: state.institutionId,
      institution_code: state.institutionCode,
      timezone_iana: state.institutionTimezone,
      roles: state.assignedRoles,
    },
    active_role: state.activeRole,
    mfa_required: state.mfaRequired,
    mfa_enrolled: state.mfaEnrolled,
    mfa_verified: state.mfaVerified,
    inactivity_timeout_minutes: state.inactivityTimeoutMinutes,
    expires_at_utc: state.expiresAtUtc,
  };
}

export interface AuthControllerDeps {
  authService: AuthService;
  config: AuthConfig;
}

export function createAuthController(deps: AuthControllerDeps): {
  login: RequestHandler;
  logout: RequestHandler;
  heartbeat: RequestHandler;
} {
  const { authService, config } = deps;
  const cookieMaxAgeMs = config.absoluteLifetimeMinutes * 60_000;

  const login: RequestHandler = async (req, res) => {
    const body = parseLoginBody(req.body);

    const result = await authService.login({
      identifier: body.identifier,
      password: body.password,
      institutionCode: body.institutionCode,
      activeRoleHeader:
        req.get(CLARIO_HTTP_HEADERS.ACTIVE_ROLE) ?? undefined,
      coordinatorAppointmentHeader:
        req.get(CLARIO_HTTP_HEADERS.COORDINATOR_APPOINTMENT_ID) ?? undefined,
      ip: req.ip ?? "",
      userAgent: req.get("user-agent") ?? undefined,
    });

    res.cookie(SESSION_COOKIE_NAME, result.sessionId, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: cookieMaxAgeMs,
    });
    res.status(200).json(loginResponse(result));
  };

  const logout: RequestHandler = async (req, res) => {
    const context = req.authContext;
    if (context === undefined) {
      throw new AppError(
        ERROR_CODES.UNAUTHENTICATED,
        "Authentication credentials were not provided.",
      );
    }

    await authService.logout(context.sessionId);

    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: SESSION_COOKIE_OPTIONS.httpOnly,
      secure: SESSION_COOKIE_OPTIONS.secure,
      sameSite: SESSION_COOKIE_OPTIONS.sameSite,
      path: SESSION_COOKIE_OPTIONS.path,
    });
    res.status(200).json({ success: true });
  };

  const heartbeat: RequestHandler = async (req, res) => {
    const context = req.authContext;
    if (context === undefined) {
      throw new AppError(
        ERROR_CODES.UNAUTHENTICATED,
        "Authentication credentials were not provided.",
      );
    }

    const result = await authService.heartbeat(context.sessionId);

    res.status(200).json({
      session_id: result.sessionId,
      expires_at_utc: result.expiresAtUtc,
      inactivity_timeout_minutes: result.inactivityTimeoutMinutes,
    });
  };

  return { login, logout, heartbeat };
}
