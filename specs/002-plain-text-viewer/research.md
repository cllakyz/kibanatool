# Research: Plain-Text Request/Response Viewer

All decisions below were checked against the code at `5deb7df` (main after PR #9). The user made
three of them during planning: the release split (R16), the branch setup (R16) and the store
listing (R15). The cURL dispatch (R5) and the key-start rule (R1) follow from decisions the user had
already made. The Technical Context had no open questions left.

## R1 — Form recognition rule (FR-001, FR-002)

- **Decision**: a new core module, `src/core/form.ts`, owns the rule.
  - `formPairs(text)` returns the pairs, or `undefined` when the text is not form data. Each pair
    keeps both its raw and its decoded key and value.
  - `parseForm(text)` builds the object from those pairs.

  Recognition works on the trimmed text:
  1. The text has no whitespace and contains `&`. It is split on `&` into two or more pairs, and
     no pair is empty.
  2. Each pair is split on its first `=`. A pair without `=` rejects the text.
  3. The raw key MUST match `^(?:[\p{L}\p{N}_]|%[0-9A-Fa-f]{2})(?:[\p{L}\p{N}_.\-[\]]|%[0-9A-Fa-f]{2})*$`
     (`u` flag). It starts with a letter, a digit, `_` or a percent-escape, never with a bracket.
  4. To decode a key or value, `+` becomes a space, then `decodeURIComponent` runs inside
     `try/catch`. A throw (bad escape or broken UTF-8) rejects the text.

  The checks MUST run in this order: first the cheap whole-text scans (no whitespace, contains
  `&`), then the per-pair split, the key regex and decoding. Every string leaf passes through this
  rule in the Markdown and JSON copies and in `maskValue`, so ordinary text has to be rejected
  before any regex or decoding runs. The rule never throws.
- **Rationale**: two or more pairs separate forms from the single `k=v` tokens the measurement
  found everywhere (tracestate, cookies, IDs). The key alphabet excludes `:`, `/`, `?` and `;`, so
  URLs, cookie headers and base64 never match. Because a key never starts with `[`, form text can
  never start with `{`, `[` or `<`, which keeps FR-006 true and lets one first-character dispatch
  pick the kind (R3).
- **Alternatives**:
  - `URLSearchParams`. Rejected: it accepts anything and never rejects bad input, and it decodes
    `%zz` silently.
  - Nesting `a[b]` keys the way PHP does. Rejected: no such form text was measured (spec
    Assumptions).

## R2 — Repeated keys (FR-002)

- **Decision**: the rule "a repeated key becomes a list, at the place it first appeared" is
  extracted from `xml.ts`'s `valueOf` into an exported `groupRepeated(entries)` in `xml.ts`.
  `form.ts` imports it.
- **Rationale**: principle II requires one implementation of one rule. Principle III forbids
  sibling imports *only to reach a type*. This is a function import, so it is allowed. The
  function stays where the rule was first written (Plan 6 spec §4.2), and no file is added.
- **Alternatives**:
  - A neutral `entries.ts`. Rejected: one more module for a single six-line function.
  - A second copy in `form.ts`. Rejected by principle II.

## R3 — One structured-text rule (FR-003, FR-006)

- **Decision**: `src/core/fields.ts` gains:
  - `STRUCTURED_KINDS = ["json", "xml", "form"] as const`;
  - `type StructuredKind = (typeof STRUCTURED_KINDS)[number]`;
  - `parseStructured(text): { kind: StructuredKind; value: Record<string, unknown> | unknown[] } |
    undefined`.

  The dispatch looks at the first character of the trimmed text: `<` → XML, `{` or `[` → JSON,
  anything else → form. `parseStructuredText(text)` becomes `parseStructured(text)?.value`, so its
  callers keep working unchanged.
- **Rationale**: one owner decides what counts as structured text, as principle II requires. A
  closed set is declared once as an `as const` array. Consumers that need the kind (the panel tag,
  cURL) read it from the same call instead of re-testing `isXmlText`.
- **Alternatives**: a separate `isFormText` that each consumer calls. Rejected: that restates the
  dispatch in every consumer.

## R4 — Field map, templates, conditions, Markdown, JSON copy, masks (FR-003, FR-004)

- **Decision**: no change to `flattenInto`, `expandStructured`, `markdown.ts`, `json-copy.ts` or
  `mask.ts`. They already go through `parseStructuredText`, so form text now opens everywhere:
  - in the field map, so templates and conditions can use `{…body.grant_type}`;
  - in the Markdown copy, as a json block (`fieldLines` sees an object);
  - in the JSON copy, expanded;
  - in masking: `*password*` matches `…body.password`.

  Form text left past the depth cap becomes `***` whole in `maskValue`, the same as Plan 6's ruling
  for JSON and XML (spec §5.5). Each of these paths gets a unit test.
- **Rationale**: this is the point of FR-003. The leak closes with no change in the copy code.
- **Alternatives**: none. A per-consumer change would break principle II.

## R5 — cURL kind dispatch (FR-005, FR-019)

Once form joins the shared rule, `curl.ts` changes behavior in three places. `jsonOf` is "the
shared rule minus XML", so today it would quietly start returning parsed forms. Each place gets an
explicit branch and a unit test:

1. **`maskKeepingText`.** Today a parsed string is written back with `JSON.stringify`. A form
   string would turn into JSON text.
   - **Decision**: branch on the kind:
     - `json`: masked inside and written back with `JSON.stringify`, as today.
     - `form`: masked pair by pair (`maskForm`, below) and written back as form text.
     - `xml` and text that does not parse: value masks only, as today.
   - Past the depth cap, JSON and form text become `***` whole.
2. **`maskPart` when the body is form text.** Today it would parse the text to an object. Then
   `bodyOptions` either rewrites it PHP-style (urlencoded content type) or sends it as JSON (no
   content type).
   - **Decision**: `maskPart` opens only JSON text into an object. Form text comes back as the
     masked form *string*, so `bodyOptions` sends it as `--data-raw '<masked form>'` under every
     content type.
3. **The `query` part when it is form text.** Today a string query is dropped.
   - **Decision**: `maskPart` returns `{ kind, value }`, where `kind` is the part's own
     structured kind (`"json"`, `"form"` or `undefined`) as the shared rule saw it *before*
     masking. `buildCurl` appends a query string only when `kind` is `"form"`. A query object is
     still encoded, and any other string is still dropped.
   - The masked string is not tested again: a value mask can remove the whitespace that kept a
     plain text from being form data (`a=1&b=0555 000 00 00` → `a=1&b=***`).

**`maskForm(path, text)`** walks `formPairs(text)`:
- When `isMasked(path.key)` matches, the raw value becomes `***`.
- Otherwise the decoded value goes through `maskKeepingText(path.key, value, …, depth + 1)`, so
  JSON text inside a form value is handled too.
- An unchanged value keeps its raw bytes. A changed value is written with `encodeURIComponent`.
- Raw keys and the pair order are always kept.

- **Rationale**: FR-005 asks for "same encoding"; FR-019 asks for byte-for-byte equality for logs
  without form text. Keeping raw bytes for unchanged pairs gives both, with no re-encoding drift.
  Plan 7's Alpha data has no form text in action logs, so the existing cURL e2e output is unchanged.
- **Alternatives**:
  - Parse to an object and re-encode with `encodeQuery`. Rejected: it groups repeated keys, so
    the order changes, and it re-encodes untouched values.
  - Leave form text with value masks only, Plan 7's XML rule. Rejected by the user (clarification
    2).

