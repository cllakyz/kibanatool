// Environment variables (Plan 4 spec §6): one row per variable, one column per environment.
import { useEffect, useState } from "react";
import { t } from "../../src/i18n";
import { type VariableRow, variableRows, withVariables } from "../../src/options/model";
import { Feedback, type SectionProps, useSubmit } from "./feedback";

export function VariablesSection({ config, onSave }: SectionProps) {
  const stored = JSON.stringify(variableRows(config));
  const [rows, setRows] = useState<VariableRow[]>(() => JSON.parse(stored) as VariableRow[]);
  const { errors, saved, submit } = useSubmit(onSave);

  // Follow the stored table (e.g. after an import) without wiping unsaved edits on unrelated saves.
  useEffect(() => {
    setRows(JSON.parse(stored) as VariableRow[]);
  }, [stored]);

  const setRow = (index: number, row: VariableRow): void => setRows(rows.map((item, i) => (i === index ? row : item)));

  return (
    <section aria-labelledby="variables-title">
      <h2 id="variables-title">{t("optionsVariables")}</h2>
      <p className="muted">{t("optionsVariablesHelp")}</p>
      {config.environments.length === 0 ? (
        <p className="muted">{t("optionsVariablesNoEnvironments")}</p>
      ) : (
        <>
          <div className="table-scroll">
            <table className="variables">
              <thead>
                <tr>
                  <th scope="col">{t("optionsVariableName")}</th>
                  {config.environments.map((environment) => (
                    <th scope="col" key={environment.id}>
                      {environment.name}
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        name="variableName"
                        aria-label={t("optionsVariableName")}
                        spellCheck={false}
                        value={row.name}
                        onChange={(event) => setRow(index, { ...row, name: event.target.value })}
                      />
                    </td>
                    {config.environments.map((environment) => {
                      const value = Object.hasOwn(row.values, environment.id) ? (row.values[environment.id] ?? "") : "";
                      return (
                        <td key={environment.id} className={value.trim() === "" ? "unset" : undefined}>
                          <input
                            data-environment={environment.id}
                            aria-label={`${row.name}: ${environment.name}`}
                            spellCheck={false}
                            value={value}
                            onChange={(event) => setRow(index, { ...row, values: { ...row.values, [environment.id]: event.target.value } })}
                          />
                        </td>
                      );
                    })}
                    <td>
                      <button
                        type="button"
                        className="link"
                        aria-label={`${t("optionsRemove")}: ${row.name}`}
                        onClick={() => setRows(rows.filter((_, i) => i !== index))}
                      >
                        {t("optionsRemove")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row">
            <button type="button" onClick={() => setRows([...rows, { name: "", values: {} }])}>
              {t("optionsAddVariable")}
            </button>
            <button type="button" onClick={() => void submit(withVariables(config, rows))}>
              {t("optionsSave")}
            </button>
          </div>
        </>
      )}
      <Feedback errors={errors} saved={saved} />
    </section>
  );
}
