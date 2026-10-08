import { describe, expect, it } from "vitest";
import { isHttpUrl, isHttpUrlTemplate, lookup, parsePlaceholders, resolveTemplate } from "../../../src/core/template";

const enc = encodeURIComponent;

describe("resolveTemplate", () => {
  it("returns null when the encoder throws (e.g. a lone surrogate)", () => {
    expect(resolveTemplate("https://x.test/{s}", { s: "\uD800" }, enc)).toBeNull();
  });

  it("fills a placeholder and URL-encodes special characters", () => {
    expect(resolveTemplate("https://x.test/u/{q}", { q: "a b/c#d&e?f" }, enc)).toBe(
      "https://x.test/u/a%20b%2Fc%23d%26e%3Ff",
    );
  });

  it("encodes unicode values", () => {
    expect(resolveTemplate("https://x.test/?n={name}", { name: "Çağrı ğüş" }, enc)).toBe(
      "https://x.test/?n=%C3%87a%C4%9Fr%C4%B1%20%C4%9F%C3%BC%C5%9F",
    );
  });

  it("keeps 0 and false as values", () => {
    expect(resolveTemplate("https://x.test/{n}/{f}", { n: 0, f: false }, enc)).toBe("https://x.test/0/false");
  });

  it("uses the first fallback that has a value", () => {
    expect(resolveTemplate("https://x.test/{a|b|c}", { b: "", c: "third" }, enc)).toBe("https://x.test/third");
    expect(resolveTemplate("https://x.test/{a|b}", { a: "first", b: "second" }, enc)).toBe("https://x.test/first");
  });

  it("returns null when any placeholder has no value", () => {
    expect(resolveTemplate("https://x.test/{a}/{b}", { a: "1" }, enc)).toBeNull();
    expect(resolveTemplate("https://x.test/{a|b}", { a: null }, enc)).toBeNull();
  });

  it("supports @, dash and dots in paths", () => {
    const fields = { "@timestamp": "2026-10-07T12:00:00Z", "context.headers.user-agent": "curl/8" };
    expect(resolveTemplate("https://x.test/{@timestamp}/{context.headers.user-agent}", fields, enc)).toBe(
      "https://x.test/2026-10-07T12%3A00%3A00Z/curl%2F8",
    );
  });

  it("joins primitive arrays and leaves text without placeholders unchanged", () => {
    expect(resolveTemplate("https://x.test/{tags}", { tags: ["a", "b"] }, enc)).toBe("https://x.test/a%2Cb");
    expect(resolveTemplate("https://x.test/static", {}, enc)).toBe("https://x.test/static");
  });

  it("applies the given encoder", () => {
    expect(resolveTemplate("{a}", { a: "x y" }, (value) => `<${value}>`)).toBe("<x y>");
  });
});

describe("parsePlaceholders", () => {
  it("lists placeholders with their fallback paths and ignores non-matching braces", () => {
    expect(parsePlaceholders("https://x/{a|b.c}/{@t}/{}/{a b}")).toEqual([
      { raw: "{a|b.c}", paths: ["a", "b.c"] },
      { raw: "{@t}", paths: ["@t"] },
    ]);
  });
});

describe("lookup", () => {
  it("returns the first present value as text or null", () => {
    expect(lookup({ a: "", b: 5 }, ["a", "b"])).toBe("5");
    expect(lookup({}, ["a"])).toBeNull();
  });
});

describe("isHttpUrlTemplate", () => {
  it("accepts only http and https", () => {
    expect(isHttpUrlTemplate("https://x.test/{a}")).toBe(true);
    expect(isHttpUrlTemplate("HTTP://x.test")).toBe(true);
    expect(isHttpUrlTemplate("  https://x.test")).toBe(true);
    expect(isHttpUrlTemplate("javascript:alert(1)")).toBe(false);
    expect(isHttpUrlTemplate("ftp://x.test")).toBe(false);
    expect(isHttpUrlTemplate("{url}")).toBe(false);
  });
});

describe("lookup own keys", () => {
  it("ignores keys inherited from Object.prototype", () => {
    expect(lookup({}, ["constructor", "toString"])).toBeNull();
  });
});

describe("isHttpUrl", () => {
  it("accepts only parsable http(s) URLs", () => {
    expect(isHttpUrl("https://x.test/a")).toBe(true);
    expect(isHttpUrl("http://localhost:9601")).toBe(true);
    expect(isHttpUrl("https://a%20b/x")).toBe(false);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("x.test")).toBe(false);
  });
});
