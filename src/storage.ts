// The single access point to stored configuration (spec §8, §10).
import { type Config, emptyConfig, parseConfig } from "./core/config";

export const CONFIG_KEY = "kibanatool.config";

export interface StorageAreaLike {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

export interface LoadedConfig {
  config: Config;
  /** Validation errors of a corrupt stored config; the empty config is used then. */
  errors: string[];
}

export function createConfigStore(area: StorageAreaLike) {
  return {
    async load(): Promise<LoadedConfig> {
      const stored = (await area.get(CONFIG_KEY))[CONFIG_KEY];
      if (stored === undefined) return { config: emptyConfig(), errors: [] };
      const parsed = parseConfig(stored);
      return parsed.ok ? { config: parsed.config, errors: [] } : { config: emptyConfig(), errors: parsed.errors };
    },
    async save(config: Config): Promise<void> {
      const parsed = parseConfig(config);
      if (!parsed.ok) throw new Error(`Invalid config: ${parsed.errors.join("; ")}`);
      await area.set({ [CONFIG_KEY]: parsed.config });
    },
  };
}

export function isConfigChange(changes: Record<string, unknown>, areaName: string): boolean {
  return areaName === "local" && CONFIG_KEY in changes;
}
