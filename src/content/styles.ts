// Styles for the action bar; they live inside each host's shadow root, isolated from Kibana's CSS.
// The host's data-kt-theme (set from the page behind it, see themeBehind) picks the light or dark palette.
import { DARK, LIGHT, cssVars } from "../theme";

export const BAR_CSS = `
:host { all: initial; display: block; color-scheme: light; ${cssVars(LIGHT)} }
:host([data-kt-theme="dark"]) { color-scheme: dark; ${cssVars(DARK)} }
.kt-root {
  margin: 8px 0; color: var(--kt-text);
  font: 12px/1.5 var(--kt-font-sans);
}
.kt-bar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
  padding: 6px 8px; border: 1px solid var(--kt-border); border-radius: 8px; background: var(--kt-surface-sub);
}
.kt-btn {
  display: inline-flex; align-items: center; padding: 3px 8px; border: 0; border-radius: 4px;
  background: var(--kt-primary); color: var(--kt-on-primary); font: inherit; font-weight: 500; text-decoration: none; cursor: pointer;
  transition: background-color 120ms ease-in;
}
.kt-btn:hover { background: var(--kt-primary-hover); }
.kt-discover { background: var(--kt-discover); color: var(--kt-text-primary); }
.kt-discover:hover { background: var(--kt-discover-hover); }
.kt-disabled, .kt-disabled:hover { background: var(--kt-fill-disabled); color: var(--kt-text-disabled); cursor: not-allowed; }
.kt-ghost { padding: 3px 8px; border: 0; border-radius: 4px; background: none; color: var(--kt-text-primary); font: inherit; font-weight: 500; cursor: pointer; }
.kt-ghost:hover, .kt-ghost[aria-expanded="true"] { background: var(--kt-fill-hover); }
:is(.kt-btn, .kt-ghost, .kt-root button):focus-visible { outline: 2px solid var(--kt-text-primary); outline-offset: 1px; }
.kt-muted { color: var(--kt-text-muted); }
.kt-error { color: var(--kt-danger); }
.kt-menu { position: relative; margin-left: auto; }
.kt-menu-list {
  position: absolute; top: 100%; right: 0; z-index: 1000; display: flex; flex-direction: column; min-width: 220px;
  margin-top: 4px; padding: 4px; border: 1px solid var(--kt-border); border-radius: 8px; background: var(--kt-surface);
  box-shadow: var(--kt-shadow-menu);
}
.kt-menu-list button {
  padding: 6px 8px; border: 0; border-radius: 4px; background: none; color: var(--kt-text);
  font: inherit; text-align: left; cursor: pointer;
}
.kt-menu-list button:hover, .kt-menu-list button:focus-visible { background: var(--kt-fill-hover); outline: none; }
.kt-json { margin-top: 6px; border: 1px solid var(--kt-border); border-radius: 8px; background: var(--kt-surface); overflow: hidden; }
.kt-json-head { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 6px 8px; border-bottom: 1px solid var(--kt-border); }
.kt-json-head input {
  flex: 1 1 160px; padding: 3px 8px; border: 1px solid var(--kt-border-input); border-radius: 4px;
  background: var(--kt-surface); color: var(--kt-text); font: inherit;
}
.kt-json-head input:focus { outline: 2px solid var(--kt-text-primary); outline-offset: -1px; border-color: transparent; }
.kt-json-head button, .kt-row-actions button, .kt-fields button {
  padding: 1px 8px; border: 1px solid var(--kt-border-plain); border-radius: 4px; background: var(--kt-surface); color: var(--kt-text); font: inherit; cursor: pointer;
}
.kt-json-head button:hover, .kt-row-actions button:hover, .kt-fields button:hover { background: var(--kt-fill-hover); }
.kt-json-head button:disabled { background: var(--kt-surface); color: var(--kt-text-disabled); cursor: default; }
.kt-json-close { margin-left: auto; }
.kt-fields { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 8px; list-style: none; }
.kt-json-rows { max-height: 420px; overflow: auto; padding: 4px 0; font: 12px/1.6 var(--kt-font-mono); }
.kt-row { display: flex; align-items: baseline; gap: 6px; padding-right: 8px; white-space: pre-wrap; word-break: break-all; }
.kt-row:hover { background: var(--kt-row-hover); }
.kt-match, .kt-match:hover { background: var(--kt-match); }
.kt-row[data-active] { outline: 1px solid var(--kt-warning); outline-offset: -1px; }
.kt-toggle { flex: none; width: 16px; padding: 0; border: 0; background: none; color: var(--kt-text-muted); font: inherit; cursor: pointer; }
.kt-key { color: var(--kt-json-key); }
.kt-key::after { content: ":"; color: var(--kt-text-muted); }
.kt-string { color: var(--kt-json-string); }
.kt-number, .kt-boolean { color: var(--kt-json-number); }
.kt-null, .kt-summary { color: var(--kt-text-muted); }
.kt-row-actions {
  display: inline-flex; gap: 4px; margin-left: auto; opacity: 0;
  font-family: var(--kt-font-sans);
}
.kt-row:hover .kt-row-actions, .kt-row:focus-within .kt-row-actions { opacity: 1; }
@media (prefers-reduced-motion: reduce) { .kt-btn { transition: none; } }
`;
