---

description: "Task list for one-click action buttons on Discover result rows"
---

# Tasks: One-Click Action Buttons on Result Rows

**Input**: Design documents from `/specs/003-row-actions/`

**Prerequisites**: plan.md, spec.md (clarified 2026-10-16), research.md (R1–R20), data-model.md,
contracts/module-interfaces.md, quickstart.md

**Tests**: Included. The spec's success criteria need unit and e2e checks, and the project keeps a
test beside every rule. Each test task is written first and must fail until its implementation task
lands.

**Organization**:
- **Phase 2** holds the parts both stories share: settings, the client's prefetch, the shared
  button code, the strip and its host.
- **User Story 1** (7.17) adds the page-context script, the 7.17 row reader and the wiring.
- **User Story 2** (8.x/9.x) adds the grid row reader.

Everything goes on one branch, `003-row-actions`, as one pull request (research R18). It ships in
1.0.0, and the version does not change.

**Ground rules for every task**:
- **The expanded bar is unchanged (FR-022).** No existing expectation in `bar.spec.ts`,
  `copy.spec.ts`, `json.spec.ts` or the content unit tests may change.
  - The only allowed edits are the new `showInRow` field in settings literals and the settings
    version (T009).
  - Moving code out of `ActionBar.tsx` must not change its output.
- **Code style**: match the surrounding code: comment density, naming, and spec citations.
  - Cite this feature as `spec 003 FR-xxx` or `research R<n>`.
  - Never use `innerHTML` in `src/`.
  - `src/core` uses no browser API.
  - Errors in the content script, the strip and the bridge are logged only with
    `console.debug("[kibanatool]", …)`.
- **The page-context script** (`entrypoints/kibana-bridge.ts`) never imports `wxt/browser` and never
  uses an extension API.
- **Commits**: end every message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. The
  repo's local git config sets the commit email. Never push or open a PR without the user's yes.
- **Secrets**: `docker/.env.<major>` is sourced, never printed.
- **Browsing**:
  - One stack per browser session: the stacks share the `localhost` cookie `sid` (quickstart).
  - Never touch Alpha. M1 and M2 are the user's.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 or US2 from spec.md

---

## Phase 1: Setup

- [X] T001 Create the branch from an up-to-date `main`:
  - `git switch main && git pull`;
  - `git switch -c 003-row-actions`.

  The uncommitted `specs/003-row-actions/` and `.specify/feature.json` come along; T037 commits them.
  Confirm the baseline:
  - `npm run typecheck` is clean;
  - `npx vitest run` passes 509 tests.

  If either fails, stop and report.

---

## Phase 2: Foundational (shared by both stories)

**Purpose**: settings version 4, the client's batched prefetch, the button code shared by the bar
and the strip, the strip, its host and the placement math. Nothing here reads a Kibana row yet.

### Tests (write first)

- [X] T002 [P] Extend `tests/unit/core/config.test.ts` (research R14, data-model "Settings"):
  - **Version 4:** a config with `showInRow` on every action parses as is, and one action
    missing `showInRow` is rejected.
  - **Converting version 3:** a version 3 config parses to version 4 with `showInRow: false` on
    every action and nothing else changed.
  - **Converting versions 1 and 2:** they also get `valueMasks` as today, plus `showInRow: false`.
  - **`emptyConfig()`** has `schemaVersion: 4`.
  - **`rowActions`:** it returns only the actions with `showInRow: true`, in order, and `[]` for
    `[]`.
- [X] T003 [P] Extend `tests/unit/kibana/client.test.ts` with a `prefetchDocs` block (research R6,
  R7; contract "Kibana client"). Use the file's fake `fetch` helpers.
  - **The request.** Refs `app_log/a`, `app_log/b` and `legacy_log/c` send one POST to
    `<prefix>/internal/search/es` with `DOC_FETCH_HEADERS` and this body:
    - `params.index` is `"app_log,legacy_log"`;
    - `size` is 3;
    - `bool.should` has one `filter` of `term _index` + `ids` per index;
    - `minimum_should_match` is 1.
  - **Duplicates.** Repeated refs are sent once, and `size` counts them once.
  - **The cache.** After the answer, `fetchDoc("app_log","a")` resolves with the hit and sends no
    second request.
    - A ref missing from the answer makes `fetchDoc` reject with `KibanaError` kind `notFound`.
  - **Skipping cached refs.** A ref already cached, from `fetchDoc` or an earlier prefetch, is
    left out of the next request. A call whose refs are all cached sends nothing.
  - **Failure.**
    - A 403 makes `prefetchDocs` resolve, not reject. A following `fetchDoc` for one of its refs
      sends a new single-document request, because the failed entries were evicted.
    - A network error behaves the same.
  - **The cap.** After `DOC_CACHE_LIMIT + 1` distinct documents are cached, the first one is
    requested again on `fetchDoc`, and the last one is not.
- [X] T004 [P] Create `tests/unit/content/rows.test.ts` (data-model "Strip position"):
  - **`batches`**: `[]` → `[]`; 50 refs → one batch; 51 → `[50, 1]`; 120 → `[50, 50, 20]`, in
    order.
  - **`stripPosition`**:
    - plain: the row fully inside the viewport gives `left = row.right - gap - origin.left` and
      `top = row.top + gap - origin.top`;
    - clipped: a row wider than the viewport anchors at `viewport.right - gap`;
    - `controlsLeft` left of the row's right edge anchors at `controlsLeft - gap`;
    - a non-zero `origin` (the 8.x/9.x containing block) is subtracted;
    - a row partly above the viewport takes `top` from `viewport.top`;
    - a row entirely outside the viewport (above, below, or right of it) returns `null`.
