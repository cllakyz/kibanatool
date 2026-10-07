// Shared shapes used across core, kibana and adapters.

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
