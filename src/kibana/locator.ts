// Reads the document identity from Kibana's own links (spec §5.2, §5.3).
import LZString from "lz-string";
import type { DocIdentity } from "../core/types";

const SINGLE_DOC_LOCATOR = "DISCOVER_SINGLE_DOC_LOCATOR";

/** 8.x/9.x: "/app/r?l=DISCOVER_SINGLE_DOC_LOCATOR&lz=<lz-string base64 JSON>" (or "&p=<JSON>"). */
export function decodeSingleDocLocator(href: string): DocIdentity | null {
  let url: URL;
  try {
    url = new URL(href, "http://kibanatool.invalid");
  } catch {
    return null;
  }
  if (url.searchParams.get("l") !== SINGLE_DOC_LOCATOR) return null;
  try {
    const lz = url.searchParams.get("lz");
    const json = lz ? LZString.decompressFromBase64(lz) : url.searchParams.get("p");
    if (!json) return null;
    const params = JSON.parse(json) as { index?: unknown; rowIndex?: unknown; rowId?: unknown };
    if (
      typeof params.index === "string" &&
      typeof params.rowIndex === "string" &&
      typeof params.rowId === "string"
    ) {
      return { dataViewId: params.index, index: params.rowIndex, id: params.rowId };
    }
  } catch {
    // Unknown payload format: callers fall back to the field table.
  }
  return null;
}

/** 7.17: "View single document" href "…#/doc/<dataViewId>/<index>?id=<id>". */
export function parseLegacyDocHref(href: string): DocIdentity | null {
  const match = /#\/doc\/([^/?#]+)\/([^/?#]+)\?(.*)$/.exec(href);
  if (!match) return null;
  const id = new URLSearchParams(match[3] ?? "").get("id");
  if (!id) return null;
  try {
    return { dataViewId: decodeURIComponent(match[1] ?? ""), index: decodeURIComponent(match[2] ?? ""), id };
  } catch {
    return null;
  }
}
