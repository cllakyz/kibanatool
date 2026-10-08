// Which data views the bar needs time fields for (spec §7.3, §7.4), and loading them.
import type { Action } from "../core/config";
import type { KibanaClient } from "../kibana/client";

/** The open data view (Markdown header, default target) and every target of a Discover action with a window. */
export function timeFieldTargets(actions: Action[], dataViewId: string): string[] {
  const ids = new Set([dataViewId]);
  for (const action of actions) {
    if (action.kind === "discover" && action.windowMinutes !== undefined) ids.add(action.dataViewId ?? dataViewId);
  }
  return [...ids];
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
