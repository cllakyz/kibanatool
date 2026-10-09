// What the bar loads besides the log (spec §7.3, §7.4; Plan 4 spec §5.2): data views and their time fields.
import type { Action } from "../core/config";
import { discoverTarget } from "../core/data-view-names";
import type { DataViewSummary } from "../core/types";
import type { KibanaClient } from "../kibana/client";

/** The open data view (Markdown header, default target) and every resolvable target of a Discover action with a window. */
export function timeFieldTargets(actions: Action[], dataViewId: string, views: readonly DataViewSummary[] | null): string[] {
  const ids = new Set([dataViewId]);
  for (const action of actions) {
    if (action.kind !== "discover" || action.windowMinutes === undefined) continue;
    const target = discoverTarget(action, dataViewId, views);
    if (target.ok) ids.add(target.id);
  }
  return [...ids];
}

/** Plan 4 spec §5.2: read only when an action names its data view. Null when it cannot be read. */
export async function loadDataViews(
  client: Pick<KibanaClient, "listDataViews">,
  actions: Action[],
): Promise<DataViewSummary[] | null> {
  if (!actions.some((action) => action.kind === "discover" && action.dataViewName !== undefined)) return [];
  try {
    return await client.listDataViews();
  } catch (error) {
    console.debug("[kibanatool] data view list failed:", error);
    return null;
  }
}

/** Time field per data view. A failed lookup counts as "no time field": the bar still works without it. */
export async function loadTimeFields(
  client: Pick<KibanaClient, "getDataView">,
  ids: string[],
): Promise<Map<string, string | undefined>> {
  const entries = await Promise.all(
    ids.map(async (id): Promise<[string, string | undefined]> => {
      try {
        return [id, (await client.getDataView(id)).timeFieldName];
      } catch (error) {
        console.debug("[kibanatool] data view lookup failed:", id, error);
        return [id, undefined];
      }
    }),
  );
  return new Map(entries);
}
