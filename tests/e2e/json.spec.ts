import { expect, test } from "./fixtures";
import { bar, openDoc } from "./kibana";

test.beforeEach(async ({ configure }) => {
  await configure();
});

test("opens JSON text fields as a searchable tree", async ({ context }) => {
  const { detail } = await openDoc(context, { dataViewId: "app-log", query: 'extra.uid:"uid-001"' });
  await bar(detail).locator(".kt-bar > button.kt-ghost").click(); // "JSON"; the menu button sits inside .kt-menu
  await bar(detail).locator(".kt-fields button", { hasText: "context.headers" }).click();
  await expect(bar(detail).locator(".kt-row .kt-key", { hasText: "user-agent" })).toBeVisible();
  await bar(detail).locator('.kt-json input[type="search"]').fill("dev/1.0");
  await expect(bar(detail).locator(".kt-row.kt-match")).toHaveCount(1);
});

test("opens XML text fields as a tree, with the escaped XML inside them opened too", async ({ context }) => {
  // Plan 6 spec §5.3: app-002's context.request and context.response are XML (docker/seed.mjs).
  const { detail } = await openDoc(context, { dataViewId: "app-log", query: 'extra.uid:"uid-002"' });
  await bar(detail).locator(".kt-bar > button.kt-ghost").click();
  await expect(bar(detail).locator(".kt-fields button", { hasText: "context.request" })).toHaveText("context.request · XML");
  await bar(detail).locator(".kt-fields button", { hasText: "context.response" }).click();
  await expect(bar(detail).locator(".kt-row .kt-key", { hasText: "@currency" })).toBeVisible();
  await expect(bar(detail).locator(".kt-row .kt-key", { hasText: "runId" })).toBeVisible();
});

test("opens form text as a tree tagged by its kind", async ({ context }) => {
  // Spec 002 FR-001–FR-003: app-033's context.options.body is form-urlencoded text (docker/seed.mjs).
  const { detail } = await openDoc(context, { dataViewId: "app-log", query: 'extra.uid:"uid-033"' });
  await bar(detail).locator(".kt-bar > button.kt-ghost").click();
  const form = bar(detail).locator(".kt-fields button", { hasText: "context.options.body" });
  await expect(form).toHaveText(/^context\.options\.body · \S+$/); // the tag is localized
  await form.click();
  await expect(bar(detail).locator(".kt-row .kt-key", { hasText: "grant_type" })).toBeVisible();
  await expect(bar(detail).locator(".kt-row .kt-key", { hasText: "password" })).toBeVisible();
});

// app-034's context.output (docker/seed.mjs).
const CRON_OUTPUT = [
  "┌──────────────┬─────────┐",
  "│ job          │ status  │",
  "├──────────────┼─────────┤",
  "│ odds-import  │ synced  │",
  "│ race-results │ synced  │",
  "│ bonus-expiry │ skipped │",
  "└──────────────┴─────────┘",
].join("\n");

test("opens long and multi-line text in the text view", async ({ context }) => {
  // Spec 002 FR-007 – FR-013: app-034 has a multi-line output and a one-line error of 500+ characters.
  const { page, detail } = await openDoc(context, { dataViewId: "app-log", query: 'extra.uid:"uid-034"' });
  await bar(detail).locator(".kt-bar > button.kt-ghost").click();
  await expect(bar(detail).locator(".kt-fields button", { hasText: "context.error" })).toBeVisible();
  await bar(detail).locator(".kt-fields button", { hasText: "context.output" }).click();
  const text = bar(detail).locator("pre.kt-text");
  expect(await text.textContent()).toBe(CRON_OUTPUT);
  // Multi-line text opens unwrapped, so the table keeps its columns (spec 002 FR-011).
  await expect(text).not.toHaveClass(/kt-wrap/);
  expect(await text.evaluate((element) => getComputedStyle(element).whiteSpace)).toBe("pre");
  await bar(detail).locator('.kt-json input[type="search"]').fill("synced");
  await expect(text.locator("mark")).toHaveCount(2);
  await bar(detail).locator(".kt-json-head button[aria-pressed]").click();
  await expect(text).toHaveClass(/kt-wrap/);
  await bar(detail).locator(".kt-json-head button[aria-pressed] + button").click(); // copy
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(CRON_OUTPUT);
});

test("shows no panel button for a log without listed fields", async ({ context }) => {
  const { detail } = await openDoc(context, { dataViewId: "logs", query: 'trace.id:"trace-0001"' });
  await expect(bar(detail).locator(".kt-bar > button.kt-ghost")).toHaveCount(0);
});
