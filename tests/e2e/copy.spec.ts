import { resolveDatemath } from "../../src/core/datemath";
import { readAppState, readGlobalTime } from "../../src/kibana/discover-state";
import { expect, test } from "./fixtures";
import { bar, copyFromMenu, openDoc, prefixOf } from "./kibana";
import { stack } from "./stack";

test.beforeEach(async ({ configure }) => {
  await configure();
});

const APP_001 = { dataViewId: "app-log", query: 'extra.uid:"uid-001"' };
const APP_002 = { dataViewId: "app-log", query: 'extra.uid:"uid-002"' };
// Plan 7: Symfony-shaped request logs (docker/seed.mjs); "Copy as cURL" is menu item 2 there.
const APP_031 = { dataViewId: "app-log", query: 'extra.uid:"uid-031"' };
const APP_032 = { dataViewId: "app-log", query: 'extra.uid:"uid-032"' };
// app-002's context.request (PAYMENT_XML, values masked) and context.response (PAYMENT_RESPONSE_XML) as JSON (docker/seed.mjs).
const REQUEST = { Envelope: { Body: { pay: { identitynumber: "***", iban: "***", gsm: "***", card: "***", amount: "150" } } } };
const RESPONSE = {
  Envelope: {
    Body: {
      Result: {
        "@code": "00",
        Bet: [{ "@Id": "7", "@Type": "S", Sel: "A" }, { "@Id": "8", "@Type": "S" }],
        Amount: { "@currency": "TRY", "#text": "150" },
        Payload: { race: { runId: "42" } },
      },
    },
  },
};
/** A value as the Markdown copy writes it inside a field's json block. */
const jsonBlock = (value: unknown): string => JSON.stringify(value, null, 2).replace(/^/gm, "  ");
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

test("writes XML values as masked json blocks in the Markdown copy", async ({ context }) => {
  // Plan 5 spec §5 and Plan 6 spec §5.4: the ID, IBAN, mobile and card numbers inside PAYMENT_XML are masked.
  const { page, detail } = await openDoc(context, APP_002);
  const markdown = await copyFromMenu(page, detail, 0);
  expect(markdown).toContain(`- \`context.request\`:\n  \`\`\`json\n${jsonBlock(REQUEST)}\n  \`\`\``);
  expect(markdown).toContain(`- \`context.response\`:\n  \`\`\`json\n${jsonBlock(RESPONSE)}\n  \`\`\``);
});

test("copies the log as JSON with its JSON and XML text expanded and masked", async ({ context }) => {
  // Plan 6 spec §6.
  const { page, detail } = await openDoc(context, APP_002);
  const copied = JSON.parse(await copyFromMenu(page, detail, 1));
  expect(Object.keys(copied)).toEqual(["_index", "_id", "_source"]);
  expect(copied._index).toBe("app_log");
  expect(copied._id).toBe("app-002");
  expect(copied._source.context.request).toEqual(REQUEST);
  expect(copied._source.context.response).toEqual(RESPONSE);
  expect(copied._source.context.headers).toEqual({ "user-agent": "dev/1.0", authorization: "***" });
});

test("copies a form request as a cURL command with proxy headers dropped and values masked", async ({ context }) => {
  // Plan 7 spec §5: query and form body in http_build_query form, cookie, _token and the mobile number masked.
  const { page, detail } = await openDoc(context, APP_031);
  expect(await copyFromMenu(page, detail, 2)).toBe(
    [
      "curl 'https://backoffice.example.com/player/search?page=2&filter[status]=active'",
      "--globoff",
      "-H 'user-agent: dev/1.0'",
      "-H 'accept: text/html'",
      "-H 'content-type: application/x-www-form-urlencoded'",
      "-H 'cookie: ***'",
      "-H 'origin: https://backoffice.example.com'",
      "--data-raw 'searchForm[email]=dev%40example.com&searchForm[phone]=***&searchForm[note]=Ali'\\''nin%20%3Cb%3Enotu%3C%2Fb%3E&_token=***'",
      "--compressed",
    ].join(" \\\n  "),
  );
});

test("copies a JSON request as a cURL command, keeping JSON text inside the body as text", async ({ context }) => {
  const { page, detail } = await openDoc(context, APP_032);
  expect(await copyFromMenu(page, detail, 2)).toBe(
    [
      "curl 'https://api.example.com/v1/player/password'",
      "-H 'user-agent: app/2.0'",
      "-H 'accept: application/json'",
      "-H 'content-type: application/json'",
      "-H 'authorization: ***'",
      "-H 'platform-token: ***'",
      `--data-raw '{"oldPassword":"***","newPassword":"***","note":"Ali'\\''nin şifresi","settings":"{\\"lang\\":\\"tr\\"}"}'`,
      "--compressed",
    ].join(" \\\n  "),
  );
  // The other items move down one: the log link is now item 3.
  await expect(bar(detail).getByRole("status")).toBeHidden(); // the next copy's notice must be its own
  expect(await copyFromMenu(page, detail, 3)).toBe(`${stack.origin}${prefixOf()}/app/discover#/doc/app-log/app_log?id=app-032`);
});

test("copies the log link, and the link opens the same log", async ({ context }) => {
  const { page, detail } = await openDoc(context, APP_001);
  expect(await copyFromMenu(page, detail, 2)).toBe(DOC_LINK);
  const doc = await context.newPage();
  await doc.goto(DOC_LINK);
  await expect(doc.getByText("app-001", { exact: true }).first()).toBeVisible({ timeout: 90_000 });
});

test("copies the view with its relative time range made absolute", async ({ context }) => {
  const { page, detail } = await openDoc(context, { ...APP_001, time: { from: "now-5y", to: "now" } });
  const before = Date.now();
  const url = await copyFromMenu(page, detail, 3);
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
  await expect(items.nth(3)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(items.first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(items).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(detail).toBeVisible(); // Escape stayed in the bar: Kibana kept the row or flyout open
  await trigger.click();
  await expect(items).toHaveCount(4);
  await detail.locator('[data-test-subj="kbnDocViewer"]').click({ position: { x: 5, y: 5 } });
  await expect(items).toHaveCount(0);
});
