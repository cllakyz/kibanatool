// Actions (spec §9): the list and a form editor with a live preview.
import { useState } from "react";
import type { Action, Config } from "../../src/core/config";
import { t } from "../../src/i18n";
import { newAction, withAction, withoutAction } from "../../src/options/model";
import { ActionEditor } from "./ActionEditor";
import { Feedback, type SectionProps, useSubmit } from "./feedback";

function environmentNames(config: Config, action: Action): string {
  if (action.environmentIds.length === 0) return t("optionsAllEnvironments");
  return config.environments
    .filter((environment) => action.environmentIds.includes(environment.id))
    .map((environment) => environment.name)
    .join(", ");
}

export function ActionsSection({ config, onSave }: SectionProps) {
  const [draft, setDraft] = useState<Action | null>(null);
  const { errors, saved, submit } = useSubmit(onSave);

  function save(): void {
    if (!draft) return;
    void submit(withAction(config, draft)).then((ok) => {
      if (ok) setDraft(null);
    });
  }

  // One draft at a time: opening another one would drop its unsaved changes.
  const editing = draft !== null;
  return (
    <section aria-labelledby="actions-title">
      <h2 id="actions-title">{t("optionsActions")}</h2>
      <p className="muted">{t("optionsActionsHelp")}</p>
      <ul className="list">
        {config.actions.map((action) => (
          <li key={action.id}>
            <span className="name">{action.label}</span>
            <span className="badge">{t(action.kind === "link" ? "optionsKindLink" : "optionsKindDiscover")}</span>
            {!action.enabled && <span className="pending">{t("optionsDisabled")}</span>}
            <span className="muted">{environmentNames(config, action)}</span>
            <button type="button" disabled={editing} aria-label={`${t("optionsEdit")}: ${action.label}`} onClick={() => setDraft(action)}>
              {t("optionsEdit")}
            </button>
            <button
              type="button"
              className="link"
              aria-label={`${t("optionsRemove")}: ${action.label}`}
              onClick={() => {
                if (draft?.id === action.id) setDraft(null);
                void submit(withoutAction(config, action.id));
              }}
            >
              {t("optionsRemove")}
            </button>
          </li>
        ))}
      </ul>
      <div className="row">
        <button type="button" disabled={editing} onClick={() => setDraft(newAction("link"))}>
          {t("optionsAddLink")}
        </button>
        <button type="button" disabled={editing} onClick={() => setDraft(newAction("discover"))}>
          {t("optionsAddDiscover")}
        </button>
      </div>
      {draft && (
        <ActionEditor
          key={draft.id}
          action={draft}
          environments={config.environments}
          onChange={setDraft}
          onSave={save}
          onCancel={() => setDraft(null)}
        />
      )}
      <Feedback errors={errors} saved={saved} />
    </section>
  );
}
