import { describe, expect, it } from "vitest";
import example from "../../examples/kibanatool-settings.json";
import { parseConfig } from "../../src/core/config";

describe("examples/kibanatool-settings.json", () => {
  it("is valid settings that import without repairs", () => {
    expect(parseConfig(example)).toEqual({ ok: true, config: example });
  });
});
