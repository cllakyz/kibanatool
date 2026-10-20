# Research: Theme Switch on the Options Page

The probes below ran on 2026-10-20 against the build of `3ea227e` in Playwright Chromium, with the Turkish UI
(macOS is `tr-TR`). The probe scripts are in the session scratchpad and not committed.

## R1. Where the choice is stored

- **Decision**:
  - The extension origin's `localStorage`, key `kibanatool.theme`, value `"system"`, `"light"` or `"dark"`.
    Choosing System stores `"system"`; it does not remove the key.
  - `src/storage.ts` holds the key and two functions:
    - `loadThemeChoice(area: Pick<Storage, "getItem">): ThemeChoice` returns the stored value when it is one of
      `THEME_CHOICES`, otherwise `"system"`. A throwing `getItem` also gives `"system"`, logged with
      `console.debug("[kibanatool]", …)`.
    - `saveThemeChoice(area: Pick<Storage, "setItem">, choice): void` writes it. A throw (storage full or blocked)
      is logged the same way; the page keeps the theme until the next load.
- **Rationale**:
  - Only `localStorage` can be read synchronously before the first frame (R2). `chrome.storage` is asynchronous.
  - Spec FR-010: the settings, their schema version and the export stay as they are. The choice is per device
    (the extension origin's storage is not synced), as the user decided.
  - Constitution V: storage goes through `src/storage.ts`; the globals enter as parameters, and the tests pass a
    plain object.
  - The probe confirmed that a value set on `options.html` is read back after a reload and in a second tab.
- **Alternatives considered**:
  - `chrome.storage.local` under its own key. Asynchronous, so the page would paint the system theme first.
  - A field in the settings. Rejected by the user (export and import must not carry it); it would also bump the
    schema version.

## R2. The chosen theme from the first frame

- **Finding** (probe: a `requestAnimationFrame` callback registered by an init script records what is in place at
  the first frame):
  - Today, over 10 reloads, the first frame came before the page's module script ran in 10: no palette `<style>`,
    no React content.
  - Today this is invisible: the empty page paints the canvas from `color-scheme: light dark`, which matches the
    system. With a fixed choice opposite to the system, that first frame would flash the other theme.
  - `blocking="render"` on the module script would hold rendering, but Vite rewrites the entry script tag and drops
    the attribute (built `options.html` checked).
  - A classic `<script src="/options-theme.js">` in `<head>`, built as a WXT unlisted script, ran before the first
    frame in 10 of 10 reloads: `data-theme` and the palette were both in place.
- **Decision**:
  - `entrypoints/options-theme.ts` (`defineUnlistedScript`) builds to `/options-theme.js` (about 3 kB: the two
    palettes and a few lines). `entrypoints/options/index.html` loads it in `<head>` as a classic script.
  - It injects the palette `<style>` (R3), calls `applyTheme(document.documentElement, loadThemeChoice(localStorage),
    media.matches)`, and on the media query's `change` does the same again, re-reading the stored choice so a
    choice made since load counts.
  - `main.tsx` no longer injects the palette. It keeps `reportTheme` for the toolbar icon, unchanged.
  - The build prints `<script src="/options-theme.js"> … can't be bundled without type="module" attribute`. That is
    expected: the file is built by WXT, and adding `type="module"` would make it deferred and bring the flash back.
    Whether a `vite-ignore` attribute silences the warning is checked during implementation; it is kept only if
    the built tag stays a classic script.
- **Alternatives considered**:
  - The choice in `chrome.storage` plus hiding the page until it loads. The canvas still paints first.
  - A plain JS file in `public/`. It would repeat the key, the values and the resolution rule outside TypeScript
    (Principle II).
  - A Vite plugin that puts `blocking="render"` back. Build-time patching for one attribute, and it still could not
    wait for an asynchronous read.

## R3. Palette rules and the resolved theme

- **Decision**:
  - `src/theme.ts` adds `THEME_CHOICES = ["system", "light", "dark"] as const`, `type ThemeChoice`, and
    `applyTheme(root: HTMLElement, choice: ThemeChoice, systemDark: boolean): void`, which sets
    `root.dataset.theme` to `"light"` or `"dark"`: the choice itself, or for System the system's mode.
  - The head script's stylesheet:
    `:root[data-theme="light"] { color-scheme: light; <LIGHT> } :root[data-theme="dark"] { color-scheme: dark; <DARK> }`.
    The same script sets the attribute right after, so there is no state with the style and no attribute.
  - `options.css` drops `:root { color-scheme: light dark; }`. Form controls, scrollbars, the file picker button
    and the canvas then follow `color-scheme` from the rule above (spec FR-006).
- **Rationale**:
  - One attribute with the resolved value lets plain CSS switch the palette and the mark (R5); the rule that turns
    a choice into a theme exists once, in `applyTheme` (Principle II).
  - System still follows a live system change (FR-007, spec 005 M3), through the head script's listener.
- **Alternatives considered**:
  - `data-theme` only for a fixed choice, with the media query for System (`:root:not([data-theme="light"])` inside
    `@media`). The mark and every later theme-dependent rule would need both selectors.
  - React state for the resolved theme. The head script runs before React exists.

## R4. The control

- **Decision**:
  - `entrypoints/options/ThemeSwitch.tsx`: a `div.theme-switch[role="radiogroup"]` with `aria-label` from
    `optionsTheme`, holding three `label[title]` elements. Each holds an `input[type="radio"][name="theme"]` with
    `value` system, light or dark and `aria-label` from its string, and an inline SVG icon (`aria-hidden`): a monitor,
    a sun and a moon, drawn with `currentColor`.
  - State: `useState(() => loadThemeChoice(localStorage))`. On change: set the state, `applyTheme` with
    `matchMedia("(prefers-color-scheme: dark)").matches`, then `saveThemeChoice`.
  - The input is visually hidden but focusable. The label is the segment: `label:has(:checked)` is filled
    `primary` with an `on-primary` icon (user decision), others show a `text-muted` icon on the bar,
    `text-primary` on hover; `label:has(:focus-visible)` gets the page's 2px `text-primary` ring.
- **Rationale**:
  - Native radios give one tab stop, arrow keys that select, and "selected, 1 of 3" announcements with no script
    (FR-004, FR-005). `title` gives the tooltip.
  - Contrast (FR-015): `text-muted` on `surface` 4.5, `text-primary` on `surface` 3 (the ring and hover),
    `on-primary` on `primary` 4.5 and `primary` on `surface` 3 (the selection mark) are all in
    `tests/unit/theme.test.ts` already. No new pair is needed.
- **Alternatives considered**:
  - Three buttons with `aria-pressed`. Three tab stops and hand-written arrow keys.
  - A light-fill selected state. The user chose the filled one.

## R5. Navbar: fit and the mark

- **Finding** (probe at 1000px, Turkish): brand 109px, tabs 639px, version 33px, padding 2×24px, three 32px gaps.
  A mock control of three 28px buttons plus a 1px border (86px) left the tabs 11px short (scrollWidth 639,
  clientWidth 628). At 1100px it fit.
- **Decision**:
  - `.nav` gap 32px → 24px. With four children: 48 + 109 + 639 + 86 + 33 + 3×24 = 987px, so 13px to spare.
  - `margin-left: auto` moves from `.nav-version` to `.theme-switch`, which is `flex: none`, so the control and
    the version stay at the right and never scroll with the tabs (spec edge case, 700px).
  - The mark becomes two `<img>` (`.logo-light`, `.logo-dark`, the design system's class names) from
    `iconPaths(false|true)["48"]`; CSS shows the one that matches `data-theme`. The `<picture>` with a
    `prefers-color-scheme` source would follow the system, not the choice.
- **Rationale**: 13px is thin and fonts differ by OS, so the fit is measured again in the quickstart.
- **Alternatives considered**: smaller buttons (24px) instead of a smaller gap. Below a comfortable click target
  for a control used with the mouse.

## R6. Tests

- **Unit**:
  - `tests/unit/theme.test.ts`: `applyTheme` sets `light`/`dark` for those choices whatever the system, and the
    system's mode for System.
  - `tests/unit/storage.test.ts`: `loadThemeChoice` returns a stored valid value, and `"system"` for a missing
    value, an unknown value and a throwing `getItem`; `saveThemeChoice` writes the key and survives a throwing
    `setItem`.
- **e2e**: one test in `tests/e2e/options.spec.ts`, described in [contracts/ui.md](contracts/ui.md). It covers
  FR-016: Dark applies and survives a reload from the first frame, System follows `emulateMedia`, and the export
  equals `e2eConfig()`.
- **Contrast**: no new pair (R4).

## R7. Docs and release

- **CLAUDE.md**:
  - "Docs" lists spec-kit 006.
  - One Trap names both theme mechanisms: the page's choice (`localStorage` `kibanatool.theme`, `html[data-theme]`,
    set by `options-theme.js` in `<head>` before the first frame; never `type="module"`) and the toolbar icon's
    `kibanatool:theme` report, which keeps following the browser and must not be wired to the choice.
- **CHANGELOG**: `[Unreleased]` → `### Added`: the theme control.
- **Verification**: `docs/verification/2026-10-theme-switch.md` (Turkish), M1–M5 from the quickstart. M3 also
  settles spec 005's open M3.
- **Design system**: adding the control to "kibanatool options" is out of scope (spec); offered once merged.
