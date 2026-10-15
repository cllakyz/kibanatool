---

description: "Task list for fixing architecture deviations D1–D13"
---

# Tasks: Fix Architecture Deviations D1–D13

**Input**: Design documents from `/specs/001-fix-architecture-deviations/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R20), data-model.md, contracts/module-interfaces.md, quickstart.md

**Tests**: Included. The spec requires the architecture check (FR-002), a copy-menu notice check (US4), and
unchanged behavior tests (SC-004). Tests for new functions are written first and must fail before the
implementation task.

**Organization**: One phase per user story, in **execution order** US1 → US3 → US2 → US4 → US5 (plan.md,
research R20). US2's gate needs `HiddenReason` in `passive.ts`, which US3 moves. Each story ends with a
verify + constitution PATCH + commit task.

**Ground rules for every task**:
- **No behavior change** (FR-022). No expected value in an existing test may change: no URL, copied text,
  notice, warning or validation error. Only imports, moved names, the discover `context()` helper and the
  storage fake may change.
- **Code style**: match the surrounding code (comment density, `spec §` citations, naming). Never use
  `innerHTML`.
- **Commits**: end every message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. The repo's
  local git config already sets the commit email.
- **`.specify/memory/constitution.md` is local-only (untracked)**. Edit it on disk; it is never part of a
  commit. For every version bump:
  - update the `**Version**` line and Last Amended (2026-10-14 or the day of the change);
  - rewrite the Sync Impact Report comment so that it states old → new and what changed.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1–US5 from spec.md

---

## Phase 1: Setup

**Purpose**: Branch and a green baseline.

- [X] T001 Create the branch from `main`: `git switch -c 001-fix-architecture-deviations`. The uncommitted
  `.gitignore` change (adds `specs/`) comes along and is committed in T037. Then confirm the baseline:
  - `npm run typecheck` (clean);
  - `npx vitest run` (431 tests pass).

  If either fails, stop and report.

---

## Phase 2: Foundational

**Purpose**: none. Every story builds on the existing code, so there is no blocking shared work.

---

## Phase 3: User Story 1 - Rules stay independent of Kibana's link format (Priority: P1) 🎯 MVP

**Goal**: Core stops importing `src/kibana/url` (D1). A unit test enforces the constitution's import table,
keeps browser globals out of core and forbids import cycles (Gate G2, FR-002, FR-003).

**Independent Test**: `npx vitest run tests/unit/architecture.test.ts` passes with `EXCEPTIONS = []`, and its
five synthetic cases each report exactly their violation. `npx vitest run tests/unit/core/discover-actions.test.ts`
passes with unchanged expected URLs.

- [X] T002 [US1] Amend `.specify/memory/constitution.md` to v1.0.1 (research R3, FR-004). In the Principle I
  table, change these rows:
  - `src/*.ts` → "`src/core/**`, other root modules, `wxt/browser`; `src/i18n.ts` may also import
    `public/_locales/en/messages.json`";
  - `src/content/**`, `src/options/**` → "everything under `src/`, npm packages";
  - `entrypoints/**` → "everything under `src/`, npm packages, WXT virtual modules (`#imports`)".

  Leave the other rows as they are. Bump the PATCH version and update the Sync Impact Report ("import table
  clarified, FR-004").
- [X] T003 [US1] Create `tests/unit/architecture.test.ts` (node environment; research R2; data-model "Import
  table"). It has no new dependency: use `import ts from "typescript"` and `node:fs` / `node:path`, and find
  the repo root from `import.meta.url` (`../../`). The file contains:
  1. **Pure checker** `check(files: Map<string, string>): string[]`. Keys are repo-relative posix paths and
     values are source text. It returns one human-readable violation per problem.
     - **Specifiers**: for each file, `ts.preProcessFile(text, true, true).importedFiles` lists them. That
       covers imports, `import type`, `export … from`, `export * from`, `import()` and `typeof import()`.
     - **Groups by path**: `src/core/`→core, `src/kibana/`→kibana, `src/adapters/`→adapters,
       `src/background/`→background, `src/content/`→content, `src/options/`→options, a file directly in
       `src/`→root. Any other path is a violation ("no group") so that new folders get added to the table.
     - **Relative specifiers**: resolve against the file's directory, trying exact, `.ts`, `.tsx`,
       `/index.ts`, `/index.tsx`. A target outside `src/` is allowed only through the per-file rule
       `src/i18n.ts → public/_locales/en/messages.json`.
     - **Bare specifiers** (npm): allowed when the group's npm rule is "any", or when it lists the specifier
       or a prefix of it ending at `/`.
     - **Rules**:
       | Group | May import | npm |
       |---|---|---|
       | core | core | `zod` |
       | kibana | core, kibana | any |
       | adapters | adapters, kibana, core | none |
       | background | background, core | none |
       | root | core, root | `wxt/browser` |
       | content, options | any group | any |
     - **Browser globals (core files only)**: walk `ts.createSourceFile(..., true)` and report an `Identifier`
       named `window`, `document`, `location`, `navigator`, `fetch`, `chrome` or `browser`. Skip it when its
       parent has `.name === node` (a property access name, property assignment, declaration or parameter),
       except a `ShorthandPropertyAssignment`, which is a reference. Comments and strings are not
       identifiers.
     - **Cycles**: depth-first search over the resolved `src/` edges, type-only ones included. Report each
       cycle once as `a → b → a`.
     - **Message format**: every message names the file and the specifier, e.g.
       `src/core/a.ts imports ../kibana/b (core may not import kibana)`.
  2. **`EXCEPTIONS: { from: string; to: string }[]`**: start with
     `[{ from: "src/core/discover-actions.ts", to: "../kibana/url" }]`, which is D1.
  3. **Tests**:
     - (a) `check(readTree())` minus EXCEPTIONS is `[]`, where `readTree` reads every `src/**/*.{ts,tsx}`
       except `*.d.ts`;
     - (b) every EXCEPTION matches a current violation, so a stale exception fails with "remove it";
     - (c)–(g) five synthetic trees, each reporting exactly one violation:
       - an outer import in core (`src/core/a.ts` imports `../kibana/b`);
       - a type-only import (`import type { X } from "../content/c"` in core);
       - a re-export (`export { y } from "../options/d"` in core);
       - a browser global (`export const here = () => location.href;` in core);
       - a cycle (`src/core/e.ts` ↔ `src/core/f.ts`);
     - (h) no false positives: a core file using `o.location`, `{ location: 1 }`, `// browser` and the string
       `"window"` reports nothing.

  Run it: all tests pass with the D1 exception.
