import { describe, expect, it } from "vitest";
import type { Action, LinkAction } from "../../../src/core/config";
import { buildLinkButtons } from "../../../src/core/link-actions";

const link = (overrides: Partial<LinkAction> = {}): LinkAction => ({
  id: "a",
  kind: "link",
  label: "A",
  enabled: true,
  environmentIds: [],
  conditions: [],
  urlTemplate: "https://x.test/users/{user_id}",
  ...overrides,
});

describe("buildLinkButtons", () => {
  it("builds buttons with resolved, encoded URLs in action order", () => {
    const actions: Action[] = [link({ id: "a", label: "A" }), link({ id: "b", label: "B", urlTemplate: "https://y.test/?q={msg}" })];
    expect(buildLinkButtons(actions, { user_id: 7, msg: "a b" })).toEqual([
      { id: "a", label: "A", url: "https://x.test/users/7" },
      { id: "b", label: "B", url: "https://y.test/?q=a%20b" },
    ]);
  });

  it("skips disabled, discover, condition-failing and unresolved actions", () => {
    const actions: Action[] = [
      link({ id: "disabled", enabled: false }),
      {
        id: "discover",
        kind: "discover",
        label: "D",
        enabled: true,
        environmentIds: [],
        conditions: [],
        queryTemplate: "user_id:{user_id}",
      },
      link({ id: "condition", conditions: [{ field: "level", op: "equals", value: "400" }] }),
      link({ id: "unresolved", urlTemplate: "https://x.test/{missing}" }),
      link({ id: "ok" }),
    ];
    expect(buildLinkButtons(actions, { user_id: 1, level: 200 }).map((button) => button.id)).toEqual(["ok"]);
  });

  it("drops a resolved URL that is not http(s) even if the template skipped validation", () => {
    expect(buildLinkButtons([link({ urlTemplate: "{target}" })], { target: "javascript:alert(1)" })).toEqual([]);
  });
});
