// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { findLegacyDetailViews } from "../../../src/adapters/legacy-table";

function row(id: string, options: { expanded: boolean; link?: boolean; index?: string }): string {
  const index = options.index ?? "monolog";
  const details = options.expanded
    ? `<td colspan="2">
         <div>
           <a href="/app/discover#/context/dv-1/${id}?_g=()">View surrounding documents</a>
           ${options.link === false ? "" : `<a href="/app/discover#/doc/dv-1/${index}?id=${id}">View single document</a>`}
         </div>
         <div data-test-subj="kbnDocViewer">
           <div data-test-subj="tableDocViewRow-_id"><span data-test-subj="tableDocViewRow-_id-value">${id}</span></div>
           <div data-test-subj="tableDocViewRow-_index"><span data-test-subj="tableDocViewRow-_index-value">${index}</span></div>
         </div>
       </td>`
    : `<td colspan="2"></td>`;
  return `<tr data-test-subj="docTableRow"><td data-test-subj="docTableExpandToggleColumn"></td><td data-test-subj="docTableField">summary ${id}</td></tr>
          <tr data-test-subj="docTableDetailsRow">${details}</tr>`;
}

function render(rows: string[]): void {
  document.body.innerHTML = `<table data-test-subj="docTable"><tbody>${rows.join("")}</tbody></table>`;
}

describe("findLegacyDetailViews", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("returns one view per expanded row with its own identity", () => {
    render([row("A1", { expanded: true }), row("B2", { expanded: false }), row("C3", { expanded: true, index: "user_action_log" })]);
    const views = findLegacyDetailViews(document, undefined);
    expect(views.map((view) => view.identity)).toEqual([
      { dataViewId: "dv-1", index: "monolog", id: "A1" },
      { dataViewId: "dv-1", index: "user_action_log", id: "C3" },
    ]);
  });

  it("anchors the bar before the doc viewer inside the details row", () => {
    render([row("A1", { expanded: true })]);
    const [view] = findLegacyDetailViews(document, undefined);
    expect(view!.container.getAttribute("data-test-subj")).toBe("docTableDetailsRow");
    expect(view!.anchor.getAttribute("data-test-subj")).toBe("kbnDocViewer");
    expect(view!.position).toBe("before");
  });

  it("falls back to the _id/_index rows and the URL data view when the link is missing", () => {
    render([row("A1", { expanded: true, link: false })]);
    expect(findLegacyDetailViews(document, "dv-from-url")[0]!.identity).toEqual({
      dataViewId: "dv-from-url",
      index: "monolog",
      id: "A1",
    });
    expect(findLegacyDetailViews(document, undefined)[0]!.identity).toBeNull();
  });
});
