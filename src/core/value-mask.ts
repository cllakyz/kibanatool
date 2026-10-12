// Finds IBANs, Turkish ID numbers, Turkish mobile numbers and card numbers inside any text (Plan 5 spec §4).

export const MASK = "***";

/** The kinds in the order the options page lists and saves them (Plan 5 spec §6). */
export const VALUE_MASK_KINDS = ["iban", "tckn", "gsm", "card"] as const;
export type ValueMaskKind = (typeof VALUE_MASK_KINDS)[number];

/** A match may not touch a letter or a digit on either side (spec §4.1). */
const bounded = (source: string, flags = "gu"): RegExp =>
  new RegExp(String.raw`(?<![\p{L}\p{N}])` + source + String.raw`(?![\p{L}\p{N}])`, flags);

function luhn(digits: string): boolean {
  let sum = 0;
  [...digits].reverse().forEach((char, index) => {
    const value = Number(char) * (index % 2 === 1 ? 2 : 1);
    sum += value > 9 ? value - 9 : value;
  });
  return sum % 10 === 0;
}

/** Visa, Mastercard and Troy have 16 digits, Amex 15 (spec §4.2). */
function isCard(match: string): boolean {
  const digits = match.replace(/\D/g, "");
  const network = digits.length === 16 ? /^(?:4|5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d\d|27[01]\d|2720|9792)/ : /^3[47]/;
  return network.test(digits) && luhn(digits);
}

function isTckn(digits: string): boolean {
  const d = [...digits].map(Number);
  const sum = (indexes: number[]): number => indexes.reduce((total, index) => total + (d[index] ?? 0), 0);
  const tenth = (((sum([0, 2, 4, 6, 8]) * 7 - sum([1, 3, 5, 7])) % 10) + 10) % 10;
  return tenth === d[9] && sum([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) % 10 === d[10];
}

const anyMatch = (): boolean => true;

/**
 * Candidate pattern and check per kind, in search order (spec §4.3): an earlier match is already the mask
 * when the next pattern runs. Cards are tried at 16 digits, then at 15.
 */
const RULES: ReadonlyArray<readonly [ValueMaskKind, RegExp, (match: string) => boolean]> = [
  ["iban", bounded(String.raw`TR\d{2}(?: ?\d{4}){5} ?\d{2}`, "giu"), anyMatch],
  ["card", bounded(String.raw`\d(?:[ -]?\d){15}`), isCard],
  ["card", bounded(String.raw`\d(?:[ -]?\d){14}`), isCard],
  ["tckn", bounded(String.raw`[1-9]\d{10}`), isTckn],
  ["gsm", bounded(String.raw`(?:(?:\+90|90|0)[ -]?)?(?:5\d{2}|\(5\d{2}\))[ -]?\d{3}[ -]?\d{2}[ -]?\d{2}`), anyMatch],
];

/** Like String.replace, but a rejected candidate does not use up its text: the scan retries one character later. */
function maskMatches(text: string, pattern: RegExp, isValid: (match: string) => boolean): string {
  let result = "";
  let copied = 0;
  pattern.lastIndex = 0;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    if (isValid(match[0])) {
      result += text.slice(copied, match.index) + MASK;
      copied = pattern.lastIndex;
    } else {
      pattern.lastIndex = match.index + 1; // a valid card may start inside this rejected candidate
    }
  }
  return result + text.slice(copied);
}

/** Replaces every match of the kinds that are on with MASK; the rest of the text stays as it is. */
export function maskText(text: string, kinds: readonly ValueMaskKind[]): string {
  let result = text;
  for (const [kind, pattern, isValid] of RULES) {
    if (kinds.includes(kind)) result = maskMatches(result, pattern, isValid);
  }
  return result;
}
