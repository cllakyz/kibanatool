// Kibana 7.17 legacy doc table: expanded rows (spec §5.2).
import type { DocIdentity } from "../core/types";
import { parseLegacyDocHref } from "../kibana/locator";
import type { DetailView } from "./types";

export function findLegacyDetailViews(root: ParentNode, fallbackDataViewId: string | undefined): DetailView[] {
  return [...root.querySelectorAll('[data-test-subj="docTableDetailsRow"]')].flatMap((row) => {
    const viewer = row.querySelector('[data-test-subj="kbnDocViewer"]');
    if (!viewer) return [];
    return [{ container: row, anchor: viewer, position: "before" as const, identity: legacyIdentity(row, fallbackDataViewId) }];
  });
}

function legacyIdentity(row: Element, fallbackDataViewId: string | undefined): DocIdentity | null {
  for (const link of row.querySelectorAll("a[href]")) {
    const identity = parseLegacyDocHref(link.getAttribute("href") ?? "");
    if (identity) return identity;
  }
  return identityFromFieldTable(row, fallbackDataViewId);
}

export function identityFromFieldTable(root: Element, fallbackDataViewId: string | undefined): DocIdentity | null {
  const id = textOf(root, "tableDocViewRow-_id-value");
  const index = textOf(root, "tableDocViewRow-_index-value");
  return id && index && fallbackDataViewId ? { dataViewId: fallbackDataViewId, index, id } : null;
}

function textOf(root: Element, subject: string): string | undefined {
  return root.querySelector(`[data-test-subj="${subject}"]`)?.textContent?.trim() || undefined;
}