- [X] T004 [US1] In `src/core/discover-actions.ts` (research R1, contracts/module-interfaces.md):
  - delete `import { discoverUrl } from "../kibana/url"`;
  - add `export interface DiscoverTarget { dataViewId: string; query: string; time?: TimeRange }`;
  - in `DiscoverContext`, replace `prefix: string` with
    `/** Builds the Discover link for a target (the bar passes Kibana's link format). */ link: (target: DiscoverTarget) => string;`;
  - in `buildDiscoverButtons`, build the URL with
    `context.link({ dataViewId, query: resolved.query, time: range ?? context.currentTime })`.
- [X] T005 [US1] In `src/kibana/url.ts`, type `discoverUrl`'s parameter as
  `{ prefix: string } & DiscoverTarget`, with `import type { DiscoverTarget } from "../core/discover-actions"`.
  The body and the output stay the same.
- [X] T006 [US1] In `src/content/ActionBar.tsx`, add `discoverUrl` to the `../kibana/url` import. In the
  `buildDiscoverButtons` context, replace `prefix,` with
  `link: (target) => discoverUrl({ prefix, ...target }),`. The other props of the context stay.
- [X] T007 [US1] In `tests/unit/core/discover-actions.test.ts`, import `discoverUrl` from
  `../../../src/kibana/url`. In the `context()` helper, replace `prefix: "",` with
  `link: (target) => discoverUrl({ prefix: "", ...target }),`. No expected value changes. Run the file: it
  passes.
- [X] T008 [US1] Set `EXCEPTIONS` to `[]` in `tests/unit/architecture.test.ts`. Then run
  `npm run typecheck && npx vitest run`: all pass. Spot check by hand: add
  `import { discoverUrl } from "../kibana/url";` to any `src/core` file, confirm the architecture test fails
  naming it, then remove the line.
- [X] T009 [US1] Amend `.specify/memory/constitution.md` to v1.0.2:
  - delete the D1 row from Known Deviations;
  - remove `TODO(ARCH_TEST)` from Gate G2, so that it states that `tests/unit/architecture.test.ts` enforces
    the table;
  - remove the ARCH_TEST item from the Sync Impact Report's deferred TODOs.

  Then commit `src/core/discover-actions.ts`, `src/kibana/url.ts`, `src/content/ActionBar.tsx`,
  `tests/unit/core/discover-actions.test.ts` and `tests/unit/architecture.test.ts` with the message
  `refactor: inject the Discover link builder; enforce the import table with a test`.

