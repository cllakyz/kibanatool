# Research: Fix Architecture Deviations D1–D13

All decisions below were checked against the code at 56e48a2. Two of them were the user's calls:
R1 and R20. The Technical Context had no open questions left.

## R1 — D1: inject the Discover link builder

- **Decision**: `DiscoverContext` loses `prefix` and gains `link: (target: DiscoverTarget) => string`.
  `DiscoverTarget` is `{ dataViewId, query, time? }` and is declared in `src/core/discover-actions.ts`.
  `ActionBar` passes `(target) => discoverUrl({ prefix, ...target })`. `discoverUrl` keeps its
  behavior; its options type becomes `{ prefix: string } & DiscoverTarget`, which is a kibana → core
  type import and therefore allowed.
- **Rationale**: this is the user's choice (option B). Core knows only the target. Buttons keep
  carrying `url`, so D10's single button type fits with no mapping step. The discover tests keep
  their expected URLs, because their context helper builds the link with the real `discoverUrl`
  (tests are outside the import table).
- **Alternatives**: (A) return the target and let `ActionBar` turn each one into a URL. Rejected:
  it adds a mapping step in `ActionBar`, and the discover tests' expected values would change from
  URLs to targets.

## R2 — The architecture check (Gate G2, FR-002, FR-003)

- **Decision**: add a unit test, `tests/unit/architecture.test.ts`, that runs in vitest's node
  environment. It works in three parts:
  1. It reads every `src/**/*.{ts,tsx}` except `*.d.ts`. `typescript.preProcessFile(text, true,
     true)` lists the import specifiers. TypeScript 5.9.3 is already a devDependency. A probe
     confirmed that it reports plain imports, `import type`, `export … from`, `export * from`,
     `await import()`, `typeof import()` and side-effect imports. On real `.tsx` files it lists exactly
     the import lines and nothing from the JSX (`ActionBar.tsx`: 20 specifiers for 20 imports).
  2. It sorts each file into a group by path prefix and checks every specifier against the table
     (R3). Relative specifiers are resolved to a group. Bare specifiers are npm packages and are
     checked against the group's npm rule.
  3. For `src/core/**` it walks the AST (`ts.createSourceFile`). It reports any `Identifier` named
     `window`, `document`, `location`, `navigator`, `fetch`, `chrome` or `browser` that is a free
     reference. Property names, property assignments and declarations do not count. Comments are
     not in the AST, so "browser time zone" in `datemath.ts` does not count either.
  4. It checks for cycles with a depth-first search over the resolved relative imports, and reports
     the cycle as a path.
  
  The checker is a pure function `check(files: Map<path, source>)`, defined inside the test file.
  The suite runs it on the real tree, where it must report no violations. It also runs it on five
  synthetic trees, one for each violation in SC-002, where it must report exactly that violation.
  The exception list is an array in the test and is empty at the end (FR-003).
- **Rationale**: no new dependency (spec assumption). The synthetic cases make SC-002 permanent
  instead of a one-off manual plant. Today, grep finds no code reference to those globals in
  `src/core`, and madge reports 0 cycles. So once R3's table and D1 are in place, the check
  passes with no exceptions.
- **Alternatives**:
  - madge or dependency-cruiser: rejected, a new dependency.
  - Regex over source text: rejected, it misses forms like `typeof import()` and multi-line
    imports.
  - A core-only tsconfig without the DOM lib: rejected, because `URL` and `URLSearchParams`, which
    core uses, come from the DOM lib.

## R3 — Import table clarification (FR-004): constitution v1.0.1

- **Decision**: a PATCH amendment, made before the check is enforced. It changes these rows:
  - `src/content/**`, `src/options/**`: everything under `src/` and npm packages.
  - `src/*.ts` (root modules): `src/core/**`, other root modules, `wxt/browser`. `src/i18n.ts` may
    also import `public/_locales/en/messages.json`; it is a type-only import that derives
    `MessageKey`.
  - `entrypoints/**`: everything under `src/`, npm packages and WXT's virtual modules (`#imports`).
    The check does not scan `entrypoints/`, because nothing under `src/` may import it. The table
    is the reference for review.
  - The other rows stay as they are: core may import `zod`; kibana may import npm packages; adapters
    and background may import no npm packages.
- **Rationale**: a literal reading of the v1.0.0 table forbids the React imports in `src/content`
  and the message catalog import in `src/i18n.ts`. Neither was meant as a rule.

## R4 — D2: environment scope

- **Decision**: `src/core/config.ts` exports two functions:
  - `appliesToAll(action)`, which is `environmentIds.length === 0`;
  - `appliesTo(action, environmentId)`, which is `appliesToAll(action) || environmentIds.includes(environmentId)`.

  They are used as follows:
  - `actionsForEnvironment` uses `appliesTo`;
  - `variableWarnings` and `ActionEditor` filter `environments` by `appliesTo`;
  - `ActionsSection.environmentNames` shows "All environments" when `appliesToAll` is true, and
    otherwise filters by `appliesTo`.