## R6 — Panel tag for form fields (User Story 1)

- **Decision**: `JsonField.source` becomes `StructuredKind`, so it now includes `"form"`.
  `jsonTextFields` takes the kind from `parseStructured`. `JsonView` shows `path · XML` as today and
  `path · <t("panelKindForm")>` for form fields. The button keeps the "JSON" label in 1.0.0.
- **Rationale**: this is the smallest change that keeps User Story 1 shippable alone (spec
  clarification 1). The tag is localized because FR-015 requires every new string in both
  languages. "XML" stays hard-coded because it is a proper noun.

## R7 — Which fields are text fields (FR-007, User Story 2)

- **Decision**: `json-tree.ts` exports `TEXT_VIEW_MIN_LENGTH = 500` and `isMultiLine(text)`
  (`/[\r\n]/.test(text.trim())`). `jsonTextFields` is renamed `panelFields`. It walks
  `flattenSource(source, false)` once, in field order, and returns one entry per string leaf:
  - a structured entry (with its kind) when `parseStructured` succeeds;
  - otherwise a text entry when `isMultiLine(text)` or `text.length >= TEXT_VIEW_MIN_LENGTH`.

  `TextBody` calls the same `isMultiLine` for its initial wrapping (R9), so "multi-line" has one
  definition.

  The entry type is a union:
  `{ path; kind: StructuredKind; value: object | array } | { path; kind: "text"; text: string }`.
  Only string leaves count. Array items and strings inside a tree are not listed (spec
  Assumptions).
