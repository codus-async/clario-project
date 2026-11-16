import type { CompromisedPasswordChecker } from "../../modules/auth/auth.password-policy.js";

/**
 * SEC-03 compromised-password screening (FR-220, AC-F64-01).
 *
 * The MVP ships a local dictionary screener: the repository has no
 * dependency on a breach-list service, and the screening must stay
 * deterministic and offline-testable. The port
 * (`CompromisedPasswordChecker`) is the seam where a breach-list provider
 * (e.g. the k-anonymity range query of Have I Been Pwned) can be plugged in
 * later without touching the application services.
 *
 * A password is rejected when it
 * 1. matches one of the well-known breached passwords,
 * 2. reduces to one of the well-known base words once the digits and the
 *    symbols are removed (`Password1234!` → `password`, `trustno12` →
 *    `trustno`), or
 * 3. consists of a single repeated character, or
 * 4. contains no letters at all (a numeric pattern is not a passphrase).
 *
 * The digit replacements of the leet-speak normalisation only apply to
 * digits that are *not* part of a consecutive run, so the trailing `1234`
 * of `Password1234!` stays a number while the `0` of `P@ssw0rd` becomes an
 * `o`.
 */

/**
 * Leet-speak substitutions. A digit is only replaced when it stands
 * alone: `(?<![0-9])` / `(?![0-9])` keep consecutive digit runs intact.
 */
const LEET_SUBSTITUTIONS: ReadonlyArray<[RegExp, string]> = [
  [/(?<![0-9])0(?![0-9])/g, "o"],
  [/(?<![0-9])1(?![0-9])/g, "i"],
  [/(?<![0-9])3(?![0-9])/g, "e"],
  [/(?<![0-9])4(?![0-9])/g, "a"],
  [/(?<![0-9])5(?![0-9])/g, "s"],
  [/(?<![0-9])7(?![0-9])/g, "t"],
  [/@/g, "a"],
  [/\$/g, "s"],
];

/**
 * Well-known breached passwords in their normalised form. Only the shapes
 * that appear at the top of every public breach corpus are listed; the list
 * is a floor, not a ceiling.
 */
const BREACHED_PASSWORDS: ReadonlySet<string> = new Set([
  "password",
  "password1",
  "password12",
  "password123",
  "password1234",
  "passw0rd",
  "p@ssword",
  "p@ssw0rd",
  "pa55w0rd",
  "pa55word",
  "123456",
  "1234567",
  "12345678",
  "123456789",
  "1234567890",
  "12345678901",
  "123456789012",
  "111111111111",
  "000000000000",
  "qwerty",
  "qwerty1",
  "qwerty12",
  "qwertyuiop",
  "qwertyuiop1",
  "qwertyuiop12",
  "1q2w3e4r",
  "1q2w3e4r5t",
  "q1w2e3r4",
  "zaq12wsx",
  "letmein",
  "letmein1",
  "welcome",
  "welcome1",
  "admin",
  "admin1",
  "admin12",
  "admin123",
  "admin1234",
  "administrator",
  "iloveyou",
  "iloveyou1",
  "monkey",
  "monkey1",
  "dragon",
  "dragon1",
  "sunshine",
  "sunshine1",
  "princess",
  "princess1",
  "football",
  "football1",
  "baseball",
  "baseball1",
  "master",
  "master1",
  "shadow",
  "shadow1",
  "michael",
  "michael1",
  "jennifer",
  "jennifer1",
  "jessica",
  "jessica1",
  "charlie",
  "charlie1",
  "thomas",
  "thomas1",
  "daniel",
  "daniel1",
  "matthew",
  "matthew1",
  "andrew",
  "andrew1",
  "joshua",
  "joshua1",
  "michelle",
  "michelle1",
  "amanda",
  "amanda1",
  "ashley",
  "ashley1",
  "nicole",
  "nicole1",
  "hannah",
  "hannah1",
  "samantha",
  "samantha1",
  "secret",
  "secret1",
  "trustno1",
  "abc123",
  "abc1234",
  "abc12345",
  "abc123456",
  "login",
  "access",
  "changeme",
  "default",
  "guest",
  "root",
  "toor",
  "pass",
  "test",
  "test1234",
]);

/**
 * Base words that are rejected as soon as the digits and the symbols are
 * removed, so `Password1234!`, `password2026` and `P@ssw0rd` are all
 * rejected.
 */
const BREACHED_BASE_WORDS: ReadonlySet<string> = new Set([
  "password",
  "passwd",
  "qwerty",
  "qwertyuiop",
  "letmein",
  "welcome",
  "admin",
  "administrator",
  "iloveyou",
  "iloveme",
  "monkey",
  "dragon",
  "sunshine",
  "princess",
  "football",
  "baseball",
  "master",
  "shadow",
  "michael",
  "jennifer",
  "jessica",
  "charlie",
  "thomas",
  "daniel",
  "matthew",
  "andrew",
  "joshua",
  "michelle",
  "amanda",
  "ashley",
  "nicole",
  "hannah",
  "samantha",
  "secret",
  "trustno",
  "abc",
  "login",
  "access",
  "changeme",
  "default",
  "guest",
  "root",
  "toor",
  "pass",
  "test",
  "starwars",
  "superman",
  "batman",
  "whatever",
  "nothing",
  "freedom",
  "computer",
  "internet",
  "flower",
  "jesus",
  "loveme",
  "hotdog",
  "cheese",
]);

function applyLeetSubstitutions(password: string): string {
  let normalized = password.toLowerCase();
  for (const [pattern, replacement] of LEET_SUBSTITUTIONS) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized;
}

/** Keeps the digits and the letters, drops every other character. */
function alphanumericOnly(value: string): string {
  return value.replace(/[^a-z0-9]/g, "");
}

/** Keeps the letters only — the "core" of a password. */
function lettersOnly(value: string): string {
  return value.replace(/[^a-z]/g, "");
}

function isSingleRepeatedCharacter(value: string): boolean {
  return value.length > 0 && [...value].every((char) => char === value[0]);
}

/**
 * Local SEC-03 screener. See the module comment for the rules it applies.
 */
export class LocalCompromisedPasswordChecker implements CompromisedPasswordChecker {
  async isCompromised(password: string): Promise<boolean> {
    const plain = alphanumericOnly(password.toLowerCase());
    if (plain.length === 0) {
      return true;
    }
    const leet = alphanumericOnly(applyLeetSubstitutions(password));

    if (BREACHED_PASSWORDS.has(plain) || BREACHED_PASSWORDS.has(leet)) {
      return true;
    }

    for (const candidate of [plain, leet]) {
      const core = lettersOnly(candidate);
      if (core.length > 0 && BREACHED_BASE_WORDS.has(core)) {
        return true;
      }
    }

    if (isSingleRepeatedCharacter(plain)) {
      return true;
    }

    // A password without a single letter is a numeric pattern, never a
    // passphrase.
    return !/[a-z]/.test(plain);
  }
}
