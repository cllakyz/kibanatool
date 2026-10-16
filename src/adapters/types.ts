import type { DocIdentity } from "../core/types";

/** One open document detail view (spec §5.1). */
export interface DetailView {
  /** Stable element for the view's lifetime: the 7.17 details row or the 8.x/9.x flyout. */
  container: Element;
  /** The bar host is inserted next to this element. */
  anchor: Element;
  position: "before" | "after";
  /** Null when nothing on the page identifies the document; no bar is shown then. */
  identity: DocIdentity | null;
}

/** One result row of Discover's table (spec 003). */
export interface RowView {
  /** The row element: 7.17 `tr[data-test-subj="docTableRow"]`, 8.x/9.x `[role="row"]`. */
  row: Element;
  /** Null when nothing identifies the row's log; the row then gets no strip (spec 003 FR-015). */
  identity: DocIdentity | null;
}