- **Rationale**: the rule is written once and the "All environments" label stays. `parseConfig`'s
  repair of unknown ids is not touched.
- **Alternatives**: one `applicableEnvironments(environments, action)` only. Rejected, because
  `actionsForEnvironment` has an environment id, not a list, and the label needs "applies to all"
  as its own question.

## R5 — D3: condition operators

- **Decision**: `src/core/config.ts` exports `CONDITION_OPS = ["exists", "equals", "notEquals",
  "contains", "startsWith"] as const`. `conditionSchema.op` becomes `z.enum(CONDITION_OPS)`.
  `src/core/conditions.ts` derives its types from the schema: `type Condition =
  Action["conditions"][number]` and `type ConditionOp = Condition["op"]`. This is a type-only
  import, conditions → config. `ActionEditor` iterates over `CONDITION_OPS` for the options; the
  `Record<ConditionOp, MessageKey>` labels map makes a missing label a compile error (SC-005).
- **Rationale**: one list, and the shape is defined once (Principle III). `config.ts` never imports
  `conditions.ts`, so there is no cycle. That matters because R10 also has `conditions.ts` import
  config types.
- **Alternatives**: put `CONDITION_OPS` in `conditions.ts` and have config import it, like
  `VALUE_MASK_KINDS`. Rejected: with R10, `conditions.ts` needs `Action` from config, which would
  make a cycle.

## R6 — D4: expansion depth

- **Decision**: rename `MAX_JSON_DEPTH` in `src/core/fields.ts` to `MAX_TEXT_DEPTH` and export it.
  It covers XML too since Plan 6. `curl.ts` imports it and drops its own constant.

## R7 — D5: XML text

- **Decision**: `src/core/xml.ts` exports `isXmlText(text) = text.trim().startsWith("<")`.
  `parseXml`, `parseStructuredText` (fields), `jsonOf` (curl) and `jsonTextFields` (json-tree) use
  it.

## R8 — D6: base path

- **Decision**: `matchLength` gets its base path from `basePathOf(kibanaUrl)`. It already holds a
  parsed URL, so it parses the URL twice. That is negligible: at most once per environment per
  check.

## R9 — D7: missing variables

- **Decision**: `src/core/template.ts` gets two functions:
  - a private `missingVariable(paths, variables)`: the placeholder's first variable name when every
    path is an `env.` path and none has a value, otherwise `undefined`;
  - an exported `missingVariables(template, variables): string[]`: deduplicated, in template order.

  `fillTemplate`'s no-value branch calls `missingVariable`, and `variableWarnings` calls
  `missingVariables`.
- **Rationale**: the rule is written once. Today's behavior stays, including that `missingValue`
  wins over `missingVariable` in `fillTemplate`. In that branch no path has a value, so
  `missingVariable` returns a name exactly when all paths are variables, which is today's test.

## R10 — D8: shared gating

- **Decision**: `src/core/conditions.ts` exports `gateAction(action, template, fields, variables,
  encoders): Gate`, where `action` is `Pick<Action, "enabled" | "conditions">`. It returns one of:
  - `{ ok: true; text }`;
  - `{ ok: false; reason: "disabled" | "conditions" | "missingValue" }`;
  - `{ ok: false; passive }`.

  The order is: disabled, conditions, `fillTemplate`, then the mapping of the template failure.
  - `resolveLinkAction` calls it with the URL template and its encoders, then runs the
    leading-variable and URL checks.
  - `resolveDiscoverQuery` calls it with the trimmed query template.
- **Rationale**: `conditions.ts` is already about whether an action shows, and both action kinds
  already import it. No new file.
- **Alternatives**: a new `action-gate.ts`. Rejected: one more file with no gain.

## R11 — FR-012: http(s) prefix

- **Decision**: `src/core/template.ts` exports `startsWithHttp(text)`, built on one
  `/^https?:\/\//i`. `isHttpUrlTemplate` and `invalidLeadingVariable` use it. The pattern in
  `unusedOrigins` (`/^https?:\/\/[^*/]+\/\*$/`) is a different rule, the shape of an origin pattern,
  and stays.

## R12 — FR-013: cURL masking comment

- **Decision**: the doc comment of `maskKeepingText` cites `spec §5.6` (Plan 7 spec, "Maskeleme").
  That section requires JSON text to be masked inside and written back, and other text to keep only
  the value masks. `curl.ts` already uses `spec §N` to mean the Plan 7 spec.

## R13 — D9: `HiddenReason`

