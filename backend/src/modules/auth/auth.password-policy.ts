import { CLARIO_SYSTEM_CONSTANTS } from "@clario/shared-contracts";

import { AppError } from "../../errors/app-error.js";
import { ERROR_CODES } from "../../errors/error-codes.js";

/**
 * SEC-02 minimum password length. Sourced from the shared contract so the
 * service and the request-boundary schemas cannot drift apart.
 */
export const MIN_PASSWORD_LENGTH = CLARIO_SYSTEM_CONSTANTS.MIN_PASSWORD_LENGTH;

/**
 * Upper bound of a password that may be stored on an account.
 *
 * It is the same bound the login boundary enforces (`MAX_PASSWORD_LENGTH`
 * in `auth.service.ts`, which re-exports this constant), so a password
 * that the activation or the password-reset flow accepts can always be
 * used to sign in again — a longer password would be stored and then
 * rejected by `/auth/login` for the rest of the account's life.
 */
export const MAX_PASSWORD_LENGTH = 1024;

/**
 * Port for the SEC-03 compromised-password screening (FR-220).
 *
 * The implementation is an infrastructure concern: the MVP ships a local
 * dictionary screener, and a breach-list service (e.g. the k-anonymity
 * range query of Have I Been Pwned) can replace it behind the same port
 * without touching the application services.
 */
export interface CompromisedPasswordChecker {
  isCompromised(password: string): Promise<boolean>;
}

/**
 * SEC-02: the password is shorter than the documented minimum. Reported as
 * a plain validation failure so it matches the request-boundary schema,
 * which rejects the same input with the same code.
 */
function tooShortError(): AppError {
  const message = `password must be at least ${String(MIN_PASSWORD_LENGTH)} characters.`;
  return new AppError(ERROR_CODES.VALIDATION_ERROR, message, [
    { field: "password", message },
  ]);
}

/**
 * The password is longer than the login boundary accepts. Reported as a
 * plain validation failure, for the same reason as {@link tooShortError}.
 */
function tooLongError(): AppError {
  const message = `password must be at most ${String(MAX_PASSWORD_LENGTH)} characters.`;
  return new AppError(ERROR_CODES.VALIDATION_ERROR, message, [
    { field: "password", message },
  ]);
}

/**
 * SEC-03: the password is known to be compromised, or it is too weak to be
 * a passphrase (a single repeated character, or a numeric pattern without
 * a single letter). It gets its own documented code so the client can
 * distinguish "pick another password" from "your input was malformed".
 */
function compromisedError(): AppError {
  const message =
    "password is too weak or appears on a known compromised-password list and cannot be used.";
  return new AppError(
    ERROR_CODES.COMPROMISED_OR_WEAK_PASSWORD,
    message,
    [{ field: "password", message }],
  );
}

/**
 * Enforces the F-64 password policy (SEC-02, SEC-03, FR-220, AC-F64-01) on
 * every password *creation* path: account activation, password creation and
 * self-service password reset.
 *
 * The password is never trimmed, normalised or lowercased — only its
 * contents are inspected, and the exact value is what gets hashed.
 *
 * The login path deliberately does **not** apply this policy: an existing
 * password that predates the policy must still be verifiable (the schema
 * comment in `auth.schemas.ts` records the same boundary).
 */
export async function assertPasswordPolicy(
  password: string,
  compromisedPasswords: CompromisedPasswordChecker,
): Promise<void> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw tooShortError();
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    throw tooLongError();
  }

  if (await compromisedPasswords.isCompromised(password)) {
    throw compromisedError();
  }
}
