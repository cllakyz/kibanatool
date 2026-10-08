// "Copy as Markdown" (spec §7.4): plain Markdown for GitHub, Jira Cloud and Slack.
import { type FieldMap, flattenDoc, flattenSource, formatValue, isMissing, parseJsonText } from "./fields";
import { maskMatcher, maskValue } from "./mask";
import type { RawHit } from "./types";

export interface MarkdownOptions {
  hit: RawHit;
  /** The data view's time field; its raw value goes into the header. */
  timeField?: string;
  /** copy.markdownFields: empty means every `_source` leaf, alphabetically. */
  fields: string[];
  maskPatterns: string[];
  docUrl: string;
  /** Localized text of the closing link. */
  linkLabel: string;
}

export function buildMarkdown(options: MarkdownOptions): string {
  const { hit, timeField, fields, maskPatterns, docUrl, linkLabel } = options;
  const isMasked = maskMatcher(maskPatterns);
  const all = flattenDoc(hit);
  // JSON text stays whole (spec §7.4): the full list and listed parents use the raw leaves, not parsed sub-paths.
  const leaves = flattenSource(hit._source ?? {}, false);
  // Listed fields may also name JSON sub-paths or _id, which only `all` has.
  const source: FieldMap = fields.length > 0 ? all : leaves;
  const paths = fields.length > 0 ? fields.flatMap((path) => listedPaths(path, all, leaves)) : Object.keys(leaves).sort();
  const time = timeField === undefined ? undefined : all[timeField];
  const lines = [`**${hit._index}**${isMissing(time) ? "" : ` · ${formatValue(time)}`}`];
  for (const path of paths) {
    const value = source[path];
    if (isMissing(value)) continue;
    lines.push(...fieldLines(path, maskValue(path, value, isMasked)));
  }
  // A ")" in the index or id would end the Markdown link early.
  lines.push(`[${linkLabel}](${docUrl.replace(/[()]/g, (paren) => (paren === "(" ? "%28" : "%29"))})`);
  return lines.join("\n");
}

/** A listed path that is not a field itself (e.g. `context`) stands for every raw leaf under it. */
function listedPaths(path: string, all: FieldMap, leaves: FieldMap): string[] {
  if (Object.hasOwn(all, path)) return [path];
  return Object.keys(leaves)
    .filter((leaf) => leaf.startsWith(`${path}.`))
    .sort();
}

const isObjectArray = (value: unknown): boolean =>
  Array.isArray(value) && value.some((item) => typeof item === "object" && item !== null);

function fieldLines(path: string, value: unknown): string[] {
  const json = typeof value === "string" ? parseJsonText(value) : isObjectArray(value) ? value : undefined;
  if (json !== undefined) return [`- \`${path}\`:`, ...codeBlock(JSON.stringify(json, null, 2), "json")];
  const text = formatValue(value);
  if (text.includes("\n")) return [`- \`${path}\`:`, ...codeBlock(text, "")];
  return [`- \`${path}\`: ${text}`];
}

/** Indented two spaces so it belongs to the list item; the fence is longer than any backtick run inside. */
function codeBlock(text: string, language: string): string[] {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(Math.max(3, longest + 1));
  return [`  ${fence}${language}`, ...text.split("\n").map((line) => `  ${line}`), `  ${fence}`];
}
