import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  CONDITION_OPS,
  type Config,
  actionsForEnvironment,
  appliesTo,
  appliesToAll,
  activeEnvironment,
  basePathOf,
  emptyConfig,
  originPattern,
  parseConfig,
  rowActions,
} from "../../../src/core/config";

const validConfig = (): Config => ({
  schemaVersion: 4,
  environments: [{ id: "prod", name: "Prod", kibanaUrl: "https://kibana.example.com", variables: {} }],
  actions: [
    {
      id: "admin",
      kind: "link",
      label: "Admin",
      enabled: true,
      showInRow: false,
      environmentIds: [],
      conditions: [{ field: "user_id", op: "exists" }],
      urlTemplate: "https://admin.example.com/users/{user_id}",
    },
    {
      id: "same-user",
      kind: "discover",
      label: "Same user",
      enabled: true,
      showInRow: false,
      environmentIds: ["prod"],
      conditions: [],
      queryTemplate: "user_id:{user_id}",
      windowMinutes: 30,
    },
  ],
  copy: { markdownFields: [], maskPatterns: ["*token*"], valueMasks: ["iban", "tckn", "gsm", "card"] },
});

function errorsOf(input: unknown): string[] {
  const result = parseConfig(input);
  if (result.ok) throw new Error("expected the config to be rejected");
  return result.errors;
}

describe("parseConfig", () => {
  it("accepts a valid config and the empty config", () => {
    expect(parseConfig(validConfig())).toEqual({ ok: true, config: validConfig() });
    expect(parseConfig(emptyConfig()).ok).toBe(true);
  });

  it("rejects non-http link templates with a field path", () => {
    const config = validConfig();
    config.actions[0] = { ...config.actions[0]!, urlTemplate: "javascript:alert(1)" } as Config["actions"][number];
    expect(errorsOf(config)).toContain("actions.0.urlTemplate: must start with http://, https:// or an {env.…} placeholder");
  });

  it("rejects duplicate ids", () => {
    const config = validConfig();
    config.actions[1] = { ...config.actions[1]!, id: "admin" };
    expect(errorsOf(config)).toContain('actions.1.id: Duplicate id "admin"');
  });

  it("rejects windowMinutes outside 1..1440 or not an integer", () => {
    for (const windowMinutes of [0, 1441, 1.5]) {
      const config = validConfig();
      config.actions[1] = { ...config.actions[1]!, windowMinutes } as Config["actions"][number];
      expect(errorsOf(config).some((error) => error.startsWith("actions.1.windowMinutes:"))).toBe(true);
    }
  });

  it("rejects invalid kibanaUrl values", () => {
    for (const kibanaUrl of ["kibana.example.com", "ftp://kibana.example.com"]) {
      const config = validConfig();
      config.environments[0] = { ...config.environments[0]!, kibanaUrl };
      expect(errorsOf(config)).toContain("environments.0.kibanaUrl: must be a valid http(s) URL");
    }
  });

});

describe("activeEnvironment", () => {
  const config: Config = {
    ...emptyConfig(),
    environments: [
      { id: "root", name: "Root", kibanaUrl: "https://example.com", variables: {} },
      { id: "sub", name: "Sub", kibanaUrl: "https://example.com/kibana/", variables: {} },
      { id: "local", name: "Local", kibanaUrl: "http://localhost:9601", variables: {} },
    ],
  };

  it("picks the environment with the longest matching base path", () => {
    expect(activeEnvironment(config, "https://example.com/kibana/app/discover#/")?.id).toBe("sub");
    expect(activeEnvironment(config, "https://example.com/app/discover#/")?.id).toBe("root");
    expect(activeEnvironment(config, "https://EXAMPLE.com/kibana2/app/discover")?.id).toBe("root");
  });

  it("matches origin exactly, including the port", () => {
    expect(activeEnvironment(config, "http://localhost:9601/app/discover")?.id).toBe("local");
    expect(activeEnvironment(config, "http://localhost:9602/app/discover")).toBeUndefined();
    expect(activeEnvironment(config, "https://example.com.evil.test/app/discover")).toBeUndefined();
  });
});

describe("originPattern", () => {
  it("builds a host permission pattern from the origin", () => {
    expect(originPattern("https://kibana.example.com/kibana")).toBe("https://kibana.example.com/*");
    expect(originPattern("http://localhost:9601")).toBe("http://localhost:9601/*");
  });
});

describe("actionsForEnvironment", () => {
  it("returns enabled actions that are global or scoped to the environment", () => {
    const config = validConfig();
    config.actions.push({ ...config.actions[0]!, id: "off", enabled: false });
    expect(actionsForEnvironment(config, "prod").map((action) => action.id)).toEqual(["admin", "same-user"]);
    expect(actionsForEnvironment(config, "staging").map((action) => action.id)).toEqual(["admin"]);
  });
});

