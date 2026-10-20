// The options page's palette and theme before its first frame (spec 006 FR-008; research R2). A classic script in
// the page's <head>: a module runs after the first frame, which would flash the other theme. It applies the stored
// choice, and under System follows the system's mode while the page is open.
import { defineUnlistedScript } from "#imports";
import { loadThemeChoice } from "../src/storage";
import { DARK, LIGHT, applyTheme, cssVars } from "../src/theme";

export default defineUnlistedScript(() => {
  const style = document.createElement("style");
  style.textContent = `:root[data-theme="light"] { color-scheme: light; ${cssVars(LIGHT)} } :root[data-theme="dark"] { color-scheme: dark; ${cssVars(DARK)} }`;
  document.head.append(style);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  // Re-reads the stored choice each time, so a pick made since load counts.
  const apply = (): void => applyTheme(document.documentElement, loadThemeChoice(localStorage), media.matches);
  apply();
  media.addEventListener("change", apply);
});
