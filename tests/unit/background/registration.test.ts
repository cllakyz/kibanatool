import { describe, expect, it } from "vitest";
import { type Config, emptyConfig } from "../../../src/core/config";
import {
  CONTENT_SCRIPT_FILE,
  CONTENT_SCRIPT_ID,
  serialized,
  syncContentScripts,
} from "../../../src/background/registration";

function fakes(options: { granted: string[]; registered?: boolean }) {
  const calls: string[] = [];
  let lastScripts: unknown[] = [];
  const scripting = {
    async getRegisteredContentScripts() {
      return options.registered ? [{ id: CONTENT_SCRIPT_ID, matches: ["http://old/*"] }] : [];
    },
    async registerContentScripts(scripts: unknown[]) {
      calls.push("register");
      lastScripts = scripts;
    },
    async updateContentScripts(scripts: unknown[]) {
      calls.push("update");
      lastScripts = scripts;
    },
    async unregisterContentScripts() {
      calls.push("unregister");
    },
  };
  const permissions = {
    async contains(request: { origins: string[] }) {
      return request.origins.every((origin) => options.granted.includes(origin));
    },
  };
  return { scripting, permissions, calls, lastScripts: () => lastScripts };
}

const config: Config = {
  ...emptyConfig(),
  environments: [
    { id: "a", name: "A", kibanaUrl: "https://kibana.example.com" },
    { id: "b", name: "B", kibanaUrl: "https://kibana.example.com/other" },
    { id: "c", name: "C", kibanaUrl: "http://localhost:9601" },
  ],
};

describe("syncContentScripts", () => {
  it("registers the content script for granted origins only, deduplicated", async () => {
    const deps = fakes({ granted: ["https://kibana.example.com/*"] });
    await expect(syncContentScripts(config, deps)).resolves.toEqual(["https://kibana.example.com/*"]);
    expect(deps.calls).toEqual(["register"]);
    expect(deps.lastScripts()).toEqual([
      {
        id: CONTENT_SCRIPT_ID,
        matches: ["https://kibana.example.com/*"],
        js: [CONTENT_SCRIPT_FILE],
        runAt: "document_idle",
        persistAcrossSessions: true,
      },
    ]);
  });

  it("updates an existing registration", async () => {
    const deps = fakes({ granted: ["https://kibana.example.com/*", "http://localhost:9601/*"], registered: true });
    await syncContentScripts(config, deps);
    expect(deps.calls).toEqual(["update"]);
  });

  it("unregisters when no origin is granted and does nothing when nothing was registered", async () => {
    const registered = fakes({ granted: [], registered: true });
    await expect(syncContentScripts(config, registered)).resolves.toEqual([]);
    expect(registered.calls).toEqual(["unregister"]);
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
