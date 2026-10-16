# Implementation Plan: Plain-Text Request/Response Viewer

**Branches**: `002-form-data` (User Story 1), then `002-text-view` (User Story 2); both ship in 1.0.0 |
**Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-plain-text-viewer/spec.md`

## Summary

The feature has two deliveries.

**User Story 1 (1.0.0)** makes form-urlencoded text a third kind of structured text, next to JSON
and XML, behind the one rule that every consumer already calls (R1–R4). Form text then opens in
the panel tree, the field map, the Markdown and JSON copies and masking with no change to those
consumers. This closes the leak where `iys_log` copies carry a credential unmasked. `curl.ts`
needs an explicit kind dispatch, because otherwise it would turn form text into JSON (R5). Form
text there is masked pair by pair and its unchanged bytes are kept.

**User Story 2 (also 1.0.0, clarified 2026-10-16)** lists text that the panel cannot parse when it is multi-line or at least
500 characters long (R7). It opens in a text view: monospace, wrapping chosen by the text, the
tree's search through one shared matcher and one shared search bar (R8, R9), and an unmasked copy.
The panel button becomes "View". A small error boundary keeps a panel failure from removing the
bar (R12).

## Technical Context

**Language/Version**: TypeScript 5.9 (strict, `noUncheckedIndexedAccess`), React 19

**Primary Dependencies**: WXT 0.21 (MV3 build), zod 4 (`jitless`). No new dependency.

**Storage**: `chrome.storage.local`, key `kibanatool.config`, schemaVersion 3, unchanged (FR-018)

**Testing**:
- Vitest 5: node environment, with happy-dom per file for components.
- Playwright 1.64 e2e against Docker Kibana 7.17.29, 8.19.23 and 9.5.5.
- Baseline at `5deb7df`: 459 unit tests; e2e 27/27/28, with 3 skipped each.

**Target Platform**: Chrome MV3 extension: a content script in Kibana Discover, a shadow-root bar

**Project Type**: browser extension, a single project

**Performance Goals**:
- A 100 KB text opens and is searchable within 1 s (SC-004).
- The form rule is linear and never throws.

**Constraints**:
- No `innerHTML`; text reaches the DOM as React text only.
- `src/core` uses no browser API.
- MV3 CSP, so no eval.
- No settings change.
- Logs without form text keep byte-identical copies (FR-019).

**Scale/Scope**:
- User Story 1: about 5 source files, 1 new core module, 6 test files, seed, docs.
- User Story 2: about 5 source files, 4 test files, seed, docs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v1.0.6 (`.specify/memory/constitution.md`), no open deviations.

| Gate | Pre-design | Post-design (R1–R16) |
|---|---|---|
| I. Dependencies point inward | No new layer edge needed. | PASS. New imports: `form → xml` and `fields → form` (core → core), and `json-tree → mask` for `escapeRegExp` (core → core). No cycle: `xml` and `mask` import neither `form` nor `json-tree`. The architecture test enforces this. |
| II. One rule, one place | Risk: form recognition, the text threshold and search matching could each get restated. | PASS. Each rule has one owner: `parseStructured` decides structured text (R3); `formPairs` decides form (R1); `groupRepeated` handles repeated keys (R2); `TEXT_VIEW_MIN_LENGTH` sets the threshold and `isMultiLine` defines multi-line for both listing and wrapping (R7); `searchPattern` defines a match, used by both views (R8); `escapeRegExp` is exported, not copied. `STRUCTURED_KINDS` is an `as const` array. The cURL divergence (form masked as form text) cites spec FR-005 at `maskForm`, as the principle's exception requires. |
| III. Shared types live with their concept | Risk: a second search UI. | PASS. `StructuredKind` lives in `fields.ts`, the owner of the rule. The panel entry union lives in `json-tree.ts`. `SearchBar` is one component used by the tree and the text view. `form → xml` is a function import, not a sibling import to reach a type. |
| IV. Failures carry their reason | Nothing returns a sentinel that a caller turns into a message. | PASS. `formPairs`/`parseStructured` return `undefined` to mean "not this kind" (absent), which the principle allows; no caller maps it to a specific notice. |
| V. Browser state through parameters | Nothing new reads globals. | PASS. `PanelBoundary` logs with `console.debug` inside a component (allowed). `TextBody` uses `scrollIntoView` on its own element. No location, storage or clock is read. |
| G1 typecheck · G2 unit + architecture · G3 build + manifest · G4 e2e 7/8/9 | — | PASS by design. Each PR runs G1–G4 (quickstart.md). The manifest does not change. |

No gate is violated, so Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-plain-text-viewer/
├── spec.md              # clarified 2026-10-15
├── plan.md              # this file
├── research.md          # R1–R16
├── data-model.md        # kinds, form pairs, panel entries, strings, seed
├── quickstart.md        # G1–G4, re-seed, manual Alpha checks, SC-004
├── contracts/
│   └── module-interfaces.md   # changed exported signatures, strings, seed contract
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
src/core/
├── form.ts            # NEW: formPairs, parseForm                                       (US1)
├── xml.ts             # groupRepeated exported from valueOf                             (US1)
├── fields.ts          # STRUCTURED_KINDS, StructuredKind, parseStructured                (US1)
├── curl.ts            # kind dispatch: maskKeepingText, maskPart, query, maskForm         (US1)
├── json-tree.ts       # source: StructuredKind (US1); panelFields, TEXT_VIEW_MIN_LENGTH,
│                      # isMultiLine, searchPattern ("iu"), textMatches, textSegments     (US2)
└── mask.ts            # export escapeRegExp                                              (US2)
src/content/
├── JsonView.tsx       # form tag (US1); SearchBar, TextBody, text tag                    (US2)
├── ActionBar.tsx      # panelFields, viewButton, PanelBoundary                           (US2)
└── styles.ts          # .kt-text, mark, wrap                                             (US2)
public/_locales/{en,tr}/messages.json   # panelKindForm (US1); viewButton, panelKindText, textWrap (US2)
docker/seed.mjs        # app-033 form (US1); app-034 text (US2)

tests/unit/
├── core/form.test.ts            # NEW                                                    (US1)
├── core/fields.test.ts          # parseStructured kinds, form in flatten/expand          (US1)
├── core/mask.test.ts            # password inside form, past-cap form                    (US1)
├── core/markdown.test.ts        # form field as json block                               (US1)
├── core/json-copy.test.ts       # form expanded and masked                               (US1)
├── core/curl.test.ts            # three dispatch paths, raw bytes kept                   (US1)
├── core/json-tree.test.ts       # form kind (US1); text entries, matcher, segments       (US2)
├── content/json-view.test.ts    # NEW (happy-dom): text view, wrap, search, copy         (US2)
└── theme.test.ts                # text-primary on match                                  (US2)
tests/e2e/
├── json.spec.ts                 # form tag + tree (US1); View, text view (US2)
└── copy.spec.ts                 # app-033 copies masked (US1)

README.md, CHANGELOG.md, CLAUDE.md, docs/store-listing.md                                 (US1, US2)
docs/verification/2026-10-form-data.md (US1), docs/verification/2026-10-text-view.md      (US2)
```

**Structure Decision**: a single project; one new source module (`form.ts`) and one new component
test. The order and the branches follow the user's choices (R16):
1. `002-form-data` is cut from main. It carries User Story 1 and this spec-kit directory, goes up
   as a PR and is merged by the user.
2. `002-text-view` is then cut from the updated main for User Story 2.

`.specify/feature.json` keeps pointing at `specs/002-plain-text-viewer` on both branches.

## Complexity Tracking

No constitution violations to justify.
