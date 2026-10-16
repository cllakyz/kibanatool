// Spec 003: one-click action buttons on Discover result rows (quickstart checks 1–8).
import type { Page } from "@playwright/test";
import { e2eConfig, expect, markInRow, test, unregisterScript, writeStored } from "./fixtures";
import { barLinks, detailViews, extensionRequests, followToNewTab, openDoc, openTable, resultRows, strip, stripLinks } from "./kibana";
import { stack } from "./stack";

const APP_004 = { dataViewId: "app-log", query: 'extra.uid:"uid-004"' };

/** The extension's batched prefetch, as opposed to a single-document fetch. */
function prefetchIds(body: unknown): string[] | undefined {
  const query = (body as { params?: { index?: string; body?: { query?: { bool?: { should?: unknown[] } } } } })?.params?.body?.query;
  const should = query?.bool?.should as Array<{ bool: { filter: [{ term: { _index: string } }, { ids: { values: string[] } }] } }> | undefined;
  return should?.flatMap(({ bool: { filter: [term, ids] } }) => ids.ids.values.map((id) => `${term.term._index}/${id}`));
}

const cellRects = (page: Page) =>
  resultRows(page)
    .locator(stack.major === 7 ? ":scope > td" : '[role="gridcell"]')
    .evaluateAll((cells) => cells.slice(0, 12).map((cell) => cell.getBoundingClientRect().toJSON()));

