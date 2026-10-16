import { describe, expect, it } from "vitest";
import { DOC_CACHE_LIMIT, KibanaError, createKibanaClient } from "../../../src/kibana/client";

interface Call {
  url: string;
  init?: RequestInit;
}

function fakeFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fetch = async (url: string, init?: RequestInit): Promise<Response> => {
    calls.push({ url, init });
    return handler(url, init);
  };
  return { fetch, calls };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const HIT = { _id: "abc", _index: "app_log", _source: { user_id: 7 } };
const searchOk = () => json({ rawResponse: { hits: { hits: [HIT] } } });

async function kindOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "resolved";
  } catch (error) {
    return error instanceof KibanaError ? error.kind : "other";
  }
}

describe("fetchDoc", () => {
  it("sends the verified universal request under the prefix", async () => {
    const { fetch, calls } = fakeFetch(searchOk);
    const client = createKibanaClient({ prefix: "/kibana/s/team", fetch });
    await expect(client.fetchDoc("app_log", "abc")).resolves.toEqual(HIT);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("/kibana/s/team/internal/search/es");
    expect(calls[0]!.init).toMatchObject({
      method: "POST",
      credentials: "same-origin",
      headers: {
        "kbn-xsrf": "kibanatool",
        "x-elastic-internal-origin": "Kibana",
        "content-type": "application/json",
      },
    });
    expect(JSON.parse(String(calls[0]!.init!.body))).toEqual({
      params: { index: "app_log", body: { size: 1, query: { ids: { values: ["abc"] } } } },
    });
  });

  it("caches successful lookups but not failures", async () => {
    let attempt = 0;
    const { fetch, calls } = fakeFetch(() => (attempt++ === 0 ? json({}, 500) : searchOk()));
    const client = createKibanaClient({ prefix: "", fetch });
    expect(await kindOf(client.fetchDoc("app_log", "abc"))).toBe("server");
    await expect(client.fetchDoc("app_log", "abc")).resolves.toEqual(HIT);
    await expect(client.fetchDoc("app_log", "abc")).resolves.toEqual(HIT);
    expect(calls).toHaveLength(2);
  });

  it("maps HTTP failures to error kinds", async () => {
    for (const [status, kind] of [
      [401, "forbidden"],
      [403, "forbidden"],
      [400, "incompatible"],
      [404, "incompatible"],
      [502, "server"],
    ] as const) {
      const { fetch } = fakeFetch(() => json({ message: "x" }, status));
      expect(await kindOf(createKibanaClient({ prefix: "", fetch }).fetchDoc("i", "d"))).toBe(kind);
    }
  });

  it("reports notFound for empty hits and network for a thrown fetch", async () => {
    const empty = fakeFetch(() => json({ rawResponse: { hits: { hits: [] } } }));
    expect(await kindOf(createKibanaClient({ prefix: "", fetch: empty.fetch }).fetchDoc("i", "d"))).toBe("notFound");
    const offline = fakeFetch(() => Promise.reject(new TypeError("Failed to fetch")));
    expect(await kindOf(createKibanaClient({ prefix: "", fetch: offline.fetch }).fetchDoc("i", "d"))).toBe("network");
  });

  it("reports incompatible for a non-JSON success body", async () => {
    const { fetch } = fakeFetch(() => new Response("<html>login</html>", { status: 200 }));
    expect(await kindOf(createKibanaClient({ prefix: "", fetch }).fetchDoc("i", "d"))).toBe("incompatible");
  });

  it("reports incompatible when rawResponse has no hits array", async () => {
    const { fetch } = fakeFetch(() => json({ rawResponse: {} }));
    expect(await kindOf(createKibanaClient({ prefix: "", fetch }).fetchDoc("i", "d"))).toBe("incompatible");
  });
});

