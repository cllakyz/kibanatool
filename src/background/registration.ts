// Keeps the runtime content script registration in sync with environments and granted permissions (spec §9).
import { type Config, originPattern } from "../core/config";

export const CONTENT_SCRIPT_ID = "kibanatool";
export const CONTENT_SCRIPT_FILE = "kibana.js";
/** Spec 003 research R3: the page-context script that reads 7.17 row identities (entrypoints/kibana-bridge.ts). */
export const BRIDGE_SCRIPT_ID = "kibanatool-bridge";
export const BRIDGE_SCRIPT_FILE = "kibana-bridge.js";

export interface RegisteredScript {
  id: string;
  matches: string[];
  js: string[];
  runAt: "document_start" | "document_idle";
  persistAcrossSessions: boolean;
  world?: "MAIN";
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

/**
 * Registers, updates or removes the content script and the page-context script together; returns the origins they
 * now run on. Existence is checked per id: an install from before spec 003 holds the content script but not the
 * bridge, and updating an unknown id throws (research R3).
 */
export async function syncContentScripts(
  config: Config,
  deps: { scripting: ScriptingLike; permissions: PermissionsLike },
): Promise<string[]> {
  const matches = await grantedPatterns(config, deps.permissions);
  const ids = [CONTENT_SCRIPT_ID, BRIDGE_SCRIPT_ID];
  const registered = new Set((await deps.scripting.getRegisteredContentScripts({ ids })).map((script) => script.id));
  if (matches.length === 0) {
    const present = ids.filter((id) => registered.has(id));
    if (present.length > 0) await deps.scripting.unregisterContentScripts({ ids: present });
    return matches;
  }
  const scripts: RegisteredScript[] = [
    { id: CONTENT_SCRIPT_ID, matches, js: [CONTENT_SCRIPT_FILE], runAt: "document_idle", persistAcrossSessions: true },
    // It only adds a listener, so it is ready before the content script's first pass (research R3).
    { id: BRIDGE_SCRIPT_ID, matches, js: [BRIDGE_SCRIPT_FILE], runAt: "document_start", persistAcrossSessions: true, world: "MAIN" },
  ];
  const present = scripts.filter((script) => registered.has(script.id));
  const missing = scripts.filter((script) => !registered.has(script.id));
  if (present.length > 0) await deps.scripting.updateContentScripts(present);
  if (missing.length > 0) await deps.scripting.registerContentScripts(missing);
  return matches;
}
