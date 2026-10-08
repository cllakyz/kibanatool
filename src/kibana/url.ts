// Discover links (spec §7.3, §7.4). Rison values are percent-encoded so quotes, "&" and "#" survive
// (verified on 7.17.29: Discover shows the exact query, data view and time range).
import rison from "rison-node";
import type { DocIdentity, TimeRange } from "../core/types";

const encodeRison = (value: unknown): string => encodeURIComponent(rison.encode(value));

/** Relative to the page origin; the bar opens it in a new tab (spec §7.3). */
export function discoverUrl(options: { prefix: string; dataViewId: string; query: string; time?: TimeRange }): string {
  const { prefix, dataViewId, query, time } = options;
  const global = time ? `_g=${encodeRison({ time })}&` : "";
  return `${prefix}/app/discover#/?${global}_a=${encodeRison({ index: dataViewId, query: { language: "kuery", query } })}`;
}

/** `<prefix>/app/discover#/doc/<dv>/<_index>?id=<_id>`: the single-document route of every version. */
export function singleDocPath(prefix: string, identity: DocIdentity): string {
  const { dataViewId, index, id } = identity;
  return `${prefix}/app/discover#/doc/${encodeURIComponent(dataViewId)}/${encodeURIComponent(index)}?id=${encodeURIComponent(id)}`;
}
