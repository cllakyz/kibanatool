import { describe, expect, it } from "vitest";
import example from "../../examples/kibanatool-settings.json";
import exampleTr from "../../examples/kibanatool-settings.tr.json";
import { parseConfig } from "../../src/core/config";

describe.each([
  ["examples/kibanatool-settings.json", example],
  ["examples/kibanatool-settings.tr.json", exampleTr],
])("%s", (_name, file) => {
  it("is valid settings that import without repairs", () => {
    expect(parseConfig(file)).toEqual({ ok: true, config: file });
  });
});

it("the Turkish example differs from the English one only in action labels", () => {
  const withoutLabels = (file: typeof example) => ({ ...file, actions: file.actions.map(({ label: _, ...rest }) => rest) });
  expect(withoutLabels(exampleTr)).toEqual(withoutLabels(example));
  expect(exampleTr.actions.map((a) => a.label)).toEqual([
    "Admin'de kullanıcı", "Sentry", "Jira", "Bu kullanıcının logları", "Tüm loglarda bu kullanıcı", "±5 dakika",
  ]);
});
