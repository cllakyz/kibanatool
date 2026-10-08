import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  type Config,
  actionsForEnvironment,
  activeEnvironment,
  basePathOf,
  emptyConfig,
  originPattern,
  parseConfig,
} from "../../../src/core/config";

const validConfig = (): Config => ({
  schemaVersion: 1,
  environments: [{ id: "prod", name: "Prod", kibanaUrl: "https://kibana.example.com" }],
  actions: [
    {
      id: "admin",
      kind: "link",
      label: "Admin",
      enabled: true,
      environmentIds: [],
      conditions: [{ field: "user_id", op: "exists" }],
      urlTemplate: "https://admin.example.com/users/{user_id}",
    },
    {
      id: "same-user",
      kind: "discover",
      label: "Same user",
      enabled: true,
      environmentIds: ["prod"],
      conditions: [],
      queryTemplate: "user_id:{user_id}",
      windowMinutes: 30,
    },
  ],
  copy: { markdownFields: [], maskPatterns: ["*token*"] },
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
    expect(errorsOf(config)).toContain("actions.0.urlTemplate: must start with http:// or https://");
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

  it("rejects an unknown schemaVersion", () => {
    expect(errorsOf({ ...validConfig(), schemaVersion: 2 })[0]).toMatch(/^schemaVersion: /);
  });
});

describe("activeEnvironment", () => {
  const config: Config = {
    ...emptyConfig(),
    environments: [
      { id: "root", name: "Root", kibanaUrl: "https://example.com" },
      { id: "sub", name: "Sub", kibanaUrl: "https://example.com/kibana/" },
      { id: "local", name: "Local", kibanaUrl: "http://localhost:9601" },
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
    config.environments.push({ id: "copy", name: "Copy", kibanaUrl: "https://KIBANA.example.com/" });
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
