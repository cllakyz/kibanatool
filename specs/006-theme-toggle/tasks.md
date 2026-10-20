---

description: "Task list for the theme switch on the options page"
---

# Tasks: Theme Switch on the Options Page

**Input**: Design documents from `/specs/006-theme-toggle/`

**Prerequisites**: plan.md, spec.md (clarified 2026-10-20), research.md (R1–R7), data-model.md,
contracts/ui.md, contracts/strings.md, quickstart.md

**Tests**: Included, because FR-016 asks for them and G4 requires the e2e matrix to pass.
- Unit tests for `applyTheme`, `loadThemeChoice` and `saveThemeChoice` come first and fail until their code lands.
- One new e2e test in `tests/e2e/options.spec.ts` grows with each story: US1 adds steps 1–5 of contracts/ui.md,
  US2 step 6 (keyboard), US3 step 7 (export).

**Organization**: three stories, in priority order:
- **US1 (P1), choose the theme:** the head script, the control, the mark, the palette rules.
- **US2 (P2), easy to reach:** the keyboard path and the navbar fit.
- **US3 (P3), settings files unaffected:** the export check. No code: the choice never touches the settings.

Everything stays on the branch `006-theme-toggle` and goes up as one pull request.

**Ground rules for every task**:
- **Settings untouched (FR-010).** Do not change `src/core`, `createConfigStore`, the settings format or the export.
- **Kibana untouched (FR-012).** Do not change `src/content/`, `entrypoints/kibana.ts`, `themeBehind`,
  `reportTheme` or `src/toolbar-icon.ts`.
- **The head script stays a classic script.** Never give `<script src="/options-theme.js">` `type="module"`,
  `defer` or `async` (research R2).
- **Exact markup, CSS hooks and strings** are in `contracts/ui.md` and `contracts/strings.md`.
- **E2E asserts no localized text.**
- **React only, never `innerHTML`.** Cite this feature as `spec 006 FR-xxx` in comments, matching the existing
  comment density.
- **Commits**: end every message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push or
  open a PR without the user's yes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1, US2 or US3 from spec.md

---

## Phase 1: Setup

- [X] T001 Check the starting point:
  - `git branch --show-current` is `006-theme-toggle`;
  - `git log --oneline -1` is the tasks commit or later (spec `0a67df6`, plan `6f9f915`);
  - the tree is clean.
- [X] T002 Record the baseline:
  - `npx vitest run` passes with 571 tests.
  - The 9.x stack answers (`curl -s -o /dev/null -w '%{http_code}' http://localhost:19601/api/status`). It was
    stopped on 2026-10-20, so run `./docker/up.sh 9` and wait for it.
  - `KT_STACK=9 npm run e2e -- options` passes its 10 tests.

---

## Phase 2: Foundational (blocks every story)

- [X] T003 [P] In `tests/unit/theme.test.ts`, add `applyTheme` to the import from `../../src/theme` and a
  `describe("applyTheme", …)` block before `describe("themeBehind", …)`. The unit tests run in the `node`
  environment, so the root is a stand-in: `const root = () => ({ dataset: {} }) as unknown as HTMLElement`.
  - Light and Dark hold whatever the system says: for each of `"light"` and `"dark"`, and each `systemDark` of
    `false` and `true`, `dataset.theme` equals the choice.
  - System follows the system: `"system"` with `false` gives `"light"`, with `true` gives `"dark"`.

  It fails until T005.
- [X] T004 [P] In `tests/unit/storage.test.ts`, import `THEME_KEY`, `loadThemeChoice` and `saveThemeChoice`, and
  add a `describe("theme choice (spec 006)", …)` block. A local helper
  `webArea(initial?: string)` returns `{ data: Map, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) }`,
  with `initial` stored under `THEME_KEY` when given. Silence the expected log with
  `vi.spyOn(console, "debug").mockImplementation(() => {})` in the two throwing cases (import `vi`).
  - `"system"`, `"light"` and `"dark"` are read back as they are.
  - A missing value and an unknown one (`"blue"`) give `"system"`.
  - A `getItem` that throws gives `"system"`.
  - `saveThemeChoice(area, "dark")` leaves `"dark"` under `THEME_KEY`.
  - A `setItem` that throws doesn't throw out of `saveThemeChoice`.

  It fails until T006.
