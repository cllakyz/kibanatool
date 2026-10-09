import { createRoot } from "react-dom/client";
import { DARK, LIGHT, cssVars } from "../../src/theme";
import { App } from "./App";
import "./options.css";

// The palette lives in src/theme.ts, shared with the action bar; the page follows the system's light or dark mode.
const theme = document.createElement("style");
theme.textContent = `:root { ${cssVars(LIGHT)} } @media (prefers-color-scheme: dark) { :root { ${cssVars(DARK)} } }`;
document.head.append(theme);

createRoot(document.getElementById("root")!).render(<App />);
