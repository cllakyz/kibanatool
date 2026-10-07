// Flattens an Elasticsearch hit into a dot-path field map (spec §7.1).
import type { RawHit } from "./types";

export type FieldMap = Record<string, unknown>;

const MAX_JSON_DEPTH = 5;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Spec §7.1: undefined, null and "" mean "no value"; 0 and false are values. */
export function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

/** Primitives as text, primitive arrays joined with ",", everything else as JSON. */
export function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (
    Array.isArray(value) &&
    value.every((item) => item === null || ["string", "number", "boolean"].includes(typeof item))
  ) {
    return value.map((item) => (item === null ? "" : String(item))).join(",");
  }
  return JSON.stringify(value);
}

/** Returns the parsed value when `text` is JSON for an object or array, otherwise undefined. */
export function parseJsonText(text: string): Record<string, unknown> | unknown[] | undefined {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return undefined;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (Array.isArray(parsed) || isPlainObject(parsed)) return parsed;
    return undefined;
  } catch {
    return undefined;
  }
}

export function flattenDoc(hit: RawHit): FieldMap {
  const fields: FieldMap = {};
  flattenInto(fields, "", hit._source ?? {}, 0);
  fields._id = hit._id;
  fields._index = hit._index;
  return fields;
}

function flattenInto(
  fields: FieldMap,
  prefix: string,
  object: Record<string, unknown>,
  jsonDepth: number,
): void {
  for (const [key, value] of Object.entries(object)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value)) {
      flattenInto(fields, path, value, jsonDepth);
      continue;
    }
    fields[path] = value;
    if (typeof value === "string" && jsonDepth < MAX_JSON_DEPTH) {
      const parsed = parseJsonText(value);
      if (isPlainObject(parsed)) flattenInto(fields, path, parsed, jsonDepth + 1);
    }
  }
}
