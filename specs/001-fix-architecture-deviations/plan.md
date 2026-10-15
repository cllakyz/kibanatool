# Implementation Plan: Fix Architecture Deviations D1–D13

**Branch**: `001-fix-architecture-deviations` | **Date**: 2026-10-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-fix-architecture-deviations/spec.md`

## Summary

This plan closes the constitution's 13 Known Deviations and the four unlisted items the spec found.
It also adds the deferred architecture check, with no change visible to anyone who uses the
extension.

The approach:
- Core stops importing Kibana's link builder: `DiscoverContext` receives a `link(target)` function
  (R1).
- Every restated rule gets one owner in `src/core`: environment scope, condition operators,
  expansion depth, XML text, base path, missing variables, action gating and the http(s) prefix
  (R4–R11).
- Shared shapes move to neutral modules: `HiddenReason` goes to `passive.ts` and one `ActionButton`
  type to `types.ts` (R13, R14).
- Each copy item carries its own failure notice (R15).
- The action bar gets the page and the clock from its host (R16).
- Settings-change subscription goes through the storage module (R17).
- A vitest test enforces the clarified import table with no new dependency (R2, R3).
- CLAUDE.md points to the constitution (R19).

## Technical Context

**Language/Version**: TypeScript 5.9 (strict, `noUncheckedIndexedAccess`), React 19

**Primary Dependencies**: WXT 0.21 (MV3 build), zod 4 (`jitless`), rison-node, lz-string. No new
dependency.

**Storage**: `chrome.storage.local`, key `kibanatool.config`, schemaVersion 3 (unchanged)

**Testing**: Vitest 5 (node environment; happy-dom per file), Playwright 1.64 e2e against Docker
Kibana 7.17.29, 8.19.23 and 9.5.5. Baseline: 431 unit tests, e2e 27/27/28 with 3 skipped each.

**Target Platform**: Chrome MV3 extension (service worker, runtime-registered content script,
options page)

**Project Type**: browser extension, a single project

**Performance Goals**: no change. Every new indirection is a function call: the link builder,
`gateAction`, `appliesTo`.

**Constraints**:
- no user-visible change (FR-022);
- no settings schema change and no new UI strings (FR-023);
- MV3 CSP, so no eval;
- no new dependencies.

**Scale/Scope**: about 4.0k lines in `src/` and `entrypoints/`. About 20 source files change, plus 1
new test file and about 6 test files adjusted.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v1.0.0 (`.specify/memory/constitution.md`); v1.0.1 lands in US1 (R3).

| Gate | Pre-design | Post-design (R1–R20) |
|---|---|---|
| I. Dependencies point inward | The open violation D1 is the subject of this plan | PASS. Core imports no outer layer (R1). The new imports are `conditions → config` (type), `types → passive` (type) and `kibana/url → core/discover-actions` (type), all allowed. None makes a cycle (checked in R5 and R10). The check enforces the table (R2). |
| II. One rule, one place | Violations D2–D8 and FR-012 are the subject of this plan | PASS. Each rule has one owner (data-model.md, "Business rules"). The cURL divergence cites spec §5.6 (R12). |
| III. Shared types live with their concept | Violations D9 and D10 are the subject of this plan | PASS. `HiddenReason` moves to `passive.ts`, `ActionButton` goes to `types.ts`, and `Condition` and `ConditionOp` are derived from the schema (R5). |
| IV. Failures carry their reason | Violation D11 is the subject of this plan | PASS. `CopyItem.unavailable` is used. `fixedTimeUrl` and `buildCurl` may still return `null`/`undefined` to mean "absent", which the principle allows. |
| V. Browser state through parameters | Violations D12, D13 and FR-018 are the subject of this plan | PASS. `page` and `now` are props, and `store.onChange` replaces the direct storage events. The new single-implementation interface member (`StorageAreaLike.onChanged`) is a test seam: the storage tests use a fake. |
| G1 typecheck · G2 unit + architecture check · G3 build + manifest · G4 e2e 7/8/9 | G2's check is missing (`TODO(ARCH_TEST)`) | PASS by design. The check lands in US1 with an empty exception list (R2, R3). quickstart.md runs G1–G4. |

No gate is violated after the design, so Complexity Tracking is empty.

One note: for D1, R1 departs from the constitution's "Expected fix" column (option A). The spec
allows any smaller fix that satisfies the principle, and the user chose option B. The D1 row is
deleted when the fix lands, so nothing stays inconsistent.

## Project Structure

### Documentation (this feature)

```text
specs/001-fix-architecture-deviations/
├── plan.md              # this file
├── research.md          # R1–R20 decisions
├── data-model.md        # deviations, import table, rule owners, changed types
├── quickstart.md        # validation run for SC-001…SC-006
├── contracts/
│   └── module-interfaces.md   # changed exported signatures
├── checklists/
│   └── requirements.md  # spec quality checklist
└── tasks.md             # /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── config.ts            # CONDITION_OPS, appliesToAll/appliesTo, matchLength → basePathOf   (US2)
│   ├── conditions.ts        # Condition/ConditionOp from schema, gateAction                    (US2)
│   ├── discover-actions.ts  # DiscoverTarget, context.link, gateAction, ActionButton           (US1, US2, US3)
│   ├── link-actions.ts      # gateAction, startsWithHttp, ActionButton, HiddenReason moved out (US2, US3)
│   ├── passive.ts           # + HiddenReason                                                   (US3)
│   ├── types.ts             # + ActionButton                                                   (US3)
│   ├── template.ts          # missingVariable(s), startsWithHttp                               (US2)
│   ├── fields.ts            # export MAX_TEXT_DEPTH, isXmlText                                 (US2)
│   ├── xml.ts               # isXmlText                                                        (US2)
│   ├── curl.ts              # MAX_TEXT_DEPTH, isXmlText, §5.6 comment                          (US2)
│   └── json-tree.ts         # isXmlText                                                        (US2)
├── kibana/url.ts            # discoverUrl options = { prefix } & DiscoverTarget                (US1)
├── options/
│   ├── model.ts             # appliesTo, missingVariables                                      (US2)
│   └── preview.ts           # HiddenReason import                                              (US3)
├── content/
│   ├── ActionBar.tsx        # link builder, one renderer, unavailable notices, page/now props  (US1, US3, US4, US5)
│   └── CopyMenu.tsx         # unavailable, onFail(notice)                                      (US4)
└── storage.ts               # StorageAreaLike.onChanged, store.onChange                        (US5)

