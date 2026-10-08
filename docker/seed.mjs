// Seeds deterministic synthetic logs, data views, spaces and a read-only user into a dev stack. No real data.
// Usage: ES_AUTH="elastic:<password>" READER_PASSWORD=<password> node seed.mjs <esUrl> <kibanaUrl>
// tests/e2e relies on the exact ids, values and times below: change both together.
const [esUrl, kbUrl] = process.argv.slice(2);
const auth = "Basic " + Buffer.from(process.env.ES_AUTH).toString("base64");

async function call(base, method, path, body, { headers = {}, allow = [] } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { authorization: auth, "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok && !allow.includes(response.status)) throw new Error(`${method} ${path} -> ${response.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
const es = (method, path, body, options) => call(esUrl, method, path, body, options);
const kb = (method, path, body, options = {}) =>
  call(kbUrl, method, path, body, { ...options, headers: { "kbn-xsrf": "kibanatool", ...options.headers } });

const pad = (n, width = 3) => String(n).padStart(width, "0");
const minutesBefore = (minutes) => new Date(Date.UTC(2026, 0, 15, 10, 0) - minutes * 60_000).toISOString();
const URLS = ["/v1/coupons", "/v1/races/today", "/v1/wallet/deposit", "/v1/auth/login"];
const LEVELS = [[400, "ERROR"], [200, "INFO"], [250, "NOTICE"], [300, "WARNING"]]; // by i % 4

// Start from scratch, so a re-run gives the same documents.
await es("DELETE", "/app_log,legacy_log?ignore_unavailable=true");
await es("DELETE", "/_data_stream/logs-kibanatool-default", undefined, { allow: [404] });
// legacy_log: datetime mapped as text, so the "*_log" data view has no usable time field.
await es("PUT", "/legacy_log", { mappings: { properties: { datetime: { type: "text" } } } });

const lines = [];
const add = (action, doc) => lines.push(JSON.stringify(action), JSON.stringify(doc));
// app_log: Monolog-shaped, like the team's 7.17 logs (JSON strings inside context).
for (let i = 1; i <= 30; i++) {
  const [level, level_name] = LEVELS[i % 4];
  const url = URLS[i % 4];
  add(
    { index: { _index: "app_log", _id: `app-${pad(i)}` } },
    {
      message: level >= 400 ? `Request failed for ${url}` : `Handled ${url}`,
      level,
      level_name,
      channel: ["request", "app", "security"][i % 3],
      datetime: minutesBefore((i - 1) * 7),
      app_name: i % 2 ? "api" : "admin",
      user_id: 100000 + (i % 5),
      context: {
        method: i % 2 ? "GET" : "POST",
        ip: `10.0.0.${i}`,
        url,
        body: JSON.stringify({ amount: i * 10, currency: "TRY", items: [{ id: i, qty: 1 }] }),
        headers: JSON.stringify({ "user-agent": "dev/1.0", authorization: `Bearer synthetic-token-${i}` }),
        query: JSON.stringify({ page: i % 5 }),
      },
      extra: { uid: `uid-${pad(i)}` },
    },
  );
}
for (let i = 1; i <= 10; i++) {
  add({ index: { _index: "legacy_log", _id: `legacy-${pad(i)}` } }, { message: `legacy event ${i}`, datetime: minutesBefore(i), user_id: 500000 + i });
}
// logs-kibanatool-default: ECS data stream (the logs profile of the Observability view); ids are generated.
for (let i = 1; i <= 20; i++) {
  add(
    { create: { _index: "logs-kibanatool-default" } },
    {
      "@timestamp": minutesBefore((i - 1) * 5),
      message: i % 4 === 0 ? `Payment failed for order ${1000 + i}` : `Order ${1000 + i} processed`,
      "log.level": i % 4 === 0 ? "error" : "info",
      "service.name": i % 2 ? "api" : "admin",
      "host.name": "dev-host",
      "user.id": String(200000 + i),
      "trace.id": `trace-${pad(i, 4)}`,
    },
  );
}
const bulk = await es("POST", "/_bulk?refresh=true", lines.join("\n") + "\n", { headers: { "content-type": "application/x-ndjson" } });
if (bulk.errors) {
  const failed = bulk.items.map((item) => Object.values(item)[0]).find((result) => result.error);
  throw new Error(`bulk indexing failed: ${JSON.stringify(failed).slice(0, 500)}`);
}
console.log("documents:", bulk.items.length);

const status = await kb("GET", "/api/status");
const major = Number(status.version.number.split(".")[0]);

// 7.17 has no data views API; its index pattern API takes the same fields except `name`.
async function dataView(space, id, title, timeFieldName) {
  const base = space ? `/s/${space}` : "";
  const [api, key] = major >= 8 ? ["/api/data_views/data_view", "data_view"] : ["/api/index_patterns/index_pattern", "index_pattern"];
  await kb("DELETE", `${base}${api}/${id}`, undefined, { allow: [404] });
  await kb("POST", `${base}${api}`, { [key]: { id, title, timeFieldName, ...(major >= 8 ? { name: title } : {}) } });
}
async function space(id, extra = {}) {
  await kb("DELETE", `/api/spaces/space/${id}`, undefined, { allow: [404] });
  await kb("POST", "/api/spaces/space", { id, name: id, ...extra });
}

// Data view ids are unique across spaces on 8.x/9.x, so the space copies get their own ids.
await dataView("", "app-log", "app_log", "datetime");
await dataView("", "all-logs", "*_log");
await dataView("", "logs", "logs-*", "@timestamp");
await space("test");
await dataView("test", "test-app-log", "app_log", "datetime");
if (major >= 9) {
  // Solution view: ECS logs open the flyout on "Log overview" (spec §3).
  await space("obs", { solution: "oblt" });
  await dataView("obs", "obs-logs", "logs-*", "@timestamp");
}

// Read-only user. Base privileges, because feature ids differ between majors.
await kb("PUT", "/api/security/role/kt_reader", {
  elasticsearch: { indices: [{ names: ["app_log", "legacy_log", "logs-*"], privileges: ["read", "view_index_metadata"] }] },
  kibana: [{ base: ["read"], spaces: ["*"] }],
});
await es("POST", "/_security/user/kt_reader", { password: process.env.READER_PASSWORD, roles: ["kt_reader"] });
console.log(`seeded Kibana ${status.version.number}`);
