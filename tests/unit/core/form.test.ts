import { describe, expect, it } from "vitest";
import { formPairs, parseForm } from "../../../src/core/form";

describe("parseForm: conversion (spec 002 FR-002)", () => {
  it("decodes values and keeps empty ones", () => {
    expect(parseForm("a=1&b=x%20y&c=")).toEqual({ a: "1", b: "x y", c: "" });
    expect(parseForm("q=a+b&n=%C3%87")).toEqual({ q: "a b", n: "Ç" });
  });

  it("splits a pair on its first =, so a value may contain =", () => {
    expect(parseForm("t=abc==&x=1")).toEqual({ t: "abc==", x: "1" });
  });

  it("keeps keys flat and accepts Unicode letters", () => {
    expect(parseForm("a[b]=1&c=2")).toEqual({ "a[b]": "1", c: "2" });
    expect(parseForm("şehir=İzmir&ülke=TR")).toEqual({ şehir: "İzmir", ülke: "TR" });
  });

  it("turns a repeated key into a list at the place it first appeared", () => {
    const form = parseForm("id=1&x=2&id=3");
    expect(form).toEqual({ id: ["1", "3"], x: "2" });
    expect(Object.keys(form ?? {})).toEqual(["id", "x"]);
  });

  it("keeps __proto__ an own key", () => {
    const form = parseForm("__proto__=1&b=2");
    expect(Object.keys(form ?? {})).toEqual(["__proto__", "b"]);
    expect(Object.getPrototypeOf(form)).toBe(Object.prototype);
  });
});

describe("formPairs (spec 002 FR-001)", () => {
  it("keeps each pair's raw text beside its decoded text", () => {
    expect(formPairs(" a=x%20y&b=c+d ")).toEqual([
      { rawKey: "a", rawValue: "x%20y", key: "a", value: "x y" },
      { rawKey: "b", rawValue: "c+d", key: "b", value: "c d" },
    ]);
  });

  it.each([
    ["a single pair", "vendor=abc123"],
    ["whitespace", "a=1 &b=2"],
    ["a pair without =", "a&b=1"],
    ["a trailing empty pair", "a=1&"],
    ["a leading empty pair", "&a=1"],
    ["a key that starts with a bracket", "[a]=1&b=2"],
    ["a URL", "https://x.test/p?a=1&b=2"],
    ["base64 padding", "abc=="],
    ["a bad escape", "a=%zz&b=1"],
    ["broken UTF-8", "a=%E2%82&b=1"],
    ["an empty key", "=1&b=2"],
    ["empty text", ""],
  ])("is not form data: %s", (_name, text) => {
    expect(formPairs(text)).toBeUndefined();
    expect(parseForm(text)).toBeUndefined();
  });

  it("never throws on hostile text", () => {
    const hostile = ["&".repeat(10_000), "%", "a=%&b=1", "%%=1&b=2", "\u0000=1&b=2", Array.from({ length: 10_000 }, (_, i) => `k${i}=v`).join("&")];
    for (const text of hostile) {
      expect(() => formPairs(text)).not.toThrow();
      expect(() => parseForm(text)).not.toThrow();
    }
    expect(Object.keys(parseForm(hostile.at(-1) ?? "") ?? {})).toHaveLength(10_000);
  });
});