- [X] T005 In `src/theme.ts`, after `cssVars` and before `parseColor`, add (research R3):

  ```ts
  /** The options page's theme choices (spec 006): System follows the browser's color scheme. */
  export const THEME_CHOICES = ["system", "light", "dark"] as const;
  export type ThemeChoice = (typeof THEME_CHOICES)[number];

  /** Marks the page root with the palette a choice shows: the choice itself, or for System the system's mode. */
  export function applyTheme(root: HTMLElement, choice: ThemeChoice, systemDark: boolean): void {
    root.dataset.theme = choice === "system" ? (systemDark ? "dark" : "light") : choice;
  }
  ```

  If `cssVars` is not right before `parseColor`, put the block right after `cssVars`. Run
  `npx vitest run tests/unit/theme.test.ts`: all pass.
- [X] T006 In `src/storage.ts`, after `createConfigStore` (research R1). Needs T005.
  - Import `{ THEME_CHOICES, type ThemeChoice }` from `./theme`.
  - Add `export const THEME_KEY = "kibanatool.theme";`.
  - Add `loadThemeChoice(area: Pick<Storage, "getItem">): ThemeChoice`:
    - `const stored = area.getItem(THEME_KEY)`, then `return THEME_CHOICES.find((choice) => choice === stored) ?? "system"`;
    - in a `catch`, `console.debug("[kibanatool] theme choice unreadable:", error)` and return `"system"`.
  - Add `saveThemeChoice(area: Pick<Storage, "setItem">, choice: ThemeChoice): void`:
    - `area.setItem(THEME_KEY, choice)`;
    - in a `catch`, `console.debug("[kibanatool] theme choice not saved:", error)`.
  - One comment above them: the choice lives in the extension's `localStorage`, apart from the settings, so the
    page's head script can read it before the first frame and export and import never carry it (spec 006
    FR-008, FR-010).
  - Update the file's first comment line to say it is the access point to stored configuration and the options
    page's theme choice.

  Run `npx vitest run tests/unit/storage.test.ts tests/unit/architecture.test.ts`: all pass. The root group may
  import root, and `theme.ts` imports nothing from `storage.ts`.
- [X] T007 [P] In `public/_locales/en/messages.json`, add the four keys from `contracts/strings.md` right after
  `optionsNavLabel`, one line each, in this order: `optionsTheme`, `optionsThemeSystem`, `optionsThemeLight` and
  `optionsThemeDark`.
- [X] T008 [P] In `public/_locales/tr/messages.json`, add the same four keys at the same place, with the Turkish
  text from `contracts/strings.md`.

**Checkpoint**: `npx vitest run` passes: 571 plus the new `applyTheme` and theme-choice cases, including
`tests/unit/i18n.test.ts`.

---

## Phase 3: User Story 1 - Choose the page's theme (Priority: P1) 🎯 MVP

**Goal**: a System/Light/Dark control in the bar. The page shows the chosen theme from its first frame and keeps
it across reloads. System follows the system live. Kibana and the toolbar icon are unchanged.

**Independent Test**: `KT_STACK=9 npm run e2e -- options`. The new test, steps 1–5, passes along with the ten
existing ones.

### Tests for User Story 1

