# Feature Specification: Tabbed Options Page

**Feature Branch**: `005-tabbed-options`, one pull request (user decision, 2026-10-20).

**Created**: 2026-10-20

**Status**: Implemented (PR #15, merged 2026-10-20)

**Input**: User description (summarized): the options page is one long column today. Environments, variables,
actions, copy and masking, and export and import are stacked under one heading. Split it into tabs, in the style of
the graytool extension's options page: a top navbar of tabs, a page title, an intro box, panels with the main
button in the header, and settings forms with the label on the left. The colors don't have to match graytool's.
The agreed design is the claude.ai Design System "kibanatool options"
(https://claude.ai/artifact/3tM377bw1BM4dB5Nq3dFop). It keeps kibanatool's Borealis palette, light and dark, and
marks its new tokens "Proposed". Its "Implementing it" section is the plan's starting point.

## Clarifications

### Session 2026-10-20

- Decided before this spec (user): the action editor opens as a **modal dialog**, not a side flyout.
- Decided before this spec (user): an action's row shows a **"Show in row" badge** when the action also appears on
  result rows.
- Decided before this spec (user): the colors don't have to match graytool's. The page keeps kibanatool's palette.
- Q: When the user switches tabs with unsaved edits in the Variables table or the Copy and masking fields, are the
  edits kept or discarded? → A: Kept. A hidden tab keeps its unsaved edits, as a section scrolled out of view does
  today; only a reload discards them.
- Q: How is the feature delivered? → A: On the branch `005-tabbed-options`, with one pull request so the CI matrix
  runs before it reaches main. Push and the pull request only after the user says so.

## User Scenarios & Testing *(mandatory)*

The users are developers and support staff who set kibanatool up once and come back to add an environment, an
action or a mask pattern. They open the options page from the extension's menu, in English or Turkish, in a light
or dark browser theme.

### User Story 1 - Each section is its own tab (Priority: P1)

A user opens the options page to change one action. Instead of scrolling past environments and variables, they see
a bar at the top with five tabs: Environments, Variables, Actions, Copy and masking, and Export and import. They
click Actions. The page now shows only the actions, under the title "Actions" and a short intro on placeholders.
The address bar ends in `#actions`, so a reload or a bookmark opens the same tab, and Back returns to the tab
before.

**Why this priority**: it is what the user asked for: one long page doesn't look good and is hard to scan. The other
stories refine what each tab looks like.

**Independent Test**: open the options page, click each tab in turn, reload on one of them and use Back. Each time
exactly one section is visible, the title names it, and the open tab is marked in the bar.

**Acceptance Scenarios**:

1. **Given** the options page opened with no tab in the address, **When** it loads, **Then** the Environments tab
   is open, its name is the page title, and the bar marks it as the current tab.
2. **Given** any tab is open, **When** the user clicks another tab, **Then** only that tab's section is visible,
   the page title changes to its name, the address ends in that tab's id, and the bar marks it.
3. **Given** the Variables tab is open, **When** the user reloads the page, **Then** the Variables tab is still open;
   **and When** they go Back after opening Actions, **Then** Variables is open again.
4. **Given** the address names no known tab (for example `#foo`), **When** the page loads, **Then** the
   Environments tab is open.
5. **Given** the stored settings could not be read, **When** the user opens any tab, **Then** the warning about the
   invalid settings is shown above that tab's content.
6. **Given** the Environments, Variables or Actions tab, **When** it opens, **Then** an intro box under the title
   holds that tab's existing help sentence. The Copy and masking and the Export and import tabs have no intro box.
7. **Given** the Turkish interface in a window about 1000px wide, **When** the page loads, **Then** all five tab
   names are visible in the bar without scrolling it; **and Given** a narrower window, **Then** the tabs scroll
   sideways and never wrap onto a second line.
8. **Given** a keyboard user, **When** they press Tab from the top of the page, **Then** they reach the brand, each
   tab and then the open tab's content, each with a visible focus ring, and a screen reader announces the open tab
   as the current page.

---

### User Story 2 - Actions are edited in a dialog, and the list shows which appear in rows (Priority: P2)

A user wants to change an action's URL template. On the Actions tab, each action is one row: its label, a badge for
its kind (Link or Discover), a "Show in row" badge when it also appears on result rows, the environments it applies
to, and its template on a second line. They click Edit. A dialog opens over the page with the action's label and
kind in its header, the editor's fields in its body and Cancel and Save in its footer. Pressing Escape, clicking ×
or clicking Cancel closes it without saving. Save stores the action, closes the dialog and shows the usual saved
notice. In each case focus returns to the Edit button.

**Why this priority**: the editor is the longest form on the page. Inline, it pushes the list down and hides which
action is being edited. The "Show in row" badge answers a question that today requires opening every action.

**Independent Test**: on the Actions tab, add a link action and a Discover action through the dialog, edit one,
cancel an edit with Escape, and check the rows' badges against each action's "Show in row" setting.

**Acceptance Scenarios**:

1. **Given** actions with and without "Show in row", **When** the user opens the Actions tab, **Then** every row
   shows the kind badge, and only the rows of actions with "Show in row" also show the "Show in row" badge.
2. **Given** a link action, **When** its row is shown, **Then** its second line is the URL template; **and Given**
   a Discover action, **Then** its second line is its query (or a note that the query is empty) and its time window
   when it has one.
3. **Given** an action that needs a variable an environment lacks, **When** its row is shown, **Then** the row
   still warns about the missing or invalid variable, as it does today.
4. **Given** the Actions tab, **When** the user clicks Edit, Add link action or Add Discover action, **Then** a
   dialog opens with the action's label (or, while the label is empty, the add button's text) and kind badge in its
   header, and the rest of the page cannot be clicked or tabbed into until it closes.
5. **Given** the dialog is open with changes, **When** the user presses Escape, clicks × or clicks Cancel, **Then**
   the dialog closes, nothing is saved, and focus returns to the button that opened it. The next Edit or Add opens
   normally.
6. **Given** the dialog is open, **When** the user clicks Save and the action is valid, **Then** the action is
   stored, the dialog closes, focus returns to the opener, and the saved notice appears on the Actions tab.
7. **Given** the dialog is open, **When** the user clicks Save and the action is not valid, **Then** the dialog
   stays open and shows the reasons inside it, where the user can read them.
8. **Given** the dialog's body is longer than the window, **When** the user scrolls it, **Then** the header and the
   footer with Cancel and Save stay in view.

---

### User Story 3 - Each tab reads as panels with clear main buttons (Priority: P3)

A user adds an environment and then sets the masking. On each tab the sections are panels. A panel's header holds
its title, a count when it lists things (3 environments, 4 actions, 2 variables) and its add button. Lists are
bordered rows with the name first, its details on a second line and the row's buttons and status on the right. On
Copy and masking and on Export and import, each setting is one row with its title and help on the left and the
control on the right, and one Save at the bottom of the panel saves the whole form.

**Why this priority**: it is the graytool look the user asked for, but each tab already works without it.

**Independent Test**: open each tab in light and dark themes and check the panel header, the count, the rows or
horizontal fields, and the footer Save against the design system's previews.

**Acceptance Scenarios**:

1. **Given** 3 environments, **When** the Environments tab opens, **Then** the panel header reads "Environments"
   with a count of 3, each environment is a row with its name, its address on a second line, its access state and
   its buttons, and the add form stays at the bottom of the panel with "Add and grant access" as its main button.
2. **Given** the Variables tab with at least one environment, **When** it opens, **Then** Add variable is in the
   panel header and Save is in the panel footer; **and Given** no environments, **Then** the panel shows one line
   saying to add an environment first.
3. **Given** no actions, **When** the Actions tab opens, **Then** the panel shows one line saying that there are no
   actions yet and that a link or Discover action can be added.
4. **Given** the Copy and masking tab, **When** it opens, **Then** "Copy as Markdown", "Masked fields" and "Mask
   inside values" are each one row with a title and short help on the left and the control on the right, the long
   note on how far a mask reaches stays under the mask patterns field and is still announced with it, and one Save
   in the panel footer saves all three.
5. **Given** the Export and import tab, **When** it opens, **Then** export and import are each one row with a title
   and help on the left (export: what the file holds; import: that it replaces all settings), and picking a file
   still shows the preview with Replace settings and Cancel, or the reasons the file was rejected.
6. **Given** a window narrower than 720px, **When** a tab with horizontal fields opens, **Then** each field stacks
   into one column.
7. **Given** a panel, **When** it is shown, **Then** it has at most one main (filled) button.

---

### Edge Cases

- **Unsaved edits on a tab switch.** The Variables table and the Copy and masking fields hold edits until Save.
  Switching tabs keeps them, and they are there when the user comes back. A reload discards them, as today.
- **Back or Forward while the action dialog is open** leaves the Actions tab. The dialog closes the way Cancel does,
  and the page never stays blocked behind a dialog that is no longer shown.
- **Escape is Cancel.** Closing the dialog by any route other than Save drops the draft, as Cancel does today, and
  the next Edit or Add starts clean.
- **Removing the action being edited** cannot happen: the page behind the dialog is blocked while it is open.
- **An import replaces the settings** while the user is on Export and import. The other tabs show the imported
  settings when opened.
- **A long environment address or template** wraps inside its row and never widens the page.
- **The variables table with many environments** scrolls sideways inside its panel, as today.
- **The brand link** opens the Environments tab.
- **The saved notice** of one tab is not shown on another tab.

## Requirements *(mandatory)*

### Functional Requirements

**Navigation**

- **FR-001**: The options page MUST show a bar at the top that stays in view while the page scrolls. It holds the
  extension's mark and the name "kibanatool" on the left, the five tabs in this order: Environments, Variables,
  Actions, Copy and masking, Export and import, and the extension's version on the right.
- **FR-002**: Each tab MUST be a link to its own address: `#environments`, `#variables`, `#actions`, `#copy` and
  `#transfer`. Only the open tab's section is visible. The open tab is the one the address names. With no address,
  or one that names no tab, it is Environments.
- **FR-003**: The page MUST follow address changes made by a click, by Back or Forward, by a reload or by a
  bookmark.
- **FR-004**: Switching tabs MUST keep each tab's unsaved edits (the Variables table, the Copy and masking fields)
  until the user saves, cancels or reloads.
- **FR-005**: The open tab MUST be marked in the bar by more than color (an underline), announced to assistive
  technology as the current page, and named again by the page's main title. The bar MUST have an accessible name.
- **FR-006**: The tabs MUST stay on one line. When they don't fit the window, they scroll sideways. In Turkish, at a
  window about 1000px wide, all five MUST fit without scrolling.
- **FR-007**: The mark MUST follow the browser's light or dark color scheme, like the toolbar icon.
- **FR-008**: The warning shown when the stored settings are invalid MUST appear above the content of every tab.

**Page and panels**

- **FR-009**: The Environments, Variables and Actions tabs MUST open with an intro box holding their existing help
  sentence. The Copy and masking and Export and import tabs have none.
- **FR-010**: Each section MUST be a panel whose header holds its title, a count when it lists things, and the
  section's add buttons. A panel has at most one main button.
- **FR-011**: Environments and actions MUST be listed as bordered rows: the name with its badges and scope first, a
  second line with the address or the template, and the status and buttons on the right. An empty list MUST show
  one line saying what to add.
- **FR-012**: The Copy and masking and Export and import settings MUST be laid out as rows with the title and help on
  the left and the control on the right, and stack into one column below 720px.
- **FR-013**: A section whose one Save covers the whole form (Variables, Copy and masking) MUST have that Save in a
  footer at the bottom of the panel, with the saved notice next to it.
- **FR-014**: The mask patterns field MUST keep its note on how far a mask reaches, announced with the field
  (spec 004 FR-002).

**Actions**

- **FR-015**: Each action's row MUST show its kind badge and, when the action is shown in result rows, a "Show in
  row" badge. It MUST keep its "Disabled" state and its variable warnings.
- **FR-016**: Edit, Add link action and Add Discover action MUST open the action editor in a modal dialog. While it
  is open, the rest of the page cannot be used. Its header shows the action's label (or the add button's text while
  the label is empty), its kind badge and a close button named "Close". Its body holds the editor's existing fields
  and scrolls. Its footer holds Cancel and Save.
