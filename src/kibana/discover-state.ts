// Reads Discover's URL state (`_a`, `_g`; rison) from the hash (spec §5.1, §7.3, §7.4).
import rison from "rison-node";
import { isPlainObject } from "../core/fields";
import type { TimeRange } from "../core/types";

/** Decoded `_a`. It comes from the URL, so every value is type-checked before use. */
export type DiscoverAppState = Record<string, unknown>;

/** The rison object in hash parameter `name` ("_a", "_g"); {} when missing or not an object. */
export function readRisonParam(hash: string, name: string): Record<string, unknown> {
  const queryStart = hash.indexOf("?");
  if (queryStart === -1) return {};
  const raw = new URLSearchParams(hash.slice(queryStart + 1)).get(name);
  if (!raw) return {};
  try {
    const decoded: unknown = rison.decode(raw);
    return isPlainObject(decoded) ? decoded : {};
  } catch {
    return {};
  }
}

export function readAppState(hash: string): DiscoverAppState {
  return readRisonParam(hash, "_a");
}

/** `_g.time` when both ends are strings. */
export function readGlobalTime(hash: string): TimeRange | undefined {
  const time = readRisonParam(hash, "_g").time;
  return isPlainObject(time) && typeof time.from === "string" && typeof time.to === "string"
    ? { from: time.from, to: time.to }
    : undefined;
}

/** 8.x/9.x use dataSource.dataViewId; 7.17 uses index. Only a non-empty string is accepted. */
export function dataViewIdFromState(state: DiscoverAppState): string | undefined {
  const fromSource = isPlainObject(state.dataSource) ? state.dataSource.dataViewId : undefined;
  for (const id of [fromSource, state.index]) {
    if (typeof id === "string" && id !== "") return id;
  }
  return undefined;
}

/** ES|QL mode has no data view, so the extension stays inactive. */
export function isEsqlState(state: DiscoverAppState): boolean {
  return (
    (isPlainObject(state.dataSource) && state.dataSource.type === "esql") ||
    (isPlainObject(state.query) && typeof state.query.esql === "string")
  );
}
