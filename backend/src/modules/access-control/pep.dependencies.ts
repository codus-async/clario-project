import type { RequestHandler } from "express";

import { baseLogger } from "../../infrastructure/logging/logger.js";
import { authConfig, authService } from "../auth/auth.dependencies.js";
import {
  createPolicyEnforcementPoint,
  withRequestTenantTransaction,
} from "./pep.middleware.js";
import type { PepSecurityEvent } from "./pep.types.js";

/**
 * Default security-event sink (FR-231): every PEP denial is logged as a
 * structured warning until the F-82 append-only audit writer exists, at
 * which point this becomes the adapter that also writes the audit chain.
 */
function logSecurityEvent(event: PepSecurityEvent): void {
  baseLogger.warn(
    {
      module: "access-control",
      ...event,
    },
    "PEP access denial",
  );
}

/**
 * Production wiring of the F-66 Policy Enforcement Point: the real
 * `AuthService` resolves sessions from Redis/PostgreSQL, the F-64
 * per-role inactivity config drives gate 1, and denials are logged as
 * security events.
 */
export const policyEnforcementPoint: RequestHandler =
  createPolicyEnforcementPoint({
    session: authService,
    authConfig,
    securityEvents: logSecurityEvent,
  });

export { withRequestTenantTransaction };
