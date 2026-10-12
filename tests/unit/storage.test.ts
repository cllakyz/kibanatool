import { describe, expect, it } from "vitest";
import { type Config, emptyConfig } from "../../src/core/config";
import { CONFIG_KEY, createConfigStore, isConfigChange } from "../../src/storage";

function fakeArea(initial: Record<string, unknown> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    async get(key: string) {
      return data.has(key) ? { [key]: data.get(key) } : {};
    },
    async set(items: Record<string, unknown>) {
      for (const [key, value] of Object.entries(items)) data.set(key, value);
    },
  };
}

const config: Config = {
  ...emptyConfig(),
  environments: [{ id: "local", name: "Local", kibanaUrl: "http://localhost:9601", variables: {} }],
};

describe("createConfigStore", () => {
  it("loads the empty config when nothing is stored", async () => {
    await expect(createConfigStore(fakeArea()).load()).resolves.toEqual({ config: emptyConfig(), errors: [] });
  });

  it("round-trips a saved config under kibanatool.config", async () => {
    const area = fakeArea();
    const store = createConfigStore(area);
    await store.save(config);
    expect(area.data.get(CONFIG_KEY)).toEqual(config);
    await expect(store.load()).resolves.toEqual({ config, errors: [] });
  });

  it("loads a stored version 1 config as version 3 instead of the empty config", async () => {
    const stored = {
      ...config,
      schemaVersion: 1,
      environments: [{ id: "local", name: "Local", kibanaUrl: "http://localhost:9601" }],
      copy: { markdownFields: config.copy.markdownFields, maskPatterns: config.copy.maskPatterns },
    };
    await expect(createConfigStore(fakeArea({ [CONFIG_KEY]: stored })).load()).resolves.toEqual({ config, errors: [] });
  });

  it("loads a stored version 2 config as version 3 with every value mask on", async () => {
    // Plan 5 Review Focus 1: the team's settings in chrome.storage are version 2 when the update arrives.
    const stored = {
      ...config,
      schemaVersion: 2,
      copy: { markdownFields: ["level"], maskPatterns: ["*iban*"] },
    };
    await expect(createConfigStore(fakeArea({ [CONFIG_KEY]: stored })).load()).resolves.toEqual({
      config: { ...config, copy: { markdownFields: ["level"], maskPatterns: ["*iban*"], valueMasks: ["iban", "tckn", "gsm", "card"] } },
      errors: [],
    });
  });

  it("falls back to the empty config and reports errors for a corrupt stored value", async () => {
    const loaded = await createConfigStore(fakeArea({ [CONFIG_KEY]: { schemaVersion: 99 } })).load();
    expect(loaded.config).toEqual(emptyConfig());
    expect(loaded.errors.length).toBeGreaterThan(0);
  });

  it("keeps a corrupt stored value so it can be exported and repaired", async () => {
    const stored = { schemaVersion: 99, environments: "x" };
    const loaded = await createConfigStore(fakeArea({ [CONFIG_KEY]: stored })).load();
    expect(loaded.invalid).toEqual(stored);
  });

  it("refuses to save an invalid config", async () => {
    const area = fakeArea();
    const invalid = { ...config, environments: [{ id: "x", name: "X", kibanaUrl: "nope", variables: {} }] };
    await expect(createConfigStore(area).save(invalid)).rejects.toThrow(/Invalid config/);
    expect(area.data.has(CONFIG_KEY)).toBe(false);
  });
});

describe("isConfigChange", () => {
  it("is true only for the config key in local storage", () => {
    expect(isConfigChange({ [CONFIG_KEY]: {} }, "local")).toBe(true);
    expect(isConfigChange({ other: {} }, "local")).toBe(false);
    expect(isConfigChange({ [CONFIG_KEY]: {} }, "sync")).toBe(false);
  });
});
