import { resolveDatemath } from "../../src/core/datemath";
import { readAppState, readGlobalTime } from "../../src/kibana/discover-state";
import { expect, test } from "./fixtures";
import { bar, copyFromMenu, openDoc, prefixOf } from "./kibana";
import { stack } from "./stack";

test.beforeEach(async ({ configure }) => {
  await configure();
});

const APP_001 = { dataViewId: "app-log", query: 'extra.uid:"uid-001"' };
const DOC_LINK = `${stack.origin}${prefixOf()}/app/discover#/doc/app-log/app_log?id=app-001`;

test("copies the log as masked Markdown", async ({ context }) => {
  const { page, detail } = await openDoc(context, APP_001);
  const markdown = await copyFromMenu(page, detail, 0);
  const lines = markdown.split("\n");
  expect(lines[0]).toBe("**app_log** · 2026-01-15T10:00:00.000Z");
  expect(lines).toContain("- `user_id`: 100001");
  expect(markdown).toContain('"authorization": "***"');
  expect(markdown).not.toContain("synthetic-token");
  expect(lines.at(-1)?.endsWith(`](${DOC_LINK})`)).toBe(true); // the link text is localized
});

test("copies the log link, and the link opens the same log", async ({ context }) => {
  const { page, detail } = await openDoc(context, APP_001);
  expect(await copyFromMenu(page, detail, 1)).toBe(DOC_LINK);
  const doc = await context.newPage();
  await doc.goto(DOC_LINK);
  await expect(doc.getByText("app-001", { exact: true }).first()).toBeVisible({ timeout: 90_000 });
});

test("copies the view with its relative time range made absolute", async ({ context }) => {
  const { page, detail } = await openDoc(context, { ...APP_001, time: { from: "now-5y", to: "now" } });
  const before = Date.now();
  const url = await copyFromMenu(page, detail, 2);
  const hash = new URL(url).hash;
  const time = readGlobalTime(hash) ?? { from: "", to: "" };
  const to = Date.parse(time.to);
  expect(to).toBeGreaterThanOrEqual(before - 1000);
  expect(to).toBeLessThanOrEqual(Date.now() + 1000);
  expect(time.from).toBe(resolveDatemath("now-5y", new Date(to), false));
  expect(readAppState(hash).query).toEqual({ language: "kuery", query: APP_001.query });
});

test("the copy menu works with the keyboard and closes on a click outside", async ({ context }) => {
  const { page, detail } = await openDoc(context, APP_001);
  const trigger = bar(detail).locator(".kt-menu > button");
  const items = bar(detail).getByRole("menuitem");
  await trigger.click();
  await expect(items.first()).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(items.nth(1)).toBeFocused();
  await page.keyboard.press("End");
  await expect(items.nth(2)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(items.first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(items).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(detail).toBeVisible(); // Escape stayed in the bar: Kibana kept the row or flyout open
  await trigger.click();
  await expect(items).toHaveCount(3);
  await detail.locator('[data-test-subj="kbnDocViewer"]').click({ position: { x: 5, y: 5 } });
  await expect(items).toHaveCount(0);
});
