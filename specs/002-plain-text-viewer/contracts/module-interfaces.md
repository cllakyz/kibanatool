# Contract: Module Interfaces That Change

The settings file, the storage key and the Kibana requests stay the same (FR-018). This contract
lists the exported internal signatures, the UI strings and the seed docs that change, so that
tasks and reviews can check them. Anything not listed keeps its signature. Decisions R1–R16 are in
[../research.md](../research.md).

## User Story 1 (`002-form-data`, 1.0.0)

### `src/core/form.ts` (new; R1)

```ts
export interface FormPair { rawKey: string; rawValue: string; key: string; value: string }
export function formPairs(text: string): FormPair[] | undefined;          // undefined: not form data; never throws
export function parseForm(text: string): Record<string, unknown> | undefined;
```

### `src/core/xml.ts` (R2)

```ts
export function groupRepeated(entries: [string, unknown][]): Record<string, unknown>;   // was inline in valueOf
```

### `src/core/fields.ts` (R3)

```ts
export const STRUCTURED_KINDS: readonly ["json", "xml", "form"];
export type StructuredKind = (typeof STRUCTURED_KINDS)[number];
export function parseStructured(text: string):
  { kind: StructuredKind; value: Record<string, unknown> | unknown[] } | undefined;
export function parseStructuredText(text: string): Record<string, unknown> | unknown[] | undefined;   // = parseStructured(text)?.value
```

### `src/core/curl.ts` (R5)

```ts
buildCurl(hit, maskPatterns, valueMasks): string | undefined   // signature unchanged
// behavior: form text in a part, or nested in one, is masked pair by pair and stays form text;
// a form `query` string is appended to the URL; logs without form text give the same bytes as before
// internal: maskPart returns { kind: "json" | "form" | undefined; value }, the kind read before masking
```

### `src/core/json-tree.ts` (R6)

```ts
export interface JsonField { path: string; value: Record<string, unknown> | unknown[]; source: StructuredKind }
```

### `src/content/JsonView.tsx` (R6)

The list label is `path` for JSON, `path · XML` for XML and `path · ${t("panelKindForm")}` for form.

### Strings

`panelKindForm` added to both locale files.

### Seed

`app-033` added (data-model.md, "Seed contract").

## User Story 2 (`002-text-view`, 1.1.0)

### `src/core/mask.ts` (R8)

```ts
export const escapeRegExp: (text: string) => string;   // was private
```

### `src/core/json-tree.ts` (R7, R8)

```ts
export const TEXT_VIEW_MIN_LENGTH = 500;
export function isMultiLine(text: string): boolean;                             // listing and initial wrapping
export type PanelField =
  | { path: string; kind: StructuredKind; value: Record<string, unknown> | unknown[] }
  | { path: string; kind: "text"; text: string };
export function panelFields(source: Record<string, unknown>): PanelField[];   // replaces jsonTextFields
export function searchPattern(query: string): RegExp | undefined;             // "iu", never "g"
export function matchPaths(rows: JsonRow[], query: string): string[];          // now uses searchPattern
export function textMatches(text: string, query: string): [start: number, end: number][];
export function textSegments(text: string, matches: [number, number][]):
  { text: string; match?: number }[];                                          // match = index into matches
```

### `src/content/JsonView.tsx` (R9)

```ts
export interface JsonViewProps { fields: PanelField[]; onCopy: (text: string) => void; onClose: () => void }
// internal: SearchBar (shared by JsonTree and TextBody), TextBody
```

### `src/content/ActionBar.tsx` (R12)

`panelFields` replaces `jsonTextFields`. The button label is `t("viewButton")`, and the panel is
wrapped in `PanelBoundary`.

### Strings

- `jsonButton` is renamed to `viewButton`.
- `panelKindText` and `textWrap` are added to both locale files.

### Seed

`app-034` added (data-model.md, "Seed contract").

### Version

`package.json` 1.1.0.