**Checkpoint**: core imports no outer layer, and CI now guards Principle I.

---

## Phase 4: User Story 3 - Shared shapes have one definition (Priority: P3)

**Goal**: `HiddenReason` lives next to `PassiveReason` (D9). Link and Discover buttons share one type and
one renderer (D10). Runs before US2 (R20).

**Independent Test**: `npm run typecheck && npx vitest run` pass with unchanged expected values. `grep -rnE
"\bLinkButton\b|\bDiscoverButton\b" src entrypoints` finds nothing. The bar's DOM is unchanged; T038's e2e
run confirms it.

- [X] T010 [US3] Move `HiddenReason` from `src/core/link-actions.ts` to `src/core/passive.ts` (research
  R13). Give it the comment `/** Why an action shows no button at all; the options preview names it. */` and
  widen the file's header comment to cover both reasons. Then update the importers:
  - `src/core/link-actions.ts` imports it from `./passive`;
  - `src/core/discover-actions.ts` changes `import type { HiddenReason } from "./link-actions"` to `./passive`;
  - `src/options/preview.ts` imports it from `../core/passive`;
  - `entrypoints/options/ActionEditor.tsx` imports it from `../../src/core/passive`.
- [X] T011 [US3] Add `export type ActionButton = { id: string; label: string; url: string } | { id: string; label: string; passive: PassiveReason };`
  to `src/core/types.ts`, with `import type { PassiveReason } from "./passive"` and a one-line doc comment
  (Plan 4 spec §5.3). Then delete `LinkButton` from `src/core/link-actions.ts` and `DiscoverButton` from
  `src/core/discover-actions.ts`. `buildLinkButtons` and `buildDiscoverButtons` (and their `flatMap`
  callbacks) return `ActionButton[]`.
- [X] T012 [US3] In `src/content/ActionBar.tsx` (research R14), replace the `LinkButton` / `DiscoverButton`
  imports with `ActionButton` from `../core/types`. Type the `buttons` memo as
  `{ links: ActionButton[]; discover: ActionButton[] }`. Then replace `passiveButton` and the two
  near-identical `map` blocks with one renderer:
  - `const actionButton = (button: ActionButton, className: string) => "url" in button ? <a key={button.id} className={className} href={button.url} target="_blank" rel="noopener noreferrer">{button.label}</a> : <span key={button.id} className="kt-btn kt-disabled" aria-disabled="true" tabIndex={0} title={describePassive(button.passive, environment.name)}>{button.label}</span>;`
  - the links use `buttons.links.map((button) => actionButton(button, "kt-btn"))`;
  - Discover uses `buttons.discover.map((button) => actionButton(button, "kt-btn kt-discover"))`.

  Keep the Plan 4 spec §5.3 comment. Drop the now-unused `PassiveReason` import. The rendered DOM must be
  identical: same elements, classes, attributes and order.
- [X] T013 [US3] Run `npm run typecheck && npx vitest run`: all pass. Amend `.specify/memory/constitution.md`
  to v1.0.3 by deleting rows D9 and D10. Commit with the message
  `refactor: one action button type; HiddenReason next to PassiveReason`.

**Checkpoint**: the action kinds no longer import each other, and the bar renders both button kinds one way.

---

## Phase 5: User Story 2 - Each rule is defined once (Priority: P2)

**Goal**: one owner per rule (data-model "Business rules"). It covers D2–D8 plus FR-012 (http(s) prefix)
and FR-013 (the spec citation in the cURL comment).

**Independent Test**: each search in quickstart.md §3 returns the expected count. `npm run typecheck && npx
vitest run` pass with unchanged expected values and the new tests below.

### Tests for User Story 2 (write first; they must fail until the matching implementation task)

- [X] T014 [P] [US2] In `tests/unit/core/config.test.ts`, add the following, imported from
  `../../../src/core/config`:
  - `appliesToAll`: true for `{ environmentIds: [] }`, false for `["a"]`;
  - `appliesTo`: true for `[]` and any id, true for `["a","b"]` and `"b"`, false for `["a"]` and `"b"`;
  - `CONDITION_OPS`: equals `["exists","equals","notEquals","contains","startsWith"]`.
