// Styles for the action bar; they live inside each host's shadow root, isolated from Kibana's CSS.
export const BAR_CSS = `
:host { all: initial; display: block; }
.kt-root {
  margin: 6px 0; color: #343741;
  font: 12px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
}
.kt-bar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
  padding: 6px 8px; border: 1px solid #d3dae6; border-radius: 6px; background: #f7f8fc;
}
.kt-btn {
  display: inline-flex; align-items: center; padding: 2px 10px; border: 0; border-radius: 4px;
  background: #0077cc; color: #fff; font: inherit; font-weight: 500; text-decoration: none; cursor: pointer;
}
.kt-btn:hover, .kt-btn:focus-visible { background: #005fa3; outline: none; }
.kt-discover { background: #e6f1fa; color: #005fa3; }
.kt-discover:hover, .kt-discover:focus-visible { background: #cce4f5; }
.kt-disabled, .kt-disabled:hover, .kt-disabled:focus-visible { background: #eef0f4; color: #98a2b3; cursor: not-allowed; }
.kt-ghost { padding: 2px 8px; border: 0; border-radius: 4px; background: none; color: #343741; font: inherit; cursor: pointer; }
.kt-ghost:hover, .kt-ghost:focus-visible, .kt-ghost[aria-expanded="true"] { background: #e9edf3; outline: none; }
.kt-muted { color: #69707d; }
.kt-error { color: #bd271e; }
.kt-menu { position: relative; margin-left: auto; }
.kt-menu-list {
  position: absolute; top: 100%; right: 0; z-index: 1000; display: flex; flex-direction: column; min-width: 220px;
  margin-top: 4px; padding: 4px; border: 1px solid #d3dae6; border-radius: 6px; background: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.kt-menu-list button {
  padding: 6px 8px; border: 0; border-radius: 4px; background: none; color: #343741;
  font: inherit; text-align: left; cursor: pointer;
}
.kt-menu-list button:hover, .kt-menu-list button:focus-visible { background: #e9edf3; outline: none; }
.kt-json { margin-top: 4px; border: 1px solid #d3dae6; border-radius: 6px; background: #fff; }
.kt-json-head { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 6px 8px; border-bottom: 1px solid #eef0f4; }
.kt-json-head input { flex: 1 1 160px; padding: 2px 6px; border: 1px solid #c9d1dc; border-radius: 4px; font: inherit; }
.kt-json-head button, .kt-row-actions button, .kt-fields button {
  padding: 1px 8px; border: 1px solid #d3dae6; border-radius: 4px; background: #fff; color: #343741; font: inherit; cursor: pointer;
}
.kt-json-head button:disabled { color: #98a2b3; cursor: default; }
.kt-json-close { margin-left: auto; }
.kt-fields { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 8px; list-style: none; }
.kt-json-rows { max-height: 420px; overflow: auto; padding: 4px 0; font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; }
.kt-row { display: flex; align-items: baseline; gap: 6px; padding-right: 8px; white-space: pre-wrap; word-break: break-all; }
.kt-row:hover { background: #f5f7fa; }
.kt-match { background: #fff3c4; }
.kt-row[data-active] { background: #ffd966; }
.kt-toggle { flex: none; width: 16px; padding: 0; border: 0; background: none; color: #69707d; font: inherit; cursor: pointer; }
.kt-key { color: #7a3e9d; }
.kt-key::after { content: ":"; color: #69707d; }
.kt-string { color: #017d73; }
.kt-number, .kt-boolean { color: #0061a6; }
.kt-null, .kt-summary { color: #69707d; }
.kt-row-actions {
  display: inline-flex; gap: 4px; margin-left: auto; visibility: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
}
.kt-row:hover .kt-row-actions, .kt-row:focus-within .kt-row-actions { visibility: visible; }
`;
