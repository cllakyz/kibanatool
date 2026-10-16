// Talks to the user's Kibana with the user's own session (spec §6).
import { isPlainObject } from "../core/fields";
import type { DataViewSummary, RawHit } from "../core/types";

export type KibanaErrorKind = "forbidden" | "notFound" | "incompatible" | "server" | "network";

export class KibanaError extends Error {
  constructor(
    readonly kind: KibanaErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "KibanaError";
  }
}

export interface DataViewInfo {
  title: string;
  timeFieldName?: string;
}

/** One document to fetch: its index and id (spec 003 research R6). */
export interface DocRef {
  index: string;
  id: string;
}

export interface KibanaClient {
  fetchDoc(index: string, id: string): Promise<RawHit>;
  /** Spec 003 FR-013: one request for the distinct refs not cached yet; fills the cache per ref. Never rejects. */
  prefetchDocs(refs: readonly DocRef[]): Promise<void>;
  getDataView(id: string): Promise<DataViewInfo>;
  getVersion(): Promise<string | undefined>;
  /** The open space's data views (Plan 4 spec §5.2). */
  listDataViews(): Promise<DataViewSummary[]>;
}

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

/** Verified on 7.17.29, 8.15.3, 8.19.23 and 9.5.5 (9.x requires x-elastic-internal-origin). */
export const DOC_FETCH_HEADERS = {
  "kbn-xsrf": "kibanatool",
  "x-elastic-internal-origin": "Kibana",
  "content-type": "application/json",
};

/**
 * Spec 003 FR-016: the most documents kept in memory; the oldest goes first.
 * ponytail: fixed cap, twice the largest result list (500 rows); raise it if long sessions refetch noticeably.
 */
export const DOC_CACHE_LIMIT = 1000;

/** A request that has not answered by then is abandoned and reported as "network". */
export const REQUEST_TIMEOUT_MS = 15_000;

function errorFor(status: number): KibanaError {
  if (status === 401 || status === 403) return new KibanaError("forbidden", `HTTP ${status}`, status);
  if (status === 400 || status === 404) return new KibanaError("incompatible", `HTTP ${status}`, status);
  return new KibanaError("server", `HTTP ${status}`, status);
}

/** A 2xx body that is not a JSON object (an SSO page, `null`) is an unexpected response, not a TypeError. */
async function readJson<T extends object>(response: Response): Promise<T> {
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    // Only a non-JSON body (SyntaxError) is another API. A timeout/abort of AbortSignal.timeout on a body that is
    // still arriving, or a dropped connection (TypeError), is a slow or unreachable Kibana.
    if (error instanceof SyntaxError) throw new KibanaError("incompatible", "Unexpected response");
    throw new KibanaError("network", "Kibana is unreachable");
  }
  if (typeof body !== "object" || body === null) throw new KibanaError("incompatible", "Unexpected response");
  return body as T;
}

/** Entries with a string id and title; anything else in the list is skipped. */
function summaries(
  list: unknown,
  read: (item: Record<string, unknown>) => { id: unknown; title: unknown; name?: unknown },
): DataViewSummary[] {
  if (!Array.isArray(list)) throw new KibanaError("incompatible", "Unexpected data view list");
  return list.flatMap((item): DataViewSummary[] => {
    if (!isPlainObject(item)) return [];
    const { id, title, name } = read(item);
    if (typeof id !== "string" || typeof title !== "string") return [];
    return [typeof name === "string" && name !== "" ? { id, title, name } : { id, title }];
  });
}

