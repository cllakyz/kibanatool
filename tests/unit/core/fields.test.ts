import { describe, expect, it } from "vitest";
import { expandStructured, flattenDoc, flattenSource, formatValue, isMissing, parseStructuredText } from "../../../src/core/fields";

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

  it("expands XML text fields into paths, with @attributes and #text (Plan 6 spec §5.2)", () => {
    const request = '<soap:Envelope><soap:Body><Bet Id="7"><Amount currency="TRY">150</Amount></Bet></soap:Body></soap:Envelope>';
    const fields = flattenDoc(hit({ context: { request } }));
    expect(fields["context.request"]).toBe(request);
    expect(fields["context.request.Envelope.Body.Bet.@Id"]).toBe("7");
    expect(fields["context.request.Envelope.Body.Bet.Amount.@currency"]).toBe("TRY");
    expect(fields["context.request.Envelope.Body.Bet.Amount.#text"]).toBe("150");
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

describe("parseStructuredText", () => {
  it("parses only object or array JSON text", () => {
    expect(parseStructuredText(' {"a":1} ')).toEqual({ a: 1 });
    expect(parseStructuredText("[1]")).toEqual([1]);
    expect(parseStructuredText("12")).toBeUndefined();
    expect(parseStructuredText('"x"')).toBeUndefined();
    expect(parseStructuredText("{bad")).toBeUndefined();
  });

  it("parses XML text too, and leaves other text that starts with < alone (Plan 6 spec §5.1)", () => {
    expect(parseStructuredText(' <a x="1"><b>2</b></a> ')).toEqual({ a: { "@x": "1", b: "2" } });
    expect(parseStructuredText("<html><br></html>")).toBeUndefined();
    expect(parseStructuredText("<5 dk")).toBeUndefined();
  });
});

describe("expandStructured (Plan 6 spec §5.1)", () => {
  it("parses JSON and XML text wherever it sits, also inside other text", () => {
    const inner = "&lt;race&gt;&lt;runId&gt;42&lt;/runId&gt;&lt;/race&gt;";
    expect(
      expandStructured({
        n: 1,
        request: `<r><Payload>${inner}</Payload><Json>{"a":[1]}</Json></r>`,
        list: ['{"b":2}', "plain"],
        body: JSON.stringify({ xml: "<c>3</c>" }),
      }),
    ).toEqual({
      n: 1,
      request: { r: { Payload: { race: { runId: "42" } }, Json: { a: [1] } } },
      list: [{ b: 2 }, "plain"],
      body: { xml: { c: "3" } },
    });
  });

  it("parses at most 5 texts one inside another", () => {
    let five: unknown = expandStructured(nestedJson(5));
    for (let level = 0; level < 4; level++) five = (five as { next: unknown }).next;
    expect(five).toEqual({ leaf: "x" });
    let six: unknown = expandStructured(nestedJson(6));
    for (let level = 0; level < 5; level++) six = (six as { next: unknown }).next;
    expect(six).toBe(JSON.stringify({ leaf: "x" }));
  });

  it("keeps __proto__ keys own keys", () => {
    const expanded = expandStructured(JSON.parse('{"__proto__":{"polluted":1}}'));
    expect(Object.keys(expanded as object)).toEqual(["__proto__"]);
    expect(Object.getPrototypeOf(expanded)).toBe(Object.prototype);
  });
});

describe("isMissing with arrays", () => {
  it("treats an empty array as no value, like an empty string", () => {
    expect(isMissing([])).toBe(true);
    expect(isMissing([""])).toBe(false);
    expect(isMissing([0])).toBe(false);
  });
});

describe("flattenSource", () => {
  it("can keep JSON text unexpanded and never adds _id/_index", () => {
    const source = { context: { body: JSON.stringify({ amount: 5 }) }, level: 200 };
    expect({ ...flattenSource(source, false) }).toEqual({ "context.body": '{"amount":5}', level: 200 });
    expect({ ...flattenSource(source) }).toEqual({ "context.body": '{"amount":5}', "context.body.amount": 5, level: 200 });
  });
});
