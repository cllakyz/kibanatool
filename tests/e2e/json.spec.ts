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

test("shows no JSON button for a log without JSON text", async ({ context }) => {
  const { detail } = await openDoc(context, { dataViewId: "logs", query: 'trace.id:"trace-0001"' });
  await expect(bar(detail).locator(".kt-bar > button.kt-ghost")).toHaveCount(0);
});
