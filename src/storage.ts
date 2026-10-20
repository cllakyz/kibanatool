// The single access point to stored configuration (spec §8, §10) and to the options page's theme choice (spec 006).
import { type Config, emptyConfig, parseConfig } from "./core/config";
import { THEME_CHOICES, type ThemeChoice } from "./theme";

export const CONFIG_KEY = "kibanatool.config";

export interface StorageAreaLike {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  /** Changes in this area only (chrome.storage.local.onChanged). */
  onChanged: { addListener(callback: (changes: Record<string, unknown>) => void): void };
}

export interface LoadedConfig {
  config: Config;
  /** Validation errors of a corrupt stored config; the empty config is used then. */
  errors: string[];
  /** The corrupt stored value itself, so the options page can export it for repair. */
  invalid?: unknown;
}

export function createConfigStore(area: StorageAreaLike) {
  return {
    async load(): Promise<LoadedConfig> {
      const stored = (await area.get(CONFIG_KEY))[CONFIG_KEY];
      if (stored === undefined) return { config: emptyConfig(), errors: [] };
      const parsed = parseConfig(stored);
      return parsed.ok ? { config: parsed.config, errors: [] } : { config: emptyConfig(), errors: parsed.errors, invalid: stored };
    },
    async save(config: Config): Promise<void> {
      const parsed = parseConfig(config);
      if (!parsed.ok) throw new Error(`Invalid config: ${parsed.errors.join("; ")}`);
      await area.set({ [CONFIG_KEY]: parsed.config });
    },
    /** Calls `listener` whenever the stored config changes. */
    onChange(listener: () => void): void {
      area.onChanged.addListener((changes) => {
        if (CONFIG_KEY in changes) listener();
      });
    },
  };
}

export const THEME_KEY = "kibanatool.theme";

// The theme choice lives in the extension's localStorage, apart from the settings: it is synchronous, so the
// options page's head script reads it before the first frame, and export and import never carry it (spec 006
// FR-008, FR-010). Anything unreadable or unknown means System (FR-011).
export function loadThemeChoice(area: Pick<Storage, "getItem">): ThemeChoice {
  try {
    const stored = area.getItem(THEME_KEY);
    return THEME_CHOICES.find((choice) => choice === stored) ?? "system";
  } catch (error) {
    console.debug("[kibanatool] theme choice unreadable:", error);
    return "system";
  }
}

export function saveThemeChoice(area: Pick<Storage, "setItem">, choice: ThemeChoice): void {
  try {
    area.setItem(THEME_KEY, choice);
  } catch (error) {
    console.debug("[kibanatool] theme choice not saved:", error);
  }
}
