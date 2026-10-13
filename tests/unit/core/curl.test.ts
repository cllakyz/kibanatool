import { describe, expect, it } from "vitest";
import { DEFAULT_MASK_PATTERNS } from "../../../src/core/config";
import { buildCurl, requestPrefix } from "../../../src/core/curl";
import { VALUE_MASK_KINDS } from "../../../src/core/value-mask";

// Synthetic values only (Plan 5 spec §9.1).
const all = [...VALUE_MASK_KINDS];
const URL = "https://api.example.com/v1/x";
const curl = (source: Record<string, unknown>, patterns: string[] = DEFAULT_MASK_PATTERNS, kinds = all): string | undefined =>
  buildCurl({ _id: "10000000146", _index: "player_action_log", _source: source }, patterns, kinds);
/** A Monolog-shaped log like player_action_log: headers, body and query are JSON text (spec §3). */
const request = (fields: Record<string, unknown>): Record<string, unknown> => ({ context: { method: "GET", url: URL, ...fields } });
const json = (value: unknown): string => JSON.stringify(value);
const lines = (...parts: string[]): string => parts.join(" \\\n  ");

describe("requestPrefix (spec §4)", () => {
  it("prefers context, then the root", () => {
    expect(requestPrefix({ context: { method: "GET", url: URL }, method: "POST", url: "https://b.example.com/" })).toBe("context");
    expect(requestPrefix({ method: "get", url: "http://b.example.com/" })).toBe("");
    expect(requestPrefix({ context: { method: "GET", url: "/v1/x" }, method: "GET", url: "https://b.example.com/" })).toBe("");
  });

  it("finds no request without a method and an http(s) url", () => {
    expect(requestPrefix({})).toBeUndefined();
    expect(requestPrefix({ context: { url: URL } })).toBeUndefined();
    expect(requestPrefix({ context: { method: " ", url: URL } })).toBeUndefined();
    expect(requestPrefix({ context: { method: "GET", url: "/v1/coupons" } })).toBeUndefined();
    expect(requestPrefix({ context: { method: "GET", url: "ftp://files.example.com/" } })).toBeUndefined();
    expect(requestPrefix({ context: { method: "GET", url: 42 } })).toBeUndefined();
    expect(requestPrefix({ context: "GET https://api.example.com/" })).toBeUndefined();
  });
});

