# Research: One-Click Action Buttons on Result Rows

All findings below come from the local stacks on 2026-10-16: Kibana 7.17.29 (`:17601/kibana`), 8.19.23
(`:18601`) and 9.5.5 (`:19601`, default space and the `obs` Observability space), seeded by
`docker/seed.mjs`. Spike code ran in a Playwright page and was not committed.

## R1. Where a 7.17 row's identity comes from

- **Decision**: a script in the page's context reads the row's index and id from Kibana's own React
  data. Each `tr[data-test-subj="docTableRow"]` has an own property `__reactInternalInstance$<random>`
  (React 16). Walking `.return` from that fiber reaches a component whose `memoizedProps.row` is the
  Elasticsearch hit. Measured: one level up, `row._id = "app-001"`, `row._index = "app_log"`. The walk
  accepts the first `memoizedProps.row` within 5 levels whose `_index` and `_id` are strings. It also
  accepts the React 17+ key `__reactFiber$…`, so a later 7.17 patch on newer React still works.
- **Rationale**: a collapsed 7.17 row has no link or attribute that identifies the log (only the
  expand toggle and cell filter buttons). With the default column set, the document summary cell can
  show `_id` and `_index` as text, but that text is formatted, can be cut short, disappears once the
  user picks columns, and field values are never read from the page (`CLAUDE.md`). The user accepted
  this approach (spec Clarifications).
  The isolated content script cannot see these properties: page-script expandos are per JavaScript
  world.
- **Alternatives considered**:
  - Reading Discover's network responses: rejected in design spec §2, and 7.17 compresses them.
  - Running Discover's search again: KQL-to-query conversion is not available to the extension.
  - Expanding rows automatically: it changes Kibana's UI.
  - An `_id` column: users would have to add it, and 7.17 does not offer it.

## R2. How the page-context script hands the identity over

- **Decision**: pull, synchronously. Before reading 7.17 rows, the content script dispatches
  `new CustomEvent("kibanatool:identify-rows")` on `document`. The bridge's listener runs during that
  dispatch: for every `docTableRow` it sets `data-kibanatool-index` and `data-kibanatool-id`, or
  removes both when the row cannot be read. The content script reads the attributes right after
  `dispatchEvent` returns.
- **Rationale**:
  - **Rows are reused.** After a new search and after a sort change, React reused the same `<tr>`
    elements for other logs: `app-001…` became `app-004…`, then `app-028…`. An identity written
    earlier goes stale, so it must be fresh at every read.
  - **Synchronous.** `dispatchEvent` runs listeners of both worlds before it returns, so no reply
    channel or matching is needed.
  - **Idle.** The bridge does nothing until asked (clarified 2026-10-16). DOM attributes are the one
    thing both worlds share.
- **Alternatives considered**:
  - A bridge-side `MutationObserver` that annotates rows on every change: it works unasked and leaves
    stale windows.
  - `postMessage` with row indexes: asynchronous, and it needs a row-to-message mapping.

## R3. Loading the page-context script

- **Decision**: `src/background/registration.ts` registers a second script next to the content
  script.
  - **What it registers:** id `kibanatool-bridge`, file `kibana-bridge.js`, `world: "MAIN"`, the same
    `matches`, and `runAt: "document_start"`. The bridge only adds a listener, so it can be ready
    before the content script's first pass. `RegisteredScript.runAt` widens from the literal
    `"document_idle"` to a union.
  - **Lifecycle:** both scripts are registered, updated and unregistered together. Existence is
    checked **per id**: a missing script is registered and a present one is updated.
    `persistAcrossSessions` keeps an older install's content-script registration, so a browser that
    updates to this version starts with the content script registered and the bridge not.
    `updateContentScripts` with an unknown id throws, so it would block both.
    `registration.test.ts` covers that state.
  - **Build:** the bridge is a WXT unlisted script, `entrypoints/kibana-bridge.ts`. WXT's
    unlisted-script wrapper only calls `main()` and initializes plugins (none at runtime here). It
    uses no extension API, so the bundle runs in the page's context.
  - **Timing:** if a pass ever runs before the bridge's listener exists, it finds no identities, and
    the next pass (any DOM change, or the next hover) reads them. The pull protocol heals by itself.
