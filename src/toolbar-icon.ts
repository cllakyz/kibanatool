// The toolbar icon follows the browser's light or dark mode. The service worker cannot read the color scheme,
// so the options page and the content script report it, and the background swaps the icon set.

export const THEME_MESSAGE = "kibanatool:theme";

export interface ThemeMessage {
  type: typeof THEME_MESSAGE;
  dark: boolean;
}

export function isThemeMessage(value: unknown): value is ThemeMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Record<string, unknown>;
  return message.type === THEME_MESSAGE && typeof message.dark === "boolean";
}

/** The rendered icon set (npm run icons): public/icon for light, public/icon-dark for dark. */
export function iconPaths(dark: boolean): Record<string, string> {
  const dir = dark ? "icon-dark" : "icon";
  return Object.fromEntries([16, 32, 48, 128].map((size) => [String(size), `/${dir}/${size}.png`]));
}

/** Sends the current color scheme now and whenever it changes. A failed send is only logged. */
export function reportTheme(send: (message: ThemeMessage) => Promise<unknown>, media: Pick<MediaQueryList, "matches" | "addEventListener">): void {
  // Through a promise, so a synchronous throw (an invalidated extension context) is caught too.
  const report = (): void => {
    Promise.resolve()
      .then(() => send({ type: THEME_MESSAGE, dark: media.matches }))
      .catch((error: unknown) => console.debug("[kibanatool] theme report failed:", error));
  };
  report();
  media.addEventListener("change", report);
}
