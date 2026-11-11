import { RoleCode } from "@clario/shared-contracts";

import type { Environment } from "../../config/env.js";

/**
 * Session cookie name documented for F-64 / F-65
 * (clario_mvp_rest_and_openapi_contract_specification.md §2.1).
 */
export const SESSION_COOKIE_NAME = "clario_sid";

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
};

export interface LoginProtectionConfig {
  maxFailedAttempts: number;
  failureWindowMinutes: number;
  baseCooldownMinutes: number;
  cooldownMultiplier: number;
  maxCooldownMinutes: number;
}

export interface AuthConfig {
  absoluteLifetimeMinutes: number;
  inactivityTimeoutMinutesByRole: Readonly<Record<RoleCode, number>>;
  protection: LoginProtectionConfig;
}

function inactivityTimeouts(env: Environment): Record<RoleCode, number> {
  return {
    [RoleCode.PLATFORM_ADMIN]:
      env.SESSION_INACTIVITY_TIMEOUT_MINUTES_PLATFORM_ADMIN,
    [RoleCode.INSTITUTIONAL_ADMIN]:
      env.SESSION_INACTIVITY_TIMEOUT_MINUTES_INSTITUTIONAL_ADMIN,
    [RoleCode.PROJECT_COORDINATOR]:
      env.SESSION_INACTIVITY_TIMEOUT_MINUTES_PROJECT_COORDINATOR,
    [RoleCode.PROJECT_SUPERVISOR]:
      env.SESSION_INACTIVITY_TIMEOUT_MINUTES_PROJECT_SUPERVISOR,
    [RoleCode.PROJECT_EXAMINER]:
      env.SESSION_INACTIVITY_TIMEOUT_MINUTES_PROJECT_EXAMINER,
    [RoleCode.STUDENT]: env.SESSION_INACTIVITY_TIMEOUT_MINUTES_STUDENT,
  };
}

/**
 * Builds the F-64 authentication configuration from validated environment
 * settings. All thresholds stay configuration-driven; the values are the
 * documented MVP defaults (implementation defaults §7, architecture §4.1).
 */
export function resolveAuthConfig(env: Environment): AuthConfig {
  return Object.freeze({
    absoluteLifetimeMinutes: env.SESSION_ABSOLUTE_LIFETIME_MINUTES,
    inactivityTimeoutMinutesByRole: Object.freeze(inactivityTimeouts(env)),
    protection: Object.freeze({
      maxFailedAttempts: env.LOGIN_MAX_FAILED_ATTEMPTS,
      failureWindowMinutes: env.LOGIN_FAILURE_WINDOW_MINUTES,
      baseCooldownMinutes: env.LOGIN_LOCKOUT_BASE_COOLDOWN_MINUTES,
      cooldownMultiplier: env.LOGIN_LOCKOUT_COOLDOWN_MULTIPLIER,
      maxCooldownMinutes: env.LOGIN_LOCKOUT_MAX_COOLDOWN_MINUTES,
    }),
  });
}

export function inactivityTimeoutMinutesFor(
  config: AuthConfig,
  role: RoleCode,
): number {
  return config.inactivityTimeoutMinutesByRole[role];
}
