import { describe, expect, it } from "vitest";
import { loadTimeFields, timeFieldTargets } from "../../../src/content/bar-data";
import type { Action } from "../../../src/core/config";
import { KibanaError } from "../../../src/kibana/client";

const discover = (id: string, extra: { windowMinutes?: number; dataViewId?: string }): Action => ({
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
    expect(timeFieldTargets(actions, "current")).toEqual(["current", "other"]);
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
