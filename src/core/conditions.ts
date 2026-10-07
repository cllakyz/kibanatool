// Action visibility conditions (spec §7.2). All conditions must hold.
import { type FieldMap, formatValue, isMissing } from "./fields";

export type ConditionOp = "exists" | "equals" | "notEquals" | "contains" | "startsWith";

export interface Condition {
  field: string;
  op: ConditionOp;
  value?: string;
}

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