- [X] T015 [P] [US2] In `tests/unit/core/template.test.ts`, add tests for `missingVariables` and
  `startsWithHttp`.
  - **`missingVariables(template, variables)`**:
    - `"{env.base}/x/{env.base}"` with `{}` → `["base"]` (deduplicated);
    - `"{env.a|env.b}/{env.c}"` with `{ b: "1" }` → `["c"]`;
    - an empty-string value counts as missing: `{ a: "" }` → `["a"]`;
    - a placeholder that mixes a field and a variable (`{user|env.a}`) is never reported;
    - names come out in template order.
  - **`startsWithHttp`**:
    - true for `"https://x"` and `"HTTP://x"`;
    - false for `"ftp://x"`, `" https://x"` (leading space) and `""`.
- [X] T016 [P] [US2] In `tests/unit/core/conditions.test.ts`, add tests for `gateAction(action, template,
  fields, variables, encoders)`. Use encoders `{ field: (v) => v, variable: (v) => v }`.
  - **Results**:
    - disabled → `{ ok: false, reason: "disabled" }`, even when the conditions fail;
    - failing condition → `{ ok: false, reason: "conditions" }`;
    - a missing field placeholder → `{ ok: false, reason: "missingValue" }`;
    - a variables-only placeholder with nothing set → `{ ok: false, passive: { kind: "missingVariable", variable: "x" } }`;
    - everything present → `{ ok: true, text }`.
  - **Precedence**: when both a field and a variable are missing, `missingValue` wins.
- [X] T017 [P] [US2] In `tests/unit/core/xml.test.ts`, add `isXmlText`: true for `"  <a/>"` and `"\n<x>"`,
  false for `"a<b>"`, `"{}"` and `""`.

### Implementation for User Story 2

- [X] T018 [US2] In `src/core/config.ts` (research R4, R5, R8):
  - **D3**: above `conditionSchema`, add
    `/** The condition operators, in the order the options page lists them (spec §7.2). */ export const CONDITION_OPS = ["exists", "equals", "notEquals", "contains", "startsWith"] as const;`
    and change `op` to `z.enum(CONDITION_OPS)`.
  - **D2**: add
    `/** Spec §8: an action with no environment ids applies to every environment. */ export function appliesToAll(action: Pick<Action, "environmentIds">): boolean { return action.environmentIds.length === 0; }`
    and
    `export function appliesTo(action: Pick<Action, "environmentIds">, environmentId: string): boolean { return appliesToAll(action) || action.environmentIds.includes(environmentId); }`.
    `actionsForEnvironment` becomes `config.actions.filter((action) => action.enabled && appliesTo(action, environmentId))`.
  - **D6**: in `matchLength`, compute `const basePath = basePathOf(kibanaUrl);` instead of repeating the
    `replace`.

  T014 passes.
- [X] T019 [US2] In `src/core/conditions.ts` (D3), replace the hand-written `ConditionOp` type and
  `Condition` interface with `import type { Action } from "./config";`,
  `export type Condition = Action["conditions"][number];` and `export type ConditionOp = Condition["op"];`.
  `evaluateCondition` and `evaluateConditions` stay as they are.
- [X] T020 [P] [US2] Structured text (research R6, R7, R12):
  - **D4**:
    - in `src/core/fields.ts`, rename `MAX_JSON_DEPTH` to `MAX_TEXT_DEPTH` and export it, covering every
      use and comment;
    - in `src/core/curl.ts`, delete its own `MAX_TEXT_DEPTH` and comment, and import it from `./fields`.
  - **D5**:
    - in `src/core/xml.ts`, add
      `/** Spec §4.1: text whose first non-space character is "<" is read as XML. */ export function isXmlText(text: string): boolean { return text.trim().startsWith("<"); }`.
      `parseXml` starts with `if (!isXmlText(text)) return undefined; const source = text.trim();`;
    - use `isXmlText(text)` in `parseStructuredText` (`src/core/fields.ts`), `jsonOf` (`src/core/curl.ts`)
      and `jsonTextFields` (`src/core/json-tree.ts`, imported from `./xml`).
  - **FR-013**: the doc comment of `maskKeepingText` in `src/core/curl.ts` becomes
    `/** maskValue's rules, except that JSON text is masked inside and written back as JSON text, and other text keeps only the value masks (spec §5.6). */`.

  T017 passes, and so do the existing `fields`, `curl`, `json-tree`, `xml`, `markdown` and `json-copy` tests,
  unchanged.