- **Decision**: move it to `src/core/passive.ts`, next to `PassiveReason`. Importers:
  `discover-actions.ts`, `link-actions.ts`, `conditions.ts` (the gate), `src/options/preview.ts`
  and `ActionEditor.tsx`.

## R14 — D10: one button type

- **Decision**: `src/core/types.ts` declares `ActionButton = { id; label; url } | { id; label;
  passive: PassiveReason }`; types.ts → passive.ts is a type import. `LinkButton` and
  `DiscoverButton` are removed. `ActionBar` gets one `actionButton(button, className)` renderer and
  calls it with `"kt-btn"` for links and `"kt-btn kt-discover"` for Discover. The rendered DOM stays
  identical.

## R15 — D11: per-item failure notice

- **Decision**: `CopyItem` gains `unavailable?: MessageKey`; when it is absent, the notice is
  `noticeCopyFailed`. `CopyMenu` handles a `null` result by calling `onFail(item.unavailable ??
  "noticeCopyFailed")`, so `onFail` takes a `MessageKey`. `onCopy` takes only a `string`, and
  `copyToClipboard` no longer handles `null`. The fixed-time item sets `unavailable:
  "noticeTimeNotConverted"`.
- **Check**: `tests/unit/content/copy-menu.test.ts`, a happy-dom unit test for `CopyMenu`. It is the
  repo's first React render test, and it adds no dependency:
  - mark the file with `// @vitest-environment happy-dom` and set
    `globalThis.IS_REACT_ACT_ENVIRONMENT = true`;
  - render `CopyMenu` with `createRoot` from `react-dom/client` into a container, inside `act` from
    `react`;
  - open the menu, click each `menuitem`, and check that `onFail` receives the item's
    `unavailable` key, or `noticeCopyFailed` when it has none.

  `@testing-library/react` would be a new dependency, so it is not used.

## R16 — D12 and FR-018: page and clock from the host

- **Decision**: `ActionBarProps` replaces `hash: string` with two props:
  - `page: Pick<Location, "href" | "hash" | "origin">`;
  - `now: () => Date`.

  `entrypoints/kibana.ts` passes `page: location` (the live object) and `now: () => new Date()`.
  The bar reads `page.hash` while rendering (for the Discover links' current time range, as a
  `useMemo` dependency) and `page.href` / `page.origin` / `now()` at click time.
- **Rationale**: the live object keeps today's freshness, even after history-API changes that do not
  re-render the bar (spec edge case). A test can pass a plain object. A probe confirmed that
  `window.location` is assignable to the prop type.
- **Alternatives**: a string `href` prop. Rejected: it would be stale between renders and break the
  fixed-time copy after a `replaceState`.

## R17 — D13: settings changes through storage

- **Decision**: `StorageAreaLike` gains `onChanged: { addListener(callback: (changes:
  Record<string, unknown>) => void): void }`. `createConfigStore(area)` also returns
  `onChange(listener)`, which calls `listener` when `CONFIG_KEY` is in `changes`. Both entry points
  use `store.onChange(...)`. `isConfigChange` is removed.
- **Rationale**: `chrome.storage.local.onChanged` (StorageArea.onChanged, Chrome 73+) fires only
  for the local area, so the `areaName === "local"` check goes away while the behavior stays the
  same. A probe confirmed that `browser.storage.local` is assignable to the widened interface. The
  storage tests' `fakeArea` gains `onChanged`.

## R18 — Constitution amendments (FR-020)

- **Decision**:
  - v1.0.1 when the import table is clarified (R3). It lands before the check.
  - Then one PATCH per completed user story, which deletes that story's rows. Story 1 also removes
    `TODO(ARCH_TEST)` and the G2 TODO note.
  - Each bump rewrites the Sync Impact Report and Last Amended.
  - The constitution file is local-only, so these edits are not part of the git commits.

## R19 — CLAUDE.md pointer (FR-021)

- **Decision**: add to the Docs section that the architecture rules are in
  `.specify/memory/constitution.md` and that it is local-only. The line names principles I–V, the
  gates and Known Deviations. It also says that `tests/unit/architecture.test.ts` enforces the
  import table, and that spec-kit features live under `specs/`, which is gitignored.

## R20 — Delivery

- **Decision**:
  - Branch: `001-fix-architecture-deviations` (the user's choice). It is created from `main` as the
    first task (a "Task 0", as in earlier plans). The `.gitignore` change (`specs/`), which is not
    committed yet, goes into the branch's docs commit.
  - Commits: one per user story, plus one docs commit (CLAUDE.md and `.gitignore`).
  - One PR, after the unit suite and the e2e matrix 7/8/9 pass.
  - Implementation order: US1 → US3 → US2 → US4 → US5. US3 comes before US2 because the D8 gate
    uses `HiddenReason` in its new home (D9); otherwise siblings would be coupled again.
