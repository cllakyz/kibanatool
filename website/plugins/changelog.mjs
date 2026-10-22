import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** The newest "## [x.y.z] - YYYY-MM-DD" entry of CHANGELOG.md and its first paragraph (may be empty). */
export function latestRelease(markdown) {
  const match = /^## \[([^\]]+)\] - (\d{4}-\d{2}-\d{2})\n+(?:([^\n#][^\n]*(?:\n[^\n#][^\n]*)*))?/m.exec(markdown);
  if (!match) throw new Error('CHANGELOG.md has no "## [version] - date" entry');
  return { version: match[1], date: match[2], summary: (match[3] ?? "").replace(/\s*\n\s*/g, " ").trim() };
}

export default function changelog() {
  const path = fileURLToPath(new URL("../../CHANGELOG.md", import.meta.url));
  return {
    name: "kibanatool-changelog",
    getPathsToWatch: () => [path],
    loadContent: () => latestRelease(readFileSync(path, "utf8")),
    contentLoaded: ({ content, actions }) => actions.setGlobalData(content),
  };
}