- [X] T005 [P] Create `tests/unit/content/row-strip.test.ts` with the `// @vitest-environment
  happy-dom` header. Mirror `tests/unit/content/json-view.test.ts` (`IS_REACT_ACT_ENVIRONMENT`,
  `createRoot`, `act`, and the `../../../src/i18n` mock). Use a fake `KibanaClient` that implements
  every method:
  - `fetchDoc` returns a hit with `user_id` and `level_name`;
  - `getDataView` returns `{ title, timeFieldName: "datetime" }`;
  - `listDataViews` returns `[]`;
  - `getVersion` returns a version;
  - `prefetchDocs` resolves.

  Otherwise `ActionBar` never reaches `ready`.
  - **Same buttons as the bar (FR-005, SC-002).**
    - Render `ActionBar` with all actions and `RowStrip` with `rowActions(actions)` for the same
      log.
    - For every label in the strip, `a.kt-btn` has the same `href` and `target="_blank"` in both.
    - The strip shows only the marked actions, in the bar's order: links first, then Discover.
  - **Greyed.** A marked link whose template starts with an unset `{env.adminUrl}` renders
    `.kt-disabled` with `aria-disabled="true"` and a non-empty `title` (a missing log field hides
    an action, as in the bar).
  - **Loading.** While `fetchDoc` is pending, the strip shows one mark whose `aria-label` is
    `barLoading`.
  - **Error.** `fetchDoc` rejecting with `new KibanaError("notFound", …)` shows one mark whose
    `title` is `errorNotFound`.
  - **Nothing to show.** When no marked action applies (conditions fail), the component renders
    nothing.
  - **Clicks stay inside (FR-008).** A `click` and a `pointerdown` listener on the container's
    parent are not called when a strip link is clicked.
  - **Group.** The strip's buttons sit in an element with `role="group"` and `aria-label`
    `rowStripLabel`.
- [X] T006 [P] Create `tests/unit/content/row-host.test.ts` (happy-dom; contract `createRowHost`,
  research R9–R11):
  - **Setup.**
    - The document holds two fake rows `<div class="r">` with cells.
    - `rowOf = (t) => t.closest(".r")`.
    - `identify` returns an identity from a `data-id` attribute, or null when it is missing.
    - A spy `render`.
    - The host is a `kibanatool-row` element.
  - **Inactive by default.** Before `setActive(true)`, `pointerover` on a cell does nothing.
  - **Pointer.** After `setActive(true)`, `pointerover` on row 1's cell:
    - calls `render` with `{ row: row1, identity }`;
    - makes the host row 1's last child.
  - **Idempotent.** A second `pointerover` inside row 1 neither moves the host nor calls `render`
    again. A `MutationObserver` on the document records no `childList` mutation.
  - **Another row.** `pointerover` on row 2 moves the host into row 2 and renders row 2's identity.
  - **Leaving.** `pointerover` on an element outside any row detaches the host and calls
    `render(null)`.
  - **No identity.** On a row with no identity, `render(null)` is called and the host is detached.
  - **Focus.** `focusin` on a button in row 1 with the pointer elsewhere shows row 1. `focusout` to
    outside the rows hides it.
  - **Reused row.** `refresh()` after changing row 1's `data-id` re-renders with the new identity.
    After removing row 1 from the document, it hides.
  - **Scroll.** A `scroll` event hides the strip, and the next `pointermove` in a row shows it.
  - **Turning off.** `setActive(false)` detaches the host and calls `render(null)`.
- [X] T007 [P] Extend `tests/unit/options/model.test.ts`:
  - `newAction("link")` and `newAction("discover")` have `showInRow: false`;
  - `withAction` keeps `showInRow: true` through `parseConfig`.

### Implementation

- [X] T008 Settings version 4 in `src/core/config.ts` (research R14):
  - **Schema.** Add `showInRow: z.boolean()` to `actionBase`, change `schemaVersion: z.literal(4)`
    and set `SCHEMA_VERSION = 4`.
  - **`migrate`.** It accepts versions 1, 2 and 3:
    - versions 1 and 2 get `valueMasks` as today;
    - every action that is a plain object without a boolean `showInRow` gets
      `showInRow: false`;
    - non-object actions are left as they are, for zod to reject.

    Update its doc comment: "Version 3 had no showInRow (spec 003 FR-002)".
  - **`rowActions(actions)`.** Export it with a doc comment citing spec 003 FR-004: "The actions
    shown on result rows; the only place for this rule (constitution II)".

  T002 passes.
- [X] T009 Bring every settings literal to version 4 so `npm run typecheck` and the existing tests
  pass. Add `showInRow: false` to every action literal and change `schemaVersion: 3` to `4` in:
  - `examples/kibanatool-settings.json` (kept valid by `tests/unit/examples.test.ts`);
  - `tests/e2e/fixtures.ts` `e2eConfig()`, through the shared `shared` object;
  - `tests/e2e/{options,readonly,variables}.spec.ts`;
  - `tests/unit/core/{config,link-actions,discover-actions,data-view-names}.test.ts`;
  - `tests/unit/content/bar-data.test.ts`;
  - `tests/unit/options/{model,preview}.test.ts`;
  - `tests/unit/storage.test.ts`, where it builds settings.

  Where `options.spec.ts` checks a converted version 1 file, the expected settings gain
  `showInRow: false` and `schemaVersion: 4`. That is the only allowed change to an expected value.

  Then `npm run typecheck` and `npx vitest run` pass.
