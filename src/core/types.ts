// Shared shapes used across core, kibana and adapters.
import type { PassiveReason } from "./passive";

/** A button of the action bar: a working link, or greyed out with its reason (Plan 4 spec §5.3). */
export type ActionButton = { id: string; label: string; url: string } | { id: string; label: string; passive: PassiveReason };

/** Which document an open detail view shows (spec §5). */
export interface DocIdentity {
  dataViewId: string;
  index: string;
  id: string;
}

/** The part of an Elasticsearch hit the extension uses. */
export interface RawHit {
  _id: string;
  _index: string;
  _source?: Record<string, unknown>;
}

/** Discover's `_g.time`: relative ("now-15m") or absolute ISO dates. */
export interface TimeRange {
  from: string;
  to: string;
}

/** One entry of a space's data view list (Plan 4 spec §5.2). `name` exists on 8.x/9.x only. */
export interface DataViewSummary {
  id: string;
  title: string;
  name?: string;
}
