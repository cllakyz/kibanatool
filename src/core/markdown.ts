// "Copy as Markdown" (spec §7.4): plain Markdown for GitHub, Jira Cloud and Slack.
import { type FieldMap, expandStructured, flattenDoc, flattenSource, formatValue, isMissing, isPlainObject } from "./fields";
import { MASK, maskMatcher, maskValue } from "./mask";
import type { RawHit } from "./types";
import type { ValueMaskKind } from "./value-mask";

export interface MarkdownOptions {
  hit: RawHit;
  /** The data view's time field; its raw value goes into the header. */
  timeField?: string;
  /** copy.markdownFields: empty means every `_source` leaf, alphabetically. */
  fields: string[];
  maskPatterns: string[];
  /** copy.valueMasks: kinds searched inside every value (Plan 5 spec §5); the header and the link are not. */
  valueMasks: readonly ValueMaskKind[];
  docUrl: string;
  /** Localized text of the closing link. */
  linkLabel: string;
}

export function buildMarkdown(options: MarkdownOptions): string {
  const { hit, timeField, fields, maskPatterns, valueMasks, docUrl, linkLabel } = options;
  const isMasked = maskMatcher(maskPatterns);
  // A path inside a masked field or element is masked too, as in the JSON copy (Plan 6 spec §5.4).
  const underMask = (path: string): boolean =>
    path.split(".").some((_, index, parts) => index > 0 && isMasked(parts.slice(0, index).join(".")));
  const all = flattenDoc(hit);
  // JSON text stays whole (spec §7.4): the full list and listed parents use the raw leaves, not parsed sub-paths.
  const leaves = flattenSource(hit._source ?? {}, false);
  // Listed fields may also name JSON sub-paths or _id, which only `all` has.
  const source: FieldMap = fields.length > 0 ? all : leaves;
  const paths = fields.length > 0 ? [...new Set(fields.flatMap((path) => listedPaths(path, all, leaves)))] : Object.keys(leaves).sort();
  const time = timeField === undefined ? undefined : all[timeField];
  const lines = [`**${hit._index}**${isMissing(time) ? "" : ` · ${formatValue(time)}`}`];
  for (const path of paths) {
    const value = source[path];
    if (isMissing(value)) continue;
    const masked = underMask(path) ? MASK : maskValue(path, expandStructured(value), isMasked, valueMasks);
    lines.push(...fieldLines(path, value, masked));
  }
  // A ")" in the index or id would end the Markdown link early.
  lines.push(`[${linkLabel}](${docUrl.replace(/[()]/g, (paren) => (paren === "(" ? "%28" : "%29"))})`);
  return lines.join("\n");
}

/**
 * A listed path that is not a field itself (e.g. `context`) stands for every raw leaf under it. Inside JSON or XML
 * text there are no raw leaves, so a listed element (e.g. `request.Envelope.Body`) stands for the outermost parsed
 * paths under it; JSON or XML text below them stays whole, as everywhere else in this copy (Plan 6 spec §5.4).
 */
function listedPaths(path: string, all: FieldMap, leaves: FieldMap): string[] {
  if (Object.hasOwn(all, path)) return [path];
  const under = (map: FieldMap): string[] => Object.keys(map).filter((leaf) => leaf.startsWith(`${path}.`)).sort();
  const raw = under(leaves);
  if (raw.length > 0) return raw;
  const parsed = under(all);
  return parsed.filter((leaf) => !parsed.some((parent) => leaf.startsWith(`${parent}.`)));
}

const isObjectArray = (value: unknown): boolean =>
  Array.isArray(value) && value.some((item) => typeof item === "object" && item !== null);

/** `raw` is the field's value, `value` the same expanded and masked: JSON and XML text become one json block (Plan 6 spec §5.4). */
function fieldLines(path: string, raw: unknown, value: unknown): string[] {
  const json = isPlainObject(value) || (Array.isArray(value) && (typeof raw === "string" || isObjectArray(value)));
  if (json) return [`- \`${path}\`:`, ...codeBlock(JSON.stringify(value, null, 2), "json")];
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
