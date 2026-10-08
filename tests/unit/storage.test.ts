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
  environments: [{ id: "local", name: "Local", kibanaUrl: "http://localhost:9601" }],
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
    const invalid = { ...config, environments: [{ id: "x", name: "X", kibanaUrl: "nope" }] };
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
