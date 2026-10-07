// Seeds synthetic logs and data views into a dev stack. No real data.
// Usage: ES_AUTH="elastic:<password>" node seed.mjs <esUrl> <kibanaUrl>
const [esUrl, kbUrl] = process.argv.slice(2);
const auth = "Basic " + Buffer.from(process.env.ES_AUTH).toString("base64");

async function call(base, method, path, body, extraHeaders = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { authorization: auth, "content-type": "application/json", ...extraHeaders },
    body: typeof body === "string" ? body : body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const now = Date.now();
const lines = [];

// app_log: Monolog-shaped, like the team's 7.17 logs (JSON strings inside context).
for (let i = 0; i < 150; i++) {
  const [level, level_name] = pick([[200, "INFO"], [250, "NOTICE"], [300, "WARNING"], [400, "ERROR"]]);
  const url = pick(["/v1/coupons", "/v1/races/today", "/v1/wallet/deposit", "/v1/auth/login"]);
  lines.push(
    JSON.stringify({ index: { _index: "app_log" } }),
    JSON.stringify({
      message: level >= 400 ? `Request failed for ${url}` : `Handled ${url}`,
      level,
      level_name,
      channel: pick(["request", "app", "security"]),
      datetime: new Date(now - i * 7 * 60 * 1000).toISOString(),
      app_name: pick(["api", "admin"]),
      user_id: 100000 + Math.floor(Math.random() * 900000),
      context: {
        method: pick(["GET", "POST"]),
        ip: `10.0.${i % 255}.${(i * 7) % 255}`,
        url,
        body: JSON.stringify({ amount: i * 10, currency: "TRY", items: [{ id: i, qty: 1 }] }),
        headers: JSON.stringify({ "user-agent": "dev/1.0", authorization: "Bearer synthetic-token" }),
        query: JSON.stringify({ page: i % 5 }),
      },
      extra: { uid: Math.random().toString(16).slice(2, 10) },
    }),
  );
}

// legacy_log: datetime mapped as text, so the "*_log" data view has no usable time field.
await call(esUrl, "PUT", "/legacy_log", { mappings: { properties: { datetime: { type: "text" } } } }).catch(() => {});
for (let i = 0; i < 20; i++) {
  lines.push(
    JSON.stringify({ index: { _index: "legacy_log" } }),
    JSON.stringify({ message: `legacy event ${i}`, datetime: new Date(now - i * 60000).toISOString(), user_id: 500000 + i }),
  );
}

// logs-kibanatool-default: ECS-shaped data stream (triggers the logs profile in the Observability view).
for (let i = 0; i < 60; i++) {
  lines.push(
    JSON.stringify({ create: { _index: "logs-kibanatool-default" } }),
    JSON.stringify({
      "@timestamp": new Date(now - i * 5 * 60 * 1000).toISOString(),
      message: i % 4 === 0 ? `Payment failed for order ${1000 + i}` : `Order ${1000 + i} processed`,
      "log.level": i % 4 === 0 ? "error" : "info",
      "service.name": i % 2 ? "api" : "admin",
      "host.name": "dev-host",
      "user.id": String(200000 + i),
      "trace.id": Math.random().toString(16).slice(2, 18),
    }),
  );
}

const bulk = await call(esUrl, "POST", "/_bulk?refresh=true", lines.join("\n") + "\n", { "content-type": "application/x-ndjson" });
console.log("bulk errors:", bulk.errors, "items:", bulk.items.length);

for (const dataView of [
  { id: "app-log", title: "app_log", name: "app_log", timeFieldName: "datetime" },
  { id: "all-logs", title: "*_log", name: "*_log" },
  { id: "logs", title: "logs-*", name: "logs-*", timeFieldName: "@timestamp" },
]) {
  const result = await call(kbUrl, "POST", "/api/data_views/data_view", { data_view: dataView, override: true }, { "kbn-xsrf": "kibanatool" });
  console.log("data view:", result.data_view.id, "time field:", result.data_view.timeFieldName ?? null);
}
