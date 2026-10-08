// Reads Discover's app state (`_a`, rison) from the URL hash (spec §5.1).
import rison from "rison-node";

export interface DiscoverAppState {
  index?: string;
  dataSource?: { type?: string; dataViewId?: string };
  query?: { language?: string; query?: unknown; esql?: string };
}

export function readAppState(hash: string): DiscoverAppState {
  const queryStart = hash.indexOf("?");
  if (queryStart === -1) return {};
  const raw = new URLSearchParams(hash.slice(queryStart + 1)).get("_a");
  if (!raw) return {};
  try {
    const decoded = rison.decode(raw);
    return typeof decoded === "object" && decoded !== null && !Array.isArray(decoded)
      ? (decoded as DiscoverAppState)
      : {};
  } catch {
    return {};
  }
}

/** 8.x/9.x use dataSource.dataViewId; 7.17 uses index. */
export function dataViewIdFromState(state: DiscoverAppState): string | undefined {
  return state.dataSource?.dataViewId ?? state.index;
}

/** ES|QL mode has no data view, so the extension stays inactive. */
export function isEsqlState(state: DiscoverAppState): boolean {
  return state.dataSource?.type === "esql" || typeof state.query?.esql === "string";
}
