import { describe, expect, it } from "vitest";
import { DEFAULT_MASK_PATTERNS } from "../../../src/core/config";
import { MASK, maskMatcher, maskValue } from "../../../src/core/mask";

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
    expect(maskValue("access_token", "abc", isMasked)).toBe(MASK);
    expect(maskValue("message", "plain", isMasked)).toBe("plain");
  });

  it("masks keys inside JSON text under the field's path and re-serializes it", () => {
    const headers = JSON.stringify({ Authorization: "Bearer x", accept: "json" });
    expect(maskValue("context.headers", headers, isMasked)).toBe('{"Authorization":"***","accept":"json"}');
  });

  it("masks inside arrays and nested objects", () => {
    expect(maskValue("items", [{ token: "t", id: 1 }], isMasked)).toEqual([{ token: MASK, id: 1 }]);
    expect(maskValue("body", JSON.stringify({ user: { Password: "p", name: "n" } }), isMasked)).toBe(
      '{"user":{"Password":"***","name":"n"}}',
    );
  });
});
