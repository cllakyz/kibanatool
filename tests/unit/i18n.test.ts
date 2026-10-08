import { describe, expect, it } from "vitest";
import en from "../../public/_locales/en/messages.json";
import tr from "../../public/_locales/tr/messages.json";

type Messages = Record<string, { message: string; placeholders?: Record<string, unknown> }>;

describe("locales", () => {
  it("tr has exactly the en keys", () => {
    expect(Object.keys(tr).sort()).toEqual(Object.keys(en).sort());
  });

  it("every tr message has the en placeholders", () => {
    for (const [key, entry] of Object.entries(en as Messages)) {
      expect(Object.keys((tr as Messages)[key]?.placeholders ?? {}), key).toEqual(Object.keys(entry.placeholders ?? {}));
    }
  });
});
