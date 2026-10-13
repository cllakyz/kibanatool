import { describe, expect, it } from "vitest";
import { parseXml } from "../../../src/core/xml";

const nested = (levels: number): string => "<a>".repeat(levels) + "x" + "</a>".repeat(levels);

describe("parseXml: conversion (Plan 6 spec §4.2)", () => {
  it("drops namespace prefixes and xmlns declarations, with or without a declaration", () => {
    const xml = '<?xml version="1.0"?><soap:Envelope xmlns:soap="http://s"><soap:Body><ns1:Id>7</ns1:Id></soap:Body></soap:Envelope>';
    expect(parseXml(xml)).toEqual({ Envelope: { Body: { Id: "7" } } });
    // Undeclared prefixes are fine too: the seeded PAYMENT_XML has none.
    expect(parseXml("<ns1:a><ns1:b>1</ns1:b></ns1:a>")).toEqual({ a: { b: "1" } });
  });

  it("writes attributes as @keys first, then children in first-seen order, and text beside attributes as #text", () => {
    expect(parseXml('<Bet xsi:type="T" Id="7"><Sel>A</Sel><Odd>2</Odd></Bet>')).toEqual({ Bet: { "@type": "T", "@Id": "7", Sel: "A", Odd: "2" } });
    expect(Object.keys(parseXml('<Bet Id="7"><Sel>A</Sel></Bet>')?.Bet as object)).toEqual(["@Id", "Sel"]);
    expect(parseXml('<Amount currency="TRY">150</Amount>')).toEqual({ Amount: { "@currency": "TRY", "#text": "150" } });
    expect(parseXml('<Bet Id="8" Type="S"/>')).toEqual({ Bet: { "@Id": "8", "@Type": "S" } });
    expect(parseXml('<Bet Id="8">  </Bet>')).toEqual({ Bet: { "@Id": "8" } });
  });

  it("joins the text of mixed content without the whitespace between elements", () => {
    expect(parseXml("<p>\n  Hello <b>x</b>\n  world\n</p>")).toEqual({ p: { b: "x", "#text": "\n  Hello \n  world\n" } });
    expect(parseXml("<p>\n  <b>x</b>\n  <i>y</i>\n</p>")).toEqual({ p: { b: "x", i: "y" } });
  });

  it("turns repeated keys into an array at their first place, in document order", () => {
    expect(parseXml("<r><Item>1</Item><Other>o</Other><Item>2</Item><Item>3</Item></r>")).toEqual({ r: { Item: ["1", "2", "3"], Other: "o" } });
    expect(Object.keys(parseXml("<r><Item>1</Item><Other>o</Other><Item>2</Item></r>")?.r as object)).toEqual(["Item", "Other"]);
    expect(parseXml('<r a:x="1" b:x="2"/>')).toEqual({ r: { "@x": ["1", "2"] } });
    expect(parseXml("<r><a:Id>1</a:Id><b:Id>2</b:Id></r>")).toEqual({ r: { Id: ["1", "2"] } });
  });

  it("keeps every value as text and an empty element as an empty string", () => {
    expect(parseXml("<r><Code>00</Code><Amount>1500</Amount><Ok>true</Ok><None/><Empty></Empty></r>")).toEqual({
      r: { Code: "00", Amount: "1500", Ok: "true", None: "", Empty: "" },
    });
    expect(parseXml("<a/>")).toEqual({ a: "" });
  });

  it("decodes the predefined and numeric entities and keeps CDATA and whitespace as they are", () => {
    expect(parseXml('<a q="&quot;&apos;&lt;">&amp;&lt;&gt;&#65;&#x42;&#x1F600;</a>')).toEqual({ a: { "@q": "\"'<", "#text": "&<>AB😀" } });
    expect(parseXml("<a><![CDATA[<x>1</x> & more]]></a>")).toEqual({ a: "<x>1</x> & more" });
    expect(parseXml("<a>  two  spaces\n</a>")).toEqual({ a: "  two  spaces\n" });
  });

  it("decodes escaped XML inside an element into text, for expandStructured to open", () => {
    expect(parseXml("<p>&lt;?xml version=\"1.0\"?&gt;&lt;race&gt;&lt;runId&gt;42&lt;/runId&gt;&lt;/race&gt;</p>")).toEqual({
      p: '<?xml version="1.0"?><race><runId>42</runId></race>',
    });
  });

  it("skips comments and processing instructions anywhere", () => {
    expect(parseXml("<!-- c --><?pi x?><a><!-- in --><?pi?>t</a><!-- after -->")).toEqual({ a: "t" });
  });

  it("drops a default namespace and xmlns declared on inner elements (Review Focus 1)", () => {
    const xml =
      '<s:Envelope xmlns:s="http://s"><s:Body><GetResult xmlns="http://tempuri.org/"><ns1:Id xmlns:ns1="http://n">7</ns1:Id></GetResult></s:Body></s:Envelope>';
    expect(parseXml(xml)).toEqual({ Envelope: { Body: { GetResult: { Id: "7" } } } });
  });

  it("accepts a byte order mark and Windows line endings (Review Focus 2)", () => {
    expect(parseXml('﻿<?xml version="1.0"?>\r\n<a>\r\n  <b>1</b>\r\n</a>\r\n')).toEqual({ a: { b: "1" } });
  });

  it("allows 100 levels of nesting", () => {
    let value: unknown = parseXml(nested(100));
    for (let level = 0; level < 99; level++) value = (value as { a: unknown }).a;
    expect(value).toEqual({ a: "x" });
  });

  it("gives __proto__ and constructor elements and attributes own keys and never touches a prototype", () => {
    const parsed = parseXml('<__proto__ constructor="c"><__proto__>x</__proto__><polluted>1</polluted></__proto__>');
    expect(JSON.stringify(parsed)).toBe('{"__proto__":{"@constructor":"c","__proto__":"x","polluted":"1"}}');
    expect(Object.getPrototypeOf(parsed)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe("parseXml: text that stays text (Plan 6 spec §4.1)", () => {
  it.each([
    ["plain text", "hello"],
    ["a tag that is not a name", "<5 dk"],
    ["JSON", '{"a":1}'],
    ["a DOCTYPE", '<!DOCTYPE a><a/>'],
    ["an HTML error page", "<!DOCTYPE html><html><body><br></body></html>"],
    ["HTML without a DOCTYPE", "<html><body><br></body></html>"],
    ["an unknown entity", "<a>&nbsp;</a>"],
    ["an inherited name as an entity", "<a>&constructor;</a>"],
    ["a bare ampersand", "<a>a & b</a>"],
    ["an entity without a semicolon", "<a>&amp</a>"],
    ["an invalid code point", "<a>&#xD800;</a>"],
    ["a mismatched tag", "<a><b></a></b>"],
    ["an unclosed tag", "<a><b>"],
    ["an extra closing tag", "<a></a></a>"],
    ["an unquoted attribute", "<a x=1/>"],
    ["an attribute without whitespace before it", '<a x="1"y="2"/>'],
    ["< inside an attribute", '<a x="<"/>'],
    ["a duplicate attribute", '<a x="1" x="2"/>'],
    ["text after the root", "<a/>tail"],
    ["two roots", "<a/><b/>"],
    ["CDATA outside the root", "<![CDATA[x]]><a/>"],
    ["an empty local name", "<a:>x</a:>"],
    ["a local name that starts with a digit", "<a:1>x</a:1>"],
    ["an unclosed comment", "<a><!-- x</a>"],
    ["101 levels of nesting", nested(101)],
  ])("%s", (_, text) => {
    expect(parseXml(text)).toBeUndefined();
  });
});

describe("parseXml: size", () => {
  it("converts 1 MB of XML in well under a second", () => {
    const body = '<Bet Id="7"><Sel>A</Sel><Amount>150</Amount></Bet>'.repeat(20_000);
    const xml = `<?xml version="1.0"?><Bets>${body}</Bets>`;
    expect(xml.length).toBeGreaterThan(1_000_000);
    const started = performance.now();
    const parsed = parseXml(xml) as { Bets: { Bet: unknown[] } };
    expect(performance.now() - started).toBeLessThan(1000);
    expect(parsed.Bets.Bet).toHaveLength(20_000);
  });
});