- **Rationale**:
  - **Chrome support:** `scripting.RegisteredContentScript.world` exists since Chrome 102 (Chrome
    docs).
  - **No manifest change:** registration stays dynamic, so the manifest is unchanged.
    `check-manifest.mjs` still passes, and it gains a check that `kibana-bridge.js` is built.
  - **Scope:** the bridge runs only on granted Kibana origins, with the content script (FR-020).
- **Alternatives considered**:
  - A `<script>` tag injected by the content script: Kibana's CSP blocks inline scripts.
  - A `web_accessible_resources` file: forbidden by `check-manifest.mjs`.
  - `executeScript` on demand: needs a background round trip per read.

## R4. Where an 8.x/9.x row's identity comes from

- **Decision**: from the row's selection checkbox, `[data-test-subj^="dscGridSelectDoc-"]`. Its
  value is `<index>::<id>::<routing>`, and the row is its closest `[role="row"]`.
  - **Index:** the text before the first `::`. Index names cannot contain `:` (Elasticsearch ≥ 7).
  - **Id:** the text between the first `::` and the last `::`, so an id that itself contains `::`
    survives.
- **Rationale**:
  - **Where it was found:** the selection checkbox is present on 8.19 and on 9.5, both in the default
    space and in the `obs` space (design spec §3).
  - **Data streams:** in `obs` the index is a `.ds-…` backing index, which the doc fetch already
    accepts.
  - **Virtualization:** the grid renders only the rows on screen (8 of 20 measured).
- **Alternatives considered**: the row's cell text. It is formatted, and the identity is not shown.

## R5. The data view, and which tables get strips

- **Decision**: the data view comes from the page address, `dataViewIdFromState(readAppState(hash))`,
  as the expanded bar's fallback does. With no data view in the address, row identities are null and
  no strip is shown.
- **Main table only:** `findRows` returns no rows when the hash route is the surrounding-documents
  view (`#/context/…`) or the single-document view (`#/doc/…`). Only the main result table, `#/` or
  a saved search's `#/view/<id>`, gets strips (spec Out of Scope).
  - **Why explicit:** `isDiscoverPath` checks only the path, so without this check those hash routes
    would count as Discover.
  - **The bar differs:** the expanded bar finds expanded rows by their DOM, so it can also appear in
    7.17's surrounding-documents table (not measured). The spec's wording was corrected during
    planning so it no longer claims otherwise.
- **Rationale**:
  - A Discover table always shows one data view.
  - The 7.17 bridge stays limited to index and id (FR-010).

## R6. Fetching the rows' logs in one request

- **Decision**: `KibanaClient.prefetchDocs(refs)` sends one `POST <prefix>/internal/search/es` with
  `params.index` set to the distinct indices joined by `,` and this body:
  `{ size: refs.length, query: { bool: { should: [ per index: { bool: { filter: [ { term: { _index } }, { ids: { values } } ] } } ], minimum_should_match: 1 } } }`.
  - Verified on 7.17, 8.19 and 9.5: one request returned exactly `app_log/app-001`, `app_log/app-002`
    and `legacy_log/legacy-001`, and skipped a missing id.
  - The answer fills the client's existing per-document cache. A requested document that is missing
    becomes a "not found" entry. A failed request rejects every entry of the batch, and the cache
    evicts them, so a later `fetchDoc` retries one by one.
  - Refs are deduplicated first, and refs already in the cache are skipped, so a document is
    fetched once while it stays cached (FR-013). `size` is the deduplicated count.
  - Batches hold at most `ROW_BATCH_SIZE = 50` refs. Rows found in one run of the content script's
    existing 100 ms debounced pass form one batch.
- **Rationale**:
  - **Exact matches:** a plain `ids` query across several indices can also return the same id from
    another index. The per-index `term` filter returns only the requested pairs, so `size` equals
    the ref count.
  - **Same endpoint:** it uses the endpoint and headers the expanded bar already uses.
- **Alternatives considered**:
  - Fetching on hover: ruled out in clarify (buttons must not wait).
  - Elasticsearch `_mget`: not exposed through Kibana's internal search route.

