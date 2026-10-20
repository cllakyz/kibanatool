# Data Model: Tabbed Options Page

No stored data changes. `Config`, its `schemaVersion` (4) and the export file stay as they are (spec FR-019,
SC-004). The feature only adds page state.

## Tab (page state, `entrypoints/options/App.tsx`)

| Field | Value |
|---|---|
| `id` | `environments`, `variables`, `actions`, `copy` or `transfer`, in this order |
| `title` | message key: `optionsEnvironments`, `optionsVariables`, `optionsActions`, `optionsCopy`, `optionsTransfer` |
| `intro` | message key or none: `optionsIntro`, `optionsVariablesHelp`, `optionsActionsHelp`, none, none |

- **Open tab:** the tab whose `id` equals `location.hash` without `#`. Otherwise `environments`.
- **Transitions:** a `hashchange` from a tab click, Back, Forward or an edited address sets the open tab. A reload
  reads the hash again.
- **Section state:** every section stays mounted, so each keeps its own unsaved state (Variables rows, Copy
  fields, a picked import file, its saved notice) while hidden (spec FR-004).

## Action draft (page state, `entrypoints/options/ActionsSection.tsx`)

| State | Dialog | Entered by | Left by |
|---|---|---|---|
| none | closed | page load; a successful Save; Cancel, × or Escape; a `hashchange` | — |
| a draft `Action` | open (modal) | Edit, Add link action, Add Discover action | Save (if valid), Cancel, ×, Escape, `hashchange` |

- **Opening:** the element that was focused at that moment gets focus back when the draft ends.
- **A failed Save** keeps the draft, and its errors show in the dialog (spec FR-018).
- **Closing without a save** clears those errors.
