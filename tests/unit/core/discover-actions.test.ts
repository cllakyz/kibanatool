import { describe, expect, it } from "vitest";
import type { Action, DiscoverAction } from "../../../src/core/config";
import {
  type DiscoverContext,
  buildDiscoverButtons,
  kqlQuote,
  logTimeMs,
  resolveDiscoverQuery,
} from "../../../src/core/discover-actions";
import { readGlobalTime, readRisonParam } from "../../../src/kibana/discover-state";

const discover = (overrides: Partial<DiscoverAction> = {}): DiscoverAction => ({
  id: "same-user",
  kind: "discover",
  label: "Same user",
  enabled: true,
  environmentIds: [],
  conditions: [],
  queryTemplate: "user_id:{user_id}",
  ...overrides,
});

const context = (overrides: Partial<DiscoverContext> = {}): DiscoverContext => ({
  prefix: "",
  dataViewId: "app-log",
  currentTime: { from: "now-15m", to: "now" },
  timeFields: new Map<string, string | undefined>([
    ["app-log", "datetime"],
    ["all-logs", undefined],
  ]),
  ...overrides,
});

const fields = { user_id: 12345, datetime: "2026-08-12T10:00:00.000Z", note: 'say "hi" \\o/' };

/** The link's _a and _g.time as Kibana reads them. */
function state(button: unknown) {
  const url = (button as { url: string }).url;
  const hash = url.slice(url.indexOf("#"));
  return { a: readRisonParam(hash, "_a"), time: readGlobalTime(hash) };
}

describe("kqlQuote", () => {
  it("wraps the value in quotes and escapes backslashes and quotes", () => {
    expect(kqlQuote("12345")).toBe('"12345"');
    expect(kqlQuote('say "hi" \\o/')).toBe('"say \\"hi\\" \\\\o/"');
  });
});

describe("logTimeMs", () => {
  it("returns undefined for epoch values outside the Date range", () => {
    expect(logTimeMs(1e20)).toBeUndefined();
    expect(logTimeMs("99999999999999999")).toBeUndefined();
  });

  it("reads Monolog times with microseconds and an offset", () => {
    expect(logTimeMs("2026-08-12T10:00:00.123456+03:00")).toBe(Date.UTC(2026, 7, 12, 7, 0, 0, 123));
  });

  it("reads a time without a zone as UTC, like Elasticsearch", () => {
    expect(logTimeMs("2026-08-12 10:00:00")).toBe(Date.UTC(2026, 7, 12, 10));
    expect(logTimeMs("2026-08-12T10:00:00.5")).toBe(Date.UTC(2026, 7, 12, 10, 0, 0, 500));
  });

  it("reads epoch milliseconds as a number or text, and the first value of an array", () => {
    expect(logTimeMs(1786528800000)).toBe(1786528800000);
    expect(logTimeMs("1786528800000")).toBe(1786528800000);
    expect(logTimeMs(["2026-08-12T10:00:00Z", "x"])).toBe(Date.UTC(2026, 7, 12, 10));
  });

  it("returns undefined for anything else", () => {
    for (const value of ["tomorrow", "", null, undefined, {}, [], Number.NaN]) expect(logTimeMs(value)).toBeUndefined();
  });
});

describe("resolveDiscoverQuery", () => {
  it("quotes placeholder values for KQL", () => {
    expect(resolveDiscoverQuery(discover({ queryTemplate: "note:{note}" }), fields)).toEqual({
      ok: true,
      query: 'note:"say \\"hi\\" \\\\o/"',
    });
  });

  it("hides like link actions: disabled, failing conditions, missing values", () => {
    expect(resolveDiscoverQuery(discover({ enabled: false }), fields)).toEqual({ ok: false, reason: "disabled" });
    expect(resolveDiscoverQuery(discover({ conditions: [{ field: "level", op: "exists" }] }), fields)).toEqual({
      ok: false,
      reason: "conditions",
    });
    expect(resolveDiscoverQuery(discover({ queryTemplate: "x:{missing}" }), fields)).toEqual({ ok: false, reason: "missingValue" });
  });

  it("allows an empty query", () => {
    expect(resolveDiscoverQuery(discover({ queryTemplate: "  " }), fields)).toEqual({ ok: true, query: "" });
  });
});

describe("buildDiscoverButtons", () => {
  it("centers a ±N minute window on the log's time in the target data view", () => {
    const [button] = buildDiscoverButtons([discover({ windowMinutes: 5 })], fields, context());
    expect(button).toMatchObject({ id: "same-user", label: "Same user" });
    expect(state(button)).toEqual({
      a: { index: "app-log", query: { language: "kuery", query: 'user_id:"12345"' } },
      time: { from: "2026-08-12T09:55:00.000Z", to: "2026-08-12T10:05:00.000Z" },
    });
  });

  it("keeps the current time range without a window, or when the target data view has no time field", () => {
    const [plain] = buildDiscoverButtons([discover()], fields, context());
    expect(state(plain).time).toEqual({ from: "now-15m", to: "now" });
    const [noField] = buildDiscoverButtons([discover({ windowMinutes: 5, dataViewId: "all-logs" })], fields, context());
    expect(state(noField)).toEqual({
      a: { index: "all-logs", query: { language: "kuery", query: 'user_id:"12345"' } },
      time: { from: "now-15m", to: "now" },
    });
  });

  it("disables a window-only action when no time is available", () => {
    const action = discover({ queryTemplate: "", windowMinutes: 5 });
    const disabled = [{ id: "same-user", label: "Same user", disabled: "noTime" }];
    expect(buildDiscoverButtons([action], { user_id: 1 }, context())).toEqual(disabled);
    expect(buildDiscoverButtons([action], fields, context({ timeFields: new Map() }))).toEqual(disabled);
  });

  it("leaves out _g when the current URL has no time range either", () => {
    const [button] = buildDiscoverButtons([discover()], fields, context({ currentTime: undefined }));
    expect((button as { url: string }).url).not.toContain("_g=");
  });

  it("skips link actions and hidden Discover actions", () => {
    const actions: Action[] = [
      { id: "l", kind: "link", label: "L", enabled: true, environmentIds: [], conditions: [], urlTemplate: "https://x.test" },
      discover({ id: "off", enabled: false }),
      discover({ id: "ok" }),
    ];
    expect(buildDiscoverButtons(actions, fields, context()).map((button) => button.id)).toEqual(["ok"]);
  });
});
