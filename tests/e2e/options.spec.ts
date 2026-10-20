import { readFile } from "node:fs/promises";
import type { BrowserContext } from "@playwright/test";
import type { Config } from "../../src/core/config";
import { e2eConfig, expect, markInRow, readStored, registeredMatches, test, writeStored } from "./fixtures";
import { barLinks, openDoc } from "./kibana";
import { stack } from "./stack";

/** Opens the options page, on a tab when one is given (spec 005 FR-002). */
async function openOptions(context: BrowserContext, extensionId: string, tab?: string) {
  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html${tab ? `#${tab}` : ""}`);
  return options;
}

test("adds an environment and a link action, and the bar shows it", async ({ context, extension }) => {
  const options = await openOptions(context, extension.id);
  const environments = options.locator('section[aria-labelledby="environments-title"]');
  await environments.locator('input[name="name"]').fill("e2e");
  await environments.locator('input[name="kibanaUrl"]').fill(stack.kibana);
  await environments.locator('button[type="submit"]').click();
  // The e2e copy of the extension already holds the permission, so no prompt opens.
  await expect(environments.locator(".items .ok")).toHaveCount(1);

  await options.locator('a.tab[href="#actions"]').click();
  const actions = options.locator('section[aria-labelledby="actions-title"]');
  await actions.locator(".panel-head button").first().click(); // "Add link action"
  await expect(actions.locator("dialog.modal[open]")).toBeVisible(); // one draft at a time: the dialog is modal
  await actions.locator('input[name="label"]').fill("From options");
  await actions.locator('input[name="urlTemplate"]').fill("https://admin.example.com/u/{user_id}");
  await actions.locator('dialog button[type="submit"]').click();
  await expect(actions.locator(".items .name")).toHaveText(["From options"]);
  await expect(actions.locator(".panel-head button").first()).toBeFocused(); // back on the opener (FR-017)

  await expect.poll(() => registeredMatches(extension.worker)).toContain(`${stack.origin}/*`);
  const { detail } = await openDoc(context, { dataViewId: "app-log", query: 'extra.uid:"uid-001"' });
  expect(await barLinks(detail)).toEqual({ "From options": "https://admin.example.com/u/100001" });
});

test("exports the settings and imports the example file", async ({ context, extension, configure }) => {
  await configure();
  const options = await openOptions(context, extension.id, "transfer");
  const transfer = options.locator('section[aria-labelledby="transfer-title"]');
  const [download] = await Promise.all([options.waitForEvent("download"), transfer.locator(".field-h button").click()]);
  expect(JSON.parse(await readFile(await download.path(), "utf8"))).toEqual(e2eConfig());

  const example: unknown = JSON.parse(await readFile("examples/kibanatool-settings.json", "utf8"));
  await transfer.locator('input[type="file"]').setInputFiles("examples/kibanatool-settings.json");
  await transfer.locator(".warning button").first().click(); // "Replace settings"
  // The save then tries to drop the stack's permission, which the e2e copy holds as required: only storage is checked.
  await expect.poll(() => readStored(extension.worker)).toEqual(example);
});

test("turns one value mask off and keeps the others", async ({ context, extension, configure }) => {
  await configure();
  const options = await openOptions(context, extension.id, "copy");
  const copy = options.locator('section[aria-labelledby="copy-title"]');
  const gsm = copy.locator('input[name="valueMask"][value="gsm"]');
  await expect(gsm).toBeChecked();
  await gsm.uncheck();
  await copy.locator("button.primary").click();
  await expect
    .poll(async () => ((await readStored(extension.worker)) as Config).copy.valueMasks)
    .toEqual(["iban", "tckn", "card"]);
});

test("describes the mask patterns field with a note (spec 004 FR-002)", async ({ context, extension, configure }) => {
  await configure();
  const options = await openOptions(context, extension.id, "copy");
  const copy = options.locator('section[aria-labelledby="copy-title"]');
  // The Markdown fields come first, then the mask patterns.
  await expect(copy.locator("textarea").nth(1)).toHaveAccessibleDescription(/\S/);
});

test("opens the tab the address names, keeps it on reload and Back, and keeps unsaved edits (spec 005 FR-002–FR-005)", async ({ context, extension, configure }) => {
  await configure();
  const options = await openOptions(context, extension.id);
  const section = (tab: string) => options.locator(`section[aria-labelledby="${tab}-title"]`);
  const current = options.locator('a.tab[aria-current="page"]');
  await expect(current).toHaveAttribute("href", "#environments");
  await expect(section("environments")).toBeVisible();
  await expect(section("actions")).toBeHidden();

  const actionsTab = options.locator('a.tab[href="#actions"]');
  await actionsTab.click();
  await expect(options).toHaveURL(/#actions$/);
  await expect(current).toHaveAttribute("href", "#actions");
  await expect(options.locator("h1")).toHaveText(await actionsTab.innerText());
  await expect(section("actions")).toBeVisible();
  await expect(section("environments")).toBeHidden();

  await options.reload();
  await expect(current).toHaveAttribute("href", "#actions");
  await options.goBack();
  await expect(current).toHaveAttribute("href", "#environments");
  await options.goto(`chrome-extension://${extension.id}/options.html#foo`);
  await expect(current).toHaveAttribute("href", "#environments");

  // A hidden tab keeps its unsaved edits (FR-004).
  await options.locator('a.tab[href="#copy"]').click();
  const patterns = section("copy").locator("textarea").nth(1);
  await patterns.fill("kept*");
  await options.locator('a.tab[href="#variables"]').click();
  await options.locator('a.tab[href="#copy"]').click();
  await expect(patterns).toHaveValue("kept*");

  const { version } = JSON.parse(await readFile("package.json", "utf8")) as { version: string };
  await expect(options.locator(".nav-version")).toHaveText(`v${version}`);
});

test("edits an action in a dialog: badges, Escape, focus and Back (spec 005 FR-015–FR-017)", async ({ context, extension, configure }) => {
  await configure(markInRow(e2eConfig(), ["user"]));
  const options = await openOptions(context, extension.id);
  await options.locator('a.tab[href="#actions"]').click();
  const actions = options.locator('section[aria-labelledby="actions-title"]');
  // Every row has its kind badge; only the action shown in rows has a second one.
  await expect(actions.locator(".items .badge")).toHaveCount(e2eConfig().actions.length + 1);
  const userRow = actions.locator(".items .item").filter({ has: options.locator(".name").getByText("User", { exact: true }) });
  await expect(userRow.locator(".badge")).toHaveCount(2);

  const edit = userRow.locator(".item-actions button").first();
  await edit.click();
  await expect(actions.locator("dialog.modal[open]")).toBeVisible();
  await options.keyboard.press("Escape");
  await expect(actions.locator("dialog")).toHaveCount(0);
  await expect(edit).toBeFocused();

  // A failed save shows its reasons in the dialog (FR-018).
  await actions.locator(".panel-head button").first().click(); // "Add link action"
  await actions.locator('input[name="label"]').fill("Broken");
  await actions.locator('input[name="urlTemplate"]').fill("not a url");
  await actions.locator('dialog button[type="submit"]').click();
  await expect(actions.locator("dialog .error")).toBeVisible();
  // Back while the dialog is open leaves no modal and no stale error behind (spec 005 edge case).
  await options.goBack();
  await expect(options.locator("dialog[open]")).toHaveCount(0);
  await options.locator('section[aria-labelledby="environments-title"] input[name="name"]').click({ timeout: 5000 });
  await expect(actions.locator(".error")).toHaveCount(0);
});

test("exports a corrupt stored value as it is, so it can be repaired", async ({ context, extension }) => {
  const corrupt = { schemaVersion: 99, environments: "broken" };
  await writeStored(extension.worker, corrupt);
  const options = await openOptions(context, extension.id, "transfer");
  await expect(options.locator('.warning[role="alert"]')).toBeVisible();
  const transfer = options.locator('section[aria-labelledby="transfer-title"]');
  const [download] = await Promise.all([options.waitForEvent("download"), transfer.locator(".field-h button").click()]);
  expect(JSON.parse(await readFile(await download.path(), "utf8"))).toEqual(corrupt);
});

test("edits environment variables in the table and clears the action's warning", async ({ context, extension, configure }) => {
  const config = e2eConfig();
  config.actions.push({
    id: "needs-var",
    kind: "link",
    label: "Needs var",
    enabled: true,
    showInRow: false,
    environmentIds: [],
    conditions: [],
    urlTemplate: "{env.adminUrl}/users/{user_id}",
  });
  await configure(config);
  const options = await openOptions(context, extension.id, "variables");
  // The actions tab is hidden, and toHaveCount counts hidden elements too.
  const actions = options.locator('section[aria-labelledby="actions-title"]');
  await expect(actions.locator('.var-warning[data-variable="adminUrl"]')).toHaveCount(1);

  const variables = options.locator('section[aria-labelledby="variables-title"]');
  await variables.locator(".panel-head button").click(); // "Add variable"
  await variables.locator('input[name="variableName"]').fill("adminUrl");
  await variables.locator('input[data-environment="stack"]').fill(" https://admin.example.com ");
  await variables.locator(".panel-foot button.primary").click(); // "Save"
  await expect
    .poll(async () => ((await readStored(extension.worker)) as Config).environments[0]?.variables)
    .toEqual({ adminUrl: "https://admin.example.com" });
  await expect(actions.locator(".var-warning")).toHaveCount(0);
});

test("keeps the inner space of a target data view name typed in the editor", async ({ context, extension, configure }) => {
  await configure();
  const options = await openOptions(context, extension.id, "actions");
  const actions = options.locator('section[aria-labelledby="actions-title"]');
  await actions.locator(".panel-head button").nth(1).click(); // "Add Discover action"
  await actions.locator('input[name="label"]').fill("Named");
  await expect(actions.locator('input[name="targetKind"][value="name"]')).toBeChecked();
  await actions.locator('input[name="dataView"]').pressSequentially("  App logs ");
  await actions.locator('dialog button[type="submit"]').click();
  await expect
    .poll(async () => ((await readStored(extension.worker)) as Config).actions.find((action) => action.label === "Named"))
    .toMatchObject({ kind: "discover", dataViewName: "App logs" });
});

test("imports a version 1 settings file and stores it as the current version", async ({ context, extension, configure }) => {
  const { environments, copy, ...rest } = e2eConfig();
  await configure({ ...e2eConfig(), actions: [], copy: { ...copy, valueMasks: [] } }); // differs from what the import must produce
  const options = await openOptions(context, extension.id, "transfer");
  const transfer = options.locator('section[aria-labelledby="transfer-title"]');
  const v1 = {
    ...rest,
    schemaVersion: 1,
    actions: rest.actions.map(({ showInRow: _, ...action }) => action),
    environments: environments.map(({ id, name, kibanaUrl }) => ({ id, name, kibanaUrl })),
    copy: { markdownFields: copy.markdownFields, maskPatterns: copy.maskPatterns },
  };
  await transfer
    .locator('input[type="file"]')
    .setInputFiles({ name: "v1.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(v1)) });
  await transfer.locator(".warning button").first().click(); // "Replace settings"
  await expect.poll(() => readStored(extension.worker)).toEqual(e2eConfig());
});
