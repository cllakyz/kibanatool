import { describe, expect, it } from "vitest";
import { ROW_BATCH_SIZE, type Rect, batches, stripPosition } from "../../../src/content/rows";

const rect = (left: number, top: number, right: number, bottom: number): Rect => ({ left, top, right, bottom });
const origin = { left: 0, top: 0 };

describe("batches (spec 003 FR-013)", () => {
  it("splits refs into batches of at most ROW_BATCH_SIZE, in order", () => {
    const refs = (n: number) => Array.from({ length: n }, (_, i) => i);
    expect(ROW_BATCH_SIZE).toBe(50);
    expect(batches([])).toEqual([]);
    expect(batches(refs(50)).map((batch) => batch.length)).toEqual([50]);
    expect(batches(refs(51)).map((batch) => batch.length)).toEqual([50, 1]);
    expect(batches(refs(120)).map((batch) => batch.length)).toEqual([50, 50, 20]);
    expect(batches(refs(120)).flat()).toEqual(refs(120));
  });
});

describe("stripPosition (data-model \"Strip position\")", () => {
  const viewport = rect(100, 100, 900, 700);

  it("anchors at the row's right edge and top, inset by the gap", () => {
    expect(stripPosition({ row: rect(100, 200, 800, 240), viewport, origin })).toEqual({ left: 796, top: 204 });
  });

  it("anchors at the visible right edge of a row wider than its scroller", () => {
    expect(stripPosition({ row: rect(100, 200, 1400, 240), viewport, origin })).toEqual({ left: 896, top: 204 });
  });

  it("ends left of 7.17's cell filter buttons", () => {
    expect(stripPosition({ row: rect(100, 200, 800, 240), viewport, controlsLeft: 760, origin })).toEqual({ left: 756, top: 204 });
  });

  it("subtracts the containing block's origin (8.x/9.x grid)", () => {
    expect(stripPosition({ row: rect(100, 200, 800, 240), viewport, origin: { left: 300, top: 50 } })).toEqual({ left: 496, top: 154 });
  });

  it("takes the top from the scroller when the row is partly above it", () => {
    expect(stripPosition({ row: rect(100, 80, 800, 120), viewport, origin })).toEqual({ left: 796, top: 104 });
  });

  it("returns null for a row outside the visible part", () => {
    expect(stripPosition({ row: rect(100, 20, 800, 60), viewport, origin })).toBeNull();
    expect(stripPosition({ row: rect(100, 720, 800, 760), viewport, origin })).toBeNull();
    expect(stripPosition({ row: rect(950, 200, 1200, 240), viewport, origin })).toBeNull();
    expect(stripPosition({ row: rect(100, 200, 800, 240), viewport, controlsLeft: 90, origin })).toBeNull();
  });
});
