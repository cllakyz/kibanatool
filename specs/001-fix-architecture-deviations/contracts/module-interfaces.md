# Contract: Module Interfaces That Change

kibanatool has no external interface that changes here. The settings file, the storage key, the
Kibana requests and the DOM it renders all stay the same (FR-022, FR-023). This contract lists the
exported internal signatures that change, so that tasks and reviews can check them. Anything not
listed keeps its signature. Decisions R1–R17 are in [../research.md](../research.md).

## `src/core/discover-actions.ts` (R1, R14)

```ts
// before
interface DiscoverContext { prefix: string; dataViewId; currentTime?; timeFields; variables; dataViews }
type DiscoverButton = { id; label; url } | { id; label; passive };
// after
export interface DiscoverTarget { dataViewId: string; query: string; time?: TimeRange }
interface DiscoverContext { link: (target: DiscoverTarget) => string; dataViewId; currentTime?; timeFields; variables; dataViews }
buildDiscoverButtons(actions, fields, context): ActionButton[]
// no import from src/kibana
```

## `src/kibana/url.ts` (R1)

```ts
discoverUrl(options: { prefix: string } & DiscoverTarget): string   // same output as today
```

## `src/core/link-actions.ts` (R10, R13, R14)

```ts
buildLinkButtons(actions, fields, variables): ActionButton[]   // LinkButton removed
// HiddenReason no longer exported here
```

## `src/core/passive.ts` (R13)

```ts
export type HiddenReason = "disabled" | "conditions" | "missingValue" | "invalidUrl";   // moved here
```

## `src/core/types.ts` (R14)

```ts
export type ActionButton = { id: string; label: string; url: string } | { id: string; label: string; passive: PassiveReason };
```

## `src/core/conditions.ts` (R5, R10)

```ts
export type Condition = Action["conditions"][number];   // was a hand-written interface
export type ConditionOp = Condition["op"];
export type Gate =
  | { ok: true; text: string }
  | { ok: false; reason: Exclude<HiddenReason, "invalidUrl"> }
  | { ok: false; passive: PassiveReason };
export function gateAction(
  action: Pick<Action, "enabled" | "conditions">, template: string, fields: FieldMap, variables: Variables, encoders: Encoders,
): Gate;
```

## `src/core/config.ts` (R4, R5, R8)

```ts
export const CONDITION_OPS: readonly ["exists", "equals", "notEquals", "contains", "startsWith"];
export function appliesToAll(action: Pick<Action, "environmentIds">): boolean;
export function appliesTo(action: Pick<Action, "environmentIds">, environmentId: string): boolean;
```

## `src/core/template.ts` (R9, R11)

```ts
export function missingVariables(template: string, variables: Variables): string[];
export function startsWithHttp(text: string): boolean;
```

## `src/core/fields.ts` and `src/core/xml.ts` (R6, R7)

```ts
export const MAX_TEXT_DEPTH = 5;           // fields.ts (was the private MAX_JSON_DEPTH)
export function isXmlText(text: string): boolean;   // xml.ts
```

## `src/storage.ts` (R17)

```ts
interface StorageAreaLike {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  onChanged: { addListener(callback: (changes: Record<string, unknown>) => void): void };   // new
}
createConfigStore(area): { load(); save(config); onChange(listener: () => void): void }   // onChange new
// isConfigChange removed
```

## `src/content/ActionBar.tsx` (R16)

```ts
interface ActionBarProps {
  identity; actions; client; prefix; copy; environment;
  page: Pick<Location, "href" | "hash" | "origin">;   // replaces hash: string
  now: () => Date;                                     // new
}
```

## `src/content/CopyMenu.tsx` (R15)

```ts
interface CopyItem { label: string; text: () => string | null; unavailable?: MessageKey }
CopyMenu(props: { items: CopyItem[]; onCopy: (text: string) => void; onFail: (notice: MessageKey) => void })
```
