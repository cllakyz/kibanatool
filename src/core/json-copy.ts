// "Copy as JSON" (Plan 6 spec §6): the hit with its JSON and XML text expanded, masked like the Markdown copy.
import { expandStructured } from "./fields";
import { maskMatcher, maskValue } from "./mask";
import type { RawHit } from "./types";
import type { ValueMaskKind } from "./value-mask";

/** `_index` and `_id` are neither masked nor scanned, like the Markdown header and link; `_source` keeps its order. */
export function buildJson(hit: RawHit, maskPatterns: string[], valueMasks: readonly ValueMaskKind[]): string {
  const isMasked = maskMatcher(maskPatterns);
  const source = Object.fromEntries(
    Object.entries(hit._source ?? {}).map(([key, value]) => [key, maskValue(key, expandStructured(value), isMasked, valueMasks)]),
  );
  return JSON.stringify({ _index: hit._index, _id: hit._id, _source: source }, null, 2);
}