describe("zod runtime config", () => {
  it("runs jitless: MV3 forbids eval, so zod must not probe Function(\"\")", () => {
    expect(z.config().jitless).toBe(true);
  });
});

describe("parseConfig rules added in Plan 2", () => {
  it("requires a value for every operator except exists", () => {
    const config = validConfig();
    config.actions[0] = { ...config.actions[0]!, conditions: [{ field: "level", op: "equals" }] };
    expect(errorsOf(config)).toContain("actions.0.conditions.0.value: value is required for this operator");
    config.actions[0] = { ...config.actions[0]!, conditions: [{ field: "level", op: "exists" }] };
    expect(parseConfig(config).ok).toBe(true);
  });

  it("rejects two environments with the same Kibana URL", () => {
    const config = validConfig();
    config.environments.push({ id: "copy", name: "Copy", kibanaUrl: "https://KIBANA.example.com/", variables: {} });
    expect(errorsOf(config)).toContain("environments.1.kibanaUrl: Duplicate Kibana URL");
  });

  it("drops unknown environment ids and disables an action left with none", () => {
    const config = validConfig();
    config.actions[0] = { ...config.actions[0]!, environmentIds: ["prod", "gone"] };
    config.actions[1] = { ...config.actions[1]!, environmentIds: ["gone"] };
    const result = parseConfig(config);
    expect(result.ok && result.config.actions.map(({ environmentIds, enabled }) => ({ environmentIds, enabled }))).toEqual([
      { environmentIds: ["prod"], enabled: true },
      { environmentIds: [], enabled: false },
    ]);
  });
});

describe("basePathOf", () => {
  it("returns the URL path without trailing slashes", () => {
    expect(basePathOf("https://example.com")).toBe("");
    expect(basePathOf("https://example.com/kibana/")).toBe("/kibana");
    expect(basePathOf("https://example.com/app/kibana")).toBe("/app/kibana");
  });
});

describe("parseConfig version 2 (Plan 4)", () => {
  it("migrates a version 1 config: version 4, environments without variables get none, every value mask is on", () => {
    const v1 = {
      ...validConfig(),
      schemaVersion: 1,
      environments: [{ id: "prod", name: "Prod", kibanaUrl: "https://kibana.example.com" }],
      copy: { markdownFields: [], maskPatterns: ["*token*"] },
    };
    expect(parseConfig(v1)).toEqual({ ok: true, config: validConfig() });
  });

  it("rejects versions other than 1 to 4", () => {
    expect(errorsOf({ ...validConfig(), schemaVersion: 5 })[0]).toMatch(/^schemaVersion: /);
    expect(errorsOf({ ...validConfig(), schemaVersion: 0 })[0]).toMatch(/^schemaVersion: /);
  });

  it("accepts environment variables and rejects a bad name or an empty value", () => {
    const withVariables = (variables: Record<string, string>) => ({
      ...validConfig(),
      environments: [{ ...validConfig().environments[0]!, variables }],
    });
    expect(parseConfig(withVariables({ adminUrl: "https://admin.example.com", "app_name-2": "x" })).ok).toBe(true);
    expect(errorsOf(withVariables({ "a.b": "x" }))[0]).toMatch(/^environments\.0\.variables\.a\.b: /);
    expect(errorsOf(withVariables({ a: "" }))[0]).toMatch(/^environments\.0\.variables\.a: /);
  });

  it("drops a __proto__ variable without touching the prototype", () => {
    const result = parseConfig(
      JSON.parse(
        '{"schemaVersion":2,"environments":[{"id":"p","name":"P","kibanaUrl":"https://k.test","variables":{"__proto__":"https://evil.test"}}],"actions":[],"copy":{"markdownFields":[],"maskPatterns":[]}}',
      ),
    );
    if (!result.ok) throw new Error(result.errors.join("; "));
    const variables = result.config.environments[0]!.variables;
    expect(Object.keys(variables)).toEqual([]);
    expect(Object.getPrototypeOf(variables)).toBe(Object.prototype);
  });

  it("accepts a link template that starts with a placeholder of variables only", () => {
    const withTemplate = (urlTemplate: string): Config => {
      const config = validConfig();
      config.actions[0] = { ...config.actions[0]!, urlTemplate } as Config["actions"][number];
      return config;
    };
    expect(parseConfig(withTemplate("{env.adminUrl}/users/{user_id}")).ok).toBe(true);
    expect(parseConfig(withTemplate("{env.a|env.b}/x")).ok).toBe(true);
    expect(errorsOf(withTemplate("{context.host|env.h}/x"))).toContain(
      "actions.0.urlTemplate: must start with http://, https:// or an {env.…} placeholder",
    );
  });

  it("accepts dataViewName and rejects it together with dataViewId", () => {
    const config = validConfig();
    config.actions[1] = { ...config.actions[1]!, dataViewName: "App logs" } as Config["actions"][number];
    expect(parseConfig(config).ok).toBe(true);
    config.actions[1] = { ...config.actions[1]!, dataViewId: "app-log" } as Config["actions"][number];
    expect(errorsOf(config)).toContain("actions.1.dataViewName: dataViewId and dataViewName cannot both be set");
  });
});

