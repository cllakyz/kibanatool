// Talks to the user's Kibana with the user's own session (spec §6).
import type { RawHit } from "../core/types";

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

export interface KibanaClient {
  fetchDoc(index: string, id: string): Promise<RawHit>;
  getDataView(id: string): Promise<DataViewInfo>;
  getVersion(): Promise<string | undefined>;
}

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

/** Verified on 7.17.29, 8.15.3, 8.19.23 and 9.5.5 (9.x requires x-elastic-internal-origin). */
export const DOC_FETCH_HEADERS = {
  "kbn-xsrf": "kibanatool",
  "x-elastic-internal-origin": "Kibana",
  "content-type": "application/json",
};

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
  } catch {
    throw new KibanaError("incompatible", "Unexpected response");
  }
  if (typeof body !== "object" || body === null) throw new KibanaError("incompatible", "Unexpected response");
  return body as T;
}

export function createKibanaClient(options: { prefix: string; fetch: FetchFn; timeoutMs?: number }): KibanaClient {
  const { prefix, fetch, timeoutMs = REQUEST_TIMEOUT_MS } = options;
  const docs = new Map<string, Promise<RawHit>>();
  const dataViews = new Map<string, Promise<DataViewInfo>>();
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
      cache.set(key, pending);
      pending.catch(() => cache.delete(key));
    }
    return pending;
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
    getDataView: (id) => cached(dataViews, id, () => loadDataView(id)),
    async getVersion() {
      version ??= loadVersion();
      const number = await version;
      if (number === undefined) version = undefined; // a failed lookup is retried next time
      return number;
    },
  };
}
