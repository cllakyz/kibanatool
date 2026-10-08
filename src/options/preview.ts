// Live preview of one action against a pasted sample log (spec §9).
import type { Action } from "../core/config";
import { resolveDiscoverQuery } from "../core/discover-actions";
import { type FieldMap, flattenDoc, isPlainObject } from "../core/fields";
import { type HiddenReason, resolveLinkAction } from "../core/link-actions";

export type SampleResult = { ok: true; fields: FieldMap } | { ok: false; error: string };

/** A raw hit ({_id, _index, _source}) or just its _source object, flattened like a real log. */
export function parseSample(text: string): SampleResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  if (!isPlainObject(parsed)) return { ok: false, error: "Expected a JSON object" };
  const hit = isPlainObject(parsed._source)
    ? { _id: String(parsed._id ?? ""), _index: String(parsed._index ?? ""), _source: parsed._source }
    : { _id: "", _index: "", _source: parsed };
  return { ok: true, fields: flattenDoc(hit) };
}

export type Preview = { shown: true; text: string } | { shown: false; reason: HiddenReason };

/** The link URL or KQL query the bar would use, or why it would show nothing. */
export function previewAction(action: Action, fields: FieldMap): Preview {
  if (action.kind === "link") {
    const result = resolveLinkAction(action, fields);
    return result.ok ? { shown: true, text: result.url } : { shown: false, reason: result.reason };
  }
  const result = resolveDiscoverQuery(action, fields);
  return result.ok ? { shown: true, text: result.query } : { shown: false, reason: result.reason };
}
