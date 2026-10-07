import { defineUnlistedScript } from "#imports";

// Registered at runtime for granted Kibana origins (see src/background/registration.ts).
export default defineUnlistedScript(() => {
  console.debug("[kibanatool] content script loaded");
});
