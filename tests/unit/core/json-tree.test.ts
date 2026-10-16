import { describe, expect, it } from "vitest";
import {
  TEXT_VIEW_MIN_LENGTH,
  copyableValue,
  isDescendant,
  isMultiLine,
  jsonRows,
  matchPaths,
  panelFields,
  revealPath,
  searchPattern,
  textMatches,
  textSegments,
  visibleRows,
} from "../../../src/core/json-tree";

const doc = { user: { id: 7, name: "Ada" }, items: [{ sku: "A-1" }, { sku: "B-2" }], "odd.key": null };
const rows = jsonRows(doc);

describe("panelFields", () => {
  it("finds _source fields whose text is a JSON object or array", () => {
    const source = { message: "x", context: { body: '{"a":1}', query: "[1,2]", raw: "{not json" }, count: 3 };
    expect(panelFields(source)).toEqual([
      { path: "context.body", value: { a: 1 }, kind: "json" },
      { path: "context.query", value: [1, 2], kind: "json" },
    ]);
  });

  it("finds XML text fields too and opens the text inside them (Plan 6 spec §5.3)", () => {
    const source = {
      request: ' <r><Payload>&lt;race&gt;&lt;runId&gt;42&lt;/runId&gt;&lt;/race&gt;</Payload></r>',
      body: JSON.stringify({ nested: '{"a":1}' }),
      page: "<html><br></html>",
    };
    expect(panelFields(source)).toEqual([
      { path: "request", value: { r: { Payload: { race: { runId: "42" } } } }, kind: "xml" },
      { path: "body", value: { nested: { a: 1 } }, kind: "json" },
    ]);
  });
});

describe("panelFields with form text (spec 002 FR-003)", () => {
  it("lists form text as its own kind", () => {
    const source = { body: '{"a":1}', options: { body: "user=u&grant_type=password" }, plain: "a=1" };
    expect(panelFields(source)).toEqual([
      { path: "body", value: { a: 1 }, kind: "json" },
      { path: "options.body", value: { user: "u", grant_type: "password" }, kind: "form" },
    ]);
  });
});

describe("panelFields with text (spec 002 FR-007)", () => {
  it("lists multi-line and long text in field order, beside structured text", () => {
    const long = "x".repeat(TEXT_VIEW_MIN_LENGTH);
    const source = { a: "line1\nline2", b: long, c: "x".repeat(TEXT_VIEW_MIN_LENGTH - 1), d: '{"k":1}', e: "  trailing\n  " };
    expect(panelFields(source)).toEqual([
      { path: "a", kind: "text", text: "line1\nline2" },
      { path: "b", kind: "text", text: long },
      { path: "d", value: { k: 1 }, kind: "json" },
    ]);
  });

  it("lists only text leaves, not array items or numbers", () => {
    expect(panelFields({ lines: ["a\nb"], n: 5, t: "a\r\nb" })).toEqual([{ path: "t", kind: "text", text: "a\r\nb" }]);
  });
});

describe("isMultiLine", () => {
  it("is true when a line break remains after trimming", () => {
    expect(isMultiLine("a\r\nb")).toBe(true);
    expect(isMultiLine("a\rb")).toBe(true);
    expect(isMultiLine("a\n")).toBe(false);
    expect(isMultiLine("abc")).toBe(false);
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

  it("finds consecutive matching rows: the pattern keeps no lastIndex between them", () => {
    const pair = jsonRows({ a: "match", b: "match" });
    expect(matchPaths(pair, "match")).toEqual([".a", ".b"]);
  });

  it("treats the query as plain text, not a pattern", () => {
    expect(matchPaths(jsonRows({ a: "x.y", b: "xzy" }), "x.y")).toEqual([".a"]);
  });
});

describe("searchPattern (spec 002 FR-012)", () => {
  it("is undefined for a blank query, case-insensitive and not global", () => {
    expect(searchPattern("  ")).toBeUndefined();
    const pattern = searchPattern("ISTANBUL");
    expect(pattern?.test("istanbul")).toBe(true);
    expect(pattern?.flags.includes("g")).toBe(false);
    // As before with toLowerCase(): "İSTANBUL".toLowerCase() is "i̇stanbul", so a dotted capital İ never matches i.
    expect(searchPattern("istanbul")?.test("İSTANBUL")).toBe(false);
  });
});

describe("textMatches and textSegments (spec 002 FR-012)", () => {
  it("returns offsets into the original text, also after a letter whose lower case is longer", () => {
    expect(textMatches("İx ab AB", "ab")).toEqual([
      [3, 5],
      [6, 8],
    ]);
    expect(textMatches("abc", " ")).toEqual([]);
    expect(textMatches("a+b a+b", "a+b")).toEqual([
      [0, 3],
      [4, 7],
    ]);
  });

  it("splits the text into plain runs and numbered matches", () => {
    expect(textSegments("xaby", [[1, 3]])).toEqual([{ text: "x" }, { text: "ab", match: 0 }, { text: "y" }]);
    expect(textSegments("ab", [[0, 2]])).toEqual([{ text: "ab", match: 0 }]);
    expect(textSegments("abc", [])).toEqual([{ text: "abc" }]);
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