- [X] T010 [P] The option on the options page:
  - **`src/options/model.ts`.** `newAction` sets `showInRow: false` in `base`.
  - **`entrypoints/options/ActionEditor.tsx`.** Right after the "Enabled" checkbox, add a
    `label.inline` checkbox bound to `action.showInRow` (`update({ showInRow: event.target.checked
    })`), labelled `t("optionsShowInRow")`.
  - **Locales.** Add `optionsShowInRow` to `public/_locales/en/messages.json` ("Show in row") and
    `public/_locales/tr/messages.json` ("Satırda göster"), next to `optionsEnabled`.

  T007 and `tests/unit/i18n.test.ts` pass.
- [X] T011 [P] The batched prefetch in `src/kibana/client.ts` (research R6, R7):
  - **Exports.** `interface DocRef { index; id }`, `DOC_CACHE_LIMIT = 1000` with a `ponytail:`
    comment ("fixed cap; raise it if long sessions refetch noticeably"), and
    `prefetchDocs(refs): Promise<void>` on `KibanaClient`.
  - **The cap.** Cap the `docs` map: when an insert makes it larger than `DOC_CACHE_LIMIT`, delete
    its first key (`Map` keeps insertion order).
  - **`prefetchDocs`.**
    1. Deduplicate by `${index}/${id}` and drop the keys already in `docs`. Return if none are
       left.
    2. Group the ids by index.
    3. Build one `loadDocs` request with the body from the contract.
    4. Put one entry per ref into `docs`: `batch.then(map => map.get(key) ?? throw new
       KibanaError("notFound", "Document not found"))`. Each entry gets the same `.catch` eviction
       that `cached` applies.
    5. Await the batch, and swallow its rejection, so the call never rejects. The entries carry
       the error.
  - **Responses.** Read the hits through the existing `readJson` / `errorFor` paths, keyed by
    `${hit._index}/${hit._id}`.

  T003 passes, and every existing `client.test.ts` case is unchanged.
- [X] T012 Move the shared parts out of `src/content/ActionBar.tsx` into a new
  `src/content/log-buttons.tsx` (research R13; contract "Content"):
  - **`LogState`** and **`useLogState(identity, actions, client)`**: the effect that awaits
    `client.fetchDoc` with `loadDataViews` + `loadTimeFields`, and maps errors through
    `describeError`.
  - **`buildButtons(hit, actions, context)`**: the `flattenDoc` + `buildLinkButtons` +
    `buildDiscoverButtons` block.
  - **`ActionButtons({ links, discover, environmentName })`**: the `actionButton` rendering, with
    `.kt-btn` for links and `.kt-btn kt-discover` for Discover, and passive buttons as
    `span.kt-disabled` with `describePassive`.
  - **`describeError`.**

  `ActionBar` imports and uses them; its JSX order and class names stay the same. Then:
  - every existing unit test passes unchanged;
  - `KT_STACK=7 npm run e2e -- bar copy json` passes.
- [X] T013 [P] Create `src/content/rows.ts` (contract "Content"):
  - `ROW_BATCH_SIZE = 50`, citing spec 003 FR-013;
  - `ROW_HOST_TAG = "kibanatool-row"`;
  - `batches(refs)`;
  - `interface Rect`;
  - `stripPosition(input)`, with `gap = 4`, per data-model "Strip position".

  No DOM access. T004 passes.
- [X] T014 Create `src/content/RowStrip.tsx` and add its styles (data-model "Strip state"):
  - **Data.** It calls `useLogState(identity, actions, client)` and `buildButtons(…)`, taking the
    time range from `page.hash` as `ActionBar` does.
  - **Rendering.**
    - Loading: one `span.kt-muted` "…" with `aria-label={t("barLoading")}`.
    - Error: one `span.kt-error` "!" with `title={message}` and `tabIndex={0}`.
    - Ready with buttons: `<div className="kt-strip" role="group" aria-label={t("rowStripLabel")}>`
      around `ActionButtons`.
    - Ready without buttons: `null`.
  - **Clicks stay inside.** The root stops the propagation of `onClick`, `onPointerDown`,
    `onMouseDown` and `onKeyDown`, like `ActionBar`'s `keepInside` (research R12).
  - **Styles.** In `src/content/styles.ts`, add `.kt-strip`:
    - `position: absolute; right: 0; top: 0`, inline flex with a 4 px gap and `white-space:
      nowrap`;
    - padding `2px 4px`, background `var(--kt-surface)`, `1px solid var(--kt-border)`, radius
      6 px, `box-shadow: var(--kt-shadow-menu)`.

    Reuse `.kt-btn`, `.kt-discover` and `.kt-disabled`. No new color token.
  - **Locales.** Add `rowStripLabel` to both files: "kibanatool actions" / "kibanatool
    aksiyonları".

  T005 passes.
