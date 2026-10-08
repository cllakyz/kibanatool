// Localized strings from public/_locales; Chrome picks the browser language (spec §9).
import { browser } from "wxt/browser";

/** Every key of the English messages; tests/unit/i18n.test.ts keeps Turkish in step. */
export type MessageKey = keyof typeof import("../public/_locales/en/messages.json");

const getMessage = browser.i18n.getMessage.bind(browser.i18n) as unknown as (
  name: string,
  substitutions?: string[],
) => string;

export function t(key: MessageKey, ...substitutions: string[]): string {
  return getMessage(key, substitutions) || key;
}
