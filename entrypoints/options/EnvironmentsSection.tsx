// Environments (spec §9): each Kibana address with its host permission.
import { type FormEvent, useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { type Config, type Environment, originPattern } from "../../src/core/config";
import { t } from "../../src/i18n";
import { newEnvironment, withEnvironment, withoutEnvironment } from "../../src/options/model";
import { Feedback, type SectionProps, useSubmit } from "./feedback";

async function grantStatus(config: Config): Promise<Record<string, boolean>> {
  const entries = await Promise.all(
    config.environments.map(async (environment) => {
      const granted = await browser.permissions.contains({ origins: [originPattern(environment.kibanaUrl)] });
      return [environment.id, granted] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export function EnvironmentsSection({ config, onSave }: SectionProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [granted, setGranted] = useState<Record<string, boolean>>({});
  const [checks, setChecks] = useState(0);
  const { errors, saved, submit, fail } = useSubmit(onSave);

  useEffect(() => {
    let cancelled = false;
    grantStatus(config).then(
      (status) => {
        if (!cancelled) setGranted(status);
      },
      (error: unknown) => {
        if (!cancelled) fail([t("optionsPermissionError", String(error))]);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [config, checks]);

  // Chrome shows the permission prompt only during the click, so this runs before any await.
  function request(environment: Environment): Promise<void> {
    return browser.permissions.request({ origins: [originPattern(environment.kibanaUrl)] }).then(
      () => undefined,
      (error: unknown) => fail([t("optionsPermissionError", String(error))]),
    );
  }

  function add(event: FormEvent): void {
    event.preventDefault();
    const environment = newEnvironment(name, url);
    const result = withEnvironment(config, environment);
    if (!result.ok) {
      void submit(result);
      return;
    }
    // Saved whether or not access was granted: the environment then waits for access.
    void request(environment)
      .then(() => submit(result))
      .then((ok) => {
        if (ok) {
          setName("");
          setUrl("");
        }
      });
  }

  function grant(environment: Environment): void {
    void request(environment).then(() => setChecks((count) => count + 1));
  }

  return (
    <section aria-labelledby="environments-title">
      <h2 id="environments-title">{t("optionsEnvironments")}</h2>
      <ul className="list">
        {config.environments.map((environment) => (
          <li key={environment.id}>
            <span className="name">{environment.name}</span>
            <code>{environment.kibanaUrl}</code>
            {granted[environment.id] ? (
              <span className="ok">{t("optionsGranted")}</span>
            ) : (
              <>
                <span className="pending">{t("optionsPending")}</span>
                <button type="button" onClick={() => grant(environment)}>
                  {t("optionsGrant")}
                </button>
              </>
            )}
            <button type="button" className="link" onClick={() => void submit(withoutEnvironment(config, environment.id))}>
              {t("optionsRemove")}
            </button>
          </li>
        ))}
      </ul>
      <form className="row" onSubmit={add}>
        <label>
          {t("optionsEnvName")}
          <input required value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          {t("optionsEnvUrl")}
          <input
            required
            type="url"
            placeholder="https://kibana.example.com"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </label>
        <button type="submit">{t("optionsAdd")}</button>
      </form>
      <Feedback errors={errors} saved={saved} />
    </section>
  );
}
