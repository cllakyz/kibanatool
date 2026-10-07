import LZString from "lz-string";
import { describe, expect, it } from "vitest";
import { decodeSingleDocLocator, parseLegacyDocHref } from "../../../src/kibana/locator";

function locatorHref(params: Record<string, unknown>, locator = "DISCOVER_SINGLE_DOC_LOCATOR"): string {
  const search = new URLSearchParams({ l: locator, v: "9.5.5", lz: LZString.compressToBase64(JSON.stringify(params)) });
  return `/app/r?${search.toString()}`;
}

const params = { index: "logs", rowIndex: ".ds-logs-spike-default-2026.10.07-000001", rowId: "AbC_123-x", referrer: "/app/discover#/" };

describe("decodeSingleDocLocator", () => {
  it("decodes data view, index and id from the lz payload", () => {
    expect(decodeSingleDocLocator(locatorHref(params))).toEqual({
      dataViewId: "logs",
      index: ".ds-logs-spike-default-2026.10.07-000001",
      id: "AbC_123-x",
    });
  });

  it("accepts the uncompressed p= variant", () => {
    const href = `/app/r?l=DISCOVER_SINGLE_DOC_LOCATOR&v=8.19.23&p=${encodeURIComponent(JSON.stringify(params))}`;
    expect(decodeSingleDocLocator(href)?.id).toBe("AbC_123-x");
  });

  it("returns null for other locators, garbage and incomplete payloads", () => {
    expect(decodeSingleDocLocator(locatorHref(params, "DISCOVER_CONTEXT_APP_LOCATOR"))).toBeNull();
    expect(decodeSingleDocLocator("/app/r?l=DISCOVER_SINGLE_DOC_LOCATOR&lz=%%%")).toBeNull();
    expect(decodeSingleDocLocator(locatorHref({ index: "logs" }))).toBeNull();
    expect(decodeSingleDocLocator("not a url at all")).toBeNull();
  });
});

describe("parseLegacyDocHref", () => {
  it("reads data view, index and id from a 7.17 single-document link", () => {
    expect(parseLegacyDocHref("/app/discover#/doc/3dea60c0-x/monolog?id=AbC_123-x")).toEqual({
      dataViewId: "3dea60c0-x",
      index: "monolog",
      id: "AbC_123-x",
    });
    expect(parseLegacyDocHref("/app/discover#/doc/dv/idx?id=a%2Fb")?.id).toBe("a/b");
  });

  it("returns null for other links", () => {
    expect(parseLegacyDocHref("/app/discover#/doc/dv/idx")).toBeNull();
    expect(parseLegacyDocHref("/app/discover#/context/dv/AbC?_g=()")).toBeNull();
  });
});
