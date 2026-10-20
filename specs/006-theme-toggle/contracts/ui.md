# Contract: Theme Control, DOM and CSS

What `tests/e2e/options.spec.ts` selects on, and what `entrypoints/options/options.css` styles. Spec 005's
[contracts/ui.md](../../005-tabbed-options/contracts/ui.md) still holds for the rest of the page.

## Head

```text
head
├── … <title>
├── script[src="/options-theme.js"]        classic, no type="module", no defer/async
└── (built) script[type="module"], link[rel="stylesheet"]
```

`options-theme.js` appends one `<style>`:

```css
:root[data-theme="light"] { color-scheme: light; /* --kt-* from LIGHT */ }
:root[data-theme="dark"] { color-scheme: dark; /* --kt-* from DARK */ }
```

and sets `html[data-theme]` to `light` or `dark`.

## Navbar

```text
header.nav
├── a.nav-brand[href="#environments"]
│   ├── img.logo-light[alt=""][width=24][height=24]    iconPaths(false)["48"]
│   ├── img.logo-dark[alt=""][width=24][height=24]     iconPaths(true)["48"]
│   └── "kibanatool"
├── nav.nav-tabs[aria-label=optionsNavLabel] …      unchanged
├── div.theme-switch[role="radiogroup"][aria-label=optionsTheme]
│   └── label[title=<name>] × 3                     System, Light, Dark, in this order
│       ├── input[type="radio"][name="theme"][value="system|light|dark"][aria-label=<name>]
│       └── svg[aria-hidden="true"]                 monitor, sun, moon
└── span.nav-version                                unchanged
```

- **Checked:** the radio whose value is the stored choice (`system` when none).
- **CSS hooks:**
  - `:root[data-theme="dark"] .logo-light` and `:root:not([data-theme="dark"]) .logo-dark` are `display: none`.
  - `.nav { gap: 24px }`. `.theme-switch { flex: none; margin-left: auto }`, and `.nav-version` loses its
    `margin-left: auto`.
  - `.theme-switch label`: a 28×28 segment, `text-muted` icon; `:hover` → `text-primary`;
    `:has(:checked)` → `primary` background, `on-primary` icon; `:has(:focus-visible)` → 2px `text-primary` ring.
  - `.theme-switch input`: visually hidden, still focusable.
- **No element id** equals a tab id (spec 005); the control adds no id.

## e2e test

**"switches the page theme, keeps it from the first frame, follows the system on System, and leaves it out of the
export (spec 006 FR-016)"**, with `configure()` (the e2e config):

1. Before opening: `context.addInitScript` registers a `requestAnimationFrame` callback that stores
   `document.documentElement.dataset.theme` in `window.__ktFirstFrameTheme`.
2. Open the options page and `emulateMedia({ colorScheme: "light" })`.
   - `html` has `data-theme="light"`, and `input[name="theme"][value="system"]` is checked.
3. Click the `label` that holds `input[value="dark"]`. A hidden radio can't take `check()`, so the test clicks
   its label.
   - `html` has `data-theme="dark"`, that radio is checked, and `body`'s background is `DARK["surface-page"]`.
4. Reload.
   - `window.__ktFirstFrameTheme` is `"dark"`, read with `expect.poll`: the first frame can come a moment after
     the `h1` counts as visible (3 of 20 probe reloads).
   - The dark radio is still checked.
5. Click the System label, then `emulateMedia({ colorScheme: "dark" })` after the page has loaded, so the head
   script's `change` listener fires.
   - `data-theme` is `dark`. Then `emulateMedia({ colorScheme: "light" })`: `data-theme` is `light`.
6. Keyboard (spec FR-004): focus `a.tab[href="#transfer"]` and press Tab.
   - `input[name="theme"][value="system"]`, the checked one, is focused.
   - Press ArrowRight twice: `input[value="dark"]` is checked, and `data-theme` is `dark`.
7. Open `#transfer` and export.
   - The file equals `e2eConfig()`.

No assertion reads localized text; the names are checked by the manual VoiceOver check (M1).
