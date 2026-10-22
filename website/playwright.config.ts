import { defineConfig, devices } from "@playwright/test";

// Serves the built site (build/); run `npm run build` first.
export default defineConfig({
  testDir: "tests",
  testMatch: "*.spec.ts",
  use: { baseURL: "http://localhost:4173/kibanatool/" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run serve -- --port 4173 --no-open",
    url: "http://localhost:4173/kibanatool/",
    reuseExistingServer: !process.env.CI,
  },
});
