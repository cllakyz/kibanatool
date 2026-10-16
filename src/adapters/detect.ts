// Finds open detail views on a Discover page, whatever the Kibana version (spec §5.1).
import { dataViewIdFromState, isEsqlState, readAppState } from "../kibana/discover-state";
import { isDiscoverPath } from "../kibana/prefix";
import { findDataGridDetailViews } from "./data-grid";
import { findGridRows, gridRowIdentity, gridRowOf } from "./grid-rows";
import { LEGACY_ROW_SELECTOR, findLegacyRows, legacyRowIdentity } from "./legacy-rows";
import { findLegacyDetailViews } from "./legacy-table";
import type { DetailView, RowView } from "./types";

export function findDetailViews(
  doc: Document,
  location: { pathname: string; hash: string },
  prefix: string,
): DetailView[] {
  if (!isDiscoverPath(location.pathname, prefix)) return [];
  const state = readAppState(location.hash);
  if (isEsqlState(state)) return [];
  const fallback = dataViewIdFromState(state);
  return [...findLegacyDetailViews(doc, fallback), ...findDataGridDetailViews(doc, fallback)];
}

type PageLocation = { pathname: string; hash: string };

/**
 * Spec 003 research R5: rows get strips only in Discover's main result table (`#/`, or a saved search's `#/view/<id>`),
 * not in the surrounding-documents or single-document views, which `isDiscoverPath` alone cannot tell apart.
 * Returns the data view of the table, or null when its rows get no strips.
 */
function mainTableDataView(location: PageLocation, prefix: string): string | undefined | null {
  if (!isDiscoverPath(location.pathname, prefix)) return null;
  const route = location.hash.replace(/^#/, "").split("?")[0] ?? "";
  if (route !== "" && route !== "/" && !route.startsWith("/view/")) return null;
  const state = readAppState(location.hash);
  return isEsqlState(state) ? null : dataViewIdFromState(state);
}

/** The result rows of Discover's main table, 7.17 legacy or 8.x/9.x grid, and what identifies each (spec 003). */
export function findRows(doc: Document, location: PageLocation, prefix: string): RowView[] {
  const dataViewId = mainTableDataView(location, prefix);
  return dataViewId === null ? [] : [...findLegacyRows(doc, dataViewId), ...findGridRows(doc, dataViewId)];
}

/** The result row that contains `target`, or null. */
export function rowOf(target: Element): Element | null {
  return target.closest(LEGACY_ROW_SELECTOR) ?? gridRowOf(target);
}

/** One row's identity, gated like findRows; read fresh at every call, since Kibana reuses rows (research R2). */
export function rowIdentity(row: Element, location: PageLocation, prefix: string): RowView["identity"] {
  const dataViewId = mainTableDataView(location, prefix);
  if (dataViewId === null) return null;
  return row.matches(LEGACY_ROW_SELECTOR) ? legacyRowIdentity(row, dataViewId) : gridRowIdentity(row, dataViewId);
}