entrypoints/
├── kibana.ts                # page/now props, store.onChange                                   (US5)
├── background.ts            # store.onChange                                                   (US5)
└── options/
    ├── ActionEditor.tsx     # appliesTo, CONDITION_OPS, HiddenReason import                    (US2, US3)
    └── ActionsSection.tsx   # appliesToAll/appliesTo                                           (US2)

tests/unit/
├── architecture.test.ts     # NEW: import table, core globals, cycles, 5 synthetic cases       (US1)
├── core/discover-actions.test.ts   # context(): link instead of prefix                         (US1)
├── core/conditions.test.ts  # + gateAction precedence                                          (US2)
├── core/template.test.ts    # + missingVariables, startsWithHttp                               (US2)
├── content/copy-menu.test.ts       # NEW (happy-dom): per-item failure notice                  (US4)
└── storage.test.ts          # fakeArea.onChanged; onChange replaces isConfigChange             (US5)

CLAUDE.md, .gitignore        # constitution pointer, architecture check, specs/ ignored         (docs)
.specify/memory/constitution.md   # local-only: v1.0.1 table (R3), then PATCH per story (R18)
```

**Structure Decision**: a single project, with no new source module. The two new files are tests.
The implementation order is US1 → US3 → US2 → US4 → US5 (R20): D8's gate needs `HiddenReason` in
its new home (D9) first. There is one commit per story, plus a docs commit, and one PR on branch
`001-fix-architecture-deviations`.

## Complexity Tracking

No constitution violations to justify.
