// Configuration schema, validation and lookups (spec §8).
import { z } from "zod";
import { isPlainObject } from "./fields";
import { isHttpUrl, isHttpUrlTemplate } from "./template";

z.config({ jitless: true }); // MV3 forbids eval; skip zod's Function("") fast-path probe

const conditionSchema = z.object({
  field: z.string().min(1),
  op: z.enum(["exists", "equals", "notEquals", "contains", "startsWith"]),
  value: z.string().optional(),
});

const actionBase = {
  id: z.string().min(1),
  label: z.string().min(1),
  enabled: z.boolean(),
  environmentIds: z.array(z.string()),
  conditions: z.array(conditionSchema),
};

const linkActionSchema = z.object({
  ...actionBase,
  kind: z.literal("link"),
  urlTemplate: z.string().refine(isHttpUrlTemplate, { error: "must start with http://, https:// or an {env.…} placeholder" }),
});

const discoverActionSchema = z.object({
  ...actionBase,
  kind: z.literal("discover"),
  queryTemplate: z.string(),
  dataViewId: z.string().min(1).optional(),
  dataViewName: z.string().min(1).optional(),
  windowMinutes: z.number().int().min(1).max(1440).optional(),
});

/** Plan 4 spec §3: variable names are letters, digits, `_` and `-`. */
export const VARIABLE_NAME = /^[A-Za-z0-9_-]+$/;

const environmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kibanaUrl: z.string().refine(isHttpUrl, { error: "must be a valid http(s) URL" }),
  // Empty values are not stored; a missing record (version 1, a hand-written file) is none.
  variables: z.record(z.string().regex(VARIABLE_NAME), z.string().min(1)).default({}),
});

export const configSchema = z
  .object({
    schemaVersion: z.literal(2),
    environments: z.array(environmentSchema),
    actions: z.array(z.discriminatedUnion("kind", [linkActionSchema, discoverActionSchema])),
    copy: z.object({
      markdownFields: z.array(z.string()),
      maskPatterns: z.array(z.string()),
    }),
  })
  .superRefine((config, ctx) => {
    const groups = [
      ["environments", config.environments.map((environment) => environment.id)],
      ["actions", config.actions.map((action) => action.id)],
    ] as const;
    for (const [path, ids] of groups) {
      const seen = new Set<string>();
      ids.forEach((id, index) => {
        if (seen.has(id)) {
          ctx.addIssue({ code: "custom", message: `Duplicate id "${id}"`, path: [path, index, "id"], input: id });
        }
        seen.add(id);
      });
    }
    const urls = new Set<string>();
    config.environments.forEach((environment, index) => {
      const key = kibanaUrlKey(environment.kibanaUrl);
      if (key === null) return;
      if (urls.has(key)) {
        ctx.addIssue({ code: "custom", message: "Duplicate Kibana URL", path: ["environments", index, "kibanaUrl"], input: environment.kibanaUrl });
      }
      urls.add(key);
    });
    config.actions.forEach((action, actionIndex) => {
      action.conditions.forEach((condition, conditionIndex) => {
        if (condition.op === "exists" || condition.value !== undefined) return;
        ctx.addIssue({
          code: "custom",
          message: "value is required for this operator",
          path: ["actions", actionIndex, "conditions", conditionIndex, "value"],
          input: condition,
        });
      });
      if (action.kind === "discover" && action.dataViewId !== undefined && action.dataViewName !== undefined) {
        ctx.addIssue({
          code: "custom",
          message: "dataViewId and dataViewName cannot both be set",
          path: ["actions", actionIndex, "dataViewName"],
          input: action.dataViewName,
        });
      }
    });
  });

export type Config = z.infer<typeof configSchema>;
export type Environment = Config["environments"][number];
export type Action = Config["actions"][number];
export type LinkAction = Extract<Action, { kind: "link" }>;
export type DiscoverAction = Extract<Action, { kind: "discover" }>;

