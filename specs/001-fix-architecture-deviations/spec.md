# Feature Specification: Fix Architecture Deviations D1–D13

**Feature Branch**: `001-fix-architecture-deviations` (not created yet)

**Created**: 2026-10-14

**Status**: Draft

**Input**: User description: "D1-D13 düzeltmeleri için spec dökümanı hazırla." (Write a spec for fixing
the Known Deviations D1–D13 of the constitution, v1.0.0.)

## User Scenarios & Testing *(mandatory)*

The users of this change are the people who maintain kibanatool. The people who use the extension
in Kibana must see no difference (FR-022). The deviations D1–D13 and their locations are listed in
the constitution's "Known Deviations" table (`.specify/memory/constitution.md`). This spec names
them by ID and does not repeat their locations.

### User Story 1 - Rules stay independent of Kibana's link format (Priority: P1)

When a new Kibana major changes how Discover links are written, a maintainer changes only the
Kibana layer. The rules that decide which buttons a log gets stay where they are. An automated
check keeps core logic from depending on outer layers again. Covers D1 and the deferred
architecture check (constitution Gate G2, `TODO(ARCH_TEST)`).

**Why this priority**: D1 is the only import that points the wrong way. The check then guards
every layering rule in CI with no review effort. That matters because the constitution file itself
is local-only and CI never reads it.

**Independent Test**: Run the unit suite. The architecture check passes with an empty exception
list. Add a forbidden import to a core module and the check fails, naming the module and the
import. Open a log that has a Discover action on each Kibana major: the button opens the same view
as before.

**Acceptance Scenarios**:

1. **Given** a Discover action with a target data view and a ±N-minute window, **When** a user
   opens a matching log, **Then** the Discover button opens exactly the same view (data view,
   query, time range) as before the change.
2. **Given** the code after the change, **When** the unit suite runs, **Then** the architecture
   check passes and its exception list is empty.
3. **Given** a core module that imports from an outer layer (plain import, type-only import,
   re-export or dynamic import), **When** the unit suite runs, **Then** the check fails and names
   the module and the import.
4. **Given** a core module that refers to a browser global (`window`, `document`, `location`,
   `navigator`, `fetch`, `chrome`, `browser`), **When** the unit suite runs, **Then** the check
   fails.
5. **Given** two modules under `src/` that import each other, directly or through others,
   **When** the unit suite runs, **Then** the check fails and names the cycle.

---

### User Story 2 - Each rule is defined once (Priority: P2)

A maintainer changes a rule in one place, and the options page and the action bar always agree.
The rules are:
- which environments an action applies to;
- which condition operators exist;
- how deep nested JSON or XML text is opened;
- what counts as XML text;
- what counts as an http(s) address;
- how a Kibana base path is matched;
- when an environment variable counts as missing;
- in which order an action is hidden or greyed out.

Covers D2–D8 and one item found while writing this spec (FR-012).

**Why this priority**: these copies are where the options page can silently disagree with the bar.
For example, a scope rule changed in one copy shows an action for environments where the bar
never offers it.

**Independent Test**: For each rule, a search of the source finds one definition. The existing
behavior tests for the bar and the options page pass with unchanged expected values.

**Acceptance Scenarios**:

1. **Given** an action with no environment selected, **When** the user looks at the action list,
   the editor's preview selector and the variable warnings, and opens a log in each environment,
   **Then** all four treat the action as applying to every environment, and the list still says
   "All environments".
2. **Given** an action scoped to environments A and B, **When** the user looks at the same four
   places, **Then** all of them use exactly A and B.
3. **Given** a template that uses `{env.x}` and an environment where `x` is unset or empty,
   **When** the user looks at the options page and at the bar in that environment, **Then** the
   options page warns that `x` is missing there and the bar greys the action out naming `x`. The
   two always name the same variables.
4. **Given** a link action and a Discover action in the same situation (disabled, failing
   condition, missing field value, or missing variable), **When** a log is opened, **Then** both
   are hidden or greyed out in the same cases and with the same precedence.
