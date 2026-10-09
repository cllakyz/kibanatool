// Copy and masking settings (spec §7.4, §7.5).
import { useEffect, useState } from "react";
import { t } from "../../src/i18n";
import { withCopySettings } from "../../src/options/model";
import { Feedback, type SectionProps, useSubmit } from "./feedback";

export function CopySection({ config, onSave }: SectionProps) {
  const [fields, setFields] = useState("");
  const [patterns, setPatterns] = useState("");
  const { errors, saved, submit } = useSubmit(onSave);

  const storedFields = config.copy.markdownFields.join("\n");
  const storedPatterns = config.copy.maskPatterns.join("\n");

  // Follow the stored values (e.g. after an import) without wiping unsaved edits on unrelated saves.
  useEffect(() => {
    setFields(storedFields);
    setPatterns(storedPatterns);
  }, [storedFields, storedPatterns]);

  return (
    <section aria-labelledby="copy-title">
      <h2 id="copy-title">{t("optionsCopy")}</h2>
      <label>
        {t("optionsMarkdownFields")}
        <textarea rows={4} spellCheck={false} value={fields} onChange={(event) => setFields(event.target.value)} />
      </label>
      <label>
        {t("optionsMaskPatterns")}
        <textarea rows={5} spellCheck={false} value={patterns} onChange={(event) => setPatterns(event.target.value)} />
      </label>
      <button type="button" className="primary" onClick={() => void submit(withCopySettings(config, fields, patterns))}>
        {t("optionsSave")}
      </button>
      <Feedback errors={errors} saved={saved} />
    </section>
  );
}
