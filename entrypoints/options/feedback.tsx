// Shared pieces of the options page sections: their props and per-section save feedback.
import { useState } from "react";
import type { Config, ParseResult } from "../../src/core/config";
import { t } from "../../src/i18n";

/** Saves an already validated config; resolves to the errors to show (empty on success). */
export type SaveConfig = (next: Config) => Promise<string[]>;

export interface SectionProps {
  config: Config;
  onSave: SaveConfig;
}

/** Keeps errors and the "saved" notice next to the section that caused them. */
export function useSubmit(onSave: SaveConfig) {
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  async function submit(result: ParseResult): Promise<boolean> {
    setSaved(false);
    const next = result.ok ? await onSave(result.config) : result.errors;
    setErrors(next);
    setSaved(next.length === 0);
    return next.length === 0;
  }

  function fail(next: string[]): void {
    setSaved(false);
    setErrors(next);
  }

  return { errors, saved, submit, fail };
}

export function Feedback({ errors, saved }: { errors: string[]; saved: boolean }) {
  if (errors.length > 0) {
    return (
      <div className="error" role="alert">
        <ul>
          {errors.map((error, index) => (
            <li key={`${index}-${error}`}>{error}</li>
          ))}
        </ul>
      </div>
    );
  }
  return saved ? (
    <div className="notice" role="status">
      {t("optionsSavedReload")}
    </div>
  ) : null;
}