5. **Given** a log field whose text is XML with leading whitespace, **When** the user opens the
   JSON view or uses any copy, **Then** every place treats it as XML, as today.
6. **Given** text nested more than five levels deep, **When** the fields are expanded or the cURL
   command is built, **Then** both stop at the same depth as today.
7. **Given** a Kibana URL with trailing slashes or a base path, **When** the environment is matched
   or the settings are validated, **Then** the matched environment and the duplicate-URL error are
   the same as today.

---

### User Story 3 - Shared shapes have one definition (Priority: P3)

A maintainer adds a new reason for hiding an action, or a new property of an action button, in one
place. The link and Discover buttons cannot drift apart in look or accessibility. Covers D9 and
D10.

**Why this priority**: it only affects maintainers, but it removes the coupling between the two
action kinds that D8's shared gating would otherwise make worse.

**Independent Test**: The two button kinds share one definition and one rendering path. The bar
renders exactly as before.

**Acceptance Scenarios**:

1. **Given** a greyed-out link action and a greyed-out Discover action, **When** the bar renders,
   **Then** both are greyed out, keyboard-focusable and show their reason as a tooltip, as today.
2. **Given** a working link button and a working Discover button, **When** the user activates
   them, **Then** both open in a new tab with the same safety attributes and differ only in
   color, as today.
3. **Given** an action that would be hidden, **When** the user previews it on the options page,
   **Then** the preview names the same reason as today.

---

### User Story 4 - A copy failure shows its own reason (Priority: P4)

When a copy menu item cannot produce its text, the notice gives the reason for that item, never
another item's reason. Covers D11.

**Why this priority**: the wrong notice can appear only on a path that is unreachable today, so
the risk is in future changes.

**Independent Test**: Make the fixed-time copy fail with unsupported date math, then make the cURL
copy fail. Each shows its own notice.

**Acceptance Scenarios**:

1. **Given** a Discover view whose time range uses date math the extension does not support,
   **When** the user copies "view with fixed time", **Then** the bar shows the "time not
   converted" notice, as today.
2. **Given** the cURL item is shown but cannot produce a command, **When** the user picks it,
   **Then** the bar shows the "copy failed" notice, not the time notice.
3. **Given** any other copy item, **When** the user picks it, **Then** it behaves as today.

---

### User Story 5 - Browser state reaches the code through its host (Priority: P5)

A maintainer can test the action bar and the settings reload without a real browser page. Every
place that reads the page address or the clock, or listens for settings changes, is visible at
the entry points. Covers D12, D13 and one item found while writing this spec (FR-018).

**Why this priority**: there is no user-visible effect; it improves testability and keeps
`src/storage.ts` the only module that touches storage, as CLAUDE.md already claims.

**Independent Test**: Render the bar with a given page address and clock, then check the copied
link. Save settings and check that the bar and the background react.

**Acceptance Scenarios**:

1. **Given** the user has moved around in Discover, **When** the user copies the document link or
   the fixed-time view, **Then** the copied text uses the page address and time at the moment of
   the click, as today. This holds even if the address changed without the bar re-rendering.
2. **Given** the settings are saved on the options page, **When** the save completes, **Then**
   open Kibana tabs update their bars without a reload and the background re-registers the
   content script for the granted origins, as today.
3. **Given** a change to another storage key or storage area, **When** it happens, **Then**
   nothing reloads, as today.

---

### Edge Cases

- The page address changes through the history API without a hash change or a DOM mutation.
  Copies must still use the address at click time (FR-018).
- Type-only imports, re-exports and dynamic imports count as imports for the architecture check.
  Test files are outside its scope.
- The localization module reads its key list from the message catalog in `public/_locales`,
  outside `src/`. The check allows exactly that import and no blanket exception (FR-004).
- The UI layers and the entry points import npm packages (React, WXT). The check allows them where
  the clarified table does (FR-004).