- [X] T021 [P] [US2] In `src/core/template.ts` (research R9, R11):
  - **FR-012**: add `const HTTP_START = /^https?:\/\//i;` and
    `/** Whether \`text\` starts with http:// or https://, ignoring case. */ export function startsWithHttp(text: string): boolean { return HTTP_START.test(text); }`.
    `isHttpUrlTemplate` uses `startsWithHttp(template.trim())`.
  - **D7**: add the private
    `/** Plan 4 spec §4: the first variable of a placeholder whose paths are all variables, none set; undefined otherwise. */ function missingVariableOf(paths: string[], variables: Variables): string | undefined { if (!paths.every(isVariablePath) || paths.some((path) => lookupVariable(variables, path) !== null)) return undefined; return (paths[0] ?? "").slice(VARIABLE_PREFIX.length); }`
    and the exported
    `/** Plan 4 spec §6: the variables \`template\` needs that \`variables\` lacks, in template order, each once. */ export function missingVariables(template: string, variables: Variables): string[] { return [...new Set(parsePlaceholders(template).flatMap((placeholder) => missingVariableOf(placeholder.paths, variables) ?? []))]; }`.
  - **D7 in `fillTemplate`**: replace the no-value branch
    (`if (paths.every(isVariablePath)) missingVariable ??= …; else missingValue = true;`) with
    `const missing = missingVariableOf(paths, variables); if (missing === undefined) missingValue = true; else missingVariable ??= missing;`.

  T015 passes, and so does the existing template test file, unchanged.
- [X] T022 [US2] Add `gateAction` to `src/core/conditions.ts` (D8, research R10, contract). Imports:
  `fillTemplate`, `type Encoders`, `type Variables` from `./template`; `type HiddenReason`,
  `type PassiveReason` from `./passive`; `type FieldMap` is already imported. Add
  `export type Gate = { ok: true; text: string } | { ok: false; reason: Exclude<HiddenReason, "invalidUrl"> } | { ok: false; passive: PassiveReason };`
  and
  `/** Spec §7.2, Plan 4 spec §5.3: the checks every action kind runs first, in this order, then its template filled. */ export function gateAction(action: Pick<Action, "enabled" | "conditions">, template: string, fields: FieldMap, variables: Variables, encoders: Encoders): Gate`.
  The body, in order:
  1. `if (!action.enabled) return { ok: false, reason: "disabled" };`
  2. `if (!evaluateConditions(action.conditions, fields)) return { ok: false, reason: "conditions" };`
  3. `const filled = fillTemplate(template, fields, variables, encoders); if (filled.ok) return { ok: true, text: filled.text };`
  4. `return filled.reason === "missingVariable" ? { ok: false, passive: { kind: "missingVariable", variable: filled.variable } } : { ok: false, reason: "missingValue" };`

  T016 passes.
- [X] T023 [US2] Use the gate and `startsWithHttp` in both action modules.
  - **`src/core/link-actions.ts`**: `resolveLinkAction` becomes
    `const gate = gateAction(action, action.urlTemplate, fields, variables, { field: encodeURIComponent, variable: asIs }); if (!gate.ok) return gate;`,
    followed by the unchanged `invalidLeadingVariable` and `isHttpUrl` checks on `gate.text`. Also:
    - `invalidLeadingVariable` uses `startsWithHttp(lookupVariable(variables, used) ?? "")`;
    - drop the now-unused imports (`evaluateConditions`, `fillTemplate`).
  - **`src/core/discover-actions.ts`**:
    - `QueryResolution` becomes `{ ok: true; query: string } | Exclude<Gate, { ok: true }>`;
    - `resolveDiscoverQuery` becomes
      `const gate = gateAction(action, action.queryTemplate.trim(), fields, variables, { field: kqlQuote, variable: kqlQuote }); return gate.ok ? { ok: true, query: gate.text } : gate;`;
    - drop the unused imports.

  The existing `link-actions`, `discover-actions` and `preview` tests pass unchanged.
- [X] T024 [US2] In `src/options/model.ts` (D2, D7), `variableWarnings`:
  - computes `applies` as `environments.filter((environment) => appliesTo(action, environment.id))`;
  - computes the missing warnings from `missingVariables(template, environment.variables)`, keeping each
    warning's shape `{ environment: environment.name, variable, kind: "missing" }` and order;
  - keeps the `invalidLeadingVariable` part unchanged.

  Also remove the imports that become unused (`VARIABLE_PREFIX`, `isVariablePath`, `lookupVariable`,
  `parsePlaceholders`), and import `appliesTo` from `../core/config` and `missingVariables` from
  `../core/template`. `tests/unit/options/model.test.ts` passes unchanged.
