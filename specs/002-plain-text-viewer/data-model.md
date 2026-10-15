# Data Model: Plain-Text Request/Response Viewer

Nothing here is stored. The settings schema stays at version 3 (FR-018). These are the in-memory
shapes the feature adds or changes, the rules each one owns, and the seed contract. Decisions
R1–R16 are in [research.md](research.md).

## StructuredKind (User Story 1)

`STRUCTURED_KINDS = ["json", "xml", "form"] as const`, declared in `src/core/fields.ts`.

| Kind | Recognized when the trimmed text… | Value |
|---|---|---|
| `xml` | starts with `<` and is one well-formed element (Plan 6 §4.1, unchanged) | `{ <root>: … }` |
| `json` | starts with `{` or `[` and is a JSON object or array (unchanged) | the object or array |
| `form` | starts with anything else and passes the form rule below | `{ key: value \| value[] }` |

The three kinds are disjoint by their first character. Every consumer gets the kind from
`parseStructured`.

## FormPair (User Story 1)

One `key=value` pair of form text, as `formPairs` returns it:

| Field | Meaning |
|---|---|
| `rawKey` | the key as written, still encoded |
| `rawValue` | the value as written, still encoded; may be empty and may contain `=` |
| `key` | `rawKey` decoded |
| `value` | `rawValue` decoded |

Decoding turns `+` into a space and then resolves percent-escapes.

**The form rule** (FR-001, R1). Text counts as form data only when all of these hold:
- it has no whitespace;
- it splits on `&` into two or more pairs, none of them empty;
- every pair has an `=`;
- every raw key starts with a letter, a digit, `_` or `%XX`, and then uses only letters, digits,
  `_ . - [ ]` and `%XX`;
- every percent-escape decodes.

Otherwise `formPairs` returns `undefined`. It never throws.

**Conversion** (FR-002): `parseForm` maps the pairs to `groupRepeated([key, value]…)`.
- Keys keep the order they first appear in, and stay flat.
- A repeated key becomes a list in order.
- Values are always strings.

## Panel entry (User Story 1 → User Story 2)

User Story 1 extends today's `JsonField` with one kind:

```text
{ path: string; value: object | unknown[]; source: StructuredKind }   // source now includes "form"
```

User Story 2 renames it to the panel entry. `panelFields(source)` returns one per listed field, in
`_source` order:

```text
| { path: string; kind: StructuredKind; value: object | unknown[] }   // opens as a tree
| { path: string; kind: "text"; text: string }                        // opens as text
```

**A string `_source` leaf becomes a text entry** (FR-007, R7) when both of these hold:
- `parseStructured(text)` is `undefined`;
- `isMultiLine(text)` (`/[\r\n]/.test(text.trim())`) is true, or `text.length >=
  TEXT_VIEW_MIN_LENGTH`, which is 500.

Array items and strings inside a tree are not listed.

**Tag** (FR-008):
- `json`: none;
- `xml`: `· XML`;
- `form`: `· <panelKindForm>`;
- `text`: `· <panelKindText>`.

**Wrapping** (FR-011): a text entry opens unwrapped when `isMultiLine(text)` is true, and wrapped
otherwise. This is the same predicate the listing uses. The user's toggle applies to the open text only and is not remembered.

## Search match (User Story 2)

`searchPattern(query)` returns `new RegExp(escapeRegExp(query.trim()), "iu")`, or `undefined` for a
blank query. It is not global, so `.test()` keeps no state between rows. It is the one definition
of a match:
- the tree matches a row when `pattern.test` finds its key or its primitive value;
- the text view takes a global copy of the pattern and matches every occurrence. Offsets are
  `[start, end)` in the original text, never in a lower-cased copy.

The active match index wraps around in both directions.

## cURL form masking (User Story 1, FR-005, R5)

`maskForm(path, text)` walks the text's `formPairs`:

| Pair | Written as |
|---|---|
| `isMasked(path.key)` | `rawKey=***` |
| the masked decoded value equals the decoded value | `rawKey=rawValue`, byte for byte |
| the masked value differs (a value mask hit, or JSON text masked inside) | `rawKey=encodeURIComponent(masked)` |

Pairs keep their order and are joined with `&`. The depth works as for JSON text: form text
nested at the cap becomes `***` whole.

In `buildCurl`, `maskPart` returns `{ kind, value }`, with the part's kind taken before masking:
- a `body` part whose kind is `form` goes out as `--data-raw '<maskForm result>'`;
- a `query` part whose kind is `form` is appended to the URL, and any other query string is
  dropped as today;
- a `json` part is opened into an object, as today.

## UI strings

| Key | English | Turkish | Story |
|---|---|---|---|
| `panelKindForm` | form | form | US1 |
| `viewButton` (was `jsonButton`) | View | Görüntüle | US2 |
| `panelKindText` | text | metin | US2 |
| `textWrap` | Wrap lines | Satırları kaydır | US2 |

Reused, unchanged: `jsonChooseField`, `jsonBack`, `jsonClose`, `jsonSearch`, `jsonPrevious`,
`jsonNext`, `jsonMatchCount`, `jsonNoMatches`, `jsonCopyValue`.

## Seed contract (`docker/seed.mjs` ↔ `tests/e2e`)

Both docs follow Plan 7's pattern for `app-031`/`app-032`. Each is older than every other `app_log`
doc (`minutesBefore(200 + n)`) and owned by user `100009`, so the rows, counts and windows that
other specs depend on stay the same.

| Doc | Story | Fields the e2e tests rely on |
|---|---|---|
| `app-033` (`extra.uid: uid-033`) | US1 | `context.options.body = "username=dev&password=synthetic-pass&grant_type=password"` |
| `app-034` (`extra.uid: uid-034`) | US2 | `context.output`: about 6 lines with a box-drawing table and the word `synced` twice. `context.error`: one line of at least 500 characters. |
