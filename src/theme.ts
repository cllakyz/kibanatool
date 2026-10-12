// Light and dark palettes from Kibana 9's Borealis theme, as CSS custom properties (--kt-<name>).
// The options page follows the system setting; the action bar follows the Kibana page behind it.

export type Palette = Record<string, string>;

export const LIGHT: Palette = {
  "surface-page": "#f6f9fc",
  surface: "#ffffff",
  "surface-sub": "#f6f9fc",
  "row-hover": "rgba(23, 80, 186, 0.04)",
  "fill-hover": "rgba(55, 136, 255, 0.12)",
  "fill-disabled": "#ecf1f9",
  text: "#1d2a3e",
  "text-muted": "#516381",
  "text-disabled": "#798eaf",
  border: "#e3e8f2",
  "border-plain": "#cad3e2",
  "border-input": "#798eaf",
  primary: "#0b64dd",
  "primary-hover": "#1750ba",
  "on-primary": "#ffffff",
  "text-primary": "#1750ba",
  discover: "#d9e8ff",
  "discover-hover": "#bfdbff",
  danger: "#a71627",
  "danger-soft": "#fff3f1",
  "danger-border": "#ffc9c2",
  success: "#09724d",
  "success-soft": "#e9fff7",
  "success-border": "#aee8d2",
  warning: "#966b03",
  "warning-text": "#825803",
  "warning-soft": "#fff7e2",
  "warning-border": "#fcd883",
  "json-key": "#6b3c9f",
  "json-string": "#047471",
  "json-number": "#1750ba",
  match: "#fde9b5",
  "shadow-menu": "0 0 2px 0 rgba(43, 57, 79, 0.16), 0 3px 10px 0 rgba(43, 57, 79, 0.1), 0 6px 14px 0 rgba(43, 57, 79, 0.06)",
};

export const DARK: Palette = {
  "surface-page": "#050f21",
  surface: "#111c2c",
  "surface-sub": "#0b1628",
  "row-hover": "rgba(255, 255, 255, 0.08)",
  "fill-hover": "rgba(55, 136, 255, 0.12)",
  "fill-disabled": "#1d2a3e",
  text: "#cad3e2",
  "text-muted": "#98a8c3",
  "text-disabled": "#6a7fa0",
  border: "#2b394f",
  "border-plain": "#485975",
  "border-input": "#6a7fa0",
  primary: "#61a2ff",
  "primary-hover": "#85b7ff",
  "on-primary": "#050f21",
  "text-primary": "#61a2ff",
  discover: "#0d2f5e",
  "discover-hover": "#0a2342",
  danger: "#f6726a",
  "danger-soft": "#351721",
  "danger-border": "#5e2129",
  success: "#24c292",
  "success-soft": "#092a26",
  "success-border": "#094837",
  warning: "#facb3d",
  "warning-text": "#fcd883",
  "warning-soft": "#2c2721",
  "warning-border": "#513910",
  "json-key": "#c5a5fa",
  "json-string": "#16c5c0",
  "json-number": "#61a2ff",
  match: "#3d3014",
  "shadow-menu": "0 3px 10px 0 rgba(5, 15, 33, 0.52), 0 6px 14px 0 rgba(5, 15, 33, 0.28)",
};

export const FONT_SANS = `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`;
export const FONT_MONO = `"Roboto Mono", ui-monospace, SFMono-Regular, Menlo, monospace`;

/** The palette as declarations, plus the two font stacks. */
export function cssVars(palette: Palette): string {
  const colors = Object.entries(palette).map(([name, value]) => `--kt-${name}: ${value};`);
  return [...colors, `--kt-font-sans: ${FONT_SANS};`, `--kt-font-mono: ${FONT_MONO};`].join(" ");
}

/** [r, g, b, a] from `#rgb`, `#rrggbb` or the `rgb()`/`rgba()` form getComputedStyle returns; null otherwise. */
export function parseColor(text: string): [number, number, number, number] | null {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim());
  if (hex) {
    const digits = hex[1]!.length === 3 ? [...hex[1]!].map((d) => d + d) : hex[1]!.match(/../g)!;
    const [r, g, b] = digits.map((pair) => Number.parseInt(pair, 16));
    return [r!, g!, b!, 1];
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(text.trim());
  if (!rgb) return null;
  const alpha = rgb[4] === undefined ? 1 : rgb[4].endsWith("%") ? Number.parseFloat(rgb[4]) / 100 : Number(rgb[4]);
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), alpha];
}

/** WCAG relative luminance of an sRGB color. */
export function luminance([r, g, b]: readonly number[]): number {
  const [lr, lg, lb] = [r!, g!, b!].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr! + 0.7152 * lg! + 0.0722 * lb!;
}

/**
 * Light or dark, from the first mostly opaque background behind the element. Kibana marks its theme
 * differently in 7.17, 8.x and 9.x (and 9.x can follow the system), so the rendered color is the one signal
 * every version shares. No opaque background up the tree means the page's default white.
 */
export function themeBehind(element: Element, styleOf: (element: Element) => { backgroundColor: string } = getComputedStyle): "light" | "dark" {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const color = parseColor(styleOf(node).backgroundColor);
    if (color && color[3] >= 0.5) return luminance(color) < 0.2 ? "dark" : "light";
  }
  return "light";
}
