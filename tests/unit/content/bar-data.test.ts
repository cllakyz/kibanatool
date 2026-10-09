import { describe, expect, it } from "vitest";
import { loadDataViews, loadTimeFields, timeFieldTargets } from "../../../src/content/bar-data";
import type { Action } from "../../../src/core/config";
import { KibanaError } from "../../../src/kibana/client";

const discover = (id: string, extra: { windowMinutes?: number; dataViewId?: string; dataViewName?: string }): Action => ({
  id,
  kind: "discover",
  label: id,
  enabled: true,
  environmentIds: [],
  conditions: [],
  queryTemplate: "",
  ...extra,
});

describe("timeFieldTargets", () => {
  it("lists the open data view and every target of a windowed Discover action, once", () => {
    const actions = [
      discover("a", { windowMinutes: 5 }),
      discover("b", { windowMinutes: 5, dataViewId: "other" }),
      discover("c", { dataViewId: "no-window" }),
      discover("d", { windowMinutes: 1, dataViewId: "other" }),
    ];
    expect(timeFieldTargets(actions, "current", [])).toEqual(["current", "other"]);
  });

  it("adds the data view a windowed action names, once it resolves, and skips one that does not", () => {
    const views = [{ id: "named", title: "app_log", name: "App logs" }];
    const actions = [discover("a", { windowMinutes: 5, dataViewName: "App logs" }), discover("b", { windowMinutes: 5, dataViewName: "nope" })];
    expect(timeFieldTargets(actions, "current", views)).toEqual(["current", "named"]);
    expect(timeFieldTargets(actions, "current", null)).toEqual(["current"]);
  });
});

describe("loadTimeFields", () => {
  it("maps each data view to its time field and treats a failed lookup as none", async () => {
    const client = {
      async getDataView(id: string) {
        if (id === "broken") throw new KibanaError("notFound", "Data view not found", 404);
        return id === "logs" ? { title: "logs-*", timeFieldName: "@timestamp" } : { title: "*_log" };
      },
    };
    expect(await loadTimeFields(client, ["logs", "all", "broken"])).toEqual(
      new Map([
        ["logs", "@timestamp"],
        ["all", undefined],
        ["broken", undefined],
      ]),
    );
  });
});

describe("loadDataViews", () => {
  it("reads the list only when an action names a data view", async () => {
    let calls = 0;
    const client = {
      async listDataViews() {
        calls++;
        return [{ id: "a", title: "x" }];
      },
    };
    expect(await loadDataViews(client, [discover("plain", {})])).toEqual([]);
    expect(calls).toBe(0);
    expect(await loadDataViews(client, [discover("named", { dataViewName: "x" })])).toEqual([{ id: "a", title: "x" }]);
  });

  it("returns null when the list cannot be read", async () => {
    const client = {
      async listDataViews(): Promise<never> {
        throw new KibanaError("forbidden", "HTTP 403", 403);
      },
    };
    expect(await loadDataViews(client, [discover("named", { dataViewName: "x" })])).toBeNull();
  });
});
