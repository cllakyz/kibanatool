// Plan 4: {env.…} variables and Discover targets chosen by name, on 7.17, 8.19 and 9.5.
import type { Config } from "../../src/core/config";
import { dataViewIdFromState, readAppState } from "../../src/kibana/discover-state";
import { e2eConfig, expect, test } from "./fixtures";
import { bar, barLinks, openDoc } from "./kibana";
import { stack } from "./stack";

/** e2eConfig plus a variable in a link, one that is never set, and Discover targets by name. */
function variablesConfig(): Config {
  const config = e2eConfig();
  const shared = { enabled: true, environmentIds: [], conditions: [] };
  config.environments[0]!.variables = { adminUrl: "https://admin.example.com" };
  config.actions.push(
    { ...shared, id: "var-user", kind: "link", label: "Var user", urlTemplate: "{env.adminUrl}/users/{user_id}" },
    { ...shared, id: "var-missing", kind: "link", label: "Var missing", urlTemplate: "{env.missingUrl}/users/{user_id}" },
    { ...shared, id: "by-pattern", kind: "discover", label: "By pattern", queryTemplate: "user_id:{user_id}", dataViewName: "*_log" },
    { ...shared, id: "by-title", kind: "discover", label: "By title", queryTemplate: "user_id:{user_id}", dataViewName: "app_log" },
    { ...shared, id: "by-display-name", kind: "discover", label: "By display name", queryTemplate: "", dataViewName: "App logs" },
    { ...shared, id: "unknown-name", kind: "discover", label: "Unknown name", queryTemplate: "", dataViewName: "no_such_view" },
  );
  return config;
}

/** The data view a bar link opens. */
function targetOf(href: string | undefined): string | undefined {
  const url = href ?? "";
  return dataViewIdFromState(readAppState(url.slice(url.indexOf("#"))));
}

test.beforeEach(async ({ configure }) => {
  await configure(variablesConfig());
});

test("fills {env.…} from the environment and greys out a link whose variable is not set", async ({ context }) => {
  const { detail } = await openDoc(context, { dataViewId: "app-log", query: 'extra.uid:"uid-001"' });
  expect((await barLinks(detail))["Var user"]).toBe("https://admin.example.com/users/100001");
  const missing = bar(detail).locator(".kt-disabled", { hasText: "Var missing" });
  await expect(missing).toHaveAttribute("aria-disabled", "true");
  await expect(missing).toHaveAttribute("title", /missingUrl/);
});

test("opens a Discover action on the data view it names", async ({ context }) => {
  const { detail } = await openDoc(context, { dataViewId: "app-log", query: 'extra.uid:"uid-001"' });
  const links = await barLinks(detail);
  expect(targetOf(links["By pattern"])).toBe("all-logs");
  await expect(bar(detail).locator(".kt-disabled", { hasText: "Unknown name" })).toHaveAttribute("title", /no_such_view/);
  if (stack.major === 7) {
    // 7.17 has no display names: app_log is one data view, "App logs" none.
    expect(targetOf(links["By title"])).toBe("app-log");
    await expect(bar(detail).locator(".kt-disabled", { hasText: "By display name" })).toHaveAttribute("title", /App logs/);
  } else {
    expect(targetOf(links["By display name"])).toBe("app-log-named");
    // app-log and app-log-named both have the index pattern app_log.
    const ambiguous = bar(detail).locator(".kt-disabled", { hasText: "By title" });
    await expect(ambiguous).toHaveAttribute("title", /app_log/);
    await expect(ambiguous).toHaveAttribute("title", /2/);
  }
});

test("looks the name up in the open space", async ({ context }) => {
  const { detail } = await openDoc(context, { space: "test", dataViewId: "test-app-log", query: 'extra.uid:"uid-001"' });
  expect(targetOf((await barLinks(detail))["By title"])).toBe("test-app-log");
});
