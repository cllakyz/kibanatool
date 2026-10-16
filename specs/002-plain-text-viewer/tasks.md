---

description: "Task list for the plain-text request/response viewer (form data, text view)"
---

# Tasks: Plain-Text Request/Response Viewer

**Input**: Design documents from `/specs/002-plain-text-viewer/`

**Prerequisites**: plan.md, spec.md (clarified 2026-10-15), research.md (R1–R16), data-model.md,
contracts/module-interfaces.md, quickstart.md

**Tests**: Included. The spec's success criteria and FR-019 need unit and e2e checks, and the
project keeps a test beside every core rule. Each test task is written first and must fail until
its implementation task lands.

**Organization**: One phase per user story, and each story is its own branch and pull request
(research R16):
- **US1** (`002-form-data`) ships in 1.0.0.
- **US2** (`002-text-view`) is cut from main only after the user has merged US1, and ships in
  1.1.0. *(Changed on 2026-10-16: both ship in 1.0.0, see spec clarifications.)*

**Ground rules for every task**:
- **Unchanged output for logs without form text (FR-019).** In US1, no existing expected value in
  `curl`, `markdown`, `json-copy`, `mask`, `json-tree`, `fields` or `xml` unit tests, nor in
  `tests/e2e/copy.spec.ts`, may change; tests are only added. In US2, internal names may change
  (`jsonTextFields` → `panelFields`, `source` → `kind`), but no copied text and no tree content.
- **Code style**: match the surrounding code: comment density, naming, and spec citations. Cite
  this feature as `spec 002 FR-xxx` or `research R<n>`. Never use `innerHTML`. `src/core` uses no
  browser API.
- **Commits**: end every message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. The
  repo's local git config already sets the commit email. Never push or open a PR without the
  user's yes.
- **Secrets**: `docker/.env.<major>` is sourced, never printed.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 or US2 from spec.md

---

## Phase 1: Setup

**Purpose**: The first branch and a green baseline.

- [X] T001 Create the US1 branch from an up-to-date `main`:
  - `git switch main && git pull`;
  - `git switch -c 002-form-data`.

  The uncommitted `specs/002-plain-text-viewer/` and `.specify/feature.json` come along; they are
  committed in T019. Confirm the baseline:
  - `npm run typecheck` is clean;
  - `npx vitest run` passes 459 tests.

  If either fails, stop and report.

---

## Phase 2: Foundational

**Purpose**: none. The shared structured-text rule (`parseStructured`) is part of US1, and US2
builds on US1 after it merges.

---

## Phase 3: User Story 1 - Form data opens like XML, and copies mask what it carries (Priority: P1) 🎯 MVP

**Goal**: Form-urlencoded text becomes the third structured-text kind. It opens in the panel tree,
the field map, the Markdown and JSON copies and masking. The cURL copy masks it inside and keeps it
as form text. Branch `002-form-data`, release 1.0.0.

**Independent Test**:
- Open seed doc `app-033` (`extra.uid:"uid-033"`). The JSON panel lists
  `context.options.body · form`, and its tree shows `username`, `password` and `grant_type`.
- The Markdown and JSON copies show `password` as `***`.
- Every existing copy test passes unchanged (quickstart "User Story 1 checks").

### Tests for User Story 1 (write first; they must fail until the matching implementation task)

- [X] T002 [P] [US1] Create `tests/unit/core/form.test.ts` for `formPairs` and `parseForm`
  (data-model "FormPair", research R1).

  Accepted:
  - `a=1&b=x%20y&c=` → `{ a: "1", b: "x y", c: "" }`;
  - `+` decodes to a space;
  - `=` inside a value (`t=abc==&x=1`);
  - Unicode letters in keys;
  - `a[b]=1&c=2`: the key stays `"a[b]"`, flat;
  - `id=1&x=2&id=3` → `{ id: ["1", "3"], x: "2" }`, with `id` first.

  `__proto__=1&b=2` gives an own key and does not change the prototype (mirror the existing
  `__proto__` test in `fields.test.ts`).

  `formPairs` keeps the raw parts: `a=x%20y&b=c+d` → `rawValue` `x%20y` / `c+d` and `value` `x y` /
  `c d`.

  Rejected (`undefined`):
  - a single pair `vendor=abc123`;
  - `a=1 &b=2` (whitespace);
  - `a&b=1` (pair without `=`);
  - `a=1&` and `&a=1` (empty pair);
  - `[a]=1&b=2` (key starts with a bracket);
  - `https://x.test/p?a=1&b=2`;
  - `abc==`;
  - `a=%zz&b=1`;
  - `a=%E2%82&b=1` (broken UTF-8);
  - `""`.

  Add one test that runs both functions over hostile inputs and expects no throw: very long `&`
  runs, lone `%`, `%%`, a `\u0000` key, 10,000 pairs.
