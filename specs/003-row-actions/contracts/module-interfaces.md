# Contract: Module Interfaces That Change

The manifest, the storage key and the expanded bar's requests stay the same. This contract lists the
new and changed exported signatures, the page-context protocol, the UI strings and the e2e hooks, so
that tasks and reviews can check them. Anything not listed keeps its signature. The decisions
(R1–R20) are in [../research.md](../research.md); the shapes are in [../data-model.md](../data-model.md).

## Settings: `src/core/config.ts` (R14)

```ts
// actionBase gains:  showInRow: z.boolean()
// configSchema:      schemaVersion: z.literal(4)
export const SCHEMA_VERSION = 4;
/** The actions shown on result rows: the given actions with showInRow on (FR-004). The one place for this rule. */
export function rowActions(actions: Action[]): Action[];
```

`migrate` accepts versions 1, 2 and 3 and adds `showInRow: false` to every action that lacks it.

`src/options/model.ts`: `newAction(kind, id?)` returns `showInRow: false`.

`entrypoints/options/ActionEditor.tsx`: a checkbox labelled `optionsShowInRow`, right after
`optionsEnabled`.

## Kibana client: `src/kibana/client.ts` (R6, R7)

```ts
export interface DocRef { index: string; id: string }
export const DOC_CACHE_LIMIT = 1000;
export interface KibanaClient {
  fetchDoc(index: string, id: string): Promise<RawHit>;   // unchanged; reads the shared cache
  /** One request for the distinct refs not cached yet; fills the cache per ref. Never rejects. */
  prefetchDocs(refs: readonly DocRef[]): Promise<void>;
  getDataView(id: string): Promise<DataViewInfo>;          // unchanged
  getVersion(): Promise<string | undefined>;               // unchanged
  listDataViews(): Promise<DataViewSummary[]>;             // unchanged
}
```

Request: `POST <prefix>/internal/search/es`, with the `DOC_FETCH_HEADERS` headers and this body:

```json
{ "params": { "index": "<distinct indices joined by ,>", "body": { "size": <refs>,
  "query": { "bool": { "minimum_should_match": 1, "should": [
    { "bool": { "filter": [ { "term": { "_index": "<index>" } }, { "ids": { "values": ["<id>", …] } } ] } }
  ] } } } } }
```

## Adapters (R1, R4, R5)

```ts
// src/adapters/types.ts
export interface RowView { row: Element; identity: DocIdentity | null }

// src/adapters/legacy-rows.ts (7.17)
export const LEGACY_ROW_SELECTOR = 'tr[data-test-subj="docTableRow"]';
export const IDENTIFY_ROWS_EVENT = "kibanatool:identify-rows";
export const ROW_INDEX_ATTR = "data-kibanatool-index";
export const ROW_ID_ATTR = "data-kibanatool-id";
/** Index and id from Kibana's React data on the row element (page context only); null when not found. */
export function reactRowHit(row: Element): { index: string; id: string } | null;
/** Rows with the identity the bridge wrote; call right after dispatching IDENTIFY_ROWS_EVENT. */
export function findLegacyRows(root: ParentNode, dataViewId: string | undefined): RowView[];
export function legacyRowIdentity(row: Element, dataViewId: string | undefined): DocIdentity | null;
/** The left edge of the last cell's filter buttons, which the strip must not cover; undefined when it has none. */
export function rowControlsLeft(row: Element): number | undefined;

// src/adapters/grid-rows.ts (8.x/9.x)
export const GRID_ROW_SELECTOR = '[role="row"]';
/** "<index>::<id>::<routing>" → index and id; null when malformed. */
export function parseGridDocId(value: string): { index: string; id: string } | null;
export function findGridRows(root: ParentNode, dataViewId: string | undefined): RowView[];
/** The grid row around `target` that has a selection checkbox (never the header row), and its identity. */
export function gridRowOf(target: Element): Element | null;
export function gridRowIdentity(row: Element, dataViewId: string | undefined): DocIdentity | null;

// src/adapters/detect.ts
/** Rows of Discover's main result table; [] off Discover, on #/context/ and #/doc/ routes, in ES|QL mode, or with no rows (R5). */
export function findRows(doc: Document, location: { pathname: string; hash: string }, prefix: string): RowView[];
/** The row element that contains `target`, if it is a result row of either kind. */
export function rowOf(target: Element): Element | null;
```

## Page-context script (R2, R3)

- `entrypoints/kibana-bridge.ts`, a WXT unlisted script built as `kibana-bridge.js`.
  - It imports only `src/adapters/legacy-rows.ts`, and never `wxt/browser` or an extension API.
  - On `IDENTIFY_ROWS_EVENT` it sets or removes `ROW_INDEX_ATTR`/`ROW_ID_ATTR` on every
    `LEGACY_ROW_SELECTOR` row, using `reactRowHit`. Otherwise it does nothing.
- `src/background/registration.ts`:

```ts
export const BRIDGE_SCRIPT_ID = "kibanatool-bridge";
export const BRIDGE_SCRIPT_FILE = "kibana-bridge.js";
export interface RegisteredScript { id; matches; js; runAt: "document_start" | "document_idle"; persistAcrossSessions; world?: "MAIN" }
// syncContentScripts registers, updates and unregisters both scripts together, with the same matches.
// Existence is checked per id: a missing script is registered, a present one updated (R3).
// The bridge runs at document_start; the content script stays at document_idle.
```

- `scripts/check-manifest.mjs` also fails when `kibana-bridge.js` is missing from the build output.

