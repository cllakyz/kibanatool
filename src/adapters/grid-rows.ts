// Kibana 8.x/9.x data grid: result rows (spec 003 user story 2; research R4).
import type { RowView } from "./types";

export const GRID_ROW_SELECTOR = '[role="row"]';
const SELECT_PREFIX = "dscGridSelectDoc-";
const SELECT_SELECTOR = `[data-test-subj^="${SELECT_PREFIX}"]`;

/**
 * A row's selection checkbox is `dscGridSelectDoc-<index>::<id>::<routing>` (verified on 8.19.23 and 9.5.5, the
 * Observability view included). Index names cannot contain ":" (Elasticsearch ≥ 7), so the index ends at the first
 * "::" and the id at the last one, which keeps an id that itself contains "::". Null when malformed.
 */
export function parseGridDocId(value: string): { index: string; id: string } | null {
  const first = value.indexOf("::");
  const last = value.lastIndexOf("::");
  if (first < 0 || last === first) return null;
  const index = value.slice(0, first);
  const id = value.slice(first + 2, last);
  return index && id ? { index, id } : null;
}

export function findGridRows(root: ParentNode, dataViewId: string | undefined): RowView[] {
  return [...root.querySelectorAll(SELECT_SELECTOR)].flatMap((select) => {
    const row = select.closest(GRID_ROW_SELECTOR);
    return row ? [{ row, identity: gridRowIdentity(row, dataViewId) }] : [];
  });
}

/** The grid row around `target`: only a row with a selection checkbox, so never the header row. */
export function gridRowOf(target: Element): Element | null {
  const row = target.closest(GRID_ROW_SELECTOR);
  return row?.querySelector(SELECT_SELECTOR) ? row : null;
}

export function gridRowIdentity(row: Element, dataViewId: string | undefined): RowView["identity"] {
  const value = row.querySelector(SELECT_SELECTOR)?.getAttribute("data-test-subj")?.slice(SELECT_PREFIX.length);
  const hit = value === undefined ? null : parseGridDocId(value);
  return hit && dataViewId ? { dataViewId, ...hit } : null;
}
