// Kibana 8.x/9.x data grid: the document flyout (spec §5.3).
import type { DocIdentity } from "../core/types";
import { decodeSingleDocLocator } from "../kibana/locator";
import { identityFromFieldTable } from "./legacy-table";
import type { DetailView } from "./types";

export function findDataGridDetailViews(root: ParentNode, fallbackDataViewId: string | undefined): DetailView[] {
  return [...root.querySelectorAll('[data-test-subj="docViewerFlyout"]')].flatMap((flyout) => {
    const actions = flyout.querySelector('[data-test-subj="docViewerFlyoutActions"]');
    const viewer = flyout.querySelector('[data-test-subj="kbnDocViewer"]');
    const anchor = actions ?? viewer;
    if (!anchor) return [];
    return [
      {
        container: flyout,
        anchor,
        position: actions ? ("after" as const) : ("before" as const),
        identity: gridIdentity(flyout, fallbackDataViewId),
      },
    ];
  });
}

function gridIdentity(flyout: Element, fallbackDataViewId: string | undefined): DocIdentity | null {
  for (const link of flyout.querySelectorAll('a[href*="DISCOVER_SINGLE_DOC_LOCATOR"]')) {
    const identity = decodeSingleDocLocator(link.getAttribute("href") ?? "");
    if (identity) return identity;
  }
  return identityFromFieldTable(flyout, fallbackDataViewId);
}
