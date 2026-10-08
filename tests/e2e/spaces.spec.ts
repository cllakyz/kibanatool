import { expect, test } from "./fixtures";
import { barLinks, copyFromMenu, openDoc, prefixOf } from "./kibana";
import { stack } from "./stack";

test.beforeEach(async ({ configure }) => {
  await configure();
});

// On 7.17 this is /kibana/s/test: base path and space together (Review Focus 1).
test("works in a space, under the base path on 7.17", async ({ context }) => {
  const { page, detail } = await openDoc(context, { space: "test", dataViewId: "test-app-log", query: 'extra.uid:"uid-001"' });
  expect((await barLinks(detail)).User).toBe("https://admin.example.com/users/100001");
  expect(await copyFromMenu(page, detail, 1)).toBe(`${stack.origin}${prefixOf("test")}/app/discover#/doc/test-app-log/app_log?id=app-001`);
});

test("9.x Observability view: the bar works on the Log overview tab", async ({ context }) => {
  test.skip(stack.major !== 9, "the obs space is seeded only on 9.x");
  const { detail } = await openDoc(context, { space: "obs", dataViewId: "obs-logs", query: 'trace.id:"trace-0001"' });
  await expect(detail.locator('[role="tab"][aria-selected="true"]')).toHaveAttribute(
    "data-test-subj",
    "docViewerTab-doc_view_logs_overview",
  );
  await expect(detail.locator('[data-test-subj="tableDocViewRow-_id-value"]')).toHaveCount(0);
  expect((await barLinks(detail)).User).toBe("https://admin.example.com/users/200001");
});
