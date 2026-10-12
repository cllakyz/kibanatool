// Copy and masking settings (spec §7.4, §7.5; Plan 5 spec §7).
import { useEffect, useState } from "react";
import { VALUE_MASK_KINDS, type ValueMaskKind } from "../../src/core/value-mask";
import { type MessageKey, t } from "../../src/i18n";
import { withCopySettings } from "../../src/options/model";
import { Feedback, type SectionProps, useSubmit } from "./feedback";

const VALUE_MASK_LABELS: Record<ValueMaskKind, MessageKey> = {
  iban: "optionsValueMaskIban",
  tckn: "optionsValueMaskTckn",
  gsm: "optionsValueMaskGsm",
  card: "optionsValueMaskCard",
};

export function CopySection({ config, onSave }: SectionProps) {
  const [fields, setFields] = useState("");
  const [patterns, setPatterns] = useState("");
  const [valueMasks, setValueMasks] = useState<ValueMaskKind[]>([]);
  const { errors, saved, submit } = useSubmit(onSave);

  const storedFields = config.copy.markdownFields.join("\n");
  const storedPatterns = config.copy.maskPatterns.join("\n");
  const storedMasks = config.copy.valueMasks.join(" ");

  // Follow the stored values (e.g. after an import) without wiping unsaved edits on unrelated saves.
  useEffect(() => {
    setFields(storedFields);
    setPatterns(storedPatterns);
    setValueMasks(VALUE_MASK_KINDS.filter((kind) => storedMasks.split(" ").includes(kind)));
  }, [storedFields, storedPatterns, storedMasks]);

  function toggle(kind: ValueMaskKind, on: boolean): void {
    setValueMasks((current) => (on ? [...current, kind] : current.filter((item) => item !== kind)));
  }

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
      <fieldset>
        <legend>{t("optionsValueMasks")}</legend>
        {VALUE_MASK_KINDS.map((kind) => (
          <label className="inline" key={kind}>
            <input
              type="checkbox"
              name="valueMask"
              value={kind}
              checked={valueMasks.includes(kind)}
              onChange={(event) => toggle(kind, event.target.checked)}
            />
            {t(VALUE_MASK_LABELS[kind])}
          </label>
        ))}
        <p className="muted">{t("optionsValueMasksHelp")}</p>
      </fieldset>
      <button type="button" className="primary" onClick={() => void submit(withCopySettings(config, fields, patterns, valueMasks))}>
        {t("optionsSave")}
      </button>
      <Feedback errors={errors} saved={saved} />
    </section>
  );
}