test("shows the marked actions on a hovered row and runs one with one click", async ({ context, configure }) => {
  await configure(markInRow(e2eConfig(), ["user", "error", "same-user"]));
  const page = await context.newPage();
  const requests = extensionRequests(page);
  const prefetched = page.waitForResponse(
    (response) => response.url().endsWith("/internal/search/es") && response.request().headers()["kbn-xsrf"] === "kibanatool",
  );
  const lookedUp = page.waitForResponse((response) => /\/api\/(data_views\/data_view|index_patterns\/index_pattern)\//.test(response.url()) && response.ok());
  await openTable(page, APP_004);
  await Promise.all([prefetched, lookedUp]);

  // SC-003: a prefetched row's buttons come without a request. The time is measured in the page; its 0.3 s target
  // holds on a laptop (docs/verification/2026-10-row-actions.md), but a busy CI runner delays Kibana's main thread,
  // so this bound only catches a hover that waits on the network.
  const sent = requests.length;
  const elapsed = await resultRows(page)
    .first()
    .evaluate(async (row) => {
      const start = performance.now();
      (row.querySelector("td, [role='gridcell']") ?? row).dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
      while (performance.now() - start < 5000) {
        if (document.querySelector("kibanatool-row")?.shadowRoot?.querySelector("a.kt-btn")) return performance.now() - start;
        await new Promise(requestAnimationFrame);
      }
      return Number.POSITIVE_INFINITY;
    });
  expect(requests).toHaveLength(sent);
  expect(elapsed).toBeLessThan(1000);

  await resultRows(page).first().hover();
  await expect(strip(page).locator("a.kt-btn")).toHaveCount(3);
  const links = await stripLinks(page);
  expect(Object.keys(links)).toEqual(["User", "Error", "Same user ±5"]);
  expect(links).toMatchObject({ User: "https://admin.example.com/users/100004", Error: "https://errors.example.com/?id=app-004" });

  const tab = await followToNewTab(page, strip(page).getByRole("link", { name: "Same user ±5" }));
  await expect(tab.locator('[data-test-subj="discoverQueryHits"]')).toBeVisible();
  await expect(detailViews(page)).toHaveCount(0);

  // SC-002: the row's buttons are the bar's buttons for the same log.
  const { detail } = await openDoc(context, APP_004);
  const bar = await barLinks(detail);
  for (const [label, href] of Object.entries(links)) expect(bar[label]).toBe(href);
});

test("shows a greyed action with its reason", async ({ context, configure }) => {
  await configure(markInRow(e2eConfig(), ["window"]));
  const page = await openTable(await context.newPage(), { dataViewId: "all-logs", query: 'extra.uid:"uid-001"' });
  await resultRows(page).first().hover();
  const windowOnly = strip(page).locator(".kt-disabled", { hasText: "±5 minutes" });
  await expect(windowOnly).toHaveAttribute("aria-disabled", "true");
  await expect(windowOnly).toHaveAttribute("title", /\S/);
});

test("keyboard focus shows the strip and Tab reaches it", async ({ context, configure }) => {
  await configure(markInRow(e2eConfig(), ["user"]));
  const page = await openTable(await context.newPage(), APP_004);
  if (stack.major === 7) {
    await resultRows(page).first().locator('[data-test-subj="docTableExpandToggleColumn"]').focus();
  } else {
    // The grid focuses a cell on click; the pointer then leaves, so only focus keeps the strip (research R11).
    await resultRows(page).first().locator('[data-gridcell-column-id="datetime"]').click();
    await page.mouse.move(5, 5);
  }
  await expect(strip(page).getByRole("link", { name: "User", exact: true })).toBeVisible();
  let reached = false;
  for (let tab = 0; tab < 6 && !reached; tab++) {
    await page.keyboard.press("Tab");
    reached = await page.evaluate(() => document.activeElement?.tagName === "KIBANATOOL-ROW");
  }
  expect(reached).toBe(true);
});

test("sends nothing and adds nothing when no action is marked; marking works without a reload", async ({ context, configure, extension }) => {
  await configure();
  const page = await context.newPage();
  const requests = extensionRequests(page);
  await openTable(page, { dataViewId: "app-log", query: "" });
  for (const n of [0, 1, 2]) await resultRows(page).nth(n).hover();
  await page.waitForTimeout(500);
  expect(requests).toEqual([]);
  await expect(strip(page)).toHaveCount(0);

  await writeStored(extension.worker, markInRow(e2eConfig(), ["user"]));
  await expect
    .poll(async () => {
      await resultRows(page).nth(1).hover();
      await resultRows(page).nth(0).hover();
      return strip(page).getByRole("link", { name: "User", exact: true }).count();
    })
    .toBe(1);
});

test("keeps the table layout while the strip shows", async ({ context, configure }) => {
  await configure(markInRow(e2eConfig(), ["user", "same-user"]));
  const page = await openTable(await context.newPage(), { dataViewId: "app-log", query: "" });
  await page.locator('[data-test-subj="queryInput"]').hover();
  const before = await cellRects(page);
  await resultRows(page).first().hover();
  await expect(strip(page).getByRole("link", { name: "User", exact: true })).toBeVisible();
  expect(await cellRects(page)).toEqual(before);
});

test("fetches rows in batches and never twice", async ({ context, configure }) => {
  await configure(markInRow(e2eConfig(), ["user"]));
  const page = await context.newPage();
  const requests = extensionRequests(page);
  await openTable(page, { dataViewId: "all-logs", query: "" });
  for (let step = 0; step < 5; step++) {
    await resultRows(page).last().scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
  }
  await expect.poll(() => requests.filter((request) => prefetchIds(request.body)).length).toBeGreaterThan(0);
  const batches = requests.flatMap((request) => prefetchIds(request.body) ?? []).length;
  const ids = requests.map((request) => prefetchIds(request.body)).filter((list): list is string[] => list !== undefined);
  for (const list of ids) expect(list.length).toBeLessThanOrEqual(50);
  expect(new Set(ids.flat()).size).toBe(batches);
});

test("fails closed without the page-context script (SC-007)", async ({ context, configure, extension }) => {
  test.skip(stack.major !== 7, "only 7.17 needs the page-context script");
  await configure(markInRow(e2eConfig(), ["user"]));
  // After configure: writing settings registers both scripts again.
  await unregisterScript(extension.worker, "kibanatool-bridge");
  const page = await openTable(await context.newPage(), APP_004);
  await resultRows(page).first().hover();
  await page.waitForTimeout(1000);
  await expect(strip(page).locator("a")).toHaveCount(0);
  const { detail } = await openDoc(context, APP_004);
  await expect(detail.locator("kibanatool-bar .kt-menu")).toBeVisible();
});

test("works in the 9.x Observability view", async ({ context, configure }) => {
  test.skip(stack.major !== 9, "the Observability view is 9.x only");
  await configure(markInRow(e2eConfig(), ["user"]));
  const page = await openTable(await context.newPage(), { space: "obs", dataViewId: "obs-logs", query: "" });
  await resultRows(page).first().hover();
  await expect(strip(page).getByRole("link", { name: "User", exact: true })).toHaveAttribute("href", /^https:\/\/admin\.example\.com\/users\/2000\d\d$/);
});
