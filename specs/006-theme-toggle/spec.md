# Feature Specification: Theme Switch on the Options Page

**Feature Branch**: `006-theme-toggle`

**Created**: 2026-10-20

**Status**: Implemented (PR #16, merged 2026-10-20)

**Input**: User description: "Açık/Koyu tema değişikliği için uygun olan yere güzel bir toggle buton koyalım. Aklına
bir şey takılırsa mutlaka bana sor." (Put a nice toggle button for switching between light and dark in a suitable
place, and ask about anything unclear.) Today the options page always follows the system's light or dark mode, and
spec 005 left a theme switch out of scope. This feature adds one.

## Clarifications

### Session 2026-10-20

- Q: What does the theme choice affect? → A: Only the options page. The action bar, the row buttons and the views
  inside Kibana keep matching Kibana's own background, and the toolbar icon keeps following the browser.
- Q: How many states does the switch have? → A: Three: System, Light and Dark, as a small segmented control.
  System is the default and is today's behavior.
- Q: Where does the switch go? → A: In the top bar, just left of the version.
- Q: Does the choice go into the exported settings file? → A: No. It stays on this device, apart from the
  settings: export leaves it out and import never changes it.

## User Scenarios & Testing *(mandatory)*

The users are developers and support staff who keep the options page open while they set up environments and
actions. Some keep their system in light mode but prefer a dark page, or the other way round.

### User Story 1 - Choose the page's theme (Priority: P1)

A user's system is in light mode, but they want the options page dark. In the top bar, next to the version, they
see a small control with three choices: System, Light and Dark. System is selected. They pick Dark, and the whole
page turns dark at once: the bar, the panels, the inputs, the scrollbars and the kibanatool mark. They reload the
page, and it opens dark straight away. Later they pick System again, and the page follows the system once more.

**Why this priority**: it is the feature the user asked for.

**Independent Test**: open the options page, pick each of the three choices in turn and reload after each one.
The page shows the chosen theme every time, and System matches the system's mode.

**Acceptance Scenarios**:

1. **Given** the user has never chosen a theme, **When** the options page opens, **Then** System is selected and the
   page matches the system's light or dark mode, as it does today.
2. **Given** any choice, **When** the user picks Light or Dark, **Then** the whole page switches to that theme at
   once, with no reload, and that choice is shown as selected.
3. **Given** the user picked Dark, **When** they reload the page, close and reopen it, or restart the browser,
   **Then** the page opens dark, and at no point during loading does it show the light theme.
4. **Given** Light or Dark is chosen, **When** the system switches between light and dark mode, **Then** the page
   keeps the chosen theme.
5. **Given** System is chosen and the page is open, **When** the system switches between light and dark mode,
   **Then** the page follows at once, with no reload.
6. **Given** Dark is chosen while the system is light, **When** the page shows its mark, inputs, scrollbars, the
   file picker button and the action dialog's backdrop, **Then** all of them are in the dark theme.
7. **Given** Dark is chosen, **When** the user opens Kibana, **Then** the action bar and the row buttons look as they
   did before (they match Kibana's background), and the toolbar icon still follows the browser.

---

### User Story 2 - The switch is easy to reach and to understand (Priority: P2)

A keyboard user tabs through the top bar: the brand, the five tabs, then the theme control, then the content. The
control has a visible focus ring, and a screen reader announces it as the theme choice, names each option and says
which one is selected. A mouse user who hovers over an option sees its name.

**Why this priority**: the control is new chrome on every tab. It must not break the page's keyboard order or hide
its meaning behind icons.

**Independent Test**: tab from the top of the page to the control and change the theme with the keyboard alone;
check the names a screen reader announces.

**Acceptance Scenarios**:

1. **Given** a keyboard user, **When** they press Tab from the top of the page, **Then** they reach the brand, each
   tab, and then the theme control, each with a visible focus ring.
2. **Given** focus is on the theme control, **When** the user changes the choice with the keyboard, **Then** the
   theme changes as it does with a click.
3. **Given** a screen reader, **When** focus reaches the control, **Then** it announces the group's name ("Theme"),
   the focused option's name, and whether it is selected.
4. **Given** a mouse user, **When** they hover over an option, **Then** its name appears as a tooltip.
5. **Given** the Turkish interface in a window about 1000px wide, **When** the page loads, **Then** all five tab names
   and the theme control are fully visible in the bar, and the bar does not scroll.

---

### User Story 3 - Settings files are not affected (Priority: P3)

A team lead exports the settings and shares the file. A colleague who uses the light theme imports it. Their page
stays light, because the theme is not part of the file.

**Why this priority**: it keeps the shared settings file about environments and actions, and keeps the settings
format unchanged.

**Independent Test**: choose Dark, export, then import that file on a page set to Light. The file has no theme in
it, and after the import the page is still Light.

**Acceptance Scenarios**:

1. **Given** Dark is chosen, **When** the user exports the settings, **Then** the file is the same as it would be
   with System chosen.
2. **Given** Light is chosen, **When** the user imports a settings file, **Then** the page stays Light.
3. **Given** any theme choice, **When** the stored settings are read or saved, **Then** they are unchanged, and the
   settings format version stays the same.

### Edge Cases

- **Unreadable choice:** if the stored theme choice is missing, unknown or can't be read, the page behaves as System.
- **Two options pages open:** a choice made in one page applies to the other the next time it loads.
- **Narrow window:** at 700px the tabs scroll sideways as they do today, but the theme control stays fully visible
  and never scrolls with them.
- **Corrupt settings:** when the stored settings can't be read and the page shows its warning, the theme control
  still works.
- **Action dialog open:** the control can't be used while the modal dialog is open (the rest of the page is
  inert); the dialog itself is drawn in the chosen theme.

