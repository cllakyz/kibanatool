import { describe, expect, it } from "vitest";
import type { DiscoverAction, LinkAction } from "../../../src/core/config";
import { parseSample, previewAction } from "../../../src/options/preview";

const link: LinkAction = {
  id: "l",
  kind: "link",
  label: "Admin",
  enabled: true,
  environmentIds: [],
  conditions: [],
  urlTemplate: "https://admin.test/users/{user_id|context.user_id}",
};
const discover: DiscoverAction = {
  id: "d",
  kind: "discover",
  label: "Same user",
  enabled: true,
  environmentIds: [],
  conditions: [],
  queryTemplate: "user_id:{user_id}",
};

describe("parseSample", () => {
  it("accepts a raw hit or a bare _source and flattens it", () => {
    const hit = parseSample(JSON.stringify({ _id: "A", _index: "app_log", _source: { context: { user_id: 7 } } }));
    expect(hit.ok && hit.fields).toMatchObject({ _id: "A", _index: "app_log", "context.user_id": 7 });
    const source = parseSample('{"user_id": 7, "context": {"body": "{\\"amount\\": 5}"}}');
    expect(source.ok && source.fields).toMatchObject({ user_id: 7, "context.body.amount": 5 });
  });

  it("reports text that is not a JSON object", () => {
    expect(parseSample("[1]")).toEqual({ ok: false, error: "Expected a JSON object" });
    expect(parseSample("{").ok).toBe(false);
  });
});

describe("previewAction", () => {
  it("shows the resolved URL or KQL query", () => {
    const sample = parseSample('{"context": {"user_id": 7}, "user_id": "u \\"1\\""}');
    if (!sample.ok) throw new Error(sample.error);
    expect(previewAction(link, sample.fields)).toEqual({ shown: true, text: "https://admin.test/users/u%20%221%22" });
    expect(previewAction(discover, sample.fields)).toEqual({ shown: true, text: 'user_id:"u \\"1\\""' });
  });

  it("explains why an action would be hidden", () => {
    const sample = parseSample('{"level": 200}');
    if (!sample.ok) throw new Error(sample.error);
    expect(previewAction(link, sample.fields)).toEqual({ shown: false, reason: "missingValue" });
    const onlyErrors: DiscoverAction = { ...discover, conditions: [{ field: "level", op: "equals", value: "400" }] };
    expect(previewAction(onlyErrors, sample.fields)).toEqual({ shown: false, reason: "conditions" });
    expect(previewAction({ ...link, enabled: false }, sample.fields)).toEqual({ shown: false, reason: "disabled" });
  });
});
