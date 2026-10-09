import { describe, expect, it, vi } from "vitest";
import { THEME_MESSAGE, iconPaths, isThemeMessage, reportTheme } from "../../src/toolbar-icon";

describe("isThemeMessage", () => {
  it("accepts only the theme message", () => {
    expect(isThemeMessage({ type: THEME_MESSAGE, dark: true })).toBe(true);
    expect(isThemeMessage({ type: THEME_MESSAGE, dark: "yes" })).toBe(false);
    expect(isThemeMessage({ type: "other", dark: true })).toBe(false);
    expect(isThemeMessage(null)).toBe(false);
    expect(isThemeMessage("kibanatool:theme")).toBe(false);
  });
});

describe("iconPaths", () => {
  it("points at the light or the dark icon set", () => {
    expect(iconPaths(false)).toEqual({ "16": "/icon/16.png", "32": "/icon/32.png", "48": "/icon/48.png", "128": "/icon/128.png" });
    expect(iconPaths(true)["128"]).toBe("/icon-dark/128.png");
  });
});

describe("reportTheme", () => {
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("reports the scheme now and on every change", async () => {
    const listeners: Array<() => void> = [];
    const media = { matches: false, addEventListener: (_type: string, listener: () => void) => listeners.push(listener) };
    const send = vi.fn(() => Promise.resolve());
    reportTheme(send, media as unknown as MediaQueryList);
    await flush();
    media.matches = true;
    for (const listener of listeners) listener();
    await flush();
    expect(send.mock.calls).toEqual([[{ type: THEME_MESSAGE, dark: false }], [{ type: THEME_MESSAGE, dark: true }]]);
  });

  it("never throws when sending fails, even synchronously", async () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    const media = { matches: true, addEventListener: () => {} } as unknown as MediaQueryList;
    expect(() =>
      reportTheme(() => {
        throw new Error("Extension context invalidated.");
      }, media),
    ).not.toThrow();
    await flush();
    expect(debug).toHaveBeenCalledWith("[kibanatool] theme report failed:", expect.any(Error));
    debug.mockRestore();
  });
});