describe("parseConfig version 3 (Plan 5)", () => {
  const v2 = () => ({ ...validConfig(), schemaVersion: 2, copy: { markdownFields: ["level"], maskPatterns: ["*token*"] } });

  it("migrates a version 2 config: version 4 with every value mask on, the rest unchanged", () => {
    expect(parseConfig(v2())).toEqual({
      ok: true,
      config: { ...validConfig(), copy: { markdownFields: ["level"], maskPatterns: ["*token*"], valueMasks: ["iban", "tckn", "gsm", "card"] } },
    });
  });

  it("accepts an empty list and a kind written twice", () => {
    for (const valueMasks of [[], ["gsm", "gsm"]]) {
      expect(parseConfig({ ...validConfig(), copy: { ...validConfig().copy, valueMasks } }).ok).toBe(true);
    }
  });

  it("rejects a missing list and an unknown kind in version 3", () => {
    const { valueMasks: _, ...copy } = validConfig().copy;
    expect(errorsOf({ ...validConfig(), copy })[0]).toMatch(/^copy\.valueMasks: /);
    expect(errorsOf({ ...validConfig(), copy: { ...copy, valueMasks: ["iban", "email"] } })[0]).toMatch(/^copy\.valueMasks\.1: /);
  });

  it("turns every value mask on in the empty config", () => {
    expect(emptyConfig().copy.valueMasks).toEqual(["iban", "tckn", "gsm", "card"]);
  });
});

describe("parseConfig version 4 (spec 003 FR-001 – FR-004)", () => {
  /** validConfig() as an earlier version wrote it: no showInRow on any action. */
  const withoutShowInRow = (schemaVersion: number) => ({
    ...validConfig(),
    schemaVersion,
    actions: validConfig().actions.map(({ showInRow: _, ...action }) => action),
  });

  it("migrates a version 3 config: version 4, every action off the rows, nothing else changed", () => {
    expect(parseConfig(withoutShowInRow(3))).toEqual({ ok: true, config: validConfig() });
  });

  it("migrates versions 1 and 2 the same way, on top of their own conversion", () => {
    const { valueMasks: _, ...copy } = validConfig().copy;
    for (const schemaVersion of [1, 2]) {
      expect(parseConfig({ ...withoutShowInRow(schemaVersion), copy })).toEqual({ ok: true, config: validConfig() });
    }
  });

  it("keeps showInRow in version 4 and rejects an action without it", () => {
    const config = validConfig();
    config.actions[0] = { ...config.actions[0]!, showInRow: true };
    expect(parseConfig(config)).toEqual({ ok: true, config });
    expect(errorsOf(withoutShowInRow(4))[0]).toMatch(/^actions\.0\.showInRow: /);
  });

  it("writes version 4 in the empty config", () => {
    expect(emptyConfig().schemaVersion).toBe(4);
  });

  it("rowActions keeps only the actions marked to show in rows, in order", () => {
    const [admin, sameUser] = validConfig().actions;
    const marked = [{ ...admin!, showInRow: true }, sameUser!, { ...sameUser!, id: "b", showInRow: true }];
    expect(rowActions(marked).map((action) => action.id)).toEqual(["admin", "b"]);
    expect(rowActions([])).toEqual([]);
  });
});

describe("environment scope (spec §8)", () => {
  it("an action with no environment ids applies to every environment", () => {
    expect(appliesToAll({ environmentIds: [] })).toBe(true);
    expect(appliesToAll({ environmentIds: ["a"] })).toBe(false);
    expect(appliesTo({ environmentIds: [] }, "any")).toBe(true);
  });

  it("an action with environment ids applies to those only", () => {
    expect(appliesTo({ environmentIds: ["a", "b"] }, "b")).toBe(true);
    expect(appliesTo({ environmentIds: ["a"] }, "b")).toBe(false);
  });
});

describe("CONDITION_OPS", () => {
  it("lists the operators in the order the options page shows them", () => {
    expect(CONDITION_OPS).toEqual(["exists", "equals", "notEquals", "contains", "startsWith"]);
  });
});
