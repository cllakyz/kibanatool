// @vitest-environment happy-dom
import { act, createElement } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type CopyItem, CopyMenu } from "../../../src/content/CopyMenu";

// The real module reads chrome.i18n through wxt/browser, which node does not have.
vi.mock("../../../src/i18n", () => ({ t: (key: string) => key }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

/** Renders the menu with one item, opens it and picks the item. */
async function pick(item: CopyItem) {
  const onCopy = vi.fn();
  const onFail = vi.fn();
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(createElement(CopyMenu, { items: [item], onCopy, onFail })));
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')?.click());
  await act(async () => container.querySelector<HTMLButtonElement>('[role="menuitem"]')?.click());
  return { onCopy, onFail };
}

describe("CopyMenu", () => {
  it("copies the item's text", async () => {
    const { onCopy, onFail } = await pick({ label: "a", text: () => "x" });
    expect(onCopy).toHaveBeenCalledWith("x");
    expect(onFail).not.toHaveBeenCalled();
  });

  it("shows the item's own notice when it has no text", async () => {
    const { onCopy, onFail } = await pick({ label: "a", text: () => null, unavailable: "noticeTimeNotConverted" });
    expect(onFail).toHaveBeenCalledWith("noticeTimeNotConverted");
    expect(onCopy).not.toHaveBeenCalled();
  });

  it("says the copy failed when an item without a notice has no text", async () => {
    const { onCopy, onFail } = await pick({ label: "a", text: () => null });
    expect(onFail).toHaveBeenCalledWith("noticeCopyFailed");
    expect(onCopy).not.toHaveBeenCalled();
  });

  it("says the copy failed when building the text throws", async () => {
    const { onFail } = await pick({
      label: "a",
      text: () => {
        throw new Error("boom");
      },
    });
    expect(onFail).toHaveBeenCalledWith("noticeCopyFailed");
  });
});
