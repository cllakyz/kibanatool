// Resolves {path|fallback} placeholders against a field map and environment variables (spec §7.2, §7.3; Plan 4 spec §4).
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

/** Values of `env.<name>` placeholders: the open environment's variables. */
export type Variables = Readonly<Record<string, string>>;

/** The variable's value; null when the environment does not set it. Own keys only: `env.constructor` is never Object's. */
export function lookupVariable(variables: Variables, path: string): string | null {
  const name = path.slice(VARIABLE_PREFIX.length);
  if (!Object.hasOwn(variables, name)) return null;
  const value = variables[name];
  return typeof value === "string" && value !== "" ? value : null;
}

export interface Encoders {
  /** Values from the log: encodeURIComponent in links, kqlQuote in KQL. */
  field: (value: string) => string;
  /** Values from the environment: as they are in links, kqlQuote in KQL. */
  variable: (value: string) => string;
}

export type TemplateResult =
  | { ok: true; text: string }
  | { ok: false; reason: "missingValue" }
  | { ok: false; reason: "missingVariable"; variable: string };

/**
 * Fills every placeholder from the log's fields and the environment's variables (Plan 4 spec §4, §5.3).
 * A placeholder with a field path that finds no value hides the action ("missingValue"). That wins over a
 * placeholder of variables only that finds none ("missingVariable", named by its first variable).
 */
export function fillTemplate(template: string, fields: FieldMap, variables: Variables, encoders: Encoders): TemplateResult {
  let missingValue = false;
  let missingVariable: string | undefined;
  const text = template.replace(PLACEHOLDER, (_match, group: string) => {
    const paths = group.split("|");
    for (const path of paths) {
      const fromVariable = isVariablePath(path);
      const value = fromVariable ? lookupVariable(variables, path) : lookup(fields, [path]);
      if (value === null) continue;
      try {
        return (fromVariable ? encoders.variable : encoders.field)(value);
      } catch {
        missingValue = true; // e.g. encodeURIComponent on a lone surrogate
        return "";
      }
    }
    if (paths.every(isVariablePath)) missingVariable ??= (paths[0] ?? "").slice(VARIABLE_PREFIX.length);
    else missingValue = true;
    return "";
  });
  if (missingValue) return { ok: false, reason: "missingValue" };
  if (missingVariable !== undefined) return { ok: false, reason: "missingVariable", variable: missingVariable };
  return { ok: true, text };
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
