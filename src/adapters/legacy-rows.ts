// Kibana 7.17 legacy doc table: collapsed result rows (spec 003; research R1, R2).
import type { RowView } from "./types";

export const LEGACY_ROW_SELECTOR = 'tr[data-test-subj="docTableRow"]';

/** The content script dispatches this on `document`; the page-context script (entrypoints/kibana-bridge.ts) answers it. */
export const IDENTIFY_ROWS_EVENT = "kibanatool:identify-rows";
export const ROW_INDEX_ATTR = "data-kibanatool-index";
export const ROW_ID_ATTR = "data-kibanatool-id";

/** How far up from the row element's fiber the hit is looked for; 7.17.29 has it one level up. */
const MAX_FIBER_DEPTH = 5;

/**
 * The row's index and id from Kibana's React data (`__reactInternalInstance$…` on React 16, `__reactFiber$…` later →
 * `memoizedProps.row`), verified on 7.17.29. Spec 003 FR-010: only these two leave this function, never a field value.
 * Runs only in the page's context; the content script's isolated world cannot see these properties. Never throws.
 */
export function reactRowHit(row: Element): { index: string; id: string } | null {
  try {
    const key = Object.keys(row).find((name) => name.startsWith("__reactInternalInstance$") || name.startsWith("__reactFiber$"));
    let fiber: unknown = key === undefined ? undefined : (row as unknown as Record<string, unknown>)[key];
    const seen = new Set<unknown>();
    for (let depth = 0; depth <= MAX_FIBER_DEPTH && isObject(fiber) && !seen.has(fiber); depth++) {
      seen.add(fiber);
      const props = fiber.memoizedProps;
      const hit = isObject(props) ? props.row : undefined;
      if (isObject(hit) && typeof hit._index === "string" && typeof hit._id === "string") return { index: hit._index, id: hit._id };
      fiber = fiber.return;
    }
  } catch {
    // An odd fiber means no identity; the row just gets no strip.
  }
  return null;
}

/** Rows with the identity the page-context script wrote; read right after dispatching IDENTIFY_ROWS_EVENT. */
export function findLegacyRows(root: ParentNode, dataViewId: string | undefined): RowView[] {
  return [...root.querySelectorAll(LEGACY_ROW_SELECTOR)].map((row) => ({ row, identity: legacyRowIdentity(row, dataViewId) }));
}

export function legacyRowIdentity(row: Element, dataViewId: string | undefined): RowView["identity"] {
  const index = row.getAttribute(ROW_INDEX_ATTR);
  const id = row.getAttribute(ROW_ID_ATTR);
  return index && id && dataViewId ? { dataViewId, index, id } : null;
}

/** Spec 003 FR-007: the left edge of the cell filter buttons in the row's last cell; the strip ends left of it. */
export function rowControlsLeft(row: Element): number | undefined {
  const cells = row.querySelectorAll(":scope > td");
  const last = cells[cells.length - 1];
  const lefts = [...(last?.querySelectorAll('[data-test-subj^="docTableCellFilter"]') ?? [])].map((button) => button.getBoundingClientRect().left);
  return lefts.length > 0 ? Math.min(...lefts) : undefined;
}

/** Any object: React's fibers are class instances, which core's `isPlainObject` rightly rejects. */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
