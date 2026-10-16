// Discover helpers for the e2e specs. Selectors are Kibana's data-test-subj values, checked on 7.17.29, 8.19.23 and 9.5.5.
import { type BrowserContext, type Locator, type Page, expect } from "@playwright/test";
import type { TimeRange } from "../../src/core/types";
import { discoverUrl } from "../../src/kibana/url";
import { stack } from "./stack";

/** Every seeded log is inside this range (docker/seed.mjs). */
export const SEED_TIME: TimeRange = { from: "2026-01-01T00:00:00.000Z", to: "2026-02-01T00:00:00.000Z" };

export interface DiscoverTarget {
  space?: string;
  dataViewId: string;
  query: string;
  time?: TimeRange;
}

/** `<base path>[/s/<space>]`, the prefix the extension derives from the page (spec §6.1). */
export function prefixOf(space?: string): string {
  return new URL(stack.kibana).pathname.replace(/\/$/, "") + (space ? `/s/${space}` : "");
}

/** Open detail views: expanded rows on 7.17, the document flyout on 8.x/9.x. */
export function detailViews(page: Page): Locator {
  return page.locator(
    stack.major === 7 ? '[data-test-subj="docTableDetailsRow"]:has([data-test-subj="kbnDocViewer"])' : '[data-test-subj="docViewerFlyout"]',
  );
}

/** The action bar of a detail view; Playwright's CSS selectors pierce its open shadow root. */
export function bar(detail: Locator): Locator {
  return detail.locator("kibanatool-bar");
}

/**
 * Opens Discover on `target` in a new tab, opens the first row, and waits for its bar to finish loading.
 * A new tab every time: on 9.x a hash change in the same tab does not switch the data view (spec §3).
 */
export async function openDoc(context: BrowserContext, target: DiscoverTarget): Promise<{ page: Page; detail: Locator }> {
  const page = await context.newPage();
  const { space, dataViewId, query, time = SEED_TIME } = target;
  await page.goto(stack.origin + discoverUrl({ prefix: prefixOf(space), dataViewId, query, time }));
  const toggle = page.locator('[data-test-subj="docTableExpandToggleColumn"]').first();
  await toggle.waitFor({ timeout: 90_000 });
  await toggle.click();
  const detail = detailViews(page).first();
  await bar(detail).locator(".kt-menu").waitFor(); // the menu renders once the log is loaded
  return { page, detail };
}

/** Opens Discover on `target` in `page` and waits for the first result row; nothing is expanded (spec 003). */
export async function openTable(page: Page, target: DiscoverTarget): Promise<Page> {
  const { space, dataViewId, query, time = SEED_TIME } = target;
  await page.goto(stack.origin + discoverUrl({ prefix: prefixOf(space), dataViewId, query, time }));
  await resultRows(page).first().waitFor({ timeout: 90_000 });
  return page;
}

/** Collapsed result rows: the legacy table on 7.17, the data grid on 8.x/9.x. */
export function resultRows(page: Page): Locator {
  return page.locator(stack.major === 7 ? '[data-test-subj="docTableRow"]' : '[role="row"]:has([data-test-subj^="dscGridSelectDoc-"])');
}

/** The row strip; Playwright's CSS selectors pierce its open shadow root. */
export function strip(page: Page): Locator {
  return page.locator("kibanatool-row");
}

/** The extension's own Kibana requests (its kbn-xsrf value), with their parsed bodies, from now on. */
export function extensionRequests(page: Page): Array<{ url: string; body: unknown }> {
  const requests: Array<{ url: string; body: unknown }> = [];
  page.on("request", (request) => {
    if (request.headers()["kbn-xsrf"] !== "kibanatool") return;
    const text = request.postData();
    requests.push({ url: request.url(), body: text ? JSON.parse(text) : undefined });
  });
  return requests;
}

/** Label → href of the row strip's link and Discover buttons. */
export async function stripLinks(page: Page): Promise<Record<string, string>> {
  const entries = await strip(page)
    .locator("a.kt-btn")
    .evaluateAll((links) => links.map((link): [string, string] => [link.textContent ?? "", link.getAttribute("href") ?? ""]));
  return Object.fromEntries(entries);
}

/** Label → href of the bar's link and Discover buttons. */
export async function barLinks(detail: Locator): Promise<Record<string, string>> {
  const entries = await bar(detail)
    .locator("a.kt-btn")
    .evaluateAll((links) => links.map((link): [string, string] => [link.textContent ?? "", link.getAttribute("href") ?? ""]));
  return Object.fromEntries(entries);
}

/**
 * Runs a copy menu item and returns what it copied: 0 Markdown, 1 JSON, then 2 log link and 3 view with fixed time.
 * A log that records a request has "Copy as cURL" at 2, which moves the other two down (Plan 7 spec §6).
 */
export async function copyFromMenu(page: Page, detail: Locator, item: 0 | 1 | 2 | 3 | 4): Promise<string> {
  await bar(detail).locator(".kt-menu > button").click();
  await bar(detail).getByRole("menuitem").nth(item).click();
  await expect(bar(detail).getByRole("status")).toBeVisible();
  return page.evaluate(() => navigator.clipboard.readText());
}

/** Clicks a bar link that opens a new tab and waits until Discover there shows its hit count. */
export async function followToNewTab(page: Page, link: Locator): Promise<Page> {
  const [tab] = await Promise.all([page.context().waitForEvent("page"), link.click()]);
  await tab.locator('[data-test-subj="discoverQueryHits"]').waitFor({ timeout: 90_000 });
  return tab;
}
