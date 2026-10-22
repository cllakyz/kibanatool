export const REPO_URL = "https://github.com/cllakyz/kibanatool";
export const STORE_URL = "https://chromewebstore.google.com/detail/kibanatool/flgnjcjghmbcnfhilikbeddkhjiagodp";

const RAW = "https://raw.githubusercontent.com/cllakyz/kibanatool/main/examples";

export function exampleSettingsUrl(locale: string): string {
  return locale === "tr" ? `${RAW}/kibanatool-settings.tr.json` : `${RAW}/kibanatool-settings.json`;
}
