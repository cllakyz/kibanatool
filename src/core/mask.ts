// Masks sensitive values in copied output (spec §7.5).
import { isPlainObject, parseJsonText } from "./fields";

export const MASK = "***";

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** `*` matches any run of characters; the whole dot path must match, ignoring case. */
export function maskMatcher(patterns: string[]): (path: string) => boolean {
  const regexes = patterns.map((pattern) => new RegExp(`^${pattern.split("*").map(escapeRegExp).join(".*")}$`, "i"));
  return (path) => regexes.some((regex) => regex.test(path));
}

/**
 * Replaces values whose path matches with MASK, also inside objects, arrays and JSON text.
 * Keys inside JSON text are matched as `<field path>.<key>`; masked JSON text is re-serialized.
 */
export function maskValue(path: string, value: unknown, isMasked: (path: string) => boolean): unknown {
  if (isMasked(path)) return MASK;
  if (Array.isArray(value)) return value.map((item) => maskValue(path, item, isMasked));
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, maskValue(`${path}.${key}`, item, isMasked)]));
  }
  if (typeof value === "string") {
    const parsed = parseJsonText(value);
    if (parsed !== undefined) return JSON.stringify(maskValue(path, parsed, isMasked));
  }
  return value;
}
