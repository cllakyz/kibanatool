// Options page (spec §9; spec-kit 005): five tabs, one per section: environments, variables, actions, copy and
// masking, export and import. Each tab has its own address (#<id>).
import { type ReactNode, useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { type Config, emptyConfig } from "../../src/core/config";
import { type MessageKey, t } from "../../src/i18n";
import { unusedOrigins } from "../../src/options/model";
import { createConfigStore } from "../../src/storage";
import { iconPaths } from "../../src/toolbar-icon";
import { ActionsSection } from "./ActionsSection";
import { CopySection } from "./CopySection";
import { EnvironmentsSection } from "./EnvironmentsSection";
import { TransferSection } from "./TransferSection";
import { VariablesSection } from "./VariablesSection";

const store = createConfigStore(browser.storage.local);

const TABS = [
  { id: "environments", title: "optionsEnvironments", intro: "optionsIntro" },
  { id: "variables", title: "optionsVariables", intro: "optionsVariablesHelp" },
  { id: "actions", title: "optionsActions", intro: "optionsActionsHelp" },
  { id: "copy", title: "optionsCopy" },
  { id: "transfer", title: "optionsTransfer" },
] as const satisfies readonly { id: string; title: MessageKey; intro?: MessageKey }[];

type Tab = (typeof TABS)[number];

/** The tab the address names; an empty or unknown hash opens the first one (spec 005 FR-002). */
function tabOf(hash: string): Tab {
  return TABS.find((tab) => `#${tab.id}` === hash) ?? TABS[0];
}

export function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  // A corrupt stored value: "Export" saves it as is until a save replaces it, so it can be fixed by hand.
  const [invalid, setInvalid] = useState<unknown>(undefined);
  const [tab, setTab] = useState(() => tabOf(location.hash));

  useEffect(() => {
    const follow = (): void => setTab(tabOf(location.hash));
    window.addEventListener("hashchange", follow);
    return () => window.removeEventListener("hashchange", follow);
  }, []);

  useEffect(() => {
    store.load().then(
      (loaded) => {
        setConfig(loaded.config);
        setLoadErrors(loaded.errors);
        setInvalid(loaded.invalid);
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
    setInvalid(undefined);
    try {
      const unused = unusedOrigins((await browser.permissions.getAll()).origins ?? [], next);
      if (unused.length > 0) await browser.permissions.remove({ origins: unused });
      return [];
    } catch (error) {
      return [t("optionsPermissionError", String(error))];
    }
  }

  const props = { config: current, onSave: save };
  // Every section stays mounted, so a hidden tab keeps its unsaved edits (spec 005 FR-004).
  const panel = (id: Tab["id"], section: ReactNode) => <div hidden={tab.id !== id}>{section}</div>;
  return (
    <>
      <header className="nav">
        <a className="nav-brand" href="#environments">
          <picture>
            <source media="(prefers-color-scheme: dark)" srcSet={iconPaths(true)["48"]} />
            <img src={iconPaths(false)["48"]} alt="" width={24} height={24} />
          </picture>
          kibanatool
        </a>
        <nav className="nav-tabs" aria-label={t("optionsNavLabel")}>
          {TABS.map((item) => (
            <a key={item.id} className="tab" href={`#${item.id}`} aria-current={item.id === tab.id ? "page" : undefined}>
              {t(item.title)}
            </a>
          ))}
        </nav>
        <span className="nav-version">v{browser.runtime.getManifest().version}</span>
      </header>
      <main>
        <h1>{t(tab.title)}</h1>
        {"intro" in tab && (
          <div className="callout">
            <p>{t(tab.intro)}</p>
          </div>
        )}
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
        {panel("environments", <EnvironmentsSection {...props} />)}
        {panel("variables", <VariablesSection {...props} />)}
        {panel("actions", <ActionsSection {...props} />)}
        {panel("copy", <CopySection {...props} />)}
        {panel("transfer", <TransferSection {...props} exportValue={invalid ?? current} />)}
      </main>
    </>
  );
}
