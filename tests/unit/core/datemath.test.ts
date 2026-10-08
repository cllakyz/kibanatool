import { describe, expect, it } from "vitest";
import { resolveDatemath } from "../../../src/core/datemath";

/** ISO string of a local time, so the tests pass in any time zone. */
const local = (...parts: [number, number, number, number?, number?, number?, number?]) =>
  new Date(parts[0], parts[1], parts[2], parts[3] ?? 0, parts[4] ?? 0, parts[5] ?? 0, parts[6] ?? 0).toISOString();

const NOW = new Date(2026, 9, 8, 14, 37, 21, 500); // Thursday, 8 October 2026

describe("resolveDatemath", () => {
  it("resolves now and now±N<unit>", () => {
    expect(resolveDatemath("now", NOW, true)).toBe(NOW.toISOString());
    expect(resolveDatemath("now-15m", NOW, false)).toBe(local(2026, 9, 8, 14, 22, 21, 500));
    expect(resolveDatemath("now+2h", NOW, false)).toBe(local(2026, 9, 8, 16, 37, 21, 500));
  });

  it("rounds down for from and to the end of the unit for to", () => {
    expect(resolveDatemath("now/d", NOW, false)).toBe(local(2026, 9, 8));
    expect(resolveDatemath("now/d", NOW, true)).toBe(local(2026, 9, 8, 23, 59, 59, 999));
    expect(resolveDatemath("now-7d/d", NOW, false)).toBe(local(2026, 9, 1));
    expect(resolveDatemath("now/w", NOW, false)).toBe(local(2026, 9, 4));
    expect(resolveDatemath("now/w", NOW, true)).toBe(local(2026, 9, 10, 23, 59, 59, 999));
    expect(resolveDatemath("now/M", NOW, true)).toBe(local(2026, 9, 31, 23, 59, 59, 999));
    expect(resolveDatemath("now/y", NOW, false)).toBe(local(2026, 0, 1));
  });

  it("clamps month math to the last day of the month, like Kibana", () => {
    expect(resolveDatemath("now-1M", new Date(2026, 2, 31, 10), false)).toBe(local(2026, 1, 28, 10));
    expect(resolveDatemath("now-1y", new Date(2028, 1, 29, 10), false)).toBe(local(2027, 1, 28, 10));
  });

  it("passes absolute dates through", () => {
    expect(resolveDatemath("2026-08-12T00:00:00.000Z", NOW, false)).toBe("2026-08-12T00:00:00.000Z");
  });

  it("returns null for unsupported expressions", () => {
    for (const expression of ["now-1d+2h", "now-1q", "now-", "now/q", "yesterday", ""]) {
      expect(resolveDatemath(expression, NOW, false)).toBeNull();
    }
  });
});