- **FR-017**: The dialog MUST close without saving on Escape, on the close button and on Cancel, and close after a
  successful Save. Whenever it closes, focus MUST return to the button that opened it.
- **FR-018**: A failed Save MUST keep the dialog open and show the reasons inside it.

**Unchanged behavior**

- **FR-019**: What each section saves, how it validates, and the stored settings format MUST NOT change. Every flow
  that works on the options page today MUST still work: adding and removing an environment and granting access,
  editing variables, adding, editing and removing actions, saving the copy settings, exporting, and importing with
  its preview.
- **FR-020**: Every new UI text MUST exist in English and Turkish, and the Turkish names MUST fit FR-006. Existing
  texts are reused where the design names them: the three tab intros, "Copy as Markdown", "Show in row", "Close",
  and "Add an environment first.".
- **FR-021**: Both themes MUST keep every text at a contrast of at least 4.5:1, including the new pairs: the open
  tab's label on the bar, and the intro box's text on its background.
- **FR-022**: The automated browser tests of the options page MUST cover the tabs and the dialog, and the existing
  ones MUST be adapted to reach their sections through the tabs.

### Key Entities

- **Tab**: one section of the options page. It has an id that appears in the address, a name that is also the
  page title, and, for three of the five, an intro sentence.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From the options page, a user reaches any of the five sections in one click, and a reload or Back
  keeps them on the same section in 100% of tries.
