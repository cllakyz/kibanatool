// Styles for the action bar; they live inside each host's shadow root, isolated from Kibana's CSS.
export const BAR_CSS = `
:host { all: initial; display: block; }
.kt-bar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
  margin: 6px 0; padding: 6px 8px;
  border: 1px solid #d3dae6; border-radius: 6px; background: #f7f8fc; color: #343741;
  font: 12px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
}
.kt-btn {
  display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 4px;
  background: #0077cc; color: #fff; font-weight: 500; text-decoration: none;
}
.kt-btn:hover, .kt-btn:focus-visible { background: #005fa3; outline: none; }
.kt-muted { color: #69707d; }
.kt-error { color: #bd271e; }
`;
