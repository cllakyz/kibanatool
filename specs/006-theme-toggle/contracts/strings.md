# Contract: UI Strings

Every key exists in both `public/_locales/en/messages.json` and `public/_locales/tr/messages.json`
(`tests/unit/i18n.test.ts`). The names were chosen by the user (2026-10-20).

## New keys (4)

| Key | English | Turkish | Used as |
|---|---|---|---|
| `optionsTheme` | Theme | Tema | the radio group's `aria-label` |
| `optionsThemeSystem` | System | Sistem | the System radio's `aria-label` and its label's `title` |
| `optionsThemeLight` | Light | Açık | the same, for Light |
| `optionsThemeDark` | Dark | Koyu | the same, for Dark |

No key is removed or reused.
