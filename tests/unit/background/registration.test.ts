import { describe, expect, it } from "vitest";
import { type Config, emptyConfig } from "../../../src/core/config";
import {
  BRIDGE_SCRIPT_FILE,
  BRIDGE_SCRIPT_ID,
  CONTENT_SCRIPT_FILE,
  CONTENT_SCRIPT_ID,
  serialized,
  syncContentScripts,
} from "../../../src/background/registration";

/** `registered`: the script ids Chrome already holds, as getRegisteredContentScripts filters them. */
function fakes(options: { granted: string[]; registered?: string[] }) {
  const calls: Array<[string, unknown]> = [];
  const scripting = {
    async getRegisteredContentScripts(filter?: { ids?: string[] }) {
      return (options.registered ?? [])
        .filter((id) => filter?.ids?.includes(id) ?? true)
        .map((id) => ({ id, matches: ["http://old/*"] }));
    },
    async registerContentScripts(scripts: unknown[]) {
      calls.push(["register", scripts]);
    },
    async updateContentScripts(scripts: unknown[]) {
      calls.push(["update", scripts]);
    },
    async unregisterContentScripts(filter?: { ids?: string[] }) {
      calls.push(["unregister", filter?.ids]);
    },
  };
  const permissions = {
    async contains(request: { origins: string[] }) {
      return request.origins.every((origin) => options.granted.includes(origin));
    },
  };
  return { scripting, permissions, calls };
}

const config: Config = {
  ...emptyConfig(),
  environments: [
    { id: "a", name: "A", kibanaUrl: "https://kibana.example.com", variables: {} },
    { id: "b", name: "B", kibanaUrl: "https://kibana.example.com/other", variables: {} },
    { id: "c", name: "C", kibanaUrl: "http://localhost:9601", variables: {} },
  ],
};

describe("syncContentScripts", () => {
  const content = (matches: string[]) => ({
    id: CONTENT_SCRIPT_ID,
    matches,
    js: [CONTENT_SCRIPT_FILE],
    runAt: "document_idle",
    persistAcrossSessions: true,
  });
  // Spec 003 research R3: the page-context script, idle until the content script asks, ready before its first pass.
  const bridge = (matches: string[]) => ({
    id: BRIDGE_SCRIPT_ID,
    matches,
    js: [BRIDGE_SCRIPT_FILE],
    runAt: "document_start",
    persistAcrossSessions: true,
    world: "MAIN",
  });

  it("registers the content script and the page-context script for granted origins only, deduplicated", async () => {
    const deps = fakes({ granted: ["https://kibana.example.com/*"] });
    await expect(syncContentScripts(config, deps)).resolves.toEqual(["https://kibana.example.com/*"]);
    expect(deps.calls).toEqual([["register", [content(["https://kibana.example.com/*"]), bridge(["https://kibana.example.com/*"])]]]);
  });

  it("updates existing registrations", async () => {
    const matches = ["http://localhost:9601/*", "https://kibana.example.com/*"];
    const deps = fakes({ granted: matches, registered: [CONTENT_SCRIPT_ID, BRIDGE_SCRIPT_ID] });
    await syncContentScripts(config, deps);
    expect(deps.calls).toEqual([["update", [content(matches), bridge(matches)]]]);
  });

  it("registers the bridge beside an older install's content script instead of updating an unknown id", async () => {
    const deps = fakes({ granted: ["https://kibana.example.com/*"], registered: [CONTENT_SCRIPT_ID] });
    await syncContentScripts(config, deps);
    expect(deps.calls).toEqual([
      ["update", [content(["https://kibana.example.com/*"])]],
      ["register", [bridge(["https://kibana.example.com/*"])]],
    ]);
  });

  it("unregisters both when no origin is granted and does nothing when nothing was registered", async () => {
    const registered = fakes({ granted: [], registered: [CONTENT_SCRIPT_ID, BRIDGE_SCRIPT_ID] });
    await expect(syncContentScripts(config, registered)).resolves.toEqual([]);
    expect(registered.calls).toEqual([["unregister", [CONTENT_SCRIPT_ID, BRIDGE_SCRIPT_ID]]]);
    const fresh = fakes({ granted: [] });
    await syncContentScripts(config, fresh);
    expect(fresh.calls).toEqual([]);
  });
});

describe("serialized", () => {
  it("starts each call only after the previous one has settled", async () => {
    const events: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let call = 0;
    const run = serialized(async () => {
      const n = ++call;
      events.push(`start ${n}`);
      if (n === 1) await gate;
      events.push(`end ${n}`);
    });
    const first = run();
    const second = run();
    await Promise.resolve();
    expect(events).toEqual(["start 1"]);
    release();
    await Promise.all([first, second]);
    expect(events).toEqual(["start 1", "end 1", "start 2", "end 2"]);
  });
});