export function createKibanaClient(options: { prefix: string; fetch: FetchFn; timeoutMs?: number }): KibanaClient {
  const { prefix, fetch, timeoutMs = REQUEST_TIMEOUT_MS } = options;
  const docs = new Map<string, Promise<RawHit>>();
  const dataViews = new Map<string, Promise<DataViewInfo>>();
  const lists = new Map<string, Promise<DataViewSummary[]>>();
  let version: Promise<string | undefined> | undefined;

  async function request(path: string, init?: RequestInit): Promise<Response> {
    try {
      return await fetch(prefix + path, { credentials: "same-origin", signal: AbortSignal.timeout(timeoutMs), ...init });
    } catch {
      throw new KibanaError("network", "Kibana is unreachable");
    }
  }

  /** Caches by key; a failed lookup is evicted so the next call retries. */
  function cached<T>(cache: Map<string, Promise<T>>, key: string, load: () => Promise<T>): Promise<T> {
    let pending = cache.get(key);
    if (!pending) {
      pending = load();
      remember(cache, key, pending);
    }
    return pending;
  }

  function remember<T>(cache: Map<string, Promise<T>>, key: string, pending: Promise<T>): void {
    cache.set(key, pending);
    pending.catch(() => {
      if (cache.get(key) === pending) cache.delete(key);
    });
    // Only the document cache grows with the page; Map keeps insertion order, so the first key is the oldest.
    if (cache === docs && docs.size > DOC_CACHE_LIMIT) docs.delete(docs.keys().next().value as string);
  }

  async function loadDoc(index: string, id: string): Promise<RawHit> {
    const response = await request("/internal/search/es", {
      method: "POST",
      headers: DOC_FETCH_HEADERS,
      body: JSON.stringify({ params: { index, body: { size: 1, query: { ids: { values: [id] } } } } }),
    });
    if (!response.ok) throw errorFor(response.status);
    const body = await readJson<{ rawResponse?: { hits?: { hits?: RawHit[] } } }>(response);
    const hits = body.rawResponse?.hits?.hits;
    if (!Array.isArray(hits)) throw new KibanaError("incompatible", "Unexpected response");
    const hit = hits[0];
    if (!hit) throw new KibanaError("notFound", "Document not found");
    return hit;
  }

  /** Research R6: one exact request; a plain ids query across indices could also match the same id elsewhere. */
  async function loadDocs(byIndex: Map<string, string[]>): Promise<Map<string, RawHit>> {
    const should = [...byIndex].map(([index, ids]) => ({ bool: { filter: [{ term: { _index: index } }, { ids: { values: ids } }] } }));
    const size = [...byIndex.values()].reduce((total, ids) => total + ids.length, 0);
    const response = await request("/internal/search/es", {
      method: "POST",
      headers: DOC_FETCH_HEADERS,
      body: JSON.stringify({
        params: { index: [...byIndex.keys()].join(","), body: { size, query: { bool: { should, minimum_should_match: 1 } } } },
      }),
    });
    if (!response.ok) throw errorFor(response.status);
    const body = await readJson<{ rawResponse?: { hits?: { hits?: RawHit[] } } }>(response);
    const hits = body.rawResponse?.hits?.hits;
    if (!Array.isArray(hits)) throw new KibanaError("incompatible", "Unexpected response");
    return new Map(hits.map((hit) => [`${hit._index}/${hit._id}`, hit]));
  }

  async function prefetchDocs(refs: readonly DocRef[]): Promise<void> {
    const byIndex = new Map<string, string[]>();
    const keys = new Set<string>();
    for (const ref of refs) {
      const key = `${ref.index}/${ref.id}`;
      if (docs.has(key) || keys.has(key)) continue;
      keys.add(key);
      byIndex.set(ref.index, [...(byIndex.get(ref.index) ?? []), ref.id]);
    }
    if (keys.size === 0) return;
    const batch = loadDocs(byIndex);
    for (const key of keys) {
      remember(
        docs,
        key,
        batch.then((found) => {
          const hit = found.get(key);
          if (!hit) throw new KibanaError("notFound", "Document not found");
          return hit;
        }),
      );
    }
    // The entries carry the outcome; the caller only starts the fetch.
    await batch.catch(() => undefined);
  }

  async function loadDataView(id: string): Promise<DataViewInfo> {
    const encoded = encodeURIComponent(id);
    let response = await request(`/api/data_views/data_view/${encoded}`);
    if (response.status === 404) response = await request(`/api/index_patterns/index_pattern/${encoded}`);
    if (response.status === 404) throw new KibanaError("notFound", "Data view not found", 404);
    if (!response.ok) throw errorFor(response.status);
    const body = await readJson<{
      data_view?: { title?: string; timeFieldName?: string };
      index_pattern?: { title?: string; timeFieldName?: string };
    }>(response);
    const view = body.data_view ?? body.index_pattern;
    if (!view?.title) throw new KibanaError("incompatible", "Unexpected data view response");
    return { title: view.title, timeFieldName: view.timeFieldName || undefined };
  }

  async function loadDataViewList(): Promise<DataViewSummary[]> {
    let response = await request("/api/data_views");
    if (response.status === 404) {
      // 7.17 has no data views API. Its saved objects carry the index pattern as title, and no name.
      response = await request("/api/saved_objects/_find?type=index-pattern&fields=title&per_page=10000");
      if (!response.ok) throw errorFor(response.status);
      const body = await readJson<{ saved_objects?: unknown }>(response);
      return summaries(body.saved_objects, (item) => ({
        id: item.id,
        title: isPlainObject(item.attributes) ? item.attributes.title : undefined,
      }));
    }
    if (!response.ok) throw errorFor(response.status);
    const body = await readJson<{ data_view?: unknown }>(response);
    return summaries(body.data_view, (item) => ({ id: item.id, title: item.title, name: item.name }));
  }

  async function loadVersion(): Promise<string | undefined> {
    try {
      const response = await request("/api/status");
      if (!response.ok) return undefined;
      return (await readJson<{ version?: { number?: string } }>(response)).version?.number;
    } catch {
      return undefined;
    }
  }

  return {
    fetchDoc: (index, id) => cached(docs, `${index}/${id}`, () => loadDoc(index, id)),
    prefetchDocs,
    getDataView: (id) => cached(dataViews, id, () => loadDataView(id)),
    listDataViews: () => cached(lists, "all", loadDataViewList),
    async getVersion() {
      version ??= loadVersion();
      const number = await version;
      if (number === undefined) version = undefined; // a failed lookup is retried next time
      return number;
    },
  };
}
