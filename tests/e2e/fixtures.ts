// Playwright fixtures: every test gets a fresh Chromium profile with the extension (spec §13.2).
import { resolve } from "node:path";
import { type BrowserContext, type Page, type Worker, chromium, expect, test as base } from "@playwright/test";
import { type Config, DEFAULT_MASK_PATTERNS } from "../../src/core/config";
import { CONFIG_KEY } from "../../src/storage";
import { EXTENSION_DIR, stack } from "./stack";

// The extension APIs used inside worker.evaluate (the background service worker), typed as far as needed.
declare const chrome: {
  storage: { local: { get(key: string): Promise<Record<string, unknown>>; set(items: Record<string, unknown>): Promise<void> } };
  scripting: { getRegisteredContentScripts(): Promise<Array<{ matches?: string[] }>> };
};

/** The actions every spec uses; the expected values come from the seeded logs (docker/seed.mjs). */
export function e2eConfig(): Config {
  const shared = { enabled: true, environmentIds: [], conditions: [] };
  return {
    schemaVersion: 1,
    environments: [{ id: "stack", name: `Kibana ${stack.version}`, kibanaUrl: stack.kibana }],
    actions: [
      { ...shared, id: "user", kind: "link", label: "User", urlTemplate: "https://admin.example.com/users/{user_id|user.id}" },
      {
        ...shared,
        id: "error",
        kind: "link",
        label: "Error",
        urlTemplate: "https://errors.example.com/?id={_id}",
        conditions: [{ field: "level_name", op: "equals", value: "ERROR" }],
      },
      { ...shared, id: "same-user", kind: "discover", label: "Same user ±5", queryTemplate: "user_id:{user_id}", windowMinutes: 5 },
      { ...shared, id: "window", kind: "discover", label: "±5 minutes", queryTemplate: "", windowMinutes: 5 },
    ],
    copy: { markdownFields: [], maskPatterns: [...DEFAULT_MASK_PATTERNS] },
  };
}

export function readStored(worker: Worker): Promise<unknown> {
  return worker.evaluate(async (key) => (await chrome.storage.local.get(key))[key], CONFIG_KEY);
}

export function writeStored(worker: Worker, value: unknown): Promise<void> {
  return worker.evaluate(([key, item]) => chrome.storage.local.set({ [key]: item }), [CONFIG_KEY, value] as const);
}

/** Origins the background registered the content script for. */
export function registeredMatches(worker: Worker): Promise<string[]> {
  return worker.evaluate(async () => (await chrome.scripting.getRegisteredContentScripts()).flatMap((script) => script.matches ?? []));
}

interface Fixtures {
  /** A trace is kept for failed tests. Off where it would hold credentials (readonly.spec.ts). */
  recordTrace: boolean;
  context: BrowserContext;
  page: Page;
  extension: { worker: Worker; id: string };
  /** Stores the settings, then waits until the content script is registered for the stack. */
  configure: (config?: Config) => Promise<void>;
}

export const test = base.extend<Fixtures>({
  recordTrace: [true, { option: true }],
  context: async ({ recordTrace }, use, testInfo) => {
    const extension = resolve(EXTENSION_DIR);
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      viewport: { width: 1600, height: 1000 },
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: stack.origin });
    // Pages and the background service worker; the content script itself only logs with console.debug.
    const errors: string[] = [];
    context.on("console", (message) => {
      if (message.type() === "error" && message.text().includes("[kibanatool]")) errors.push(message.text());
    });
    if (recordTrace) await context.tracing.start({ screenshots: true, snapshots: true });
    await use(context);
    if (recordTrace) {
      const failed = testInfo.status !== testInfo.expectedStatus;
      await context.tracing.stop(failed ? { path: testInfo.outputPath("trace.zip") } : {});
    }
    await context.close();
    expect(errors, "[kibanatool] errors in the console").toEqual([]);
  },
  page: async ({ context }, use) => {
    await use(context.pages()[0] ?? (await context.newPage()));
  },
  extension: async ({ context }, use) => {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
    await use({ worker, id: new URL(worker.url()).host });
  },
  configure: async ({ extension }, use) => {
    await use(async (config = e2eConfig()) => {
      await writeStored(extension.worker, config);
      await expect.poll(() => registeredMatches(extension.worker)).toContain(`${stack.origin}/*`);
    });
  },
});

export { expect };