- [X] T015 Create `src/content/row-host.ts`: `createRowHost(doc, { host, rowOf, identify, render })`
  (contract; research R9–R11).
  - **Events.** Listeners on `doc` (capture: `pointerover`, `pointermove`, `focusin`, `focusout`,
    `scroll`; plus `doc.defaultView` `resize`, and `pointerleave` on `doc.documentElement`). They
    are added on `setActive(true)` and removed on `setActive(false)` and `destroy()`.
  - **Active row.** The row under the pointer, else the row containing `doc.activeElement`, else
    none.
    - When it changes, `identify(row)` runs.
    - With an identity: append the host as the row's last child (only when it is not already
      there), place it, and call `render`.
    - Otherwise: `host.remove()` and `render(null)`.
  - **Placing.**
    1. Set the host's inline style to `position: fixed; left: 0; top: 0; width: 0; height: 0;
       z-index: 999`.
    2. Read its rectangle as `origin`.
    3. Find the nearest scrolling ancestor of the row (first ancestor whose computed `overflowX` or
       `overflowY` is `auto` or `scroll`; else the viewport) as `viewport`.
    4. `controlsLeft` is the left edge of the last cell's `[data-test-subj^="docTableCellFilter"]`
       buttons, if any.
    5. Apply `stripPosition`; `null` sets `visibility: hidden`.
  - **`refresh()`.** Re-identify the active row. Re-render when the identity changed; hide when
    the row is disconnected.
  - **Scroll and resize** hide the strip until the next pointer event.
  - **Errors.** Each listener body is wrapped in `try/catch` with `console.debug`.

  T006 passes.

**Checkpoint**: `npm run typecheck` and `npx vitest run` pass. The bar behaves as before (T012's e2e
run).

---

## Phase 3: User Story 1 - One-click actions on 7.17 rows (Priority: P1) 🎯 MVP

**Goal**: on 7.17's legacy table, hovering or focusing a row shows the marked actions, and one click
runs them. The page-context script supplies the row identity on request.

**Independent Test**: on the 7.17 stack, with "User", "Error" and "Same user ±5" marked, hover the
`app-004` row:
- the strip shows those three with the bar's targets;
- clicking "Same user ±5" opens Discover in a new tab, and the row stays collapsed (quickstart
  checks 1–7 on 7.17).

### Tests for User Story 1 (write first)

- [X] T016 [P] [US1] Create `tests/unit/adapters/legacy-rows.test.ts` (research R1, R2):
  - **`reactRowHit`** works on fake element objects, so no React is needed.
    - **Found.** An object with own key `__reactInternalInstance$abc` whose value is
      `{ memoizedProps: {}, return: { memoizedProps: { row: { _index: "app_log", _id: "app-001" } } } }`
      gives `{ index: "app_log", id: "app-001" }`.
    - **React 17+.** The same with key `__reactFiber$xyz`.
    - **Not found** (`null`):
      - a `row` 6 levels up;
      - a numeric `_id`;
      - no React key;
      - a `return` chain that loops back on itself (no infinite loop);
      - a getter that throws.
  - **`findLegacyRows(root, "app-log")`** over
    `<table><tbody><tr data-test-subj="docTableRow" data-kibanatool-index="app_log" data-kibanatool-id="app-001">…</tr><tr data-test-subj="docTableRow">…</tr></tbody></table>`
    gives:
    - the first row with `{ dataViewId: "app-log", index: "app_log", id: "app-001" }`;
    - the second with `null`.

    With `dataViewId` `undefined`, both identities are `null`.
- [X] T017 [P] [US1] Extend `tests/unit/background/registration.test.ts` (research R3).
  - **The fakes.** `getRegisteredContentScripts` now honors `filter.ids` and returns the configured
    ids.
  - **Fresh install.** It registers both scripts with the same `matches`:
    - the content script as today;
    - the bridge with `id: BRIDGE_SCRIPT_ID`, `js: [BRIDGE_SCRIPT_FILE]`, `world: "MAIN"`,
      `runAt: "document_start"`, `persistAcrossSessions: true`.
  - **Content script registered, bridge missing.** It updates the content script and registers the
    bridge, never calling `updateContentScripts` with the bridge's id.
  - **Both registered.** It updates both.
  - **No granted origin.** It unregisters both ids.
- [X] T018 [P] [US1] Extend `tests/unit/adapters/detect.test.ts` (research R5). Build a legacy row
  with the bridge attributes:
  - **Main routes give rows.** `findRows` returns the row for pathname `/kibana/app/discover` with
    hash `#/?_a=(index:app-log)`, and for a saved search `#/view/abc?_a=(index:app-log)`.
  - **Other routes give none.** It returns `[]` for `#/context/app-log/app-001?_a=(index:app-log)`,
    for `#/doc/app-log/app_log?id=app-001`, for an ES|QL state and for a non-Discover pathname.
  - **`rowIdentity`** follows the same gating.
  - **`rowOf`** returns the `tr` from a `td` inside it and `null` from an element outside the table.

### Implementation for User Story 1

- [X] T019 [P] [US1] Create `src/adapters/legacy-rows.ts` (contract "Adapters"):
  - **Constants:** `LEGACY_ROW_SELECTOR`, `IDENTIFY_ROWS_EVENT`, `ROW_INDEX_ATTR`, `ROW_ID_ATTR`.
  - **`reactRowHit(row)`.**
    - Find the own key that starts with `__reactInternalInstance$` or `__reactFiber$`.
    - Walk `.return` at most 5 times, keeping a `Set` of visited fibers.
    - Return the first `memoizedProps.row` with string `_index` and `_id`, as `{ index, id }`.
    - Wrap the walk in `try/catch`, returning `null`.

    The doc comment states that it runs only in the page's context (spec 003 FR-010, research R1)
    and that it is verified on 7.17.29.
  - **`findLegacyRows(root, dataViewId)`** reads the two attributes.

  Add `RowView` to `src/adapters/types.ts`. T016 passes.
