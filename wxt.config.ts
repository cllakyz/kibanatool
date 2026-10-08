import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "__MSG_extName__",
    description: "__MSG_extDescription__",
    default_locale: "en",
    permissions: ["storage", "scripting"],
    optional_host_permissions: ["http://*/*", "https://*/*"],
    action: { default_title: "kibanatool" },
  },
});
