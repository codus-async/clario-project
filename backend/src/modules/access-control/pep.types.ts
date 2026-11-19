import type { DocumentedErrorCode } from "../../errors/error-codes.js";
import type { AuthConfig } from "../auth/auth.config.js";
import type {
  AuthSessionContext,
  SessionCredential,
} from "../auth/auth.types.js";

/**
 * Minimal session-resolution port the F-66 Policy Enforcement Point needs
 * from F-64. `AuthService` satisfies it structurally; tests substitute a
 * stub so the five gates can be exercised without Redis.
 */
export interface PepSessionPort {
  resolveSession(credential: SessionCredential): Promise<AuthSessionContext>;
}

/** Which of the five documented gates produced a denial (F-66, architecture §4.3). */
export type PepGate =
  | "session"
  | "role"
  | "mfa"
  | "tenant_scope"
  | "subscription";

/**
 * Security event emitted on every PEP denial (FR-231: unauthorized attempts
 * are logged as security events for F-82). The F-82 append-only audit writer
 * does not exist yet, so the sink is a pluggable port — the default wiring
 * logs through pino until the audit chain lands.
 */
export interface PepSecurityEvent {
  gate: PepGate;
  code: DocumentedErrorCode;
  requestId: string;
  method: string;
  path: string;
  userId: string | null;
  institutionId: string | null;
  activeRole: string | null;
  detail: string;
}

export type PepSecurityEventSink = (event: PepSecurityEvent) => void;

/**
 * Route-classification knobs for gates 4 and 5. Defaults mirror the specs
 * (BR-03 coordinator scope, BR-25/SEC-14 confidentiality, FR-244 billing
 * carve-out) and are overridable so future route renames do not require
 * policy edits.
 */
export interface PepOptions {
  /**
   * Paths under this prefix are enforced (default `/api/v1`). Paths outside
   * it — `/health`, static assets — never reach the gates.
   */
  enforcePathPrefix: string;
  /**
   * Path prefixes skipped by every gate (default `/api/v1/auth`): the F-64
   * login/MFA/session flows must stay reachable for unauthenticated and
   * `PRE_MFA` sessions (F-65).
   */
  exemptPathPrefixes: readonly string[];
  /** Prefix that marks coordinator-scoped routes (BR-03, default `/api/v1/coordinator`). */
  coordinatorPathPrefix: string;
  /**
   * Lowercase substrings that mark a route as serving confidential academic
   * records (BR-25, SEC-14/SEC-15). Matched against each path segment.
   */
  confidentialPathSegments: readonly string[];
  /**
   * Lowercase substrings that mark billing/renewal/data-export routes, which
   * an Institutional Admin must keep reaching while the subscription is
   * expired (FR-244).
   */
  billingPathSegments: readonly string[];
  /**
   * Path segment that marks Platform Admin surfaces (`platform`): those are
   * administrative routes, never classified as confidential academic records.
   */
  platformPathSegment: string;
}

export interface PepDependencies {
  session: PepSessionPort;
  authConfig: AuthConfig;
  /** Defaults to a pino-backed sink when omitted. */
  securityEvents?: PepSecurityEventSink;
  options?: Partial<PepOptions>;
}