- [X] T009 [US1] In `tests/e2e/options.spec.ts`, add the test "switches the page theme, keeps it from the first
  frame, follows the system on System, and leaves it out of the export (spec 006 FR-016)", steps 1–5 of
  contracts/ui.md. Import `DARK` and `parseColor` from `../../src/theme`.
  1. **Setup:**
     - `await configure()`.
     - `await context.addInitScript(() => requestAnimationFrame(() => { (window as Window & { __ktFirstFrameTheme?: string }).__ktFirstFrameTheme = document.documentElement.dataset.theme; }))`.
     - `const options = await openOptions(context, extension.id)`, then `await options.emulateMedia({ colorScheme: "light" })`.
     - Helpers:
       - `html = options.locator("html")`;
       - `radio = (value: string) => options.locator(\`input[name="theme"][value="${value}"]\`)`;
       - `pick = (value: string) => options.locator(".theme-switch label", { has: radio(value) }).click()`.

       A hidden radio can't take `check()`, so `pick` clicks its label.
  2. **Default:** `html` has `data-theme` `"light"`, and `radio("system")` is checked.
  3. **Dark:** `pick("dark")`.
     - `html` has `data-theme` `"dark"`, and `radio("dark")` is checked.
     - `options.locator("body")` has the CSS `background-color` `rgb(r, g, b)`, built from
       `parseColor(DARK["surface-page"])`.
  4. **Reload:** `options.reload()`.
     - `await expect.poll(() => options.evaluate(() => (window as Window & { __ktFirstFrameTheme?: string }).__ktFirstFrameTheme)).toBe("dark")`.
       Poll, since the first frame can come a moment after the page counts as loaded.
     - `radio("dark")` is still checked.
  5. **System follows the system:** `pick("system")`.
     - `options.emulateMedia({ colorScheme: "dark" })`: `html` has `data-theme` `"dark"`.
     - `options.emulateMedia({ colorScheme: "light" })`: `html` has `data-theme` `"light"`.

  End the test there for now; T015 and T018 add steps 6 and 7. It fails until T010–T014 are done.

### Implementation for User Story 1

- [X] T010 [US1] Create `entrypoints/options-theme.ts` (research R2, R3). Needs T005 and T006.
  - **Header comment:** the options page's palette and theme before its first frame (spec 006 FR-008; research
    R2). A classic script in the page's `<head>`: a module would run after the first frame and flash the other
    theme. It reads the stored choice and follows the system's mode under System.
  - **Imports:** `defineUnlistedScript` from `"#imports"`, `loadThemeChoice` from `../src/storage`, and `DARK`,
    `LIGHT`, `applyTheme` and `cssVars` from `../src/theme`.
  - **Body**, `export default defineUnlistedScript(() => { … })`:
    1. Append a `<style>` to `document.head` with
       `` `:root[data-theme="light"] { color-scheme: light; ${cssVars(LIGHT)} } :root[data-theme="dark"] { color-scheme: dark; ${cssVars(DARK)} }` ``.
    2. `const media = window.matchMedia("(prefers-color-scheme: dark)")`.
    3. `const apply = (): void => applyTheme(document.documentElement, loadThemeChoice(localStorage), media.matches)`.
       It re-reads the stored choice each time, so a pick made since load counts.
    4. `apply()`, then `media.addEventListener("change", apply)`.
- [X] T011 [US1] Load the script and move the palette out of `main.tsx`. Needs T010.
  - **`entrypoints/options/index.html`:** add `<script src="/options-theme.js"></script>` right after `<title>`.
  - **`entrypoints/options/main.tsx`:**
    - remove the `DARK, LIGHT, cssVars` import and the three lines that build and append the palette `<style>`;
    - keep `reportTheme(...)`;
    - replace the comment with: "The palette and the page's theme come from options-theme.js in <head>, before
      the first frame (spec 006). This only reports the system's mode, for the toolbar icon."
  - **Build:** `npm run build`. Check `grep -o '<script[^>]*>' .output/chrome-mv3/options.html`: the first tag is
    `<script src="/options-theme.js">` with no `type`, and `.output/chrome-mv3/options-theme.js` exists.
  - **The Vite warning:** the build prints `can't be bundled without type="module"`. Try adding a `vite-ignore`
    attribute to the tag and building again. Keep it only if the warning goes away and the built tag is still a
    classic `<script src="/options-theme.js">`; otherwise remove it and leave the warning.
