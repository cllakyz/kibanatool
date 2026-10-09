// Pure config edits used by the options page; every result is re-validated (spec §8).
import { type Action, type Config, type Environment, type ParseResult, originPattern, parseConfig } from "../core/config";
import { invalidLeadingVariable } from "../core/link-actions";
import { VARIABLE_PREFIX, isVariablePath, lookupVariable, parsePlaceholders } from "../core/template";

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

/** Trims the editor's free-text target; an empty one means none (Plan 4 spec §6). */
function withTrimmedTarget(action: Action): Action {
  if (action.kind !== "discover") return action;
  const { dataViewId, dataViewName, ...rest } = action;
  const id = dataViewId?.trim();
  const name = dataViewName?.trim();
  return { ...rest, ...(id ? { dataViewId: id } : {}), ...(name ? { dataViewName: name } : {}) };
}

/** Replaces the action with the same id in place, or appends it. */
export function withAction(config: Config, action: Action): ParseResult {
  const saved = withTrimmedTarget(action);
  const exists = config.actions.some((item) => item.id === saved.id);
  const actions = exists ? config.actions.map((item) => (item.id === saved.id ? saved : item)) : [...config.actions, saved];
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

export interface VariableWarning {
  /** The environment's name. */
  environment: string;
  variable: string;
  kind: "missing" | "invalid";
}

/**
 * Plan 4 spec §6, from the settings alone: per environment the action applies to, the variables its
 * template needs but the environment lacks, and a leading variable whose value is not an http(s) address.
 */
export function variableWarnings(environments: Environment[], action: Action): VariableWarning[] {
  const applies = action.environmentIds.length === 0 ? environments : environments.filter((environment) => action.environmentIds.includes(environment.id));
  const template = action.kind === "link" ? action.urlTemplate : action.queryTemplate;
  const placeholders = parsePlaceholders(template).filter((placeholder) => placeholder.paths.every(isVariablePath));
  return applies.flatMap((environment): VariableWarning[] => {
    const missing = new Set(
      placeholders
        .filter((placeholder) => placeholder.paths.every((path) => lookupVariable(environment.variables, path) === null))
        .map((placeholder) => (placeholder.paths[0] ?? "").slice(VARIABLE_PREFIX.length)),
    );
    const warnings = [...missing].map((variable): VariableWarning => ({ environment: environment.name, variable, kind: "missing" }));
    const invalid = action.kind === "link" ? invalidLeadingVariable(action.urlTemplate, environment.variables) : undefined;
    return invalid === undefined ? warnings : [...warnings, { environment: environment.name, variable: invalid, kind: "invalid" }];
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
