import { describe, expect, it } from "vitest";
import type { DiscoverAction } from "../../../src/core/config";
import { discoverTarget, resolveDataViewName } from "../../../src/core/data-view-names";

const views = [
  { id: "app-log", title: "app_log", name: "app_log" },
  { id: "app-log-named", title: "app_log", name: "App logs" },
  { id: "all-logs", title: "*_log" },
];

describe("resolveDataViewName", () => {
  it("matches the display name or the index pattern exactly, counting each data view once", () => {
    expect(resolveDataViewName(views, "App logs")).toEqual({ ok: true, id: "app-log-named" });
    expect(resolveDataViewName(views, "*_log")).toEqual({ ok: true, id: "all-logs" });
    expect(resolveDataViewName([{ id: "a", title: "x", name: "x" }], "x")).toEqual({ ok: true, id: "a" });
  });

  it("reports no match, several matches and a list that could not be read", () => {
    expect(resolveDataViewName(views, "app_log")).toEqual({ ok: false, passive: { kind: "dataViewAmbiguous", name: "app_log", count: 2 } });
    expect(resolveDataViewName(views, "player_login_log")).toEqual({
      ok: false,
      passive: { kind: "dataViewNotFound", name: "player_login_log" },
    });
    expect(resolveDataViewName(null, "App logs")).toEqual({ ok: false, passive: { kind: "dataViewLookupFailed" } });
  });

  it("is case-sensitive and does not trim", () => {
    expect(resolveDataViewName(views, "app logs").ok).toBe(false);
    expect(resolveDataViewName(views, " *_log").ok).toBe(false);
  });
});

describe("discoverTarget", () => {
  const action = (extra: Partial<DiscoverAction>): DiscoverAction => ({
    id: "d",
    kind: "discover",
    label: "D",
    enabled: true,
    environmentIds: [],
    conditions: [],
    queryTemplate: "",
    ...extra,
  });

  it("uses the named data view, then the given id, then the open log's data view", () => {
    expect(discoverTarget(action({ dataViewName: "App logs" }), "open", views)).toEqual({ ok: true, id: "app-log-named" });
    expect(discoverTarget(action({ dataViewId: "logs" }), "open", null)).toEqual({ ok: true, id: "logs" });
    expect(discoverTarget(action({}), "open", null)).toEqual({ ok: true, id: "open" });
  });
});
