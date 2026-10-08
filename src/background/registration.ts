// Keeps the runtime content script registration in sync with environments and granted permissions (spec §9).
import { type Config, originPattern } from "../core/config";

export const CONTENT_SCRIPT_ID = "kibanatool";
export const CONTENT_SCRIPT_FILE = "kibana.js";

export interface RegisteredScript {
  id: string;
  matches: string[];
  js: string[];
  runAt: "document_idle";
  persistAcrossSessions: boolean;
}

export interface ScriptingLike {
  getRegisteredContentScripts(filter?: { ids?: string[] }): Promise<Array<{ id: string }>>;
  registerContentScripts(scripts: RegisteredScript[]): Promise<void>;
  updateContentScripts(scripts: RegisteredScript[]): Promise<void>;
  unregisterContentScripts(filter?: { ids?: string[] }): Promise<void>;
}

export interface PermissionsLike {
  contains(permissions: { origins: string[] }): Promise<boolean>;
}

async function grantedPatterns(config: Config, permissions: PermissionsLike): Promise<string[]> {
  const patterns = [...new Set(config.environments.map((environment) => originPattern(environment.kibanaUrl)))];
  const granted: string[] = [];
  for (const pattern of patterns) {
    if (await permissions.contains({ origins: [pattern] })) granted.push(pattern);
  }
  return granted.sort();
}

/** Runs `task` one call at a time: each call starts only after the previous one has settled. */
export function serialized(task: () => Promise<void>): () => Promise<void> {
  let queue: Promise<void> = Promise.resolve();
  return () => (queue = queue.then(task, task));
}

/** Registers, updates or removes the content script; returns the origins it now runs on. */
export async function syncContentScripts(
  config: Config,
  deps: { scripting: ScriptingLike; permissions: PermissionsLike },
): Promise<string[]> {
  const matches = await grantedPatterns(config, deps.permissions);
  const registered = await deps.scripting.getRegisteredContentScripts({ ids: [CONTENT_SCRIPT_ID] });
  const exists = registered.some((script) => script.id === CONTENT_SCRIPT_ID);
  if (matches.length === 0) {
    if (exists) await deps.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] });
    return matches;
  }
  const script: RegisteredScript = {
    id: CONTENT_SCRIPT_ID,
    matches,
    js: [CONTENT_SCRIPT_FILE],
    runAt: "document_idle",
    persistAcrossSessions: true,
  };
  if (exists) await deps.scripting.updateContentScripts([script]);
  else await deps.scripting.registerContentScripts([script]);
  return matches;
}
