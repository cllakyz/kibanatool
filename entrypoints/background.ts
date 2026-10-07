import { defineBackground } from "#imports";
import { browser } from "wxt/browser";
import { serialized, syncContentScripts } from "../src/background/registration";
import { createConfigStore, isConfigChange } from "../src/storage";

export default defineBackground(() => {
  const store = createConfigStore(browser.storage.local);

  const run = async (): Promise<void> => {
    try {
      const { config } = await store.load();
      await syncContentScripts(config, { scripting: browser.scripting, permissions: browser.permissions });
    } catch (error) {
      console.error("[kibanatool] content script sync failed", error);
    }
  };
  // Triggers can fire back to back (grant permission, then save config); runs must not interleave.
  const sync = serialized(run);

  browser.runtime.onInstalled.addListener(() => void sync());
  browser.runtime.onStartup.addListener(() => void sync());
  browser.permissions.onAdded.addListener(() => void sync());
  browser.permissions.onRemoved.addListener(() => void sync());
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (isConfigChange(changes, areaName)) void sync();
  });
  browser.action.onClicked.addListener(() => void browser.runtime.openOptionsPage());
});
