import { expect, test, type Page } from "@playwright/test";
import { STORE_URL } from "../src/constants";

// goto resolves on load, before React hydrates; Docusaurus then sets <html data-has-hydrated="true">.
async function openHydrated(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute("data-has-hydrated", "true");
}

const PAGES = ["", "tr/", "docs/getting-started/introduction", "tr/docs/getting-started/introduction", "releases", "tr/releases"];

test("pages load only from the site, with no failed request", async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const bad: string[] = [];
  page.on("request", (r) => { if (!r.url().startsWith("data:") && new URL(r.url()).origin !== origin) bad.push(r.url()); });
  page.on("response", (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
  for (const path of PAGES) await page.goto(path, { waitUntil: "networkidle" });
  expect(bad).toEqual([]);
});

test.describe("hero demo without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("starts on User in admin", async ({ page }) => {
    await page.goto("");
    const demo = page.getByTestId("hero-demo");
    await expect(demo.getByRole("button", { name: "User in admin" })).toHaveAttribute("aria-pressed", "true");
    await expect(demo.locator('[data-field="user_id"]')).toHaveAttribute("data-marked", "true");
    await expect(demo.getByRole("status")).toContainText("https://admin.example.com/users/4821");
  });
});

test("focus and click choose a demo button", async ({ page }) => {
  await openHydrated(page, "");
  const demo = page.getByTestId("hero-demo");
  await demo.getByRole("button", { name: "Sentry", exact: true }).focus();
  for (const field of ["level_name", "message"]) await expect(demo.locator(`[data-field="${field}"]`)).toHaveAttribute("data-marked", "true");
  await expect(demo.locator('[data-field="user_id"]')).toHaveAttribute("data-marked", "false");
  await expect(demo.getByRole("status")).toContainText("https://acme.sentry.io/issues/?query=Coupon%20not%20applied");
  await demo.getByRole("button", { name: "±5 minutes" }).click();
  await expect(demo.locator('[data-field="datetime"]')).toHaveAttribute("data-marked", "true");
  await expect(demo.getByRole("status")).toContainText("12:34 to 12:44");
});

test("screenshot tabs follow the arrow keys", async ({ page }) => {
  await openHydrated(page, "");
  const tabs = page.getByRole("tab");
  await expect(tabs).toHaveCount(5);
  await tabs.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel").getByRole("img")).toHaveAttribute("src", /\/img\/screenshots\/en\/2-rows\.png$/);
  await page.keyboard.press("End");
  await expect(tabs.nth(4)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowRight");
  await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
});

test("Add to Chrome goes to the store and Read the docs to the introduction", async ({ page }) => {
  await page.goto("");
  await expect(page.getByRole("link", { name: "Add to Chrome" }).first()).toHaveAttribute("href", STORE_URL);
  await expect(page.getByRole("link", { name: "Read the docs" })).toHaveAttribute("href", "/kibanatool/docs/getting-started/introduction");
});

test("the Turkish home page uses Turkish screenshots and the Turkish example file", async ({ page }) => {
  await page.goto("tr/");
  await expect(page.locator("html")).toHaveAttribute("lang", "tr");
  await expect(page.getByRole("tabpanel").getByRole("img")).toHaveAttribute("src", /\/img\/screenshots\/tr\/1-bar\.png$/);
  await expect(page.locator('a[href$="/examples/kibanatool-settings.tr.json"]')).toHaveCount(1);
});

test("no horizontal scroll at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ["", "tr/", "docs/getting-started/introduction"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  }
});
