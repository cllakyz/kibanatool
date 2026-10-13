// XML text as JSON (Plan 6 spec §4): a small, strict parser for the request and response bodies in logs.
// No DTDs and no entities beyond the five predefined and numeric ones, so nothing is fetched or expanded.

type Entry = [key: string, value: unknown];

interface Element {
  name: string;
  /** Attributes first, then child elements, in document order. */
  entries: Entry[];
  text: string[];
  hasChildren: boolean;
}

/** Spec §4.3: deeper XML stays text, since every consumer walks the result recursively. */
const MAX_DEPTH = 100;
const NAME = /[\p{L}_:][\p{L}\p{M}\p{N}_:.·-]*/uy;
const PREDEFINED = new Map([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["apos", "'"],
]);

/** `{ <root's local name>: value }` when `text` is one well-formed XML element, otherwise undefined (spec §4.1). */
export function parseXml(text: string): Record<string, unknown> | undefined {
  const source = text.trim();
  if (!source.startsWith("<")) return undefined;
  const stack: Element[] = [];
  let root: Entry | undefined;
  let i = 0;
  while (i < source.length) {
    const top = stack.at(-1);
    if (source[i] !== "<") {
      const end = source.indexOf("<", i);
      const run = decode(source.slice(i, end < 0 ? undefined : end));
      if (run === undefined || (!top && run.trim() !== "")) return undefined;
      top?.text.push(run);
      i = end < 0 ? source.length : end;
    } else if (source.startsWith("<!--", i) || source.startsWith("<?", i)) {
      const close = source[i + 1] === "?" ? "?>" : "-->";
      const end = source.indexOf(close, i + 2);
      if (end < 0) return undefined;
      i = end + close.length;
    } else if (source.startsWith("<![CDATA[", i)) {
      const end = source.indexOf("]]>", i + 9);
      if (!top || end < 0) return undefined;
      top.text.push(source.slice(i + 9, end));
      i = end + 3;
    } else if (source[i + 1] === "!") {
      return undefined; // DOCTYPE and other declarations
    } else if (source[i + 1] === "/") {
      const name = readName(source, i + 2);
      if (!top || name !== top.name) return undefined;
      i = skipSpace(source, i + 2 + name.length);
      if (source[i] !== ">") return undefined;
      i++;
      stack.pop();
      root = attach(stack, top) ?? root;
    } else {
      if ((!top && root) || stack.length >= MAX_DEPTH) return undefined;
      const tag = readTag(source, i);
      if (!tag) return undefined;
      i = tag.end;
      if (tag.selfClosing) root = attach(stack, tag.element) ?? root;
      else stack.push(tag.element);
    }
  }
  return stack.length === 0 && root ? Object.fromEntries([root]) : undefined;
}

/** Adds a closed element to its parent; returns its entry when it is the root. */
function attach(stack: Element[], element: Element): Entry | undefined {
  const entry: Entry = [element.name.slice(element.name.lastIndexOf(":") + 1), valueOf(element)];
  const parent = stack.at(-1);
  if (!parent) return entry;
  parent.entries.push(entry);
  parent.hasChildren = true;
  return undefined;
}

/** Spec §4.2: text alone, or an object of `@attributes`, children and `#text`. */
function valueOf(element: Element): unknown {
  if (element.entries.length === 0) return element.text.join("");
  const text = (element.hasChildren ? element.text.filter((run) => run.trim() !== "") : element.text).join("");
  const entries: Entry[] = text.trim() === "" ? element.entries : [...element.entries, ["#text", text]];
  // A repeated key becomes an array at the place it first appeared; fromEntries keeps "__proto__" an own key.
  const grouped = new Map<string, unknown[]>();
  for (const [key, value] of entries) {
    const values = grouped.get(key);
    if (values) values.push(value);
    else grouped.set(key, [value]);
  }
  return Object.fromEntries([...grouped].map(([key, values]) => [key, values.length > 1 ? values : values[0]]));
}

function readTag(source: string, start: number): { element: Element; end: number; selfClosing: boolean } | undefined {
  const name = readName(source, start + 1);
  if (!isQualified(name)) return undefined;
  const element: Element = { name, entries: [], text: [], hasChildren: false };
  const seen = new Set<string>();
  let i = start + 1 + name.length;
  for (;;) {
    const next = skipSpace(source, i);
    if (source[next] === ">") return { element, end: next + 1, selfClosing: false };
    if (source.startsWith("/>", next)) return { element, end: next + 2, selfClosing: true };
    const attribute = readName(source, next);
    if (next === i || !isQualified(attribute) || seen.has(attribute)) return undefined;
    seen.add(attribute);
    const equals = skipSpace(source, next + attribute.length);
    if (source[equals] !== "=") return undefined;
    const open = skipSpace(source, equals + 1);
    const quote = source[open];
    if (quote !== '"' && quote !== "'") return undefined;
    const close = source.indexOf(quote, open + 1);
    if (close < 0) return undefined;
    const raw = source.slice(open + 1, close);
    const value = raw.includes("<") ? undefined : decode(raw);
    if (value === undefined) return undefined;
    if (attribute !== "xmlns" && !attribute.startsWith("xmlns:")) {
      element.entries.push([`@${attribute.slice(attribute.lastIndexOf(":") + 1)}`, value]);
    }
    i = close + 1;
  }
}

function readName(source: string, start: number): string {
  NAME.lastIndex = start;
  return NAME.exec(source)?.[0] ?? "";
}

/** A name whose part after the prefix is itself a name, so `<a:>` and `<a:1>` are rejected. */
function isQualified(name: string): boolean {
  return /^[\p{L}_]/u.test(name.slice(name.lastIndexOf(":") + 1));
}

function skipSpace(source: string, start: number): number {
  let i = start;
  while (source[i] === " " || source[i] === "\t" || source[i] === "\n" || source[i] === "\r") i++;
  return i;
}

/** Resolves the predefined and numeric entities; undefined for any other `&`. */
function decode(raw: string): string | undefined {
  if (!raw.includes("&")) return raw;
  let valid = true;
  const text = raw.replace(/&(#x[0-9A-Fa-f]+|#[0-9]+|[A-Za-z]+)?(;?)/g, (match, body: string | undefined, semicolon: string) => {
    const char = body !== undefined && semicolon === ";" ? entity(body) : undefined;
    if (char === undefined) valid = false;
    return char ?? match;
  });
  return valid ? text : undefined;
}

function entity(body: string): string | undefined {
  if (!body.startsWith("#")) return PREDEFINED.get(body);
  const code = body[1] === "x" ? Number.parseInt(body.slice(2), 16) : Number(body.slice(1));
  const valid = code > 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff);
  return valid ? String.fromCodePoint(code) : undefined;
}
