import { defineBackground } from "#imports";
import { browser } from "wxt/browser";

export default defineBackground(() => {
  browser.action.onClicked.addListener(() => void browser.runtime.openOptionsPage());
});
