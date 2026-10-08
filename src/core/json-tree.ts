// The JSON view's data (spec §7.6): JSON-text fields and a flat, pre-ordered row list,
// so collapsing, search and revealing a match are plain array operations.
import { flattenSource, isPlainObject, parseJsonText } from "./fields";

export interface JsonField {
  /** Dot path of the `_source` field that holds the JSON text. */
  path: string;
  value: Record<string, unknown> | unknown[];
}

export interface JsonRow {
  /** Relative to the field: "" for the root, then ".key", "[0]" or `["odd key"]` segments. */
  path: string;
  depth: number;
  /** Property name, array index, or null for the root. */
  key: string | number | null;
  value: unknown;
  container: "object" | "array" | null;
}

/** `_source` fields whose text is a JSON object or array, in field order. */
export function jsonTextFields(source: Record<string, unknown>): JsonField[] {
  return Object.entries(flattenSource(source, false)).flatMap(([path, value]) => {
    const parsed = typeof value === "string" ? parseJsonText(value) : undefined;
    return parsed === undefined ? [] : [{ path, value: parsed }];
  });
}

const segment = (key: string): string => (/^[A-Za-z_$][\w$]*$/.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`);

export function jsonRows(value: unknown): JsonRow[] {
  const rows: JsonRow[] = [];
  const visit = (path: string, key: string | number | null, item: unknown, depth: number): void => {
    const container = Array.isArray(item) ? "array" : isPlainObject(item) ? "object" : null;
    rows.push({ path, depth, key, value: item, container });
    if (Array.isArray(item)) {
      item.forEach((child, index) => visit(`${path}[${index}]`, index, child, depth + 1));
    } else if (isPlainObject(item)) {
      for (const [childKey, child] of Object.entries(item)) visit(`${path}${segment(childKey)}`, childKey, child, depth + 1);
    }
  };
  visit("", null, value, 0);
  return rows;
}

/** True when `path` lies under the container at `parent` (every non-root path starts with "." or "["). */
export function isDescendant(path: string, parent: string): boolean {
  return path !== parent && (path.startsWith(`${parent}.`) || path.startsWith(`${parent}[`));
}

/** Rows not hidden by a collapsed ancestor; relies on the pre-order of jsonRows. */
export function visibleRows(rows: JsonRow[], collapsed: ReadonlySet<string>): JsonRow[] {
  const visible: JsonRow[] = [];
  let hiddenUnder: string | null = null;
  for (const row of rows) {
    if (hiddenUnder !== null && isDescendant(row.path, hiddenUnder)) continue;
    hiddenUnder = row.container && collapsed.has(row.path) ? row.path : null;
    visible.push(row);
  }
  return visible;
}

/** Paths of rows whose property name or primitive value contains `query`, ignoring case. */
export function matchPaths(rows: JsonRow[], query: string): string[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return [];
  return rows
    .filter(
      (row) =>
        (typeof row.key === "string" && row.key.toLowerCase().includes(needle)) ||
        (row.container === null && String(row.value).toLowerCase().includes(needle)),
    )
    .map((row) => row.path);
}

/** `collapsed` without the ancestors of `path`, so that row becomes visible. */
export function revealPath(collapsed: ReadonlySet<string>, path: string): Set<string> {
  return new Set([...collapsed].filter((parent) => !isDescendant(path, parent)));
}

/** "Copy value": primitives as text, containers as indented JSON. */
export function copyableValue(row: JsonRow): string {
  return row.container ? JSON.stringify(row.value, null, 2) : String(row.value);
}
