# Research: Tabbed Options Page

The design source is the "kibanatool options" design system
(https://claude.ai/artifact/3tM377bw1BM4dB5Nq3dFop): `project/README.md`, `project/components/bundle.css`, the five
`*Tab` previews, `ActionModal` and `NavTabs`. It was read on 2026-10-20. The decisions below say where the code
follows it and where it departs, and why.

## R1. Tab state and the address

- **Decision**:
  - `App.tsx` holds the five tabs in one list: id, title key and intro key (`optionsIntro`,
    `optionsVariablesHelp`, `optionsActionsHelp`, none for `copy` and `transfer`).
  - The open tab is read from `location.hash`. An empty hash or one that names no tab gives `environments`.
  - A `hashchange` listener updates it.
  - An unknown hash is not rewritten, because rewriting it would add a history entry.
  - All five sections stay mounted. Each sits in a wrapper with `hidden` unless its tab is open (spec FR-004:
    unsaved edits survive a tab switch).
  - The `h1` (the open tab's title) and the intro callout are rendered once, by `App`, above the wrappers. The load
    error warning sits between them and the sections, so it shows on every tab.
- **Rationale**:
  - Keeping the sections mounted is how the page behaves today: all five are mounted, and edits survive scrolling.
    It costs no more code than mounting only the open one.
  - Each section keeps its own state and `{config, onSave}` props unchanged.
  - Principle V: `entrypoints/` may read `location` and `window` events.
- **Constraint**: no element id may equal a tab id (`environments`, `variables`, `actions`, `copy`, `transfer`).
  Otherwise the browser scrolls to that element on every tab click and hides it under the sticky bar. The existing
  `*-title` ids stay.
- **Alternatives considered**:
  - Mount only the open section. Unsaved edits would be lost on a tab switch (rejected by the user, 2026-10-20).
  - A router library. Five hash links don't need one.
  - Tabs as buttons with `role="tablist"`. The design uses links with `aria-current="page"`, so each tab has an
    address, and reload and Back work with no code.

## R2. The action editor as a modal dialog

- **Decision**:
  - `ActionEditor` renders the whole dialog: `<dialog className="modal">` holding one `<form>` with a header
    (`.modal-head`), a body (`.modal-body`) and a footer (`.modal-foot`).
    - Header: the label (or `optionsAddLink`/`optionsAddDiscover` while the label is empty), the kind badge, and a
      × close button (`button.icon`, `aria-label` and `title` from `jsonClose`).
    - Footer: Cancel (`button.link`) and Save (`button.primary`, `type="submit"`).
  - `showModal()` runs in a `useLayoutEffect` when the editor mounts, so the dialog is never painted unopened.
  - **One close path: state, then unmount.** Escape fires the dialog's `close` event, and `onClose` calls
    `onCancel`. ×, Cancel and a successful Save also clear the draft in `ActionsSection`, which unmounts the
    editor.
    - The layout effect's cleanup focuses the element that was active when `showModal()` ran, which is the opener.
    - The cleanup does **not** call `dialog.close()`. Removing a dialog from the document takes it out of the top
      layer without a `close` event. A `close` event there would run `onCancel` after a successful Save and clear
      the saved notice.
  - The `disabled={editing}` guard on Edit and the two Add buttons is removed:
    - the modal makes the rest of the page inert, so only one draft can exist;
    - a disabled opener cannot take focus back (spec FR-017).
  - **Save errors** (FR-018):
    - `ActionsSection` passes `useSubmit`'s errors to the editor, which shows them with `Feedback` at the end of
      the dialog body.
    - While a draft is open, the section's own `Feedback` shows no errors.
    - Cancel clears stale errors (`fail([])`), so they don't appear in the panel after the dialog closes.
  - **Back or Forward while the dialog is open**: `ActionsSection` listens for `hashchange` and clears the draft.
    - The Actions wrapper becomes `hidden`. Whether Chrome still shows a modal inside a `display: none` ancestor
      was not tested, and the listener makes the question moot.
    - Without it, the page could stay inert behind a dialog nobody can see.
  - CSS sets `display: flex` only on `dialog.modal[open]`. A bare `.modal { display: flex }` overrides the UA's
    `dialog:not([open]) { display: none }`.
- **Rationale**: a native modal dialog gives focus trapping, Escape and an inert page with no extra code (design
  README, Accessibility notes). One close path avoids a double `onCancel` and keeps focus restoration explicit.
  The browser restores focus natively only on `close()`.
- **Alternatives considered**:
  - Calling `dialog.close()` on every exit and relying on the native focus restoration. This needs a second
    state path for the `close` event that a successful Save also triggers.
  - A side flyout (rejected by the user).
  - Asking before discarding changes (out of scope; Cancel doesn't ask today).
- **Note**: `::backdrop` takes `var(--kt-overlay)` from the dialog, because Chrome 122+ inherits custom properties
  into `::backdrop`. In an older Chrome the backdrop is simply not dimmed, and the dialog still works.

## R3. Tokens and CSS

- **Decision**:
  - `src/theme.ts` gains the seven proposed tokens in both `LIGHT` and `DARK`:
    - `overlay` and `shadow-modal` differ between the themes;
    - `height-navbar` (48px), `width-content` (1120px), `width-label` (240px), `width-modal` (760px) and `z-nav`
      (10) are the same in both.
    - `cssVars` emits them as `--kt-<name>` with no change.
  - `entrypoints/options/options.css` is rewritten from `bundle.css`:
    - **colors, fonts and the seven new tokens** become `var(--kt-<name>)`;
    - **spacing, radii, `radius-pill`, `height-control` and `width-variable-input`** stay literal px, as in
      today's `options.css`, because `theme.ts` has no such properties and the user's scope adds only the seven;
    - the `.options` scope is dropped, since the stylesheet belongs to the options page only;
    - `[data-theme]` rules are dropped, since the page follows `prefers-color-scheme` through `cssVars`;
    - `.list` and `.editor` are removed, because nothing uses them any more;
    - `main` gets `max-width: var(--kt-width-content)`.
  - `.field-h` rows sit in a wrapper (`.fields`), and the first and last row are found with `:first-child` and
    `:last-child`. The design's `:first-of-type`/`:last-of-type` would also count the panel head and foot `div`s.
  - **Check (task-level):** every `var(--kt-…)` name in `options.css` is a key of `LIGHT` or a font property.
- **Rationale**: one source for colors and the new tokens; no CSS custom property that resolves to nothing.
- **Theme test**: `tests/unit/theme.test.ts` gains three pairs:
  - `["text-primary", "surface", 4.5]`, the open tab's label (its 3:1 focus-ring entry stays);
  - `["text", "discover", 4.5]`, the intro callout text;
  - `["primary", "surface", 3]`, the open tab's underline, a state mark.
  - The design claims 7.3:1/6.6:1, 11.7:1/8.8:1 and 5.4:1/6.6:1. The test confirms them.

## R4. Navbar: brand, mark and version

- **Decision**:
  - The navbar is a `header.nav` holding:
    - `a.nav-brand` (`href="#environments"`): the mark and the plain text "kibanatool";
    - `nav.nav-tabs` with `aria-label={t("optionsNavLabel")}` and five `a.tab`;
    - `span.nav-version`: "v" + `browser.runtime.getManifest().version`.
  - The mark is a `<picture>`:
    - a `<source media="(prefers-color-scheme: dark)">` takes the 48px path from `iconPaths(true)`;
    - the `<img>` takes the 48px path from `iconPaths(false)`, at 24×24 with `alt=""`.
  - `iconPaths` comes from `src/toolbar-icon.ts`, the same map the toolbar icon uses (Principle II).
- **Rationale**:
  - The 48px PNG stays sharp at 24 CSS px on a 2× screen.
  - `<picture>` follows the scheme with no script, like the page's palette.
- **Alternatives considered**: the SVGs in `assets/`, which are not in the built extension; and a script that
  watches `matchMedia`, which `<picture>` makes unnecessary.

## R5. Sections

- **Environments**:
  - `.panel-head` holds the `h2` and a `badge` with the count. There is no button in the head.
  - The list is `ul.items` of `li.item` rows:
    - `.item-main`: `.item-title` (`span.name`) and `.item-sub` (the address);
    - `.item-actions`: access state, Grant access and Remove.
  - The add form stays below the list, with its primary button.
  - No empty state: the add form is right there (spec Assumptions).
- **Variables**:
  - `.panel-head` holds the `h2`, a count of the table's rows, and Add variable (base style) when there is at
    least one environment.
  - `.panel-foot` holds `Feedback` and Save (primary).
  - With no environments, the panel shows `p.empty` with `optionsVariablesNoEnvironments`.
  - The help sentence moves to the tab intro.
- **Actions**:
  - `.panel-head` holds the `h2`, the count, Add link action (primary) and Add Discover action (base).
  - Each `li.item` row holds:
    - `.item-title`: `span.name`, the kind badge, the "Show in row" badge when `showInRow`, and the scope text
      (`span.muted`);
    - `.item-sub`: the URL template, or for a Discover action the query (or `optionsPreviewEmptyQuery`) and
      `· optionsPreviewWindow` when it has a window;
    - the variable warnings;
    - `.item-actions`: Disabled (`.pending`, when off), Edit and Remove.
  - An empty list shows `p.empty` with `optionsEmptyActions`.
  - The help sentence moves to the tab intro.
  - The kind badge is one shared `KindBadge` in `feedback.tsx`, used by the row and the dialog header.
- **Copy and masking**: the `h2` stays in a `.panel-head` (the user's scope: every section's `h2` moves into a
  panel head). The Copy and Transfer previews drop it; the scope takes precedence, and `aria-labelledby` keeps the
  e2e locators working. Then `.fields` holds three `.field-h` rows:
  1. "Copy as Markdown" (`menuCopyMarkdown`) with `optionsMarkdownFieldsHelp`, and the textarea.
  2. "Masked fields" (`optionsMaskPatternsShort`) with `optionsMaskPatternsLine`.
     - The textarea is described by both the short line and the long note (`aria-describedby="mask-patterns-line
       mask-patterns-help"`).
     - The 004 note stays under the textarea as `p.field-h-help#mask-patterns-help` (spec 004 FR-002).
  3. "Mask inside values" (`span.field-h-title#value-masks`) with `optionsValueMasksHelp`, and a `.checks` group
     (`role="group"`, `aria-labelledby="value-masks"`) of the four checkboxes. The `fieldset` goes.
  - `.panel-foot` holds `Feedback` and Save.
- **Export and import**: a `.panel-head` with the `h2`, then `.fields` with two rows.
  - Export: a `span` title (`optionsExport`), `optionsExportHelp`, and the button.
  - Import: a `label` title (`optionsImport`, `htmlFor` the file input), `optionsImportHelp`, then the file input,
    the import preview (`.warning`, unchanged) and `Feedback`.
- **Rationale**: the design's classes, with the save logic and the `{config, onSave}` props unchanged (FR-019).

## R6. Strings

- **Decision**: the exact text is in [contracts/strings.md](contracts/strings.md).
  - Seven new keys in en and tr.
  - Two keys removed (`optionsMarkdownFields`, `optionsMaskPatterns`), because their text is now split into a title
    and a help line. `tests/unit/i18n.test.ts` only checks that en and tr have the same keys, so removing them from
    both is safe.
  - The design's `optionsExportHelp` says "…actions and masking". The file also holds the Markdown field list, so
    the text says "…actions, and copy and masking settings".
  - The intros are plain text. The design draws `{field}` as `code` chips, which would mean parsing the
    translated sentence.
- **Turkish voice**: "siz", like `optionsVariablesNoEnvironments` and the 004 note.

## R7. Tests

- **Unit**: the three theme pairs (R3). `i18n.test.ts` covers the locale parity.
- **e2e** (`tests/e2e/options.spec.ts`, G4):
  - `openOptions(context, id, tab = "environments")` goes to `options.html#<tab>`.
  - Each of the eight existing tests opens its tab, and their selectors move as listed in
    [contracts/ui.md](contracts/ui.md#e2e-selector-migration).
  - Two new tests:
    - **Tabs:** no hash opens Environments; a tab click updates the address, `aria-current` and the `h1`; reload
      and Back keep the tab; `#foo` falls back; an edit in the mask patterns survives a switch to Variables and
      back; the version is shown.
    - **Dialog:** with `markInRow`, only the marked action's row has two badges. Edit opens `dialog.modal[open]`;
      Escape closes it and the Edit button is focused. Add link action, Back to the previous tab: no dialog stays
      open, and the Environments form takes input.
  - `toHaveCount` counts hidden elements too, so the cross-tab assertion (the variables save clears the actions'
    `.var-warning`) needs no tab switch back.

## R8. Visual check (the user's done-when)

- **Decision**: a scratchpad Playwright script, not committed.
  - It launches Chromium with the built extension, as `tests/e2e/fixtures.ts` does, at a 1000×800 viewport.
  - It stores `examples/kibanatool-settings.json` through the service worker and takes a screenshot of each tab
    in `colorScheme: "light"` and `"dark"`, with the action dialog open once.
  - The Turkish interface comes from the OS: macOS is set to `tr-TR` here, and Chromium on macOS takes its UI
    language from it. `--lang` is ignored on macOS. An English pass, if wanted, uses the Cocoa argument
    `-AppleLanguages (en-US)`.
- **Rationale**: the same Chromium build the e2e suite uses, with no change to the user's own Chrome.

## R9. Docs and release

- **CLAUDE.md**:
  - "Docs" adds feature 005.
  - "Traps" gains one entry: the sections stay mounted and hidden; no id may equal a tab id; the dialog opens only
    as `dialog.modal[open]`, and its draft closes on `hashchange`.
- **docs/verification/2026-10-tabbed-options.md**: the manual checks, in the pattern of
  `2026-10-row-actions.md`.
- **CHANGELOG.md**: a new `## [Unreleased]` section with a "Changed" line.
  - 1.0.0 stays as dated, and its tag still goes on `d5d3281` after the store accepts it.
  - The version bump to 1.1.0 is a release decision for later.
- **Store listing**: its screenshots don't show the options page, so nothing needs retaking.
- **The design system artifact**: after merge, its "Proposed" tokens are real. Updating its "Not synced" note is a
  follow-up to offer, not part of this feature.
