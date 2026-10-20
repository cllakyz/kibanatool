---

description: "Task list for the tabbed options page"
---

# Tasks: Tabbed Options Page

**Input**: Design documents from `/specs/005-tabbed-options/`

**Prerequisites**: plan.md, spec.md (clarified 2026-10-20), research.md (R1–R9), data-model.md,
contracts/ui.md, contracts/strings.md, quickstart.md

**Tests**: Included, because FR-022 asks for them and G4 requires the e2e matrix to pass.
- Each story first adapts the existing `tests/e2e/options.spec.ts` tests and adds its new one. The new tests fail
  until the story's implementation lands.
- `tests/unit/theme.test.ts` gains three contrast pairs (R3).

**Organization**: three stories, in priority order:
- **US1 (P1), tabs:** `App.tsx`.
- **US2 (P2), action dialog and row badges:** `ActionsSection`, `ActionEditor`.
- **US3 (P3), panels:** Environments, Variables, Copy, Transfer.

Everything stays on the branch `005-tabbed-options` and goes up as one pull request.

**Ground rules for every task**:
- **No behavior change (FR-019).**
  - Do not touch `src/core`, `src/options/model.ts`, `storage.ts` or the settings format.
  - Keep each section's `{config, onSave}` props and its save calls (`submit(withX(...))`) as they are.
- **Design source.** Classes, structure and token values come from the "kibanatool options" design system,
  `project/components/bundle.css` and the previews. To read them again, call the Artifact tool with
  `action: "read"`, `url: "https://claude.ai/artifact/3tM377bw1BM4dB5Nq3dFop"` and the file `path`. Where
  research.md departs from the design, research.md wins.
- **No element id equals a tab id** (`environments`, `variables`, `actions`, `copy`, `transfer`), per R1.
- **Exact strings** are in `contracts/strings.md`, and the DOM and selectors in `contracts/ui.md`.
- **E2E asserts no localized text** (`tests/CLAUDE.md`). Action labels from `e2eConfig()` are allowed.
- **React only, never `innerHTML`.** Cite this feature as `spec 005 FR-xxx` in comments, matching the existing
  comment density.
- **Commits**: end every message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push or
  open a PR without the user's yes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1, US2 or US3 from spec.md

---

## Phase 1: Setup

- [X] T001 Check the starting point:
  - `git branch --show-current` is `005-tabbed-options`;
  - `git log --oneline -1` is `98bd247` (spec and plan) or later;
  - the tree is clean.
- [X] T002 Record the baseline:
  - `npx vitest run` passes with 565 tests.
  - The 9.x stack answers. If not, run `./docker/up.sh 9`.
  - `KT_STACK=9 npm run e2e -- options` passes its 8 tests.

---

## Phase 2: Foundational (blocks every story)

