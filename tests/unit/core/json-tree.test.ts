import { describe, expect, it } from "vitest";
import {
  copyableValue,
  isDescendant,
  jsonRows,
  jsonTextFields,
  matchPaths,
  revealPath,
  visibleRows,
} from "../../../src/core/json-tree";

const doc = { user: { id: 7, name: "Ada" }, items: [{ sku: "A-1" }, { sku: "B-2" }], "odd.key": null };
const rows = jsonRows(doc);

describe("jsonTextFields", () => {
  it("finds _source fields whose text is a JSON object or array", () => {
    const source = { message: "x", context: { body: '{"a":1}', query: "[1,2]", raw: "{not json" }, count: 3 };
    expect(jsonTextFields(source)).toEqual([
      { path: "context.body", value: { a: 1 }, source: "json" },
      { path: "context.query", value: [1, 2], source: "json" },
    ]);
  });

  it("finds XML text fields too and opens the text inside them (Plan 6 spec §5.3)", () => {
    const source = {
      request: ' <r><Payload>&lt;race&gt;&lt;runId&gt;42&lt;/runId&gt;&lt;/race&gt;</Payload></r>',
      body: JSON.stringify({ nested: '{"a":1}' }),
      page: "<html><br></html>",
    };
    expect(jsonTextFields(source)).toEqual([
      { path: "request", value: { r: { Payload: { race: { runId: "42" } } } }, source: "xml" },
      { path: "body", value: { nested: { a: 1 } }, source: "json" },
    ]);
  });
});

describe("jsonTextFields with form text (spec 002 FR-003)", () => {
  it("lists form text as its own kind", () => {
    const source = { body: '{"a":1}', options: { body: "user=u&grant_type=password" }, plain: "a=1" };
    expect(jsonTextFields(source)).toEqual([
      { path: "body", value: { a: 1 }, source: "json" },
      { path: "options.body", value: { user: "u", grant_type: "password" }, source: "form" },
    ]);
  });
});

describe("jsonRows", () => {
  it("lists every node in order with relative paths", () => {
    expect(rows.map((row) => row.path)).toEqual([
      "",
      ".user",
      ".user.id",
      ".user.name",
      ".items",
      ".items[0]",
      ".items[0].sku",
      ".items[1]",
      ".items[1].sku",
      '["odd.key"]',
    ]);
    expect(rows[5]).toMatchObject({ depth: 2, key: 0, container: "object" });
    expect(rows[9]).toMatchObject({ depth: 1, key: "odd.key", value: null, container: null });
  });
});

describe("jsonRows with XML keys", () => {
  it("writes @attribute and #text keys as dot segments, so a copied path works in a template", () => {
    const paths = jsonRows({ Bet: { "@Id": "7", "#text": "x", "@1": "a", "#odd key": "b" } }).map((row) => row.path);
    expect(paths).toEqual(["", ".Bet", ".Bet.@Id", ".Bet.#text", '.Bet["@1"]', '.Bet["#odd key"]']);
  });
});

describe("isDescendant", () => {
  it("needs a path separator after the parent", () => {
    expect(isDescendant(".items[0].sku", ".items")).toBe(true);
    expect(isDescendant(".itemsX", ".items")).toBe(false);
    expect(isDescendant(".items", ".items")).toBe(false);
    expect(isDescendant(".user", "")).toBe(true);
  });
});

describe("visibleRows", () => {
  it("hides the descendants of collapsed containers", () => {
    expect(visibleRows(rows, new Set([".items"])).map((row) => row.path)).toEqual([
      "",
      ".user",
      ".user.id",
      ".user.name",
      ".items",
      '["odd.key"]',
    ]);
    expect(visibleRows(rows, new Set([""])).map((row) => row.path)).toEqual([""]);
  });
});

describe("matchPaths", () => {
  it("matches keys and primitive values, ignoring case; array indexes are not keys", () => {
    expect(matchPaths(rows, "SKU")).toEqual([".items[0].sku", ".items[1].sku"]);
    expect(matchPaths(rows, "b-2")).toEqual([".items[1].sku"]);
    expect(matchPaths(rows, "1")).toEqual([".items[0].sku"]);
    expect(matchPaths(rows, "null")).toEqual(['["odd.key"]']);
    expect(matchPaths(rows, "  ")).toEqual([]);
  });
});

describe("revealPath", () => {
  it("expands every collapsed ancestor of the path and nothing else", () => {
    expect([...revealPath(new Set(["", ".items", ".items[1]", ".user"]), ".items[1].sku")]).toEqual([".user"]);
  });
});

describe("copyableValue", () => {
  it("copies primitives as text and containers as indented JSON", () => {
    expect(copyableValue(rows[2]!)).toBe("7");
    expect(copyableValue(rows[9]!)).toBe("null");
    expect(copyableValue(rows[1]!)).toBe('{\n  "id": 7,\n  "name": "Ada"\n}');
  });
});
