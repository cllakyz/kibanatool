import { describe, expect, it } from "vitest";
import { DARK, LIGHT, type Palette, luminance, parseColor, themeBehind } from "../../src/theme";

function contrast(palette: Palette, foreground: string, background: string): number {
  const [a, b] = [foreground, background].map((name) => {
    const color = parseColor(palette[name] ?? "");
    if (!color) throw new Error(`${name} is not a plain color`);
    return luminance(color);
  });
  return (Math.max(a!, b!) + 0.05) / (Math.min(a!, b!) + 0.05);
}

// [foreground, background, minimum]: 4.5 for text, 3 for input borders, the focus ring and state marks.
const PAIRS: [string, string, number][] = [
  ...["surface-page", "surface", "surface-sub", "match"].flatMap((ground): [string, string, number][] => [
    ["text", ground, 4.5],
    ["text-muted", ground, 4.5],
  ]),
  ...["surface", "match"].flatMap((ground): [string, string, number][] =>
    ["json-key", "json-string", "json-number"].map((name) => [name, ground, 4.5]),
  ),
  ["on-primary", "primary", 4.5],
  ["on-primary", "primary-hover", 4.5],
  ["text-primary", "discover", 4.5],
  ["text-primary", "discover-hover", 4.5],
  ["text-primary", "surface-sub", 4.5],
  ["danger", "surface", 4.5],
  ["danger", "danger-soft", 4.5],
  ["success", "surface", 4.5],
  ["warning-text", "surface", 4.5],
  ["warning-text", "surface-sub", 4.5],
  ["text", "danger-soft", 4.5],
  ["text", "success-soft", 4.5],
  ["text", "warning-soft", 4.5],
  ["border-input", "surface", 3],
  ["border-input", "surface-sub", 3],
  ["warning", "warning-soft", 3],
  ["warning", "match", 3],
  ["text-primary", "surface", 3],
  ["text-primary", "surface-page", 3],
];

describe("palettes", () => {
  it("define the same names", () => {
    expect(Object.keys(DARK).sort()).toEqual(Object.keys(LIGHT).sort());
  });

  for (const [name, palette] of [["light", LIGHT], ["dark", DARK]] as const) {
    it.each(PAIRS)(`${name}: %s on %s reaches %d:1`, (foreground, background, minimum) => {
      expect(contrast(palette, foreground, background)).toBeGreaterThanOrEqual(minimum);
    });
  }
});

describe("parseColor", () => {
  it("reads hex and the rgb() forms", () => {
    expect(parseColor("#fff")).toEqual([255, 255, 255, 1]);
    expect(parseColor("#111c2c")).toEqual([17, 28, 44, 1]);
    expect(parseColor("rgb(17, 28, 44)")).toEqual([17, 28, 44, 1]);
    expect(parseColor("rgba(0, 0, 0, 0)")).toEqual([0, 0, 0, 0]);
    expect(parseColor("rgb(17 28 44 / 50%)")).toEqual([17, 28, 44, 0.5]);
  });

  it("returns null for anything else", () => {
    expect(parseColor("transparent")).toBeNull();
    expect(parseColor("oklch(0.2 0.03 260)")).toBeNull();
  });
});

describe("themeBehind", () => {
  type Node = { parentElement: Node | null; bg: string };
  const chain = (...backgrounds: string[]): Element => {
    let node: Node | null = null;
    for (const bg of backgrounds.reverse()) node = { parentElement: node, bg };
    return { parentElement: node } as unknown as Element;
  };
  const styleOf = (node: Element) => ({ backgroundColor: (node as unknown as Node).bg });

  it("uses the first mostly opaque background up the tree", () => {
    expect(themeBehind(chain("rgba(0, 0, 0, 0)", "rgb(17, 28, 44)", "rgb(255, 255, 255)"), styleOf)).toBe("dark");
    expect(themeBehind(chain("rgba(0, 0, 0, 0.04)", "rgb(255, 255, 255)"), styleOf)).toBe("light");
  });

  it("falls back to light when nothing is opaque", () => {
    expect(themeBehind(chain("rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0)"), styleOf)).toBe("light");
  });
});