- [X] T020 [US1] Create `entrypoints/kibana-bridge.ts` (research R2):
  - `export default defineUnlistedScript(() => { document.addEventListener(IDENTIFY_ROWS_EVENT,
    annotate) })`.
  - `annotate`:
    1. For each `document.querySelectorAll(LEGACY_ROW_SELECTOR)` row, call `reactRowHit(row)`.
    2. Set both attributes when it is found, else remove both.
    3. The whole body sits in `try/catch` with `console.debug("[kibanatool] bridge:", error)`.
  - **Imports:** `defineUnlistedScript` from `#imports` and `../src/adapters/legacy-rows` only. A
    header comment says it runs in the page's context with no extension API, and that it is
    registered by `src/background/registration.ts`.
- [X] T021 [US1] Register the bridge (research R3):
  - **`src/background/registration.ts`.**
    - Add `BRIDGE_SCRIPT_ID`/`BRIDGE_SCRIPT_FILE`.
    - Widen `RegisteredScript.runAt` to `"document_start" | "document_idle"` and add
      `world?: "MAIN"`.
    - Rewrite `syncContentScripts` so that it:
      1. builds both scripts;
      2. asks `getRegisteredContentScripts({ ids: [CONTENT_SCRIPT_ID, BRIDGE_SCRIPT_ID] })`;
      3. updates the present ones and registers the missing ones;
      4. with no granted origin, unregisters every present id.
  - **`scripts/check-manifest.mjs`.** Also fail when `kibana-bridge.js` is missing, with the same
    message style as `kibana.js`.

  T017 passes.
  - **Build check.** `npm run build && npm run check:manifest` pass, and `.output/chrome-mv3/kibana-bridge.js`
    exists.
  - **No extension API.** `grep -c "chrome\.\|browser\." .output/chrome-mv3/kibana-bridge.js`
    must print 0. If it does not, find the import that pulled an extension API in and remove it.
  - **E2E copy.** `tests/e2e/global-setup.ts` copies the whole `.output/chrome-mv3`, so the bridge
    reaches the e2e extension with no change there.
- [X] T022 [US1] In `src/adapters/detect.ts` (contract "Adapters"; research R5):
  - **Route check.** Add a private check that reads the hash route, the part before `?`, and
    accepts only `/` and `/view/…`.
  - **`findRows(doc, location, prefix)`.** Same gating as `findDetailViews` (Discover path, not
    ES|QL), plus the route check. It returns `findLegacyRows(doc, dataViewIdFromState(state))`.
  - **`rowOf(target)`.** `target.closest(LEGACY_ROW_SELECTOR)`.
  - **`rowIdentity(row, location, prefix)`.** The same gating, then the legacy reader for that one
    row.

  T018 passes.
- [X] T023 [US1] Wire it in `entrypoints/kibana.ts` (contract "Content"; research R8):
  - **The host.** Create one `ROW_HOST_TAG` host with an open shadow root holding a `<style>` with
    `BAR_CSS` and a container. Give it a React root with the same `onUncaughtError` as the bars.
  - **`rowHost = createRowHost(document, { host, rowOf, identify, render })`.**
    - `identify(row)`: `document.dispatchEvent(new CustomEvent(IDENTIFY_ROWS_EVENT))`, then
      `rowIdentity(row, location, prefix)`.
    - `render(target)`:
      1. Set `host.dataset.ktTheme = themeBehind(host)`.
      2. Render `RowStrip` keyed `${index}/${id}`, with `actions: rowActions(actions)`, `client`,
         `prefix`, `page: location` and `environment`, or `null`.
  - **In `run()`.**
    - **Gate.** `const marked = environment ? rowActions(actions) : []`.
    - **With marked actions:**
      1. `rowHost.setActive(true)` and `rowHost.refresh()`;
      2. dispatch `IDENTIFY_ROWS_EVENT`;
      3. `findRows(document, location, prefix)`;
      4. for each of `batches(refs)`, `void client.prefetchDocs(batch)`;
      5. once per data view, warm the lookups the strip's Discover buttons need:
         `loadDataViews(client, marked)` and then `loadTimeFields(client, timeFieldTargets(marked,
         dataViewId, views))`, with errors swallowed as those helpers already do. The client caches
         both. Otherwise the first hovered row would wait for a data view request, and SC-003
         would fail.
    - **Otherwise:** `rowHost.setActive(false)`.
    - **Errors.** Keep the existing `try/catch`.
  - **The observer.** Do not widen it. Its `attributeFilter: ["href"]` must stay, so the bridge's
    writes do not trigger passes (research R9). A one-line comment says so.
