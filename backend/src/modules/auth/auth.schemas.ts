import {
  CLARIO_SYSTEM_CONSTANTS,
  type LoginRequestDto,
  type MfaVerifyRequestDto,
  type SwitchActiveContextRequestDto,
  roleCodeSchema,
} from "@clario/shared-contracts";
import { z } from "zod";

import { MFA_CODE_MAX_LENGTH } from "./auth.totp.js";
import {
  MAX_IDENTIFIER_LENGTH,
  MAX_INSTITUTION_CODE_LENGTH,
  MAX_PASSWORD_LENGTH,
} from "./auth.service.js";

/**
 * F-64 request-boundary schemas (Prompt 1.2). They define *shape only*:
 * presence, type, length and unknown-field rejection. Lookups, credential
 * verification, token existence/expiry and session effects stay in the
 * application services (F-64 §10).
 *
 * All object schemas are strict: undocumented request fields are rejected,
 * never stripped (F-64 §5).
 */

/**
 * `POST /api/v1/auth/login`. Field-for-field parity with the shared
 * `LoginRequestDto`; bounds mirror `AuthService.validate*` so the request
 * edge rejects exactly what the service would (and nothing more — in
 * particular the login password is *not* subject to the 12-character
 * activation minimum of SEC-02).
 *
 * `identifier` and `institutionCode` are trimmed because the service trims
 * them before use; `password` is never trimmed, normalised or lowercased —
 * its contents must reach the verifier exactly as sent.
 */
export const loginRequestBodySchema = z.strictObject({
  identifier: z
    .string()
    .trim()
    .min(1, "identifier is required.")
    .max(
      MAX_IDENTIFIER_LENGTH,
      `identifier must be at most ${String(MAX_IDENTIFIER_LENGTH)} characters.`,
    ),
  password: z
    .string()
    .min(1, "password is required.")
    .max(
      MAX_PASSWORD_LENGTH,
      `password must be at most ${String(MAX_PASSWORD_LENGTH)} characters.`,
    ),
  institutionCode: z
    .string()
    .trim()
    .min(1, "institutionCode must not be empty.")
    .max(
      MAX_INSTITUTION_CODE_LENGTH,
      `institutionCode must be at most ${String(MAX_INSTITUTION_CODE_LENGTH)} characters.`,
    )
    .optional(),
});

export type LoginRequestBody = z.infer<typeof loginRequestBodySchema>;

/**
 * Compile-time parity with the shared contract (F-64 §8): the schema and
 * `LoginRequestDto` must stay assignable in both directions *and* declare
 * exactly the same keys, so neither side can drift without failing `tsc`.
 */
type Assert<T extends true> = T;
type SameKeys<A, B> = keyof A extends keyof B
  ? keyof B extends keyof A
    ? true
    : false
  : false;
export type LoginRequestBodyDtoParity = [
  Assert<LoginRequestBody extends LoginRequestDto ? true : false>,
  Assert<LoginRequestDto extends LoginRequestBody ? true : false>,
  Assert<SameKeys<LoginRequestBody, LoginRequestDto>>,
];

/**
 * `POST /api/v1/auth/activate`. The repository defines no authoritative
 * representation for the raw invitation token (only the stored
 * `invitation_token_hash CHAR(64)` exists, and no generation logic or DTO is
 * documented), so the token is validated only by the constraints that can be
 * established safely: a non-empty, non-whitespace-only string whose exact
 * value is preserved. No UUID/hex format is invented here (F-64 §4.2).
 *
 * The password enforces the SEC-02 / AC-F64-01 minimum of 12 characters and
 * the same upper bound the login boundary enforces, so an account that is
 * activated with this password can always sign in again. Compromised-password
 * screening (SEC-03) is deliberately *not* a schema concern — it needs a
 * breach-list lookup — and happens in the application service
 * (`AccountService.activate`). The password is never trimmed before the
 * length check.
 */
export const activateRequestBodySchema = z.strictObject({
  token: z
    .string()
    .refine((value) => value.trim().length > 0, "token is required."),
  password: z
    .string()
    .min(
      CLARIO_SYSTEM_CONSTANTS.MIN_PASSWORD_LENGTH,
      `password must be at least ${String(CLARIO_SYSTEM_CONSTANTS.MIN_PASSWORD_LENGTH)} characters.`,
    )
    .max(
      MAX_PASSWORD_LENGTH,
      `password must be at most ${String(MAX_PASSWORD_LENGTH)} characters.`,
    ),
});

export type ActivateRequestBody = z.infer<typeof activateRequestBodySchema>;

/**
 * `POST /api/v1/auth/password/forgot`. The body mirrors the identifier
 * fields of the login body: the identifier may be an email address or an
 * institutional ID number, and the optional institution code disambiguates
 * the tenant. No field of the response may reveal whether the identifier
 * matched an account (SEC-04), which is a service concern — the schema
 * only fixes the shape.
 */
export const passwordResetRequestBodySchema = z.strictObject({
  identifier: z
    .string()
    .trim()
    .min(1, "identifier is required.")
    .max(
      MAX_IDENTIFIER_LENGTH,
      `identifier must be at most ${String(MAX_IDENTIFIER_LENGTH)} characters.`,
    ),
  institutionCode: z
    .string()
    .trim()
    .min(1, "institutionCode must not be empty.")
    .max(
      MAX_INSTITUTION_CODE_LENGTH,
      `institutionCode must be at most ${String(MAX_INSTITUTION_CODE_LENGTH)} characters.`,
    )
    .optional(),
});