- [X] T003 [P] In `src/theme.ts`, add seven entries right after `"shadow-menu"` in both palettes (R3; values from
  the design's `project/tokens.json`):
  - `LIGHT`:
    - `overlay: "rgba(29, 42, 62, 0.5)"`;
    - `"shadow-modal": "0 0 2px 0 rgba(43, 57, 79, 0.16), 0 6px 18px 0 rgba(43, 57, 79, 0.14), 0 14px 32px 0 rgba(43, 57, 79, 0.1)"`.
  - `DARK`:
    - `overlay: "rgba(5, 15, 33, 0.72)"`;
    - `"shadow-modal": "0 6px 18px 0 rgba(5, 15, 33, 0.6), 0 14px 32px 0 rgba(5, 15, 33, 0.4)"`.
  - Both, with the same values:
    - `"height-navbar": "48px"`, `"width-content": "1120px"`, `"width-label": "240px"`;
    - `"width-modal": "760px"`, `"z-nav": "10"`.

  The palettes now hold the options page's sizes too, so the first comment line says that they also carry "the
  options page's sizes". `cssVars` doesn't change.
- [X] T004 [P] In `tests/unit/theme.test.ts`, add three entries to `PAIRS`, before the `["border-input", …]`
  lines:
  - `["text-primary", "surface", 4.5]`: the open tab's label (spec 005);
  - `["text", "discover", 4.5]`: the intro callout;
  - `["primary", "surface", 3]`: the open tab's underline, a state mark.

  The existing `["text-primary", "surface", 3]` entry stays. Run `npx vitest run tests/unit/theme.test.ts`: all
  pass, since the colors are unchanged. If one fails, stop and report the ratio.
- [X] T005 [P] In `public/_locales/en/messages.json`, add the seven keys from `contracts/strings.md`, one line
  each:
  - `optionsNavLabel` after `optionsIntro`;
  - `optionsMarkdownFieldsHelp` after `optionsMarkdownFields`;
  - `optionsMaskPatternsShort` and `optionsMaskPatternsLine` after `optionsMaskPatterns`;
  - `optionsExportHelp` after `optionsExport`;
  - `optionsImportHelp` after `optionsImport`;
  - `optionsEmptyActions` after `optionsAddDiscover`.

  Do not remove anything yet (T022 does).
- [X] T006 [P] In `public/_locales/tr/messages.json`, add the same seven keys at the same places, with the Turkish
  text from `contracts/strings.md`.
- [X] T007 [P] Rewrite `entrypoints/options/options.css` from the design's `bundle.css` (R3).
  - **Scope and themes:**
    - Drop every `.options ` prefix. `.options { … }` becomes `body { … }`.
    - Keep `:root { color-scheme: light dark; }`, and drop the `[data-theme="dark"]` rules.
  - **Tokens:**
    - **To `var(--kt-<name>)`:** color tokens, `font-sans`/`font-mono`, `overlay`, `shadow-modal`,
      `height-navbar`, `width-content`, `width-label`, `width-modal` and `z-nav`.
    - **To literal values:**
      - `space-N` → `Npx`, and `calc(-1 * var(--space-24))` → `-24px`;
      - `radius-4|8|12` → `4px|8px|12px`, and `radius-pill` → `999px`;
      - `height-control` → `32px`, and `width-variable-input` → `140px`.
  - **Departures from `bundle.css`:**
    - The brand mark is a `<picture>`: `.nav-brand picture, .nav-brand img { display: block; }` and
      `.nav-brand img { width: 24px; height: 24px; }`. Drop the `.logo-light`/`.logo-dark` rules.
    - `.modal { … }` keeps everything except `display: flex; flex-direction: column;`. Those go on
      `dialog.modal[open] { display: flex; flex-direction: column; }`, so a closed dialog stays hidden.
    - The dialog's form fills it and lets the body scroll:
      - `.modal form { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }`;
      - `.modal-body` also gets `flex: 1 1 auto; min-height: 0;`.
    - `.field-h:first-of-type`/`:last-of-type` become `.fields > .field-h:first-child`/`:last-child`.
    - The footer feedback sits at its left: `.panel-foot .notice, .panel-foot .error` with
      `margin: 0 auto 0 0; padding: 5px 12px;`.
    - Action rows get a warnings line: `.item-warnings { display: flex; flex-wrap: wrap; gap: 2px 12px; }`.
  - **Keep for now:** `.list`, `.list li`, `.list li:last-child` and `.editor` from today's file. T023 removes
    them once nothing uses them.
  - Keep the first comment line, saying that colors, fonts and the page sizes are `--kt-*` properties from
    `src/theme.ts`.

**Checkpoint**: `npx vitest run` passes with 571 tests (565 + 3 pairs × 2 themes). `npm run build` works. The page
still renders the old layout with the new stylesheet.

---

## Phase 3: User Story 1 - Each section is its own tab (Priority: P1) 🎯 MVP

**Goal**: a sticky navbar with five hash tabs. Only the open tab's section is visible, under its title and intro.
Reload and Back keep the tab, and hidden tabs keep their unsaved edits.

**Independent Test**: `KT_STACK=9 npm run e2e -- options`. The new tabs test (T009) and the eight adapted tests
pass.

### Tests for User Story 1

- [X] T008 [US1] In `tests/e2e/options.spec.ts`, give `openOptions` an optional third parameter `tab?: string`
  that goes to `options.html#<tab>` (no hash when it is omitted). Then make every existing test reach its section
  through its tab:
  - **"adds an environment and a link action…":** no tab. Before the first `actions` locator, click
    `options.locator('a.tab[href="#actions"]')`.
  - **`"transfer"`:** "exports the settings…", "exports a corrupt stored value…" and "imports a version 1
    settings file…".
  - **`"copy"`:** "turns one value mask off…" and "describes the mask patterns field… (spec 004 FR-002)".
  - **`"variables"`:** "edits environment variables in the table…". Its `actions … .var-warning` assertions stay
    as they are, because `toHaveCount` counts hidden elements.
  - **`"actions"`:** "keeps the inner space of a target data view name…".

  Keep every other selector for now. US2 and US3 change them along with the markup.
- [X] T009 [US1] In the same file, add the test "opens the tab the address names, keeps it on reload and Back,
  and keeps unsaved edits (spec 005 FR-002–FR-005)":
  1. **Setup:** `await configure()` and `const options = await openOptions(context, extension.id)`, with no
     hash. Take `section = (tab) => options.locator(\`section[aria-labelledby="${tab}-title"]\`)` and
     `current = options.locator('a.tab[aria-current="page"]')`.
  2. **Default tab:** `current` has `href` `#environments`, `section("environments")` is visible and
     `section("actions")` is hidden.
  3. **Tab click:** click `a.tab[href="#actions"]`.
     - The URL matches `/#actions$/`, and `current` has `href` `#actions`.
     - The `h1` has the same text as that tab link (read it with `innerText()`; no literal).
     - `section("actions")` is visible and `section("environments")` hidden.
  4. **Reload and Back:**
     - `options.reload()`: `current` is still `#actions`.
     - `options.goBack()`: `current` is `#environments`.
  5. **Unknown tab:** `options.goto(…options.html#foo)`: `current` is `#environments`.
  6. **Unsaved edits:** click `a.tab[href="#copy"]` and fill `section("copy").locator("textarea").nth(1)` with
     `"kept*"`. Click `a.tab[href="#variables"]`, then `a.tab[href="#copy"]`. The textarea still has the value
     `"kept*"`.
  7. **Version:** `options.locator(".nav-version")` has the text
     `` `v${JSON.parse(await readFile("package.json", "utf8")).version}` ``.

  It fails until T010.

### Implementation for User Story 1

- [X] T010 [US1] Rewrite the render of `entrypoints/options/App.tsx` (R1, R4, contracts/ui.md "Page"). Needs T005.
  - **Tab list:** a module-level `TABS` list with `satisfies readonly { id: string; title: MessageKey;
    intro?: MessageKey }[]`:
    - `environments`: `optionsEnvironments`, intro `optionsIntro`;
    - `variables`: `optionsVariables`, intro `optionsVariablesHelp`;
    - `actions`: `optionsActions`, intro `optionsActionsHelp`;
    - `copy`: `optionsCopy`, no intro;
    - `transfer`: `optionsTransfer`, no intro.

    `tabOf(hash)` returns the entry whose `#id` equals `hash`, otherwise `TABS[0]`.
  - **State:**
    - `const [tab, setTab] = useState(() => tabOf(location.hash))`;
    - an effect that adds a `hashchange` listener calling `setTab(tabOf(location.hash))`, and removes it on
      cleanup.
    - Both hooks go before the `if (!config)` early return.
    - Never write to `location.hash`.
  - **Navbar:** render a `header.nav` before `main`.
    - `a.nav-brand href="#environments"` holds a `<picture>`:
      - `<source media="(prefers-color-scheme: dark)" srcSet={iconPaths(true)["48"]} />`;
      - `<img src={iconPaths(false)["48"]} alt="" width={24} height={24} />`;
      - `iconPaths` comes from `../../src/toolbar-icon`.

      The brand text "kibanatool" follows the picture.
    - `nav.nav-tabs aria-label={t("optionsNavLabel")}` holds one `a.tab href={"#" + id}` per tab, with
      `aria-current={id === tab.id ? "page" : undefined}`.
    - `span.nav-version`: `v{browser.runtime.getManifest().version}`.
  - **`main`, in order:**
    - `<h1>{t(tab.title)}</h1>`;
    - the intro, when `tab.intro` is set: `<div className="callout"><p>{t(tab.intro)}</p></div>`;
    - the existing load-error `.warning[role="alert"]`, unchanged;
    - the five sections, in `TABS` order, each wrapped in `<div hidden={tab.id !== "<id>"}>`. All five stay
      mounted (spec 005 FR-004). `TransferSection` keeps its `exportValue` prop.
  - **Removed:** the old `<h1>kibanatool</h1>` and the `<p className="muted">{t("optionsIntro")}</p>`.
  - **Header comment:** update it to say the page is five tabs (spec-kit 005).
  - Keep the `save` function and the load effect unchanged.
- [X] T011 [P] [US1] Remove the help paragraphs that now show as tab intros:
  - `<p className="muted">{t("optionsVariablesHelp")}</p>` in `entrypoints/options/VariablesSection.tsx`;
  - `<p className="muted">{t("optionsActionsHelp")}</p>` in `entrypoints/options/ActionsSection.tsx`.

**Checkpoint**: `npm run typecheck` is clean. `KT_STACK=9 npm run e2e -- options` passes 9 tests: 8 adapted and
T009. The page shows tabs, and the sections still use the old inner layout.

---

## Phase 4: User Story 2 - Actions are edited in a dialog, and the list shows which appear in rows (Priority: P2)

**Goal**: action rows with the kind and "Show in row" badges, the template line and the warnings. The editor opens
in a modal dialog that closes on Escape, ×, Cancel, Save and `hashchange`, and focus returns to the opener.

**Independent Test**: on `#actions`, the new dialog test (T013) and the two adapted action tests pass.

### Tests for User Story 2

- [X] T012 [US2] In `tests/e2e/options.spec.ts`, move the action selectors to the new markup (contracts/ui.md,
  "e2e selector migration"):
  - **"adds an environment and a link action…":**
    - "Add link action" is `actions.locator(".panel-head button").first()`.
    - Replace the `toBeDisabled()` line with `await expect(actions.locator("dialog.modal[open]")).toBeVisible()`,
      keeping the comment "one draft at a time".
    - Save is `actions.locator('dialog button[type="submit"]')`.
    - The list check is `actions.locator(".items .name")`.
  - **"keeps the inner space of a target data view name…":**
    - "Add Discover action" is `actions.locator(".panel-head button").nth(1)`.
    - Save is `actions.locator('dialog button[type="submit"]')`.
- [X] T013 [US2] In the same file, add the test "edits an action in a dialog: badges, Escape, focus and Back
  (spec 005 FR-015–FR-017)":
  1. **Setup:** `await configure(markInRow(e2eConfig(), ["user"]))` and `openOptions(context, extension.id)`
     with no hash. Then click `a.tab[href="#actions"]`. Import `markInRow` from `./fixtures`.
  2. **Badges:**
     - `actions.locator(".items .badge")` has the count `e2eConfig().actions.length + 1`.
     - Take `userRow = actions.locator(".items .item").filter({ has: options.locator(".name").getByText("User",
       { exact: true }) })`. Its `.badge` count is 2.
  3. **Escape and focus:**
     - Take `edit = userRow.locator(".item-actions button").first()` and click it.
       `actions.locator("dialog.modal[open]")` is visible.
     - Press `Escape`. `actions.locator("dialog")` has the count 0, and `edit` is focused (`toBeFocused()`).
  4. **Back:**
     - Click `actions.locator(".panel-head button").first()`. The dialog is open.
     - `options.goBack()`. `options.locator("dialog[open]")` has the count 0.
     - Clicking `section[aria-labelledby="environments-title"] input[name="name"]` works with a 5-second
       timeout: a leftover modal backdrop would intercept it.

  It fails until T016.

### Implementation for User Story 2

- [X] T014 [P] [US2] In `entrypoints/options/feedback.tsx`, add and export
  `KindBadge({ kind }: { kind: Action["kind"] })`, which renders
  `<span className="badge">{t(kind === "link" ? "optionsKindLink" : "optionsKindDiscover")}</span>`. Import the
  `Action` type from `../../src/core/config`. It is the one place for the kind label (Principle II).
- [X] T015 [US2] Turn `entrypoints/options/ActionEditor.tsx` into the dialog (R2, contracts/ui.md "Action
  dialog"). Needs T014.
  - **Props:** add `errors: string[]` to `ActionEditorProps`.
  - **Open and focus:**
    - Take `const dialog = useRef<HTMLDialogElement>(null)`.
    - In a `useLayoutEffect` with `[]` deps:
      - store `document.activeElement` in an `opener` ref;
      - call `dialog.current?.showModal()` unless `dialog.current.open`.
    - A `useEffect` with `[]` deps returns a cleanup that focuses `opener.current` when it is an `HTMLElement`.
      It is passive because a layout cleanup runs while the dialog is still in the page, when the page is still
      inert.
    - Neither effect may call `dialog.current.close()`. Add a one-line comment why: every exit unmounts the
      editor, and a `close` event after Save would cancel.
  - **Markup:** `<dialog ref={dialog} className="modal" aria-labelledby="action-editor-title" onClose={onCancel}>`
    wraps the existing `<form onSubmit={submit}>`, which loses `className="editor"`. Inside the form:
    - **`div.modal-head`:**
      - `<h2 id="action-editor-title">`: `action.label.trim()`, or `t(action.kind === "link" ? "optionsAddLink"
        : "optionsAddDiscover")` when that is empty;
      - `<KindBadge kind={action.kind} />`;
      - `<button type="button" className="icon" aria-label={t("jsonClose")} title={t("jsonClose")}
        onClick={onCancel}>×</button>`.
    - **`div.modal-body`:** every existing field and fieldset, unchanged and in order. Then
      `<Feedback errors={errors} saved={false} />`.
    - **`div.modal-foot`:** `<button type="button" className="link" onClick={onCancel}>{t("optionsCancel")}</button>`
      then `<button type="submit" className="primary">{t("optionsSave")}</button>`. This replaces the old
      `div.row` at the end of the form.
  - **Header comment:** "Form editor for one action, in a modal dialog, with a live preview … (spec §9; spec 005
    FR-016–FR-018)".
- [X] T016 [US2] Rewrite the render of `entrypoints/options/ActionsSection.tsx` (R2, R5). Needs T014 and T015.
  - **Hooks:**
    - Destructure `fail` from `useSubmit` too.
    - Add `cancel = () => { setDraft(null); fail([]); }`.
    - Add an effect with `[]` deps that listens for `hashchange` and calls `cancel`, removing the listener on
      cleanup. `cancel` also clears a failed save's errors, which would otherwise show in the panel without their
      dialog. Comment: "Back or Forward leaves the tab: drop the draft, as Cancel does (spec 005)".
  - **Second line of a row:** add `function template(action: Action): string`:
    - a link action gives `urlTemplate`;
    - a Discover action gives `queryTemplate`, or `t("optionsPreviewEmptyQuery")` when it is empty, plus
      `` ` · ${t("optionsPreviewWindow", String(action.windowMinutes))}` `` when `windowMinutes` is set.
  - **`div.panel-head`:**
    - `<h2 id="actions-title">{t("optionsActions")} <span className="badge">{config.actions.length}</span></h2>`;
    - `div.panel-actions`:
      - `button.primary` "Add link action" (`setDraft(newAction("link"))`);
      - a base `button` "Add Discover action" (`setDraft(newAction("discover"))`).
    - Neither button has `disabled`.
  - **Empty list:** `<p className="empty">{t("optionsEmptyActions")}</p>`.
  - **Otherwise, `ul.items` with one `li.item` per action:**
    - `div.item-main`:
      - `div.item-title`: `span.name`, `<KindBadge>`,
        `{action.showInRow && <span className="badge">{t("optionsShowInRow")}</span>}` and
        `span.muted` with `environmentNames(...)`;
      - `div.item-sub`: `template(action)`;
      - `div.item-warnings`: `<VariableWarnings warnings={variableWarnings(config.environments, action)} />`.
    - `div.item-actions`:
      - `{!action.enabled && <span className="pending">…optionsDisabled…</span>}`;
      - the Edit button, with no `disabled`;
      - the Remove button, which only calls `submit(withoutAction(...))`. The page is inert while a draft is open,
        so the `draft?.id` check goes.
  - **Dialog and feedback:**
    - `{draft && <ActionEditor key={draft.id} … errors={errors} onCancel={cancel} />}`;
    - `<Feedback errors={draft ? [] : errors} saved={saved} />`.
  - **Removed:** the `editing` constant and the "One draft at a time" comment, since the modal is the guard now.
  - **Header comment:** "the list and the editor in a modal dialog".

**Checkpoint**: `KT_STACK=9 npm run e2e -- options` passes 10 tests. On `#actions`, the dialog opens, scrolls,
closes on Escape, ×, Cancel and Save, and focus returns.

---

## Phase 5: User Story 3 - Each tab reads as panels with clear main buttons (Priority: P3)

**Goal**: panel heads with counts, bordered environment rows, the Variables footer Save, and horizontal fields on
Copy and masking and on Export and import.

**Independent Test**: `KT_STACK=9 npm run e2e -- options`, with the selectors changed in T017, passes. The visual
check (T025) matches the design's previews.

### Tests for User Story 3

- [X] T017 [US3] In `tests/e2e/options.spec.ts`, move the remaining selectors (contracts/ui.md, "e2e selector
  migration"):
  - **"adds an environment…":** `environments.locator(".list li .ok")` becomes `.items .ok`.
  - **"exports the settings…" and "exports a corrupt stored value…":** `transfer.locator(".row > button")`
    becomes `transfer.locator(".field-h button")`.
  - **"edits environment variables…":**
    - "Add variable" is `variables.locator(".panel-head button")`;
    - "Save" is `variables.locator(".panel-foot button.primary")`.

    Update the comments next to them.

### Implementation for User Story 3

- [X] T018 [P] [US3] `entrypoints/options/EnvironmentsSection.tsx`, markup only (contracts/ui.md "Panels"):
  - **`div.panel-head`:** `<h2 id="environments-title">{t("optionsEnvironments")} <span
    className="badge">{config.environments.length}</span></h2>`, with no buttons.
  - **`ul.items` with one `li.item` per environment:**
    - `div.item-main`: `div.item-title` holding `span.name`, then `div.item-sub` holding the address (no `<code>`).
    - `div.item-actions`: the access state and Grant button, then Remove, all unchanged.
  - **Unchanged:** the `form.row` and `<Feedback>` below the list.
- [X] T019 [P] [US3] `entrypoints/options/VariablesSection.tsx`, markup only:
  - **`div.panel-head`:**
    - `<h2 id="variables-title">{t("optionsVariables")} <span className="badge">{rows.length}</span></h2>`;
    - when there is at least one environment, `div.panel-actions` with the base "Add variable" button.
  - **No environment:** `<p className="empty">{t("optionsVariablesNoEnvironments")}</p>`.
  - **Otherwise:**
    - the unchanged `div.table-scroll` table;
    - `div.panel-foot` holding `<Feedback errors={errors} saved={saved} />` and then the primary Save button
      (same `onClick`).
  - **Removed:** the old `div.row` and the trailing `<Feedback>`.
- [X] T020 [P] [US3] `entrypoints/options/CopySection.tsx`, markup only (contracts/ui.md "Copy body"). Needs T005.
  - **`div.panel-head`:** `<h2 id="copy-title">{t("optionsCopy")}</h2>`.
  - **`div.fields` with three `div.field-h` rows.** Each row is a left `div`, then `div.field-h-control`:
    1. **Markdown fields:**
       - left: `<label className="field-h-title" htmlFor="markdown-fields">{t("menuCopyMarkdown")}</label>` and
         `<p className="field-h-help" id="markdown-fields-help">{t("optionsMarkdownFieldsHelp")}</p>`;
       - control: the textarea, with `id="markdown-fields" aria-describedby="markdown-fields-help"`.
    2. **Mask patterns:**
       - left: `label.field-h-title htmlFor="mask-patterns"` with `optionsMaskPatternsShort`, and
         `p.field-h-help#mask-patterns-line` with `optionsMaskPatternsLine`;
       - control: the textarea, with `id="mask-patterns" aria-describedby="mask-patterns-line mask-patterns-help"`,
         then `<p className="field-h-help" id="mask-patterns-help">{t("optionsMaskPatternsHelp")}</p>`
         (spec 004 FR-002).
    3. **Value masks:**
       - left: `<span className="field-h-title" id="value-masks">{t("optionsValueMasks")}</span>` and
         `p.field-h-help` with `optionsValueMasksHelp`;
       - control: `div.field-h-control.checks role="group" aria-labelledby="value-masks"` holding the four
         unchanged `label.inline` checkboxes.
       - The `fieldset`, `legend` and the help paragraph inside the fieldset go.
  - **`div.panel-foot`:** `<Feedback …/>` then the primary Save (same `onClick`).
  - Textarea `rows` and `spellCheck` stay as they are.
- [X] T021 [P] [US3] `entrypoints/options/TransferSection.tsx`, markup only (contracts/ui.md "Transfer body"):
  - **`div.panel-head`:** `<h2 id="transfer-title">{t("optionsTransfer")}</h2>`.
  - **`div.fields` with two `div.field-h` rows:**
    1. **Export:**
       - left: `<span className="field-h-title">{t("optionsExport")}</span>` and `p.field-h-help` with
         `optionsExportHelp`;
       - control: the Export button.
    2. **Import:**
       - left: `<label className="field-h-title" htmlFor="import-file">{t("optionsImport")}</label>` and
         `p.field-h-help` with `optionsImportHelp`;
       - control: `<input id="import-file" type="file" accept="application/json,.json" onChange={choose} />`,
         then the unchanged `pending` warning block, then `<Feedback …/>`.
  - **Removed:** the old `div.row`, the wrapping `label` and the trailing `<Feedback>`.
- [X] T022 [US3] Remove `optionsMarkdownFields` and `optionsMaskPatterns` from both
  `public/_locales/en/messages.json` and `public/_locales/tr/messages.json`. Needs T020.
  - `grep -rn 'optionsMarkdownFields"\|optionsMaskPatterns"' entrypoints src tests` prints nothing.
  - `npm run typecheck` is clean.

**Checkpoint**: `KT_STACK=9 npm run e2e -- options` passes 10 tests. Every tab uses the panel layout.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T023 In `entrypoints/options/options.css`, remove the `.list` and `.editor` rules.
  - `grep -rn 'className="list"\|"editor"' entrypoints` prints nothing.
  - Run the token check from quickstart.md. Every `var(--kt-…)` name is a `LIGHT` key or
    `font-sans`/`font-mono`.
- [X] T024 Gates (quickstart.md "Gates"):
  - `npm run typecheck`;
  - `npx vitest run`: 571 tests;
  - `npm run build && npm run check:manifest`;
  - `KT_STACK=9 npm run e2e -- options`: 10 tests;
  - the whole `KT_STACK=9 npm run e2e`, since the theme tokens also reach the bar's shadow root.

  Report any failure with its output, and never loosen an existing assertion to make it pass.
- [X] T025 The visual check (quickstart.md, research R8). Write a Playwright script in the session scratchpad,
  not in the repo:
  - **Launch:** Chromium with `.output/chrome-mv3`, launched as `tests/e2e/fixtures.ts` does, at 1000×800.
  - **Settings:** store `examples/kibanatool-settings.json` through the service worker, then mark one action
    `showInRow`.
  - **Screenshots:** in `colorScheme` `"light"` and `"dark"`, each of the five tabs, plus `#actions` with an
    Edit dialog open. Add one 700px-wide `#copy`.

  Open every PNG and check the quickstart's "Look for" list. Fix what fails in `options.css` or the markup, then
  rerun T024. The Turkish UI comes from macOS (`tr-TR`).
- [X] T026 [P] Write `docs/verification/2026-10-tabbed-options.md` in Turkish, in the layout of
  `docs/verification/2026-10-row-actions.md`:
  - date, branch, HEAD and tool versions;
  - the T024 results;
  - the T025 visual check (what was looked at, at what width and in which themes, and what was fixed);
  - M1–M4 from quickstart.md, marked "Açık (kullanıcı)".
- [X] T027 [P] Update `CLAUDE.md`:
  - **Docs:** add `005 (\`specs/005-tabbed-options/\`: the options page in five tabs, the action editor in a
    dialog)` to the spec-kit features.
  - **Traps:** add one entry. The options page keeps every tab's section mounted, hidden with `hidden`, so unsaved
    edits survive a tab switch. No element id may equal a tab id (the browser would scroll to it under the
    sticky bar). The action dialog is styled only as `dialog.modal[open]`, every exit unmounts it, and its draft
    is dropped on `hashchange`.
- [X] T028 [P] In `CHANGELOG.md`, above `## [1.0.0] - 2026-10-20`, add `## [Unreleased]` with
  `### Changed`:
  - "The options page is split into five tabs (Environments, Variables, Actions, Copy and masking, Export and
    import), each with its own address."
  - "The action editor opens in a dialog, and the action list shows which actions appear on result rows."
- [X] T029 Commit everything in one commit: the code, the tests, the docs, and this file with its checkboxes
  up to date. Message: `feat(options): split the options page into tabs; spec-kit feature 005`.
- [X] T030 Ask the user whether to push and open the PR. Do not push without a yes. On yes:
  - **Push** with `GH_TOKEN=$(gh auth token --user cllakyz) git -c credential.helper='!gh auth git-credential'
    push -u origin 005-tabbed-options`.
  - **Open** the PR with `GH_TOKEN=$(gh auth token --user cllakyz) gh pr create`.
    - Title: "Split the options page into tabs".
    - The body covers:
      - the five tabs and their addresses;
      - the dialog;
      - the "Show in row" badge;
      - the kept unsaved edits;
      - the seven tokens;
      - the strings;
      - the test counts;
      - the visual check.
    - The body ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

  After the user says it is merged, pull `main`. Delete the branch only if the user asks.
- [X] T031 After the merge, mark the feature implemented:
  - spec status "Implemented (PR #N, merged <date>)", with every task checked.

  Ask the user whether this goes directly to `main` (as 004's T014 did) or into the branch before the merge.

---

## Dependencies & Execution Order

- **Setup (T001–T002)** comes first.
- **Foundational (T003–T007)** runs before every story. Its five tasks touch different files and can run
  together.
- **US1 (T008–T011):**
  - T008 and T009 share `options.spec.ts`, so they run in order.
  - T010 needs T005.
  - T011 can run beside T010.
- **US2 (T012–T016)** needs US1, because its tests open `#actions` through the tabs.
  - T012 and T013 come after T009, in the same file.
  - T014 runs first among the implementation tasks; T015 needs T014, and T016 needs T014 and T015.
- **US3 (T017–T022)** needs US1 (tabs). It doesn't need US2.
  - T017 follows T013 in the same file.
  - T018–T021 touch four different files and can run together.
  - T022 needs T020.
- **Polish (T023–T031)** runs after the stories.
  - T023 needs T016 and T018, the last users of `.editor` and `.list`.
  - T026–T028 can run together.
  - T029 commits; T030 waits for the user's yes; T031 waits for the merge.

## Parallel Opportunities

```text
Phase 2 together:  T003 (theme.ts)  T004 (theme.test.ts)  T005 (en)  T006 (tr)  T007 (options.css)
US1:               T010 (App.tsx)  ∥  T011 (Variables/Actions help lines)
US2:               T014 (feedback.tsx)  ∥  T012→T013 (options.spec.ts)
US3 together:      T018 (Environments)  T019 (Variables)  T020 (Copy)  T021 (Transfer)
Polish together:   T026 (verification)  T027 (CLAUDE.md)  T028 (CHANGELOG)
```

## Implementation Strategy

- **MVP = US1.** After T001–T011, the page is tabbed and every existing flow still works. Stop there and check
  the US1 checkpoint.
- **Increment 2 = US2.** The dialog and the badges. It changes only the Actions tab.
- **Increment 3 = US3.** The panel layout of the other four tabs.
- **Then** Polish: the gates, the visual check in light and dark at 1000px in Turkish, docs, and one commit on the
  branch. Push and the PR only after the user's yes.
