// Pure config edits used by the options page; every result is re-validated (spec §8).
import { type Action, type Config, type Environment, type ParseResult, originPattern, parseConfig } from "../core/config";

export function newEnvironment(name: string, kibanaUrl: string, id: string = crypto.randomUUID()): Environment {
  return { id, name: name.trim(), kibanaUrl: kibanaUrl.trim() };
}

export function withEnvironment(config: Config, environment: Environment): ParseResult {
  return parseConfig({ ...config, environments: [...config.environments, environment] });
}

/** parseConfig drops the removed id from actions and disables actions that were scoped only to it. */
export function withoutEnvironment(config: Config, environmentId: string): ParseResult {
  return parseConfig({
    ...config,
    environments: config.environments.filter((environment) => environment.id !== environmentId),
  });
}

/** A blank action for the editor; the label must be filled in before it validates. */
export function newAction(kind: Action["kind"], id: string = crypto.randomUUID()): Action {
  const base = { id, label: "", enabled: true, environmentIds: [], conditions: [] };
  return kind === "link" ? { ...base, kind, urlTemplate: "https://" } : { ...base, kind, queryTemplate: "" };
}

/** Replaces the action with the same id in place, or appends it. */
export function withAction(config: Config, action: Action): ParseResult {
  const exists = config.actions.some((item) => item.id === action.id);
  const actions = exists ? config.actions.map((item) => (item.id === action.id ? action : item)) : [...config.actions, action];
  return parseConfig({ ...config, actions });
}

export function withoutAction(config: Config, actionId: string): ParseResult {
  return parseConfig({ ...config, actions: config.actions.filter((action) => action.id !== actionId) });
}

const lines = (text: string): string[] =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/** Both lists are edited as text, one entry per line. */
export function withCopySettings(config: Config, markdownFields: string, maskPatterns: string): ParseResult {
  return parseConfig({ ...config, copy: { markdownFields: lines(markdownFields), maskPatterns: lines(maskPatterns) } });
}

/** Spec §8: the file is validated as a whole; the caller previews it and replaces the settings. */
export function parseImport(text: string): ParseResult {
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch (error) {
    return { ok: false, errors: [`(file): ${(error as Error).message}`] };
  }
  return parseConfig(input);
}

/**
 * Granted host permission patterns that no environment of `after` needs. Compared with what Chrome granted,
 * not with the previous config: after a corrupt load that is the empty fallback, which needs nothing.
 */
export function unusedOrigins(granted: string[], after: Config): string[] {
  const needed = new Set(after.environments.map((environment) => originPattern(environment.kibanaUrl)));
  return granted.filter((pattern) => !needed.has(pattern));
}