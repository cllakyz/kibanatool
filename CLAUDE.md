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
npm test                    # vitest run, all unit tests
npx vitest run tests/unit/core/template.test.ts   # one test file (add -t "<name>" for one test)
npm run typecheck           # tsc --noEmit
npm run build               # → .output/chrome-mv3 (load unpacked in chrome://extensions)
npm run check:manifest      # run after build; fails if the manifest asks for more permissions than allowed
npm run dev                 # WXT dev mode
```

Dev Kibana stacks: `./docker/up.sh 8|9` starts Kibana 8.19.23 on :18601 or 9.5.5 on :19601, with security on and anonymous browser login. It also seeds synthetic logs. `./docker/down.sh 8|9` stops a stack and deletes its data. `./docker/obs-view.sh 9` switches the 9.x default space to the Observability view, where ECS logs open the flyout on the "Log overview" tab. There is no 7.17 stack in `docker/`, and no Playwright/e2e harness in the repo yet.

## Architecture

**The content script is not in the manifest.** The manifest has only `storage` + `scripting` and `optional_host_permissions`. When the user adds a Kibana environment on the options page, the options page requests that origin. `entrypoints/background.ts` → `src/background/registration.ts` then registers `kibana.js` with `scripting.registerContentScripts` for the granted origins only. It re-syncs on install, startup, permission changes and config changes, one run at a time (`serialized`). `scripts/check-manifest.mjs` fails if `content_scripts` or `host_permissions` ever appear in the built manifest.

**Runtime flow** (`entrypoints/kibana.ts`, a `defineUnlistedScript`):
1. A debounced MutationObserver calls `findDetailViews` (`src/adapters/detect.ts`). It does nothing outside Discover and in ES|QL mode.
2. Adapters find open detail views. The 7.17 adapter (`legacy-table.ts`) looks for expanded `docTableDetailsRow` rows. The 8.x/9.x adapter (`data-grid.ts`) looks for the `docViewerFlyout` flyout. Each view yields a `DocIdentity` (`dataViewId`, `_index`, `_id`). The identity comes from Kibana's own links, decoded in `src/kibana/locator.ts`: the 7.17 `#/doc/<dv>/<index>?id=` href, or the 8.x/9.x `DISCOVER_SINGLE_DOC_LOCATOR` `lz` param. If neither link is there, the adapter reads the `tableDocViewRow-_id/_index-value` rows instead.
3. `reconcileMounts` (`src/content/mounts.ts`) keeps exactly one `<kibanatool-bar>` host per detail container. Each host gets a shadow root with its own React root.
4. `ActionBar` calls `client.fetchDoc` (`src/kibana/client.ts`), then `flattenDoc` → `buildLinkButtons` (`src/core/`).

**Layers:**
- `src/core/` is pure logic with no browser APIs: the config schema (zod), field flattening (which also expands JSON-string values), `{path|fallback}` templates, and conditions.
- `src/kibana/` handles Kibana I/O and URL/state parsing.
- `src/adapters/` only reads the DOM.
- `src/storage.ts` is the only place that touches `chrome.storage`. It validates config on both load and save. A corrupt stored config becomes the empty config.
- `activeEnvironment` picks the environment with the longest matching `kibanaUrl` base path.

## Traps

- **Never read field values from the DOM.** 8.x/9.x show them formatted, and the field table is virtualized. Always fetch the raw doc.
- The doc fetch is `POST <prefix>/internal/search/es`, verified on 7.17/8.15/8.19/9.5. 9.x rejects it without `x-elastic-internal-origin: Kibana`. 7.17 needs the `params.body` shape. All versions need `kbn-xsrf`. For data views, `/api/data_views` returns 404 on 7.17, so the client falls back to `/api/index_patterns`.
- The `<prefix>` (base path + space) is everything before `/app/` in the path (`src/kibana/prefix.ts`).
- `z.config({ jitless: true })` in `src/core/config.ts` must stay. MV3 CSP forbids eval.
- The locator `lz` param must be decoded with `decompressFromBase64`. The URI-safe decoder silently corrupts it.
- The content script must never break Kibana. Keep errors contained and log them only with `console.debug("[kibanatool]", …)`.
- Render log values through React only; never use `innerHTML`. URL template values go through `encodeURIComponent`, and only `http(s)` templates are accepted.
- A new UI string needs a key in the `MessageKey` union in `src/i18n.ts` and an entry in both `public/_locales/en/messages.json` and `public/_locales/tr/messages.json`.
- Unit tests run in the `node` environment by default. DOM tests opt in per file with `// @vitest-environment happy-dom`. Tests use fake `fetch`/`scripting`/`permissions` objects (see the `*Like` interfaces), not WXT mocks.

## Docs

Code comments cite the design spec by section (`spec §5.1`). The spec and plans live in `docs/superpowers/`, which is gitignored, local-only and written in Turkish, so a fresh clone won't have them. `docs/verification/` is tracked. Plan 1 (link actions) is done. Plan 2 will add discover actions, copy/mask, a JSON view and the full options UI. Plan 3 will add the Playwright e2e matrix, CI and the store release.
