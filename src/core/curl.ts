// "Copy as cURL" (Plan 7 spec): the HTTP request a log records, written as a bash command that sends it again.
import { isMissing, isPlainObject, parseStructuredText } from "./fields";
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

/** Like expandStructured: at most five texts are opened one inside another (spec §5.6). */
const MAX_TEXT_DEPTH = 5;

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
  const part = (name: string): unknown => maskPart(path(name), fields[name], isMasked, valueMasks);
  const method = String(maskValue(path("method"), fields.method, isMasked, valueMasks)).trim().toUpperCase();
  const url = String(maskValue(path("url"), fields.url, isMasked, valueMasks));

  const headers = headerLines(part("headers"));
  const contentType = headers.find(([name]) => name.toLowerCase() === "content-type")?.[1].split(";")[0]?.trim().toLowerCase() ?? "";
  const body = bodyOptions(part("body"), contentType);
  const queryPart = part("query");
  const query = isPlainObject(queryPart) ? encodeQuery(queryPart) : "";
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

/** JSON text only: XML and HTML text stays text in the command (spec §5.6). */
const jsonOf = (text: string): Record<string, unknown> | unknown[] | undefined =>
  text.trim().startsWith("<") ? undefined : parseStructuredText(text);

/** Spec §5.6: the part's own JSON text is opened, so the command can read headers, form fields and query keys. */
function maskPart(path: string, value: unknown, isMasked: IsMasked, kinds: readonly ValueMaskKind[]): unknown {
  const json = typeof value === "string" ? jsonOf(value) : undefined;
  return maskKeepingText(path, json ?? value, isMasked, kinds, json === undefined ? 0 : 1);
}

/** maskValue's rules, but JSON text is masked inside and written back as JSON text, and other text stays text. */
function maskKeepingText(path: string, value: unknown, isMasked: IsMasked, kinds: readonly ValueMaskKind[], depth: number): unknown {
  if (isMasked(path)) return MASK;
  if (Array.isArray(value)) return value.map((item) => maskKeepingText(path, item, isMasked, kinds, depth));
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, maskKeepingText(`${path}.${key}`, item, isMasked, kinds, depth)]));
  }
  if (typeof value !== "string") return maskValue(path, value, isMasked, kinds);
  const json = jsonOf(value);
  if (json === undefined) return maskText(value, kinds);
  return depth >= MAX_TEXT_DEPTH ? MASK : JSON.stringify(maskKeepingText(path, json, isMasked, kinds, depth + 1));
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
