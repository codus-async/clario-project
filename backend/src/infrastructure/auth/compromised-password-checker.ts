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
 * The reduction in rule 2 is computed twice: once on the raw password and
 * once on the leet-normalised password. The normalisation maps the digits
 * that stand *inside* a word to their letter (`P@ssw0rd` → `password`) and
 * leaves the digits that form a numeric block alone (`Password2026!` →
 * `password2026`), so a trailing year does not contaminate the word that
 * is being compared. A digit block counts as "inside a word" only when it
 * is surrounded by letters on both sides, which is what makes the run
 * `55` of `Pa55word2026!` resolve to `ss` while the block `2026` stays a
 * number.
 *
 * Every check is Unicode-aware: a letter is any code point in `\p{L}` and a
 * digit any code point in `\p{N}`, so a password written in a non-Latin
 * script is judged on its own letters instead of being mistaken for a
 * numeric pattern.
 */

/**
 * Leet-speak substitutions for the digits that have a letter look-alike.
 * The digits without one (`2`, `6`, `8`, `9`) are left alone.
 */
const LEET_DIGITS: Readonly<Record<string, string>> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
};

/**
 * Symbol look-alikes. They are resolved before the digit blocks are
 * analysed, so the `@` of `p@55word` counts as the letter that surrounds
 * the digit run.
 */
const LEET_SYMBOLS: ReadonlyArray<[RegExp, string]> = [
  [/@/g, "a"],
  [/\$/g, "s"],
];

/** A maximal run of digits. */
const DIGIT_RUN = /[0-9]+/g;

/** A maximal run of identical digits inside a digit run. */
const IDENTICAL_DIGIT_RUN = /(\d)\1*/g;

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

/** True for any Unicode letter. */
function isLetter(char: string | undefined): boolean {
  return char !== undefined && /\p{L}/u.test(char);
}

/**
 * Resolves the symbol look-alikes (`@` → `a`, `$` → `s`).
 */
function applySymbolSubstitutions(value: string): string {
  let normalized = value;
  for (const [pattern, replacement] of LEET_SYMBOLS) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized;
}

/**
 * Maps the digit blocks that sit *inside* a word to their letter
 * look-alike and leaves the numeric blocks alone.
 *
 * A digit block is inside a word when it is surrounded by letters on both
 * sides: `p455w0rd` → `password` (`455` → `ass`, `0` → `o`), while
 * `Pa55word2026!` → `password2026!` (`55` → `ss`, `2026` stays a number
 * because it is not surrounded by letters).
 *
 * Inside a block, every maximal run of identical digits is mapped on its
 * own, so `455` resolves to `a` + `ss` and not to `aaa`.
 */
function normalizeDigitBlocks(value: string): string {
  return value.replace(DIGIT_RUN, (run: string, offset: number) => {
    const before = offset > 0 ? value[offset - 1] : undefined;
    const after =
      offset + run.length < value.length
        ? value[offset + run.length]
        : undefined;

    if (!isLetter(before) || !isLetter(after)) {
      // A numeric block (a year, a counter, a trailing sequence): it is not
      // part of a word and must not contaminate the word comparison.
      return run;
    }

    return run.replace(IDENTICAL_DIGIT_RUN, (subRun: string) => {
      const letter = LEET_DIGITS[subRun[0] as string];
      return letter === undefined ? subRun : letter.repeat(subRun.length);
    });
  });
}

/** Keeps the digits and the letters, drops every other character. */
function alphanumericOnly(value: string): string {
  return value.replace(/[^\p{L}\p{N}]/gu, "");
}

/** Keeps the letters only — the "core" of a password. */
function lettersOnly(value: string): string {
  return value.replace(/[^\p{L}]/gu, "");
}

function isSingleRepeatedCharacter(value: string): boolean {
  return value.length > 0 && [...value].every((char) => char === value[0]);
}

/**
 * Local SEC-03 screener. See the module comment for the rules it applies.
 */
export class LocalCompromisedPasswordChecker implements CompromisedPasswordChecker {
  async isCompromised(password: string): Promise<boolean> {
    const lowercased = password.toLowerCase();
    const plain = alphanumericOnly(lowercased);
    if (plain.length === 0) {
      return true;
    }
    const leet = alphanumericOnly(
      normalizeDigitBlocks(applySymbolSubstitutions(lowercased)),
    );

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
    // passphrase. The test is Unicode-aware, so a password written in a
    // non-Latin script still counts as a passphrase.
    return !/\p{L}/u.test(plain);
  }
}
