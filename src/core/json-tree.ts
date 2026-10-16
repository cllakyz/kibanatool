// The panel's data (spec §7.6): JSON-, XML- (Plan 6 spec §5.3) and form-text fields (spec 002 FR-003), long or
// multi-line text (spec 002 FR-007), a flat, pre-ordered row list, so collapsing, search and revealing a match are plain
// array operations, and the one search rule shared by the tree and the text view (spec 002 FR-012).
import { type StructuredKind, expandStructured, flattenSource, isPlainObject, parseStructured } from "./fields";
import { escapeRegExp } from "./mask";

/** Text at least this long is listed even on one line; shorter tokens, signatures and headers stay out (spec 002 FR-007). */
export const TEXT_VIEW_MIN_LENGTH = 500;

/** A field the panel lists: structured text opens as a tree, other text as text. */
export type PanelField =
  | {
      /** Dot path of the `_source` field. */
      path: string;
      kind: StructuredKind;
      /** The parsed text, with the structured text inside it parsed too. */
      value: Record<string, unknown> | unknown[];
    }
  | { path: string; kind: "text"; text: string };

export interface JsonRow {
  /** Relative to the field: "" for the root, then ".key", "[0]" or `["odd key"]` segments. */
  path: string;
  depth: number;
  /** Property name, array index, or null for the root. */
  key: string | number | null;
  value: unknown;
  container: "object" | "array" | null;
}

/** A line break is left after trimming. The listing and the text view's first wrapping both use it (spec 002 FR-011). */
export function isMultiLine(text: string): boolean {
  return /[\r\n]/.test(text.trim());
}

/** `_source` text fields in field order: structured text, then other text that is multi-line or long (spec 002 FR-007). */
export function panelFields(source: Record<string, unknown>): PanelField[] {
  return Object.entries(flattenSource(source, false)).flatMap(([path, text]): PanelField[] => {
    if (typeof text !== "string") return [];
    const kind = parseStructured(text)?.kind;
    if (kind === undefined) return isMultiLine(text) || text.length >= TEXT_VIEW_MIN_LENGTH ? [{ path, kind: "text", text }] : [];
    const value = expandStructured(text);
    return isPlainObject(value) || Array.isArray(value) ? [{ path, kind, value }] : [];
  });
}

// XML's `@attribute` and `#text` keys stay dot segments, so a copied path works in a template (Plan 6 spec §5.3).
const segment = (key: string): string => (/^[@#]?[A-Za-z_$][\w$]*$/.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`);

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

/**
 * The one definition of a search match: `query` as plain text, ignoring case; undefined for a blank query. Not global,
 * so `test` keeps no `lastIndex` from one row to the next.
 */
export function searchPattern(query: string): RegExp | undefined {
  const needle = query.trim();
  return needle === "" ? undefined : new RegExp(escapeRegExp(needle), "iu");
}

/** Paths of rows whose property name or primitive value contains `query`, ignoring case. */
export function matchPaths(rows: JsonRow[], query: string): string[] {
  const pattern = searchPattern(query);
  if (!pattern) return [];
  return rows
    .filter((row) => (typeof row.key === "string" && pattern.test(row.key)) || (row.container === null && pattern.test(String(row.value))))
    .map((row) => row.path);
}

/** `[start, end)` of every match in `text`, from the text itself: a lower-cased copy can change length ("İ"). */
export function textMatches(text: string, query: string): [start: number, end: number][] {
  const pattern = searchPattern(query);
  if (!pattern) return [];
  return [...text.matchAll(new RegExp(pattern.source, `${pattern.flags}g`))].map((match) => [match.index, match.index + match[0].length]);
}

/** `text` cut into plain runs and matches; `match` is the match's index in `matches`. */
export function textSegments(text: string, matches: [number, number][]): { text: string; match?: number }[] {
  const segments: { text: string; match?: number }[] = [];
  let at = 0;
  matches.forEach(([start, end], match) => {
    if (start > at) segments.push({ text: text.slice(at, start) });
    segments.push({ text: text.slice(start, end), match });
    at = end;
  });
  if (at < text.length || segments.length === 0) segments.push({ text: text.slice(at) });
  return segments;
}

/** `collapsed` without the ancestors of `path`, so that row becomes visible. */
export function revealPath(collapsed: ReadonlySet<string>, path: string): Set<string> {
  return new Set([...collapsed].filter((parent) => !isDescendant(path, parent)));
}

/** "Copy value": primitives as text, containers as indented JSON. */
export function copyableValue(row: JsonRow): string {
  return row.container ? JSON.stringify(row.value, null, 2) : String(row.value);
}
