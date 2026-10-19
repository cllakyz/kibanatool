# Data Model: Explain How Far a Field-Name Mask Reaches

Nothing in the data model changes. The settings format stays at schemaVersion 4, the default mask patterns stay
as they are, and every copy keeps its exact output (FR-001, FR-007, SC-002).

The only things that change are user-facing text and tests:

| Item | Change | Where |
|---|---|---|
| `optionsMaskPatternsHelp` | new string, en and tr | `public/_locales/{en,tr}/messages.json` |
| `optionsValueMasksHelp` | corrected text, en and tr | same |
| Mask patterns note | new muted paragraph, linked to the textarea | `entrypoints/options/CopySection.tsx` |
| Masking paragraph | new | `README.md` |
| Rule tests | two new unit tests, one e2e check | `tests/unit/core/mask.test.ts`, `tests/e2e/options.spec.ts` |

The exact text is in [contracts/ui-text.md](contracts/ui-text.md).
