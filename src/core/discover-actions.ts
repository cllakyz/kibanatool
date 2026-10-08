// Discover actions (spec §7.3): a KQL query from the log, optionally ±N minutes around the log's time.
import { discoverUrl } from "../kibana/url";
import type { Action, DiscoverAction } from "./config";
import { evaluateConditions } from "./conditions";
import type { FieldMap } from "./fields";
import type { HiddenReason } from "./link-actions";
import { resolveTemplate } from "./template";
import type { TimeRange } from "./types";

/** `12345` → `"12345"`: KQL quoting with `\` and `"` escaped. */
export function kqlQuote(value: string): string {
  return `"${value.replace(/[\\"]/g, "\\$&")}"`;
}

const ZONELESS = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

/** Epoch milliseconds of a time field value. Elasticsearch reads a date without a zone as UTC; Date.parse would not. */
export function logTimeMs(value: unknown): number | undefined {
  if (Array.isArray(value)) return logTimeMs(value[0]);
  const valid = (ms: number) => (Number.isFinite(new Date(ms).getTime()) ? ms : undefined);
  if (typeof value === "number") return valid(value);
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (/^\d+$/.test(text)) return valid(Number(text));
  return valid(Date.parse(ZONELESS.test(text) ? `${text.replace(" ", "T")}Z` : text));
}

export type QueryResolution = { ok: true; query: string } | { ok: false; reason: Exclude<HiddenReason, "invalidUrl"> };

export function resolveDiscoverQuery(action: DiscoverAction, fields: FieldMap): QueryResolution {
  if (!action.enabled) return { ok: false, reason: "disabled" };
  if (!evaluateConditions(action.conditions, fields)) return { ok: false, reason: "conditions" };
  const query = resolveTemplate(action.queryTemplate.trim(), fields, kqlQuote);
  return query === null ? { ok: false, reason: "missingValue" } : { ok: true, query };
}

export interface DiscoverContext {
  prefix: string;
  /** The open log's data view; the target when an action names none. */
  dataViewId: string;
  /** `_g.time` of the current URL, kept when no window applies. */
  currentTime?: TimeRange;
  /** Time field per data view id; undefined when it has none or could not be read. */
  timeFields: ReadonlyMap<string, string | undefined>;
}

export type DiscoverButton =
  | { id: string; label: string; url: string }
  | { id: string; label: string; disabled: "noTime" };

export function buildDiscoverButtons(actions: Action[], fields: FieldMap, context: DiscoverContext): DiscoverButton[] {
  return actions.flatMap((action): DiscoverButton[] => {
    if (action.kind !== "discover") return [];
    const resolved = resolveDiscoverQuery(action, fields);
    if (!resolved.ok) return [];
    const dataViewId = action.dataViewId ?? context.dataViewId;
    const range =
      action.windowMinutes === undefined
        ? undefined
        : timeWindow(fields, context.timeFields.get(dataViewId), action.windowMinutes);
    // Spec §7.3: without a time, a window-only action would just reopen the current view.
    if (action.windowMinutes !== undefined && !range && resolved.query === "") {
      return [{ id: action.id, label: action.label, disabled: "noTime" }];
    }
    const url = discoverUrl({ prefix: context.prefix, dataViewId, query: resolved.query, time: range ?? context.currentTime });
    return [{ id: action.id, label: action.label, url }];
  });
}

function timeWindow(fields: FieldMap, timeField: string | undefined, minutes: number): TimeRange | undefined {
  const time = timeField === undefined ? undefined : logTimeMs(fields[timeField]);
  if (time === undefined) return undefined;
  const span = minutes * 60_000;
  return { from: new Date(time - span).toISOString(), to: new Date(time + span).toISOString() };
}
