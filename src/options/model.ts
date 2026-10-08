// Pure config edits used by the options page; every result is re-validated (spec §8).
import { type Config, type Environment, type ParseResult, parseConfig } from "../core/config";

export function newEnvironment(name: string, kibanaUrl: string, id: string = crypto.randomUUID()): Environment {
  return { id, name: name.trim(), kibanaUrl: kibanaUrl.trim() };
}

export function withEnvironment(config: Config, environment: Environment): ParseResult {
  return parseConfig({ ...config, environments: [...config.environments, environment] });
}

/** Actions keep their environmentIds: an action scoped only to a removed environment simply stops showing. */
export function withoutEnvironment(config: Config, environmentId: string): Config {
  return { ...config, environments: config.environments.filter((environment) => environment.id !== environmentId) };
}

export function withActionsJson(config: Config, text: string): ParseResult {
  let actions: unknown;
  try {
    actions = JSON.parse(text);
  } catch (error) {
    return { ok: false, errors: [`actions: ${(error as Error).message}`] };
  }
  return parseConfig({ ...config, actions });
}
