# Quickstart: Validating the Tabbed Options Page

Run this on branch `005-tabbed-options` before the pull request. The DOM and the selectors are in
[contracts/ui.md](contracts/ui.md), and the strings in [contracts/strings.md](contracts/strings.md).

## Gates

```bash
npm run typecheck                       # G1
npx vitest run                          # G2: unit + architecture + i18n parity + theme contrast
npm run build && npm run check:manifest # G3: the manifest is unchanged
./docker/up.sh 9                        # if the 9.x stack is not running
KT_STACK=9 npm run e2e -- options       # the options spec on one stack; CI runs G4 on 7, 8 and 9
```

- **Expected unit tests:** everything passes, with 6 more theme cases than the baseline of 565 at `d5d3281`
  (3 pairs × 2 themes).
- **Expected e2e:** `options.spec.ts` has 10 tests (8 adapted, 2 new), all passing.
- **Token check:** every `var(--kt-…)` in `entrypoints/options/options.css` is defined:

  ```bash
  grep -o 'var(--kt-[a-z-]*' entrypoints/options/options.css | sort -u
  ```

  Each name must be a key of `LIGHT` in `src/theme.ts` or `font-sans`/`font-mono`.

## Visual check (light and dark, Turkish, 1000px)

A scratchpad Playwright script, not committed (research R8):

1. `npm run build`.
2. Launch Chromium with `.output/chrome-mv3` loaded, as `tests/e2e/fixtures.ts` does, at a 1000×800 viewport. On
   this Mac the UI is Turkish because macOS is `tr-TR`. For English, add the arguments
   `-AppleLanguages (en-US)`.
3. Write `examples/kibanatool-settings.json` into `chrome.storage.local` through the service worker.
4. For `colorScheme: "light"` and `"dark"`, screenshot `options.html#environments`, `#variables`, `#actions`,
   `#copy` and `#transfer`, and once more with the action dialog open (click an Edit).

**Look for:**

- **SC-002:** all five Turkish tab names fit in the bar with no scrolling, and none is cut off.
- **The open tab:** its label is blue with a blue underline, and the `h1` names it.
- **The mark:** the light mark on the light bar, the dark mark on the dark bar.
- **Panels:** the count badges; "Satırda göster" badges only on the marked actions; the Copy rows with the label
  column on the left; the footer Save on Variables and Copy.
- **The dialog:** the backdrop dims the page, the header and footer stay put, and the shadow shows in light.
- **Narrow window:** at 700px, the Copy rows stack into one column and the tabs scroll sideways.

## Manual checks (docs/verification/2026-10-tabbed-options.md)

| Check | Spec | How |
|---|---|---|
| M1: keyboard | SC-006, FR-005 | Tab from the top: brand, five tabs, then the content, each with a focus ring. On Actions: Enter on Edit, Tab stays inside the dialog, Escape closes it, and focus is on Edit. |
| M2: screen reader | FR-005 | VoiceOver reads the open tab as "current page" and the bar by its label. |
| M3: themes | FR-007, SC-005 | Switch macOS between light and dark with the page open: the palette and the mark follow. |
| M4: flows | FR-019, SC-003 | Add an environment and grant access, edit a variable, add, edit and remove an action, save the copy settings, export, import the example file. |