- A Discover action with a window, whose target data view has no time field and whose query is
  empty, stays greyed out with "no time" (D1).
- A data view name that matches several data views keeps the action greyed out as "ambiguous"
  (D1).
- An action scoped only to removed environments is still repaired the same way: unknown ids are
  dropped and the action is disabled when none are left (D2).
- A stored config with an unknown condition operator is still rejected. The extension falls back
  to the empty config and the options page shows the errors, as today (D3).
- An environment variable stored as an empty string counts as missing in both the warning and the
  bar (D7).
- Two settings saves back to back are still synced by the background one at a time (D13).

## Requirements *(mandatory)*

### Functional Requirements

**Layering (constitution Principle I)**

- **FR-001**: The rules that pick a Discover action's target (data view, query, time range) MUST
  NOT depend on how Kibana writes links. The content layer builds the link from that target. The
  links MUST be identical to today's for every action and log. (D1)
- **FR-002**: An automated architecture check MUST run as part of the unit suite. It MUST fail when:
  - an import breaks the constitution's import table (type-only imports, re-exports and dynamic
    imports included);
  - `src/core` refers to a browser global;
  - the import graph under `src/` has a cycle.

  Each failure message MUST name the module and the import (or the cycle). (Gate G2)
- **FR-003**: The check's exception list MUST mirror the open Principle I rows of Known
  Deviations. When this work is done, the list MUST be empty.
- **FR-004**: Before the check is enforced, the constitution's import table MUST be clarified as a
  PATCH amendment. Two things are added:
  - the UI layers (`src/content`, `src/options`) and the entry points may import npm packages;
  - the localization module may import its message catalog from `public/_locales`.

  No other exception is added.

**One rule, one place (Principle II)**

- **FR-005**: Which environments an action applies to MUST have one definition. The bar, the
  options action list, the editor's preview selector and the variable warnings MUST all use it.
  The list keeps showing "All environments" for an action with no environment selected. (D2)
- **FR-006**: The set of condition operators MUST be declared once. Settings validation and the
  operator type MUST be derived from it. (D3)
- **FR-007**: The depth to which nested JSON or XML text is opened MUST be one shared value, used
  by field expansion and by the cURL copy. (D4)
- **FR-008**: What counts as XML text MUST have one definition, used everywhere text is
  classified. (D5)
- **FR-009**: An environment's base path MUST be computed by one function, used by both
  environment matching and duplicate-URL validation. (D6)
- **FR-010**: When an environment variable counts as missing MUST have one definition, used by both
  the options page warnings and the bar's greyed-out buttons. (D7)
- **FR-011**: Link and Discover actions MUST share one gating sequence, with this precedence:
  1. a disabled action is hidden;
  2. a failing condition hides the action;
  3. a missing field value hides the action;
  4. a missing variable greys the action out.

  After these four steps each kind runs its own checks, as today: the link checks its leading
  variable and the final URL; the Discover action checks its data view and time. (D8)
- **FR-012**: The test "starts with http:// or https://" MUST have one definition. It is used by
  URL template validation and by the leading-variable check. (Unlisted; found while writing this
  spec.)
- **FR-013**: The cURL copy masks text differently from the other copies on purpose. That code
  MUST carry a comment citing the spec section that requires the difference, as the Principle II
  exception demands. (Unlisted; found while writing this spec.)

**Shared types (Principle III)**

- **FR-014**: The reasons an action is hidden MUST be defined next to the reasons it is greyed
  out, not in the module of one action kind. (D9)
- **FR-015**: Link and Discover buttons MUST share one button definition and one rendering path.
  Only the visual style differs. (D10)

**Failures carry their reason (Principle IV)**

- **FR-016**: Each copy menu item MUST carry its own failure notice. The bar MUST NOT infer the
  reason from an empty result. The fixed-time view uses "time not converted"; every other item
  uses "copy failed". (D11)

