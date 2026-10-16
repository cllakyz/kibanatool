// @vitest-environment happy-dom
import { act, createElement } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionBar } from "../../../src/content/ActionBar";
import { RowStrip } from "../../../src/content/RowStrip";
import { type Action, type Environment, emptyConfig, rowActions } from "../../../src/core/config";
import type { DocIdentity, RawHit } from "../../../src/core/types";
import { type KibanaClient, KibanaError } from "../../../src/kibana/client";

// The real module reads chrome.i18n through wxt/browser, which node does not have.
vi.mock("../../../src/i18n", () => ({ t: (key: string, ...subs: string[]) => [key, ...subs].join(" ") }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const roots: Root[] = [];

afterEach(() => {
  act(() => {
    for (const root of roots.splice(0)) root.unmount();
  });
  document.body.innerHTML = "";
});

const identity: DocIdentity = { dataViewId: "app-log", index: "app_log", id: "app-004" };
const hit: RawHit = {
  _index: "app_log",
  _id: "app-004",
  _source: { user_id: 100004, level_name: "ERROR", datetime: "2026-01-15T09:39:00.000Z" },
};
const environment: Environment = { id: "e", name: "E", kibanaUrl: "https://kibana.example.com", variables: {} };
const base = { enabled: true, environmentIds: [], conditions: [] };
const actions: Action[] = [
  { ...base, id: "user", kind: "link", label: "User", showInRow: true, urlTemplate: "https://admin.example.com/users/{user_id}" },
  {
    ...base,
    id: "error",
    kind: "link",
    label: "Error",
    showInRow: false,
    urlTemplate: "https://errors.example.com/?id={_id}",
    conditions: [{ field: "level_name", op: "equals", value: "ERROR" }],
  },
  { ...base, id: "admin", kind: "link", label: "Admin", showInRow: true, urlTemplate: "{env.adminUrl}/users/{user_id}" },
  {
    ...base,
    id: "info",
    kind: "link",
    label: "Info",
    showInRow: true,
    urlTemplate: "https://info.example.com/{_id}",
    conditions: [{ field: "level_name", op: "equals", value: "INFO" }],
  },
  { ...base, id: "same", kind: "discover", label: "Same user", showInRow: true, queryTemplate: "user_id:{user_id}", windowMinutes: 5 },
];

function fakeClient(fetchDoc: KibanaClient["fetchDoc"] = async () => hit): KibanaClient {
  return {
    fetchDoc,
    prefetchDocs: async () => {},
    getDataView: async () => ({ title: "app_log", timeFieldName: "datetime" }),
    getVersion: async () => "7.17.29",
    listDataViews: async () => [],
  };
}

async function mount(element: ReturnType<typeof createElement>): Promise<HTMLElement> {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  await act(async () => root.render(element));
  return container;
}

function strip(client: KibanaClient, marked = rowActions(actions)) {
  return createElement(RowStrip, { identity, actions: marked, client, prefix: "/kibana", page: { hash: "" }, environment });
}

const links = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLAnchorElement>("a.kt-btn")].map((link) => [link.textContent, link.getAttribute("href"), link.target]);

describe("RowStrip (spec 003 FR-004, FR-005, FR-009)", () => {
  it("shows the marked actions exactly as the bar shows them, links first, in settings order", async () => {
    const client = fakeClient();
    const row = await mount(strip(client));
    const bar = await mount(
      createElement(ActionBar, {
        identity,
        actions,
        client,
        prefix: "/kibana",
        page: { href: "https://kibana.example.com/kibana/app/discover#/", hash: "", origin: "https://kibana.example.com" },
        now: () => new Date(),
        copy: emptyConfig().copy,
        environment,
      }),
    );
    const barLinks = links(bar);
    expect(links(row).map(([label]) => label)).toEqual(["User", "Same user"]);
    for (const link of links(row)) expect(barLinks).toContainEqual(link);
    expect(links(row).every(([, , target]) => target === "_blank")).toBe(true);
    expect([...row.querySelectorAll(".kt-btn")].map((button) => button.textContent)).toEqual(["User", "Admin", "Same user"]);
  });

  it("keeps a greyed-out action, with its reason, as the bar does", async () => {
    const row = await mount(strip(fakeClient()));
    const admin = row.querySelector(".kt-disabled");
    expect(admin?.textContent).toBe("Admin");
    expect(admin?.getAttribute("aria-disabled")).toBe("true");
    expect(admin?.getAttribute("title")).toMatch(/\S/);
  });

  it("names the group of buttons", async () => {
    const row = await mount(strip(fakeClient()));
    expect(row.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe("rowStripLabel");
  });

  it("shows a loading mark while the log loads, and an error mark with the bar's message", async () => {
    const loading = await mount(strip(fakeClient(() => new Promise<RawHit>(() => {}))));
    expect(loading.querySelector('[aria-label="barLoading"]')).not.toBeNull();
    expect(loading.querySelector("a")).toBeNull();

    const failed = await mount(strip(fakeClient(async () => Promise.reject(new KibanaError("notFound", "Document not found")))));
    expect(failed.querySelector(".kt-error")?.getAttribute("title")).toBe("errorNotFound");
  });

  it("renders nothing when no marked action applies to the log", async () => {
    const row = await mount(strip(fakeClient(), actions.filter((action) => action.id === "info")));
    expect(row.innerHTML).toBe("");
  });

  it("keeps clicks and pointer presses inside the strip (FR-008)", async () => {
    const row = await mount(strip(fakeClient()));
    const outside = vi.fn();
    document.body.addEventListener("click", outside);
    document.body.addEventListener("pointerdown", outside);
    document.body.addEventListener("mousedown", outside);
    const group = row.querySelector('[role="group"]') as HTMLElement;
    group.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    row.querySelector("a")?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    row.querySelector("a")?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(outside).not.toHaveBeenCalled();
  });
});
