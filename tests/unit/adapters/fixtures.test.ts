// @vitest-environment happy-dom
// Detail views captured from the e2e stacks (tests/e2e/capture.spec.ts); synthetic data only.
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findDetailViews } from "../../../src/adapters/detect";

interface Fixture {
  pathname: string;
  hash: string;
  prefix: string;
  identity: unknown;
  html: string;
}

const dir = "tests/fixtures";
const names = readdirSync(dir)
  .filter((name) => name.endsWith(".json"))
  .sort();

describe("captured Kibana detail views", () => {
  it("cover 7.17, 8.19, 9.5 and the 9.5 Observability view", () => {
    expect(names).toEqual(["7.17.29-app-log.json", "8.19.23-app-log.json", "9.5.5-app-log.json", "9.5.5-obs-log-overview.json"]);
  });

  it.each(names)("%s yields the captured identity", (name) => {
    const fixture = JSON.parse(readFileSync(`${dir}/${name}`, "utf8")) as Fixture;
    document.body.innerHTML = fixture.html;
    const views = findDetailViews(document, { pathname: fixture.pathname, hash: fixture.hash }, fixture.prefix);
    expect(views.map((view) => view.identity)).toEqual([fixture.identity]);
  });
});
