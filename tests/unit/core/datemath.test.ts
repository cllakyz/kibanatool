import { afterAll, describe, expect, it } from "vitest";
import { resolveDatemath } from "../../../src/core/datemath";

// A zone with DST, so the DST tests below mean something on any machine (UTC on CI).
// Node applies a TZ change at runtime; the other tests here pass in any zone.
const originalTz = process.env.TZ;
process.env.TZ = "America/New_York";
afterAll(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});

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
    expect(resolveDatemath("now/y", NOW, true)).toBe(local(2026, 11, 31, 23, 59, 59, 999));
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

describe("resolveDatemath across a DST change", () => {
  // America/New_York falls back on 1 November 2026 at 06:00Z: 02:00 EDT becomes 01:00 EST.
  const AFTER_FALL_BACK = new Date("2026-11-01T06:30:00.000Z"); // 01:30 EST

  it("moves s, m and h by absolute time, like Kibana", () => {
    expect(AFTER_FALL_BACK.getTimezoneOffset()).toBe(300); // EST: the TZ switch above took effect
    expect(resolveDatemath("now-1h", AFTER_FALL_BACK, false)).toBe("2026-11-01T05:30:00.000Z");
    expect(resolveDatemath("now-90m", AFTER_FALL_BACK, false)).toBe("2026-11-01T05:00:00.000Z");
    expect(resolveDatemath("now-3600s", AFTER_FALL_BACK, false)).toBe("2026-11-01T05:30:00.000Z");
  });

  it("keeps d as a calendar day", () => {
    expect(resolveDatemath("now-1d", AFTER_FALL_BACK, false)).toBe("2026-10-31T05:30:00.000Z"); // 01:30 EDT
  });
});