- **SC-002**: In Turkish, at a window 1000px wide, all five tab names are fully visible in the bar.
- **SC-003**: Every flow listed in FR-019 still completes, and the full browser test matrix (Kibana 7, 8 and 9)
  passes.
- **SC-004**: Stored settings are byte-for-byte the same as before for the same edits, and an exported file from
  before the change imports unchanged.
- **SC-005**: Every text pair on the page measures at least 4.5:1 in both light and dark themes.
- **SC-006**: A keyboard-only user can open, fill, save and cancel the action dialog, and after each close focus is
  on the button that opened it.
- **SC-007**: On the Actions tab, a user can tell which actions appear on result rows without opening any of them.

## Assumptions

- **Design source:** the "kibanatool options" design system is the reference for layout, spacing, the new tokens
  and the new texts. Its static previews use a theme switch that the page doesn't have; the page follows the
  browser's color scheme as it does today.
- **Release:** 1.0.0 is dated and packaged and waits for the store review; its tag goes on the commit before this
  feature. This feature ships in a later version (likely 1.1.0) and gets a CHANGELOG entry then. Store screenshots
  of the options page, if any, need retaking after it ships.
  **Changed 2026-10-20 (user decision):** it ships in 1.0.0 after all; the `[Unreleased]` entries were folded into the 1.0.0 entry, and the `v1.0.0` tag goes on that release commit once the store accepts the package.
- **Environments empty state:** the design shows none, because the add form sits right under the list. An empty
  environment list shows no extra line.
- **The dialog and the "one draft at a time" rule:** with a modal dialog only one action can be edited at a time;
  whether the add and edit buttons are still disabled behind it is a planning choice.
- **Text:** the old long labels for the Markdown fields and the mask patterns split into a short title and a help
  line. Whether the old texts are then removed is a planning choice.

## Out of Scope

- The action bar inside Kibana, the row buttons, the JSON and text views, and the copies.
- What any section saves, its validation and the settings format.
- Matching graytool's colors, a side flyout for the editor (decided: a dialog), and a theme switch on the page.
- Asking before discarding unsaved changes in the action dialog (Cancel today doesn't ask either).