- [X] T024 [US1] E2E for 7.17 (quickstart checks 1–7; contract "E2E hooks").
  - **`tests/e2e/fixtures.ts`.**
    - Extend the `declare const chrome` block with `scripting.unregisterContentScripts`.
    - Add `markInRow(config, ids)`, which returns a copy with `showInRow: true` on those action
      ids.
  - **`tests/e2e/kibana.ts`.** Add:
    - `openTable(page, target)`: like `openDoc` (in the given page), but it waits for the first result row and does
      not expand it;
    - `resultRows(page)`: `[data-test-subj="docTableRow"]` on 7, otherwise
      `[role="row"]:has([data-test-subj^="dscGridSelectDoc-"])`;
    - `strip(page)`: `page.locator("kibanatool-row")`;
    - `extensionRequests(page)`: collects the requests whose `kbn-xsrf` header is `kibanatool`,
      with their parsed bodies.
  - **`tests/e2e/rows.spec.ts`.** It starts with `test.skip(stack.major !== 7, "8.x/9.x arrive in
    User Story 2")`, which T032 removes. Tests:
    1. **"shows the marked actions on a hovered row and runs one with one click".**
       - Setup: mark `user`, `error` and `same-user`, and open `app-log` with
         `extra.uid:"uid-004"`. Wait until the first prefetch response and the data view lookup
         (`/api/data_views/data_view/` or `/api/index_patterns/index_pattern/`) have both arrived.
       - **SC-003 timing, measured in the page.** Dispatch `pointerover` on the row's first cell
         inside `page.evaluate`, and poll with `requestAnimationFrame` until
         `kibanatool-row`'s shadow root holds an `a.kt-btn`. Expect less than 300 ms.
       - **The strip's links.** It shows links labelled `User`, `Error` and `Same user ±5`, with
         hrefs `https://admin.example.com/users/100004` and
         `https://errors.example.com/?id=app-004`.
       - **One click.** `followToNewTab` on `Same user ±5` lands on Discover. Back on the first
         page, `[data-test-subj="docTableDetailsRow"]` has count 0.
       - **SC-002.** Then expand the row as `openDoc` does. `barLinks` gives the same href for
         each of the three labels.
    2. **"shows a greyed action with its reason".** Mark `window`, open `all-logs` with
       `extra.uid:"uid-001"`, and hover:
       - `.kt-disabled` with text `±5 minutes`;
       - `aria-disabled="true"`;
       - a non-empty `title`.
    3. **"keyboard focus shows the strip and Tab reaches it".**
       - Focus the first row's `[data-test-subj="docTableExpandToggleColumn"] button`: the strip
         is visible.
       - Press Tab at most 6 times until `document.activeElement` is the `kibanatool-row` host,
         with focus inside its shadow root. Expect that to happen.
    4. **"sends nothing and adds nothing when no action is marked; marking works without a
       reload".**
       - With the default `e2eConfig()`, hover three rows: no extension request, and
         `kibanatool-row` has count 0.
       - Then `writeStored(markInRow(e2eConfig(), ["user"]))` and hover again: `User` is visible.
    5. **"keeps the table layout while the strip shows".** Read the cell rectangles of the first
       two rows with the pointer on the query bar, then while hovering row 1. Expect them equal.
    6. **"fetches rows in batches and never twice".** With `user` marked, open `all-logs` and
       scroll the table container to its end:
       - every extension request has at most 50 ids in total;
       - no `index/id` pair appears in two requests.
    7. **"fails closed without the page-context script" (SC-007).**
       - The order matters, because writing settings makes the background register both scripts
         again:
         1. `configure(markInRow(e2eConfig(), ["user"]))`, which waits for the registration;
         2. call `chrome.scripting.unregisterContentScripts({ ids: ["kibanatool-bridge"] })` in the
            worker;
         3. open the table and hover.
       - `kibanatool-row` shows no link.
       - `openDoc` on the same target still loads the bar (`.kt-menu`).
       - The fixture's console check reports no `[kibanatool]` error.

  Run `KT_STACK=7 npm run e2e -- rows`, then the full `KT_STACK=7 npm run e2e`.
- [X] T025 [US1] Row fixtures:
  - **`tests/e2e/capture.spec.ts`.** Add a `capture rows` test per stack:
    1. Open `app-log` with query `user_id:100001`. By the seed's datetimes, the first three rows
       are `app-001`, `app-006` and `app-011`.
    2. Mark `user` so the extension is active.
    3. On 7, dispatch `IDENTIFY_ROWS_EVENT` from `page.evaluate`.
    4. Clone the first three result rows without `kibanatool-row`, inside `<table><tbody>` on 7.
       Strip SVGs as the existing capture does.
    5. Write `tests/fixtures/rows/<version>.json` with `{ pathname, hash, prefix, identities,
       html }`. The `identities` are the three known ids with `dataViewId: "app-log"`.
  - **`tests/unit/adapters/row-fixtures.test.ts`** (happy-dom):
    - for each file in `tests/fixtures/rows/`, `findRows` gives exactly its `identities`;
    - the list of files equals `["7.17.29.json"]`. T033 extends it.
  - **Run** `KT_STACK=7 KT_CAPTURE=1 npm run e2e -- capture`.
- [X] T026 [US1] Commit Phase 2 and US1:
  - **Files:** code, unit tests, e2e, fixtures and `examples/`.
  - **Message:** `feat: one-click action buttons on 7.17 result rows`. The body names:
    - settings version 4 and its conversion;
    - the page-context script and its pull protocol;
    - the batched prefetch;
    - FR-001–FR-022 as covered on 7.17.

**Checkpoint**: on 7.17 the strip works end to end, and the 8.x/9.x stacks still pass their
existing e2e, because the rows spec is skipped there.

---

## Phase 4: User Story 2 - One-click actions on 8.x and 9.x rows (Priority: P2)

**Goal**: the same strip on the 8.x/9.x data grid, with the identity read from each row's selection
checkbox. Depends on Phase 2 and on US1's T022–T023, which are the wiring and `detect.ts`.

**Independent Test**: on 8.19 and 9.5 (default and `obs` spaces), quickstart checks 1–6 and 8 pass.

### Tests for User Story 2 (write first)