## R7. A bounded document cache

- **Decision**: the client's document cache keeps at most 1,000 documents. When a new entry would
  exceed that, the oldest entry is dropped, and it is fetched again if it is needed.
  - This comes with a `ponytail:` note: it is a fixed cap, to be raised if long sessions refetch
    noticeably.
  - Spec FR-016 now says "while the page is open, in a bounded number" (reworded during planning).
- **Rationale**: today the cache only ever holds the logs a user opens. With row prefetch, a long
  Discover session could otherwise keep thousands of logs in memory. 1,000 is twice the largest
  result list (`discover:sampleSize` 500), so a row that is still shown is never dropped before it is
  used.
- **Alternatives considered**: evicting by row visibility, which ties the client to the DOM, or no
  cap at all.

## R8. When rows are read and prefetched

- **Decision**: only while `rowActions(actionsForEnvironment(config, environment.id))` is not empty.
  Then the content script's existing pass (debounced `MutationObserver` and `hashchange`) also finds
  the rows, asks the bridge (7.17), and prefetches new identities.
  - With no marked action, nothing runs: no event, no request, no host (FR-014).
  - A settings change re-runs the pass, so marking an action works without a reload (FR-014a).
- **Rationale**: the gate is the same rule that decides the buttons, so the two cannot disagree.

## R9. One strip host, moved into the active row

- **Decision**: a single custom element `kibanatool-row`, holding one shadow root and one React root.
  - **Where it sits:** it is moved into the active row as that row's last child. Its DOM position
    then follows the row's cells, so Tab from a control in the row reaches the strip (FR-017).
  - **Out of flow:** it is `position: fixed`, so the table never lays out around it.
  - **No observer loop:** placement is idempotent. With the guard `mounts.ts` uses (`isPlaced`), the
    host moves only when the active row changes. A move is a `childList` mutation, so it triggers
    one more pass of the content script, and that pass finds the host already placed and changes
    nothing. The strip's own rendering happens inside its shadow root, which the page-level
    `MutationObserver` does not see. The bridge's attribute writes are not observed either: the
    observer's `attributeFilter` is `["href"]`, and it must stay narrow.
- **Measured**:
  - **Layout:** an out-of-flow custom element (with a shadow root) appended to every row left all
    cell rectangles unchanged on 7.17 and 9.5.
  - **React:** on 7.17, a new search and a sort change re-rendered the rows with the elements in
    place, and React logged no error. On 9.5, virtual scrolling up and down raised no page error.
- **Alternatives considered**:
  - One host per row: up to 500 React roots.
  - A host under `<body>`: the strip would then be outside the row's tab order.
  - A table column: it changes the layout (FR-007).

## R10. Placing the strip

- **Decision**: the strip sits at the right end of the row's visible part, top-aligned with the row.
  - **Visible part:** the row rectangle clipped to its nearest scrolling ancestor (7.17
    `.kbnDocTableWrapper`, 8.x/9.x `.euiDataGrid__virtualized`).
  - **Right edge:**
    - **7.17:** the left edge of the last cell's `docTableCellFilter` buttons when there are any, so
      they stay usable (FR-007). Measured: they sit at the cell's top right, 40 px wide.
    - **8.x/9.x:** the visible right edge. Measured: the grid's cell actions appear above the
      hovered cell, at its left, so the right end is free.
  - **Containing block:** a `position: fixed` element inside a grid row is not placed relative to
    the viewport. Measured: `left: 7px; top: 5px` landed at (311, 539) on 8.19 and at (411, 533) on
    9.5, but at (7, 5) on 7.17, because an ancestor of the grid makes a containing block. The host
    therefore measures its own origin (place at 0,0, read its rectangle) and subtracts it.
  - **Scrolling:** the strip hides on scroll and on resize, and the next pointer move shows it again.
  - **Anchor:** the host is a zero-size anchor at the strip's top-right corner, and the strip grows
    to the left inside the shadow root. Its width never enters the math, so the position is known
    before React has rendered the buttons.
  - **Pure part:** `stripPosition` turns the measured rectangles into a position, and unit tests
    cover it.
