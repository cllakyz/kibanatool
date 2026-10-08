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

/** Label → href of the bar's link and Discover buttons. */
export async function barLinks(detail: Locator): Promise<Record<string, string>> {
  const entries = await bar(detail)
    .locator("a.kt-btn")
    .evaluateAll((links) => links.map((link): [string, string] => [link.textContent ?? "", link.getAttribute("href") ?? ""]));
  return Object.fromEntries(entries);
}

/** Runs a copy menu item (0 Markdown, 1 log link, 2 view with fixed time) and returns what it copied. */
export async function copyFromMenu(page: Page, detail: Locator, item: 0 | 1 | 2): Promise<string> {
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
