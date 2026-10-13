import { describe, expect, it } from "vitest";
import { buildJson } from "../../../src/core/json-copy";
import { VALUE_MASK_KINDS } from "../../../src/core/value-mask";

// Synthetic values only (Plan 5 spec §9.1).
const hit = {
  _id: "10000000146",
  _index: "pay-5550000000",
  _source: {
    datetime: "2026-08-12T10:00:00+03:00",
    user_id: 10000000146,
    context: {
      headers: JSON.stringify({ Authorization: "Bearer x", accept: "json" }),
      request: '<soap:Envelope xmlns:soap="s"><soap:Body><pay pid="10000000146"><iban>TR000000000000000000000001</iban><amount>150</amount></pay></soap:Body></soap:Envelope>',
    },
    level: 200,
  },
};
const all = [...VALUE_MASK_KINDS];

describe("buildJson (Plan 6 spec §6)", () => {
  it("copies _index, _id and _source, two-space indented, with JSON and XML text expanded and masked", () => {
    expect(JSON.parse(buildJson(hit, ["*authorization*"], all))).toEqual({
      _index: "pay-5550000000",
      _id: "10000000146",
      _source: {
        datetime: "2026-08-12T10:00:00+03:00",
        user_id: "***",
        context: {
          headers: { Authorization: "***", accept: "json" },
          request: { Envelope: { Body: { pay: { "@pid": "***", iban: "***", amount: "150" } } } },
        },
        level: 200,
      },
    });
    expect(buildJson(hit, [], []).split("\n").slice(0, 4)).toEqual(["{", '  "_index": "pay-5550000000",', '  "_id": "10000000146",', '  "_source": {']);
  });

  it("keeps the order of _source and never masks or scans _index and _id", () => {
    const copied = JSON.parse(buildJson(hit, ["*id*", "*index*"], all));
    expect(Object.keys(copied)).toEqual(["_index", "_id", "_source"]);
    expect(Object.keys(copied._source)).toEqual(["datetime", "user_id", "context", "level"]);
    expect(copied._index).toBe("pay-5550000000");
    expect(copied._id).toBe("10000000146");
  });

  it("matches field-name masks on _source paths, inside XML too", () => {
    const copied = JSON.parse(buildJson(hit, ["context.request.Envelope.Body.pay.amount"], []));
    expect(copied._source.context.request.Envelope.Body.pay).toEqual({ "@pid": "10000000146", iban: "TR000000000000000000000001", amount: "***" });
    expect(copied._source.user_id).toBe(10000000146);
  });

  it("masks a whole XML element once when a pattern names it (Review Focus 4)", () => {
    const copied = JSON.parse(buildJson(hit, ["*.Body"], all));
    expect(copied._source.context.request).toEqual({ Envelope: { Body: "***" } });
  });

  it("masks a value that a child element splits from the word before it (final review)", () => {
    const copied = JSON.parse(buildJson({ _id: "1", _index: "i", _source: { note: "<p>Kimlik<br/>10000000146</p>" } }, [], all));
    expect(copied._source.note).toEqual({ p: { br: "", "#text": "Kimlik ***" } });
  });

  it("keeps the copy small for XML escaped 30 levels deep (final review)", () => {
    const escape = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    let xml = "<a>x</a>";
    for (let level = 0; level < 30; level++) xml = `<w>${escape(xml)}</w>`;
    const copy = buildJson({ _id: "1", _index: "i", _source: { body: xml } }, [], all);
    expect(copy.length).toBeLessThan(1000);
    expect(JSON.parse(copy)._source.body.w.w.w.w.w).toBe("***");
  });

  it("copies a hit without _source as an empty object", () => {
    expect(JSON.parse(buildJson({ _id: "1", _index: "i" }, [], all))).toEqual({ _index: "i", _id: "1", _source: {} });
  });
});
