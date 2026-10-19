# Quickstart: Validating the Mask Explanation

Run this on branch `004-mask-scope-docs` before the pull request. The expected text is in
[contracts/ui-text.md](contracts/ui-text.md).

## Gates

```bash
npm run typecheck                       # G1
npx vitest run                          # G2: unit tests + architecture + i18n parity
npm run build && npm run check:manifest # G3: the manifest is unchanged
KT_STACK=9 npm run e2e -- options       # the options spec on one stack; CI runs G4 on all three
```

- **Expected:** everything passes, with 2 more unit tests than the baseline at `aec94c5`
  (563 unit tests) and one more e2e check in `options.spec.ts`.

## Checks

1. **SC-002: copies are unchanged.** `git diff main --stat -- src/core` prints nothing: no rule changed.
2. **The note (FR-002, SC-001).** Load `.output/chrome-mv3`, open the options page and look under "Copy and
   masking". Below the mask patterns there is a note that explains the whole-value mask and the `*token` example,
   in English and in Turkish (switch Chrome's language, or read both locale files).
3. **Value masks (FR-003, SC-003).** The note under "Mask inside values" names Markdown, JSON and cURL, and
   `grep -n "optionsValueMasksHelp" public/_locales/*/messages.json` shows both languages saying "every copy".
4. **README (FR-004).** The "Copy and masking" section has the new paragraph, with the `*token` example and the
   `*.token` warning.
