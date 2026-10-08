import { defineConfig } from "@playwright/test";

// One Kibana stack per run: KT_STACK=7|8|9 after ./docker/up.sh <major> (tests/e2e/stack.ts).
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 180_000,
  expect: { timeout: 30_000 },
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
});