describe("getDataView", () => {
  it("uses /api/data_views on 8.x/9.x", async () => {
    const { fetch, calls } = fakeFetch(() => json({ data_view: { title: "app_log", timeFieldName: "datetime" } }));
    const client = createKibanaClient({ prefix: "/s/team", fetch });
    await expect(client.getDataView("app-log")).resolves.toEqual({ title: "app_log", timeFieldName: "datetime" });
    expect(calls.map((call) => call.url)).toEqual(["/s/team/api/data_views/data_view/app-log"]);
  });

  it("falls back to /api/index_patterns on 404 (7.17) and drops an empty time field", async () => {
    const { fetch, calls } = fakeFetch((url) =>
      url.includes("/api/data_views/") ? json({ message: "Not Found" }, 404) : json({ index_pattern: { title: "*_log", timeFieldName: "" } }),
    );
    const client = createKibanaClient({ prefix: "", fetch });
    await expect(client.getDataView("all logs")).resolves.toEqual({ title: "*_log", timeFieldName: undefined });
    expect(calls.map((call) => call.url)).toEqual([
      "/api/data_views/data_view/all%20logs",
      "/api/index_patterns/index_pattern/all%20logs",
    ]);
  });

  it("reports notFound when both endpoints return 404", async () => {
    const { fetch } = fakeFetch(() => json({ message: "Not Found" }, 404));
    expect(await kindOf(createKibanaClient({ prefix: "", fetch }).getDataView("missing"))).toBe("notFound");
  });

  it("reports incompatible for a non-JSON success body", async () => {
    const { fetch } = fakeFetch(() => new Response("<html>login</html>", { status: 200 }));
    expect(await kindOf(createKibanaClient({ prefix: "", fetch }).getDataView("app-log"))).toBe("incompatible");
  });
});

describe("getVersion", () => {
  it("reads version.number and returns undefined on failure", async () => {
    const ok = fakeFetch(() => json({ version: { number: "9.5.5" } }));
    await expect(createKibanaClient({ prefix: "", fetch: ok.fetch }).getVersion()).resolves.toBe("9.5.5");
    const failing = fakeFetch(() => json({}, 503));
    await expect(createKibanaClient({ prefix: "", fetch: failing.fetch }).getVersion()).resolves.toBeUndefined();
  });
});

describe("timeouts and odd bodies", () => {
  it("abandons a hung request as network and retries it on the next call", async () => {
    let attempt = 0;
    const fetch = (_url: string, init?: RequestInit): Promise<Response> =>
      attempt++ === 0
        ? new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal?.reason)))
        : Promise.resolve(searchOk());
    const client = createKibanaClient({ prefix: "", fetch, timeoutMs: 20 });
    expect(await kindOf(client.fetchDoc("app_log", "abc"))).toBe("network");
    await expect(client.fetchDoc("app_log", "abc")).resolves.toEqual(HIT);
  });

  it("reports incompatible for a JSON null body", async () => {
    const { fetch } = fakeFetch(() => json(null));
    expect(await kindOf(createKibanaClient({ prefix: "", fetch }).fetchDoc("i", "d"))).toBe("incompatible");
    expect(await kindOf(createKibanaClient({ prefix: "", fetch }).getDataView("dv"))).toBe("incompatible");
  });
});

describe("getVersion caching", () => {
  it("asks once per page and retries after a failure", async () => {
    let attempt = 0;
    const { fetch, calls } = fakeFetch(() => (attempt++ === 0 ? json({}, 503) : json({ version: { number: "8.19.23" } })));
    const client = createKibanaClient({ prefix: "", fetch });
    await expect(client.getVersion()).resolves.toBeUndefined();
    await expect(client.getVersion()).resolves.toBe("8.19.23");
    await expect(client.getVersion()).resolves.toBe("8.19.23");
    expect(calls).toHaveLength(2);
  });
});

