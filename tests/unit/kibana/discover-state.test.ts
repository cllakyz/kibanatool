import { describe, expect, it } from "vitest";
import { dataViewIdFromState, isEsqlState, readAppState } from "../../../src/kibana/discover-state";

// Real hashes captured during the spike (7.17 percent-encodes quotes; 9.5 adds _tab).
const hash717 =
  "#/?_g=(time:(from:%272026-08-12T00:00:00.000Z%27,to:%272026-08-21T00:00:00.000Z%27))&_a=(columns:!(),filters:!(),index:%273dea60c0-bfcc-11f1-a3fe-fbd7628c7754%27,interval:auto,query:(language:kuery,query:%27%27),sort:!(!(datetime,desc)))";
const hash95 =
  "#/?_g=(time:(from:now-2d,to:now))&_a=(columns:!(),dataSource:(dataViewId:app-log,type:dataView),filters:!(),interval:auto,query:(language:kuery,query:''),sort:!(!('@timestamp',desc)))&_tab=(tabId:'6d09')";

describe("readAppState", () => {
  it("reads the 7.17 index and the 8.x/9.x dataSource", () => {
    expect(dataViewIdFromState(readAppState(hash717))).toBe("3dea60c0-bfcc-11f1-a3fe-fbd7628c7754");
    expect(dataViewIdFromState(readAppState(hash95))).toBe("app-log");
  });

  it("returns an empty state when _a is missing or unparsable", () => {
    expect(readAppState("#/doc/dv/index?id=1")).toEqual({});
    expect(readAppState("#/?_g=(time:(from:now-1d,to:now))")).toEqual({});
    expect(readAppState("#/?_a=(((")).toEqual({});
    expect(readAppState("")).toEqual({});
  });
});

describe("isEsqlState", () => {
  it("detects ES|QL mode", () => {
    expect(isEsqlState(readAppState("#/?_a=(dataSource:(type:esql),query:(esql:'FROM logs-* | LIMIT 10'))"))).toBe(true);
    expect(isEsqlState(readAppState("#/?_a=(query:(esql:'FROM logs-*'))"))).toBe(true);
    expect(isEsqlState(readAppState(hash95))).toBe(false);
  });
});
