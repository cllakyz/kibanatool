import rison from "rison-node";
import { describe, expect, it } from "vitest";
import { discoverUrl, fixedTimeUrl, singleDocPath } from "../../../src/kibana/url";
import { readRisonParam } from "../../../src/kibana/discover-state";

/** Reads a rison parameter the way Kibana does: URL-decode, then rison-decode. */
function param(url: string, name: string): unknown {
  const hash = url.slice(url.indexOf("#"));
  return rison.decode(new URLSearchParams(hash.slice(hash.indexOf("?") + 1)).get(name)!);
}

describe("discoverUrl", () => {
  it("round-trips KQL with quotes, backslashes, &, #, ! and Turkish letters (verified on 7.17)", () => {
    const query = 'message:"a \\"q\\" O\'Brien & #x Çağ!" and path:"C:\\\\tmp"';
    const time = { from: "2026-08-12T07:00:00.000Z", to: "2026-08-12T09:00:00.000Z" };
    const url = discoverUrl({ prefix: "/s/team", dataViewId: "dv-1", query, time });
    expect(url.startsWith("/s/team/app/discover#/?_g=")).toBe(true);
    expect(param(url, "_a")).toEqual({ index: "dv-1", query: { language: "kuery", query } });
    expect(param(url, "_g")).toEqual({ time });
  });

  it("leaves out _g without a time range", () => {
    expect(discoverUrl({ prefix: "", dataViewId: "dv", query: "" })).toBe(
      `/app/discover#/?_a=${encodeURIComponent(rison.encode({ index: "dv", query: { language: "kuery", query: "" } }))}`,
    );
  });
});

describe("singleDocPath", () => {
  it("encodes each part of the single-document route", () => {
    expect(singleDocPath("/kibana", { dataViewId: "dv 1", index: ".ds-logs-a", id: "a/b?c" })).toBe(
      "/kibana/app/discover#/doc/dv%201/.ds-logs-a?id=a%2Fb%3Fc",
    );
  });
});

describe("fixedTimeUrl", () => {
  const NOW = new Date(2026, 9, 8, 14, 37, 21, 500);
  const href95 =
    "http://localhost:19601/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:now-15m,to:now))" +
    "&_a=(columns:!(),dataSource:(dataViewId:app-log,type:dataView),query:(language:kuery,query:''))&_tab=(tabId:'6d09')";

  it("replaces a relative _g.time with absolute dates and keeps everything else", () => {
    const fixed = fixedTimeUrl(href95, NOW)!;
    const hash = fixed.slice(fixed.indexOf("#"));
    expect(readRisonParam(hash, "_g")).toEqual({
      filters: [],
      refreshInterval: { pause: true, value: 60000 },
      time: { from: new Date(2026, 9, 8, 14, 22, 21, 500).toISOString(), to: NOW.toISOString() },
    });
    expect(fixed.startsWith("http://localhost:19601/app/discover#/?_g=")).toBe(true);
    expect(fixed.endsWith("&_a=(columns:!(),dataSource:(dataViewId:app-log,type:dataView),query:(language:kuery,query:''))&_tab=(tabId:'6d09')")).toBe(true);
  });

  it("returns null without a time range or with unsupported date math", () => {
    expect(fixedTimeUrl("http://x/app/discover#/?_a=(index:dv)", NOW)).toBeNull();
    expect(fixedTimeUrl("http://x/app/discover#/?_g=(time:(from:now-1q,to:now))", NOW)).toBeNull();
    expect(fixedTimeUrl("http://x/app/discover", NOW)).toBeNull();
  });
});
