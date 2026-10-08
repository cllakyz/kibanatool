// Finds open detail views on a Discover page, whatever the Kibana version (spec §5.1).
import { dataViewIdFromState, isEsqlState, readAppState } from "../kibana/discover-state";
import { isDiscoverPath } from "../kibana/prefix";
import { findDataGridDetailViews } from "./data-grid";
import { findLegacyDetailViews } from "./legacy-table";
import type { DetailView } from "./types";

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