- **Rationale**: there is one walk, so field order comes for free (FR-008). The threshold is one
  shared constant (principle II). The union keeps a tree value and a raw text from being mixed up.
- **Alternatives**: a second walk for text fields, merged by path. Rejected: it does more work and
  the order is harder to get right.

## R8 — One search matcher for tree and text (FR-012, User Story 2)

- **Decision**: `mask.ts` exports its existing `escapeRegExp`. `json-tree.ts` adds
  `searchPattern(query): RegExp | undefined`, which returns `new RegExp(escapeRegExp(query.trim()),
  "iu")` or `undefined` for a blank query. The pattern is deliberately **not** global: a `g` regex
  keeps `lastIndex` between `.test()` calls, so testing row after row would alternate between hit
  and miss.
  - `matchPaths` (tree) switches from `toLowerCase().includes` to `pattern.test(…)`. A unit test
    checks two consecutive matching rows.
  - `textMatches(text, query)` builds its own global copy (`new RegExp(pattern.source,
    pattern.flags + "g")`) and returns `[start, end]` offsets from `text.matchAll`.
  - `textSegments(text, matches)` splits the text into plain and matched runs for rendering.
- **Rationale**: one rule decides what a match is (principle II), and `escapeRegExp` is reused
  rather than rewritten. Offsets come from the original string. A lower-cased copy can change
  length: `"İ".toLowerCase()` is two code units, which would misplace every later highlight in
  Turkish text. The tree's switch lands in User Story 2, so the 1.0.0 search is untouched.
- **Alternatives**: keep `toLowerCase` for the tree and use regex only for text. Rejected: two
  definitions of a match.

## R9 — The text view (FR-010 – FR-014)

- **Decision**: a `TextBody` component in `src/content/JsonView.tsx`, next to `JsonTree`. The
  search row (input, status, ↑/↓, Enter/Shift+Enter) moves into a shared `SearchBar` component,
  which both `JsonTree` and `TextBody` use; principle III says one UI shape is one component.
  `TextBody`:
  - renders `<pre className="kt-text" tabIndex={0} role="region" aria-label={path}>`;
  - fills it with `textSegments` output, where matches are `<mark>` and the active one carries
    `data-active`;
  - starts unwrapped when `isMultiLine(text)` is true and wrapped otherwise (clarification 4);
  - has a wrap toggle with `aria-pressed` and the label `t("textWrap")`;
  - copies the whole text through the existing `onCopy` and the existing `t("jsonCopyValue")`
    label;
  - after each step, scrolls the active `<mark>` into view with `{ block: "nearest", inline:
    "nearest" }`.

  Text reaches the DOM only as React text children. There is no `innerHTML` (FR-010, CLAUDE.md
  trap).
- **Rationale**: this reuses the panel's head, close and back controls and the copy notice.
  `<pre>` keeps whitespace and box-drawing characters. `tabIndex` makes the scrollable region
  keyboard-scrollable (FR-014). happy-dom implements `scrollIntoView`, so component tests can run.

## R10 — Highlight volume (SC-004)

- **Decision**: every match is highlighted. `textMatches` and `textSegments` are memoized on
  `(text, query)`, so stepping between matches changes only the active marker. The worst case is
  a one-letter query on a 100 KB text: roughly 10k `<mark>` elements. The quickstart checks it.
  If it misses one second, highlighting is capped at 1,000 rendered marks: the count stays exact
  and the active match is always marked. The cap gets a `ponytail:` comment.
- **Rationale**: the largest measured text is 8 KB (about 1/12 of the target), so a cap may never
  be needed. Measuring first avoids building one.

## R11 — Styles (FR-010, FR-011)

- **Decision**: the shadow-root styles gain the following, all with existing theme tokens:
  - `.kt-text`: no margin; mono font; `max-height: 420px`; `overflow: auto`; padding as
    `.kt-json-rows`; `white-space: pre` with `.kt-wrap` → `pre-wrap` and `overflow-wrap:
    anywhere`;
  - `.kt-text mark`: `background: var(--kt-match); color: inherit`;
  - `.kt-text mark[data-active]`: the row's warning outline.

  `tests/unit/theme.test.ts` gains the pair text-primary on match, for both themes.
