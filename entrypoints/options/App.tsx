// Options page (spec §9): environments, actions, copy and masking, export and import.
import { useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { type Config, emptyConfig } from "../../src/core/config";
import { t } from "../../src/i18n";
import { unusedOrigins } from "../../src/options/model";
import { createConfigStore } from "../../src/storage";
import { ActionsSection } from "./ActionsSection";
import { CopySection } from "./CopySection";
import { EnvironmentsSection } from "./EnvironmentsSection";
import { TransferSection } from "./TransferSection";

const store = createConfigStore(browser.storage.local);

export function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);

  useEffect(() => {
    store.load().then(
      (loaded) => {
        setConfig(loaded.config);
        setLoadErrors(loaded.errors);
      },
      (error: unknown) => {
        setConfig(emptyConfig());
        setLoadErrors([String(error)]);
      },
    );
  }, []);

  if (!config) return <p>{t("optionsLoading")}</p>;
  const current = config;

  /** Saves, then drops host permissions that no environment needs any more. */
  async function save(next: Config): Promise<string[]> {
    try {
      await store.save(next);
    } catch (error) {
      return [String(error)];
    }
    setConfig(next);
    setLoadErrors([]);
    const unused = unusedOrigins(current, next);
    if (unused.length === 0) return [];
    try {
      await browser.permissions.remove({ origins: unused });
      return [];
    } catch (error) {
      return [t("optionsPermissionError", String(error))];
    }
  }

  const props = { config: current, onSave: save };
  return (
    <main>
      <h1>kibanatool</h1>
      <p className="muted">{t("optionsIntro")}</p>
      {loadErrors.length > 0 && (
        <div className="warning" role="alert">
          <strong>{t("optionsLoadError")}</strong>
          <ul>
            {loadErrors.map((error, index) => (
              <li key={`${index}-${error}`}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      <EnvironmentsSection {...props} />
      <ActionsSection {...props} />
      <CopySection {...props} />
      <TransferSection {...props} />
    </main>
  );
}