- [X] T012 [P] [US1] Create `entrypoints/options/ThemeSwitch.tsx` (research R4, contracts/ui.md "Navbar").
  Needs T005–T008.
  - **Header comment:** the page's theme choice, System, Light or Dark, stored on this device apart from the
    settings (spec 006 FR-001–FR-005).
  - **Names:** `const NAMES = { system: "optionsThemeSystem", light: "optionsThemeLight", dark: "optionsThemeDark" } satisfies Record<ThemeChoice, MessageKey>`.
  - **Icons:** `const ICONS: Record<ThemeChoice, ReactNode>`, each an `<svg viewBox="0 0 16 16" width={16}
    height={16} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true">` holding:
    - system (a monitor): `<rect x="1.75" y="2.75" width="12.5" height="8.5" rx="1.5" />` and
      `<path d="M5.5 14h5M8 11.25V14" />`;
    - light (a sun): `<circle cx="8" cy="8" r="2.75" />` and
      `<path d="M8 1.25v1.5M8 13.25v1.5M1.25 8h1.5M13.25 8h1.5M3.2 3.2l1.06 1.06M11.74 11.74l1.06 1.06M3.2 12.8l1.06-1.06M11.74 4.26l1.06-1.06" />`;
    - dark (a moon): `<path d="M13.5 9.6A5.75 5.75 0 0 1 6.4 2.5a5.75 5.75 0 1 0 7.1 7.1z" />`.
  - **Component** `export function ThemeSwitch()`:
    - `const [choice, setChoice] = useState(() => loadThemeChoice(localStorage))`;
    - `choose(next)`: `setChoice(next)`, then
      `applyTheme(document.documentElement, next, window.matchMedia("(prefers-color-scheme: dark)").matches)`, then
      `saveThemeChoice(localStorage, next)`;
    - render `<div className="theme-switch" role="radiogroup" aria-label={t("optionsTheme")}>`, then for each
      `THEME_CHOICES` entry `c`: `<label key={c} title={t(NAMES[c])}><input type="radio" name="theme" value={c}
      checked={choice === c} onChange={() => choose(c)} aria-label={t(NAMES[c])} />{ICONS[c]}</label>`.
- [X] T013 [US1] In `entrypoints/options/App.tsx` (contracts/ui.md "Navbar"). Needs T012.
  - Replace the brand's `<picture>` with two images:
    `<img className="logo-light" src={iconPaths(false)["48"]} alt="" width={24} height={24} />` and
    `<img className="logo-dark" src={iconPaths(true)["48"]} alt="" width={24} height={24} />`. The text
    "kibanatool" follows them.
  - Render `<ThemeSwitch />` between `</nav>` and `span.nav-version`. Import it from `./ThemeSwitch`.
- [X] T014 [US1] In `entrypoints/options/options.css` (research R3–R5, contracts/ui.md "CSS hooks"):
  - **Header comment:** the palette comes from `options-theme.js` and is picked by `html[data-theme]` (spec 006).
  - **Remove** `:root { color-scheme: light dark; }`. The head script's rules set `color-scheme` per theme.
  - **Mark:** replace `.nav-brand picture, .nav-brand img { display: block; }` and `.nav-brand img { width: 24px;
    height: 24px; }` with `.nav-brand img { display: block; width: 24px; height: 24px; }` and
    `:root[data-theme="dark"] .logo-light, :root:not([data-theme="dark"]) .logo-dark { display: none; }`.
  - **Version:** remove `margin-left: auto;` from `.nav-version`.
  - **Control**, after `.nav-version`:

    ```css
    .theme-switch { flex: none; display: flex; align-self: center; margin-left: auto; border: 1px solid var(--kt-border-plain); border-radius: 6px; }
    .theme-switch label {
      position: relative; display: grid; place-items: center; width: 28px; height: 28px; color: var(--kt-text-muted); cursor: pointer;
      transition: color 120ms ease-in, background-color 120ms ease-in;
    }
    .theme-switch label:first-child { border-radius: 5px 0 0 5px; }
    .theme-switch label:last-child { border-radius: 0 5px 5px 0; }
    .theme-switch label:hover { color: var(--kt-text-primary); }
    .theme-switch label:has(:checked) { background: var(--kt-primary); color: var(--kt-on-primary); }
    .theme-switch label:has(:focus-visible) { z-index: 1; outline: 2px solid var(--kt-text-primary); outline-offset: 1px; }
    .theme-switch input { position: absolute; width: 1px; height: 1px; margin: 0; opacity: 0; pointer-events: none; }
    .theme-switch svg { display: block; }
    ```

    `:has(:checked)` comes after `:hover`, so the selected segment keeps its light icon under the mouse.

