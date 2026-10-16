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
npm run build               # → .output/chrome-mv3 (load unpacked in chrome://extensions)
npm run check:manifest      # run after build; fails if the manifest asks for more permissions than allowed
KT_STACK=9 npm run e2e      # builds, then runs tests/e2e against the running docker stack 7|8|9
npm run icons               # re-render public/icon/*.png and public/icon-dark/*.png from assets/icon.svg and icon-dark.svg
npm run zip                 # store package: .output/kibanatool-<version>-chrome.zip
```

Dev Kibana stacks: `./docker/up.sh 7|8|9` starts Kibana 7.17.29 on :17601 under the `/kibana` base path, 8.19.23 on :18601 or 9.5.5 on :19601, with security on and anonymous browser login (as `kt_anon`; Elasticsearch anonymous access is off). It re-seeds the same synthetic logs, data views, a `test` space, an `obs` Observability space (9.x) and the read-only user `kt_reader` on every run. `./docker/down.sh 7|8|9` stops a stack and deletes its data. Secrets are in `docker/.env.<major>`; never print them.

## Architecture

**The content script is not in the manifest.** The manifest has only `storage` + `scripting` and `optional_host_permissions`. When the user adds a Kibana environment on the options page, the options page requests that origin. `entrypoints/background.ts` → `src/background/registration.ts` then registers `kibana.js` with `scripting.registerContentScripts` for the granted origins only. It re-syncs on install, startup, permission changes and config changes, one run at a time (`serialized`). `scripts/check-manifest.mjs` fails if `content_scripts` or `host_permissions` ever appear in the built manifest.

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
- The bar picks light or dark from the first opaque background behind its host (`themeBehind`), not from Kibana's theme setting: 7.17, 8.x and 9.x mark the theme differently, and 9.x can follow the system.
- The View panel (`panelFields` in `src/core/json-tree.ts`) lists structured text, plus other text that is multi-line or at least `TEXT_VIEW_MIN_LENGTH` (500) characters. The tree and the text view share one search rule, `searchPattern`: `iu`, never `g`, because a global regex keeps `lastIndex` between `.test` calls.
- Render log values through React only; never use `innerHTML`. Log field values in URL templates go through `encodeURIComponent`, and templates must start with `http(s)://` or an `{env.…}` placeholder.
- Settings validation repairs, it does not reject, unknown environmentIds: parseConfig drops them and disables an action left with none (an empty list would mean "all environments").
- XML text is parsed by `src/core/xml.ts`, never `DOMParser`: core has no browser APIs, and happy-dom (the unit tests' DOM) rejects CDATA and undeclared prefixes that Chrome accepts. Its values are always strings; `@name` keys are attributes and `#text` the text beside them, so the placeholder pattern allows `#`.
- Form text needs two or more `&`-joined `key=value` pairs whose keys never start with a bracket; a single `k=v` stays text. Form text never starts with `{`, `[` or `<`, so `parseStructured` (`src/core/fields.ts`) picks the kind by the first character, and every consumer reads the kind from it.
- The copies run `expandStructured` before `maskValue`; `maskValue` masks any JSON, XML or form text still left past the 5-level expansion cap as a whole. The cURL copy is the exception: it must send the request as it was, so `curl.ts` masks JSON and form text inside and writes it back as text (unchanged form pairs keep their raw bytes), and leaves other text (plain, HTML, XML) as it is with only the value masks.
- `{env.<name>}` placeholder paths are environment variables, never log fields. Their values go into link URLs unencoded (they come from the user's settings, not the log); field values are always encoded.
- A settings schema change bumps `schemaVersion` and converts older input inside `parseConfig`. `storage.ts` turns anything `parseConfig` rejects into the empty config, so a missing conversion silently wipes stored settings.
- A new UI string needs an entry in both `public/_locales/en/messages.json` and `public/_locales/tr/messages.json`. `MessageKey` in `src/i18n.ts` is derived from the English file, and `tests/unit/i18n.test.ts` keeps the two in step.
- `docker/seed.mjs` is a contract with `tests/e2e` (ids, values, times): change both together. `tests/fixtures/*.json` are captured from the stacks (`KT_CAPTURE=1 npm run e2e -- capture`); refresh them after a Kibana upgrade instead of editing them.

## Docs

Code comments cite the design spec by section (`spec §5.1`). The design specs and plans live in `docs/superpowers/` and are written in Turkish. `docs/verification/` is tracked. Plans 1 (link actions), 2 (Discover actions, copy/mask, JSON view, full options page), 3 (e2e matrix, CI, store package), 4 (environment variables, data views by name), 5 (masking inside values), 6 (XML as JSON, "Copy as JSON") and 7 ("Copy as cURL") are done, and so is spec-kit feature 002 (`specs/002-plain-text-viewer/`: form data as structured text, the text view). `.github/workflows/ci.yml` runs the unit checks and the e2e matrix on every pull request.

The architecture rules (principles I–V, quality gates, known deviations) are in the spec-kit constitution `.specify/memory/constitution.md`. Follow it in every plan and review, not only in spec-kit commands. Spec-kit features (spec, plan, tasks) live in `specs/`.
