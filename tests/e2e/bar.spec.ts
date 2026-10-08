import { dataViewIdFromState, readAppState, readGlobalTime } from "../../src/kibana/discover-state";
import { expect, test } from "./fixtures";
import { SEED_TIME, bar, barLinks, followToNewTab, openDoc } from "./kibana";

test.beforeEach(async ({ configure }) => {
  await configure();
});

test("shows link actions built from the raw log, with their conditions", async ({ context }) => {
  const info = await openDoc(context, { dataViewId: "app-log", query: 'extra.uid:"uid-001"' });
  const infoLinks = await barLinks(info.detail);
  expect(infoLinks.User).toBe("https://admin.example.com/users/100001");
  expect(infoLinks).not.toHaveProperty("Error");

  const error = await openDoc(context, { dataViewId: "app-log", query: 'extra.uid:"uid-004"' });
  expect(await barLinks(error.detail)).toMatchObject({
    User: "https://admin.example.com/users/100004",
    Error: "https://errors.example.com/?id=app-004",
  });
});

test("opens a Discover action in a new tab with its data view, query and ±5 minutes", async ({ context }) => {
  const { page, detail } = await openDoc(context, { dataViewId: "app-log", query: 'extra.uid:"uid-001"' });
  const tab = await followToNewTab(page, bar(detail).getByRole("link", { name: "Same user ±5" }));
  // app-001 is the only log of user 100001 between 09:55 and 10:05.
  await expect(tab.locator('[data-test-subj="discoverQueryHits"]')).toHaveText("1");
  const hash = new URL(tab.url()).hash;
  expect(dataViewIdFromState(readAppState(hash))).toBe("app-log");
  expect(readAppState(hash).query).toEqual({ language: "kuery", query: 'user_id:"100001"' });
  expect(readGlobalTime(hash)).toEqual({ from: "2026-01-15T09:55:00.000Z", to: "2026-01-15T10:05:00.000Z" });
});

test("keeps the current time range when the data view has no time field", async ({ context }) => {
  const { detail } = await openDoc(context, { dataViewId: "all-logs", query: 'extra.uid:"uid-001"' });
  const href = (await barLinks(detail))["Same user ±5"] ?? "";
  const hash = href.slice(href.indexOf("#"));
  expect(dataViewIdFromState(readAppState(hash))).toBe("all-logs");
  expect(readAppState(hash).query).toEqual({ language: "kuery", query: 'user_id:"100001"' });
  expect(readGlobalTime(hash)).toEqual(SEED_TIME);
  const windowOnly = bar(detail).locator(".kt-disabled", { hasText: "±5 minutes" });
  await expect(windowOnly).toHaveAttribute("aria-disabled", "true");
  await expect(windowOnly).toHaveAttribute("title", /\S/);
});
