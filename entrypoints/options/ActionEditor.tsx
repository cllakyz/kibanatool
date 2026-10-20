// Form editor for one action, in a modal dialog, with a live preview against a pasted sample log (spec §9; spec 005
// FR-016–FR-018).
import { type FormEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Condition, ConditionOp } from "../../src/core/conditions";
import { type Action, CONDITION_OPS, type DiscoverAction, type Environment, appliesTo } from "../../src/core/config";
import type { HiddenReason } from "../../src/core/passive";
import { type MessageKey, t } from "../../src/i18n";
import { describePassive } from "../../src/passive-text";
import { variableWarnings } from "../../src/options/model";
import { type SampleResult, parseSample, previewAction } from "../../src/options/preview";
import { Feedback, KindBadge, VariableWarnings } from "./feedback";

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

export interface ActionEditorProps {
  action: Action;
  environments: Environment[];
  /** The last save's errors, shown in the dialog because the page behind it is inert. */
  errors: string[];
  onChange: (action: Action) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function ActionEditor({ action, environments, errors, onChange, onSave, onCancel }: ActionEditorProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);
  const [sample, setSample] = useState("");
  const [previewEnvironmentId, setPreviewEnvironmentId] = useState<string | undefined>(undefined);
  const applicable = environments.filter((environment) => appliesTo(action, environment.id));
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

  // Before paint, so the dialog never shows unopened. Every exit unmounts the editor. No close(): its close event
  // would run onCancel after a successful save.
  useLayoutEffect(() => {
    opener.current = document.activeElement;
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, []);
  // A passive cleanup runs once the dialog has left the page, so the page is no longer inert and takes the focus.
  useEffect(
    () => () => {
      if (opener.current instanceof HTMLElement) opener.current.focus();
    },
    [],
  );

  const close = t("jsonClose");
  return (
    <dialog ref={dialog} className="modal" aria-labelledby="action-editor-title" onClose={onCancel}>
      <form onSubmit={submit}>
        <div className="modal-head">
          <h2 id="action-editor-title">{action.label.trim() || t(action.kind === "link" ? "optionsAddLink" : "optionsAddDiscover")}</h2>
          <KindBadge kind={action.kind} />
          <button type="button" className="icon" aria-label={close} title={close} onClick={onCancel}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <label>
            {t("optionsLabel")}
            <input required name="label" value={action.label} onChange={(event) => update({ label: event.target.value })} />
          </label>
          <label className="inline">
            <input type="checkbox" checked={action.enabled} onChange={(event) => update({ enabled: event.target.checked })} />
            {t("optionsEnabled")}
          </label>
          <label className="inline">
            <input type="checkbox" checked={action.showInRow} onChange={(event) => update({ showInRow: event.target.checked })} />
            {t("optionsShowInRow")}
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
              <TargetDataView action={action} update={update} />
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
          <p>
            <VariableWarnings warnings={variableWarnings(environments, action)} />
          </p>
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
                    {CONDITION_OPS.map((op) => (
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
          <Feedback errors={errors} saved={false} />
        </div>
        <div className="modal-foot">
          <button type="button" className="link" onClick={onCancel}>
            {t("optionsCancel")}
          </button>
          <button type="submit" className="primary">{t("optionsSave")}</button>
        </div>
      </form>
    </dialog>
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
  const target = action.dataViewName === undefined ? "" : ` · ${t("optionsPreviewDataViewName", action.dataViewName)}`;
  return `${t("optionsPreviewShown")} ${query}${range}${target}`;
}

type TargetKind = "name" | "id";

/** Plan 4 spec §6: the target data view by name (default) or ID. Kept as typed; withAction trims it when saved. */
function TargetDataView({ action, update }: { action: DiscoverAction; update: (patch: Partial<DiscoverAction>) => void }) {
  const [kind, setKind] = useState<TargetKind>(action.dataViewId !== undefined ? "id" : "name");
  const value = (kind === "name" ? action.dataViewName : action.dataViewId) ?? "";
  const set = (target: TargetKind, text: string): void =>
    update(
      target === "name"
        ? { dataViewName: text === "" ? undefined : text, dataViewId: undefined }
        : { dataViewId: text === "" ? undefined : text, dataViewName: undefined },
    );
  return (
    <fieldset>
      <legend>{t("optionsTargetDataView")}</legend>
      {(["name", "id"] as const).map((target) => (
        <label className="inline" key={target}>
          <input
            type="radio"
            name="targetKind"
            value={target}
            checked={kind === target}
            onChange={() => {
              setKind(target);
              set(target, value);
            }}
          />
          {t(target === "name" ? "optionsTargetByName" : "optionsTargetById")}
        </label>
      ))}
      <input name="dataView" aria-label={t("optionsTargetDataView")} spellCheck={false} value={value} onChange={(event) => set(kind, event.target.value)} />
    </fieldset>
  );
}
