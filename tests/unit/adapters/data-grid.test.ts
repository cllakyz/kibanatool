// @vitest-environment happy-dom
import LZString from "lz-string";
import { beforeEach, describe, expect, it } from "vitest";
import { findDataGridDetailViews } from "../../../src/adapters/data-grid";

interface Identity {
  dataViewId: string;
  index: string;
  id: string;
}

function locatorHref(identity: Identity): string {
  const payload = { index: identity.dataViewId, rowIndex: identity.index, rowId: identity.id, referrer: "/app/discover#/" };
  const search = new URLSearchParams({ l: "DISCOVER_SINGLE_DOC_LOCATOR", v: "9.5.5", lz: LZString.compressToBase64(JSON.stringify(payload)) });
  return `/app/r?${search.toString()}`;
}

function flyout(options: { identity?: Identity; tableRows?: Identity; actions?: boolean }): string {
  const actions =
    options.actions === false
      ? ""
      : `<div data-test-subj="docViewerFlyoutActions">
           ${options.identity ? `<a data-test-subj="docTableRowAction" href="${locatorHref(options.identity)}"></a>` : ""}
         </div>`;
  const rows = options.tableRows
    ? `<div data-test-subj="tableDocViewRow-_id-value">${options.tableRows.id}</div>
       <div data-test-subj="tableDocViewRow-_index-value">${options.tableRows.index}</div>`
    : `<div data-test-subj="unifiedDocViewLogsOverview">Log overview</div>`;
  return `<div data-test-subj="docViewerFlyout">${actions}<div data-test-subj="kbnDocViewer">${rows}</div></div>`;
}

const A = { dataViewId: "logs", index: ".ds-logs-a-2026.10.07-000001", id: "AAA" };
const B = { dataViewId: "logs", index: ".ds-logs-a-2026.10.07-000001", id: "BBB" };

describe("findDataGridDetailViews", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("reads the identity from the single-document locator link and anchors after the actions", () => {
    document.body.innerHTML = flyout({ identity: A, tableRows: A });
    const [view] = findDataGridDetailViews(document, undefined);
    expect(view!.identity).toEqual(A);
    expect(view!.anchor.getAttribute("data-test-subj")).toBe("docViewerFlyoutActions");
    expect(view!.position).toBe("after");
  });

  it("works on the Observability 'Log overview' tab where the field table is absent", () => {
    document.body.innerHTML = flyout({ identity: A });
    expect(findDataGridDetailViews(document, undefined)[0]!.identity).toEqual(A);
  });

  it("returns the new identity after next/prev navigation in the same flyout", () => {
    document.body.innerHTML = flyout({ identity: A, tableRows: A });
    const container = findDataGridDetailViews(document, undefined)[0]!.container;
    document.querySelector('[data-test-subj="docTableRowAction"]')!.setAttribute("href", locatorHref(B));
    const [view] = findDataGridDetailViews(document, undefined);
    expect(view!.container).toBe(container);
    expect(view!.identity).toEqual(B);
  });

  it("falls back to the field table plus the URL data view, and anchors before the viewer without actions", () => {
    document.body.innerHTML = flyout({ actions: false, tableRows: A });
    const [view] = findDataGridDetailViews(document, "dv-from-url");
    expect(view!.identity).toEqual({ dataViewId: "dv-from-url", index: A.index, id: "AAA" });
    expect(view!.anchor.getAttribute("data-test-subj")).toBe("kbnDocViewer");
    expect(view!.position).toBe("before");
  });

  it("returns a null identity when nothing identifies the document", () => {
    document.body.innerHTML = flyout({ actions: false });
    expect(findDataGridDetailViews(document, "dv")[0]!.identity).toBeNull();
  });
});
