// Actions (spec §9), edited as a JSON array.
import { useEffect, useState } from "react";
import { t } from "../../src/i18n";
import { withActionsJson } from "../../src/options/model";
import { Feedback, type SectionProps, useSubmit } from "./feedback";

export function ActionsSection({ config, onSave }: SectionProps) {
  const [text, setText] = useState("");
  const { errors, saved, submit } = useSubmit(onSave);

  useEffect(() => setText(JSON.stringify(config.actions, null, 2)), [config.actions]);

  return (
    <section aria-labelledby="actions-title">
      <h2 id="actions-title">{t("optionsActions")}</h2>
      <p className="muted">{t("optionsActionsHelp")}</p>
      <textarea rows={18} spellCheck={false} aria-labelledby="actions-title" value={text} onChange={(event) => setText(event.target.value)} />
      <button type="button" onClick={() => void submit(withActionsJson(config, text))}>
        {t("optionsSave")}
      </button>
      <Feedback errors={errors} saved={saved} />
    </section>
  );
}
