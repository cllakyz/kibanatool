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
      <div className="panel-head">
        <h2 id="copy-title">{t("optionsCopy")}</h2>
      </div>
      <div className="fields">
        <div className="field-h">
          <div>
            <label className="field-h-title" htmlFor="markdown-fields">
              {t("menuCopyMarkdown")}
            </label>
            <p className="field-h-help" id="markdown-fields-help">{t("optionsMarkdownFieldsHelp")}</p>
          </div>
          <div className="field-h-control">
            <textarea
              id="markdown-fields"
              rows={4}
              spellCheck={false}
              aria-describedby="markdown-fields-help"
              value={fields}
              onChange={(event) => setFields(event.target.value)}
            />
          </div>
        </div>
        <div className="field-h">
          <div>
            <label className="field-h-title" htmlFor="mask-patterns">
              {t("optionsMaskPatternsShort")}
            </label>
            <p className="field-h-help" id="mask-patterns-line">{t("optionsMaskPatternsLine")}</p>
          </div>
          <div className="field-h-control">
            <textarea
              id="mask-patterns"
              rows={5}
              spellCheck={false}
              aria-describedby="mask-patterns-line mask-patterns-help"
              value={patterns}
              onChange={(event) => setPatterns(event.target.value)}
            />
            <p className="field-h-help" id="mask-patterns-help">{t("optionsMaskPatternsHelp")}</p>
          </div>
        </div>
        <div className="field-h">
          <div>
            <span className="field-h-title" id="value-masks">
              {t("optionsValueMasks")}
            </span>
            <p className="field-h-help">{t("optionsValueMasksHelp")}</p>
          </div>
          <div className="field-h-control checks" role="group" aria-labelledby="value-masks">
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
          </div>
        </div>
      </div>
      <div className="panel-foot">
        <Feedback errors={errors} saved={saved} />
        <button type="button" className="primary" onClick={() => void submit(withCopySettings(config, fields, patterns, valueMasks))}>
          {t("optionsSave")}
        </button>
      </div>
    </section>
  );
}
