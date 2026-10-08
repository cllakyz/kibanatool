// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { findDetailViews } from "../../../src/adapters/detect";

const legacy = `<table><tbody><tr data-test-subj="docTableDetailsRow"><td>
  <a href="/app/discover#/doc/dv-1/monolog?id=L1">View single document</a>
  <div data-test-subj="kbnDocViewer"></div></td></tr></tbody></table>`;

describe("findDetailViews", () => {
  beforeEach(() => {
    document.body.innerHTML = legacy;
  });

  it("finds views only on Discover", () => {
    expect(findDetailViews(document, { pathname: "/s/team/app/discover", hash: "#/" }, "/s/team")).toHaveLength(1);
    expect(findDetailViews(document, { pathname: "/app/dashboards", hash: "#/" }, "")).toEqual([]);
  });

  it("stays inactive in ES|QL mode", () => {
    expect(findDetailViews(document, { pathname: "/app/discover", hash: "#/?_a=(query:(esql:'FROM logs-*'))" }, "")).toEqual([]);
  });

  it("passes the URL data view as the fallback", () => {
    document.body.innerHTML = `<table><tbody><tr data-test-subj="docTableDetailsRow"><td>
      <div data-test-subj="kbnDocViewer">
        <span data-test-subj="tableDocViewRow-_id-value">L2</span>
        <span data-test-subj="tableDocViewRow-_index-value">monolog</span>
      </div></td></tr></tbody></table>`;
    const views = findDetailViews(document, { pathname: "/app/discover", hash: "#/?_a=(index:'dv-url')" }, "");
    expect(views[0]!.identity).toEqual({ dataViewId: "dv-url", index: "monolog", id: "L2" });
  });
});
