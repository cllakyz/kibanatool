import { describe, expect, it } from "vitest";
import { type Config, emptyConfig } from "../../../src/core/config";
import {
  newAction,
  newEnvironment,
  parseImport,
  unusedOrigins,
  withAction,
  withCopySettings,
  withEnvironment,
  withoutAction,
  withoutEnvironment,
} from "../../../src/options/model";

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

describe("actions", () => {
  const base = (): Config => ({ ...emptyConfig(), environments: [newEnvironment("A", "https://a.example.com", "e1")] });

  it("creates blank link and Discover actions", () => {
    expect(newAction("link", "x")).toEqual({
      id: "x",
      kind: "link",
      label: "",
      enabled: true,
      environmentIds: [],
      conditions: [],
      urlTemplate: "https://",
    });
    expect(newAction("discover", "y")).toEqual({
      id: "y",
      kind: "discover",
      label: "",
      enabled: true,
      environmentIds: [],
      conditions: [],
      queryTemplate: "",
    });
  });

  it("appends a new action and replaces one with the same id in place", () => {
    const added = withAction(base(), { ...newAction("link", "x"), label: "Admin" });
    if (!added.ok) throw new Error(added.errors.join("; "));
    const second = withAction(added.config, { ...newAction("discover", "y"), label: "Logs" });
    if (!second.ok) throw new Error(second.errors.join("; "));
    const replaced = withAction(second.config, { ...second.config.actions[0]!, label: "Admin 2" });
    expect(replaced.ok && replaced.config.actions.map((action) => action.label)).toEqual(["Admin 2", "Logs"]);
  });

  it("reports schema errors for an invalid action", () => {
    const result = withAction(base(), newAction("link", "x"));
    expect(!result.ok && result.errors.some((error) => error.startsWith("actions.0.label:"))).toBe(true);
  });

  it("removes an action by id", () => {
    const added = withAction(base(), { ...newAction("link", "x"), label: "Admin" });
    if (!added.ok) throw new Error(added.errors.join("; "));
    const removed = withoutAction(added.config, "x");
    expect(removed.ok && removed.config.actions).toEqual([]);
  });
});

describe("withCopySettings", () => {
  it("reads one entry per line and drops blank lines", () => {
    const result = withCopySettings(emptyConfig(), " level \n\nmessage\n", "*token*\n  *secret*  ");
    expect(result.ok && result.config.copy).toEqual({ markdownFields: ["level", "message"], maskPatterns: ["*token*", "*secret*"] });
  });
});

describe("parseImport", () => {
  it("accepts an exported config", () => {
    const config = { ...emptyConfig(), environments: [newEnvironment("A", "https://a.example.com", "e1")] };
    expect(parseImport(JSON.stringify(config, null, 2))).toEqual({ ok: true, config });
  });

  it("repairs actions scoped to environments the file does not have", () => {
    const result = parseImport(JSON.stringify({ ...emptyConfig(), actions: [action] }));
    expect(result.ok && result.config.actions[0]).toMatchObject({ environmentIds: [], enabled: false });
  });

  it("rejects bad JSON and invalid configs with field paths", () => {
    expect(parseImport("{").ok).toBe(false);
    const result = parseImport(JSON.stringify({ ...emptyConfig(), schemaVersion: 2 }));
    expect(!result.ok && result.errors[0]).toMatch(/^schemaVersion: /);
  });
});

describe("unusedOrigins", () => {
  it("lists granted patterns that no environment needs any more", () => {
    const config = { ...emptyConfig(), environments: [newEnvironment("A", "https://a.example.com/kibana", "e1")] };
    const granted = ["https://a.example.com/*", "http://b.example.com:5601/*"];
    expect(unusedOrigins(granted, config)).toEqual(["http://b.example.com:5601/*"]);
    expect(unusedOrigins(granted, emptyConfig())).toEqual(granted);
    expect(unusedOrigins([], config)).toEqual([]);
  });

  it("leaves wildcard grants the extension did not request alone", () => {
    const wildcards = ["https://*/*", "http://*/*", "*://*/*", "https://*.example.com/*"];
    expect(unusedOrigins(wildcards, emptyConfig())).toEqual([]);
    expect(unusedOrigins([...wildcards, "http://b.example.com:5601/*"], emptyConfig())).toEqual(["http://b.example.com:5601/*"]);
  });
});
