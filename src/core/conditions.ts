// Action visibility conditions (spec §7.2). All conditions must hold.
import type { Action } from "./config";
import { type FieldMap, formatValue, isMissing } from "./fields";
import type { HiddenReason, PassiveReason } from "./passive";
import { type Encoders, type Variables, fillTemplate } from "./template";

export type Condition = Action["conditions"][number];
export type ConditionOp = Condition["op"];

export function evaluateCondition(condition: Condition, fields: FieldMap): boolean {
  const raw = fields[condition.field];
  if (condition.op === "exists") return !isMissing(raw);
  const text = isMissing(raw) ? undefined : formatValue(raw);
  const expected = condition.value ?? "";
  switch (condition.op) {
    case "equals":
      return text === expected;
    case "notEquals":
      return text !== expected;
    case "contains":
      return text !== undefined && text.includes(expected);
    case "startsWith":
      return text !== undefined && text.startsWith(expected);
    default:
      return false;
  }
}

export function evaluateConditions(conditions: Condition[], fields: FieldMap): boolean {
  return conditions.every((condition) => evaluateCondition(condition, fields));
}

export type Gate =
  | { ok: true; text: string }
  | { ok: false; reason: Exclude<HiddenReason, "invalidUrl"> }
  | { ok: false; passive: PassiveReason };

/** Spec §7.2, Plan 4 spec §5.3: the checks every action kind runs first, in this order, then its template filled. */
export function gateAction(
  action: Pick<Action, "enabled" | "conditions">,
  template: string,
  fields: FieldMap,
  variables: Variables,
  encoders: Encoders,
): Gate {
  if (!action.enabled) return { ok: false, reason: "disabled" };
  if (!evaluateConditions(action.conditions, fields)) return { ok: false, reason: "conditions" };
  const filled = fillTemplate(template, fields, variables, encoders);
  if (filled.ok) return { ok: true, text: filled.text };
  return filled.reason === "missingVariable"
    ? { ok: false, passive: { kind: "missingVariable", variable: filled.variable } }
    : { ok: false, reason: "missingValue" };
}
