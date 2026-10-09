import { describe, expect, it } from "vitest";
import { type Action, type Config, type Environment, emptyConfig } from "../../../src/core/config";
import {
  newAction,
  newEnvironment,
  parseImport,
  unusedOrigins,
  withAction,
  type VariableRow,
  variableRows,
  variableWarnings,
  withCopySettings,
  withEnvironment,
  withVariables,
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
      variables: {},
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
    const result = parseImport(JSON.stringify({ ...emptyConfig(), schemaVersion: 3 }));
    expect(!result.ok && result.errors[0]).toMatch(/^schemaVersion: /);
  });

  it("imports a version 1 file as version 2", () => {
    const result = parseImport(JSON.stringify({ ...emptyConfig(), schemaVersion: 1 }));
    expect(result.ok && result.config.schemaVersion).toBe(2);
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

describe("variables table", () => {
  const twoEnvironments = (): Config => ({
    ...emptyConfig(),
    environments: [
      { id: "alpha", name: "Alpha", kibanaUrl: "https://elk.alpha.test", variables: { adminUrl: "https://admin.alpha.test", only: "a" } },
      { id: "prod", name: "Prod", kibanaUrl: "https://elk.prod.test", variables: { adminUrl: "https://admin.prod.test" } },
    ],
  });
  const variablesOf = (result: ReturnType<typeof withVariables>) => {
    if (!result.ok) throw new Error(result.errors.join("; "));
    return result.config.environments.map((environment) => environment.variables);
  };

  it("lists every name once, sorted, with each environment's value or an empty one", () => {
    expect(variableRows(twoEnvironments())).toEqual([
      { name: "adminUrl", values: { alpha: "https://admin.alpha.test", prod: "https://admin.prod.test" } },
      { name: "only", values: { alpha: "a", prod: "" } },
    ]);
  });

  it("does not read inherited keys when an environment id is constructor", () => {
    const config = twoEnvironments();
    config.environments[0]!.id = "constructor";
    expect(variablesOf(withVariables(config, [{ name: "a", values: {} }]))).toEqual([{}, {}]);
  });

  it("reads only an environment's own keys, so a variable named constructor is empty elsewhere", () => {
    // Review Focus 2: without Object.hasOwn the prod cell would be Object.prototype.constructor.
    const config = twoEnvironments();
    config.environments[0]!.variables = { constructor: "c" };
    config.environments[1]!.variables = {};
    expect(variableRows(config)).toEqual([{ name: "constructor", values: { alpha: "c", prod: "" } }]);
  });

  it("writes rows back trimmed, leaves empty values out and drops blank rows", () => {
    const rows: VariableRow[] = [
      { name: " paymentUrl ", values: { alpha: " https://pay.alpha.test ", prod: "  " } },
      { name: "", values: {} },
    ];
    expect(variablesOf(withVariables(twoEnvironments(), rows))).toEqual([{ paymentUrl: "https://pay.alpha.test" }, {}]);
  });

  it("renames and removes a variable in every environment", () => {
    const [admin] = variableRows(twoEnvironments());
    expect(variablesOf(withVariables(twoEnvironments(), [{ ...admin!, name: "admin" }]))).toEqual([
      { admin: "https://admin.alpha.test" },
      { admin: "https://admin.prod.test" },
    ]);
  });

  it("rejects duplicate names, a row with values but no name, and names the schema does not allow", () => {
    expect(withVariables(twoEnvironments(), [{ name: "a", values: {} }, { name: " a", values: { alpha: "1" } }])).toEqual({
      ok: false,
      errors: ['variables: duplicate name "a"'],
    });
    expect(withVariables(twoEnvironments(), [{ name: " ", values: { alpha: "x" } }])).toEqual({
      ok: false,
      errors: ["variables: a row with values has no name"],
    });
    const invalid = withVariables(twoEnvironments(), [{ name: "a.b", values: { alpha: "x" } }]);
    expect(!invalid.ok && invalid.errors[0]).toMatch(/^environments\.0\.variables\.a\.b: /);
  });
});

describe("variableWarnings", () => {
  const environments: Environment[] = [
    { id: "alpha", name: "Alpha", kibanaUrl: "https://elk.alpha.test", variables: { adminUrl: "https://admin.alpha.test", app: "api" } },
    { id: "prod", name: "Prod", kibanaUrl: "https://elk.prod.test", variables: { adminUrl: "admin.prod.test" } },
  ];
  const linkAction = (urlTemplate: string, environmentIds: string[] = []): Action => ({
    id: "l",
    kind: "link",
    label: "L",
    enabled: true,
    environmentIds,
    conditions: [],
    urlTemplate,
  });

  it("lists missing variables and a leading one that is not http(s), per environment the action applies to", () => {
    expect(variableWarnings(environments, linkAction("{env.adminUrl}/u/{user_id}?app={env.app}"))).toEqual([
      { environment: "Prod", variable: "app", kind: "missing" },
      { environment: "Prod", variable: "adminUrl", kind: "invalid" },
    ]);
    expect(variableWarnings(environments, linkAction("{env.adminUrl}/u/{env.app}", ["alpha"]))).toEqual([]);
  });

  it("checks Discover queries for missing variables only, once per name", () => {
    const query: Action = {
      id: "d",
      kind: "discover",
      label: "D",
      enabled: true,
      environmentIds: [],
      conditions: [],
      queryTemplate: "app:{env.app} or app2:{env.app}",
    };
    expect(variableWarnings(environments, query)).toEqual([{ environment: "Prod", variable: "app", kind: "missing" }]);
  });

  it("ignores placeholders that also have a field path", () => {
    expect(variableWarnings(environments, linkAction("https://{context.host|env.host}/x"))).toEqual([]);
  });
});

describe("withAction target data view", () => {
  const base = (): Config => ({ ...emptyConfig(), environments: [newEnvironment("A", "https://a.example.com", "e1")] });

  it("trims the target when saved, keeps inner spaces, and drops an empty one", () => {
    // Review Focus 3: the editor keeps what was typed; only saving trims.
    const saved = (action: Action) => {
      const result = withAction(base(), action);
      if (!result.ok) throw new Error(result.errors.join("; "));
      return result.config.actions[0];
    };
    expect(saved({ ...newAction("discover", "d"), label: "D", dataViewName: "  App logs " } as Action)).toMatchObject({
      dataViewName: "App logs",
    });
    expect(saved({ ...newAction("discover", "d"), label: "D", dataViewId: "   " } as Action)).not.toHaveProperty("dataViewId");
  });
});
