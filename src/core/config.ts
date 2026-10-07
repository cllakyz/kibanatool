// Configuration schema, validation and lookups (spec §8).
import { z } from "zod";
import { isHttpUrlTemplate } from "./template";

z.config({ jitless: true }); // MV3 forbids eval; skip zod's Function("") fast-path probe

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

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
  urlTemplate: z.string().refine(isHttpUrlTemplate, { error: "must start with http:// or https://" }),
});

const discoverActionSchema = z.object({
  ...actionBase,
  kind: z.literal("discover"),
  queryTemplate: z.string(),
  dataViewId: z.string().min(1).optional(),
  windowMinutes: z.number().int().min(1).max(1440).optional(),
});

const environmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kibanaUrl: z.string().refine(isHttpUrl, { error: "must be a valid http(s) URL" }),
});

export const configSchema = z
  .object({
    schemaVersion: z.literal(1),
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
  });

export type Config = z.infer<typeof configSchema>;
export type Environment = Config["environments"][number];
export type Action = Config["actions"][number];
export type LinkAction = Extract<Action, { kind: "link" }>;
export type DiscoverAction = Extract<Action, { kind: "discover" }>;

export type ParseResult = { ok: true; config: Config } | { ok: false; errors: string[] };

export function parseConfig(input: unknown): ParseResult {
  const result = configSchema.safeParse(input);
  if (result.success) return { ok: true, config: result.data };
  return {
    ok: false,
    errors: result.error.issues.map(
      (issue) => `${issue.path.map(String).join(".") || "(root)"}: ${issue.message}`,
    ),
  };
}

export const DEFAULT_MASK_PATTERNS = ["*authorization*", "*password*", "*token*", "*secret*", "*cookie*"];

export function emptyConfig(): Config {
  return {
    schemaVersion: 1,
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
