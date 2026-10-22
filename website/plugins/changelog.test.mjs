import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { latestRelease } from "./changelog.mjs";

test("the newest dated entry wins, its first paragraph joined into one line", () => {
  assert.deepEqual(
    latestRelease("# Changelog\n\nIntro.\n\n## [Unreleased]\n\n- x\n\n## [1.1.0] - 2026-11-02\n\nSecond release,\nwrapped.\n\n### Added\n\n- y\n\n## [1.0.0] - 2026-10-20\n\nFirst.\n"),
    { version: "1.1.0", date: "2026-11-02", summary: "Second release, wrapped." },
  );
});
test("an entry without a summary paragraph is still the latest", () => {
  assert.deepEqual(
    latestRelease("## [1.1.0] - 2026-11-02\n\n### Added\n\n- y\n\n## [1.0.0] - 2026-10-20\n\nFirst.\n"),
    { version: "1.1.0", date: "2026-11-02", summary: "" },
  );
});
test("a changelog without a dated entry is an error", () => {
  assert.throws(() => latestRelease("# Changelog\n"), /no "## \[version\] - date" entry/);
});
test("the repository's CHANGELOG.md has a latest release", () => {
  const { version, date } = latestRelease(readFileSync(new URL("../../CHANGELOG.md", import.meta.url), "utf8"));
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
});
