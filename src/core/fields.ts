// Flattens an Elasticsearch hit into a dot-path field map (spec §7.1), JSON and XML text included (Plan 6 spec §5).
import type { RawHit } from "./types";
import { parseXml } from "./xml";

export type FieldMap = Record<string, unknown>;

const MAX_JSON_DEPTH = 5;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Spec §7.1: undefined, null, "" and [] mean "no value"; 0 and false are values. */
export function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
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

/** The parsed value when `text` is JSON for an object or array, or XML (Plan 6 spec §5.1); otherwise undefined. */
export function parseStructuredText(text: string): Record<string, unknown> | unknown[] | undefined {
  return text.trim().startsWith("<") ? parseXml(text) : parseJsonText(text);
}

function parseJsonText(text: string): Record<string, unknown> | unknown[] | undefined {
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

/**
 * `value` with every JSON or XML text inside it parsed, however deep it sits (Plan 6 spec §5.1).
 * At most MAX_JSON_DEPTH texts are parsed one inside another; deeper text stays a string.
 */
export function expandStructured(value: unknown, depth = 0): unknown {
  if (Array.isArray(value)) return value.map((item) => expandStructured(item, depth));
  if (isPlainObject(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, expandStructured(item, depth)]));
  if (typeof value !== "string" || depth >= MAX_JSON_DEPTH) return value;
  const parsed = parseStructuredText(value);
  return parsed === undefined ? value : expandStructured(parsed, depth + 1);
}

/** Dot-path leaves of `_source`. JSON and XML text is also expanded under its own path unless `expandJson` is false. */
export function flattenSource(source: Record<string, unknown>, expandJson = true): FieldMap {
  const fields: FieldMap = Object.create(null);
  flattenInto(fields, "", source, expandJson ? 0 : MAX_JSON_DEPTH);
  return fields;
}

export function flattenDoc(hit: RawHit): FieldMap {
  const fields = flattenSource(hit._source ?? {});
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
      const parsed = parseStructuredText(value);
      if (isPlainObject(parsed)) flattenInto(fields, path, parsed, jsonDepth + 1);
    }
  }
}