**Checkpoint**:
- `npm run typecheck` is clean, and `npm run build` works.
- `KT_STACK=9 npm run e2e -- options` passes 11 tests.
- The quickstart's first-frame probe gives `data-theme="dark"` at the first frame in 10 of 10 reloads.
- On a light system with Dark chosen, the page, the mark and the inputs are dark.

---

## Phase 4: User Story 2 - The switch is easy to reach and to understand (Priority: P2)

**Goal**: one keyboard stop after the tabs that changes the theme with the arrow keys, and a bar where the Turkish
tabs and the control fit at 1000px.

**Independent Test**: the new e2e test with step 6 passes, and the fit probe (T017) passes.

### Tests for User Story 2

- [X] T015 [US2] In the new e2e test, after step 5, add step 6 of contracts/ui.md:
  - `options.locator('a.tab[href="#transfer"]').focus()`, then `options.keyboard.press("Tab")`.
  - `radio("system")` is focused.
  - Press `ArrowRight` twice: `radio("dark")` is checked, and `html` has `data-theme` `"dark"`.

### Implementation for User Story 2

- [X] T016 [US2] In `entrypoints/options/options.css`, change `.nav`'s `gap: 32px` to `gap: 24px` (research R5).
- [X] T017 [US2] Measure the fit with a scratchpad Playwright script (not committed), as quickstart.md "First
  frame and fit" step 2, on the build from T016:
  - at 1000×800 in Turkish, `.nav-tabs` `scrollWidth` ≤ `clientWidth`, and `.theme-switch`'s right edge is at
    most `.nav-version`'s left edge;
  - at 700px, the tabs scroll and `.theme-switch`'s box lies fully inside the viewport.

  Record the numbers for T023. If the tabs don't fit at 1000px, stop and report the shortfall to the user before
  changing any other size.

**Checkpoint**: `KT_STACK=9 npm run e2e -- options` passes 11 tests, and T017 passes.

---

## Phase 5: User Story 3 - Settings files are not affected (Priority: P3)

**Goal**: show that a theme choice never reaches the settings or the export.

**Independent Test**: the new e2e test with step 7 passes.

### Tests for User Story 3

- [X] T018 [US3] In the new e2e test, after step 6 (the choice is Dark), add step 7 of contracts/ui.md:
  - click `a.tab[href="#transfer"]`;
  - `const [download] = await Promise.all([options.waitForEvent("download"), options.locator('section[aria-labelledby="transfer-title"] .field-h button').click()])`;
  - `JSON.parse(await readFile(await download.path(), "utf8"))` equals `e2eConfig()`.

  It passes with no code change. If it fails, the choice reached the settings: find where, and fix that instead
  of the test.

**Checkpoint**: `KT_STACK=9 npm run e2e -- options` passes 11 tests, the new one with all seven steps.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T019 [P] In `CLAUDE.md` (research R7):
  - **Docs:** after the 005 entry in the spec-kit list, add 006 (`specs/006-theme-toggle/`: a System, Light or
    Dark switch on the options page).
  - **Traps:** right after the toolbar icon trap, add one bullet. The options page's theme choice (System, Light,
    Dark) lives in the extension's `localStorage` under `kibanatool.theme`, never in `chrome.storage` or the
    settings. `options-theme.js`, a classic script in the page's `<head>`, injects the palette and sets
    `html[data-theme]` before the first frame: never make it `type="module"`, `defer` or `async`, or the page
    flashes the other theme. Then, depending on T011's outcome, either "The build's `can't be bundled without
    type="module"` warning about it is expected." or nothing, if `vite-ignore` silenced it. Last: the toolbar
    icon's `kibanatool:theme` report still follows the browser; don't wire it, the action bar or the row strip to
    the choice.
- [X] T020 [P] In `CHANGELOG.md`, under `## [Unreleased]`, add an `### Added` section above `### Changed`:
  "- The options page has a theme switch in its top bar: System, Light or Dark. The choice stays on this device and
  is not part of the exported settings."
