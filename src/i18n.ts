// Localized strings from public/_locales; Chrome picks the browser language (spec §9).
import { browser } from "wxt/browser";

export type MessageKey =
  | "barLoading"
  | "errorForbidden"
  | "errorNotFound"
  | "errorIncompatible"
  | "errorServer"
  | "errorNetwork"
  | "errorUnknown";

const getMessage = browser.i18n.getMessage.bind(browser.i18n) as unknown as (
  name: string,
  substitutions?: string[],
) => string;

export function t(key: MessageKey, ...substitutions: string[]): string {
  return getMessage(key, substitutions) || key;
}
