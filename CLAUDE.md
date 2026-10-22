# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

kibanatool is a Chrome MV3 extension (WXT + React 19 + TypeScript strict) that adds action buttons to the
open log in Kibana Discover. The buttons are built from the raw fields of that log. It must work on Kibana
7.17, 8.x and 9.x at the same time, and it ships to the Chrome Web Store. So keep permissions minimal: no
remote code, no telemetry, local-only storage.

## Commands

```bash
npm install                 # postinstall runs `wxt prepare`, which generates .wxt/tsconfig.json (tsconfig extends it)
npx vitest run tests/unit/core/template.test.ts   # one test file (add -t "<name>" for one test)
npm --prefix website start   # the website in website/: dev server
npm --prefix website test && npm --prefix website run build && npm --prefix website run smoke   # its checks (smoke serves the build)
npm run build               # → .output/chrome-mv3 (load unpacked in chrome://extensions)
npm run check:manifest      # run after build; fails if the manifest asks for more permissions than allowed
KT_STACK=9 npm run e2e      # builds, then runs tests/e2e against the running docker stack 7|8|9
npm run icons               # re-render public/icon/*.png and public/icon-dark/*.png from assets/icon.svg and icon-dark.svg
npm run zip                 # store package: .output/kibanatool-<version>-chrome.zip
```

Dev Kibana stacks: `./docker/up.sh 7|8|9` starts Kibana 7.17.29 on :17601 under the `/kibana` base path, 8.19.23 on :18601 or 9.5.5 on :19601, with security on and anonymous browser login (as `kt_anon`; Elasticsearch anonymous access is off). It re-seeds the same synthetic logs, data views, a `test` space, an `obs` Observability space (9.x) and the read-only user `kt_reader` on every run. `./docker/down.sh 7|8|9` stops a stack and deletes its data. Secrets are in `docker/.env.<major>`; never print them.

## Architecture

**The content script is not in the manifest.** The manifest has only `storage` + `scripting` and `optional_host_permissions`. When the user adds a Kibana environment on the options page, the options page requests that origin. `entrypoints/background.ts` → `src/background/registration.ts` then registers `kibana.js` with `scripting.registerContentScripts` for the granted origins only. It re-syncs on install, startup, permission changes and config changes, one run at a time (`serialized`). Next to it, the same origins get `kibana-bridge.js` (`entrypoints/kibana-bridge.ts`), registered with `world: "MAIN"`: the page-context script that reads a 7.17 result row's index and id from Kibana's React data. It stays idle until the content script dispatches `kibanatool:identify-rows`, then writes `data-kibanatool-index`/`-id` on the rows during that dispatch. Registration checks each script id on its own, because older installs hold only `kibana.js`. `scripts/check-manifest.mjs` fails if `content_scripts` or `host_permissions` ever appear in the built manifest, or if either script is missing.

**Row buttons** (spec-kit 003): actions with `showInRow` (`rowActions`) appear in a strip on the hovered or focused Discover result row. One `kibanatool-row` host moves into the active row (`src/content/row-host.ts`), out of flow. `RowStrip` renders through the bar's own `log-buttons.tsx`. The rows' logs are prefetched in batches of up to 50 (`KibanaClient.prefetchDocs`, one exact `_index` + `ids` request) into the cache the bar shares, capped at 1,000 documents. Nothing runs while no action is marked.

**Website** (plan 8): the Docusaurus site is in `website/`, a separate package that never imports the extension's `src/`. The release box and the releases page read `CHANGELOG.md` at build time (`website/plugins/changelog.mjs`); the store address lives in `website/src/constants.ts`. `.github/workflows/website.yml` builds and smoke-tests it on pull requests that touch `website/**` or `CHANGELOG.md`, and publishes it to GitHub Pages on push to `main`.

