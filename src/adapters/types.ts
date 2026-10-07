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
