// Masks sensitive values in copied output: by field name (spec §7.5) and inside values (Plan 5 spec §5).
import { isPlainObject, parseStructuredText } from "./fields";
import { MASK, type ValueMaskKind, maskText } from "./value-mask";

export { MASK };

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** `*` matches any run of characters; the whole dot path must match, ignoring case. */
export function maskMatcher(patterns: string[]): (path: string) => boolean {
  const regexes = patterns.map((pattern) => new RegExp(`^${pattern.split("*").map(escapeRegExp).join(".*")}$`, "i"));
  return (path) => regexes.some((regex) => regex.test(path));
}

/**
 * Replaces values whose path matches with MASK, also inside objects and arrays. Callers pass the value through
 * expandStructured first (Plan 6 spec §5.5), so keys inside JSON and XML text are matched as `<field path>.<key>`.
 * Text that is still JSON or XML lies past expandStructured's depth cap: it becomes MASK whole, since any key may
 * sit inside it and opening it further could grow the copy without bound.
 * Every other text and number is searched for the value kinds that are on; a number with a match becomes MASK.
 */
export function maskValue(path: string, value: unknown, isMasked: (path: string) => boolean, kinds: readonly ValueMaskKind[]): unknown {
  if (isMasked(path)) return MASK;
  if (Array.isArray(value)) return value.map((item) => maskValue(path, item, isMasked, kinds));
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, maskValue(`${path}.${key}`, item, isMasked, kinds)]));
  }
  if (typeof value === "string") return parseStructuredText(value) === undefined ? maskText(value, kinds) : MASK;
  if (typeof value === "number") return maskText(String(value), kinds) === String(value) ? value : MASK;
  return value;
}
