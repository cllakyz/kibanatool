# Feature Specification: One-Click Action Buttons on Result Rows

**Feature Branch**: decided in the plan. The two user stories can ship as one branch or in sequence.
Both ship in 1.0.0 (user decision, 2026-10-16).

**Created**: 2026-10-16

**Status**: Draft

**Input**: User description: "Satırdan tek tıkla buton. 7.17'de butonları görmek için önce satırı açmak
gerekiyor; butonlar doğrudan satırda gösterilebilir. Bu geliştirme için spec dökümanı oluştur." (One-click
buttons from the row. On 7.17 the user must expand a row before the buttons appear; the buttons could be
shown on the row itself.)

## Clarifications

### Session 2026-10-16

These questions were asked before the spec was written, after a check of the local 7.17.29 and 9.5.5
stacks (see the starting picture below).

- Q: On 7.17 a collapsed row carries no document identity; only Kibana's own in-memory data for the
  table holds it. May a small script that runs in the page's context read that identity and put it on
  the row? → A: Yes. This reverses the rejected approach "reading Kibana's internal data" in design
  spec §2, for the row identity on 7.17 only.
- Q: Which Kibana versions get row buttons? → A: 7.17, 8.x and 9.x. The original success criterion
  "the same settings give the same result on every version" (design spec §1.2) stays true.
- Q: Which buttons appear on a row? → A: Only the actions the user marks with a new per-action
  option, "show in row". The panel button ("View") and the copy menu stay in the expanded bar only.
- Q: When do the row buttons appear? → A: When the pointer is over the row or keyboard focus is
  inside it, as Kibana's own cell filter buttons do. The rows' logs are fetched in the background
  beforehand, so the buttons appear without waiting.
- Q: Is "show in row" on or off at first, for existing and for new actions? → A: Off. Nothing changes
  on any row until the user marks an action.
- Q: Where on the row do the buttons appear? → A: At the right end of the visible row, as a strip
  laid over the row. The table's layout and column widths do not change.
- Q: Which release carries this feature? → A: 1.0.0. The store upload waits for it. (The
  recommendation was 1.1.0, with 1.0.0 uploaded first; the user chose 1.0.0.)
- Q: What does the 7.17 page-context script do while no action is marked "show in row"? → A: It is
  loaded with the content script on the granted Kibana origins but stays idle: it reads nothing and
  touches no row until the content script asks, and the content script asks only while a marked
  action applies. Marking an action takes effect on open Discover pages without a reload.
- Q: Does the row strip also show a marked action that is greyed out for the log? → A: Yes, exactly
  as the expanded bar does: greyed out, with the reason as its tooltip. The row and the bar show the
  same list. *(Corrected on 2026-10-17: the question's example said "a field its link needs is
  missing", but the bar hides such an action. A button is greyed out when an environment variable
  is missing or invalid, or when a Discover action's data view cannot be resolved or has no time
  field for its window. The answer is unchanged.)*

## User Scenarios & Testing *(mandatory)*

The users are developers and support staff who read logs in Kibana Discover with the extension's
bar. Today the bar appears only in a log's detail view: under an expanded row on 7.17, and in the
side flyout on 8.x and 9.x. Jumping from a log to an admin page or to related logs therefore takes
two clicks, expand and then the button, and the design accepted that for v1 (design spec §1.2).

The check of the local stacks before this spec (2026-10-16) found:

- **7.17 (legacy table):** a collapsed row holds only the expand toggle and the visible cells. No
  link or attribute on it identifies the log. The document summary may show the log's id as text,
  but only with the default columns and only as displayed text, which the extension never reads.
  Kibana's own in-memory data for the row does hold the log's index and id.
