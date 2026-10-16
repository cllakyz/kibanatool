// @vitest-environment happy-dom
import { act, createElement } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JsonView, PanelBoundary } from "../../../src/content/JsonView";
import type { PanelField } from "../../../src/core/json-tree";

// The real module reads chrome.i18n through wxt/browser, which node does not have.
vi.mock("../../../src/i18n", () => ({ t: (key: string, ...subs: string[]) => [key, ...subs].join(" ") }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

async function render(fields: PanelField[]) {
  const onCopy = vi.fn();
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(createElement(JsonView, { fields, onCopy, onClose: () => {} })));
  return { container, onCopy };
}

const text = (path: string, value: string): PanelField => ({ path, kind: "text", text: value });

async function type(input: HTMLInputElement, value: string) {
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  await act(async () => {
    setValue?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("JsonView text view (spec 002 FR-010 – FR-014)", () => {
  it("opens a single text field directly, as text: nothing in it renders as markup", async () => {
    const { container } = await render([text("context.error", "<b>x</b>\nsecond line")]);
    const pre = container.querySelector("pre.kt-text");
    expect(pre?.textContent).toBe("<b>x</b>\nsecond line");
    expect(pre?.querySelector("b")).toBeNull();
    expect(pre?.getAttribute("role")).toBe("region");
    expect(pre?.getAttribute("tabindex")).toBe("0");
  });

  it("opens multi-line text unwrapped and single-line text wrapped; the toggle switches it", async () => {
    const multi = await render([text("output", "a\nb")]);
    const pre = multi.container.querySelector("pre.kt-text");
    const toggle = multi.container.querySelector<HTMLButtonElement>("button[aria-pressed]");
    expect(pre?.classList.contains("kt-wrap")).toBe(false);
    expect(toggle?.getAttribute("aria-pressed")).toBe("false");
    await act(async () => toggle?.click());
    expect(pre?.classList.contains("kt-wrap")).toBe(true);
    expect(toggle?.getAttribute("aria-pressed")).toBe("true");
    act(() => root?.unmount());

    const single = await render([text("error", "x".repeat(600))]);
    expect(single.container.querySelector("pre.kt-text")?.classList.contains("kt-wrap")).toBe(true);
  });

  it("marks every match, counts them and steps with Enter", async () => {
    const { container } = await render([text("output", "ab x\nab")]);
    await type(container.querySelector<HTMLInputElement>('input[type="search"]') as HTMLInputElement, "AB");
    const marks = () => [...container.querySelectorAll("pre.kt-text mark")];
    expect(marks().map((mark) => mark.textContent)).toEqual(["ab", "ab"]);
    expect(marks().map((mark) => mark.hasAttribute("data-active"))).toEqual([true, false]);
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe("jsonMatchCount 1 2");
    const input = container.querySelector('input[type="search"]');
    await act(async () => input?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    expect(marks().map((mark) => mark.hasAttribute("data-active"))).toEqual([false, true]);
    expect(container.querySelector("pre.kt-text")?.textContent).toBe("ab x\nab");
  });

  it("copies the whole text as it is", async () => {
    const { container, onCopy } = await render([text("output", "  keep\tspacing\n")]);
    const copy = [...container.querySelectorAll("button")].find((button) => button.textContent === "jsonCopyValue");
    await act(async () => copy?.click());
    expect(onCopy).toHaveBeenCalledWith("  keep\tspacing\n");
  });

  it("lists every kind in field order, tagged by kind", async () => {
    const { container } = await render([
      { path: "body", kind: "json", value: { a: 1 } },
      { path: "request", kind: "xml", value: { r: "1" } },
      { path: "options.body", kind: "form", value: { a: "1", b: "2" } },
      text("output", "a\nb"),
    ]);
    expect([...container.querySelectorAll(".kt-fields button")].map((button) => button.textContent)).toEqual([
      "body",
      "request · XML",
      "options.body · panelKindForm",
      "output · panelKindText",
    ]);
  });
});

describe("PanelBoundary (spec 002 FR-017)", () => {
  it("renders nothing after a child throws, and logs it with console.debug", async () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const Broken = (): never => {
      throw new Error("boom");
    };
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(createElement(PanelBoundary, null, createElement(Broken))));
    expect(container.innerHTML).toBe("");
    expect(debug).toHaveBeenCalledWith("[kibanatool] panel failed:", expect.any(Error));
  });
});
