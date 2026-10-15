import { describe, expect, it } from "vitest";
import { type Condition, evaluateCondition, evaluateConditions, gateAction } from "../../../src/core/conditions";

const fields = { level: 200, level_name: "ERROR", "user.id": "u-1", empty: "", zero: 0 };

describe("evaluateCondition", () => {
  it("exists: present and non-empty, 0 counts as present", () => {
    expect(evaluateCondition({ field: "level", op: "exists" }, fields)).toBe(true);
    expect(evaluateCondition({ field: "zero", op: "exists" }, fields)).toBe(true);
    expect(evaluateCondition({ field: "empty", op: "exists" }, fields)).toBe(false);
    expect(evaluateCondition({ field: "missing", op: "exists" }, fields)).toBe(false);
  });

  it("equals compares text and is case-sensitive", () => {
    expect(evaluateCondition({ field: "level", op: "equals", value: "200" }, fields)).toBe(true);
    expect(evaluateCondition({ field: "level_name", op: "equals", value: "error" }, fields)).toBe(false);
  });

  it("notEquals is true for a different or missing value", () => {
    expect(evaluateCondition({ field: "level_name", op: "notEquals", value: "INFO" }, fields)).toBe(true);
    expect(evaluateCondition({ field: "missing", op: "notEquals", value: "x" }, fields)).toBe(true);
    expect(evaluateCondition({ field: "level_name", op: "notEquals", value: "ERROR" }, fields)).toBe(false);
  });

  it("contains and startsWith need a value", () => {
    expect(evaluateCondition({ field: "level_name", op: "contains", value: "RR" }, fields)).toBe(true);
    expect(evaluateCondition({ field: "user.id", op: "startsWith", value: "u-" }, fields)).toBe(true);
    expect(evaluateCondition({ field: "missing", op: "contains", value: "x" }, fields)).toBe(false);
    expect(evaluateCondition({ field: "missing", op: "startsWith", value: "x" }, fields)).toBe(false);
  });
});

describe("evaluateConditions", () => {
  it("is true for no conditions and requires all conditions otherwise", () => {
    expect(evaluateConditions([], fields)).toBe(true);
    expect(
      evaluateConditions(
        [
          { field: "level", op: "exists" },
          { field: "level_name", op: "equals", value: "ERROR" },
        ],
        fields,
      ),
    ).toBe(true);
    expect(
      evaluateConditions(
        [
          { field: "level", op: "exists" },
          { field: "level_name", op: "equals", value: "INFO" },
        ],
        fields,
      ),
    ).toBe(false);
  });
});

describe("gateAction", () => {
  const encoders = { field: (value: string) => value, variable: (value: string) => value };
  const action = (enabled: boolean, conditions: Condition[] = [{ field: "level", op: "equals", value: "200" }]) => ({ enabled, conditions });

  it("hides a disabled action before looking at its conditions", () => {
    expect(gateAction(action(false, [{ field: "missing", op: "exists" }]), "x", fields, {}, encoders)).toEqual({ ok: false, reason: "disabled" });
  });

  it("hides an action whose conditions fail", () => {
    expect(gateAction(action(true, [{ field: "missing", op: "exists" }]), "x", fields, {}, encoders)).toEqual({ ok: false, reason: "conditions" });
  });

  it("hides an action whose template misses a field value", () => {
    expect(gateAction(action(true), "{nope}", fields, {}, encoders)).toEqual({ ok: false, reason: "missingValue" });
  });

  it("greys out an action whose template misses a variable", () => {
    expect(gateAction(action(true), "{env.x}/{level}", fields, {}, encoders)).toEqual({
      ok: false,
      passive: { kind: "missingVariable", variable: "x" },
    });
  });

  it("a missing field value wins over a missing variable", () => {
    expect(gateAction(action(true), "{env.x}/{nope}", fields, {}, encoders)).toEqual({ ok: false, reason: "missingValue" });
  });

  it("fills the template when everything is there", () => {
    expect(gateAction(action(true), "{env.x}/{level}", fields, { x: "base" }, encoders)).toEqual({ ok: true, text: "base/200" });
  });
});