- [X] T027 [P] [US2] Create `tests/unit/adapters/grid-rows.test.ts` (research R4):
  - **`parseGridDocId`** gives:

    | Input | Result |
    |---|---|
    | `"app_log::app-001::"` | `{ index: "app_log", id: "app-001" }` |
    | `".ds-logs-x::abc::r1"` | `{ index: ".ds-logs-x", id: "abc" }` |
    | `"idx::a::b::"` | `{ id: "a::b" }` |
    | `"noseparator"`, `"::id::"`, `"idx::::"` | `null` |

  - **`findGridRows(root, "app-log")`** over two `[role="row"]` elements, one holding
    `<input data-test-subj="dscGridSelectDoc-app_log::app-001::">` and one without a checkbox,
    returns only the first, with its identity.
- [X] T028 [P] [US2] Extend `tests/unit/adapters/detect.test.ts`:
  - **`findRows`.** It returns a grid row for pathname `/app/discover` with hash
    `#/?_a=(dataSource:(dataViewId:app-log,type:dataView))`, and for
    `/s/obs/app/discover#/?_a=(dataSource:(dataViewId:obs-logs,type:dataView))`.
  - **`rowOf`.** It returns the `[role="row"]` from a gridcell inside it.
  - **Header row.** `rowOf` returns `null` for a row without a selection checkbox, such as the
    header row.

### Implementation for User Story 2

- [X] T029 [P] [US2] Create `src/adapters/grid-rows.ts`:
  - `GRID_ROW_SELECTOR`;
  - `parseGridDocId(value)`, which splits at the first `::` and at the last `::` (research R4), and
    whose doc comment gives the format and the Elasticsearch index-name rule;
  - `findGridRows(root, dataViewId)`, which reads `[data-test-subj^="dscGridSelectDoc-"]` and takes
    each checkbox's closest `GRID_ROW_SELECTOR`.

  T027 passes.
- [X] T030 [US2] Extend `src/adapters/detect.ts`:
  - `findRows` returns legacy rows and grid rows;
  - `rowOf` also accepts the closest `[role="row"]` that holds a selection checkbox;
  - `rowIdentity` uses the grid reader for such a row.

  T028 passes, and so do T018's cases.
- [X] T031 [US2] **Gate: keyboard reach in the grid** (research R11). Build, then run a temporary
  Playwright check against 8.19 and 9.5. Do not commit it. Steps:
  1. Mark `user`.
  2. Click the first row's datetime cell, so that EUI focuses it.
  3. Confirm the strip is visible.
  4. Press Tab at most 4 times, and check whether focus enters the `kibanatool-row` host.

  - **If focus enters the host on both versions:** continue.
  - **If it does not:** stop and ask the user, with options and a recommendation. One example is a
    key on the focused row that moves focus into the strip. Do not pick one alone (memory rule
    "ask, don't decide").
- [X] T032 [US2] E2E on 8.x/9.x:
  - **`tests/e2e/rows.spec.ts`.**
    - Remove the version skip.
    - Keep test 7 at `stack.major === 7`.
    - In tests 1 and 5, "not expanded" means `[data-test-subj="docViewerFlyout"]` count 0 on 8/9.
    - Test 3 focuses the row's first data cell on 8/9, as T031 settled; the 7 variant stays.
    - Add test 8, **"works in the 9.x Observability view"** (`stack.major === 9`): in the `obs`
      space on `obs-logs` with `user` marked, hovering the first row shows a `User` link.
  - **Run** `KT_STACK=8 npm run e2e` and `KT_STACK=9 npm run e2e` in full, then `KT_STACK=7 npm run
    e2e -- rows`.
- [X] T033 [US2] Capture `tests/fixtures/rows/8.19.23.json` and `9.5.5.json`:
  - run `KT_STACK=8 KT_CAPTURE=1 npm run e2e -- capture` and the same for 9;
  - set the file list in `row-fixtures.test.ts` to the three versions.

  `npx vitest run` passes.
- [X] T034 [US2] Commit:
  - **Files:** grid adapter, detect, e2e, fixtures and tests.
  - **Message:** `feat: row buttons on the 8.x/9.x data grid`.

**Checkpoint**: quickstart checks 1–8 pass on all three stacks.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T035 [P] Docs (research R19):
  - **`README.md`.** Describe row buttons next to the bar description:
    - "Show in row" in the action editor;
    - hover or focus shows the strip;
    - one click;
    - the bar keeps everything;
    - 7.17 reads the row identity from Kibana's page data.
  - **`CHANGELOG.md` `[1.0.0]`.** One bullet "Row buttons", including settings version 4 and its
    conversion.
  - **`docs/store-listing.md`.**
    - Add a feature bullet in EN and TR.
    - Extend the `scripting` justification: "and a small script in the Kibana page's own context
      that reads only the index and id of result rows (Kibana 7.17), so actions can be shown on
      rows".
  - **`CLAUDE.md`.**
    - **Architecture:** the page-context script `kibana-bridge.js` (registered with
      `world: "MAIN"` next to `kibana.js`, idle until `kibanatool:identify-rows`), and the row
      strip.
    - **Traps:**
      - "7.17 row identity lives only in React data (`__reactInternalInstance$…` →
        `memoizedProps.row`), readable only in the page's context. Rows are reused for other
        logs, so identity is read fresh on every request and never cached per element";
      - "The bridge must not import `wxt/browser` or use an extension API";
      - "Inside the 8.x/9.x grid, `position: fixed` is not viewport-relative; the row host
        measures its own origin";
      - "8.x/9.x row identity is `dscGridSelectDoc-<index>::<id>::<routing>`";
      - "The content script's `MutationObserver` keeps `attributeFilter: ["href"]`; widening it
        makes the bridge's writes trigger passes";
      - "The three dev stacks share the `localhost` cookie `sid`; use one stack per browser
        session".
    - **Docs paragraph:** add spec-kit feature 003.
  - **`docs/superpowers/specs/2026-10-07-kibanatool-design.md`.** Under §2's rejected approaches
    and under §15's first bullet, add a dated note in Turkish: "2026-10-16: 7.17 satır kimliği için
    kullanıcı kararıyla kabul edildi; bkz. `specs/003-row-actions/`".
