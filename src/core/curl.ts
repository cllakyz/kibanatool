// "Copy as cURL" (Plan 7 spec): the HTTP request a log records, written as a bash command that sends it again.
import { MAX_TEXT_DEPTH, isMissing, isPlainObject, parseStructured } from "./fields";
import { formPairs } from "./form";
import { MASK, maskMatcher, maskValue } from "./mask";
import { isHttpUrl } from "./template";
import type { RawHit } from "./types";
import { type ValueMaskKind, maskText } from "./value-mask";

/** Where the request fields sit: under `context` (Monolog) or at the root of `_source` (spec §4). */
export type RequestPrefix = "context" | "";

const PREFIXES: readonly RequestPrefix[] = ["context", ""];

/**
 * Transport, proxy and CDN headers: curl sets them itself or they only repeat the old hop (spec §5.4). Also
 * Symfony's `php-auth-*`, the server-made copies of a Basic or Digest `Authorization` (user and password in clear).
 */
const DROPPED_HEADER = /^(?:host|content-length|connection|accept-encoding|forwarded|x-forwarded-.*|x-real-ip|cf-.*|cdn-loop|x-php-ob-level|php-auth-.*)$/i;

type IsMasked = (path: string) => boolean;

function fieldsAt(source: Record<string, unknown>, prefix: RequestPrefix): Record<string, unknown> | undefined {
  const fields = prefix === "" ? source : source[prefix];
  return isPlainObject(fields) ? fields : undefined;
}

/** Spec §4: the first prefix with a method and an http(s) url; undefined when the log records no request. */
export function requestPrefix(source: Record<string, unknown>): RequestPrefix | undefined {
  return PREFIXES.find((prefix) => {
    const fields = fieldsAt(source, prefix);
    return typeof fields?.method === "string" && fields.method.trim() !== "" && typeof fields.url === "string" && isHttpUrl(fields.url);
  });
}

/** Spec §5: the command, masked like the other copies; undefined when the log records no request. */
export function buildCurl(hit: RawHit, maskPatterns: string[], valueMasks: readonly ValueMaskKind[]): string | undefined {
  const source = hit._source ?? {};
  const prefix = requestPrefix(source);
  const fields = prefix === undefined ? undefined : fieldsAt(source, prefix);
  if (prefix === undefined || fields === undefined) return undefined;
  const isMasked = maskMatcher(maskPatterns);
  const path = (name: string): string => (prefix === "" ? name : `${prefix}.${name}`);
  const part = (name: string) => maskPart(path(name), fields[name], isMasked, valueMasks);
  const method = String(maskValue(path("method"), fields.method, isMasked, valueMasks)).trim().toUpperCase();
  const url = String(maskValue(path("url"), fields.url, isMasked, valueMasks));

  const headers = headerLines(part("headers").value);
  const contentType = headers.find(([name]) => name.toLowerCase() === "content-type")?.[1].split(";")[0]?.trim().toLowerCase() ?? "";
  const body = bodyOptions(part("body").value, contentType);
  const queryPart = part("query");
  // Spec 002 FR-005: a form-text query goes on the URL as masked form text; any other text query is dropped.
  const query = isPlainObject(queryPart.value)
    ? encodeQuery(queryPart.value)
    : queryPart.kind === "form" && queryPart.value !== MASK
      ? String(queryPart.value)
      : "";
  const target = query === "" ? url : `${url}${url.includes("?") ? "&" : "?"}${query}`;
  // curl sets a multipart content type with its own boundary (spec §5.5).
  const multipart = body.some((option) => option.startsWith("--form-string"));
  const sent = headers.filter(([name]) => !DROPPED_HEADER.test(name) && !(multipart && name.toLowerCase() === "content-type"));

  const options = [
    ...(/[[\]{}]/.test(target) ? ["--globoff"] : []),
    ...(method === (body.length > 0 ? "POST" : "GET") ? [] : [`-X ${quote(method)}`]),
    ...sent.map(([name, value]) => `-H ${quote(`${name}: ${value}`)}`),
    ...body,
    ...(headers.some(([name]) => name.toLowerCase() === "accept-encoding") ? ["--compressed"] : []),
  ];
  return [`curl ${quote(target)}`, ...options].join(" \\\n  ");
}

/** Bash single quotes: nothing inside is special, and a quote is closed, escaped and reopened (spec §5.1). */
const quote = (text: string): string => `'${text.replace(/'/g, "'\\''")}'`;

/**
 * Spec §5.6: the part's own JSON text is opened, so the command can read headers, form fields and query keys. Form text
 * stays text (spec 002 FR-005); `kind` is the part's kind before masking, since a value mask can make plain text look
 * like form text.
 */
