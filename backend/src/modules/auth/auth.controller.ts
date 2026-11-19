import { CLARIO_HTTP_HEADERS, MANDATORY_MFA_ROLES } from "@clario/shared-contracts";
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
  MfaVerifyRequestBody,
  PasswordResetBody,
  PasswordResetRequestBody,
  SessionContextRequestBody,
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
  mfaEnroll: RequestHandler;
  mfaVerify: RequestHandler;
  sessionContext: RequestHandler;
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

  /**
   * `POST /api/v1/auth/mfa/enroll` (F-65 §2.1): 201 with the seed, the
   * `otpauth://` URI for the QR code, and the ten recovery codes — the only
   * time any of them are ever returned.
   */
  const mfaEnroll: RequestHandler = async (req, res) => {
    const context = req.authContext;
    if (context === undefined) {
      throw new AppError(
        ERROR_CODES.UNAUTHENTICATED,
        "Authentication credentials were not provided.",
      );
    }

    const result = await authService.enrollMfa(context.sessionId);

    res.status(201).json({
      secret: result.secret,
      provisioning_uri: result.provisioningUri,
      recovery_codes: result.recoveryCodes,
    });
  };

  /**
   * `POST /api/v1/auth/mfa/verify` (F-65 §2.2): completes the challenge and
   * upgrades the session; the response carries the new session lifetime and
   * how many recovery codes remain unused.
   */
  const mfaVerify: RequestHandler = async (req, res) => {
    const context = req.authContext;
    if (context === undefined) {
      throw new AppError(
        ERROR_CODES.UNAUTHENTICATED,
        "Authentication credentials were not provided.",
      );
    }

    const body = getValidatedBody<MfaVerifyRequestBody>(req);

    const result = await authService.verifyMfa({
      sessionId: context.sessionId,
      code: body.totpCode,
      ip: req.ip ?? "",
    });

    res.status(200).json({
      session_id: result.sessionId,
      recovery_codes_remaining: result.recoveryCodesRemaining,
      expires_at_utc: result.expiresAtUtc,
      inactivity_timeout_minutes: result.inactivityTimeoutMinutes,
    });
  };

  /**
   * `PUT /api/v1/auth/session/context` (F-65 §3): switches the active role
   * (and, for coordinators, the bound appointment). `next_step` is
   * recomputed against the *live* mandatory-MFA rule, because switching
   * into a `MANDATORY_MFA_ROLES` role can make an unverified session
   * subject to the challenge even though login did not require it.
   */
  const sessionContext: RequestHandler = async (req, res) => {
    const context = req.authContext;
    if (context === undefined) {
      throw new AppError(
        ERROR_CODES.UNAUTHENTICATED,
        "Authentication credentials were not provided.",
      );
    }

    const body = getValidatedBody<SessionContextRequestBody>(req);

    const result = await authService.updateSessionContext({
      sessionId: context.sessionId,
      targetRole: body.targetRole,
      coordinatorAppointmentId: body.coordinatorAppointmentId,
    });

    const mfaMandatory =
      result.mfaRequired || MANDATORY_MFA_ROLES.includes(result.activeRole);

    res.status(200).json({
      session_id: result.sessionId,
      active_role: result.activeRole,
      active_coordinator_scope:
        result.activeCoordinatorScope === null
          ? null
          : {
              appointment_id: result.activeCoordinatorScope.appointmentId,
              programme_id: result.activeCoordinatorScope.programmeId,
              programme_name: result.activeCoordinatorScope.programmeName,
              academic_session_id:
                result.activeCoordinatorScope.academicSessionId,
              session_label: result.activeCoordinatorScope.academicSessionLabel,
            },
      mfa_required: result.mfaRequired,
      mfa_verified: result.mfaVerified,
      next_step:
        mfaMandatory && !result.mfaVerified
          ? "MFA_CHALLENGE_REQUIRED"
          : null,
      inactivity_timeout_minutes: result.inactivityTimeoutMinutes,
      expires_at_utc: result.expiresAtUtc,
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
    mfaEnroll,
    mfaVerify,
    sessionContext,
    activate,
    requestPasswordReset,
    resetPassword,
  };
}
