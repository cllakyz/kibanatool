import { describe, expect, it } from "vitest";
import { type MarkdownOptions, buildMarkdown } from "../../../src/core/markdown";
import { VALUE_MASK_KINDS } from "../../../src/core/value-mask";

const hit = {
  _id: "A1",
  _index: "app_log",
  _source: {
    message: "Handled /v1",
    datetime: "2026-08-12T10:00:00+03:00",
    level: 200,
    empty: "",
    tags: ["a", "b"],
    context: { headers: JSON.stringify({ Authorization: "Bearer x", accept: "json" }), trace: "line1\nline2" },
  },
};

const options = (overrides: Partial<MarkdownOptions> = {}): MarkdownOptions => ({
  hit,
  timeField: "datetime",
  fields: [],
  maskPatterns: ["*authorization*"],
  valueMasks: [],
  docUrl: "http://k/app/discover#/doc/dv/app_log?id=A1",
  linkLabel: "Open in Kibana",
  ...overrides,
});

describe("buildMarkdown", () => {
  it("lists every _source leaf alphabetically, JSON and multi-line text as code blocks, masked", () => {
    expect(buildMarkdown(options()).split("\n")).toEqual([
      "**app_log** · 2026-08-12T10:00:00+03:00",
      "- `context.headers`:",
      "  ```json",
      "  {",
      '    "Authorization": "***",',
      '    "accept": "json"',
      "  }",
      "  ```",
      "- `context.trace`:",
      "  ```",
      "  line1",
      "  line2",
      "  ```",
      "- `datetime`: 2026-08-12T10:00:00+03:00",
      "- `level`: 200",
      "- `message`: Handled /v1",
      "- `tags`: a,b",
      "[Open in Kibana](http://k/app/discover#/doc/dv/app_log?id=A1)",
    ]);
  });

  it("uses only the configured fields in their order, including JSON sub-paths and _id", () => {
    const markdown = buildMarkdown(
      options({ timeField: undefined, fields: ["level", "context.headers.accept", "missing", "_id"], docUrl: "u", linkLabel: "L" }),
    );
    expect(markdown.split("\n")).toEqual(["**app_log**", "- `level`: 200", "- `context.headers.accept`: json", "- `_id`: A1", "[L](u)"]);
  });

  it("lengthens the fence when the value contains backticks", () => {
    const markdown = buildMarkdown(
      options({ hit: { _id: "1", _index: "i", _source: { body: JSON.stringify({ note: "use ``` here" }) } }, timeField: undefined, docUrl: "u" }),
    );
    expect(markdown.split("\n")).toEqual([
      "**i**",
      "- `body`:",
      "  ````json",
      "  {",
      '    "note": "use ``` here"',
      "  }",
      "  ````",
      "[Open in Kibana](u)",
    ]);
  });
});

describe("buildMarkdown with a listed parent field", () => {
  it("lists every leaf under the parent once, JSON text as one masked block", () => {
    expect(buildMarkdown(options({ fields: ["context", "level"] })).split("\n")).toEqual([
      "**app_log** · 2026-08-12T10:00:00+03:00",
      "- `context.headers`:",
      "  ```json",
      "  {",
      '    "Authorization": "***",',
      '    "accept": "json"',
      "  }",
      "  ```",
      "- `context.trace`:",
      "  ```",
      "  line1",
      "  line2",
      "  ```",
      "- `level`: 200",
      "[Open in Kibana](http://k/app/discover#/doc/dv/app_log?id=A1)",
    ]);
  });

  it("writes a leaf once when both the parent and the leaf are listed", () => {
    const lines = buildMarkdown(options({ fields: ["context", "context.trace"] })).split("\n");
    expect(lines.filter((line) => line.startsWith("- `context.trace`"))).toHaveLength(1);
  });

  it("keeps parentheses in the log link from ending the Markdown link", () => {
    const markdown = buildMarkdown(options({ docUrl: "http://k/app/discover#/doc/dv/logs(1)?id=a(b)" }));
    expect(markdown.split("\n").at(-1)).toBe("[Open in Kibana](http://k/app/discover#/doc/dv/logs%281%29?id=a%28b%29)");
  });
});

// Synthetic values only (Plan 5 spec §9.1).
describe("buildMarkdown with value masks (Plan 5 spec §5)", () => {
  const payment = {
    _id: "10000000146",
    _index: "pay-5550000000",
    _source: {
      datetime: "2026-08-12T10:00:00+03:00",
      request: "<a><tckn>10000000146</tckn><iban>TR00 0000 0000 0000 0000 0000 01</iban><n>150</n></a>",
      body: JSON.stringify({ pidNo: 10000000146, phone: "+90 555 000 00 00", note: "ok" }),
      iban: "TR000000000000000000000001",
    },
  };
  const masked = (overrides: Partial<MarkdownOptions> = {}): string[] =>
    buildMarkdown(
      options({ hit: payment, maskPatterns: ["*iban*"], valueMasks: [...VALUE_MASK_KINDS], docUrl: "u?id=10000000146", ...overrides }),
    ).split("\n");

  it("masks the values inside XML and JSON text, keeps the rest, and leaves the header and the link alone", () => {
    expect(masked()).toEqual([
      "**pay-5550000000** · 2026-08-12T10:00:00+03:00",
      "- `body`:",
      "  ```json",
      "  {",
      '    "pidNo": "***",',
      '    "phone": "***",',
      '    "note": "ok"',
      "  }",
      "  ```",
      "- `datetime`: 2026-08-12T10:00:00+03:00",
      "- `iban`: ***",
      "- `request`: <a><tckn>***</tckn><iban>***</iban><n>150</n></a>",
      "[Open in Kibana](u?id=10000000146)",
    ]);
  });

  it("masks a listed JSON sub-path that holds a number, and a listed _id", () => {
    // Plan 5 Review Focus 4: copy.markdownFields may name a path inside JSON text, or _id.
    expect(masked({ fields: ["_id", "body.pidNo", "body.note"] })).toEqual([
      "**pay-5550000000** · 2026-08-12T10:00:00+03:00",
      "- `_id`: ***",
      "- `body.pidNo`: ***",
      "- `body.note`: ok",
      "[Open in Kibana](u?id=10000000146)",
    ]);
  });

  it("copies the values as before when every kind is off", () => {
    // Plan 5 Review Focus 5.
    const lines = masked({ valueMasks: [] });
    expect(lines).toContain("- `request`: <a><tckn>10000000146</tckn><iban>TR00 0000 0000 0000 0000 0000 01</iban><n>150</n></a>");
    expect(lines).toContain('    "pidNo": 10000000146,');
    expect(lines).toContain("- `iban`: ***"); // the field-name mask still applies
  });
});