function maskPart(
  path: string,
  value: unknown,
  isMasked: IsMasked,
  kinds: readonly ValueMaskKind[],
): { kind: "json" | "form" | undefined; value: unknown } {
  const parsed = typeof value === "string" ? parseStructured(value) : undefined;
  if (parsed?.kind === "json") return { kind: "json", value: maskKeepingText(path, parsed.value, isMasked, kinds, 1) };
  return { kind: parsed?.kind === "form" ? "form" : undefined, value: maskKeepingText(path, value, isMasked, kinds, 0) };
}

/**
 * maskValue's rules, except that JSON text is masked inside and written back as JSON text, form text likewise as form
 * text (spec 002 FR-005), and other text, XML and HTML included, keeps only the value masks (spec §5.6).
 */
function maskKeepingText(path: string, value: unknown, isMasked: IsMasked, kinds: readonly ValueMaskKind[], depth: number): unknown {
  if (isMasked(path)) return MASK;
  if (Array.isArray(value)) return value.map((item) => maskKeepingText(path, item, isMasked, kinds, depth));
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, maskKeepingText(`${path}.${key}`, item, isMasked, kinds, depth)]));
  }
  if (typeof value !== "string") return maskValue(path, value, isMasked, kinds);
  const parsed = parseStructured(value);
  if (parsed === undefined || parsed.kind === "xml") return maskText(value, kinds);
  if (depth >= MAX_TEXT_DEPTH) return MASK;
  return parsed.kind === "json"
    ? JSON.stringify(maskKeepingText(path, parsed.value, isMasked, kinds, depth + 1))
    : maskForm(path, value, isMasked, kinds, depth + 1);
}

/**
 * Form text masked pair by pair and written back as form text, so the request can still be sent (spec 002 FR-005;
 * constitution II's exception: it differs from maskValue on purpose). A pair whose value stays the same keeps its raw
 * bytes, so only masked values are re-encoded.
 */
function maskForm(path: string, text: string, isMasked: IsMasked, kinds: readonly ValueMaskKind[], depth: number): string {
  return (formPairs(text) ?? [])
    .map(({ rawKey, rawValue, key, value }) => {
      if (isMasked(`${path}.${key}`)) return `${rawKey}=${MASK}`;
      const masked = maskKeepingText(`${path}.${key}`, value, isMasked, kinds, depth);
      return masked === value ? `${rawKey}=${rawValue}` : `${rawKey}=${encodeURIComponent(String(masked))}`;
    })
    .join("&");
}

/** Spec §4: one [name, value] per header value, in log order; a list gives one per item. */
function headerLines(headers: unknown): [string, string][] {
  if (!isPlainObject(headers)) return [];
  return Object.entries(headers).flatMap(([name, value]) =>
    (Array.isArray(value) ? value : [value])
      .filter((item) => typeof item === "string" || typeof item === "number")
      .map((item): [string, string] => [name, String(item)]),
  );
}

/** Spec §5.5: the options that send the body, chosen by its content type. */
function bodyOptions(body: unknown, contentType: string): string[] {
  if (isMissing(body) || (isPlainObject(body) && Object.keys(body).length === 0)) return [];
  if (!Array.isArray(body) && !isPlainObject(body)) return [`--data-raw ${quote(String(body))}`];
  if (contentType === "application/x-www-form-urlencoded") return [`--data-raw ${quote(encodeQuery(body))}`];
  if (contentType === "multipart/form-data") {
    return leaves(body).map(([name, value]) => `--form-string ${quote(`${fieldName(name, (part) => part)}=${value}`)}`);
  }
  return [`--data-raw ${quote(JSON.stringify(body))}`];
}

/** PHP http_build_query's leaves (spec §5.3): `a[b][0]`; true is 1, false 0; null and empty lists drop out. */
function leaves(value: unknown, path: string[] = []): [string[], string][] {
  if (Array.isArray(value) || isPlainObject(value)) return Object.entries(value).flatMap(([key, item]) => leaves(item, [...path, key]));
  if (value === null || value === undefined) return [];
  return [[path, typeof value === "boolean" ? (value ? "1" : "0") : String(value)]];
}

const fieldName = ([first = "", ...rest]: string[], encode: (part: string) => string): string =>
  encode(first) + rest.map((part) => `[${encode(part)}]`).join("");

/** Names and values percent-encoded, brackets left as they are (spec §5.3). */
const encodeQuery = (value: unknown): string =>
  leaves(value)
    .map(([name, item]) => `${fieldName(name, encodeURIComponent)}=${encodeURIComponent(item)}`)
    .join("&");
