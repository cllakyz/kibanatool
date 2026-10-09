import { describe, expect, it } from "vitest";
import { KibanaError, createKibanaClient } from "../../../src/kibana/client";

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