- [X] T003 [P] [US1] Extend `tests/unit/core/fields.test.ts` (research R3, R4):
  - `parseStructured` returns `{ kind: "json" }` for `{"a":1}` and `[1]`, `{ kind: "xml" }` for
    `<a>1</a>`, `{ kind: "form" }` for `a=1&b=2`, and `undefined` for `hello`, `a=1` and
    `{bad`;
  - `parseStructuredText("a=1&b=2")` equals `{ a: "1", b: "2" }`;
  - `flattenSource({ context: { body: "user=u&grant_type=password" } })` contains
    `context.body.grant_type` = `"password"`;
  - `expandStructured` opens JSON text inside a form value (`p=%7B%22a%22%3A1%7D&q=1` →
    `{ p: { a: 1 }, q: "1" }`) and counts form text as one level toward `MAX_TEXT_DEPTH`.
- [X] T004 [P] [US1] Extend `tests/unit/core/xml.test.ts` with a direct test of `groupRepeated`
  (research R2):
  - `[["a","1"],["b","2"],["a","3"]]` → `{ a: ["1","3"], b: "2" }`, with key `a` first;
  - a `__proto__` entry stays an own key.
- [X] T005 [P] [US1] Extend `tests/unit/core/mask.test.ts` (FR-004, research R4).
  `maskValue("context.options.body", expandStructured("username=u&password=p&grant_type=password"),
  maskMatcher(DEFAULT_MASK_PATTERNS), [])` gives `{ username: "u", password: "***", grant_type:
  "password" }`. Also:
  - a TCKN inside a form value is masked by the value masks;
  - form text left past the depth cap becomes `***` whole, as the existing JSON past-cap test
    does.
