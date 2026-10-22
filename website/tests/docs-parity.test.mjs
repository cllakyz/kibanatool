import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";

/** The .md/.mdx files under a website/ directory, as sorted relative paths. */
function list(dir) {
  return readdirSync(new URL(`../${dir}`, import.meta.url), { recursive: true })
    .filter((path) => /\.mdx?$/.test(path))
    .sort();
}

test("every English docs page has a Turkish page", () => {
  assert.deepEqual(list("docs"), list("i18n/tr/docusaurus-plugin-content-docs/current"));
});
