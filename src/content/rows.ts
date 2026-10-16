// Row buttons (spec 003): how rows are batched for the prefetch and where the strip sits on a row. No DOM access.

/** Spec 003 FR-013: the most rows whose logs one request fetches. */
export const ROW_BATCH_SIZE = 50;

/** The one element that carries the row strip; it moves into the active row (research R9). */
export const ROW_HOST_TAG = "kibanatool-row";

/** Space between the strip and the row's edges, in CSS pixels. */
const GAP = 4;

/** Splits refs into batches of at most ROW_BATCH_SIZE, in order. */
export function batches<T>(refs: readonly T[]): T[][] {
  const result: T[][] = [];
  for (let start = 0; start < refs.length; start += ROW_BATCH_SIZE) result.push(refs.slice(start, start + ROW_BATCH_SIZE));
  return result;
}

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Research R10: the host is a zero-size anchor at the strip's top-right corner, placed at the right end of the row's
 * visible part and left of 7.17's cell filter buttons (`controlsLeft`), in the coordinates of its containing block,
 * whose viewport position is `origin`. Null when no part of the row is visible.
 */
export function stripPosition(input: { row: Rect; viewport: Rect; controlsLeft?: number; origin: { left: number; top: number } }): {
  left: number;
  top: number;
} | null {
  const { row, viewport, controlsLeft = Number.POSITIVE_INFINITY, origin } = input;
  const left = Math.max(row.left, viewport.left);
  const right = Math.min(row.right, viewport.right, controlsLeft) - GAP;
  const top = Math.max(row.top, viewport.top);
  const bottom = Math.min(row.bottom, viewport.bottom);
  if (right <= left || bottom <= top) return null;
  return { left: right - origin.left, top: top + GAP - origin.top };
}
