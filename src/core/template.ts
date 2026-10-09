// Resolves {path|fallback} placeholders against a field map (spec §7.2, §7.3).
import { type FieldMap, formatValue, isMissing } from "./fields";

const PLACEHOLDER = /\{([A-Za-z0-9_.@-]+(?:\|[A-Za-z0-9_.@-]+)*)\}/g;

export interface Placeholder {
  raw: string;
  paths: string[];
}

export function parsePlaceholders(template: string): Placeholder[] {
  return [...template.matchAll(PLACEHOLDER)].map((match) => ({
    raw: match[0],
    paths: (match[1] ?? "").split("|"),
  }));
}

/** First present value among `paths`, as text; null when none has a value. */
export function lookup(fields: FieldMap, paths: string[]): string | null {
  for (const path of paths) {
    if (!Object.hasOwn(fields, path)) continue;
    const value = fields[path];
    if (!isMissing(value)) return formatValue(value);
  }
  return null;
}

/** Fills every placeholder with `encode(value)`; null when any placeholder has no value. */
export function resolveTemplate(
  template: string,
  fields: FieldMap,
  encode: (value: string) => string,
): string | null {
  let missing = false;
  const result = template.replace(PLACEHOLDER, (_match, group: string) => {
    const value = lookup(fields, group.split("|"));
    if (value === null) {
      missing = true;
      return "";
    }
    try {
      return encode(value);
    } catch {
      missing = true;
      return "";
    }
  });
  return missing ? null : result;
}

/** `env.<name>` paths name environment variables, never log fields (Plan 4 spec §4). */
export const VARIABLE_PREFIX = "env.";

export function isVariablePath(path: string): boolean {
  return path.startsWith(VARIABLE_PREFIX);
}

const LEADING_PLACEHOLDER = new RegExp(`^${PLACEHOLDER.source}`);

/** Paths of the placeholder `template` starts with, when they are all variables; null otherwise. */
export function leadingVariablePaths(template: string): string[] | null {
  const match = LEADING_PLACEHOLDER.exec(template.trim());
  if (!match) return null;
  const paths = (match[1] ?? "").split("|");
  return paths.every(isVariablePath) ? paths : null;
}

/** Plan 4 spec §3: an http(s) template, or one whose base comes from a variable. */
export function isHttpUrlTemplate(template: string): boolean {
  return /^https?:\/\//i.test(template.trim()) || leadingVariablePaths(template) !== null;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
