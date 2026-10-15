// Form-urlencoded text as structured data (spec 002 FR-001, FR-002), next to JSON and XML text.
import { groupRepeated } from "./xml";

export interface FormPair {
  /** The key and value as written, still percent-encoded. */
  rawKey: string;
  rawValue: string;
  key: string;
  value: string;
}

/** Starts with a letter, digit, `_` or escape, never a bracket, so form text never starts with `{`, `[` or `<` (spec 002 FR-006). */
const KEY = /^(?:[\p{L}\p{N}_]|%[0-9A-Fa-f]{2})(?:[\p{L}\p{N}_.\-[\]]|%[0-9A-Fa-f]{2})*$/u;

/**
 * The pairs of `text` when it is two or more `key=value` pairs joined by `&`, otherwise undefined. Every string leaf
 * of a copy passes through here, so the cheap whole-text checks come before any regex or decoding. Never throws.
 */
export function formPairs(text: string): FormPair[] | undefined {
  const source = text.trim();
  if (!source.includes("&") || /\s/.test(source)) return undefined;
  const parts = source.split("&");
  const pairs: FormPair[] = [];
  for (const part of parts) {
    const equals = part.indexOf("=");
    if (equals < 0) return undefined;
    const rawKey = part.slice(0, equals);
    const rawValue = part.slice(equals + 1);
    if (!KEY.test(rawKey)) return undefined;
    const key = decode(rawKey);
    const value = decode(rawValue);
    if (key === undefined || value === undefined) return undefined;
    pairs.push({ rawKey, rawValue, key, value });
  }
  return pairs;
}

/** `{ key: value }` with every value text and a repeated key as a list (spec 002 FR-002), or undefined. */
export function parseForm(text: string): Record<string, unknown> | undefined {
  const pairs = formPairs(text);
  return pairs && groupRepeated(pairs.map((pair): [string, unknown] => [pair.key, pair.value]));
}

function decode(raw: string): string | undefined {
  try {
    return decodeURIComponent(raw.replace(/\+/g, " "));
  } catch {
    return undefined;
  }
}
