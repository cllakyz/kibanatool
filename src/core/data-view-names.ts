// The data view a Discover action opens (Plan 4 spec §5.2): named by display name or index pattern, exactly.
import type { DiscoverAction } from "./config";
import type { PassiveReason } from "./passive";
import type { DataViewSummary } from "./types";

export type DataViewTarget = { ok: true; id: string } | { ok: false; passive: PassiveReason };

/** `views` is null when the list could not be read. */
export function resolveDataViewName(views: readonly DataViewSummary[] | null, name: string): DataViewTarget {
  if (views === null) return { ok: false, passive: { kind: "dataViewLookupFailed" } };
  const ids = [...new Set(views.filter((view) => view.name === name || view.title === name).map((view) => view.id))];
  const [only] = ids;
  if (ids.length === 1 && only !== undefined) return { ok: true, id: only };
  return ids.length === 0
    ? { ok: false, passive: { kind: "dataViewNotFound", name } }
    : { ok: false, passive: { kind: "dataViewAmbiguous", name, count: ids.length } };
}

/** The named data view, else the action's id, else the open log's data view. */
export function discoverTarget(
  action: DiscoverAction,
  openDataViewId: string,
  views: readonly DataViewSummary[] | null,
): DataViewTarget {
  if (action.dataViewName !== undefined) return resolveDataViewName(views, action.dataViewName);
  return { ok: true, id: action.dataViewId ?? openDataViewId };
}