- [X] T025 [P] [US2] Options UI (D2, D3):
  - **`entrypoints/options/ActionEditor.tsx`**:
    - `applicable` becomes `environments.filter((environment) => appliesTo(action, environment.id))`;
    - delete the local `type Condition = …` and import `type Condition, type ConditionOp` from
      `../../src/core/conditions`;
    - render the operator `<option>`s with `CONDITION_OPS.map(...)`, imported from `../../src/core/config`,
      instead of `Object.keys(OPERATORS) as ConditionOp[]`;
    - keep `OPERATORS: Record<ConditionOp, MessageKey>`, so that a missing label is a compile error (SC-005).
  - **`entrypoints/options/ActionsSection.tsx`**: `environmentNames` returns
    `t("optionsAllEnvironments")` when `appliesToAll(action)`. Otherwise it filters by
    `appliesTo(action, environment.id)`.
- [X] T026 [US2] Verify:
  - `npm run typecheck && npx vitest run` pass, including the architecture test;
  - run the searches in quickstart.md §3 and confirm each expected count.

  Then amend `.specify/memory/constitution.md` to v1.0.4 by deleting rows D2–D8. Commit with the message
  `refactor: define each shared rule once (scope, operators, depth, XML, base path, variables, gating, http)`.

**Checkpoint**: the options page and the bar get every rule from the same function.

---

## Phase 6: User Story 4 - A copy failure shows its own reason (Priority: P4)

**Goal**: each copy item carries its own failure notice (D11, research R15).

**Independent Test**: `npx vitest run tests/unit/content/copy-menu.test.ts` passes.

- [X] T027 [US4] Create `tests/unit/content/copy-menu.test.ts`. It must be `.test.ts`, because vitest only
  includes that pattern, and it uses `createElement`, not JSX. It is the repo's first React render test and
  needs no new dependency (a probe already confirmed this setup works):
  - **Setup**:
    - the first line is `// @vitest-environment happy-dom`;
    - `vi.mock("../../../src/i18n", () => ({ t: (key: string) => key }))` keeps `wxt/browser` out of node;
    - set `(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true`;
    - render `CopyMenu` with `createRoot` (from `react-dom/client`) into a container appended to
      `document.body`, inside `await act(async () => …)` (`act` comes from `react`);
    - open the menu by clicking `[aria-haspopup="menu"]` and pick an item with `[role="menuitem"]`;
    - unmount after each test.
  - **Cases**:
    - an item returning `"x"` calls `onCopy("x")`;
    - an item returning `null` with `unavailable: "noticeTimeNotConverted"` calls
      `onFail("noticeTimeNotConverted")` and not `onCopy`;
    - an item returning `null` without `unavailable` calls `onFail("noticeCopyFailed")`;
    - an item whose `text` throws calls `onFail("noticeCopyFailed")`.

  The test fails before T028.
- [X] T028 [US4] In `src/content/CopyMenu.tsx`:
  - **Types**:
    - `CopyItem` gains `/** The notice when \`text\` returns null; "noticeCopyFailed" when not set. */ unavailable?: MessageKey;`;
    - `text`'s comment becomes "The text to copy, or null when it cannot be produced.";
    - the props become `onCopy: (text: string) => void; onFail: (notice: MessageKey) => void`;
    - import `type MessageKey` from `../i18n`.
  - **The item's click handler**:
    - when `text()` throws, call `onFail("noticeCopyFailed")`;
    - when it returns `null`, call `onFail(item.unavailable ?? "noticeCopyFailed")` and return;
    - otherwise call `onCopy(text)`.
- [X] T029 [US4] In `src/content/ActionBar.tsx`:
  - `copyToClipboard(text: string)` drops its `null` branch;
  - the "view with fixed time" item gets `unavailable: "noticeTimeNotConverted"`;
  - the cURL item keeps `text: () => buildCurl(…) ?? null`; with no `unavailable`, it gets "copy failed";
  - pass `onFail={setNotice}` to `CopyMenu`;
  - `JsonView`'s `onCopy={copyToClipboard}` is unchanged.

  Run `npm run typecheck && npx vitest run`: all pass.
- [X] T030 [US4] Amend `.specify/memory/constitution.md` to v1.0.5 by deleting row D11. Commit with the
  message `refactor: let each copy item name its own failure notice`.

**Checkpoint**: no notice is inferred from an empty result.

---

## Phase 7: User Story 5 - Browser state reaches the code through its host (Priority: P5)

