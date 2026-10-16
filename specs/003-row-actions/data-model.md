# Data Model: One-Click Action Buttons on Result Rows

## Settings (schemaVersion 4)

`Action` (link and Discover) gains one field. Nothing else in the settings changes.

| Field | Type | Default | Rule |
|---|---|---|---|
| `showInRow` | boolean | `false` | Required in version 4. FR-001, FR-002 |

- **Conversion** (`migrate` in `src/core/config.ts`, R14):

  | Stored version | Result |
  |---|---|
  | 1, 2 | `valueMasks` added as today, plus `showInRow: false` on every action |
  | 3 | `showInRow: false` on every action |
  | 4 | unchanged |
  | other | rejected as today; `storage.ts` falls back to the empty config |

- **New action** (`newAction`): `showInRow: false`.
- **Row actions** (`rowActions(actions)`): the given actions with `showInRow` true. It is always
  applied to `actionsForEnvironment(config, environmentId)`, which already removes disabled actions
  and actions for other environments (FR-004). It is the only place that rule lives (constitution II).
- **Export and import** carry the field as part of the action (FR-003).

## Row view (adapters)

```ts
interface RowView {
  /** The table row element: 7.17 `tr[data-test-subj="docTableRow"]`, 8.x/9.x `[role="row"]`. */
  row: Element;
  /** Null when the row cannot be identified; the row then gets no strip (FR-015). */
  identity: DocIdentity | null;
}
```

- `DocIdentity` is the existing `{ dataViewId, index, id }`.
- **7.17:** `index` and `id` come from `data-kibanatool-index` and `data-kibanatool-id`, which the
  bridge has just written (R2).
- **8.x/9.x:** `index` and `id` come from the selection checkbox, `<index>::<id>::<routing>` (R4).
- **Data view:** the page address, on every version (R5).
- **Freshness:** identities are read again at every pass and every hover. Rows are reused for other
  logs, so nothing is cached per element (R2).
  - **Why hover reads its own:** a reused row may change only its text, which the content script's
    observer does not see. So the strip never relies on the last pass's list.
  - **Fallback:** a hovered row whose log was not prefetched loads it on its own, and shows the
    loading mark meanwhile.

## Bridge protocol (7.17 page context)

| Item | Value |
|---|---|
| Request | `document.dispatchEvent(new CustomEvent("kibanatool:identify-rows"))` from the content script |
| Bridge reply | synchronous, during the dispatch: on each `docTableRow`, set `data-kibanatool-index` and `data-kibanatool-id`, or remove both |
| Read by | the content script, right after `dispatchEvent` returns |
| Carries | index and id only. Never a field value (FR-010) |
| When | only while row actions apply (FR-014); otherwise the bridge never runs past its listener |

## Document cache (Kibana client)

- **Key:** `<index>/<id>`. **Value:** a promise of the raw hit. The expanded bar's `fetchDoc` and
  `prefetchDocs` share it.
- **`prefetchDocs(refs)`:**
  - skips refs already cached;
  - groups the rest into one request (R6);
  - puts one promise per ref in the cache.

  | Result for a ref | Its promise |
  |---|---|
  | found | resolves with the hit |
  | missing from the answer | rejects with `notFound` |
  | the request failed | rejects with the request's error |

  A rejected entry is evicted, as today, so a later `fetchDoc` retries.
- **Cap:** at most `DOC_CACHE_LIMIT = 1000` entries. Adding one past that drops the oldest (R7).
- **Batch size:** the content script calls `prefetchDocs` with at most `ROW_BATCH_SIZE = 50` refs per
  call.

## Strip state

```
hidden ──pointer over / focus in an identified row──▶ shown(row)
shown(row) ──pointer moves to another identified row──▶ shown(other row)
shown(row) ──pointer leaves the row, focus not in it──▶ hidden
shown(row) ──scroll / resize──▶ hidden (the next pointer move shows it again)
```

Inside `shown(row)`, the strip's content follows that row's log:

| Log state | Strip shows |
|---|---|
| loading | a loading mark, named with `barLoading` (FR-009) |
| error | an error mark; its tooltip is the bar's message for that error (FR-009) |
| ready, no button | nothing: the host stays in the row but renders no box |
| ready, buttons | `ActionButtons` for the row actions, in the bar's order, greyed ones included (FR-005) |

## Strip position

Inputs, all from `getBoundingClientRect()`:

| Input | What it is |
|---|---|
| `row` | the row's rectangle |
| `viewport` | the nearest scrolling ancestor's rectangle; the row is clipped to it |
| `controlsLeft` | 7.17 only: the left edge of the last cell's filter buttons, when the last cell has them |
| `origin` | the host's own rectangle while it sits at `left: 0; top: 0`, i.e. its containing block's origin |

The host is a zero-size anchor at the strip's top-right corner. Inside the shadow root the strip is
`position: absolute; right: 0; top: 0`, so it grows to the left and its width never enters the
math.

Output: `{ left, top }` for the host, or `null` when the visible part is empty (the row is
scrolled out of view, or entirely left of `controlsLeft`). The math:

- `right = min(row.right, viewport.right, controlsLeft ?? Infinity) - gap`
- `left = right - origin.left`
- `top = max(row.top, viewport.top) + gap - origin.top`

## Strings

| Key | en | tr |
|---|---|---|
| `optionsShowInRow` | Show in row | Satırda göster |
| `rowStripLabel` | kibanatool actions | kibanatool aksiyonları |

## Seed

No change. The e2e specs use the existing `app_log`, `*_log` and `logs-*` documents (R16). The
SC-004 one-off adds 500 temporary documents and re-seeds afterwards (R17).