## Requirements *(mandatory)*

### Functional Requirements

**The control**

- **FR-001**: The options page MUST show a theme control in its top bar, just left of the version, on every tab.
- **FR-002**: The control MUST offer exactly three choices, System, Light and Dark, with one always selected. With no
  stored choice, System MUST be selected.
- **FR-003**: Picking a choice MUST apply it to the page at once, without a reload.
- **FR-004**: The control MUST be reachable with the keyboard after the tabs and before the content, show a visible
  focus ring, and be operable with the keyboard alone.
- **FR-005**: The control MUST have an accessible name ("Theme"), each choice MUST have an accessible name and a
  tooltip, and the selected choice MUST be announced as selected.

**The theme**

- **FR-006**: With Light or Dark chosen, the whole page MUST use that theme regardless of the system's mode: colors,
  the kibanatool mark, form controls, scrollbars, the file picker button and the dialog backdrop.
- **FR-007**: With System chosen, the page MUST behave as it does today, including following a change of the
  system's mode while the page is open.
- **FR-008**: The page MUST open in the chosen theme from its first paint; it MUST NOT show the other theme first.

**Storage**

- **FR-009**: The choice MUST persist on this device across reloads and browser restarts.
- **FR-010**: The choice MUST NOT be part of the stored settings or the exported settings file. Import MUST NOT
  change it, and the settings format version MUST NOT change.
- **FR-011**: A missing, unknown or unreadable stored choice MUST be treated as System, without an error message.

**Unchanged behavior**

- **FR-012**: The action bar, the row buttons and the views inside Kibana MUST keep matching Kibana's background, and
  the toolbar icon MUST keep following the browser's color scheme, whatever is chosen on the options page.
- **FR-013**: Every flow on the options page MUST work as before, and in Turkish at a window about 1000px wide all
  five tab names MUST stay fully visible with the control present (spec 005 SC-002).

**Quality**

- **FR-014**: Every new text (the control's name and its three choices) MUST exist in English and Turkish.
- **FR-015**: In both themes, the control's text and icons and its selected state MUST meet the page's contrast
  floors (4.5:1 for text, 3:1 for the icons and the selection mark).
- **FR-016**: The automated browser tests of the options page MUST cover: choosing Dark makes the page dark and a
  reload keeps it; System follows the browser's color scheme; and an export has no theme in it.

### Key Entities

- **Theme choice**: one of System, Light or Dark, stored on this device apart from the settings. System is the
  default.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user changes the page's theme in one click, and the choice holds across reloads and browser restarts
  in 100% of tries.
- **SC-002**: With Light or Dark chosen opposite to the system's mode, opening or reloading the page shows the other
  theme in 0 frames.
- **SC-003**: In Turkish, at a window 1000px wide, all five tab names and the theme control are fully visible.
- **SC-004**: Stored settings and exported files are byte-for-byte the same for every theme choice, and the
  settings format version is unchanged.
- **SC-005**: Every text pair on the page, including the control's, measures at least 4.5:1 in both themes.
- **SC-006**: A keyboard-only user can reach the control and change the theme without a mouse.
- **SC-007**: The action bar and row buttons in Kibana look the same with each of the three choices.

## Assumptions

- **Release:** this ships with the tabbed page (spec 005) in the next version, likely 1.1.0, under the CHANGELOG's
  `[Unreleased]` entry. **Changed 2026-10-20 (user decision):** it ships in 1.0.0 after all; the `[Unreleased]` entries were folded into the 1.0.0 entry, and the `v1.0.0` tag goes on that release commit once the store accepts the package.
- **Navbar spacing:** a probe of the current build found that a three-button control with today's 32px gaps leaves
  the Turkish tabs about 11px short at 1000px. The plan may tighten the bar's spacing or the control's size to keep
  SC-003; the design system's other proportions stay.
- **Icons:** the three choices are shown as icons (a monitor, a sun and a moon), named by their tooltips and
  accessible names. No new dependency is needed for them.
- **Manual checks:** spec 005's open M3 (a live switch of the system's mode) is checked again here, for System
  and for a fixed choice.
- **Live sync between pages:** two open options pages are rare; the second picks up the choice on its next load,
  not at once.

## Out of Scope

- The action bar, the row buttons, the JSON and text views in Kibana, and the toolbar icon.
- Syncing the choice across devices, or putting it in the settings file.
- More themes than light and dark, or a high-contrast theme.
- Updating the "kibanatool options" design system with the control; that can follow once the feature is merged.