- [X] T036 SC-004 one-off on 7.17, not committed (quickstart check 6):
  - **Data.** Bulk-index 500 synthetic documents into a scratch index `scratch_log`, in the seed's
    time range. Use `stack.es` and `stack.elasticAuth` from `tests/e2e/stack.ts`, as
    `capture.spec.ts` does, so no secret is printed. The documents match `*_log`.
  - **Measure.** With `user` marked, open `all-logs` in a throwaway Playwright test, scroll the
    table to its end, and count the extension's requests. Expect ≤ 10.
  - **Clean up.** Delete the test and re-seed with `./docker/up.sh 7`.
  - **Record** the count, together with T024's SC-003 timing, for T037.
- [X] T037 Validation and record:
  - **Gates.** Run quickstart "Gates" on all three stacks, starting a stopped stack with
    `./docker/up.sh N`. Expect:
    - more than 509 unit tests;
    - e2e above 30/30/31, with 3 skipped each.
  - **The record.** Write `docs/verification/2026-10-row-actions.md` in Turkish, in the shape of
    `docs/verification/2026-10-text-view.md`:
    - the gates with their counts;
    - each quickstart check with its result;
    - the SC-003 and SC-004 numbers;
    - M1 and M2 as "kullanıcı yapacak".
  - **Commit** T035's docs, the verification record, `specs/003-row-actions/` (with this file's
    checkboxes up to date) and `.specify/feature.json`. Message: `docs: row buttons in README,
    CHANGELOG, store listing and CLAUDE.md; spec-kit feature 003`.

  Report any failure with its output. Do not "fix" an existing expectation.
- [X] T038 Ask the user to run M1 and M2 on Alpha (quickstart "Manual checks"), and wait. Record the
  answers in the verification doc:
  - as an amended commit if T037's commit is unpushed;
  - otherwise as a new commit.
- [ ] T039 Ask the user whether to push and open the PR. Do not push without a yes. On yes:
  - **Push** with `GH_TOKEN=$(gh auth token --user cllakyz) git -c credential.helper='!gh auth
    git-credential' push -u origin 003-row-actions`.
  - **Open** the PR with `GH_TOKEN=$(gh auth token --user cllakyz) gh pr create`.
    - Title: "One-click action buttons on result rows".
    - The body covers:
      - both stories;
      - the page-context script and the design change it implies;
      - settings version 4;
      - the test counts and SC numbers.
    - The body ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

  After the user says it is merged, pull `main`. Delete the branch locally and on GitHub only if the
  user asks.
- [ ] T040 Mark spec-kit feature 003 implemented: spec status "Implemented (PR #N, merged
  <date>)", all tasks checked. Ask the user whether this goes directly to `main` (as 002's T038
  did) or into the branch before the merge.

---

## Dependencies & Execution Order

- **Setup (T001)** → **Phase 2 (T002–T015)** → **US1 (T016–T026)** → **US2 (T027–T034)** →
  **Polish (T035–T040)**.
- **Inside Phase 2:**
  - T002–T007 come first (tests).
  - T008 → T009 (the sweep needs the schema).
  - T010, T011 and T013 are independent of each other.
  - T012 → T014 (the strip uses the shared code).
  - T013 → T015 (the host uses `stripPosition`).
- **Inside US1:**
  - T016–T018 come first.
  - T019 → T020 (the bridge imports the adapter).
  - T019 → T022 → T023.
  - T021 is independent.
  - T023 → T024 → T025 → T026.
- **US2 depends on US1's T022–T023** (`detect.ts` and the wiring). Inside US2:
  - T027–T028 come first.
  - T029 → T030 → T031 (gate) → T032 → T033 → T034.
- **Polish:** T035 can start after T034. T036 needs the full build. T037 needs T035 and T036.
  T038 → T039 → T040.

## Parallel Opportunities

- **Phase 2 tests:** T002, T003, T004, T005, T006 and T007 touch different files.
- **Phase 2 implementation:** T010, T011 and T013 can run beside T008–T009.
- **US1:** T016, T017 and T018 can run together. T019 and T021 can too.
- **US2:** T027 and T028 can run together. T029 can start while T028 is still being written.

Example for US1:

```text
Task: "T016 legacy-rows tests in tests/unit/adapters/legacy-rows.test.ts"
Task: "T017 registration tests in tests/unit/background/registration.test.ts"
Task: "T018 detect tests in tests/unit/adapters/detect.test.ts"
```

## Implementation Strategy

- **MVP is Phase 2 + US1:** the team's 7.17 Kibanas get one-click row buttons, and US1's checkpoint
  can be demonstrated on its own.
- **US2** brings 8.x/9.x to the same behavior, with the T031 keyboard gate as its first real
  risk.
- **One pull request.** Both stories go in one PR, and the store upload of 1.0.0 waits for it
  (user decision).