- **8.x and 9.x (data grid):** every rendered row already carries the log's index and id in its
  own markup (the row's selection checkbox). This is also true in 9.5's Observability view. The
  grid renders only the rows on screen, plus a few more.

### User Story 1 - One-click actions on 7.17 rows (Priority: P1)

A support engineer works in the team's 7.17 Kibana. On the options page they mark "Admin: player"
and "This player's logs" as "show in row". Back in Discover, they move the pointer over a log
row. Those two buttons appear at the right end of the row. One click opens the player's admin page
in a new tab, without expanding the row.

**Why this priority**: the team's production and Alpha Kibanas run 7.17, and the user named it.
7.17 is also where the work is hardest, because the row carries no identity.

**Independent Test**: on the 7.17 stack, mark one link action and one Discover action as "show in
row". Hover a collapsed row whose log matches both actions' conditions. Both buttons appear, and
clicking the link button opens the expected address in a new tab while the row stays collapsed.

**Acceptance Scenarios**:

1. **Given** a link action marked "show in row" whose conditions match a log, **When** the user
   moves the pointer over that log's collapsed row, **Then** the action's button appears at the
   right end of the row, and one click opens its link in a new tab.
2. **Given** the same row, **When** the pointer leaves the row, **Then** the buttons disappear.
3. **Given** a row, **When** keyboard focus moves into it (for example to its expand toggle),
   **Then** the buttons appear and can be reached with Tab.
4. **Given** an action marked "show in row" whose conditions do not match a log, **When** the user
   hovers that log's row, **Then** that button is not shown, exactly as the expanded bar would not
   show it.
5. **Given** a marked action that the expanded bar shows greyed out for a log (for example, a
   Discover action with a time window on a data view without a time field), **When** the user
   hovers the row, **Then** the button is shown greyed out with the same reason the bar gives. An
   action whose link needs a field the log lacks is not shown, as in the bar.
6. **Given** a row with buttons, **When** the user clicks a button, **Then** the row does not expand
   or collapse and Kibana does not react to the click in any other way.
7. **Given** no action is marked "show in row", **When** the user uses Discover, **Then** no row
   changes and the extension sends no request beyond what it sends today.
8. **Given** an expanded row, **When** the user looks at its bar, **Then** the bar is unchanged:
   every applicable action, the "View" button and the copy menu are there.
9. **Given** settings saved by an earlier version, **When** the extension updates, **Then** every
   action is kept as it was, with "show in row" off.
10. **Given** a Discover page that is already open, **When** the user marks an action "show in row"
    on the options page, **Then** hovering a row on that page shows the button without a reload.

---

### User Story 2 - One-click actions on 8.x and 9.x rows (Priority: P2)

A Web Store user on Kibana 8.x or 9.x marks the same actions as "show in row". Hovering a row in
the data grid shows the buttons at the row's right end, and one click runs the action without
opening the side flyout.

**Why this priority**: it keeps the versions consistent, and it is simpler than User Story 1
because the grid row carries its identity. The team's own daily work is on 7.17, so it comes
second.

**Independent Test**: on the 8.x and 9.x stacks, with the same settings as User Story 1, hover a
grid row whose log matches both actions. Both buttons appear, and clicking the link button opens
the expected address in a new tab while the flyout stays closed.

**Acceptance Scenarios**:

1. **Given** the settings of User Story 1, **When** the user hovers a matching row in the 8.x or
   9.x data grid, **Then** the same buttons appear as on 7.17, in the same order, with the same
   links.
2. **Given** the grid scrolls and renders new rows, **When** the user hovers one of them, **Then**
   its buttons appear without waiting, because its log was fetched when the row appeared.
3. **Given** the 9.x Observability view, which opens logs on a "Log overview" tab, **When** the
   user hovers a row, **Then** the buttons work there too.
4. **Given** a row with buttons, **When** the user clicks a button, **Then** the flyout does not open
   and the row is not selected.

---

### Edge Cases

- **Many marked actions:** the strip shows every marked action that applies, on one line. It may
  cover more of the row's content while the row is hovered. The user controls this by marking fewer
  actions. There is no automatic limit.
- **Identity cannot be read:** on a Kibana version or page whose internal data has changed, or for
  a row whose identity is missing, that row shows no strip. Discover and the expanded bar work as
  before, and nothing visible reports an error.
- **The log cannot be fetched** (no permission, network error, deleted log): the strip shows a
  compact error mark, and its tooltip carries the message the expanded bar would show. The rest of
  the table is unaffected.
- **Pointer arrives before the log:** the strip shows a short loading mark until the log arrives,
  then the buttons.
- **The result list changes** (new search, new time range, refresh, sorting, "load more" rows on
  7.17): rows that are new get their logs fetched; logs already fetched for the same document are
  not fetched again while the page shows them.
- **Large result lists:** 7.17 can show up to 500 rows as the user scrolls; logs are fetched in
  batches as rows appear, never all 500 at once unless they are all rendered.
- **Discover action that needs the data view's time field** (a time window): it works on the row as
  in the bar; the lookup is shared by the page's rows, not repeated per row.
- **Several environments:** only actions that apply to the open environment are shown, as in the
  bar.
- **ES|QL mode and pages other than Discover's main result table** (single-document view,
  surrounding documents, dashboards): no row strip. The expanded bar keeps working wherever it works
  today.
