// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { DetailView } from "../../../src/adapters/types";
import { HOST_TAG, type Mount, reconcileMounts } from "../../../src/content/mounts";

interface FakeHandle {
  render: Mock;
  destroy: Mock;
}

let handles: FakeHandle[];
let mounts: Map<Element, Mount>;

const factory = (): FakeHandle => {
  const handle = { render: vi.fn(), destroy: vi.fn() };
  handles.push(handle);
  return handle;
};
const byId = (id: string): HTMLElement => document.getElementById(id)!;
const view = (n: 1 | 2, id = "X", position: "before" | "after" = "before"): DetailView => ({
  container: byId(`c${n}`),
  anchor: byId(`a${n}`),
  position,
  identity: { dataViewId: "dv", index: "idx", id },
});

describe("reconcileMounts", () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="c1"><div id="a1"></div></div><div id="c2"><div id="a2"></div></div>`;
    handles = [];
    mounts = new Map();
  });

  it("inserts a host before the anchor and renders the view", () => {
    const first = view(1);
    reconcileMounts([first], mounts, factory, document);
    expect(byId("a1").previousElementSibling?.tagName.toLowerCase()).toBe(HOST_TAG);
    expect(handles[0]!.render).toHaveBeenCalledWith(first);
  });

  it("inserts a host after the anchor when asked", () => {
    reconcileMounts([view(2, "X", "after")], mounts, factory, document);
    expect(byId("a2").nextElementSibling?.tagName.toLowerCase()).toBe(HOST_TAG);
  });

  it("re-renders the same mount when the identity changes in the same container", () => {
    reconcileMounts([view(1, "A")], mounts, factory, document);
    reconcileMounts([view(1, "B")], mounts, factory, document);
    expect(handles).toHaveLength(1);
    expect(handles[0]!.render.mock.lastCall?.[0].identity.id).toBe("B");
    expect(byId("c1").querySelectorAll(HOST_TAG)).toHaveLength(1);
  });

  it("re-inserts a host that Kibana removed", () => {
    reconcileMounts([view(1)], mounts, factory, document);
    const host = byId("a1").previousElementSibling!;
    host.remove();
    reconcileMounts([view(1)], mounts, factory, document);
    expect(byId("a1").previousElementSibling).toBe(host);
    expect(handles).toHaveLength(1);
  });

  it("destroys and removes mounts whose view closed", () => {
    reconcileMounts([view(1), view(2)], mounts, factory, document);
    expect(document.querySelectorAll(HOST_TAG)).toHaveLength(2);
    reconcileMounts([view(1)], mounts, factory, document);
    expect(handles[1]!.destroy).toHaveBeenCalledOnce();
    expect(byId("c2").querySelector(HOST_TAG)).toBeNull();
    expect(mounts.size).toBe(1);
  });
});
