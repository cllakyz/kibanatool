// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { findGridRows, parseGridDocId } from "../../../src/adapters/grid-rows";

describe("parseGridDocId (spec 003 research R4)", () => {
  it("reads <index>::<id>::<routing>", () => {
    expect(parseGridDocId("app_log::app-001::")).toEqual({ index: "app_log", id: "app-001" });
    expect(parseGridDocId(".ds-logs-x::abc::r1")).toEqual({ index: ".ds-logs-x", id: "abc" });
  });

  it("keeps an id that itself contains ::", () => {
    expect(parseGridDocId("idx::a::b::")).toEqual({ index: "idx", id: "a::b" });
  });

  it("returns null for malformed values", () => {
    for (const value of ["noseparator", "::id::", "idx::::", "idx::id"]) expect(parseGridDocId(value)).toBeNull();
  });
});

describe("findGridRows", () => {
  it("reads each row's selection checkbox and skips rows without one", () => {
    document.body.innerHTML = `<div role="grid">
      <div role="row"><div role="columnheader">header</div></div>
      <div role="row" class="euiDataGridRow"><div role="gridcell"><input data-test-subj="dscGridSelectDoc-app_log::app-001::"></div></div>
    </div>`;
    const rows = findGridRows(document, "app-log");
    expect(rows.map((view) => view.identity)).toEqual([{ dataViewId: "app-log", index: "app_log", id: "app-001" }]);
    expect(rows[0]?.row.getAttribute("class")).toBe("euiDataGridRow");
    expect(findGridRows(document, undefined).map((view) => view.identity)).toEqual([null]);
  });
});