- [X] T006 [P] [US1] Extend `tests/unit/core/markdown.test.ts`: a `_source` with
  `context.options.body = "username=u&password=p&grant_type=password"` is written as a
  ```` ```json ```` block with `"password": "***"` (FR-004).
- [X] T007 [P] [US1] Extend `tests/unit/core/json-copy.test.ts`: the same field comes out as an
  object with `password: "***"` and the other keys kept.
- [X] T008 [P] [US1] Extend `tests/unit/core/curl.test.ts` (FR-005, research R5). Use the file's
  existing hit and header helpers. Add one test per path, each with the default mask patterns:
  1. **Nested form text.** A JSON body whose value is form text:
     `body: JSON.stringify({ payload: "user=a&password=b" })`, content type `application/json`.
     The command's JSON body holds `"payload":"user=a&password=***"`, still a string, not an
     object.
  2. **Body part.**
     - `body: "user=a&password=b&note=x+y%21"` with `content-type:
       application/x-www-form-urlencoded` → `--data-raw 'user=a&password=***&note=x+y%21'`.
       The unchanged pairs keep their raw bytes.
     - The same body with no content-type header gives the same option, not JSON.
  3. **Query part.**
     - `query: "page=2&token=t"` → the URL ends `?page=2&token=***`.
     - `query: "a=1&b=0555 000 00 00"` (plain text, because of the spaces) is dropped as today,
       even though its masked form would look like form data.
     - `query: "[]"` and `query: "x"` are still dropped.
  4. **Value mask inside a form value.**
     - `body: "gsm=05550000000&a=1"` → `--data-raw 'gsm=***&a=1'`.
     - `body: "note=x:05550000000&a=1"` → `note=x%3A***&a=1`. A changed value is re-encoded with
       `encodeURIComponent`, and the unchanged pair keeps its raw bytes.
  5. **Past the cap.** Form text nested at `MAX_TEXT_DEPTH` becomes `***`.
- [X] T009 [P] [US1] Extend `tests/unit/core/json-tree.test.ts`: `jsonTextFields` returns
  `{ path, value, source: "form" }` for a form field, beside the existing JSON and XML cases. The
  existing expectations stay as they are (research R6).

### Implementation for User Story 1

- [X] T010 [US1] In `src/core/xml.ts`, extract the grouping loop at the end of `valueOf` into
  `export function groupRepeated(entries: Entry[]): Record<string, unknown>`. Its doc comment states
  the rule ("a repeated key becomes a list at the place it first appeared; `fromEntries` keeps
  `__proto__` an own key", Plan 6 spec §4.2), and `valueOf` calls it. Export the `Entry` type only if
  `form.ts` needs it; otherwise use `[string, unknown][]`. T004 passes, and every existing
  `xml.test.ts` case is unchanged.
- [X] T011 [US1] Create `src/core/form.ts` (research R1, data-model "FormPair"). The header comment
  cites spec 002 FR-001/FR-002. It exports `interface FormPair { rawKey; rawValue; key; value }`,
  `formPairs(text)` and `parseForm(text)`.

  `formPairs` works on `text.trim()`, and the order of its checks is required:
  1. Return `undefined` unless the text has no whitespace (`/\s/`) and includes `&`.
  2. `split("&")` must give at least two parts, and none may be empty.
  3. Each part splits on its first `=`, and a part without `=` fails.
  4. The raw key must match
     `/^(?:[\p{L}\p{N}_]|%[0-9A-Fa-f]{2})(?:[\p{L}\p{N}_.\-[\]]|%[0-9A-Fa-f]{2})*$/u`.
  5. To decode, replace `+` with a space, then call `decodeURIComponent` inside `try/catch`. A
     catch means `undefined`.

  `parseForm` is `groupRepeated(pairs.map(p => [p.key, p.value]))` from `./xml`. Neither function
  throws. T002 passes.
- [X] T012 [US1] In `src/core/fields.ts` (research R3):
  - Add `export const STRUCTURED_KINDS = ["json", "xml", "form"] as const` and `export type
    StructuredKind = (typeof STRUCTURED_KINDS)[number]`.
  - Add `export function parseStructured(text)`. It returns `{ kind, value }`: kind `xml` via
    `isXmlText` and `parseXml`; kind `json` when the trimmed text starts with `{` or `[`, via the
    existing `parseJsonText`; otherwise kind `form` via `parseForm`. Return `undefined` when the
    chosen parser returns `undefined`.
  - Make `parseStructuredText` return `parseStructured(text)?.value`.
  - Update the comments that say "JSON and XML" so they say "JSON, XML and form" (file header,
    `MAX_TEXT_DEPTH`, `expandStructured`, `flattenSource`), and add `spec 002 FR-003` to the
    header.

  T003, T005, T006, T007 and T009's form cases now pass with no change to `mask.ts`,
  `markdown.ts` or `json-copy.ts`. If one does not, report it rather than patching a consumer:
  that would break principle II.
- [X] T013 [US1] In `src/core/curl.ts`, replace `jsonOf` with a kind dispatch on `parseStructured`
  (research R5, data-model "cURL form masking").
  - **`maskPart`** returns `{ kind: "json" | "form" | undefined; value }`, with the kind read
    *before* masking:
    - `json`: as today, the object masked with `maskKeepingText` at depth 1;
    - `form`: the string masked with `maskKeepingText` at depth 0, so it stays a string;
    - otherwise: `maskKeepingText` at depth 0.
  - **`maskKeepingText`** branches on the string's kind:
    - `json`: as today; at the cap it becomes `MASK`, else `JSON.stringify(…)`;
    - `form`: at the cap it becomes `MASK`, else `maskForm(path, value, isMasked, kinds,
      depth + 1)`;
    - `xml` or no kind: `maskText`.
  - **New `maskForm`.** Its comment cites spec 002 FR-005 and principle II's exception: it
    differs from `maskValue` on purpose, because the request must stay sendable. It maps each
    `formPairs` pair:
    - `isMasked(`${path}.${key}`)` → `${rawKey}=${MASK}`;
    - otherwise `const masked = maskKeepingText(`${path}.${key}`, value, isMasked, kinds, depth)`.
      When `masked === value`, write `${rawKey}=${rawValue}`; otherwise
      `${rawKey}=${encodeURIComponent(String(masked))}`.

    Join the pairs with `&`.
  - **`buildCurl`**:
    - headers: `headerLines(part("headers").value)`;
    - body: `bodyOptions(part("body").value, contentType)`;
    - query: `const q = part("query")`. Encode a plain object with `encodeQuery` as today. Append
      it as is when `q.kind === "form" && q.value !== MASK`. Otherwise use `""`.

  Update the comments on `maskPart` and `maskKeepingText`. T008 passes, and every existing cURL
  test is unchanged.
- [X] T014 [US1] In `src/core/json-tree.ts`:
  - `JsonField.source` becomes `StructuredKind`, imported from `./fields`;
  - `jsonTextFields` takes the kind from `parseStructured(text)?.kind` instead of `isXmlText`;
  - drop the `isXmlText` import if it becomes unused;
  - mention form in the header comment.

  T009 passes.
- [X] T015 [US1] Show the form tag:
  - In `src/content/JsonView.tsx`, the field-list label is `path` for JSON, `${path} · XML` for
    XML and `` `${path} · ${t("panelKindForm")}` `` for form. A small `label(field)` helper keeps
    it to one expression.
  - Add `"panelKindForm": { "message": "form" }` to `public/_locales/en/messages.json` and
    `public/_locales/tr/messages.json`, next to the other `json*` keys.

  `tests/unit/i18n.test.ts` passes.
- [X] T016 [US1] Seed and e2e, in the same commit (seed contract, research R14):
  - **`docker/seed.mjs`**: after `app-032`, add `app-033`, built like `requestLog` but without a
    request (no `method`/`url`):
    - `message: "Token requested"`, `level: 200`, `level_name: "INFO"`, `channel: "app"`;
    - `datetime: minutesBefore(233)`, `app_name: "api"`, `user_id: 100009`;
    - `context: { options: { body: "username=dev&password=synthetic-pass&grant_type=password",
      headers: JSON.stringify({ accept: "application/json" }) } }`;
    - `extra: { uid: "uid-033" }`.

    Extend the comment above `app-031` so it covers `app-033`: "older than every other app_log log
    and of user 100009, so other specs' rows, counts and windows stay the same". The JSON headers
    give the panel two fields, so the list and its tags show.
  - **`tests/e2e/json.spec.ts`**: a test "opens form text as a tree tagged form".
    - Open `extra.uid:"uid-033"` and press `.kt-bar > button.kt-ghost`.
    - Expect `.kt-fields button` matching `context.options.body` to read `/^context\.options\.body · \S+$/`,
      then click it. e2e tests never assert localized text (`tests/CLAUDE.md`).
    - Expect `.kt-row .kt-key` `grant_type` and `password` to be visible.
  - **`tests/e2e/copy.spec.ts`**: add `APP_033` and `const FORM = { username: "dev", password:
    "***", grant_type: "password" }`. Then a test "masks the password inside form text in the
    Markdown and JSON copies":
    - menu item 0 contains
      ``- `context.options.body`:\n  ```json\n${jsonBlock(FORM)}\n  ``` `` and does not contain
      `synthetic-pass`;
    - menu item 1, parsed, has `_source.context.options.body` equal to `FORM`.

  Re-seed with `./docker/up.sh 9`, then run `KT_STACK=9 npm run e2e -- json copy`.
- [X] T017 [US1] Commit the code, the unit tests, the seed and the e2e tests:
  - files: `src/core/{form,xml,fields,curl,json-tree}.ts`, `src/content/JsonView.tsx`, both locale
    files, `docker/seed.mjs`, `tests/unit/core/*.test.ts`, `tests/e2e/{json,copy}.spec.ts`;
  - message `feat: read form-urlencoded text as structured data, masked in every copy`. The body
    names FR-001–FR-006 and the iys credential leak it closes.
- [X] T018 [P] [US1] Docs (research R15):
  - **`README.md`**: rename the "### XML" section "### XML and form data". Add a short paragraph:
    - URL-encoded form text with two or more `&`-joined pairs (`username=…&password=…`) is read
      the same way;
    - values are decoded and stay text, and a repeated key becomes a list;
    - a single `key=value` stays text;
    - masks reach form keys, so `*password*` hides a password inside it.

    In the cURL paragraph, note that form text inside the request is masked inside and stays
    form text.
  - **`CHANGELOG.md` `[1.0.0]`**:
    - the "XML as JSON" bullet becomes "XML and form data as JSON", with one clause on form text
      and its masking;
    - the "Copy as cURL" bullet's last clause names form text: "form text is masked inside and
      kept as form text; plain, HTML and XML text keeps only the value masks".
  - **`docs/store-listing.md`**: in the EN bullet "Read XML request and response bodies…", write
    "XML and form request bodies". In TR, write "XML ve form istek ve yanıt gövdelerini…".
  - **`CLAUDE.md`**:
    - in the `src/core/` layer line, flattening "also expands JSON, XML and form text
      (`form.ts`: two or more `&`-joined pairs)";
    - one trap: "Form text needs two or more `&`-joined pairs with keys that never start with a
      bracket; a single `k=v` stays text, and form text never starts with `{`, `[` or `<`, so
      `parseStructured` picks the kind by the first character".
- [X] T019 [US1] Validation and record:
  - Run quickstart.md "Gates" on all three stacks, re-seeding each with `./docker/up.sh N` first.
    Expect more unit tests than 459, and e2e 29/29/30 with 3 skipped each. Start a stopped stack
    the same way.
  - Run "User Story 1 checks" 1–3. The SC-005 diff command must print nothing.
  - Write `docs/verification/2026-10-form-data.md` in Turkish, in the shape of
    `docs/verification/2026-10-plan-7.md`: the gates with their counts, each check and its result,
    and M1 left as "kullanıcı yapacak".
  - Commit T018's docs, the verification record, `specs/002-plain-text-viewer/` and
    `.specify/feature.json` with the message `docs: form data in README, CHANGELOG, store listing
    and CLAUDE.md; spec-kit feature 002`.

  Report any failure with its output. Do not "fix" an existing expectation.
- [X] T020 [US1] Ask the user to run M1 on Alpha (quickstart US1 check 4) and wait. Record the
  answer in the verification doc, as an amended commit if T019's commit is unpushed, otherwise as
  a new commit.
- [X] T021 [US1] Ask the user whether to push and open the PR. Do not push without a yes. On yes:
  - push with `GH_TOKEN=$(gh auth token --user cllakyz) git -c credential.helper='!gh auth git-credential' push -u origin 002-form-data`;
  - open the PR with `GH_TOKEN=$(gh auth token --user cllakyz) gh pr create`. The title is "Form
    data as structured text; close the copy credential leak". The body covers US1, the closed
    leak, the cURL behavior and the test counts, and ends with
    `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

  After the user says it is merged, pull `main`. Delete the branch locally and on GitHub only if
  the user asks.

**Checkpoint**: US1 is merged. 1.0.0 can be uploaded to the store without the credential leak.

---

## Phase 4: User Story 2 - Long and multi-line text is readable in the panel (Priority: P2)

**Goal**: Text the panel cannot parse, when multi-line or at least 500 characters long, is listed
and opens in a text view. The text view keeps line breaks, picks wrapping from the text, and
offers the shared search and an unmasked copy. The button becomes "View". Branch `002-text-view`,
release 1.0.0 (changed from 1.1.0 on 2026-10-16).

**Independent Test**:
- Open seed doc `app-034` (`extra.uid:"uid-034"`). The "View" button lists `context.output · text`
  and `context.error · text`.
- The output opens unwrapped with aligned columns, the wrap toggle works, searching `synced`
  marks 2 matches, and copy returns the exact text.

### Setup for User Story 2

- [X] T022 [US2] Only after US1 is merged:
  - `git switch main && git pull`;
  - `git switch -c 002-text-view`.

  Confirm the baseline: `npm run typecheck` is clean and `npx vitest run` passes (note the
  count).

### Tests for User Story 2 (write first; they must fail until the matching implementation task)

- [X] T023 [P] [US2] Rework `tests/unit/core/json-tree.test.ts` (research R7, R8):
  - Rename `jsonTextFields` → `panelFields` and `source` → `kind` in the existing expectations;
    their paths and values stay the same.
  - `panelFields` lists fields in `_source` order. With `{ a: "line1\nline2", b: "x".repeat(500),
    c: "x".repeat(499), d: '{"k":1}', e: "  trailing\n  " }` it returns:
    - `a` and `b` as `{ kind: "text", text }`;
    - `d` as `{ kind: "json" }`;
    - not `c` (single line, shorter than 500) and not `e` (its only line break is trailing).
  - `isMultiLine`: true for `"a\r\nb"`; false for `"a\n"` and `"abc"`.
  - `searchPattern`:
    - `"  "` gives `undefined`;
    - `"a.b"` matches `"a.b"` and not `"axb"`;
    - `"ISTANBUL"` matches `"istanbul"`;
    - `"istanbul"` does **not** match `"İSTANBUL"`. That is today's behavior too:
      `"İSTANBUL".toLowerCase()` is `"i̇stanbul"`. Pin it with a comment so it is not mistaken for a
      bug;
    - the pattern has no `g` flag.
  - `matchPaths` returns both of two *consecutive* rows that match (the `lastIndex` trap), and the
    existing `matchPaths` cases are unchanged.
  - `textMatches("İx ab AB", "ab")` gives `[[3,5],[6,8]]`: offsets from the original string, after
    a two-code-unit lower-case letter.
  - `textSegments` splits `"xaby"` with `[[1,3]]` into `[{text:"x"},{text:"ab",match:0},{text:"y"}]`.
- [X] T024 [P] [US2] Create `tests/unit/content/json-view.test.ts` with the `// @vitest-environment
  happy-dom` header. Mirror the setup in `tests/unit/content/copy-menu.test.ts`
  (`IS_REACT_ACT_ENVIRONMENT`, `createRoot`, `act`). Mock `../../../src/i18n` with
  `t: (key, ...subs) => [key, ...subs].join(" ")`. Then render `JsonView`:
  - **One text field** opens directly into a `pre.kt-text` whose text equals the field's text.
    Text containing `<b>x</b>` renders as text: `pre.querySelector("b")` is null.
  - **Wrapping.**
    - Multi-line text starts without the `kt-wrap` class; the toggle (`aria-pressed`) adds it.
    - Single-line text starts with `kt-wrap`.
  - **Search.** Typing `ab` into text `ab x ab`:
    - gives 2 `mark` elements, the first with `data-active`, and the status `jsonMatchCount 1 2`;
    - Enter moves `data-active` to the second.
  - **Copy.** The copy button calls `onCopy` with the exact text.
  - **List.** With a JSON field, an XML field and a text field, the list labels are `path`,
    `path · XML` and `path · panelKindText`.
  - **`PanelBoundary`.** A child that throws makes it render nothing and calls `console.debug`
    with `"[kibanatool]"` (spy on `console.debug`).
- [X] T025 [P] [US2] Extend `tests/unit/theme.test.ts` (research R11): text-primary on `match`
  meets the body-text contrast floor already used for text-primary pairs, in both the light and
  dark palettes.

### Implementation for User Story 2

- [X] T026 [US2] In `src/core/mask.ts`, export `escapeRegExp` (unchanged body). Nothing else
  changes.
- [X] T027 [US2] In `src/core/json-tree.ts` (research R7, R8; contract "User Story 2"):
  - add `TEXT_VIEW_MIN_LENGTH = 500` and `isMultiLine(text)` (`/[\r\n]/.test(text.trim())`);
  - add `PanelField` (the union);
  - replace `jsonTextFields` with `panelFields`. It makes one pass over `flattenSource(source,
    false)`:
    - a string with `parseStructured` → `{ path, kind, value: expandStructured(text) }`;
    - otherwise, a string that is multi-line or at least `TEXT_VIEW_MIN_LENGTH` long →
      `{ path, kind: "text", text }`;
  - add `searchPattern(query)`: `iu`, no `g`, using `escapeRegExp` from `./mask`;
  - make `matchPaths` use `pattern.test` for keys and primitive values;
  - add `textMatches` (a global copy of the pattern, then `matchAll`; empty when there is no
    pattern) and `textSegments`;
  - update the header comment (spec 002 FR-007, FR-012).

  T023 passes.
- [X] T028 [US2] In `src/content/JsonView.tsx` (research R9, R12):
  - **`SearchBar`.** Extract from `JsonTree` a `SearchBar({ query, onQuery, status, count,
    onStep })`. It holds the search input, the status span with `aria-live="polite"`, ↑/↓ and
    Enter/Shift+Enter. `JsonTree` uses it, and its behavior is unchanged.
  - **`TextBody({ field, onCopy })`.**
    - State: `query`, `current` and `wrap`. `wrap` starts as `!isMultiLine(field.text)`.
    - Memoize matches and segments on `(text, query)`.
    - The head row holds `SearchBar`, a wrap toggle (`aria-pressed={wrap}`, label
      `t("textWrap")`) and a copy button (label `t("jsonCopyValue")`, `onCopy(field.text)`).
    - The body is `<pre className={wrap ? "kt-text kt-wrap" : "kt-text"} tabIndex={0}
      role="region" aria-label={field.path}>`. Its children are the segments: strings, and
      `<mark key data-active={i === current ? "" : undefined}>` for matches.
    - An effect scrolls `[data-active]` into view with `{ block: "nearest", inline: "nearest" }`.
  - **`JsonView`** takes `fields: PanelField[]`. The selected field renders `JsonTree` for
    structured kinds and `TextBody` for `kind === "text"`.
  - **List label**: `path`; `path · XML`; `path · ${t("panelKindForm")}`;
    `path · ${t("panelKindText")}`.
  - **`PanelBoundary`.** Export a class component that renders its children until an error, then
    `null`. It logs with `console.debug("[kibanatool] panel failed:", error)` in
    `componentDidCatch`.

  T024 passes.
- [X] T029 [P] [US2] In `src/content/styles.ts`, next to the `.kt-json-rows` rule, add:
  - `.kt-text`: `margin: 0; max-height: 420px; overflow: auto; padding: 4px 8px; font: 12px/1.6
    var(--kt-font-mono); white-space: pre;`;
  - `.kt-text.kt-wrap { white-space: pre-wrap; overflow-wrap: anywhere; }`;
  - `.kt-text mark { background: var(--kt-match); color: inherit; }`;
  - `.kt-text mark[data-active] { outline: 1px solid var(--kt-warning); outline-offset: -1px; }`;
  - `.kt-text:focus-visible`: an outline like `.kt-json-head input:focus`.
- [X] T030 [US2] In `src/content/ActionBar.tsx`:
  - import `panelFields` and `PanelBoundary`;
  - rename `jsonFields`/`jsonOpen` to `panelEntries`/`panelOpen`;
  - the button label is `t("viewButton")`;
  - wrap the `JsonView` render in `<PanelBoundary key={id}>`, so a new document resets it.
- [X] T031 [P] [US2] In both `public/_locales/{en,tr}/messages.json`:
  - rename `jsonButton` → `viewButton` with "View" / "Görüntüle";
  - add `panelKindText` ("text" / "metin") and `textWrap` ("Wrap lines" / "Satırları kaydır").

  `tests/unit/i18n.test.ts` passes, and `MessageKey` picks the change up from the English file.
- [X] T032 [US2] Seed and e2e, in the same commit:
  - **`docker/seed.mjs`**: add `app-034` after `app-033`, with the same "older, user 100009"
    pattern (`minutesBefore(234)`), `message: "Cron finished"`, `channel: "app"` and `extra: { uid:
    "uid-034" }`. Its context:
    - `output`: about 6 lines, a box-drawing table (`┌─…┐`, `│ job │ status │`, `└─…┘`) with the
      word `synced` in exactly two rows;
    - `error`: one line of at least 520 characters, for example `"Sync failed: " + "upstream
      timeout; ".repeat(30)`.
  - **`tests/e2e/json.spec.ts`**:
    - Rename the test "shows no JSON button for a log without JSON text" to "shows no panel
      button for a log without listed fields"; its body is unchanged.
    - Add "opens long and multi-line text in the text view". Open `uid-034` and press
      `.kt-bar > button.kt-ghost`. e2e tests never assert localized text (`tests/CLAUDE.md`), so
      check neither the button label nor the tag. Then:
      - the list has buttons matching `context.output` and `context.error`;
      - click output: `pre.kt-text` has no `kt-wrap` class, and its `white-space` is `pre`;
      - fill the search with `synced`: 2 `pre.kt-text mark`;
      - click the wrap toggle (`[aria-pressed]`): the class `kt-wrap` is present;
      - click copy: `navigator.clipboard.readText()` equals the seeded output.

  Re-seed with `./docker/up.sh 9`, then run `KT_STACK=9 npm run e2e -- json`.
- [X] T033 [US2] Commit the code, the tests, the seed and the e2e tests with the message `feat:
  read long and multi-line text in a text view; the panel button becomes View`. The body names
  FR-007–FR-014.
- [X] T034 [P] [US2] Release docs (research R15):
  - **`package.json`**: stays `"version": "1.0.0"` (changed on 2026-10-16; at first this task set
    1.1.0).
  - **`CHANGELOG.md` `[1.0.0]`**: the "JSON view" bullet becomes the View panel, plus a text-view
    bullet. (Changed on 2026-10-16; at first this task added a `[1.1.0]` section.)
  - **`README.md`**: a "### Text view" section covering:
    - which fields are listed (multi-line, or 500+ characters, not JSON, XML or form);
    - wrapping by text, and the toggle;
    - search;
    - that copy is unmasked like "Copy value".
  - **`docs/store-listing.md`**: a new bullet in EN ("Read long and multi-line text such as
    console output and stack traces with its line breaks kept, and search it.") and in TR ("Konsol
    çıktısı ve stack trace gibi uzun ve çok satırlı metni satır sonlarıyla okuyun ve içinde
    arayın.").
  - **`CLAUDE.md`**: one sentence in Architecture or Traps: "The panel lists text fields that are
    multi-line or ≥ `TEXT_VIEW_MIN_LENGTH` (500) characters; tree and text search share
    `searchPattern` (`iu`, never `g`: `.test` must not keep `lastIndex`)".
- [X] T035 [US2] Validation and record:
  - Run quickstart "Gates" after re-seeding all three stacks. Expect e2e 30/30/31 with 3 skipped
    each, and more unit tests than T022's count.
  - Run "User Story 2 checks" 1–6. For SC-004, index the 100 KB document *after* the e2e run and
    measure both the open and the one-letter search. If either exceeds 1 s, apply research R10's
    cap in `TextBody`/`textSegments`, add a `ponytail:` comment, and re-run.
  - Write `docs/verification/2026-10-text-view.md` in Turkish, with the SC-004 timings.
  - Commit T034's docs and the record with the message `docs: text view in README, CHANGELOG, store listing and CLAUDE.md`.
- [X] T036 [US2] SC-002 on Alpha (quickstart US2 check 7). **Ask the user first**: it runs in the
  user's Chrome session on the team Kibana, read-only, counts only. On yes:
  - Write a throwaway script in the session scratchpad, not in the repo. It imports `panelFields`,
    `parseStructured` and `isMultiLine` from `src/core`, fetches the last 500 docs of each data
    view as in the 2026-10-15 measurement, and counts:
    - text fields that are multi-line or 500+ characters but not listed;
    - listed text fields that are single-line and shorter than 500 characters.
  - Bundle it with `npx rolldown … --format iife` and run it in a new Alpha tab. Then close the
    tab.

  Both counts must be 0. Add the result to the verification doc and its commit. Then ask the user
  to run M2 (quickstart US2 check 8), and record that too.
- [X] T037 [US2] Ask the user whether to push and open the PR. Do not push without a yes. On yes,
  push `002-text-view` the same way as T021 and open a PR titled "Text view for long and
  multi-line text". The body covers US2, the button rename, SC-004's timings and the test counts,
  and ends with the Claude Code line. After the merge, pull `main`; delete the branch only if the
  user asks.

**Checkpoint**: both stories are merged. 1.0.0 is ready for the store with both.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T038 After both PRs merge, set `**Status**: Implemented` in
  `specs/002-plain-text-viewer/spec.md`. Commit it in the next docs commit on `main`'s next branch,
  or ask the user whether to commit it on its own. Check that
  `grep -n "jsonTextFields\|jsonButton" -r src tests public` is empty.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)** blocks US1.
- **US1 (T002–T021)**: tests T002–T009 run in parallel and first. Then T010 → T011 → T012, then
  T013 and T014 (both need T012), then T015. T016 needs T011–T015 and a re-seeded stack. T017
  commits, T018 runs in parallel with T016/T017, then T019 → T020 → T021.
- **US2 (T022–T037)** starts only after the user has merged US1's PR (R16). Tests T023–T025 run in
  parallel. Then T026 → T027 → T028; T029 and T031 run in parallel with T027/T028; T030 needs
  T027, T028 and T031. T032 needs T028–T031. Then T033, T034 (parallel with T032/T033), T035, T036
  and T037.
- **Polish (T038)** comes after both merges.

### Within US1

- T010 (`groupRepeated`) must come before T011 (`form.ts` imports it).
- T012 is the switch that turns form text on for every consumer. Run the whole unit suite right
  after it. Any existing expectation that changes is an FR-019 regression; stop and report it.

### Parallel Opportunities

- US1 tests T002–T009 touch eight different files.
- US2 tests T023–T025 touch three different files.
- T029 (styles) and T031 (locales) run beside T027/T028.
- The docs tasks T018 and T034 run beside their story's e2e work.

## Parallel Example: User Story 1

```text
T002 form.test.ts · T003 fields.test.ts · T004 xml.test.ts · T005 mask.test.ts
T006 markdown.test.ts · T007 json-copy.test.ts · T008 curl.test.ts · T009 json-tree.test.ts
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. T001, then T002–T021.
2. **Stop**: US1 is the MVP. It closes the credential leak and unblocks the 1.0.0 store upload.

### Incremental Delivery

1. US1 → PR → merge → 1.0.0 can ship.
2. US2 on a fresh branch → PR → merge; it joins 1.0.0 (clarified 2026-10-16).

## Notes

- `[P]` tasks touch different files and have no unfinished dependency.
- The seed and its e2e tests always change in the same commit (CLAUDE.md).
- Re-seed stacks before e2e: `tests/e2e/global-setup.ts` does not seed.
- Never print `docker/.env.<major>` values.
