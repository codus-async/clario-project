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
import type { AccountService } from "./auth.account.service.js";
import type { LoginResult } from "./auth.types.js";
import type {
  ActivateRequestBody,
  LoginRequestBody,
  PasswordResetBody,
  PasswordResetRequestBody,
} from "./auth.schemas.js";
import { getValidatedBody } from "./auth.validation.js";

/**
 * Login payload, mapped to the documented F-64 response contract (REST
 * contract §2.1): the session identifier, the bound identity — including the
 * coordinator appointments the account is scoped to — the MFA state and the
 * inactivity timeout.
 */
function loginResponse(result: LoginResult): Record<string, unknown> {
  const { state } = result;
  const mfaPending = state.mfaRequired && !state.mfaVerified;
  return {
    session_id: state.sessionId,
    user: {
      id: state.userId,
      full_name: state.fullName,
      institution_id: state.institutionId,
      institution_code: state.institutionCode,
      timezone_iana: state.institutionTimezone,
      roles: state.assignedRoles,
      coordinator_appointments: state.coordinatorAppointments.map(
        (appointment) => ({
          appointment_id: appointment.appointmentId,
          programme_id: appointment.programmeId,
          programme_name: appointment.programmeName,
          academic_session_id: appointment.academicSessionId,
          session_label: appointment.academicSessionLabel,
        }),
      ),
    },
    active_role: state.activeRole,
    mfa_required: state.mfaRequired,
    mfa_enrolled: state.mfaEnrolled,
    mfa_verified: state.mfaVerified,
    /**
     * Tells the client what it has to do next. `MFA_CHALLENGE_REQUIRED`
     * means the session exists but has no full access until the MFA
     * challenge is completed (SEC-06); `null` means the session is ready.
     */
    next_step: mfaPending ? "MFA_CHALLENGE_REQUIRED" : null,
    inactivity_timeout_minutes: state.inactivityTimeoutMinutes,
    expires_at_utc: state.expiresAtUtc,
  };
}

export interface AuthControllerDeps {
  authService: AuthService;
  accountService: AccountService;
  config: AuthConfig;
}

export function createAuthController(deps: AuthControllerDeps): {
  login: RequestHandler;
  logout: RequestHandler;
  heartbeat: RequestHandler;
  activate: RequestHandler;
  requestPasswordReset: RequestHandler;
  resetPassword: RequestHandler;
} {
  const { authService, accountService, config } = deps;
  const cookieMaxAgeMs = config.absoluteLifetimeMinutes * 60_000;

  const login: RequestHandler = async (req, res) => {
    const body = getValidatedBody<LoginRequestBody>(req);

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
    // The login resolves the tenant, so the response carries the
    // institution's authoritative timezone (REST contract §1.1).
    res.setHeader(
      CLARIO_HTTP_HEADERS.INSTITUTION_TIMEZONE,
      result.state.institutionTimezone,
    );
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

  const activate: RequestHandler = async (req, res) => {
    const body = getValidatedBody<ActivateRequestBody>(req);

    const result = await accountService.activate({
      token: body.token,
      password: body.password,
    });

    res.status(200).json({
      success: true,
      user_id: result.userId,
      account_status: result.accountStatus,
      mfa_required: result.mfaRequired,
      mfa_enrolled: result.mfaEnrolled,
    });
  };

  const requestPasswordReset: RequestHandler = async (req, res) => {
    const body = getValidatedBody<PasswordResetRequestBody>(req);

    await accountService.requestPasswordReset({
      identifier: body.identifier,
      institutionCode: body.institutionCode,
    });

    /**
     * The response is identical whether or not an account matched: the
     * endpoint must not be usable to enumerate accounts (SEC-04).
     */
    res.status(202).json({
      success: true,
      message:
        "If the identifier matches an active account, a password reset link has been sent.",
    });
  };

  const resetPassword: RequestHandler = async (req, res) => {
    const body = getValidatedBody<PasswordResetBody>(req);

    await accountService.resetPassword({
      token: body.token,
      password: body.password,
    });

    res.status(200).json({ success: true });
  };

  return {
    login,
    logout,
    heartbeat,
    activate,
    requestPasswordReset,
    resetPassword,
  };
}
