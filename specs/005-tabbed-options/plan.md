# Implementation Plan: Tabbed Options Page

**Branch**: `005-tabbed-options` (one branch, one pull request) | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-tabbed-options/spec.md`

## Summary

The options page becomes five tabs under a sticky navbar, as the "kibanatool options" design system lays out.

- **Navbar** (R1, R4): the brand with the light or dark mark, five hash links, the version.
- **Tabs** (R1): `App` reads the open tab from the hash and shows its title, the intro callout and its section.
  All five sections stay mounted, and the hidden ones keep their unsaved edits.
- **Panels** (R5): each section's `h2`, count and add buttons sit in a panel head. Environments and actions are
  bordered rows. Copy and masking and Export and import use rows with the label on the left. Variables and Copy
  save from a panel footer.
- **Dialog** (R2): the action editor opens in a native modal dialog with a header, a scrolling body and a footer.
  Every exit goes through the draft state, and focus returns to the opener. Action rows gain the "Show in row"
  badge.
- **Tokens** (R3): seven proposed tokens join both palettes. `options.css` takes the design's rules, and three
  contrast pairs join the theme test.
- **Strings** (R6): seven new strings in en and tr, and two old ones removed.
- **Tests** (R7): the eight options e2e tests reach their sections through the tabs, and two new ones cover the
  tabs and the dialog.

Save logic, validation, the section props and the settings format don't change.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), React 19

**Primary Dependencies**: WXT 0.21. No new dependency; the dialog is the native `<dialog>`.

**Storage**: unchanged (schemaVersion 4)

**Testing**: Vitest (565 unit tests at `d5d3281`); Playwright e2e on Kibana 7.17.29, 8.19.23 and 9.5.5

**Target Platform**: Chrome MV3 extension, options page

**Project Type**: browser extension, a single project

**Performance Goals**: none beyond today's. The page renders five sections, as it does now.

**Constraints**:
- `src/core` is not touched, and stored settings stay byte-for-byte the same (SC-004).
- Every string exists in English and Turkish. The Turkish tabs fit at 1000px (SC-002).
- Every text pair reaches 4.5:1 in both themes (SC-005).
- e2e asserts no localized text, and no element id equals a tab id (R1).

**Scale/Scope**:
- **Options page:** 9 files in `entrypoints/options/` (`App`, five sections, `ActionEditor`, `feedback`,
  `options.css`).
- **Source:** `src/theme.ts` and the two locale files.
- **Tests:** `tests/unit/theme.test.ts` and `tests/e2e/options.spec.ts`.
- **Docs:** CLAUDE.md, CHANGELOG.md and one verification file.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v1.0.6, no open deviations.

| Gate | Pre-design | Post-design (R1–R9) |
|---|---|---|
| I. Dependencies point inward | Only `entrypoints/options/` and `src/theme.ts` change. | PASS. `App.tsx` adds one import, `iconPaths` from `src/toolbar-icon.ts`; `entrypoints/` may import all of `src/`. `src/theme.ts` gains only palette entries. |
| II. One rule, one place | Watch for duplicated mappings. | PASS. The tab list lives once, in `App.tsx`. The kind badge is one `KindBadge` in `feedback.tsx`, used by the row and the dialog. The mark reuses `iconPaths`. "Applies to all" still comes from `appliesToAll`. |
| III. Shared types live with their concept | — | PASS. The `Tab` type is local to `App.tsx`, its only user. `SectionProps` stays in `feedback.tsx`. |
| IV. Failures carry their reason | The dialog hides the section's errors. | PASS. Save errors render inside the dialog (R2, FR-018). Cancel clears them, so a stale error never appears without its cause. |
| V. Browser state through parameters | Hash, manifest, `hashchange`. | PASS. Only `entrypoints/` read `location`, `window` events and `browser.runtime.getManifest()`. `src/` reads nothing new. |
| G1–G4 | — | PASS by design (quickstart.md). The manifest is unchanged. G4 needs the e2e selector migration in contracts/ui.md. |

No gate is violated, so Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/005-tabbed-options/
├── spec.md              # user stories, FR-001–FR-022, SC-001–SC-007
├── plan.md              # this file
├── research.md          # R1–R9
├── data-model.md        # no stored change; the Tab and the action draft
├── quickstart.md        # gates, token check, visual check, manual M1–M4
├── contracts/
│   ├── ui.md            # DOM contract and the e2e selector migration
│   └── strings.md       # the 7 new strings (en/tr), 2 removed, the reused ones
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
src/theme.ts                               # 7 proposed tokens in LIGHT and DARK (R3)
entrypoints/options/App.tsx                # navbar, hash tab state, h1 + callout, hidden wrappers (R1, R4)
entrypoints/options/feedback.tsx           # + KindBadge (R5)
entrypoints/options/EnvironmentsSection.tsx  # panel head with count, .items rows (R5)
entrypoints/options/VariablesSection.tsx   # head: count + Add variable; foot: Save; .empty (R5)
entrypoints/options/ActionsSection.tsx     # head buttons, .items rows with badges, .empty, draft ↔ dialog, hashchange (R2, R5)
entrypoints/options/ActionEditor.tsx       # renders the <dialog>: head, scrolling body, foot, errors (R2)
entrypoints/options/CopySection.tsx        # head, .fields of .field-h rows, foot Save (R5)
entrypoints/options/TransferSection.tsx    # head, .fields of .field-h rows (R5)
entrypoints/options/options.css            # rewritten from bundle.css (R3)
public/_locales/en/messages.json           # +7, −2 (contracts/strings.md)
public/_locales/tr/messages.json           # the same, in Turkish
tests/unit/theme.test.ts                   # +3 pairs (R3)
tests/e2e/options.spec.ts                  # 8 adapted, 2 new (contracts/ui.md)
CLAUDE.md                                  # Docs: 005; Traps: the tabbed page (R9)
CHANGELOG.md                               # ## [Unreleased] → Changed (R9)
docs/verification/2026-10-tabbed-options.md  # M1–M4 and the visual check (R9)
```

**Structure Decision**: a single project.
- The branch `005-tabbed-options` was cut from main at `d5d3281`.
- The spec-kit files and the implementation are committed on it.
- It goes up as one pull request only after the user's yes, so the CI matrix (G4) runs before it reaches main.
- The 1.0.0 tag still goes on `d5d3281` once the store accepts it. This feature belongs to the next version.
  **Changed 2026-10-20 (user decision):** it ships in 1.0.0 after all; the `[Unreleased]` entries were folded into the 1.0.0 entry, and the `v1.0.0` tag goes on that release commit once the store accepts the package.

## Complexity Tracking

No constitution violations to justify.
