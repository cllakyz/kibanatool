import { describe, expect, it } from "vitest";
import { DEFAULT_MASK_PATTERNS } from "../../../src/core/config";
import { MASK, maskMatcher, maskValue } from "../../../src/core/mask";
import { VALUE_MASK_KINDS } from "../../../src/core/value-mask";

describe("maskMatcher", () => {
  it("matches the whole dot path, ignoring case, with * as any run of characters", () => {
    const isMasked = maskMatcher(["*authorization*", "user.pass"]);
    expect(isMasked("context.headers.Authorization")).toBe(true);
    expect(isMasked("user.pass")).toBe(true);
    expect(isMasked("user.password")).toBe(false);
    expect(isMasked("userXpass")).toBe(false);
  });

  it("treats regex characters in patterns literally", () => {
    expect(maskMatcher(["a.b(c)"])("a.b(c)")).toBe(true);
    expect(maskMatcher(["a.b(c)"])("aXb(c)")).toBe(false);
  });
});

describe("maskValue", () => {
  const isMasked = maskMatcher(DEFAULT_MASK_PATTERNS);

  it("masks a matching field", () => {
    expect(maskValue("access_token", "abc", isMasked, [])).toBe(MASK);
    expect(maskValue("message", "plain", isMasked, [])).toBe("plain");
  });

  it("masks keys inside JSON text under the field's path and re-serializes it", () => {
    const headers = JSON.stringify({ Authorization: "Bearer x", accept: "json" });
    expect(maskValue("context.headers", headers, isMasked, [])).toBe('{"Authorization":"***","accept":"json"}');
  });

  it("masks inside arrays and nested objects", () => {
    expect(maskValue("items", [{ token: "t", id: 1 }], isMasked, [])).toEqual([{ token: MASK, id: 1 }]);
    expect(maskValue("body", JSON.stringify({ user: { Password: "p", name: "n" } }), isMasked, [])).toBe(
      '{"user":{"Password":"***","name":"n"}}',
    );
  });
});

// Synthetic values only (Plan 5 spec §9.1).
describe("maskValue with value masks (Plan 5 spec §5)", () => {
  const isMasked = maskMatcher(["*iban*"]);
  const all = [...VALUE_MASK_KINDS];

  it("masks the matches inside plain text and keeps the rest", () => {
    expect(maskValue("note", "call +90 555 000 00 00 today", isMasked, all)).toBe("call *** today");
  });

  it("masks a number with a match as text, and keeps other numbers", () => {
    expect(maskValue("pid", 10000000146, isMasked, all)).toBe(MASK);
    expect(maskValue("amount", 150, isMasked, all)).toBe(150);
  });

  it("masks inside JSON text, numbers included, leaves booleans and null, and re-serializes it", () => {
    const body = JSON.stringify({ pidNo: 10000000146, note: "card 4111 1111 1111 1111", ok: true, none: null });
    expect(maskValue("body", body, isMasked, all)).toBe('{"pidNo":"***","note":"card ***","ok":true,"none":null}');
  });

  it("lets a field-name mask win, so the whole value is masked once", () => {
    // Plan 5 Review Focus 3.
    expect(maskValue("context.iban", "TR000000000000000000000001", isMasked, all)).toBe(MASK);
    expect(maskValue("body", JSON.stringify({ IBAN: "x TR000000000000000000000001" }), isMasked, all)).toBe('{"IBAN":"***"}');
  });

  it("masks inside arrays", () => {
    expect(maskValue("phones", ["5550000000", "x"], isMasked, all)).toEqual([MASK, "x"]);
  });

  it("leaves every value alone when no kind is on", () => {
    expect(maskValue("pid", 10000000146, isMasked, [])).toBe(10000000146);
    expect(maskValue("note", "+90 555 000 00 00", isMasked, [])).toBe("+90 555 000 00 00");
  });
});