describe("timeouts while the body is read", () => {
  it("reports a body that times out as network, not incompatible", async () => {
    const { fetch } = fakeFetch(() => {
      const response = searchOk();
      response.json = () => Promise.reject(new DOMException("The operation timed out.", "TimeoutError"));
      return response;
    });
    const client = createKibanaClient({ prefix: "", fetch });
    expect(await kindOf(client.fetchDoc("app_log", "abc"))).toBe("network");
  });

  it("reports a connection dropped mid-body as network, not incompatible", async () => {
    const { fetch } = fakeFetch(() => {
      const response = searchOk();
      response.json = () => Promise.reject(new TypeError("network error"));
      return response;
    });
    const client = createKibanaClient({ prefix: "", fetch });
    expect(await kindOf(client.fetchDoc("app_log", "abc"))).toBe("network");
  });
});

describe("listDataViews", () => {
  it("reads /api/data_views on 8.x/9.x, keeping display names and skipping odd entries", async () => {
    const { fetch, calls } = fakeFetch(() =>
      json({ data_view: [{ id: "app-log", title: "app_log", name: "app_log" }, { id: "all", title: "*_log", name: "" }, { title: "no id" }, null] }),
    );
    const client = createKibanaClient({ prefix: "/s/team", fetch });
    await expect(client.listDataViews()).resolves.toEqual([
      { id: "app-log", title: "app_log", name: "app_log" },
      { id: "all", title: "*_log" },
    ]);
    expect(calls.map((call) => call.url)).toEqual(["/s/team/api/data_views"]);
  });

  it("falls back to the saved objects API on 404 (7.17), where data views have no name", async () => {
    const { fetch, calls } = fakeFetch((url) =>
      url.endsWith("/api/data_views")
        ? json({ message: "Not Found" }, 404)
        : json({ saved_objects: [{ id: "app-log", attributes: { title: "app_log" } }, { id: "x", attributes: "broken" }] }),
    );
    const client = createKibanaClient({ prefix: "/kibana", fetch });
    await expect(client.listDataViews()).resolves.toEqual([{ id: "app-log", title: "app_log" }]);
    expect(calls.map((call) => call.url)).toEqual([
      "/kibana/api/data_views",
      "/kibana/api/saved_objects/_find?type=index-pattern&fields=title&per_page=10000",
    ]);
  });

  it("asks once per page and retries after a failure", async () => {
    let fail = true;
    const { fetch, calls } = fakeFetch(() => (fail ? json({}, 500) : json({ data_view: [] })));
    const client = createKibanaClient({ prefix: "", fetch });
    expect(await kindOf(client.listDataViews())).toBe("server");
    fail = false;
    await expect(client.listDataViews()).resolves.toEqual([]);
    await client.listDataViews();
    expect(calls).toHaveLength(2);
  });

  it("reports incompatible when the list is not an array", async () => {
    const { fetch } = fakeFetch(() => json({ data_view: "nope" }));
    expect(await kindOf(createKibanaClient({ prefix: "", fetch }).listDataViews())).toBe("incompatible");
  });
});

