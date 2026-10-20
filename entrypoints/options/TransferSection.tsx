// Export and import of the whole settings (spec §8): validate, preview the counts, then replace.
import { type ChangeEvent, useRef, useState } from "react";
import type { Config } from "../../src/core/config";
import { t } from "../../src/i18n";
import { parseImport } from "../../src/options/model";
import { Feedback, type SectionProps, useSubmit } from "./feedback";

export function TransferSection({ onSave, exportValue }: SectionProps & { exportValue: unknown }) {
  const [pending, setPending] = useState<Config | null>(null);
  const picks = useRef(0);
  const { errors, saved, submit, fail } = useSubmit(onSave);

  function exportSettings(): void {
    const link = document.createElement("a");
    link.href = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportValue, null, 2))}`;
    link.download = "kibanatool-settings.json";
    link.click();
  }

  function choose(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    event.target.value = ""; // so choosing the same file again still fires change
    setPending(null);
    const pick = ++picks.current; // a slower, earlier pick must not overwrite the latest one
    if (!file) return;
    file.text().then(
      (text) => {
        if (pick !== picks.current) return;
        const result = parseImport(text);
        if (result.ok) {
          fail([]);
          setPending(result.config);
        } else {
          fail([t("optionsImportErrors"), ...result.errors]);
        }
      },
      (error: unknown) => {
        if (pick === picks.current) fail([String(error)]);
      },
    );
  }

  function replace(): void {
    if (!pending) return;
    void submit({ ok: true, config: pending }).then((ok) => {
      if (ok) setPending(null);
    });
  }

  return (
    <section aria-labelledby="transfer-title">
      <div className="panel-head">
        <h2 id="transfer-title">{t("optionsTransfer")}</h2>
      </div>
      <div className="fields">
        <div className="field-h">
          <div>
            <span className="field-h-title">{t("optionsExport")}</span>
            <p className="field-h-help">{t("optionsExportHelp")}</p>
          </div>
          <div className="field-h-control">
            <button type="button" onClick={exportSettings}>
              {t("optionsExport")}
            </button>
          </div>
        </div>
        <div className="field-h">
          <div>
            <label className="field-h-title" htmlFor="import-file">
              {t("optionsImport")}
            </label>
            <p className="field-h-help">{t("optionsImportHelp")}</p>
          </div>
          <div className="field-h-control">
            <input id="import-file" type="file" accept="application/json,.json" onChange={choose} />
            {pending && (
              <div className="warning">
                <p>{t("optionsImportPreview", String(pending.environments.length), String(pending.actions.length))}</p>
                <div className="row">
                  <button type="button" className="primary" onClick={replace}>
                    {t("optionsImportConfirm")}
                  </button>
                  <button type="button" className="link" onClick={() => setPending(null)}>
                    {t("optionsCancel")}
                  </button>
                </div>
              </div>
            )}
            <Feedback errors={errors} saved={saved} />
          </div>
        </div>
      </div>
    </section>
  );
}
