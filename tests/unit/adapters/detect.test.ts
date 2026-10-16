// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { findDetailViews, findRows, rowIdentity, rowOf } from "../../../src/adapters/detect";

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

describe("findRows and rowIdentity (spec 003 research R5)", () => {
  const rows = `<table><tbody>
    <tr data-test-subj="docTableRow" data-kibanatool-index="app_log" data-kibanatool-id="app-001"><td id="cell">a</td></tr>
  </tbody></table><p id="outside">x</p>`;
  const identity = { dataViewId: "app-log", index: "app_log", id: "app-001" };
  const at = (hash: string, pathname = "/kibana/app/discover") => ({ pathname, hash });

  beforeEach(() => {
    document.body.innerHTML = rows;
  });

  it("reads the rows of Discover's main table and of a saved search", () => {
    expect(findRows(document, at("#/?_a=(index:app-log)"), "/kibana").map((view) => view.identity)).toEqual([identity]);
    expect(findRows(document, at("#/view/abc?_a=(index:app-log)"), "/kibana")).toHaveLength(1);
    const row = document.querySelector("tr") as Element;
    expect(rowIdentity(row, at("#/?_a=(index:app-log)"), "/kibana")).toEqual(identity);
  });

  it("reads none in the surrounding-documents and single-document views, in ES|QL mode or off Discover", () => {
    const row = document.querySelector("tr") as Element;
    for (const location of [
      at("#/context/app-log/app-001?_a=(index:app-log)"),
      at("#/doc/app-log/app_log?id=app-001"),
      at("#/?_a=(index:app-log,query:(esql:'FROM app_log'))"),
      at("#/?_a=(index:app-log)", "/kibana/app/dashboards"),
    ]) {
      expect(findRows(document, location, "/kibana")).toEqual([]);
      expect(rowIdentity(row, location, "/kibana")).toBeNull();
    }
  });

  it("finds the result row around an element, and none outside the table", () => {
    expect(rowOf(document.getElementById("cell") as Element)).toBe(document.querySelector("tr"));
    expect(rowOf(document.getElementById("outside") as Element)).toBeNull();
  });
});

describe("findRows and rowOf on the 8.x/9.x data grid (spec 003 user story 2)", () => {
  const grid = `<div role="grid">
    <div role="row" id="header"><div role="columnheader">Document</div></div>
    <div role="row" id="row"><div role="gridcell" id="cell"><input data-test-subj="dscGridSelectDoc-app_log::app-001::"></div></div>
  </div>`;

  beforeEach(() => {
    document.body.innerHTML = grid;
  });

  it("reads grid rows in the default space and in a space", () => {
    const identity = { dataViewId: "app-log", index: "app_log", id: "app-001" };
    const hash = "#/?_a=(dataSource:(dataViewId:app-log,type:dataView))";
    expect(findRows(document, { pathname: "/app/discover", hash }, "").map((view) => view.identity)).toEqual([identity]);
    const obs = findRows(document, { pathname: "/s/obs/app/discover", hash: "#/?_a=(dataSource:(dataViewId:obs-logs,type:dataView))" }, "/s/obs");
    expect(obs.map((view) => view.identity?.dataViewId)).toEqual(["obs-logs"]);
    const row = document.getElementById("row") as Element;
    expect(rowIdentity(row, { pathname: "/app/discover", hash }, "")).toEqual(identity);
  });

  it("finds the grid row around a cell, and not the header row", () => {
    expect(rowOf(document.getElementById("cell") as Element)).toBe(document.getElementById("row"));
    expect(rowOf(document.getElementById("header") as Element)).toBeNull();
  });
});