**Goal**: the bar gets the page and the clock as props (D12, FR-018), and settings-change subscriptions go
through `src/storage.ts` (D13). Research R16 and R17.

**Independent Test**: `npx vitest run tests/unit/storage.test.ts` passes, and `grep -rn "location\.\|new Date()" src/content`
finds nothing. The e2e "copies the log link" and "copies the view with its relative time range made
absolute" tests pass (T038).

- [X] T031 [US5] In `tests/unit/storage.test.ts` (write first):
  - `fakeArea` also keeps `const listeners: Array<(changes: Record<string, unknown>) => void> = []`, exposes
    `onChanged: { addListener: (callback) => { listeners.push(callback); } }` and a test helper
    `emit(changes)` that calls every listener;
  - replace the `isConfigChange` describe with `createConfigStore(area).onChange(listener)`:
    - the listener runs once for `emit({ [CONFIG_KEY]: {} })`;
    - it does not run for `emit({ other: {} })`;
  - add the comment: other storage areas never reach `local.onChanged`, so there is no area check;
  - remove the `isConfigChange` import.

  The file fails before T032.
- [X] T032 [US5] In `src/storage.ts`:
  - `StorageAreaLike` gains
    `/** Changes in this area only (chrome.storage.local.onChanged). */ onChanged: { addListener(callback: (changes: Record<string, unknown>) => void): void };`;
  - `createConfigStore` also returns
    `/** Calls \`listener\` whenever the stored config changes. */ onChange(listener: () => void): void { area.onChanged.addListener((changes) => { if (CONFIG_KEY in changes) listener(); }); }`;
  - delete `isConfigChange`.
- [X] T033 [US5] In `entrypoints/background.ts`, replace the `browser.storage.onChanged.addListener(…)` block
  with `store.onChange(() => void sync());`. The call is synchronous at the top level of `defineBackground`,
  so the MV3 service worker registers it on start-up. Import only `createConfigStore` from `../src/storage`.
- [X] T034 [US5] Props in `src/content/ActionBar.tsx` (research R16):
  - **Props**: replace `hash: string` and its comment with
    `/** The page the bar sits on (the host passes \`location\`): Discover links keep its current time range, and copies read its address at the click. */ page: Pick<Location, "href" | "hash" | "origin">;`
    and `/** The clock for "view with fixed time". */ now: () => Date;`. Destructure them.
  - **Hash**: before the `buttons` memo, add `const hash = page.hash;`, and keep `hash` in the memo's
    dependency list.
  - **Copies**:
    - `docUrl` uses `` `${page.origin}${singleDocPath(prefix, identity)}` ``;
    - the fixed view uses `fixedTimeUrl(page.href, now())`.

  No `location` or `new Date()` remains in `src/content`.
- [X] T035 [US5] In `entrypoints/kibana.ts`:
  - in `createElement(ActionBar, …)`, replace `hash: location.hash,` with
    `page: location, now: () => new Date(),`;
  - replace the `browser.storage.onChanged.addListener(…)` block with `store.onChange(() => { void store.load().then(…).catch(…); });`,
    keeping the existing `.then` / `.catch` bodies;
  - drop `isConfigChange` from the `../src/storage` import.
- [X] T036 [US5] Run `npm run typecheck && npx vitest run`: all pass. Amend `.specify/memory/constitution.md`
  to v1.0.6 by deleting rows D12 and D13. Known Deviations is now empty, so replace the table body with the
  line "None open." and keep the section and its rules. Commit with the message
  `refactor: pass the page, the clock and settings changes in from the entry points`.

**Checkpoint**: only `entrypoints/` reads the page address, the clock and storage events.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T037 [P] Update `CLAUDE.md` (FR-021, research R19). In "## Docs", add a short paragraph in the file's
  style:
  > Architecture rules (principles I–V, quality gates, known deviations) are in the spec-kit constitution
  > `.specify/memory/constitution.md`. Spec-kit features live in `specs/`. Both are local-only, like
  > `docs/superpowers/`. `tests/unit/architecture.test.ts` enforces the constitution's import table: which
  > layer may import which, no browser globals in `src/core`, and no import cycles.

  In "**Layers:**", add one bullet pointing to that test. Commit `CLAUDE.md` and `.gitignore` together with
  the message `docs: point CLAUDE.md to the constitution and the architecture test; ignore specs/`.
