import { describe, expect, it } from "vitest";
import { type MarkdownOptions, buildMarkdown } from "../../../src/core/markdown";

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
