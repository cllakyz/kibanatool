# Implementation Plan: Theme Switch on the Options Page

**Branch**: `006-theme-toggle` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-theme-toggle/spec.md`

## Summary

The options page gets a three-way theme control (System, Light, Dark) in its top bar, just left of the version.

- **Choice** (R1): stored in the extension's `localStorage` under `kibanatool.theme`, through `src/storage.ts`. It
  is not in `chrome.storage`, the settings or the export. Missing or unreadable means System.
- **No flash** (R2): a small classic script in the page's `<head>` (`options-theme.js`, a WXT unlisted script)
  injects the palette and sets `html[data-theme]` before the first frame. Measured: today the first frame comes
  before the page's module runs, and Vite strips `blocking="render"`.
- **Palette** (R3): the palette rules key on `html[data-theme="light"|"dark"]` instead of the media query.
  `data-theme` always holds the resolved theme. System re-resolves it when the system's mode changes.
- **Control** (R4): three native radios in a `role="radiogroup"`, drawn as icon segments; the selected one is
  filled `primary` (user decision). Names: Theme, System, Light, Dark (user decision).
- **Navbar** (R5): the mark becomes two images switched by `data-theme`; the bar's gap tightens from 32px to 24px
  so the Turkish tabs still fit at 1000px.
- **Tests and docs** (R6, R7): unit tests for the choice and its resolution, one e2e test (switch, reload, first
  frame, System follows, export unchanged), CLAUDE.md, CHANGELOG and a verification file.

The action bar, the row strip, the views in Kibana and the toolbar icon don't change.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), React 19

**Primary Dependencies**: WXT 0.21. No new dependency; the icons are inline SVG, the control native radios.

**Storage**: the choice in the extension origin's `localStorage` (`kibanatool.theme`). The settings
(`chrome.storage.local`, schemaVersion 4) are unchanged.

**Testing**: Vitest (571 unit tests at `3ea227e`); Playwright e2e on Kibana 7.17.29, 8.19.23 and 9.5.5

**Target Platform**: Chrome MV3 extension, options page

**Project Type**: browser extension, a single project

**Performance Goals**: the chosen theme is on screen from the first frame (spec SC-002).

**Constraints**:
- MV3 CSP: no inline script. The head script is a file from the extension.
- `src/core` is not touched; the settings and the export stay byte-for-byte the same (SC-004).
- In Turkish at 1000px, the five tabs and the control fit the bar (SC-003).
- Every text pair keeps its contrast floor in both themes (SC-005). e2e asserts no localized text.

**Scale/Scope**: about 15 files: 3 in `src/`, 5 in `entrypoints/`, 2 locales, 3 tests, 3 docs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v1.0.6, no open deviations.

| Gate | Pre-design | Post-design (R1–R7) |
|---|---|---|
| I. Dependencies point inward | `src/storage.ts` needs the choice type. | PASS. `src/storage.ts` imports `ThemeChoice` and `THEME_CHOICES` from `src/theme.ts`: both are in the root group, which may import root. `src/theme.ts` imports nothing new, so no cycle. `entrypoints/options-theme.ts` and `ThemeSwitch.tsx` may import all of `src/`. |
| II. One rule, one place | The head script and the control both apply a choice. | PASS. The rule (System follows the system, otherwise the choice) is `applyTheme` in `src/theme.ts`, called by both. The key and its parsing are in `src/storage.ts`. The palette stylesheet moves from `main.tsx` to the head script, so it stays in one place. |
| III. Shared types live with their concept | — | PASS. `ThemeChoice` lives in `src/theme.ts`, with the palettes. |
| IV. Failures carry their reason | A failed read falls back to System. | PASS. The fallback is spec FR-011. `loadThemeChoice` and `saveThemeChoice` catch a throwing `localStorage` and log the error with `console.debug("[kibanatool]", …)`; nothing returns an overloaded `null`. |
| V. Browser state through parameters | `localStorage`, `matchMedia`, `document`. | PASS. Only `entrypoints/` read these globals and pass them in: `Pick<Storage, …>` to `src/storage.ts`, the root element and `matches` to `applyTheme`. Storage reads and writes go through `src/storage.ts`. |
| G1–G4 | — | PASS by design (quickstart.md). The manifest is unchanged: an unlisted script needs no entry. |

No gate is violated, so Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/006-theme-toggle/
├── spec.md              # user stories, FR-001–FR-016, SC-001–SC-007
├── plan.md              # this file
├── research.md          # R1–R7, with the probes behind R2 and R5
├── data-model.md        # the theme choice and the resolved theme
├── quickstart.md        # gates, first-frame and fit checks, visual check, manual M1–M5
├── contracts/
│   ├── ui.md            # DOM, CSS hooks and the e2e test
│   └── strings.md       # 4 new strings (en/tr)
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
src/theme.ts                              # + THEME_CHOICES, ThemeChoice, applyTheme (R3)
src/storage.ts                            # + THEME_KEY, loadThemeChoice, saveThemeChoice (R1)
entrypoints/options-theme.ts              # new unlisted script: palette + data-theme before the first frame (R2)
entrypoints/options/index.html            # + <script src="/options-theme.js"> in <head> (R2)
entrypoints/options/main.tsx              # the palette injection moves out; reportTheme stays (R2)
entrypoints/options/ThemeSwitch.tsx       # new: the radio group (R4)
entrypoints/options/App.tsx               # two marks; ThemeSwitch before the version (R4, R5)
entrypoints/options/options.css           # color-scheme moves out; nav gap; marks; .theme-switch (R3–R5)
public/_locales/en/messages.json          # +4 (contracts/strings.md)
public/_locales/tr/messages.json          # the same, in Turkish
tests/unit/theme.test.ts                  # applyTheme (R6)
tests/unit/storage.test.ts                # loadThemeChoice, saveThemeChoice (R6)
tests/e2e/options.spec.ts                 # 1 new test (contracts/ui.md)
CLAUDE.md                                 # Docs: 006; Traps: the two theme mechanisms (R7)
CHANGELOG.md                              # [Unreleased] → Added (R7)
docs/verification/2026-10-theme-switch.md # M1–M5 and the visual check (R7)
```

**Structure Decision**: a single project.
- The branch `006-theme-toggle` was cut from main at `3ea227e`; the spec is `0a67df6`.
- The spec-kit files and the implementation are committed on it. It goes up as one pull request only after the
  user's yes, so the CI matrix (G4) runs before it reaches main.
- It ships with spec 005 in the next version, under `[Unreleased]`.

## Complexity Tracking

No constitution violations to justify.
