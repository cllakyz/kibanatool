import { describe, expect, it } from "vitest";
import { type Config, emptyConfig } from "../../../src/core/config";
import { newEnvironment, withActionsJson, withEnvironment, withoutEnvironment } from "../../../src/options/model";

const action = {
  id: "admin",
  kind: "link",
  label: "Admin",
  enabled: true,
  environmentIds: ["e1"],
  conditions: [],
  urlTemplate: "https://admin.example.com/users/{user_id}",
};

describe("newEnvironment", () => {
  it("trims the inputs and uses the given id", () => {
    expect(newEnvironment("  Prod ", " https://kibana.example.com ", "e1")).toEqual({
      id: "e1",
      name: "Prod",
      kibanaUrl: "https://kibana.example.com",
    });
  });
});

describe("withEnvironment", () => {
  it("appends a valid environment", () => {
    const result = withEnvironment(emptyConfig(), newEnvironment("Prod", "https://kibana.example.com", "e1"));
    expect(result.ok && result.config.environments.map((environment) => environment.id)).toEqual(["e1"]);
  });

  it("reports invalid URLs and empty names with field paths", () => {
    const result = withEnvironment(emptyConfig(), newEnvironment("", "kibana.example.com", "e1"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("environments.0.kibanaUrl: must be a valid http(s) URL");
      expect(result.errors.some((error) => error.startsWith("environments.0.name:"))).toBe(true);
    }
  });
});

describe("withoutEnvironment", () => {
  it("removes the environment and disables an action that was scoped only to it", () => {
    const config = {
      ...emptyConfig(),
      environments: [newEnvironment("A", "https://a.example.com", "e1"), newEnvironment("B", "https://b.example.com", "e2")],
      actions: [action, { ...action, id: "both", environmentIds: ["e1", "e2"] }],
    } as Config;
    const result = withoutEnvironment(config, "e1");
    if (!result.ok) throw new Error(result.errors.join("; "));
    expect(result.config.environments.map((environment) => environment.id)).toEqual(["e2"]);
    expect(result.config.actions.map(({ id, environmentIds, enabled }) => ({ id, environmentIds, enabled }))).toEqual([
      { id: "admin", environmentIds: [], enabled: false },
      { id: "both", environmentIds: ["e2"], enabled: true },
    ]);
  });
});

describe("withActionsJson", () => {
  it("replaces the actions with a valid JSON array", () => {
    const config = { ...emptyConfig(), environments: [newEnvironment("A", "https://a.example.com", "e1")] };
    const result = withActionsJson(config, JSON.stringify([action]));
    expect(result.ok && result.config.actions).toEqual([action]);
  });

  it("reports JSON syntax errors and schema errors", () => {
    const syntax = withActionsJson(emptyConfig(), "[{");
    expect(!syntax.ok && syntax.errors[0]).toMatch(/^actions: /);
    const schema = withActionsJson(emptyConfig(), JSON.stringify([{ ...action, urlTemplate: "javascript:alert(1)" }]));
    expect(!schema.ok && schema.errors).toContain("actions.0.urlTemplate: must start with http:// or https://");
  });
});
