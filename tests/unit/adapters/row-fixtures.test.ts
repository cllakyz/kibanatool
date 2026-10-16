// @vitest-environment happy-dom
// Result rows captured from the e2e stacks (tests/e2e/capture.spec.ts, spec 003); synthetic data only.
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findRows } from "../../../src/adapters/detect";

interface Fixture {
  pathname: string;
  hash: string;
  prefix: string;
  identities: unknown[];
  html: string;
}

const dir = "tests/fixtures/rows";
const names = readdirSync(dir)
  .filter((name) => name.endsWith(".json"))
  .sort();

describe("captured Kibana result rows", () => {
  it("cover 7.17, 8.19 and 9.5", () => {
    expect(names).toEqual(["7.17.29.json", "8.19.23.json", "9.5.5.json"]);
  });

  it.each(names)("%s yields the captured identities", (name) => {
    const fixture = JSON.parse(readFileSync(`${dir}/${name}`, "utf8")) as Fixture;
    document.body.innerHTML = fixture.html;
    const rows = findRows(document, { pathname: fixture.pathname, hash: fixture.hash }, fixture.prefix);
    expect(rows.map((row) => row.identity)).toEqual(fixture.identities);
  });
});