- **Rationale**: this keeps Kibana's controls usable on every version, and the same placement code
  works whatever the containing block is.

## R11. Which row is active

- **Decision**: the row under the pointer wins. Otherwise the row that contains keyboard focus is
  active; otherwise none, and the host is detached.
  - **Events:** document-level `pointerover`, `focusin` and `focusout` listeners, plus
    `pointerleave` on the document element.
  - **Row selectors:** 7.17 `tr[data-test-subj="docTableRow"]`; 8.x/9.x the `[role="row"]` that holds
    a `dscGridSelectDoc-` checkbox.
- **Rationale**: one rule covers mouse and keyboard (FR-006), and the strip never shows for two rows.
- **Fresh identity on hover:** the active row's identity is read when it becomes active, and again
  at every pass (`identify`; on 7.17 this means one more `IDENTIFY_ROWS_EVENT`). A row React reused
  may change only its text, which the content script's observer (`childList` plus `href`) does not
  report. So the strip never trusts an earlier pass. A hovered row whose log was not prefetched
  fetches it alone and shows the loading mark meanwhile.
- **To verify first in User Story 2:**
  - **7.17 is sound:** the strip follows the row's cells in DOM order, and a row's controls are
    ordinary tab stops.
  - **The grid is not yet measured:** EUI's data grid manages focus itself (`euiDataGrid__focusWrap`,
    cell content set to `tabindex="-1"`). That Tab reaches a host placed after the cells is assumed,
    not measured.
  - **If it does not:** the strip's buttons must still be reachable by keyboard (FR-017). A
    fallback, for example a key on the focused row that moves focus into the strip, is a UX choice.
    It goes to the user before User Story 2 continues.

## R12. Clicks stay in the strip

- **Decision**: the strip's root stops the propagation of `click`, `pointerdown`, `mousedown` and
  `keydown`, as `ActionBar`'s `keepInside` does. Links open with `target="_blank"`.
- **Rationale**:
  - FR-008: the 7.17 row must not toggle, and the grid must not select a row or open the flyout.
  - React stops native propagation at our own root inside the shadow root, so Kibana's handlers never
    see the event.

## R13. Shared code between the bar and the strip

- **Decision**: move out of `ActionBar.tsx` into `src/content/log-buttons.tsx`:
  - `useLogState(identity, actions, client)`: the document plus data views and time fields, or the
    error message (`describeError` moves too);
  - `buildButtons(…)`: the links and Discover buttons;
  - `ActionButtons`: a working link or a greyed span with its reason.

  `ActionBar` and `RowStrip` both use them. The strip passes `rowActions(actions)`.