## Content (R9–R13)

```ts
// src/content/log-buttons.tsx (moved out of ActionBar.tsx)
export type LogState =
  | { status: "loading" }
  | { status: "ready"; hit: RawHit; timeFields: ReadonlyMap<string, string | undefined>; dataViews: readonly DataViewSummary[] | null }
  | { status: "error"; message: string };
export function useLogState(identity: DocIdentity, actions: Action[], client: KibanaClient): LogState;
export function buildButtons(hit: RawHit, actions: Action[], context: {
  prefix: string; dataViewId: string; hash: string; environment: Environment;
  timeFields: ReadonlyMap<string, string | undefined>; dataViews: readonly DataViewSummary[] | null;
}): { links: ActionButton[]; discover: ActionButton[] };
export function ActionButtons(props: { links: ActionButton[]; discover: ActionButton[]; environmentName: string }): JSX.Element;

// src/content/RowStrip.tsx
export interface RowStripProps {
  identity: DocIdentity;
  actions: Action[];            // already rowActions(...)
  client: KibanaClient;
  prefix: string;
  page: Pick<Location, "hash">;
  environment: Environment;
}
export function RowStrip(props: RowStripProps): JSX.Element | null;

// src/content/rows.ts
export const ROW_BATCH_SIZE = 50;
export const ROW_HOST_TAG = "kibanatool-row";
/** Splits refs into batches of at most ROW_BATCH_SIZE. */
export function batches<T>(refs: readonly T[]): T[][];
export interface Rect { left: number; top: number; right: number; bottom: number }
/** The host's anchor (the strip's top-right corner) in its containing block's coordinates; null when the row is not visible. */
export function stripPosition(input: { row: Rect; viewport: Rect; controlsLeft?: number; origin: { left: number; top: number } }):
  { left: number; top: number } | null;
```

`ActionBar` keeps its props and output. It now uses `useLogState`, `buildButtons` and
`ActionButtons` internally.

```ts
// src/content/row-host.ts: the DOM glue, with the document passed in (constitution V)
export interface RowHostOptions {
  /** The ROW_HOST_TAG element; the entrypoint created it and its shadow root holds the React root. */
  host: HTMLElement;
  /** The result row containing `target`, or null (detect.ts `rowOf`). */
  rowOf: (target: Element) => Element | null;
  /** Fresh identity of `row` at every call: rows are reused for other logs (R2). */
  identify: (row: Element) => DocIdentity | null;
  /** 7.17: the left edge of Kibana's own buttons in the row's last cell (legacy-rows `rowControlsLeft`). */
  controlsLeft?: (row: Element) => number | undefined;
  render: (target: { row: Element; identity: DocIdentity } | null) => void;
}
export interface RowHost {
  /** false: detach the host, render(null), ignore events (FR-014). true: follow pointer and focus. */
  setActive(active: boolean): void;
  /** Called by every pass: re-identify the active row, re-render if its identity changed, hide if it is gone. */
  refresh(): void;
  destroy(): void;
}
export function createRowHost(doc: Document, options: RowHostOptions): RowHost;
```

`createRowHost` does three things:

- **Tracks** the active row (R11). It listens for `pointerover`, `pointermove`, `focusin` and
  `focusout`, and for `pointerleave` on the document element. Scroll and resize hide the strip.
- **Places** the host into the active row as its last child. It moves the host only when the active
  row changes (R9), and positions it with `stripPosition` (R10).
- **Calls** `render`.

`entrypoints/kibana.ts` creates the host, its shadow root (`BAR_CSS`) and the React root, and calls
`createRowHost`. Its `identify` dispatches `IDENTIFY_ROWS_EVENT` and then calls `rowIdentity`.

In its existing pass, while `rowActions(...)` is not empty, it:

1. calls `rowHost.setActive(true)` and `rowHost.refresh()`;
2. dispatches `IDENTIFY_ROWS_EVENT`;
3. calls `findRows`;
4. sends the identified rows' refs to `client.prefetchDocs` in `batches`. The client skips the refs
   it already holds.

Otherwise it calls `rowHost.setActive(false)`.

```ts
// src/adapters/detect.ts, also:
/** Identity of one result row, with the same route and ES|QL gating as findRows; null otherwise. */
export function rowIdentity(row: Element, location: { pathname: string; hash: string }, prefix: string): DocIdentity | null;
```

## Strings (`public/_locales/{en,tr}/messages.json`)

| Key | en | tr |
|---|---|---|
| `optionsShowInRow` | Show in row | Satırda göster |
| `rowStripLabel` | kibanatool actions | kibanatool aksiyonları |

## E2E hooks (no localized text, `tests/CLAUDE.md`)

- **The strip:** `locator("kibanatool-row")`. Its buttons are reached by role and by the action
  labels from `e2eConfig()`, and the group by `role="group"`.
- **Rows:**
  - 7.17: `[data-test-subj="docTableRow"]`;
  - 8.x/9.x: `[role="row"]:has([data-test-subj^="dscGridSelectDoc-"])`.
- **Not expanded:**
  - 7.17: no `[data-test-subj="docTableDetailsRow"]`;
  - 8.x/9.x: no `[data-test-subj="docViewerFlyout"]`.
- **The extension's requests:** requests whose `kbn-xsrf` header is `kibanatool`.
- **Settings:** `e2eConfig()` moves to `schemaVersion: 4`, with `showInRow: false` on every action.
  `rows.spec.ts` turns it on where it needs it.