export type ParseResult = { ok: true; config: Config } | { ok: false; errors: string[] };

export const SCHEMA_VERSION = 2;

/**
 * Plan 4 spec §3: version 1 had no variables and no dataViewName, so it only needs the new number. Done here,
 * so both imported files and settings already in chrome.storage (storage.ts) are converted, not dropped.
 */
function migrate(input: unknown): unknown {
  return isPlainObject(input) && input.schemaVersion === 1 ? { ...input, schemaVersion: SCHEMA_VERSION } : input;
}

export function parseConfig(input: unknown): ParseResult {
  const result = configSchema.safeParse(migrate(input));
  if (result.success) return { ok: true, config: withKnownEnvironments(result.data) };
  return {
    ok: false,
    errors: result.error.issues.map(
      (issue) => `${issue.path.map(String).join(".") || "(root)"}: ${issue.message}`,
    ),
  };
}

/**
 * Drops environment ids that no environment has (removed environments, hand-edited imports).
 * An action left with none would widen to every environment, so it is disabled instead.
 */
function withKnownEnvironments(config: Config): Config {
  const known = new Set(config.environments.map((environment) => environment.id));
  return {
    ...config,
    actions: config.actions.map((action) => {
      const environmentIds = action.environmentIds.filter((id) => known.has(id));
      if (environmentIds.length === action.environmentIds.length) return action;
      return { ...action, environmentIds, enabled: action.enabled && environmentIds.length > 0 };
    }),
  };
}

/** Origin plus base path, so "https://X.test/" and "https://x.test" count as the same Kibana. */
function kibanaUrlKey(kibanaUrl: string): string | null {
  try {
    return `${new URL(kibanaUrl).origin}${basePathOf(kibanaUrl)}`;
  } catch {
    return null; // an invalid URL is reported by its own rule; superRefine may still run
  }
}

export const DEFAULT_MASK_PATTERNS = ["*authorization*", "*password*", "*token*", "*secret*", "*cookie*"];

export function emptyConfig(): Config {
  return {
    schemaVersion: SCHEMA_VERSION,
    environments: [],
    actions: [],
    copy: { markdownFields: [], maskPatterns: [...DEFAULT_MASK_PATTERNS] },
  };
}

/** Length of the matched base path, or -1 when `href` is not under `kibanaUrl`. */
function matchLength(kibanaUrl: string, href: string): number {
  let base: URL;
  let target: URL;
  try {
    base = new URL(kibanaUrl);
    target = new URL(href);
  } catch {
    return -1;
  }
  if (base.origin !== target.origin) return -1;
  const basePath = base.pathname.replace(/\/+$/, "");
  if (basePath === "") return 0;
  if (target.pathname === basePath || target.pathname.startsWith(`${basePath}/`)) return basePath.length;
  return -1;
}

/** Spec §8: the environment whose kibanaUrl prefixes `href`; the longest base path wins. */
export function activeEnvironment(config: Config, href: string): Environment | undefined {
  let best: Environment | undefined;
  let bestLength = -1;
  for (const environment of config.environments) {
    const length = matchLength(environment.kibanaUrl, href);
    if (length > bestLength) {
      best = environment;
      bestLength = length;
    }
  }
  return best;
}

/** "https://x/kibana/" → "/kibana"; "https://x" → "". Throws on an invalid URL. */
export function basePathOf(kibanaUrl: string): string {
  return new URL(kibanaUrl).pathname.replace(/\/+$/, "");
}

/** Host permission pattern for an environment (spec §9). Throws on an invalid URL. */
export function originPattern(kibanaUrl: string): string {
  return `${new URL(kibanaUrl).origin}/*`;
}

export function actionsForEnvironment(config: Config, environmentId: string): Action[] {
  return config.actions.filter(
    (action) =>
      action.enabled && (action.environmentIds.length === 0 || action.environmentIds.includes(environmentId)),
  );
}
