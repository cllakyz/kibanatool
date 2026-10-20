# Quickstart: Validating the Theme Switch

Run this on branch `006-theme-toggle` before the pull request. The DOM and the test are in
[contracts/ui.md](contracts/ui.md), the strings in [contracts/strings.md](contracts/strings.md).

## Gates

```bash
npm run typecheck                       # G1
npx vitest run                          # G2: unit + architecture + i18n parity + theme contrast
npm run build && npm run check:manifest # G3: the manifest is unchanged
./docker/up.sh 9                        # if the 9.x stack is not running
KT_STACK=9 npm run e2e -- options       # the options spec on one stack; CI runs G4 on 7, 8 and 9
```

- **Expected unit tests:** all pass, with the new `applyTheme`, `loadThemeChoice` and `saveThemeChoice` cases on
  top of the 571 at `3ea227e`.
- **Expected e2e:** `options.spec.ts` has 11 tests, all passing.
- **Built page:** `.output/chrome-mv3/options-theme.js` exists, and `.output/chrome-mv3/options.html` loads it in
  `<head>` as a classic script:

  ```bash
  grep -o '<script[^>]*>' .output/chrome-mv3/options.html   # first: <script src="/options-theme.js">, no type
  ```

## First frame and fit (scratchpad Playwright probe, not committed)

Launch Chromium with `.output/chrome-mv3` loaded, as `tests/e2e/fixtures.ts` does.

1. **First frame:** with `colorScheme: "light"` and `kibanatool.theme` = `"dark"` in the page's `localStorage`,
   reload 10 times with a `requestAnimationFrame` init-script probe. Expect `data-theme="dark"` and the palette
   `<style>` in place at the first frame in 10 of 10 (SC-002).
2. **Fit:** at 1000×800 in Turkish, `.nav-tabs` `scrollWidth` ≤ `clientWidth`, and the control is fully inside the
   bar (SC-003). At 700px the tabs scroll and the control's box stays fully visible.

## Visual check (light and dark, Turkish, 1000px)

Screenshot `options.html#environments` and `#actions` with the action dialog open:

- with the system light and the choice Dark, and with the system dark and the choice Light;
- with System in each system mode.

**Look for:**

- **Whole page in the chosen theme:** panels, inputs, the scrollbar, the file picker button on `#transfer`, the
  dialog backdrop, and the matching mark.
- **The control:** the selected segment filled blue with a light icon (dark icon on the dark theme), the others
  muted, all three icons crisp at 16px.
- **The bar:** the five Turkish tabs uncut, the control and the version at the right.

## Manual checks (docs/verification/2026-10-theme-switch.md)

| Check | Spec | How |
|---|---|---|
| M1: keyboard and VoiceOver | FR-004, FR-005, SC-006 | Tab from the top: brand, five tabs, then one stop on the control, with a focus ring. The arrow keys change the theme. VoiceOver reads "Tema", the option's name and "seçili". Hover shows each name. |
| M2: live system switch | FR-007, spec 005 M3 | Page open on System: switch macOS between light and dark; the palette and the mark follow. On Light or Dark: the page stays. |
| M3: no flash, persistence | FR-008, FR-009, SC-002 | System light, choice Dark: reload several times and reopen the page; no light frame. Quit and restart Chrome; still Dark. |
| M4: Kibana unchanged | FR-012, SC-007 | Choice Dark, Kibana light: the action bar and the row buttons are light, as before. The toolbar icon follows the browser, not the choice. |
| M5: import | FR-010 | Choice Light, import `examples/kibanatool-settings.json`: the page stays Light. |
