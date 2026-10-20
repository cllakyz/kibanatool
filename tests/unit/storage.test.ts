import { describe, expect, it, vi } from "vitest";
import { type Config, emptyConfig } from "../../src/core/config";
import { CONFIG_KEY, THEME_KEY, createConfigStore, loadThemeChoice, saveThemeChoice } from "../../src/storage";

function fakeArea(initial: Record<string, unknown> = {}) {
  const data = new Map(Object.entries(initial));
  const listeners: Array<(changes: Record<string, unknown>) => void> = [];
  return {
    data,
    onChanged: {
      addListener(callback: (changes: Record<string, unknown>) => void) {
        listeners.push(callback);
      },
    },
    /** What chrome.storage.local.onChanged would report. */
    emit(changes: Record<string, unknown>) {
      for (const listener of listeners) listener(changes);
    },
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

describe("onChange", () => {
  // The area's own onChanged event never reports other storage areas, so there is no area check.
  it("calls the listener only when the config key changes", () => {
    const area = fakeArea();
    let calls = 0;
    createConfigStore(area).onChange(() => calls++);
    area.emit({ [CONFIG_KEY]: {} });
    area.emit({ other: {} });
    expect(calls).toBe(1);
  });
});

describe("theme choice (spec 006)", () => {
  // A stand-in for the page's localStorage.
  function webArea(initial?: string) {
    const data = new Map<string, string>(initial === undefined ? [] : [[THEME_KEY, initial]]);
    return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value) };
  }
  const throwing = () => {
    throw new Error("storage blocked");
  };

  it.each(["system", "light", "dark"] as const)("reads a stored %s back", (choice) => {
    expect(loadThemeChoice(webArea(choice))).toBe(choice);
  });

  it("gives System for a missing or unknown value", () => {
    expect(loadThemeChoice(webArea())).toBe("system");
    expect(loadThemeChoice(webArea("blue"))).toBe("system");
  });

  it("gives System when the storage can't be read", () => {
    vi.spyOn(console, "debug").mockImplementation(() => {});
    expect(loadThemeChoice({ getItem: throwing })).toBe("system");
  });

  it("writes the choice under its key", () => {
    const area = webArea();
    saveThemeChoice(area, "dark");
    expect(area.data.get(THEME_KEY)).toBe("dark");
  });

  it("survives a storage that can't be written", () => {
    vi.spyOn(console, "debug").mockImplementation(() => {});
    expect(() => saveThemeChoice({ setItem: throwing }, "dark")).not.toThrow();
  });
});