- **Rationale**: `<mark>` and `<pre>` carry user-agent defaults (yellow on black, a margin, a serif
  monospace) that would break the dark theme. No new color is needed.

## R12 — Error containment (FR-017)

- **Decision**: a small class component, `PanelBoundary`, wraps the panel in `ActionBar`. On an
  error it renders nothing, logs `console.debug("[kibanatool] panel failed:", error)` and stays
  hidden for that document. The core functions do not throw (R1); a unit test feeds hostile text
  to prove it.
- **Rationale**: the root's `onUncaughtError` already keeps Kibana safe. Without a boundary, a
  render bug would still remove the whole bar. The boundary is about 15 lines.

## R13 — UI strings (FR-015)

- **Decision**:
  - User Story 1 adds `panelKindForm` ("form" / "form").
  - User Story 2:
    - renames `jsonButton` to `viewButton` and changes its text to "View" / "Görüntüle";
    - adds `panelKindText` ("text" / "metin") and `textWrap` ("Wrap lines" / "Satırları
      kaydır").

  The search, copy, back and close strings are reused. `i18n.test.ts` keeps the two locale files
  in step. Implementation added `textSearch` ("Search the text" / "Metinde ara") as the text
  view's search placeholder, because the tree's "Search keys and values" does not fit text.

## R14 — Seed and e2e (FR-016, SC-006)

- **Decision**:
  - **User Story 1 seed:** `docker/seed.mjs` adds `app-033`, an iys-like log with
    `context.options.body = "username=dev&password=synthetic-pass&grant_type=password"`. It is
    built with Plan 7's trick: older than every other `app_log` doc and owned by user `100009`, so
    no other spec's rows, counts or windows move.
  - **User Story 1 e2e:**
    - `json.spec.ts` checks the `· form` tag and the three keys;
    - `copy.spec.ts` checks that the Markdown and JSON copies of `app-033` show `***` for the
      password and keep `grant_type`.
  - **User Story 2 seed:** `app-034` gets a multi-line `context.output` (a small box-drawing
    table) and a single-line `context.error` of at least 500 characters.
  - **User Story 2 e2e:**
    - `json.spec.ts` checks the "View" label, the `· text` tag and that the table opens unwrapped;
    - wrap toggles;
    - a search counts its matches;
    - the copy matches the text.

  `capture.spec.ts` reads only `app-001`, so the fixtures stay valid. The stacks must be re-seeded
  with `./docker/up.sh N` before running e2e (`global-setup.ts` does not seed).
- **Rationale**: the seed is a contract with e2e (CLAUDE.md), and both change in the same commit.

## R15 — Docs (user decision: store listing in both stories)

- **User Story 1**:
  - **CHANGELOG `[1.0.0]`**: the XML bullet becomes "XML and form text". The cURL bullet notes
    that form text is masked inside.
  - **README**: an "XML" → "XML and form data" note on the two-pair rule.
  - **`docs/store-listing.md`**: the XML bullet in EN and TR names form data.
  - **CLAUDE.md**: the `src/core/` line names `form.ts`. A trap notes the two-pair and key-start
    rule.
  - **`docs/verification/2026-10-form-data.md`** (Turkish).
- **User Story 2**:
  - **Version**: stays 1.0.0 (spec clarification 2026-10-16). The text view joins the unreleased
    1.0.0, so there is no 1.1.0 section and no version bump.
  - **CHANGELOG `[1.0.0]`**: the "JSON view" bullet becomes the View panel, with a text-view bullet
    beside it.
  - **README**: a "Text view" section.
  - **Store listing**: a new bullet in EN and TR.
  - **CLAUDE.md**: the threshold and the search matcher.
  - **`docs/verification/2026-10-text-view.md`** (Turkish).

## R16 — Delivery (user decisions)

- **Decision**: two branches in sequence.
  1. `002-form-data` is cut from main and carries User Story 1, this spec-kit feature directory
     and `.specify/feature.json`. It is pushed, a PR is opened and the user merges it.
  2. `002-text-view` is cut from the updated main and carries User Story 2 in a second PR.

  `.specify/feature.json` keeps pointing at `specs/002-plain-text-viewer` on both branches.
  Nothing is committed, pushed or opened until the user asks.
- **Rationale**: this is the user's choice. 1.0.0 can ship once User Story 1 merges, without
  waiting for the text view.
