// Discover links (spec §7.3, §7.4). Rison values are percent-encoded so quotes, "&" and "#" survive
// (verified on 7.17.29: Discover shows the exact query, data view and time range).
import rison from "rison-node";
import { resolveDatemath } from "../core/datemath";
import { isPlainObject } from "../core/fields";
import type { DocIdentity, TimeRange } from "../core/types";
import { readRisonParam } from "./discover-state";

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

/**
 * The current view with `_g.time` turned into absolute dates (spec §7.4), so a shared link shows
 * the same logs later. Other `_g` keys and every other parameter are kept as they are.
 * Null when the URL has no time range or uses date math that resolveDatemath does not support.
 */
export function fixedTimeUrl(href: string, now: Date): string | null {
  const hashStart = href.indexOf("#");
  const queryStart = href.indexOf("?", hashStart);
  if (hashStart === -1 || queryStart === -1) return null;
  const global = readRisonParam(href.slice(hashStart), "_g");
  const time = global.time;
  if (!isPlainObject(time) || typeof time.from !== "string" || typeof time.to !== "string") return null;
  const from = resolveDatemath(time.from, now, false);
  const to = resolveDatemath(time.to, now, true);
  if (from === null || to === null) return null;
  const encoded = `_g=${encodeRison({ ...global, time: { ...time, from, to } })}`;
  const params = href.slice(queryStart + 1).split("&").map((param) => (param.startsWith("_g=") ? encoded : param));
  return `${href.slice(0, queryStart + 1)}${params.join("&")}`;
}
