import { expect, test } from "./fixtures";
import { bar, barLinks, detailViews, openDoc } from "./kibana";
import { stack } from "./stack";

test.beforeEach(async ({ configure }) => {
  await configure();
});

// Newest first: app-004 (user 100004), then app-008 (user 100003).
const ERRORS = { dataViewId: "app-log", query: 'level_name:"ERROR"' };

test("7.17: every expanded row has its own bar", async ({ context }) => {
  test.skip(stack.major !== 7, "the legacy table exists only on 7.17");
  const { page } = await openDoc(context, ERRORS);
  await page.locator('[data-test-subj="docTableExpandToggleColumn"]').nth(1).click();
  const rows = detailViews(page);
  await expect(rows).toHaveCount(2);
  await bar(rows.nth(1)).locator(".kt-menu").waitFor();
  expect((await barLinks(rows.nth(0))).Error).toBe("https://errors.example.com/?id=app-004");
  expect((await barLinks(rows.nth(1))).Error).toBe("https://errors.example.com/?id=app-008");
});

test("8.x/9.x: the bar follows the next log in the flyout", async ({ context }) => {
  test.skip(stack.major === 7, "7.17 has no flyout");
  const { detail } = await openDoc(context, ERRORS);
  expect((await barLinks(detail)).Error).toBe("https://errors.example.com/?id=app-004");
  await detail.locator('[data-test-subj="pagination-button-next"]').click();
  await expect.poll(async () => (await barLinks(detail)).Error).toBe("https://errors.example.com/?id=app-008");
  expect((await barLinks(detail)).User).toBe("https://admin.example.com/users/100003");
  await expect(bar(detail)).toHaveCount(1);
});