- **7.17's optional new table mode** (`doc_table:legacy` off): not supported, as for the bar today.
- **Kibana's own hover controls:** Kibana shows controls at the right of a hovered cell (7.17's cell
  filter buttons, the grid's cell actions), so the last cell's controls sit where the strip goes.
  They must stay usable (FR-007); how the strip makes room is for the plan.
- **A row that is also expanded:** its expanded bar works as today; its row strip still appears on
  hover.

## Requirements *(mandatory)*

### Functional Requirements

**Settings**

- **FR-001**: Each link action and each Discover action MUST have a "show in row" option ("Satırda
  göster" in Turkish), editable on the options page next to the action's other settings.
- **FR-002**: "Show in row" MUST be off for every action that exists when the extension updates and
  for every newly created action (clarified 2026-10-16).
- **FR-003**: Settings stored or exported by earlier versions MUST convert to the new settings
  format when loaded or imported, keeping every environment, action, condition and copy setting,
  with "show in row" off. Settings the extension cannot read MUST still be treated as they are
  today.

**Which buttons, and how they look**

- **FR-004**: A row MUST show a button only for an action that is enabled, applies to the open
  environment and is marked "show in row". The "View" button and the copy menu MUST NOT appear on
  rows.
- **FR-005**: For a given log, a row button MUST behave exactly like the same action's button in
  the expanded bar: the same rule decides whether it is shown, greyed out (with the same reason) or
  working, and a working button has the same label and opens the same address in a new tab. A
  greyed-out button stays on the row, with its reason as its tooltip (clarified 2026-10-16). Row
  buttons keep the bar's order: link actions first, then Discover actions, each in settings order.
- **FR-006**: The row buttons MUST appear while the pointer is over the row or keyboard focus is
  inside it, and MUST be hidden otherwise (clarified 2026-10-16).
- **FR-007**: The buttons MUST appear as one strip at the right end of the row's visible part, laid
  over the row. The table's layout, column widths and row heights MUST NOT change, whether or not a
  strip is shown (clarified 2026-10-16). The strip MUST NOT cover Kibana's own controls on the row:
  the expand toggle, 7.17's cell filter buttons and the grid's cell actions stay visible and
  clickable.
- **FR-008**: A click on a row button MUST run only that action. It MUST NOT expand, collapse,
  select or open the row, and Kibana MUST NOT receive the click.
- **FR-009**: While a row's log is loading, its strip MUST show a short loading mark. If the log
  cannot be fetched, the strip MUST show a compact error mark whose tooltip is the message the
  expanded bar shows for that error.

**Identity and data**

- **FR-010**: On 7.17, a row's index and id MUST be read from Kibana's own in-memory data for that
  row, by a script that runs in the page's context and passes only those two on (clarified
  2026-10-16). It MUST NOT read or pass on any field value.
- **FR-011**: On 8.x and 9.x, a row's index and id MUST be read from the row's own markup. On every
  version the data view comes from the page address, as it does for the expanded bar today.
- **FR-012**: The log behind a row MUST be fetched raw through Kibana, with the user's session, as
  the expanded bar fetches it. Field values MUST NOT be read from the page.
- **FR-013**: Logs for rows MUST be fetched in the background as rows appear, in batches, so that a
  hovered row's buttons are ready without waiting. Rows that appear within a short pause of each
  other form one batch. The extension MUST send at most one log request per batch of up to 50
  rows, and MUST NOT fetch a document again while the page still shows it.
- **FR-014**: When no action applies to the open environment with "show in row" on, the extension
  MUST NOT fetch any row's log and MUST NOT change any row. The 7.17 page-context script MUST stay
  idle then: it reads nothing and touches no row until the content script asks for row identities
  (clarified 2026-10-16).
- **FR-014a**: Changes to "show in row" MUST take effect on open Discover pages without a reload,
  as other settings changes do for the bar today.
- **FR-015**: When a row's identity cannot be read, that row MUST get no strip, and nothing else on
  the page may change because of it. The expanded bar MUST keep working (fail closed).
- **FR-016**: Fetched row logs MUST be kept only in memory, only while the page is open, and in a
  bounded number (the oldest are dropped first). Nothing is stored, and nothing is sent anywhere
  except to the Kibana the page belongs to.

**Accessibility, language and safety**

- **FR-017**: Every row button MUST have an accessible name and be reachable by keyboard. A greyed
  out button MUST be focusable and expose its reason, as in the bar.
