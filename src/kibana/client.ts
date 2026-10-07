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

function errorFor(status: number): KibanaError {
  if (status === 401 || status === 403) return new KibanaError("forbidden", `HTTP ${status}`, status);
  if (status === 400 || status === 404) return new KibanaError("incompatible", `HTTP ${status}`, status);
  return new KibanaError("server", `HTTP ${status}`, status);
}

export function createKibanaClient(options: { prefix: string; fetch: FetchFn }): KibanaClient {
  const { prefix, fetch } = options;
  const docs = new Map<string, Promise<RawHit>>();
  const dataViews = new Map<string, Promise<DataViewInfo>>();

  async function request(path: string, init?: RequestInit): Promise<Response> {
    try {
      return await fetch(prefix + path, { credentials: "same-origin", ...init });
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
    const body = (await response.json()) as { rawResponse?: { hits?: { hits?: RawHit[] } } };
    const hit = body.rawResponse?.hits?.hits?.[0];
    if (!hit) throw new KibanaError("notFound", "Document not found");
    return hit;
  }

  async function loadDataView(id: string): Promise<DataViewInfo> {
    const encoded = encodeURIComponent(id);
    let response = await request(`/api/data_views/data_view/${encoded}`);
    if (response.status === 404) response = await request(`/api/index_patterns/index_pattern/${encoded}`);
    if (!response.ok) throw errorFor(response.status);
    const body = (await response.json()) as {
      data_view?: { title?: string; timeFieldName?: string };
      index_pattern?: { title?: string; timeFieldName?: string };
    };
    const view = body.data_view ?? body.index_pattern;
    if (!view?.title) throw new KibanaError("incompatible", "Unexpected data view response");
    return { title: view.title, timeFieldName: view.timeFieldName || undefined };
  }

  return {
    fetchDoc: (index, id) => cached(docs, `${index}/${id}`, () => loadDoc(index, id)),
    getDataView: (id) => cached(dataViews, id, () => loadDataView(id)),
    async getVersion() {
      try {
        const response = await request("/api/status");
        if (!response.ok) return undefined;
        const body = (await response.json()) as { version?: { number?: string } };
        return body.version?.number;
      } catch {
        return undefined;
      }
    },
  };
}
