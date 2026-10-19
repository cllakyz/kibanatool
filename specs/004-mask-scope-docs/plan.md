# Implementation Plan: Explain How Far a Field-Name Mask Reaches

**Branch**: `004-mask-scope-docs` (one branch, one pull request) | **Date**: 2026-10-19 |
**Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-mask-scope-docs/spec.md`

## Summary

The masking rule stays as it is (user decision after the Alpha measurement). The feature explains the rule where
users meet it:

- **Options page:** a note under the mask patterns says that a matching field or element is masked with
  everything inside it. It gives `*token` as the narrowing that keeps a wrapper such as `GetTokenRequest`
  readable while every measured token stays masked, and warns against `*.token` (R2).
- **Value-mask help:** the outdated "only Copy as Markdown" text is corrected (R4).
- **README:** says the same, with the example and the trade-off.
- **Tests:** two unit tests pin the documented rule, and one e2e check finds the note through `aria-describedby`.

No copy output changes.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), React 19

**Primary Dependencies**: WXT 0.21. No new dependency.

**Storage**: unchanged (schemaVersion 4)

**Testing**: Vitest (563 unit tests at `aec94c5`); Playwright e2e on Kibana 7.17.29, 8.19.23 and 9.5.5

**Target Platform**: Chrome MV3 extension, options page

**Project Type**: browser extension, a single project

**Performance Goals**: none (text only)

**Constraints**:
- Copies stay byte-for-byte the same (SC-002), so `src/core` is not touched.
- Every string exists in English and Turkish.
- e2e asserts no localized text.

**Scale/Scope**:
- 4 files changed: both locale files, `CopySection.tsx` and `README.md`;
- 2 test files: `mask.test.ts` and `options.spec.ts`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v1.0.6, no open deviations.

| Gate | Pre-design | Post-design (R1–R6) |
|---|---|---|
| I. Dependencies point inward | No new import. | PASS. `CopySection.tsx` only renders one more string. The tests import `src/core` as before. |
| II. One rule, one place | The rule stays in `maskValue`/`maskMatcher`; the docs describe it. | PASS. The new tests pin the existing rule, so the text and the code cannot drift apart silently. No rule is restated in code. |
| III. Shared types live with their concept | — | PASS. The note reuses the `p.muted` pattern of the value-mask help. |
| IV. Failures carry their reason | — | PASS. No new failure path. |
| V. Browser state through parameters | — | PASS. Nothing new reads globals. |
| G1–G4 | — | PASS by design (quickstart.md). The manifest is unchanged. |

No gate is violated, so Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/004-mask-scope-docs/
├── spec.md              # with the Alpha measurement appendix
├── plan.md              # this file
├── research.md          # R1–R6
├── data-model.md        # no data change; the text items
├── quickstart.md        # gates and checks 1–4
├── contracts/
│   └── ui-text.md       # exact en/tr strings, README paragraph, tests
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
public/_locales/en/messages.json     # optionsMaskPatternsHelp (new), optionsValueMasksHelp (corrected)
public/_locales/tr/messages.json     # the same, in Turkish
entrypoints/options/CopySection.tsx  # the note under the mask patterns, linked with aria-describedby
README.md                            # "Copy and masking": the whole-value rule, the *token example, the trade-off
tests/unit/core/mask.test.ts         # two tests pinning the documented rule (FR-006)
tests/e2e/options.spec.ts            # the textarea is described by a non-empty note (FR-002)
```

**Structure Decision**: a single project. The branch `004-mask-scope-docs` is cut from main, and one commit
carries code, tests and docs together with the spec-kit files. It goes up as one pull request after the user's
yes (R5). No CHANGELOG entry (R5).

## Complexity Tracking

No constitution violations to justify.