- **FR-018**: Every new UI string MUST exist in English and Turkish.
- **FR-019**: A failure in the row strip or in the identity script MUST NOT break Kibana, the
  table, other rows or the expanded bar.
- **FR-020**: The extension MUST ask for no new permission. The page-context script MUST be loaded
  only on Kibana origins the user has granted, together with the content script, and only as long
  as the content script is.
- **FR-021**: The feature MUST work on Kibana 7.17 (legacy table), 8.x and 9.x, including 9.x's
  Observability view.
- **FR-022**: The expanded bar and every copy (Markdown, JSON, cURL, links) MUST stay unchanged.

### Key Entities

- **Row option ("show in row")**: a yes/no setting on each link and Discover action. It is off by
  default and travels with the action in exports and imports.
- **Row identity**: the data view, index and id of the log a result row shows. The index and id come
  from the row's markup on 8.x/9.x and from Kibana's in-memory row data on 7.17; the data view comes
  from the page address. It never includes field values.
- **Row strip**: the set of buttons shown at the right end of a hovered or focused row. It holds
  only marked actions, built by the same rule as the expanded bar.
- **Row log**: the raw log fetched for a row's identity. It is kept in memory for the page and
  shared by that row's strip.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On Kibana 7.17, 8.x and 9.x, a user runs a marked link action and a marked Discover
  action from a collapsed result row with one click each, without expanding the row or opening the
  flyout.
- **SC-002**: For the same log, the row buttons and the expanded bar's buttons for the marked
  actions match in every case tested: shown or hidden, greyed out with the same reason, label,
  order and target address. Checked on all three versions.
- **SC-003**: When the pointer reaches a row whose log has been fetched, its buttons are visible
  within 0.3 seconds. On Alpha, the logs of the first 50 rows are ready within 2 seconds of the
  rows appearing (manual check by the user, with the built extension in their Chrome).
- **SC-004**: With marked actions, rows that appear together are fetched with one log request per up
  to 50 rows: scrolling a 500-row 7.17 result to the end sends at most 10. With no marked action,
  the extension sends no extra request at all.
- **SC-005**: Column widths and row heights of the result table are identical with and without the
  extension, measured on all three versions with a strip shown.
- **SC-006**: The Alpha settings file saved by the current version loads with all of its actions,
  conditions, environments and copy settings intact and every action's "show in row" off.
- **SC-007**: When a row's identity cannot be read, Discover and the expanded bar behave exactly as
  they do today, and no error is visible to the user.
- **SC-008**: On Alpha (7.17.26), with the team's settings and two actions marked, hovering a log
  row shows the strip and one click opens the expected admin page (manual check by the user).

## Assumptions

- **Release:** the feature ships in 1.0.0, and the store upload of 1.0.0 waits for it (user decision,
  2026-10-16).
- **Design change:** design spec §2 rejected reading Kibana's internal page data as fragile. The
  user accepted it for the 7.17 row identity only (2026-10-16). The risk is bounded: 7.17 receives
  only maintenance releases, the team runs 7.17.26 (Alpha) and 7.17.29 (production and the local
  stack), the end-to-end tests run on 7.17.29, and a failure removes only the row strips (FR-015).
  The plan updates the design notes and `CLAUDE.md` to match.
- **Page-context script:** Chrome supports registering a script that runs in the page's context at
  runtime, with the permissions the extension already has. Where this script sits in the code is
  for the plan to decide under the constitution (principles I and V).
- **Data source unchanged:** the raw log still comes from the same Kibana request the bar uses. The
  identity script supplies the identity only.
- **Expanded bar unchanged:** the expanded row (7.17) and the flyout (8.x/9.x) keep today's full bar.
  The row strip is an addition, not a replacement.
- **Settings format:** adding the option changes the settings format, so its version number goes up
  and older settings are converted on load and import (`CLAUDE.md`: a missing conversion silently
  wipes stored settings).
- **Load on Kibana:** a batched request per 50 rows is a small addition to Discover's own search for
  the same rows. It happens only when the user has marked at least one action.
- **Masking:** row buttons open links and Discover views as the bar does. They copy nothing, so the
  copy masks are not involved.

## Out of Scope

- The "View" panel and the copy menu on rows.
- An automatic limit on the number of row buttons, or an overflow menu for them.
- Row buttons outside the Discover result table: single-document view, surrounding documents,
  dashboards and saved-search panels.
- 7.17's optional new table mode and ES|QL mode.
- Reading Discover's network responses to identify rows (rejected in design spec §2, and not
  needed).