export type PasswordResetRequestBody = z.infer<
  typeof passwordResetRequestBodySchema
>;

/**
 * `POST /api/v1/auth/password/reset`. The token is used exactly as
 * presented (it is never trimmed, because its digest must match the stored
 * digest); the password enforces the SEC-02 minimum of 12 characters and
 * the same upper bound the login boundary enforces, so the new password can
 * always be used to sign in. It is never trimmed before the length check.
 */
export const passwordResetBodySchema = z.strictObject({
  token: z
    .string()
    .refine((value) => value.trim().length > 0, "token is required."),
  password: z
    .string()
    .min(
      CLARIO_SYSTEM_CONSTANTS.MIN_PASSWORD_LENGTH,
      `password must be at least ${String(CLARIO_SYSTEM_CONSTANTS.MIN_PASSWORD_LENGTH)} characters.`,
    )
    .max(
      MAX_PASSWORD_LENGTH,
      `password must be at most ${String(MAX_PASSWORD_LENGTH)} characters.`,
    ),
});

export type PasswordResetBody = z.infer<typeof passwordResetBodySchema>;

/**
 * Bodyless command contract for `POST /auth/logout` and
 * `POST /auth/session/heartbeat`: no body is defined for either endpoint in
 * the REST specification, so any body field is rejected as unknown while an
 * absent body stays valid (F-64 §4.3/§4.4).
 */
export const emptyRequestBodySchema = z.strictObject({});

export type EmptyRequestBody = z.infer<typeof emptyRequestBodySchema>;

/**
 * `POST /api/v1/auth/mfa/enroll` (F-65). The endpoint takes no body — the
 * enrollment is bound to the `PRE_MFA` session cookie — so the same
 * bodyless contract as logout/heartbeat applies: an absent body is valid,
 * any field is rejected as unknown.
 */
export const mfaEnrollRequestBodySchema = emptyRequestBodySchema;

export type MfaEnrollRequestBody = z.infer<typeof mfaEnrollRequestBodySchema>;

/**
 * `POST /api/v1/auth/mfa/verify` (F-65). Field-for-field parity with the
 * shared `MfaVerifyRequestDto`: a single `totpCode` that carries either a
 * 6-digit TOTP code or one of the ten recovery codes (SEC-06). The value is
 * trimmed — authenticator apps and password managers disagree about trailing
 * whitespace — and bounded so a hostile payload never reaches the HMAC or
 * the digest comparison; which of the two forms it *is* is decided by the
 * application service, not by the schema (F-65 §10).
 */
export const mfaVerifyRequestBodySchema = z.strictObject({
  totpCode: z
    .string()
    .trim()
    .min(1, "totpCode is required.")
    .max(
      MFA_CODE_MAX_LENGTH,
      `totpCode must be at most ${String(MFA_CODE_MAX_LENGTH)} characters.`,
    ),
});

export type MfaVerifyRequestBody = z.infer<typeof mfaVerifyRequestBodySchema>;

/**
 * Compile-time parity with the shared contract (F-65 §8): the schema and
 * `MfaVerifyRequestDto` must declare exactly the same keys, and the
 * inferred request body must be assignable in both directions. `Assert` and
 * `SameKeys` are the helpers declared for the login parity above.
 */
export type MfaVerifyRequestBodyDtoParity = [
  Assert<MfaVerifyRequestBody extends MfaVerifyRequestDto ? true : false>,
  Assert<MfaVerifyRequestDto extends MfaVerifyRequestBody ? true : false>,
  Assert<SameKeys<MfaVerifyRequestBody, MfaVerifyRequestDto>>,
];

/**
 * `PUT /api/v1/auth/session/context` (F-65). Field-for-field parity with
 * the shared `SwitchActiveContextRequestDto`: the target role is validated
 * against the documented role enum at the request edge, and the coordinator
 * appointment id — when present — must be a UUID. Whether the appointment
 * is *mandatory* (BR-03: only when the target role is
 * `PROJECT_COORDINATOR`) and whether the account actually holds it are
 * business rules and stay in `AuthService.updateSessionContext`.
 */
export const sessionContextRequestBodySchema = z.strictObject({
  targetRole: roleCodeSchema,
  coordinatorAppointmentId: z.uuid().optional(),
});

export type SessionContextRequestBody = z.infer<
  typeof sessionContextRequestBodySchema
>;

/**
 * Compile-time parity with the shared `SwitchActiveContextRequestDto`
 * (F-65 §8), including the exact key set — an optional field that drifts
 * out of (or into) the DTO fails `tsc`.
 */
export type SessionContextRequestBodyDtoParity = [
  Assert<
    SessionContextRequestBody extends SwitchActiveContextRequestDto
      ? true
      : false
  >,
  Assert<
    SwitchActiveContextRequestDto extends SessionContextRequestBody
      ? true
      : false
  >,
  Assert<SameKeys<SessionContextRequestBody, SwitchActiveContextRequestDto>>,
];
