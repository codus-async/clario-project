import { CLARIO_SYSTEM_CONSTANTS } from "@clario/shared-contracts";

import { AppError } from "../../errors/app-error.js";
import { ERROR_CODES } from "../../errors/error-codes.js";

/**
 * SEC-02 minimum password length. Sourced from the shared contract so the
 * service and the request-boundary schemas cannot drift apart.
 */
export const MIN_PASSWORD_LENGTH = CLARIO_SYSTEM_CONSTANTS.MIN_PASSWORD_LENGTH;

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
 * SEC-03: the password is known to be compromised. It gets its own
 * documented code so the client can distinguish "pick another password"
 * from "your input was malformed".
 */
function compromisedError(): AppError {
  const message =
    "password appears on a known compromised-password list and cannot be used.";
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

  if (await compromisedPasswords.isCompromised(password)) {
    throw compromisedError();
  }
}