**Browser state through parameters (Principle V)**

- **FR-017**: The action bar MUST receive the page address from its host instead of reading it
  itself. (D12)
- **FR-018**: The address and the current time used by a copy MUST be those at the moment of the
  click, supplied by the host. The bar MUST NOT read the clock itself either. (D12, plus an unlisted
  Principle V item found while writing this spec.)
- **FR-019**: Subscribing to settings changes MUST go through the storage module. The background
  and the content script MUST use it and react to the same changes as today. (D13)

**Governance and documentation**

- **FR-020**: When a deviation is fixed, its row MUST be removed from Known Deviations. When the
  check is enforced, `TODO(ARCH_TEST)` and its notes MUST be removed. Each amendment bumps the
  PATCH version and updates the Sync Impact Report and Last Amended.
- **FR-021**: CLAUDE.md MUST point to the constitution and say that the file is local-only, the
  same way it does for `docs/superpowers/`. Every session, including plans and reviews done
  outside spec-kit, then applies the principles. CLAUDE.md MUST also mention the architecture
  check.

**No behavior change**

- **FR-022**: For the same settings and logs, on Kibana 7.17, 8.x and 9.x:
  - the bar MUST show the same buttons, link targets, copy outputs and notices;
  - the options page MUST show the same lists, previews, warnings and validation errors.

  The only exception is FR-016's notice on a path that is unreachable today.
- **FR-023**: The settings schema MUST NOT change: schemaVersion stays 3 and stored settings load
  unchanged. No new UI strings are added.

### Key Entities

- **Known Deviation**: an ID (D1–D13), the principle it breaks, where it is, the expected fix and
  whether it is open. It lives in the constitution, and a row is removed when its fix lands.
- **Import table**: which group of modules may import which, plus the check's exception list,
  which mirrors the open Principle I deviations.
- **Business rule**: one of the eight rules in FR-005 to FR-012. Each has exactly one definition
  and any number of callers.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Known Deviations goes from 13 rows to 0, and the constitution has no open TODO.
- **SC-002**: The architecture check passes with 0 exceptions. It catches all five planted
  violations, which reviewers plant once and then remove:
  - an outer import in core;
  - a type-only import;
  - a re-export;
  - a browser global in core;
  - a cycle.
- **SC-003**: For each of the eight rules in FR-005 to FR-012, a search of the source finds exactly
  one definition.
- **SC-004**: The end-to-end suite passes on all three Kibana majors with its test files unchanged.
  No expected value in the unit tests changes (link, copied text, notice, warning, validation
  error). Test edits are limited to imports, moved names and the place where links are built.
- **SC-005**: Adding a sixth condition operator would mean changing only three things: the
  operator list, its evaluation and its label in the two languages. Settings validation accepts
  it with no further edit.
- **SC-006**: A new session on this repository (planning or review) learns about the constitution
  from CLAUDE.md, without running a spec-kit command.

## Assumptions

- The baseline is `main` at 56e48a2. The constitution's Known Deviations table (v1.0.0) is the list
  of things to fix. Its "Expected fix" column is the default approach; the plan may choose a
  smaller fix that still satisfies the principle.
- The cURL item's failure path is unreachable today. The item is shown only when the log records a
  request, and then a command is always produced. FR-016 changes only what that path would show,
  and it reuses the existing "copy failed" notice.
- No new dependencies. The architecture check uses only tools the project already has.
- This is an internal change: no CHANGELOG entry and no version bump. It ships inside the
  unreleased 1.0.0, like Plans 4–7.
- The spec, plan and tasks are local-only under `specs/` (gitignored). The constitution stays
  local-only under `.specify/`. The architecture check and the CLAUDE.md pointer are the parts
  that reach git.
- Out of scope:
  - the remaining minor review items that are not rules: the environment computed twice when the
    content script starts, the per-page document cache with no limit, and where the plain-object
    helper lives;
  - running copy-paste and cycle tools in CI.