- [X] T021 Run the gates (quickstart.md "Gates"):
  - `npm run typecheck`;
  - `npx vitest run`;
  - `npm run build && npm run check:manifest`, and the built `options.html` check from T011;
  - `KT_STACK=9 npm run e2e -- options` (11 tests);
  - `KT_STACK=9 npm run e2e` (the full 9.x suite: 42 passed and 5 skipped expected).

  Fix anything that fails before going on.
- [X] T022 The visual check from quickstart.md, with a scratchpad Playwright script (not committed), Turkish,
  1000×800:
  - screenshots of `#environments` and of `#actions` with the action dialog open, for each of: system light with
    Dark, system dark with Light, and System in each system mode;
  - look for everything in quickstart.md's "Look for" list, and check `#transfer`'s file picker button in the
    dark case;
  - rerun the first-frame probe (10 reloads, system light, choice Dark).
- [X] T023 Create `docs/verification/2026-10-theme-switch.md` in Turkish, shaped like
  `docs/verification/2026-10-tabbed-options.md`:
  - header: date, branch and HEAD, spec path, Kibana 9.5.5, tools;
  - **Otomatik kontroller:** the T021 results, T011's built-tag check and the Vite warning outcome;
  - **İlk kare ve sığma:** the T017 numbers and the first-frame probe result;
  - **Görsel kontrol:** one row per T022 look-for item, with its result;
  - **Elle yapılacak kontroller:** M1–M5 from quickstart.md, each marked "Bekliyor". Note that M2 also closes
    spec 005's M3.
- [X] T024 Commit the implementation on `006-theme-toggle` as one commit,
  `feat(options): theme switch on the options page; spec-kit feature 006`, with the trailer. Mark T001–T024
  `[X]` in this file in the same commit. Then ask the user whether to push and open the pull request; don't do
  either without a yes.
- [X] T025 After the user merges the pull request, and only when they ask:
  - set the spec's Status to "Implemented (PR #<n>, merged <date>)" and mark T025 `[X]`;
  - when the user reports M1–M5, record them in `docs/verification/2026-10-theme-switch.md`. Record M2's result
    as spec 005's M3 too, in `docs/verification/2026-10-tabbed-options.md`.

  Ask whether this goes straight to main or through a branch, as for spec 005's T031.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: after Setup. Blocks every story: `applyTheme`, the stored choice and the strings.
- **US1 (Phase 3)**: after Foundational. It is the MVP.
- **US2 (Phase 4)**: after US1. Its e2e step and the fit probe need the control in the bar.
- **US3 (Phase 5)**: after US2. Its step continues the same test from where step 6 leaves the choice (Dark). On its
  own, it only needs US1 plus a pick of Dark before the export.
- **Polish (Phase 6)**: after every story.

### Within Each Phase

- T003 and T004 (tests) before T005 and T006. T005 before T006 (the type).
- T009 before T010–T014. T010 before T011. T012 before T013. T014 can go with T010–T013, since it is CSS only.
- T015 before T016. T016 before T017.

### Parallel Opportunities

- T003, T004, T007 and T008: four different files.
- T012 alongside T010 and T011: different files, all after Phase 2.
- T019 and T020: two docs.

## Parallel Example: Phase 2

```text
Task: "T003 applyTheme cases in tests/unit/theme.test.ts"
Task: "T004 theme choice cases in tests/unit/storage.test.ts"
Task: "T007 four keys in public/_locales/en/messages.json"
Task: "T008 four keys in public/_locales/tr/messages.json"
```

## Parallel Example: User Story 1

```text
Task: "T010 entrypoints/options-theme.ts"
Task: "T012 entrypoints/options/ThemeSwitch.tsx"
Task: "T014 entrypoints/options/options.css"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phases 1 and 2.
2. Phase 3: the switch works, survives a reload and shows from the first frame.
3. **Stop and validate**: the e2e steps 1–5 and the first-frame probe. In Turkish at 1000px the tabs may scroll
   by a few pixels until US2.

### Incremental Delivery

1. US1: the switch (MVP).
2. US2: the keyboard step and the fit.
3. US3: the export check.
4. Polish: docs, gates, the visual check, the verification file, one commit, then ask about the pull request.
