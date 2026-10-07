import { describe, expect, it } from "vitest";
import { flattenDoc, formatValue, isMissing, parseJsonText } from "../../../src/core/fields";

const hit = (source: Record<string, unknown>) => ({ _id: "id-1", _index: "logs-a", _source: source });

function nestedJson(levels: number): string {
  let text = JSON.stringify({ leaf: "x" });
  for (let i = 1; i < levels; i++) text = JSON.stringify({ next: text });
  return text;
}

describe("flattenDoc", () => {
  it("flattens nested objects into dot paths and adds _id/_index", () => {
    const fields = flattenDoc(hit({ context: { ip: "10.0.0.1", user: { id: 5 } }, level: 200 }));
    expect(fields).toMatchObject({
      "context.ip": "10.0.0.1",
      "context.user.id": 5,
      level: 200,
      _id: "id-1",
      _index: "logs-a",
    });
  });

  it("treats dotted keys and nested objects as the same path", () => {
    expect(flattenDoc(hit({ "log.level": "error" }))["log.level"]).toBe("error");
    expect(flattenDoc(hit({ log: { level: "error" } }))["log.level"]).toBe("error");
  });

  it("expands JSON text fields and keeps the raw text", () => {
    const body = JSON.stringify({ amount: 10, items: [{ id: 1 }] });
    const fields = flattenDoc(hit({ context: { body } }));
    expect(fields["context.body"]).toBe(body);
    expect(fields["context.body.amount"]).toBe(10);
    expect(fields["context.body.items"]).toEqual([{ id: 1 }]);
  });

  it("keeps invalid JSON text as plain text", () => {
    const fields = flattenDoc(hit({ message: "{not json" }));
    expect(fields.message).toBe("{not json");
    expect(Object.keys(fields).filter((key) => key.startsWith("message."))).toEqual([]);
  });

  it("does not descend into JSON array text", () => {
    const fields = flattenDoc(hit({ tags: '["a","b"]' }));
    expect(fields.tags).toBe('["a","b"]');
    expect(Object.keys(fields).filter((key) => key.startsWith("tags."))).toEqual([]);
  });

  it("expands at most 5 levels of nested JSON text", () => {
    expect(flattenDoc(hit({ f: nestedJson(5) }))["f.next.next.next.next.leaf"]).toBe("x");
    const deep = flattenDoc(hit({ f: nestedJson(6) }));
    expect(deep["f.next.next.next.next.next.leaf"]).toBeUndefined();
    expect(typeof deep["f.next.next.next.next.next"]).toBe("string");
  });

  it("handles a hit without _source", () => {
    expect(flattenDoc({ _id: "x", _index: "i" })).toEqual({ _id: "x", _index: "i" });
  });

  it("has no inherited keys such as constructor or toString", () => {
    const fields = flattenDoc(hit({}));
    expect(fields["constructor"]).toBeUndefined();
    expect(fields["toString"]).toBeUndefined();
  });
});

describe("isMissing", () => {
  it("treats only undefined, null and empty string as missing", () => {
    expect([undefined, null, ""].map(isMissing)).toEqual([true, true, true]);
    expect([0, false, " ", "x"].map(isMissing)).toEqual([false, false, false, false]);
  });
});

describe("formatValue", () => {
  it("formats primitives, primitive arrays and objects", () => {
    expect(formatValue("a")).toBe("a");
    expect(formatValue(0)).toBe("0");
    expect(formatValue(false)).toBe("false");
    expect(formatValue(["a", 1, true])).toBe("a,1,true");
    expect(formatValue([{ id: 1 }])).toBe('[{"id":1}]');
    expect(formatValue({ a: 1 })).toBe('{"a":1}');
  });
});

describe("parseJsonText", () => {
  it("parses only object or array JSON text", () => {
    expect(parseJsonText(' {"a":1} ')).toEqual({ a: 1 });
    expect(parseJsonText("[1]")).toEqual([1]);
    expect(parseJsonText("12")).toBeUndefined();
    expect(parseJsonText('"x"')).toBeUndefined();
    expect(parseJsonText("{bad")).toBeUndefined();
  });
});
