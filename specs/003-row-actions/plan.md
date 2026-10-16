# Implementation Plan: One-Click Action Buttons on Result Rows

**Branch**: `003-row-actions` (one branch, one pull request: User Story 1, then User Story 2); ships
in 1.0.0 | **Date**: 2026-10-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-row-actions/spec.md`

## Summary

Actions marked with a new "show in row" option appear as a strip at the right end of a hovered or
focused Discover result row, so one click runs them without expanding the row or opening the
flyout.

- **Identity:**
  - **7.17 (R1–R3):** a collapsed row carries no identity. A small script in the page's context reads
    the row's index and id from Kibana's React data and writes them on the row, only when the
    content script asks (a synchronous event). It is registered at runtime next to the content
    script, with `world: "MAIN"`.
  - **8.x/9.x (R4):** the identity is read from the row's selection checkbox.
- **Fetching (R6–R8):** the rows' logs are fetched in the background with one exact
  `/internal/search/es` request per batch of up to 50 rows. The answer fills the client's
  document cache, which the expanded bar shares. Nothing runs while no action is marked.
- **The strip (R9–R13):**
  - one host is moved into the active row and positioned out of flow, so the table's layout never
    changes;
  - it ends left of 7.17's cell filter buttons;
  - it renders the same buttons as the bar, through components moved out of `ActionBar`.
- **Settings (R14):** schemaVersion 4 adds `showInRow` (off by default; older settings convert).

## Technical Context

**Language/Version**: TypeScript 5.9 (strict, `noUncheckedIndexedAccess`), React 19

**Primary Dependencies**: WXT 0.21 (MV3 build, unlisted scripts), zod 4 (`jitless`). No new
dependency.

**Storage**: `chrome.storage.local`, key `kibanatool.config`, schemaVersion 3 → 4 with conversion
(R14). Fetched row logs live only in memory (R7).

**Testing**:
- Vitest: node environment, with happy-dom per file for components and DOM glue.
- Playwright 1.64 e2e against Docker Kibana 7.17.29, 8.19.23 and 9.5.5.
- Baseline at `64c8260`: 509 unit tests; e2e 30/30/31, with 3 skipped each.

**Target Platform**: Chrome MV3, Chrome ≥ 102 (`world` in registered scripts):
- the content script, plus the new page-context script, on granted Kibana origins;
- a shadow-root bar and a shadow-root strip.

**Project Type**: browser extension, a single project

**Performance Goals**:
- A prefetched row shows its strip within 0.3 s of hover (SC-003).
- At most one log request per 50 rows (SC-004).
- No request at all while nothing is marked.

**Constraints**:
- No new permission and no manifest change (FR-020).
- The table layout never changes (FR-007, SC-005).
- Kibana's own row controls stay usable.
- Field values are never read from the page (FR-012).
- The page-context script carries index and id only (FR-010).
- The content script and the bridge never break Kibana (FR-019).

**Scale/Scope**:
- About 9 source files changed and 6 new:
  - `kibana-bridge.ts`;
  - `legacy-rows.ts`;
  - `grid-rows.ts`;
  - `log-buttons.tsx`;
  - `RowStrip.tsx`;
  - `rows.ts` / `row-host.ts`.
- About 10 test files, one new e2e spec, one capture case and docs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v1.0.6 (`.specify/memory/constitution.md`), no open deviations.

| Gate | Pre-design | Post-design (R1–R20) |
|---|---|---|
| I. Dependencies point inward | The page-context script is a new entrypoint and needs the React walk. | PASS. `entrypoints/kibana-bridge.ts` → `src/adapters/legacy-rows.ts`, and entrypoints may import `src`. Adapters import only `src/core` types and `src/kibana/discover-state`, as `detect.ts` does. `src/content/*` → adapters, kibana and core. No cycle. The architecture test covers the new files with no exception. |
| II. One rule, one place | Risks: "which actions go on rows" restated by the options page and the content script; the batch size and cache cap as repeated literals. | PASS. `rowActions` in `config.ts` is the only rule; the content script calls it for both the gate (R8) and the strip's buttons. `ROW_BATCH_SIZE` and `DOC_CACHE_LIMIT` are single exported constants. The selectors and attribute names are exported once from their adapters and imported by the bridge, the content glue and the e2e specs. |
| III. Shared types live with their concept | Risk: a second button renderer and a second loading state in the strip. | PASS. `useLogState`, `buildButtons` and `ActionButtons` move to `src/content/log-buttons.tsx`, and `ActionBar` and `RowStrip` both use them (R13). `RowView` sits next to `DetailView` in `src/adapters/types.ts`. `DocRef` lives with the client that takes it. |
| IV. Failures carry their reason | Prefetch failures must reach the strip with their reason. | PASS. `prefetchDocs` puts each ref's outcome in the cache as a promise that rejects with a `KibanaError` (`notFound`, `network`, …). The strip shows the bar's message for that kind. `reactRowHit` and `parseGridDocId` return `null` to mean "absent", and no caller maps it to a message. |
| V. Browser state through parameters | The bridge and the row glue touch `document`, events and layout. | PASS. Only `entrypoints/kibana-bridge.ts` and `entrypoints/kibana.ts` read globals. `createRowHost(doc, render)`, `findRows(doc, location, prefix)` and `RowStrip` (page through props) take state as parameters. `stripPosition` is pure. |
| G1 typecheck · G2 unit + architecture · G3 build + manifest · G4 e2e 7/8/9 | — | PASS by design (quickstart.md). The manifest is unchanged. `check:manifest` also requires `kibana-bridge.js`. |

No gate is violated, so Complexity Tracking is empty.

**Design change outside the constitution:** design spec §2 rejected reading Kibana's internal
data. The user accepted it for the 7.17 row identity only. The docs record it in `CLAUDE.md` (Traps)
and as a dated note in the design spec (R19).

## Project Structure

### Documentation (this feature)

```text
specs/003-row-actions/
├── spec.md              # clarified 2026-10-16
├── plan.md              # this file
├── research.md          # R1–R20, with the spike measurements
├── data-model.md        # settings v4, row view, bridge protocol, cache, strip state and position
├── quickstart.md        # G1–G4, checks 1–8, SC-004 one-off, M1–M2 on Alpha
├── contracts/
│   └── module-interfaces.md   # new and changed signatures, protocol, strings, e2e hooks
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
src/core/config.ts                 # showInRow, schemaVersion 4, migrate 1–3, rowActions              (US1)
src/options/model.ts               # newAction: showInRow false                                        (US1)
entrypoints/options/ActionEditor.tsx  # "Show in row" checkbox                                       (US1)
src/kibana/client.ts               # DocRef, prefetchDocs, DOC_CACHE_LIMIT                             (US1)
src/adapters/types.ts              # RowView                                                           (US1)
src/adapters/legacy-rows.ts        # NEW: selectors, event, attrs, reactRowHit, findLegacyRows         (US1)
src/adapters/grid-rows.ts          # NEW: parseGridDocId, findGridRows                                 (US2)
src/adapters/detect.ts             # findRows, rowOf                                         (US1; grid in US2)
entrypoints/kibana-bridge.ts       # NEW: page-context script (MAIN world)                             (US1)
src/background/registration.ts     # bridge script registered with the content script                  (US1)
scripts/check-manifest.mjs         # kibana-bridge.js must be built                                    (US1)
src/content/log-buttons.tsx        # NEW: useLogState, buildButtons, ActionButtons, describeError      (US1)
src/content/ActionBar.tsx          # uses log-buttons; output unchanged                                (US1)
src/content/RowStrip.tsx           # NEW: the strip                                                    (US1)
src/content/rows.ts                # NEW: ROW_BATCH_SIZE, ROW_HOST_TAG, batches, stripPosition         (US1)
src/content/row-host.ts            # NEW: active row, fresh identity, placement, host lifecycle      (US1)
src/content/styles.ts              # .kt-strip                                                         (US1)
entrypoints/kibana.ts              # wiring: gate, bridge request, findRows, prefetch, render          (US1)
public/_locales/{en,tr}/messages.json   # optionsShowInRow, rowStripLabel                              (US1)

tests/unit/
├── core/config.test.ts            # v3→v4, v1/v2→v4, rowActions                                       (US1)
├── kibana/client.test.ts          # prefetchDocs body, cache fill, missing, failure, skip, cap       (US1)
├── adapters/legacy-rows.test.ts   # NEW: reactRowHit with fake fibers (both key styles), findLegacyRows (US1)
├── adapters/grid-rows.test.ts     # NEW: parseGridDocId edge cases, findGridRows                      (US2)
├── adapters/fixtures.test.ts      # rows fixtures per version                                    (US1, US2)
├── background/registration.test.ts   # two scripts, one lifecycle, world MAIN, per-id exists        (US1)
│                                      # (content registered + bridge missing → register bridge)
├── content/rows.test.ts           # NEW: batches, stripPosition                                       (US1)
├── content/row-strip.test.ts      # NEW (happy-dom): same buttons as the bar, greyed, loading, error  (US1)
├── content/row-host.test.ts       # NEW (happy-dom): pointer/focus rules, detach when inactive        (US1)
└── options/…                      # the checkbox round-trips showInRow                                (US1)
tests/e2e/
├── fixtures.ts                    # e2eConfig v4 (showInRow false)                                    (US1)
├── rows.spec.ts                   # NEW: quickstart checks 1–8                                  (US1; 8.x/9.x US2)
└── capture.spec.ts                # <version>-rows.json                                          (US1, US2)
tests/fixtures/<version>-rows.json # captured from the stacks                                    (US1, US2)

README.md, CHANGELOG.md, CLAUDE.md, docs/store-listing.md, docs/superpowers/specs/2026-10-07-kibanatool-design.md (note),
docs/verification/2026-10-row-actions.md
```

**Structure Decision**: a single project. One branch, `003-row-actions`, is cut from main (R18).

1. **User Story 1** (7.17, plus everything shared) is committed first.
2. **User Story 2** (the 8.x/9.x row reader and its tests) is committed next.
3. **The docs** come last.

The work goes up as one pull request, which the user merges. `.specify/feature.json` points at
`specs/003-row-actions`.

## Complexity Tracking

No constitution violations to justify.