describe("prefetchDocs (spec 003 FR-013, research R6, R7)", () => {
  const hit = (index: string, id: string) => ({ _index: index, _id: id, _source: { id } });
  /** Answers a batch with the requested hits, except the ids listed in `missing`. */
  function batchFetch(missing: string[] = []) {
    return fakeFetch((_url, init) => {
      const body = JSON.parse(String(init?.body)) as {
        params: { body: { query: { bool?: { should: Array<{ bool: { filter: [{ term: { _index: string } }, { ids: { values: string[] } }] } }> }; ids?: { values: string[] } } } };
      };
      const query = body.params.body.query;
      const hits = query.bool
        ? query.bool.should.flatMap(({ bool: { filter: [term, ids] } }) =>
            ids.ids.values.filter((id) => !missing.includes(id)).map((id) => hit(term.term._index, id)),
          )
        : [];
      return json({ rawResponse: { hits: { hits } } });
    });
  }

  it("sends one exact request per batch: index list, size and one term + ids filter per index", async () => {
    const { fetch, calls } = batchFetch();
    const client = createKibanaClient({ prefix: "/kibana", fetch });
    await client.prefetchDocs([
      { index: "app_log", id: "a" },
      { index: "app_log", id: "b" },
      { index: "legacy_log", id: "c" },
      { index: "app_log", id: "a" },
    ]);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("/kibana/internal/search/es");
    expect(calls[0]!.init).toMatchObject({ method: "POST", headers: { "kbn-xsrf": "kibanatool", "x-elastic-internal-origin": "Kibana" } });
    expect(JSON.parse(String(calls[0]!.init!.body))).toEqual({
      params: {
        index: "app_log,legacy_log",
        body: {
          size: 3,
          query: {
            bool: {
              minimum_should_match: 1,
              should: [
                { bool: { filter: [{ term: { _index: "app_log" } }, { ids: { values: ["a", "b"] } }] } },
                { bool: { filter: [{ term: { _index: "legacy_log" } }, { ids: { values: ["c"] } }] } },
              ],
            },
          },
        },
      },
    });
  });

  it("fills the shared cache: fetchDoc then needs no request; a missing ref is retried alone, as a failure is", async () => {
    const { fetch, calls } = batchFetch(["b"]);
    const client = createKibanaClient({ prefix: "", fetch });
    await client.prefetchDocs([
      { index: "app_log", id: "a" },
      { index: "app_log", id: "b" },
    ]);
    await expect(client.fetchDoc("app_log", "a")).resolves.toEqual(hit("app_log", "a"));
    expect(calls).toHaveLength(1);
    expect(await kindOf(client.fetchDoc("app_log", "b"))).toBe("notFound");
    expect(calls).toHaveLength(2);
    expect(JSON.parse(String(calls[1]!.init!.body)).params.body).toEqual({ size: 1, query: { ids: { values: ["b"] } } });
  });

  it("leaves out refs already cached, and sends nothing when all are", async () => {
    const { fetch, calls } = batchFetch();
    const client = createKibanaClient({ prefix: "", fetch });
    await client.prefetchDocs([{ index: "app_log", id: "a" }]);
    await client.prefetchDocs([
      { index: "app_log", id: "a" },
      { index: "app_log", id: "b" },
    ]);
    await client.prefetchDocs([{ index: "app_log", id: "b" }]);
    expect(calls).toHaveLength(2);
    expect(JSON.parse(String(calls[1]!.init!.body)).params.body.size).toBe(1);
  });

  it("never rejects; a failed batch is evicted, so fetchDoc retries one by one", async () => {
    for (const failing of [() => json({}, 403), () => Promise.reject(new TypeError("Failed to fetch"))]) {
      let first = true;
      const { fetch, calls } = fakeFetch(() => {
        if (first) {
          first = false;
          return failing();
        }
        return searchOk();
      });
      const client = createKibanaClient({ prefix: "", fetch });
      await expect(client.prefetchDocs([{ index: "app_log", id: "abc" }])).resolves.toBeUndefined();
      await expect(client.fetchDoc("app_log", "abc")).resolves.toEqual(HIT);
      expect(JSON.parse(String(calls[1]!.init!.body)).params.body).toEqual({ size: 1, query: { ids: { values: ["abc"] } } });
    }
  });

  it(`keeps at most ${DOC_CACHE_LIMIT} documents, dropping the oldest first`, async () => {
    const { fetch, calls } = batchFetch();
    const client = createKibanaClient({ prefix: "", fetch });
    const refs = Array.from({ length: DOC_CACHE_LIMIT + 1 }, (_, i) => ({ index: "app_log", id: `d${i}` }));
    for (let start = 0; start < refs.length; start += 50) await client.prefetchDocs(refs.slice(start, start + 50));
    const sent = calls.length;
    await client.fetchDoc("app_log", `d${DOC_CACHE_LIMIT}`);
    expect(calls).toHaveLength(sent);
    await client.fetchDoc("app_log", "d0").catch(() => undefined);
    expect(calls).toHaveLength(sent + 1);
  });
});
