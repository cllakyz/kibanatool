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
      <h2 id="transfer-title">{t("optionsTransfer")}</h2>
      <div className="row">
        <button type="button" onClick={exportSettings}>
          {t("optionsExport")}
        </button>
        <label>
          {t("optionsImport")}
          <input type="file" accept="application/json,.json" onChange={choose} />
        </label>
      </div>
      {pending && (
        <div className="warning">
          <p>{t("optionsImportPreview", String(pending.environments.length), String(pending.actions.length))}</p>
          <div className="row">
            <button type="button" onClick={replace}>
              {t("optionsImportConfirm")}
            </button>
            <button type="button" className="link" onClick={() => setPending(null)}>
              {t("optionsCancel")}
            </button>
          </div>
        </div>
      )}
      <Feedback errors={errors} saved={saved} />
    </section>
  );
}
