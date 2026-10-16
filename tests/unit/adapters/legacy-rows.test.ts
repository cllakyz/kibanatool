// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { ROW_ID_ATTR, ROW_INDEX_ATTR, findLegacyRows, reactRowHit, rowControlsLeft } from "../../../src/adapters/legacy-rows";

/** A stand-in for a row element as the page's context sees it: React keeps its fiber in an own expando key. */
function fakeRow(key: string, fiber: unknown): Element {
  return { [key]: fiber } as unknown as Element;
}

const rowProps = (row: unknown) => ({ memoizedProps: { row } });

describe("reactRowHit (spec 003 FR-010, research R1)", () => {
  it("reads the row's index and id one level up, as 7.17.29 has it", () => {
    const fiber = { memoizedProps: { children: [] }, return: rowProps({ _index: "app_log", _id: "app-001", _source: { secret: 1 } }) };
    expect(reactRowHit(fakeRow("__reactInternalInstance$g2f086e28p", fiber))).toEqual({ index: "app_log", id: "app-001" });
  });

  it("accepts React 17+ fiber keys", () => {
    expect(reactRowHit(fakeRow("__reactFiber$xyz", rowProps({ _index: "i", _id: "d" })))).toEqual({ index: "i", id: "d" });
  });

  it("returns null when no row is found within five levels or it is not a hit", () => {
    let deep: unknown = rowProps({ _index: "i", _id: "d" });
    for (let i = 0; i < 6; i++) deep = { memoizedProps: {}, return: deep };
    expect(reactRowHit(fakeRow("__reactFiber$a", deep))).toBeNull();
    expect(reactRowHit(fakeRow("__reactFiber$a", rowProps({ _index: "i", _id: 7 })))).toBeNull();
    expect(reactRowHit(fakeRow("unrelated", rowProps({ _index: "i", _id: "d" })))).toBeNull();
  });

  it("never loops or throws on odd fibers", () => {
    const loop: { memoizedProps: object; return?: unknown } = { memoizedProps: {} };
    loop.return = loop;
    expect(reactRowHit(fakeRow("__reactFiber$a", loop))).toBeNull();
    const throwing = {
      get memoizedProps(): never {
        throw new Error("boom");
      },
    };
    expect(reactRowHit(fakeRow("__reactFiber$a", throwing))).toBeNull();
  });
});

describe("findLegacyRows", () => {
  const html = `<table><tbody>
    <tr data-test-subj="docTableRow" ${ROW_INDEX_ATTR}="app_log" ${ROW_ID_ATTR}="app-001"><td>a</td></tr>
    <tr data-test-subj="docTableDetailsRow"><td>details</td></tr>
    <tr data-test-subj="docTableRow"><td>b</td></tr>
  </tbody></table>`;

  it("reads the identity the page-context script wrote, and null where it wrote none", () => {
    document.body.innerHTML = html;
    expect(findLegacyRows(document, "app-log").map((view) => view.identity)).toEqual([
      { dataViewId: "app-log", index: "app_log", id: "app-001" },
      null,
    ]);
  });

  it("gives no identity without a data view", () => {
    document.body.innerHTML = html;
    expect(findLegacyRows(document, undefined).map((view) => view.identity)).toEqual([null, null]);
  });
});

describe("rowControlsLeft (spec 003 FR-007)", () => {
  it("is the left edge of the last cell's filter buttons, or undefined without them", () => {
    document.body.innerHTML = `<table><tbody><tr data-test-subj="docTableRow">
      <td><button data-test-subj="docTableCellFilter">+</button></td>
      <td id="last"><button data-test-subj="docTableCellFilter" id="f1">+</button><button data-test-subj="docTableCellFilterNegate" id="f2">-</button></td>
    </tr></tbody></table>`;
    const row = document.querySelector("tr") as Element;
    (document.getElementById("f1") as Element).getBoundingClientRect = () => ({ left: 1143 }) as DOMRect;
    (document.getElementById("f2") as Element).getBoundingClientRect = () => ({ left: 1163 }) as DOMRect;
    expect(rowControlsLeft(row)).toBe(1143);
    document.getElementById("last")?.replaceChildren();
    expect(rowControlsLeft(row)).toBeUndefined();
  });
});
