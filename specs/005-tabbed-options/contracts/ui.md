# Contract: Options Page DOM

This is what `tests/e2e/options.spec.ts` selects on, and what the CSS in `entrypoints/options/options.css` styles.
The class names are the design system's (`project/components/bundle.css`). No element id equals a tab id.

## Page

```text
header.nav
├── a.nav-brand[href="#environments"]      picture (iconPaths light/dark, 24×24, alt="") + "kibanatool"
├── nav.nav-tabs[aria-label=optionsNavLabel]
│   └── a.tab[href="#environments|#variables|#actions|#copy|#transfer"]   open one: [aria-current="page"]
└── span.nav-version                       "v" + manifest version
main
├── h1                                     the open tab's name
├── div.callout > p                        environments, variables and actions only
├── div.warning[role="alert"]              only when the stored settings could not be read
└── div[hidden]? × 5                       one wrapper per tab; all but the open one are hidden
    └── section[aria-labelledby="<tab>-title"]
```

- **The open tab** is `location.hash` without `#` when it names a tab, otherwise `environments`. It follows
  `hashchange`.
- **The section ids** stay as they are: `environments-title`, `variables-title`, `actions-title`, `copy-title`
  and `transfer-title`.

## Panels

```text
section
├── div.panel-head
│   ├── h2#<tab>-title  [span.badge count]    count on environments, variables (table rows) and actions
│   └── div.panel-actions > button…           variables: Add variable; actions: Add link action.primary, Add Discover action
├── … body (below)
└── div.panel-foot                          variables and copy only: Feedback, then button.primary Save
```

- **Environments body:** `ul.items > li.item` rows.
  - `.item-main` holds `.item-title > span.name` and `.item-sub` (the address).
  - `.item-actions` holds `span.ok` or `span.pending` with a Grant access button, then `button.link` Remove.
  - Then comes `form.row` with `input[name="name"]`, `input[name="kibanaUrl"]` and `button[type="submit"].primary`,
    followed by `Feedback`.
- **Variables body:**
  - `div.table-scroll > table.variables` (unchanged inputs: `input[name="variableName"]`,
    `input[data-environment]`);
  - with no environment, `p.empty` instead.
- **Actions body:** `ul.items > li.item` rows, or `p.empty`, then `Feedback`. Each row holds:
  - `.item-title`: `span.name`, `span.badge` (kind), `span.badge` ("Show in row", only when `showInRow`) and
    `span.muted` (scope);
  - `.item-sub`: the template;
  - the `span.pending.var-warning[data-variable]` warnings;
  - `.item-actions`: `span.pending` (Disabled), then the Edit and Remove buttons.
- **Copy body:** `div.fields` holding three `div.field-h` rows. Each row has a left `div` (`.field-h-title` and
  `p.field-h-help`) and a `div.field-h-control`.
  1. `textarea#markdown-fields[aria-describedby="markdown-fields-help"]`.
  2. `textarea#mask-patterns[aria-describedby="mask-patterns-line mask-patterns-help"]`, then
     `p.field-h-help#mask-patterns-help` (the 004 note).
  3. `div.checks[role="group"][aria-labelledby="value-masks"]` holding four
     `label.inline > input[name="valueMask"][value]`.
- **Transfer body:** `div.fields` holding two `div.field-h` rows.
  1. Export: one `button`.
  2. Import: `input#import-file[type="file"]`. After a pick comes `div.warning` holding the preview text and
     `button.primary` Replace settings and `button.link` Cancel. Then `Feedback`.

## Action dialog

Rendered inside the actions section while a draft exists:

```text
dialog.modal[aria-labelledby="action-editor-title"]     opened with showModal(); styled only when [open]
└── form
    ├── div.modal-head    h2#action-editor-title (label, or the add button's text), span.badge (kind),
    │                     button.icon[aria-label=jsonClose][title=jsonClose] "×"
    ├── div.modal-body    the editor's fields, unchanged (input[name="label"], input[name="urlTemplate"],
    │                     input[name="targetKind"], input[name="dataView"] …), then Feedback with the save errors
    └── div.modal-foot    button.link Cancel, button.primary[type="submit"] Save
```

- **Closing:**
  - Escape, ×, Cancel and a successful Save each clear the draft, and the dialog unmounts.
  - Focus then goes back to the element that was focused when it opened.
  - A `hashchange` also clears the draft.
- **Not disabled:** the Edit and Add buttons are never disabled. The modal is the one-draft guard.

## e2e selector migration

Each test opens its tab with `openOptions(context, extension.id, "<tab>")`, which goes to `options.html#<tab>`.

| Test | Old | New |
|---|---|---|
| adds an environment and a link action | `environments … .list li .ok` | `environments … .items .ok` |
| | `actions .row > button` first (Add link) | click `a[href="#actions"]`, then `actions .panel-head button` first |
| | `… toBeDisabled()` (one draft at a time) | `actions dialog.modal[open]` toBeVisible |
| | `.editor button[type="submit"]` | `dialog button[type="submit"]` |
| | `.list li .name` | `.items .name` |
| exports the settings … | `transfer .row > button` | tab `transfer`; `transfer .field-h button` |
| turns one value mask off | — | tab `copy`; `button.primary` unchanged |
| describes the mask patterns field … (004) | — | tab `copy`; `textarea` nth(1) unchanged |
| exports a corrupt stored value … | `transfer .row > button` | tab `transfer`; `transfer .field-h button` |
| edits environment variables … | `variables .row > button` first (Add) | tab `variables`; `variables .panel-head button` |
| | `variables .row > button` nth(1) (Save) | `variables .panel-foot button.primary` |
| | `actions .var-warning` counts | unchanged: `toHaveCount` counts the hidden actions tab |
| keeps the inner space of a target data view name … | `actions .row > button` nth(1) | tab `actions`; `actions .panel-head button` nth(1) |
| | `.editor button[type="submit"]` | `dialog button[type="submit"]` |
| imports a version 1 settings file … | — | tab `transfer`; `.warning button` unchanged |

New tests (spec 005):

- **"opens the tab the address names, keeps it on reload and Back, and keeps unsaved edits"**:
  - With no hash, `a.tab[aria-current="page"]` is `#environments`.
  - Clicking `a[href="#actions"]` moves `aria-current` to it, the URL ends `#actions`, and only the actions section
    is visible.
  - A reload keeps `#actions`, and Back returns to `#environments`.
  - `#foo` opens Environments.
  - Text typed into `#mask-patterns` is still there after a visit to `#variables`.
  - `.nav-version` reads `v` + the manifest version.
- **"edits an action in a dialog: badges, Escape and focus"**:
  - With `markInRow(e2eConfig(), ["user"])`, the `User` row has two `.badge` elements and the other rows have one.
  - Its Edit opens `dialog.modal[open]`.
  - Escape closes it, and that Edit button `toBeFocused()`.
  - Add link action, then Back: no `dialog[open]` remains, and the Environments name input takes text.
