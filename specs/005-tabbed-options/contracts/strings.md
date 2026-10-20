# Contract: UI Strings

Every key exists in both `public/_locales/en/messages.json` and `public/_locales/tr/messages.json`
(`tests/unit/i18n.test.ts`). The Turkish text addresses the reader as "siz", like `optionsVariablesNoEnvironments`.

## New keys (7)

| Key | English | Turkish |
|---|---|---|
| `optionsNavLabel` | Settings sections | Ayar bölümleri |
| `optionsMarkdownFieldsHelp` | One field per line. Empty: every field, alphabetically. | Her satıra bir alan. Boş bırakılırsa bütün alanlar, alfabetik sırayla. |
| `optionsMaskPatternsShort` | Masked fields | Maskelenecek alanlar |
| `optionsMaskPatternsLine` | One pattern per line. * matches anything; case does not matter. | Her satıra bir desen. * her şeyle eşleşir; büyük/küçük harf fark etmez. |
| `optionsExportHelp` | Saves environments, variables, actions, and copy and masking settings as one JSON file. | Ortamları, değişkenleri, aksiyonları ve kopyalama ile maskeleme ayarlarını tek bir JSON dosyasına kaydeder. |
| `optionsImportHelp` | Importing replaces all current settings. | İçe aktarma, mevcut bütün ayarların yerine geçer. |
| `optionsEmptyActions` | No actions yet. Add a link or Discover action to get started. | Henüz aksiyon yok. Başlamak için bir link ya da Discover aksiyonu ekleyin. |

`optionsExportHelp` differs from the design's table ("…actions and masking"), because the file also holds the
Markdown field list (research R6).

## Removed keys (2)

| Key | Replaced by |
|---|---|
| `optionsMarkdownFields` | `menuCopyMarkdown` (title) + `optionsMarkdownFieldsHelp` |
| `optionsMaskPatterns` | `optionsMaskPatternsShort` (title) + `optionsMaskPatternsLine` |

Only `entrypoints/options/CopySection.tsx` uses them. The older plans in `docs/superpowers/plans/` quote them as
history and stay as they are.

## Reused keys

| Where | Key |
|---|---|
| Tab names, the `h1` and each panel's `h2` | `optionsEnvironments`, `optionsVariables`, `optionsActions`, `optionsCopy`, `optionsTransfer` |
| Intro callouts | `optionsIntro` (Environments), `optionsVariablesHelp` (Variables), `optionsActionsHelp` (Actions) |
| Copy field title | `menuCopyMarkdown` |
| Value-mask field | `optionsValueMasks` (title), `optionsValueMasksHelp` (help) |
| Export and import titles | `optionsExport`, `optionsImport` |
| Action row badges | `optionsKindLink`, `optionsKindDiscover`, `optionsShowInRow` |
| Discover row second line | `optionsPreviewEmptyQuery`, `optionsPreviewWindow` |
| Dialog title while the label is empty | `optionsAddLink`, `optionsAddDiscover` |
| Dialog close button (`aria-label` and `title`) | `jsonClose` |
| Variables with no environment | `optionsVariablesNoEnvironments` |

The `h1` "kibanatool" and the muted `optionsIntro` paragraph under it go away. The brand in the navbar is the
literal "kibanatool", not a message, as before.
