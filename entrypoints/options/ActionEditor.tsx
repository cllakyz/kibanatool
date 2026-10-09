// Form editor for one action, with a live preview against a pasted sample log (spec §9).
import { type FormEvent, useState } from "react";
import type { ConditionOp } from "../../src/core/conditions";
import type { Action, Environment } from "../../src/core/config";
import type { HiddenReason } from "../../src/core/link-actions";
import { type MessageKey, t } from "../../src/i18n";
import { describePassive } from "../../src/passive-text";
import { type SampleResult, parseSample, previewAction } from "../../src/options/preview";

const OPERATORS: Record<ConditionOp, MessageKey> = {
  exists: "optionsOpExists",
  equals: "optionsOpEquals",
  notEquals: "optionsOpNotEquals",
  contains: "optionsOpContains",
  startsWith: "optionsOpStartsWith",
};

const HIDDEN: Record<HiddenReason, MessageKey> = {
  disabled: "optionsHiddenDisabled",
  conditions: "optionsHiddenConditions",
  missingValue: "optionsHiddenMissingValue",
  invalidUrl: "optionsHiddenInvalidUrl",
};

type Condition = Action["conditions"][number];

export interface ActionEditorProps {
  action: Action;
  environments: Environment[];
  onChange: (action: Action) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function ActionEditor({ action, environments, onChange, onSave, onCancel }: ActionEditorProps) {
  const [sample, setSample] = useState("");
  const [previewEnvironmentId, setPreviewEnvironmentId] = useState<string | undefined>(undefined);
  const applicable =
    action.environmentIds.length === 0 ? environments : environments.filter((environment) => action.environmentIds.includes(environment.id));
  const previewEnvironment = applicable.find((environment) => environment.id === previewEnvironmentId) ?? applicable[0];
  const update = (patch: Partial<Action>): void => onChange({ ...action, ...patch } as Action);

  function setCondition(index: number, patch: Partial<Condition>): void {
    update({ conditions: action.conditions.map((condition, i) => (i === index ? { ...condition, ...patch } : condition)) });
  }

  function toggleEnvironment(id: string, checked: boolean): void {
    update({ environmentIds: checked ? [...action.environmentIds, id] : action.environmentIds.filter((item) => item !== id) });
  }

  function submit(event: FormEvent): void {
    event.preventDefault();
    onSave();
  }

  return (
    <form className="editor" onSubmit={submit}>
      <label>
        {t("optionsLabel")}
        <input required name="label" value={action.label} onChange={(event) => update({ label: event.target.value })} />
      </label>
      <label className="inline">
        <input type="checkbox" checked={action.enabled} onChange={(event) => update({ enabled: event.target.checked })} />
        {t("optionsEnabled")}
      </label>
      <fieldset>
        <legend>{t("optionsActionEnvironments")}</legend>
        {environments.map((environment) => (
          <label className="inline" key={environment.id}>
            <input
              type="checkbox"
              checked={action.environmentIds.includes(environment.id)}
              onChange={(event) => toggleEnvironment(environment.id, event.target.checked)}
            />
            {environment.name}
          </label>
        ))}
      </fieldset>
      {action.kind === "link" ? (
        <label>
          {t("optionsUrlTemplate")}
          <input required name="urlTemplate" spellCheck={false} value={action.urlTemplate} onChange={(event) => update({ urlTemplate: event.target.value })} />
        </label>
      ) : (
        <>
          <label>
            {t("optionsQueryTemplate")}
            <input spellCheck={false} value={action.queryTemplate} onChange={(event) => update({ queryTemplate: event.target.value })} />
          </label>
          <label>
            {t("optionsDataViewId")}
            <input
              spellCheck={false}
              value={action.dataViewId ?? ""}
              onChange={(event) => update({ dataViewId: event.target.value.trim() || undefined })}
            />
          </label>
          <label>
            {t("optionsWindowMinutes")}
            <input
              type="number"
              min={1}
              max={1440}
              step={1}
              value={action.windowMinutes ?? ""}
              onChange={(event) => update({ windowMinutes: event.target.value === "" ? undefined : Number(event.target.value) })}
            />
          </label>
        </>
      )}
      <fieldset>
        <legend>{t("optionsConditions")}</legend>
        {action.conditions.map((condition, index) => (
          <div className="row" key={index}>
            <label>
              {t("optionsConditionField")}
              <input required spellCheck={false} value={condition.field} onChange={(event) => setCondition(index, { field: event.target.value })} />
            </label>
            <label>
              {t("optionsConditionOp")}
              <select
                value={condition.op}
                onChange={(event) => {
                  const op = event.target.value as ConditionOp;
                  setCondition(index, { op, value: op === "exists" ? undefined : (condition.value ?? "") });
                }}
              >
                {(Object.keys(OPERATORS) as ConditionOp[]).map((op) => (
                  <option key={op} value={op}>
                    {t(OPERATORS[op])}
                  </option>
                ))}
              </select>
            </label>
            {condition.op !== "exists" && (
              <label>
                {t("optionsConditionValue")}
                <input value={condition.value ?? ""} onChange={(event) => setCondition(index, { value: event.target.value })} />
              </label>
            )}
            <button
              type="button"
              className="link"
              onClick={() => update({ conditions: action.conditions.filter((_, i) => i !== index) })}
            >
              {t("optionsRemove")}
            </button>
          </div>
        ))}
        <button type="button" onClick={() => update({ conditions: [...action.conditions, { field: "", op: "exists" }] })}>
          {t("optionsAddCondition")}
        </button>
      </fieldset>
      <fieldset>
        <legend>{t("optionsPreview")}</legend>
        <label>
          {t("optionsPreviewSample")}
          <textarea rows={6} spellCheck={false} value={sample} onChange={(event) => setSample(event.target.value)} />
        </label>
        {applicable.length > 0 && (
          <label>
            {t("optionsPreviewEnvironment")}
            <select name="previewEnvironment" value={previewEnvironment?.id} onChange={(event) => setPreviewEnvironmentId(event.target.value)}>
              {applicable.map((environment) => (
                <option key={environment.id} value={environment.id}>
                  {environment.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {sample.trim() !== "" && (
          <p className="preview" role="status">
            {describePreview(action, parseSample(sample), previewEnvironment)}
          </p>
        )}
      </fieldset>
      <div className="row">
        <button type="submit">{t("optionsSave")}</button>
        <button type="button" className="link" onClick={onCancel}>
          {t("optionsCancel")}
        </button>
      </div>
    </form>
  );
}

function describePreview(action: Action, sample: SampleResult, environment: Environment | undefined): string {
  if (!sample.ok) return t("optionsPreviewInvalid", sample.error);
  const preview = previewAction(action, sample.fields, environment?.variables ?? {});
  if (!preview.shown) {
    return "passive" in preview
      ? `${t("optionsPreviewPassive")} ${describePassive(preview.passive, environment?.name ?? "")}`
      : t(HIDDEN[preview.reason]);
  }
  if (action.kind === "link") return `${t("optionsPreviewShown")} ${preview.text}`;
  const query = preview.text === "" ? t("optionsPreviewEmptyQuery") : preview.text;
  const range = action.windowMinutes === undefined ? "" : ` · ${t("optionsPreviewWindow", String(action.windowMinutes))}`;
  return `${t("optionsPreviewShown")} ${query}${range}`;
}