- [X] T038 Run the full validation in `specs/001-fix-architecture-deviations/quickstart.md`:
  - `npm run typecheck`;
  - `npx vitest run`: all pass, including `tests/unit/architecture.test.ts` and
    `tests/unit/content/copy-menu.test.ts`;
  - `npm run build && npm run check:manifest`;
  - e2e with `KT_STACK=7`, `8` and `9 npm run e2e`. Start any stack that is down with `./docker/up.sh N`.
    Expect 27/27/28 passed with 3 skipped each;
  - `git diff --stat main -- tests/e2e`: empty;
  - the §3 searches.

  Report any difference with its output. Do not "fix" a test expectation.
- [X] T039 Final constitution check on `.specify/memory/constitution.md`:
  - version v1.0.6;
  - Known Deviations says "None open.";
  - `grep -n "TODO(" .specify/memory/constitution.md` is empty;
  - the Sync Impact Report summarizes v1.0.0 → v1.0.6.
- [X] T040 Ask the user whether to push and open the PR. Do not push without a yes. On yes:
  - push with `GH_TOKEN=$(gh auth token --user cllakyz) git -c credential.helper='!gh auth git-credential' push -u origin 001-fix-architecture-deviations`;
  - open the PR with `gh pr create`. The body summarizes D1–D13, FR-012, FR-013, FR-018 and the
    architecture test, states "no user-visible change", and ends with
    `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none. T001 must pass before anything else.
- **Foundational (Phase 2)**: empty.
- **US1 (Phase 3)**: after T001. T002 comes before T003, because the test encodes the v1.0.1 table.
- **US3 (Phase 4)**: after US1's commit (T009). Both touch `discover-actions.ts` and `ActionBar.tsx`.
- **US2 (Phase 5)**: after US3. T022 needs `HiddenReason` in `passive.ts` (T010), and T023 needs
  `ActionButton` (T011).
- **US4 (Phase 6)**: after US2. It touches `ActionBar.tsx`, which every earlier story also edits.
- **US5 (Phase 7)**: after US4, for the same `ActionBar.tsx` reason. T034 and T035 must both be done before
  typecheck passes.
- **Polish (Phase 8)**: T037 can run any time after T001. T038–T040 run after US5.

### Within Phase 5 (US2)

- T014–T017 (tests) first, in parallel.
- T018 (config) comes before T019, T024 and T025.
- T020 (structured text) and T021 (template) are independent of T018 and of each other.
- T022 (gate) comes after T019 and T010.
- T023 comes after T021 and T022.
- T024 comes after T018 and T021.
- T025 comes after T018 and T019.

### Parallel Opportunities

- US2 tests: T014, T015, T016 and T017 touch four different test files.
- US2 implementation: T020 (`fields`/`xml`/`curl`/`json-tree`) and T021 (`template`) can run alongside T018
  (`config`). T025 (options UI) can run alongside T023 and T024.
- US3: T010 and T011 both touch the action modules, so they run in order.
- T037 (`CLAUDE.md`) is independent of all code tasks.

---

## Parallel Example: User Story 2

```bash
# Tests first, together:
Task: "T014 appliesTo/appliesToAll/CONDITION_OPS tests in tests/unit/core/config.test.ts"
Task: "T015 missingVariables/startsWithHttp tests in tests/unit/core/template.test.ts"
Task: "T016 gateAction precedence tests in tests/unit/core/conditions.test.ts"
Task: "T017 isXmlText tests in tests/unit/core/xml.test.ts"

# Then independent owners, together:
Task: "T018 CONDITION_OPS, appliesTo, matchLength in src/core/config.ts"
Task: "T020 MAX_TEXT_DEPTH, isXmlText, §5.6 comment in src/core/{fields,xml,curl,json-tree}.ts"
Task: "T021 startsWithHttp, missingVariables in src/core/template.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. T001 (branch and baseline).
2. US1 (T002–T009): D1 is fixed, and the architecture test guards Principle I in CI from then on.
3. **Stop and validate**: run `npx vitest run` and the e2e Discover-action tests on any one stack.

### Incremental Delivery

Each story ends in its own commit with the unit suite green, and the stories go in the order US1 → US3 → US2
→ US4 → US5. The constitution's table shrinks with each commit: D1, then D9–D10, then D2–D8, then D11, then
D12–D13. If the work has to pause, every commit boundary is a consistent state.

---

## Notes

- `[P]` means different files and no dependency on an incomplete task.
- Never change an expected value in an existing test to make it pass. A failing test means the refactor
  changed behavior, so report it.
- Keep `console.debug("[kibanatool]", …)` logging and the "never break Kibana" containment exactly as they
  are (CLAUDE.md, Traps).
