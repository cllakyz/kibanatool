// Actions (spec §9): the list and the editor in a modal dialog (spec-kit 005).
import { useEffect, useState } from "react";
import { type Action, type Config, appliesTo, appliesToAll } from "../../src/core/config";
import { t } from "../../src/i18n";
import { newAction, variableWarnings, withAction, withoutAction } from "../../src/options/model";
import { ActionEditor } from "./ActionEditor";
import { Feedback, KindBadge, type SectionProps, VariableWarnings, useSubmit } from "./feedback";

function environmentNames(config: Config, action: Action): string {
  if (appliesToAll(action)) return t("optionsAllEnvironments");
  return config.environments
    .filter((environment) => appliesTo(action, environment.id))
    .map((environment) => environment.name)
    .join(", ");
}

/** A row's second line: the URL template, or the query and the time window. */
function template(action: Action): string {
  if (action.kind === "link") return action.urlTemplate;
  const query = action.queryTemplate === "" ? t("optionsPreviewEmptyQuery") : action.queryTemplate;
  return action.windowMinutes === undefined ? query : `${query} · ${t("optionsPreviewWindow", String(action.windowMinutes))}`;
}

export function ActionsSection({ config, onSave }: SectionProps) {
  const [draft, setDraft] = useState<Action | null>(null);
  const { errors, saved, submit, fail } = useSubmit(onSave);

  // Back or Forward leaves the tab: drop the draft, as Cancel does, so no hidden modal keeps the page inert and no
  // stale save error shows without its dialog (spec 005).
  useEffect(() => {
    window.addEventListener("hashchange", cancel);
    return () => window.removeEventListener("hashchange", cancel);
  }, []);

  function save(): void {
    if (!draft) return;
    void submit(withAction(config, draft)).then((ok) => {
      if (ok) setDraft(null);
    });
  }

  function cancel(): void {
    setDraft(null);
    fail([]);
  }

  return (
    <section aria-labelledby="actions-title">
      <div className="panel-head">
        <h2 id="actions-title">
          {t("optionsActions")} <span className="badge">{config.actions.length}</span>
        </h2>
        <div className="panel-actions">
          <button type="button" className="primary" onClick={() => setDraft(newAction("link"))}>
            {t("optionsAddLink")}
          </button>
          <button type="button" onClick={() => setDraft(newAction("discover"))}>
            {t("optionsAddDiscover")}
          </button>
        </div>
      </div>
      {config.actions.length === 0 ? (
        <p className="empty">{t("optionsEmptyActions")}</p>
      ) : (
        <ul className="items">
          {config.actions.map((action) => (
            <li className="item" key={action.id}>
              <div className="item-main">
                <div className="item-title">
                  <span className="name">{action.label}</span>
                  <KindBadge kind={action.kind} />
                  {action.showInRow && <span className="badge">{t("optionsShowInRow")}</span>}
                  <span className="muted">{environmentNames(config, action)}</span>
                </div>
                <div className="item-sub">{template(action)}</div>
                <div className="item-warnings">
                  <VariableWarnings warnings={variableWarnings(config.environments, action)} />
                </div>
              </div>
              <div className="item-actions">
                {!action.enabled && <span className="pending">{t("optionsDisabled")}</span>}
                <button type="button" aria-label={`${t("optionsEdit")}: ${action.label}`} onClick={() => setDraft(action)}>
                  {t("optionsEdit")}
                </button>
                <button
                  type="button"
                  className="link"
                  aria-label={`${t("optionsRemove")}: ${action.label}`}
                  onClick={() => void submit(withoutAction(config, action.id))}
                >
                  {t("optionsRemove")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {draft && (
        <ActionEditor
          key={draft.id}
          action={draft}
          environments={config.environments}
          errors={errors}
          onChange={setDraft}
          onSave={save}
          onCancel={cancel}
        />
      )}
      <Feedback errors={draft ? [] : errors} saved={saved} />
    </section>
  );
}
