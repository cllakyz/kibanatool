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
  // Listed fields may name JSON sub-paths or _id; the full list keeps JSON text whole (spec §7.4).
  const source: FieldMap = fields.length > 0 ? all : flattenSource(hit._source ?? {}, false);
  const paths = fields.length > 0 ? fields : Object.keys(source).sort();
  const time = timeField === undefined ? undefined : all[timeField];
  const lines = [`**${hit._index}**${isMissing(time) ? "" : ` · ${formatValue(time)}`}`];
  for (const path of paths) {
    const value = source[path];
    if (isMissing(value)) continue;
    lines.push(...fieldLines(path, maskValue(path, value, isMasked)));
  }
  lines.push(`[${linkLabel}](${docUrl})`);
  return lines.join("\n");
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
