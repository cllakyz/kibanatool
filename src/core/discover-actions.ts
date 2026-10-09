// Discover actions (spec §7.3): a KQL query from the log, optionally ±N minutes around the log's time.
import { discoverUrl } from "../kibana/url";
import type { Action, DiscoverAction } from "./config";
import { evaluateConditions } from "./conditions";
import type { FieldMap } from "./fields";
import type { HiddenReason } from "./link-actions";
import type { PassiveReason } from "./passive";
import { type Variables, fillTemplate } from "./template";
import type { TimeRange } from "./types";

/** `12345` → `"12345"`: KQL quoting with `\` and `"` escaped. */
export function kqlQuote(value: string): string {
  return `"${value.replace(/[\\"]/g, "\\$&")}"`;
}

const ZONELESS = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

/** Epoch values below 1e11 are seconds: as milliseconds they would fall before March 1973. */
const fromEpoch = (epoch: number): number => (epoch < 1e11 ? epoch * 1000 : epoch);

/** Epoch milliseconds of a time field value. Elasticsearch reads a date without a zone as UTC; Date.parse would not. */
export function logTimeMs(value: unknown): number | undefined {
  if (Array.isArray(value)) return logTimeMs(value[0]);
  const valid = (ms: number) => (Number.isFinite(new Date(ms).getTime()) ? ms : undefined);
  if (typeof value === "number") return valid(fromEpoch(value));
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (/^\d+$/.test(text)) return valid(fromEpoch(Number(text)));
  return valid(Date.parse(ZONELESS.test(text) ? `${text.replace(" ", "T")}Z` : text));
}

export type QueryResolution =
  | { ok: true; query: string }
  | { ok: false; reason: Exclude<HiddenReason, "invalidUrl"> }
  | { ok: false; passive: PassiveReason };

export function resolveDiscoverQuery(action: DiscoverAction, fields: FieldMap, variables: Variables): QueryResolution {
  if (!action.enabled) return { ok: false, reason: "disabled" };
  if (!evaluateConditions(action.conditions, fields)) return { ok: false, reason: "conditions" };
  const filled = fillTemplate(action.queryTemplate.trim(), fields, variables, { field: kqlQuote, variable: kqlQuote });
  if (filled.ok) return { ok: true, query: filled.text };
  return filled.reason === "missingVariable"
    ? { ok: false, passive: { kind: "missingVariable", variable: filled.variable } }
    : { ok: false, reason: "missingValue" };
}

export interface DiscoverContext {
  prefix: string;
  /** The open log's data view; the target when an action names none. */
  dataViewId: string;
  /** `_g.time` of the current URL, kept when no window applies. */
  currentTime?: TimeRange;
  /** Time field per data view id; undefined when it has none or could not be read. */
  timeFields: ReadonlyMap<string, string | undefined>;
  /** The open environment's variables (Plan 4). */
  variables: Variables;
}

export type DiscoverButton = { id: string; label: string; url: string } | { id: string; label: string; passive: PassiveReason };

export function buildDiscoverButtons(actions: Action[], fields: FieldMap, context: DiscoverContext): DiscoverButton[] {
  return actions.flatMap((action): DiscoverButton[] => {
    if (action.kind !== "discover") return [];
    const resolved = resolveDiscoverQuery(action, fields, context.variables);
    if (!resolved.ok) return "passive" in resolved ? [{ id: action.id, label: action.label, passive: resolved.passive }] : [];
    const dataViewId = action.dataViewId ?? context.dataViewId;
    const range =
      action.windowMinutes === undefined
        ? undefined
        : timeWindow(fields, context.timeFields.get(dataViewId), action.windowMinutes);
    // Spec §7.3: without a time, a window-only action would just reopen the current view.
    if (action.windowMinutes !== undefined && !range && resolved.query === "") {
      return [{ id: action.id, label: action.label, passive: { kind: "noTime" } }];
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
