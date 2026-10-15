<!--
Sync Impact Report
- Version change: 1.0.5 → 1.0.6 (PATCH)
- Modified: Known Deviations: D12 and D13 fixed and removed. The action bar gets the page and the
  clock as props, and settings-change subscriptions go through `src/storage.ts`
  (`store.onChange`). The bar no longer reads the clock itself either, an unlisted Principle V
  item found while specifying. Known Deviations is now empty.
- Added/removed sections: none
- History: 1.0.0 (2026-10-14) ratified from the architecture review at commit 56e48a2; 1.0.1
  clarified the Principle I import table; 1.0.2 enforced Principle I with
  `tests/unit/architecture.test.ts` and removed D1; 1.0.3 removed D9 and D10; 1.0.4 removed D2–D8;
  1.0.5 removed D11. The work is specs/001-fix-architecture-deviations.
- Templates: no change needed (plan-template.md reads Principles I–V at runtime).
- Deferred TODOs: none.
-->

# kibanatool Constitution

## Core Principles

### I. Dependencies Point Inward

Imports MUST follow this table. Anything not listed is forbidden.

| Module | May import |
|---|---|
| `src/core/**` | `src/core/**` and npm packages that do no I/O (today: `zod`) |
| `src/kibana/**` | `src/core/**`, npm packages |
| `src/adapters/**` | `src/kibana/**`, `src/core/**` |
| `src/background/**` | `src/core/**` |
| `src/*.ts` (shared root modules) | `src/core/**`, other root modules, `wxt/browser`; `src/i18n.ts` may also import `public/_locales/en/messages.json` |
| `src/content/**`, `src/options/**` | everything under `src/`, npm packages |
| `entrypoints/**` | everything under `src/`, npm packages, WXT virtual modules (`#imports`) |

- `src/core` MUST NOT reference `browser`, `chrome`, `window`, `document`, `location`,
  `navigator` or `fetch`.
- Nothing under `src/` imports from `entrypoints/`.
- The import graph MUST have no cycles.

Rationale: `src/core` holds the rules and is tested without a browser. Kibana's URL and API
formats change between 7.17, 8.x and 9.x and must stay in `src/kibana`, so a Kibana upgrade never
touches a rule.

### II. One Rule, One Place

- Each business rule has exactly one implementation, in `src/core`. Other layers, including the
  options UI, MUST call it and MUST NOT restate it. Examples: which environments an action applies
  to ("empty `environmentIds` means all"), when a template variable counts as missing, what counts
  as XML text, how deep structured text is expanded.
- A closed set of values (operators, mask kinds, …) is declared once as an `as const` array. Its
  zod schema (`z.enum(ARRAY)`) and its TypeScript type (`(typeof ARRAY)[number]`) MUST be derived
  from that array. `VALUE_MASK_KINDS` is the reference pattern.
- A shared limit or pattern is one exported constant, not a repeated literal.
- Before writing a helper, search `src/core` for an existing one.
- Exception: two pieces of code that look alike but MUST differ (for example `maskValue` and
  cURL's `maskKeepingText`) are allowed when a comment at the divergent one cites the spec section
  that requires the difference.

Rationale: copy-paste checks reported 0 clones, yet one rule existed in four copies. When those
copies drift, the options page shows different environments than the bar uses, and nothing fails.

### III. Shared Types Live With Their Concept

- A type used by more than one module lives in a neutral module for its concept (for example
  `src/core/types.ts` or `src/core/passive.ts`), not in its first consumer.
- Sibling modules (for example `link-actions.ts` and `discover-actions.ts`) MUST NOT import each
  other only to reach a shared type.
- Two types with the same shape and meaning MUST be one type. UI that renders the same shape the
  same way MUST be one component or helper, with the differences passed in as parameters.

Rationale: types parked in a consumer create coupling between siblings, and duplicate shapes
invite duplicate rendering code that drifts.

### IV. Failures Carry Their Reason

- A function whose caller must explain a failure MUST return a discriminated union that names the
  reason (`{ ok: false, reason }` or `{ ok: false, passive }`), as `fillTemplate` and
  `resolveLinkAction` do.
- `null` or `undefined` MAY mean "absent". They MUST NOT be a sentinel that a caller translates
  into one specific message, because a second source of `null` then shows the wrong message.

Rationale: an overloaded `null` turns an unrelated failure into a misleading notice for the user.

### V. Browser State Enters Through Parameters

- Page state (location, the stored config, the current time) and I/O APIs (fetch, storage,
  scripting, permissions) reach `src/` modules as parameters, props or narrow interfaces
  (`FetchFn`, `KibanaClient`, `StorageAreaLike`, `ScriptingLike`, `PermissionsLike`).
- Only `entrypoints/` read them from globals. Exceptions: `src/i18n.ts` (wraps `chrome.i18n`),
  `src/content/clipboard.ts` (wraps the clipboard) and DOM event listeners inside React
  components.
- React components MUST receive page location as props; they MUST NOT read `location` directly.
- Storage reads, writes and change subscriptions MUST go through `src/storage.ts`.
- An interface with a single implementation is allowed only when it is a test seam, that is,
  when a test substitutes it. Otherwise there is no interface.

Rationale: injected state keeps `src/` testable in happy-dom and keeps every browser dependency
visible at the composition roots.

## Quality Gates

A change MUST pass these gates before merge:

- **G1**: `npm run typecheck` is clean.
- **G2**: `npx vitest run` passes. It includes `tests/unit/architecture.test.ts`, which enforces
  Principle I: it reads every import under `src/` (type-only, re-exports and dynamic imports
  included), checks it against the table, rejects browser globals in `src/core` and import cycles.
  Its `EXCEPTIONS` list MUST mirror the open Principle I rows of "Known Deviations", and it only
  shrinks.
- **G3**: `npm run build && npm run check:manifest` pass.
- **G4**: the CI e2e matrix (Kibana 7, 8, 9) passes.
- Principles II–V have no automated gate. Review checks them (see below).

## Review Process and Known Deviations

- Every review (spec-kit `Constitution Check`, the final review of a plan, `/code-review`) checks
  Principles I–V on the changed code.
- New code MUST comply. A new deviation is allowed only when the plan's Complexity Tracking
  justifies it and the same change adds a row below.
- A change that touches a line listed below MUST fix that deviation and delete its row.
- Give the file and the symbol name with each line number, since lines move.

None open. A new row uses the next free number (D14 onward) and the columns #, Principle,
Where, Expected fix.

## Governance

- This constitution governs architecture and code structure. `CLAUDE.md` holds the runtime
  guidance: commands, Kibana version traps, Web Store and privacy constraints. If the two
  conflict, the same change amends one of them so they agree.
- Amendments: a change to this file states its reason, bumps the version, updates the Sync Impact
  Report and sets Last Amended.
- Versioning (semver): MAJOR removes or redefines a principle; MINOR adds a principle or section,
  or materially expands one; PATCH changes wording or adds or removes a Known Deviations row.
- Compliance: the spec-kit plan's Constitution Check uses Principles I–V and Gates G1–G4 as its
  gates. A violation that a plan keeps goes into that plan's Complexity Tracking table and into
  Known Deviations.

**Version**: 1.0.6 | **Ratified**: 2026-10-14 | **Last Amended**: 2026-10-14