- **Rationale**: constitution III ("UI that renders the same shape the same way MUST be one
  component") and FR-005 (the same rule decides shown, greyed and working). Each button depends
  only on its own action, so building from the marked subset gives exactly the bar's buttons for
  those actions.

## R14. Settings format version 4

- **Decision**:
  - **Schema:** `showInRow: z.boolean()` joins `actionBase`; `schemaVersion` becomes `4`
    (`SCHEMA_VERSION = 4`).
  - **Conversion:** `migrate` accepts versions 1, 2 and 3 and adds `showInRow: false` to every action
    object that lacks it. Versions 1 and 2 also keep getting `valueMasks`.
  - **New actions:** `newAction` sets `showInRow: false`.
  - **One rule:** `rowActions(actions)` in `config.ts` is the only place that decides which actions
    go on rows.
  - **Options page:** a "Show in row" checkbox right after "Enabled".
- **Rationale**: `CLAUDE.md`: a schema change bumps the version and converts older input inside
  `parseConfig`, or stored settings are wiped. FR-002 sets the default.
- **Alternatives considered**: `z.boolean().default(false)` with no version bump. An older build
  would then load a v4 file and silently drop the option.

## R15. Strings and theme

- **Decision**:
  - **New strings:** `optionsShowInRow` ("Show in row" / "Satırda göster") and `rowStripLabel` (the
    strip's group name: "kibanatool actions" / "kibanatool aksiyonları").
  - **Reused strings:** the loading mark uses `barLoading` as its name; the error mark's tooltip is
    the existing error message.
  - **Styles:** the strip uses the bar's tokens and classes (`--kt-surface`, `--kt-border`,
    `--kt-shadow-menu`, `.kt-btn`, `.kt-discover`, `.kt-disabled`, `.kt-muted`, `.kt-error`).
- **Rationale**: no new color pair, so `theme.test.ts` needs no new contrast pair (as in 002 T025).

## R16. Tests

- **Unit**:
  - config v3→v4 and `rowActions`;
  - `reactRowHit` with fake fibers;
  - the grid-row parse;
  - `prefetchDocs` (request body, cache filling, missing, failure, skip cached, cap);
  - `stripPosition`;
  - `RowStrip` in happy-dom (same buttons as the bar, greyed, loading, error, nothing when empty);
  - registration (two scripts, one lifecycle);
  - the options checkbox.
- **Fixtures**: `capture.spec.ts` also writes `tests/fixtures/<version>-rows.json`: the first three
  rows' HTML and their identities. For 7.17 it is captured after the bridge annotated the rows. A
  fixture test checks the adapters against them.
- **E2E** (`tests/e2e/rows.spec.ts`, all three stacks):
  - hover shows the marked buttons, the same as the expanded bar's;
  - one click opens a new tab, and the row stays collapsed or the flyout stays closed;
  - keyboard focus shows the strip, and Tab reaches it;
  - with no marked action there are no requests and no host;
  - marking an action works without a reload;
  - cell rectangles are unchanged while the strip shows;
  - a greyed button shows with its reason;
  - the 9.x `obs` space works;
  - with the bridge unregistered, 7.17 shows no strip and the expanded bar still works (SC-007).

  The extension's requests are counted by their `kbn-xsrf: kibanatool` header. Discover's own search
  uses `/internal/bsearch` or `/internal/search/ese`.

## R17. Measurements

- **Decision**:
  - **SC-003:** e2e asserts that hovering a prefetched row sends no request and shows the strip
    within 1 s; the 0.3 s target is measured in the page on a laptop and recorded in the
    verification doc. *(Changed on 2026-10-17: a 300 ms e2e bound failed on the shared CI runner at
    326–424 ms, where Kibana 9 keeps the main thread busy; a laptop measures 10–24 ms.)* The Alpha
    half is a manual check (M2).
  - **SC-004:** a one-off on 7.17. Add 500 temporary documents, scroll the 500-row list to its end,
    count the requests (≤ 10), then re-seed, as 002 measured SC-004.
  - **SC-005:** in e2e.
- **Rationale**: a 500-document seed would change the counts that other e2e specs rely on.

## R18. Delivery

- **Decision**: one branch, `003-row-actions`, cut from main. User Story 1 is committed first, then
  User Story 2, then the docs, in one pull request (user decision, 2026-10-16). Release 1.0.0; the
  version number does not change.

## R19. Docs to update

- **README:** row buttons and the "Show in row" option.
- **CHANGELOG** `[1.0.0]`.
- **CLAUDE.md:**
  - Architecture: the page-context script, its registration and its pull protocol.
  - Traps:
    - the React internal path and its 7.17-only scope;
    - rows are reused, so identity is never cached per element;
    - the bridge must not import `wxt/browser` or any extension API;
    - fixed positioning inside the grid;
    - the `dscGridSelectDoc` format.
- **docs/store-listing.md:** the `scripting` justification now also covers a script in the page's
  context that reads only row identities.
- **The design spec:** a dated note under §2 and §15.
- **docs/verification/2026-10-row-actions.md.**

## R20. Constitution

- **Decision**: no amendment.
  - **Principle I:** `entrypoints/kibana-bridge.ts` imports `src/adapters/legacy-rows.ts`
    (entrypoints may import all of `src`).
  - **Principle V:** the bridge entrypoint reads `document`, which only entrypoints may do. The React
    walk is a pure function of an element, and so are the adapters, which receive `root`.
  - **Principle III:** the bridge bundle imports only that adapter, whose own imports are types.
  - **Principle II:** `rowActions` is the one rule; `ROW_BATCH_SIZE` and the cache cap are single
    exported constants.
