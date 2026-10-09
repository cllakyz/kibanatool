// Pure config edits used by the options page; every result is re-validated (spec §8).
import { type Action, type Config, type Environment, type ParseResult, originPattern, parseConfig } from "../core/config";

export function newEnvironment(name: string, kibanaUrl: string, id: string = crypto.randomUUID()): Environment {
  return { id, name: name.trim(), kibanaUrl: kibanaUrl.trim(), variables: {} };
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

/** One row of the variables table (Plan 4 spec §6): a name and its value per environment id. */
export interface VariableRow {
  name: string;
  values: Record<string, string>;
}

/** Every variable name of any environment, sorted, with each environment's value ("" when not set). */
export function variableRows(config: Config): VariableRow[] {
  const names = [...new Set(config.environments.flatMap((environment) => Object.keys(environment.variables)))].sort();
  return names.map((name) => ({
    name,
    values: Object.fromEntries(
      // Own keys only: a variable named "constructor" in one environment must read as empty in the others.
      config.environments.map((environment) => [
        environment.id,
        Object.hasOwn(environment.variables, name) ? (environment.variables[name] ?? "") : "",
      ]),
    ),
  }));
}

/** Writes the table back: names and values trimmed, empty values left out, rows with neither dropped. */
export function withVariables(config: Config, rows: VariableRow[]): ParseResult {
  const kept = rows
    .map((row) => ({ name: row.name.trim(), values: row.values }))
    .filter((row) => row.name !== "" || Object.values(row.values).some((value) => value.trim() !== ""));
  const names = new Set<string>();
  for (const row of kept) {
    if (row.name === "") return { ok: false, errors: ["variables: a row with values has no name"] };
    if (names.has(row.name)) return { ok: false, errors: [`variables: duplicate name "${row.name}"`] };
    names.add(row.name);
  }
  return parseConfig({
    ...config,
    environments: config.environments.map((environment) => ({
      ...environment,
      variables: Object.fromEntries(
        kept.flatMap((row) => {
          const value = (row.values[environment.id] ?? "").trim();
          return value === "" ? [] : [[row.name, value]];
        }),
      ),
    })),
  });
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
 * Only patterns of the shape `originPattern` emits count: wildcard grants the extension did not request
 * ("On all sites", enterprise policy) are left alone.
 */
export function unusedOrigins(granted: string[], after: Config): string[] {
  const needed = new Set(after.environments.map((environment) => originPattern(environment.kibanaUrl)));
  return granted.filter((pattern) => /^https?:\/\/[^*/]+\/\*$/.test(pattern) && !needed.has(pattern));
}
