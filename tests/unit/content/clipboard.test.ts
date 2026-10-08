// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText } from "../../../src/content/clipboard";

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("copyText", () => {
  it("uses the async clipboard when it is available", async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await copyText("hello", document.body);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("falls back to execCommand with a textarea inside the given container", async () => {
    vi.stubGlobal("navigator", {}); // insecure (http) pages have no navigator.clipboard
    const container = document.createElement("div");
    document.body.append(container);
    let copied = "";
    document.execCommand = vi.fn(() => {
      copied = container.querySelector("textarea")?.value ?? "";
      return true;
    });
    await copyText("hello", container);
    expect(copied).toBe("hello");
    expect(container.querySelector("textarea")).toBeNull();
  });

  it("rejects when the fallback copies nothing", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn(async () => Promise.reject(new Error("denied"))) } });
    document.execCommand = vi.fn(() => false);
    await expect(copyText("hello", document.body)).rejects.toThrow("copy failed");
    expect(document.querySelector("textarea")).toBeNull();
  });
});
