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
  // It resolves to the errors to show, so a following save cannot hide them.
  function request(environment: Environment): Promise<string[]> {
    return browser.permissions.request({ origins: [originPattern(environment.kibanaUrl)] }).then(
      () => [],
      (error: unknown) => [t("optionsPermissionError", String(error))],
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
    void request(environment).then(async (permissionErrors) => {
      if (await submit(result)) {
        setName("");
        setUrl("");
      }
      if (permissionErrors.length > 0) fail(permissionErrors);
    });
  }

  function grant(environment: Environment): void {
    void request(environment).then((permissionErrors) => {
      if (permissionErrors.length > 0) fail(permissionErrors);
      setChecks((count) => count + 1);
    });
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
                <button type="button" aria-label={`${t("optionsGrant")}: ${environment.name}`} onClick={() => grant(environment)}>
                  {t("optionsGrant")}
                </button>
              </>
            )}
            <button
              type="button"
              className="link"
              aria-label={`${t("optionsRemove")}: ${environment.name}`}
              onClick={() => void submit(withoutEnvironment(config, environment.id))}>
              {t("optionsRemove")}
            </button>
          </li>
        ))}
      </ul>
      <form className="row" onSubmit={add}>
        <label>
          {t("optionsEnvName")}
          <input required name="name" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          {t("optionsEnvUrl")}
          <input
            required
            name="kibanaUrl"
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
