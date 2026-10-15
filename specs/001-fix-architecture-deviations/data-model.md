# Data Model: Fix Architecture Deviations D1–D13

This feature changes no stored data. The settings schema stays at version 3 (FR-023). The entities
below are code-structure entities. The changed type shapes are in
[contracts/module-interfaces.md](contracts/module-interfaces.md).

## Known Deviation

Lives in the constitution, in the "Known Deviations" table.

| Field | Meaning |
|---|---|
| ID | D1–D13 |
| Principle | I–V |
| Where | file:line at 56e48a2, plus the symbol name |
| Expected fix | default approach (R1 overrides D1's) |

**Lifecycle**: open → fixed. When a story's commit lands, that story's rows are deleted and the
constitution gets a PATCH bump (R18). There is no "fixed" state stored: a missing row means fixed.

| Story | Rows |
|---|---|
| US1 | D1 |
| US2 | D2–D8 (plus the unlisted FR-012 and FR-013) |
| US3 | D9, D10 |
| US4 | D11 |
| US5 | D12, D13 (plus the unlisted FR-018) |

## Import table

The constitution's Principle I table, clarified in v1.0.1 (R3), mirrored in
`tests/unit/architecture.test.ts`.

| Group | Path rule | May import (groups) | npm |
|---|---|---|---|
| core | `src/core/**` | core | `zod` |
| kibana | `src/kibana/**` | core, kibana | any |
| adapters | `src/adapters/**` | adapters, kibana, core | none |
| background | `src/background/**` | background, core | none |
| root | `src/*.ts` | core, root | `wxt/browser` |
| content | `src/content/**` | any `src/` group | any |
| options | `src/options/**` | any `src/` group | any |

- **Single file rule**: `src/i18n.ts` may import `public/_locales/en/messages.json`.
- **Not scanned**: `src/**/*.d.ts` (ambient declarations); `entrypoints/**` (nothing may import
  it).
- **Exceptions**: an array of `{ from, to }` pairs that mirrors the open Principle I deviations.
  It is empty at the end (FR-003).
- **Extra checks for core**: no free reference to `window`, `document`, `location`, `navigator`,
  `fetch`, `chrome` or `browser`. No cycles anywhere under `src/`.

## Business rules: one owner each

| Rule | Owner (single definition) | Callers |
|---|---|---|
| Environment scope (FR-005) | `config.ts`: `appliesToAll`, `appliesTo` | `actionsForEnvironment`, `variableWarnings`, `ActionEditor`, `ActionsSection` |
| Condition operators (FR-006) | `config.ts`: `CONDITION_OPS` | `conditionSchema`, `ConditionOp` type, `ActionEditor` (SC-005: a new operator also needs its `case` in `evaluateCondition` and its entry in `ActionEditor`'s `OPERATORS` map, which is "its label". A missing entry is a compile error, because the map is `Record<ConditionOp, MessageKey>`.) |
| Expansion depth (FR-007) | `fields.ts`: `MAX_TEXT_DEPTH` | `expandStructured`, `flattenSource`, `curl.ts` |
| XML text (FR-008) | `xml.ts`: `isXmlText` | `parseXml`, `parseStructuredText`, `curl.ts`, `json-tree.ts` |
| Base path (FR-009) | `config.ts`: `basePathOf` | `matchLength`, `kibanaUrlKey`, `entrypoints/kibana.ts` |
| Missing variable (FR-010) | `template.ts`: `missingVariable` / `missingVariables` | `fillTemplate`, `variableWarnings` |
| Action gating (FR-011) | `conditions.ts`: `gateAction` | `resolveLinkAction`, `resolveDiscoverQuery` |
| http(s) prefix (FR-012) | `template.ts`: `startsWithHttp` | `isHttpUrlTemplate`, `invalidLeadingVariable` |

## Action outcome types (Principle III)

| Type | Home | Shape |
|---|---|---|
| `PassiveReason` | `passive.ts` | unchanged |
| `HiddenReason` | `passive.ts` (moved from `link-actions.ts`) | unchanged |
| `ActionButton` | `types.ts` (replaces `LinkButton` and `DiscoverButton`) | `{ id, label, url }` or `{ id, label, passive }` |
| `Gate` | `conditions.ts` | `{ ok: true, text }` or `{ ok: false, reason }` (disabled, conditions or missingValue) or `{ ok: false, passive }` |
| `DiscoverTarget` | `discover-actions.ts` | `{ dataViewId, query, time? }` |

## Copy item (Principle IV)

| Field | Before | After |
|---|---|---|
| `label` | string | string |
| `text` | `() => string \| null` | unchanged; `null` means unavailable |
| `unavailable` | none | `MessageKey`, optional. It is the notice shown when `text()` returns `null`; when absent, the notice is `noticeCopyFailed` |
