# Data Model: Theme Switch on the Options Page

The settings (`Config`, schemaVersion 4) and the export file don't change (spec FR-010, SC-004).

## Theme choice (stored, per device)

| Field | Value |
|---|---|
| Where | the extension origin's `localStorage`, key `kibanatool.theme` (`THEME_KEY` in `src/storage.ts`) |
| Values | `"system"`, `"light"`, `"dark"` (`THEME_CHOICES` in `src/theme.ts`) |
| Default | `"system"`: when the key is missing, holds anything else, or can't be read |
| Written by | the control, on every pick; System is written as `"system"` |

## Resolved theme (page state)

| Field | Value |
|---|---|
| Where | `document.documentElement.dataset.theme` (`html[data-theme]`) |
| Values | `"light"` or `"dark"`, never empty once the head script has run |
| Rule | `applyTheme(root, choice, systemDark)`: the choice itself, or for System the system's mode |

**Transitions:**

| Event | Who | What happens |
|---|---|---|
| Page load | `options-theme.js`, in `<head>` | read the choice, set `data-theme`, before the first frame |
| A pick | `ThemeSwitch` | set `data-theme`, then store the choice |
| The system's mode changes | `options-theme.js` | read the stored choice again and set `data-theme` (changes it only under System) |

A second open options page keeps its theme until its next load (spec assumption).