**Layers:**
- `src/core/` is pure logic with no browser APIs: the config schema (zod), field flattening (which also expands JSON, XML and form text; `xml.ts` is the XML parser, `form.ts` the form one), `{path|fallback}` templates, conditions, and copy masking: by field name (`mask.ts`) and inside values (`value-mask.ts`: IBAN, TCKN, GSM, card). `curl.ts` writes the request a log records as a masked cURL command.
- `src/kibana/` handles Kibana I/O and URL/state parsing.
- `src/adapters/` only reads the DOM.
- `tests/unit/architecture.test.ts` enforces which layer may import which (the constitution's import table), keeps browser globals out of `src/core` and forbids import cycles.
- `src/theme.ts` holds every color: the Borealis light and dark palettes, as `--kt-*` custom properties for the bar's shadow root and the options page. `tests/unit/theme.test.ts` fails if a pair drops below its WCAG contrast floor.
- `src/storage.ts` is the only place that touches `chrome.storage`. It validates config on both load and save. A corrupt stored config becomes the empty config.
- `activeEnvironment` picks the environment with the longest matching `kibanaUrl` base path.
- Discover actions may name their target data view (`dataViewName`). The bar reads the open space's data view list once per page (`/api/data_views`, or `saved_objects/_find` on 7.17), only when an action needs it.

## Traps

- **Never read field values from the DOM.** 8.x/9.x show them formatted, and the field table is virtualized. Always fetch the raw doc.
- The doc fetch is `POST <prefix>/internal/search/es`, verified on 7.17/8.15/8.19/9.5. 9.x rejects it without `x-elastic-internal-origin: Kibana`. 7.17 needs the `params.body` shape. All versions need `kbn-xsrf`. For data views, `/api/data_views` returns 404 on 7.17, so the client falls back to `/api/index_patterns`.
- The `<prefix>` (base path + space) is everything before `/app/` in the path (`src/kibana/prefix.ts`).
- `z.config({ jitless: true })` in `src/core/config.ts` must stay. MV3 CSP forbids eval.
- The locator `lz` param must be decoded with `decompressFromBase64`. The URI-safe decoder silently corrupts it.
- The content script must never break Kibana. Keep errors contained and log them only with `console.debug("[kibanatool]", …)`.
- The toolbar icon follows the browser's color scheme: the options page and the content script send `kibanatool:theme` (`src/toolbar-icon.ts`) and the background calls `action.setIcon`, because a service worker cannot read `prefers-color-scheme`. The manifest itself holds only the light set.
- The options page's theme choice (System, Light, Dark) lives in the extension's `localStorage` under `kibanatool.theme`, never in `chrome.storage` or the settings. `src/theme.ts` reads and writes it, not `src/storage.ts` (constitution V names this exception): through `src/storage.ts` the head script would bundle the settings schema and zod. `options-theme.js` (`entrypoints/options-theme.ts`), a classic script in the page's `<head>`, injects the palette and sets `html[data-theme]` before the first frame: never make it `type="module"`, `defer` or `async`, or the page flashes the other theme. Its `vite-ignore` attribute only keeps Vite from warning about it. The toolbar icon's `kibanatool:theme` report still follows the browser; don't wire it, the action bar or the row strip to the choice.
- The bar picks light or dark from the first opaque background behind its host (`themeBehind`), not from Kibana's theme setting: 7.17, 8.x and 9.x mark the theme differently, and 9.x can follow the system.
- The View panel (`panelFields` in `src/core/json-tree.ts`) lists structured text, plus other text that is multi-line or at least `TEXT_VIEW_MIN_LENGTH` (500) characters. The tree and the text view share one search rule, `searchPattern`: `iu`, never `g`, because a global regex keeps `lastIndex` between `.test` calls.
- Render log values through React only; never use `innerHTML`. Log field values in URL templates go through `encodeURIComponent`, and templates must start with `http(s)://` or an `{env.…}` placeholder.
- Settings validation repairs, it does not reject, unknown environmentIds: parseConfig drops them and disables an action left with none (an empty list would mean "all environments").
- XML text is parsed by `src/core/xml.ts`, never `DOMParser`: core has no browser APIs, and happy-dom (the unit tests' DOM) rejects CDATA and undeclared prefixes that Chrome accepts. Its values are always strings; `@name` keys are attributes and `#text` the text beside them, so the placeholder pattern allows `#`.
- Form text needs two or more `&`-joined `key=value` pairs whose keys never start with a bracket; a single `k=v` stays text. Form text never starts with `{`, `[` or `<`, so `parseStructured` (`src/core/fields.ts`) picks the kind by the first character, and every consumer reads the kind from it.
- The copies run `expandStructured` before `maskValue`; `maskValue` masks any JSON, XML or form text still left past the 5-level expansion cap as a whole. The cURL copy is the exception: it must send the request as it was, so `curl.ts` masks JSON and form text inside and writes it back as text (unchanged form pairs keep their raw bytes), and leaves other text (plain, HTML, XML) as it is with only the value masks.
- A 7.17 collapsed row's log identity lives only in React data (`__reactInternalInstance$…` → `memoizedProps.row`), readable only in the page's context (`reactRowHit` in `src/adapters/legacy-rows.ts`). Kibana reuses rows for other logs after a search or sort, so identity is read fresh at every pass and every hover, never cached per element. The page-context script must not import `wxt/browser` or use any extension API.
- 8.x/9.x row identity is the selection checkbox's `dscGridSelectDoc-<index>::<id>::<routing>`. Inside the grid, `position: fixed` is not viewport-relative (an ancestor makes a containing block), so the row host measures its own origin. 7.17's cell filter buttons sit at each cell's top right, so the strip ends left of the last cell's.
- The content script's `MutationObserver` keeps `attributeFilter: ["href"]`. Widening it would make the page-context script's row attributes trigger passes.
- The three dev stacks share the `localhost` cookie `sid`, so a browser that visits one stack logs another out. Use one stack per browser session (e2e runs one stack at a time).
- `{env.<name>}` placeholder paths are environment variables, never log fields. Their values go into link URLs unencoded (they come from the user's settings, not the log); field values are always encoded.
- A settings schema change bumps `schemaVersion` and converts older input inside `parseConfig`. `storage.ts` turns anything `parseConfig` rejects into the empty config, so a missing conversion silently wipes stored settings.
- The options page is five hash tabs (`#environments` … `#transfer`). Every section stays mounted and the closed ones are `hidden`, so unsaved edits survive a tab switch. No element id may equal a tab id: the browser would scroll to it under the sticky navbar. The action editor is a native `<dialog>` styled only as `dialog.modal[open]`. Every exit unmounts it, focus goes back to the opener in a passive effect's cleanup (a layout cleanup runs while the page is still inert), and a `hashchange` drops the draft, since a hidden modal would keep the page inert.
- A new UI string needs an entry in both `public/_locales/en/messages.json` and `public/_locales/tr/messages.json`. `MessageKey` in `src/i18n.ts` is derived from the English file, and `tests/unit/i18n.test.ts` keeps the two in step.
- The user manual lives in the website docs; the README stays short. A changed extension UI string means updating the docs in both languages. A docs page is added in `website/docs/` and `website/i18n/tr/docusaurus-plugin-content-docs/current/` together (`website/tests/docs-parity.test.mjs` fails otherwise). Never put `{…}` code in a `translate()` message (Docusaurus reads `{name}` as a placeholder; pass code through `values`). `website/static/img/icon.svg` and `favicon.png` are copies of `assets/icon.svg` and `public/icon/32.png`.
- `docker/seed.mjs` is a contract with `tests/e2e` (ids, values, times): change both together. `tests/fixtures/*.json` are captured from the stacks (`KT_CAPTURE=1 npm run e2e -- capture`); refresh them after a Kibana upgrade instead of editing them.

## Docs

Code comments cite the design spec by section (`spec §5.1`). The design specs and plans live in `docs/superpowers/` and are written in Turkish. `docs/verification/` is tracked. Plans 1 (link actions), 2 (Discover actions, copy/mask, JSON view, full options page), 3 (e2e matrix, CI, store package), 4 (environment variables, data views by name), 5 (masking inside values), 6 (XML as JSON, "Copy as JSON"), 7 ("Copy as cURL") and 8 (the website) are done, and so are spec-kit features 002 (`specs/002-plain-text-viewer/`: form data as structured text, the text view), 003 (`specs/003-row-actions/`: one-click buttons on result rows), 004 (`specs/004-mask-scope-docs/`: how far a field-name mask reaches, explained on the options page and in the docs), 005 (`specs/005-tabbed-options/`: the options page in five tabs, the action editor in a dialog) and 006 (`specs/006-theme-toggle/`: a System, Light or Dark switch on the options page). `.github/workflows/ci.yml` runs the unit checks and the e2e matrix on every pull request to `main` (not on pushes, so a direct push to `main` is not tested).

The architecture rules (principles I–V, quality gates, known deviations) are in the spec-kit constitution `.specify/memory/constitution.md`. Follow it in every plan and review, not only in spec-kit commands. Spec-kit features (spec, plan, tasks) live in `specs/`.