describe("buildCurl (spec §5)", () => {
  it("returns undefined when the log records no request", () => {
    expect(buildCurl({ _id: "1", _index: "i" }, [], [])).toBeUndefined();
    expect(curl({ context: { method: "GET", url: "/v1/coupons" } })).toBeUndefined();
  });

  it("writes the headers in log order, one per line, without transport, proxy and CDN headers (spec §5.1, §5.4)", () => {
    const headers = json({
      host: ["api.example.com"],
      "user-agent": ["app/1.0"],
      "X-Forwarded-For": ["10.0.0.1"],
      "x-forwarded-proto": ["https"],
      "cf-ray": ["8f00"],
      "CF-Visitor": ['{"scheme":"https"}'],
      "cdn-loop": ["cloudflare"],
      "x-real-ip": ["10.0.0.1"],
      forwarded: ["for=10.0.0.1"],
      connection: ["close"],
      "content-length": ["0"],
      "x-php-ob-level": ["1"],
      accept: ["application/json"],
      "Accept-Encoding": ["gzip, br"],
      ssl: ["on"],
    });
    expect(curl(request({ headers }))).toBe(
      lines(`curl '${URL}'`, "-H 'user-agent: app/1.0'", "-H 'accept: application/json'", "-H 'ssl: on'", "--compressed"),
    );
  });

  it("writes one line per item of a header list, and reads headers that are an object of strings and numbers", () => {
    expect(curl(request({ headers: json({ accept: ["text/html", "application/json"], "x-empty": [], "x-null": null }) }))).toBe(
      lines(`curl '${URL}'`, "-H 'accept: text/html'", "-H 'accept: application/json'"),
    );
    expect(curl({ method: "GET", url: URL, headers: { accept: "text/html", "x-retry": 3 } })).toBe(
      lines(`curl '${URL}'`, "-H 'accept: text/html'", "-H 'x-retry: 3'"),
    );
    expect(curl(request({ headers: "not json" }))).toBe(`curl '${URL}'`);
  });

  it("writes -X only when curl would guess the method wrong (spec §5.2)", () => {
    const body = json({ a: 1 });
    expect(curl(request({ body: "[]" }))).toBe(`curl '${URL}'`);
    expect(curl(request({ method: "POST", body }))).toBe(lines(`curl '${URL}'`, `--data-raw '{"a":1}'`));
    expect(curl(request({ method: "DELETE", body: "[]" }))).toBe(lines(`curl '${URL}'`, "-X 'DELETE'"));
    expect(curl(request({ method: "POST", body: "[]" }))).toBe(lines(`curl '${URL}'`, "-X 'POST'"));
    expect(curl(request({ method: "GET", body }))).toBe(lines(`curl '${URL}'`, "-X 'GET'", `--data-raw '{"a":1}'`));
    expect(curl(request({ method: "put", body }))).toBe(lines(`curl '${URL}'`, "-X 'PUT'", `--data-raw '{"a":1}'`));
  });

  it("treats [], {}, empty text and a missing body as no body", () => {
    for (const body of ["[]", "{}", "", undefined, null]) {
      expect(curl(request({ method: "POST", body }))).toBe(lines(`curl '${URL}'`, "-X 'POST'"));
    }
  });

  it("writes no body for a GET that says application/json and logs [] (Review Focus 3)", () => {
    expect(curl(request({ headers: json({ "content-type": ["application/json"] }), body: "[]", query: "[]" }))).toBe(
      lines(`curl '${URL}'`, "-H 'content-type: application/json'"),
    );
  });

  it("quotes every argument for bash, apostrophes and line breaks included (spec §5.1, Review Focus 2)", () => {
    expect(curl(request({ method: "POST", headers: json({ "x-note": ["Ali'nin notu"] }), body: "it's\nfine" }))).toBe(
      lines(`curl '${URL}'`, "-H 'x-note: Ali'\\''nin notu'", "--data-raw 'it'\\''s\nfine'"),
    );
  });

  it("appends the query the way PHP's http_build_query writes it, with --globoff for brackets (spec §5.3)", () => {
    const query = json({ page: "2", filter: { status: "active", ids: [3, 4] }, flag: true, off: false, none: null, empty: [], q: "a b&c" });
    expect(curl(request({ query }))).toBe(
      lines(`curl '${URL}?page=2&filter[status]=active&filter[ids][0]=3&filter[ids][1]=4&flag=1&off=0&q=a%20b%26c'`, "--globoff"),
    );
    expect(curl(request({ url: `${URL}?lang=tr`, query: json({ page: "2" }) }))).toBe(`curl '${URL}?lang=tr&page=2'`);
    expect(curl(request({ query: json({ "a b": "1" }) }))).toBe(`curl '${URL}?a%20b=1'`);
    expect(curl(request({ query: json(["a"]) }))).toBe(`curl '${URL}'`);
    expect(curl(request({ query: "[]" }))).toBe(`curl '${URL}'`);
  });

  it("percent-encodes Turkish letters in the query and form, and keeps them in JSON (Review Focus 4)", () => {
    expect(curl(request({ query: json({ q: "şehir" }) }))).toBe(`curl '${URL}?q=%C5%9Fehir'`);
    const form = json({ "content-type": ["application/x-www-form-urlencoded"] });
    expect(curl(request({ method: "POST", headers: form, body: json({ ad: "Çağrı" }) }))).toContain("--data-raw 'ad=%C3%87a%C4%9Fr%C4%B1'");
    // PHP's json_encode writes \u00c7; the command sends the same JSON with the letters themselves.
    expect(curl(request({ method: "POST", body: '{"ad":"\\u00c7a\\u011fr\\u0131"}' }))).toContain(`--data-raw '{"ad":"Çağrı"}'`);
  });

  it("writes a JSON body as one line of JSON, also for an unknown or missing content type (spec §5.5)", () => {
    const body = json({ amount: 10, code: "00150", items: [{ id: 1 }] });
    const sent = `--data-raw '{"amount":10,"code":"00150","items":[{"id":1}]}'`;
    for (const type of ["application/json; charset=utf-8", "application/vnd.api+json", "text/plain"]) {
      expect(curl(request({ method: "POST", headers: json({ "content-type": [type] }), body }))).toBe(
        lines(`curl '${URL}'`, `-H 'content-type: ${type}'`, sent),
      );
    }
    expect(curl(request({ method: "POST", body }))).toBe(lines(`curl '${URL}'`, sent));
  });

  it("writes a form body with http_build_query names, brackets unencoded and no --globoff (spec §5.5)", () => {
    const headers = json({ "content-type": ["application/x-www-form-urlencoded"] });
    const body = json({ searchForm: { email: "dev@example.com", tags: ["a", "b"] }, remember: true });
    expect(curl(request({ method: "POST", headers, body }), [], [])).toBe(
      lines(
        `curl '${URL}'`,
        "-H 'content-type: application/x-www-form-urlencoded'",
        "--data-raw 'searchForm[email]=dev%40example.com&searchForm[tags][0]=a&searchForm[tags][1]=b&remember=1'",
      ),
    );
  });

  it("writes multipart fields with --form-string and lets curl set the content type (spec §5.5)", () => {
    const headers = json({ "content-type": ["multipart/form-data; boundary=----x"], accept: ["*/*"] });
    const body = json({ title: "@notes.txt", meta: { lang: "<tr>" } });
    expect(curl(request({ method: "POST", headers, body }), [], [])).toBe(
      lines(`curl '${URL}'`, "-H 'accept: */*'", "--form-string 'title=@notes.txt'", "--form-string 'meta[lang]=<tr>'"),
    );
  });

  it("sends a text body as it is, XML included, with only the value masks (spec §5.5, §5.6)", () => {
    const headers = json({ "content-type": ["text/xml"] });
    expect(curl(request({ method: "POST", headers, body: "<pay><id>10000000146</id><amount>150</amount></pay>" }))).toBe(
      lines(`curl '${URL}'`, "-H 'content-type: text/xml'", "--data-raw '<pay><id>***</id><amount>150</amount></pay>'"),
    );
  });

  it("masks headers, body, query and URL like the other copies (spec §5.6)", () => {
    const source = {
      context: {
        method: "POST",
        url: "https://backoffice.example.com/player/10000000146/notes",
        headers: json({
          authorization: ["Bearer synthetic"],
          cookie: ["PHPSESSID=synthetic", "theme=dark"],
          "platform-token": ["synthetic"],
          "content-type": ["application/x-www-form-urlencoded"],
        }),
        body: json({ note: { phone: "0555 000 00 00", password: "synthetic" }, _token: "synthetic", amount: 10000000146 }),
        query: json({ iban: "TR000000000000000000000001" }),
      },
    };
    expect(curl(source)).toBe(
      lines(
        "curl 'https://backoffice.example.com/player/***/notes?iban=***'",
        "-H 'authorization: ***'",
        "-H 'cookie: ***'",
        "-H 'platform-token: ***'",
        "-H 'content-type: application/x-www-form-urlencoded'",
        "--data-raw 'note[phone]=***&note[password]=***&_token=***&amount=***'",
      ),
    );
  });

  it("keeps JSON and HTML text inside the body as text: JSON masked inside, HTML with only the value masks (spec §5.6, Review Focus 1)", () => {
    const body = json({ contract: { text: "<p>Kimlik 10000000146</p>", settings: json({ limit: 5, secret: "synthetic" }) } });
    expect(curl(request({ method: "POST", headers: json({ "content-type": ["application/json"] }), body }))).toContain(
      `--data-raw '{"contract":{"text":"<p>Kimlik ***</p>","settings":"{\\"limit\\":5,\\"secret\\":\\"***\\"}"}}'`,
    );
    const form = json({ "content-type": ["application/x-www-form-urlencoded"] });
    expect(curl(request({ method: "POST", headers: form, body }))).toContain(
      "--data-raw 'contract[text]=%3Cp%3EKimlik%20***%3C%2Fp%3E&contract[settings]=%7B%22limit%22%3A5%2C%22secret%22%3A%22***%22%7D'",
    );
  });

  it("masks JSON text nested deeper than five texts as a whole (spec §5.6)", () => {
    let body: unknown = { v: "x" };
    for (let level = 0; level < 5; level++) body = { a: json(body) };
    let expected: unknown = { a: "***" };
    for (let level = 0; level < 4; level++) expected = { a: json(expected) };
    expect(curl(request({ method: "POST", body: json(body) }), [], [])).toBe(lines(`curl '${URL}'`, `--data-raw '${json(expected)}'`));
  });

  it("writes a part that a pattern masks whole as *** (spec §5.6)", () => {
    const source = request({ method: "POST", headers: json({ "accept-encoding": ["gzip"] }), body: json({ a: 1 }), query: json({ b: "2" }) });
    expect(curl(source, ["context.url", "context.headers", "context.body", "context.query"])).toBe(lines("curl '***'", "--data-raw '***'"));
  });

  it("reads the root prefix with the root paths for masks", () => {
    expect(curl({ method: "GET", url: URL, headers: { "x-secret": "synthetic" } })).toBe(lines(`curl '${URL}'`, "-H 'x-secret: ***'"));
  });
});
