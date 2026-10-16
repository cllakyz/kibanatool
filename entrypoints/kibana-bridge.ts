// The page-context script (spec 003 FR-010; research R2, R3). Kibana 7.17's collapsed result rows carry their log's
// identity only in React data, which the isolated content script cannot see. This script runs in the page's own
// context, registered by src/background/registration.ts with world "MAIN", and has no extension API. It stays idle
// until the content script dispatches IDENTIFY_ROWS_EVENT, then writes each row's index and id as attributes, which
// both worlds share. Nothing else: no field value, no message, no request.
import { defineUnlistedScript } from "#imports";
import { IDENTIFY_ROWS_EVENT, LEGACY_ROW_SELECTOR, ROW_ID_ATTR, ROW_INDEX_ATTR, reactRowHit } from "../src/adapters/legacy-rows";

export default defineUnlistedScript(() => {
  document.addEventListener(IDENTIFY_ROWS_EVENT, annotate);
});

/** Runs during the content script's dispatchEvent, so the attributes are fresh when it reads them: rows are reused. */
function annotate(): void {
  try {
    for (const row of document.querySelectorAll(LEGACY_ROW_SELECTOR)) {
      const hit = reactRowHit(row);
      if (hit) {
        row.setAttribute(ROW_INDEX_ATTR, hit.index);
        row.setAttribute(ROW_ID_ATTR, hit.id);
      } else {
        row.removeAttribute(ROW_INDEX_ATTR);
        row.removeAttribute(ROW_ID_ATTR);
      }
    }
  } catch (error) {
    console.debug("[kibanatool] bridge:", error);
  }
}
