// Minimal options page (Plan 1): environments with permission requests and an actions JSON editor.
import { type FormEvent, useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { type Config, type Environment, originPattern } from "../../src/core/config";
import { t } from "../../src/i18n";
import { newEnvironment, withActionsJson, withEnvironment, withoutEnvironment } from "../../src/options/model";
import { createConfigStore } from "../../src/storage";

const store = createConfigStore(browser.storage.local);

async function grantStatus(config: Config): Promise<Record<string, boolean>> {
  const entries = await Promise.all(
    config.environments.map(async (environment) => {
      const granted = await browser.permissions.contains({ origins: [originPattern(environment.kibanaUrl)] });
      return [environment.id, granted] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [granted, setGranted] = useState<Record<string, boolean>>({});
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [actionsText, setActionsText] = useState("[]");
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void store.load().then((loaded) => {
      setConfig(loaded.config);
      setLoadErrors(loaded.errors);
      setActionsText(JSON.stringify(loaded.config.actions, null, 2));
    });
  }, []);

  useEffect(() => {
    if (config) void grantStatus(config).then(setGranted);
  }, [config]);

  if (!config) return <p>{t("optionsLoading")}</p>;
  const current = config;

  async function persist(next: Config): Promise<void> {
    try {
      await store.save(next);
      setConfig(next);
      setErrors([]);
      setNotice(t("optionsSavedReload"));
    } catch (error) {
      setErrors([String(error)]);
    }
  }

  // Chrome only shows the permission prompt during a user gesture, so call this before any await.
  function requestAccess(environment: Environment): Promise<boolean> {
    return browser.permissions.request({ origins: [originPattern(environment.kibanaUrl)] });
  }

  function addEnvironment(event: FormEvent): void {
    event.preventDefault();
    const environment = newEnvironment(name, url);
    const result = withEnvironment(current, environment);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    void requestAccess(environment).finally(() => {
      void persist(result.config).then(() => {
        setName("");
        setUrl("");
      });
    });
  }

  function grant(environment: Environment): void {
    void requestAccess(environment).then(() => grantStatus(current).then(setGranted));
  }

  function saveActions(): void {
    const result = withActionsJson(current, actionsText);
    if (result.ok) void persist(result.config);
    else setErrors(result.errors);
  }

  return (
    <main>
      <h1>kibanatool</h1>
      <p className="muted">{t("optionsIntro")}</p>

      {loadErrors.length > 0 && (
        <div className="warning">
          <strong>{t("optionsLoadError")}</strong>
          <ul>
            {loadErrors.map((error, index) => (
              <li key={`${index}-${error}`}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {errors.length > 0 && (
        <div className="error">
          <ul>
            {errors.map((error, index) => (
              <li key={`${index}-${error}`}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {notice && <div className="notice">{notice}</div>}

      <section>
        <h2>{t("optionsEnvironments")}</h2>
        <ul className="environments">
          {current.environments.map((environment) => (
            <li key={environment.id}>
              <span className="env-name">{environment.name}</span>
              <code>{environment.kibanaUrl}</code>
              {granted[environment.id] ? (
                <span className="ok">{t("optionsGranted")}</span>
              ) : (
                <button type="button" onClick={() => grant(environment)}>
                  {t("optionsGrant")}
                </button>
              )}
              <button
                type="button"
                className="link"
                onClick={() => void persist(withoutEnvironment(current, environment.id))}
              >
                {t("optionsRemove")}
              </button>
            </li>
          ))}
        </ul>
        <form className="row" onSubmit={addEnvironment}>
          <input required placeholder={t("optionsEnvName")} value={name} onChange={(event) => setName(event.target.value)} />
          <input
            required
            type="url"
            placeholder="https://kibana.example.com"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
          <button type="submit">{t("optionsAdd")}</button>
        </form>
      </section>

      <section>
        <h2>{t("optionsActions")}</h2>
        <p className="muted">{t("optionsActionsHelp")}</p>
        <textarea spellCheck={false} rows={18} value={actionsText} onChange={(event) => setActionsText(event.target.value)} />
        <button type="button" onClick={saveActions}>
          {t("optionsSave")}
        </button>
      </section>
    </main>
  );
}
