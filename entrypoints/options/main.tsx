import { createRoot } from "react-dom/client";
import { browser } from "wxt/browser";
import { reportTheme } from "../../src/toolbar-icon";
import { App } from "./App";
import "./options.css";

// The palette and the page's theme come from options-theme.js in <head>, before the first frame (spec 006). This
// only reports the system's mode, for the toolbar icon.
reportTheme((message) => browser.runtime.sendMessage(message), window.matchMedia("(prefers-color-scheme: dark)"));

createRoot(document.getElementById("root")!).render(<App />);
