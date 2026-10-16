// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type RowHost, type RowHostOptions, createRowHost } from "../../../src/content/row-host";
import type { DocIdentity } from "../../../src/core/types";

let host: HTMLElement;
let rowHost: RowHost;
let render: ReturnType<typeof vi.fn<RowHostOptions["render"]>>;

/** Two fake rows; the identity comes from data-id, as the bridge's attributes would give it. */
beforeEach(() => {
  document.body.innerHTML = `
    <div id="outside"><button id="far">far</button></div>
    <div class="r" data-id="a"><span class="c" id="a-cell">a</span><button id="a-button">x</button></div>
    <div class="r" data-id="b"><span class="c" id="b-cell">b</span></div>
    <div class="r" id="unknown"><span class="c" id="unknown-cell">?</span></div>`;
  // happy-dom lays nothing out, so the rows get rectangles inside the window.
  document.querySelectorAll<HTMLElement>(".r").forEach((row, index) => {
    row.getBoundingClientRect = () => ({ left: 0, top: 10 + index * 40, right: 500, bottom: 40 + index * 40 }) as DOMRect;
  });
  host = document.createElement("kibanatool-row");
  render = vi.fn<RowHostOptions["render"]>();
  rowHost = createRowHost(document, {
    host,
    rowOf: (target) => target.closest(".r"),
    identify: (row): DocIdentity | null => {
      const id = row.getAttribute("data-id");
      return id ? { dataViewId: "dv", index: "i", id } : null;
    },
    render,
  });
});

afterEach(() => {
  rowHost.destroy();
  document.body.innerHTML = "";
});

const at = (id: string) => document.getElementById(id) as HTMLElement;
const over = (id: string) => at(id).dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
const shownId = () => (render.mock.lastCall?.[0] as { identity: DocIdentity } | null)?.identity.id ?? null;

describe("createRowHost (spec 003 FR-006, FR-007, FR-014; research R9–R11)", () => {
  it("does nothing until it is active", () => {
    over("a-cell");
    expect(render).not.toHaveBeenCalled();
    expect(host.isConnected).toBe(false);
  });

  it("shows the hovered row's identity and puts the host last in that row", () => {
    rowHost.setActive(true);
    over("a-cell");
    expect(shownId()).toBe("a");
    expect(render.mock.lastCall?.[0]).toMatchObject({ row: at("a-cell").parentElement });
    expect(host.parentElement?.getAttribute("data-id")).toBe("a");
    expect(host.parentElement?.lastElementChild).toBe(host);
    expect(host.style.position).toBe("fixed");
    expect(host.style.visibility).not.toBe("hidden");
  });

  it("does not move or re-render while the pointer stays in the row", async () => {
    rowHost.setActive(true);
    over("a-cell");
    const calls = render.mock.calls.length;
    const records: MutationRecord[] = [];
    const observer = new MutationObserver((list) => records.push(...list));
    observer.observe(document.body, { childList: true, subtree: true });
    over("a-button");
    at("a-cell").dispatchEvent(new PointerEvent("pointermove", { bubbles: true }));
    await Promise.resolve();
    observer.disconnect();
    expect(render.mock.calls.length).toBe(calls);
    expect(records.filter((record) => record.type === "childList")).toEqual([]);
  });

  it("follows the pointer to another row and hides outside the rows", () => {
    rowHost.setActive(true);
    over("a-cell");
    over("b-cell");
    expect(shownId()).toBe("b");
    expect(host.parentElement?.getAttribute("data-id")).toBe("b");
    over("outside");
    expect(render).toHaveBeenLastCalledWith(null);
    expect(host.isConnected).toBe(false);
  });

  it("shows nothing for a row without an identity", () => {
    rowHost.setActive(true);
    over("a-cell");
    over("unknown-cell");
    expect(render).toHaveBeenLastCalledWith(null);
    expect(host.isConnected).toBe(false);
  });

  it("shows the row that holds keyboard focus, and hides when focus leaves the rows", () => {
    rowHost.setActive(true);
    at("a-button").dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(shownId()).toBe("a");
    at("a-button").dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: at("far") }));
    expect(render).toHaveBeenLastCalledWith(null);
  });

  it("re-reads the identity on refresh: a reused row shows its new log, a removed row hides", () => {
    rowHost.setActive(true);
    over("a-cell");
    at("a-cell").parentElement?.setAttribute("data-id", "a2");
    rowHost.refresh();
    expect(shownId()).toBe("a2");
    at("a-cell").parentElement?.remove();
    rowHost.refresh();
    expect(render).toHaveBeenLastCalledWith(null);
  });

  it("hides on scroll and shows again on the next pointer move", () => {
    rowHost.setActive(true);
    over("a-cell");
    document.dispatchEvent(new Event("scroll"));
    expect(host.style.visibility).toBe("hidden");
    at("a-cell").dispatchEvent(new PointerEvent("pointermove", { bubbles: true }));
    expect(host.style.visibility).not.toBe("hidden");
    expect(shownId()).toBe("a");
  });

  it("detaches and renders nothing when turned off (FR-014)", () => {
    rowHost.setActive(true);
    over("a-cell");
    rowHost.setActive(false);
    expect(render).toHaveBeenLastCalledWith(null);
    expect(host.isConnected).toBe(false);
    render.mockClear();
    over("b-cell");
    expect(render).not.toHaveBeenCalled();
  });
});
