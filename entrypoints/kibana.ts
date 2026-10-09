import { createElement } from "react";
import { type Root, createRoot } from "react-dom/client";
import { defineUnlistedScript } from "#imports";
import { browser } from "wxt/browser";
import { findDetailViews } from "../src/adapters/detect";
import type { DetailView } from "../src/adapters/types";
import { ActionBar } from "../src/content/ActionBar";
import { type Mount, type MountHandle, reconcileMounts } from "../src/content/mounts";
import { BAR_CSS } from "../src/content/styles";
import { type Action, type Config, actionsForEnvironment, activeEnvironment, basePathOf } from "../src/core/config";
import { createKibanaClient } from "../src/kibana/client";
import { kibanaPrefix } from "../src/kibana/prefix";
import { createConfigStore, isConfigChange } from "../src/storage";
import { themeBehind } from "../src/theme";
import { reportTheme } from "../src/toolbar-icon";

const LOG = "[kibanatool]";

// Registered at runtime for granted Kibana origins (see src/background/registration.ts).
export default defineUnlistedScript(() => {
  start().catch((error: unknown) => console.debug(LOG, "inactive:", error));
});

async function start(): Promise<void> {
  reportTheme((message) => browser.runtime.sendMessage(message), window.matchMedia("(prefers-color-scheme: dark)"));
  const store = createConfigStore(browser.storage.local);
  let config: Config = (await store.load()).config;
  const startEnvironment = activeEnvironment(config, location.href);
  // The base path may itself contain "/app/" (spec §6.1), so the search starts after it.
  const found = kibanaPrefix(location.pathname, startEnvironment ? basePathOf(startEnvironment.kibanaUrl) : "");
  if (found === null) return;
  // Typed binding: hoisted function declarations below (run, createMount) do not see narrowing.
  const prefix: string = found;
  const client = createKibanaClient({ prefix, fetch: (input, init) => window.fetch(input, init) });
  const mounts = new Map<Element, Mount>();
  // Recomputed only when the config changes: the bars refetch when this array changes identity.
  let environment = activeEnvironment(config, location.href);
  let actions = currentActions();

  function currentActions(): Action[] {
    return environment ? actionsForEnvironment(config, environment.id) : [];
  }

  function createMount(host: HTMLElement): MountHandle {
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = BAR_CSS;
    const container = document.createElement("div");
    shadow.append(style, container);
    const root: Root = createRoot(container, {
      onUncaughtError: (error: unknown) => console.debug(LOG, "render failed:", error),
    });
    let loggedMissing = false;
    return {
      render(view: DetailView) {
        // The host is placed by now; Kibana's theme only changes with a reload, but a bar can move.
        const theme = themeBehind(host);
        if (host.dataset.ktTheme !== theme) host.dataset.ktTheme = theme;
        const identity = view.identity;
        if (!identity && !loggedMissing) {
          loggedMissing = true;
          console.debug(LOG, "no document identity in this detail view; bar hidden");
        }
        const open = environment;
        // The copy menu needs no actions, so every identified log gets a bar.
        root.render(
          identity && open
            ? createElement(ActionBar, {
                key: `${identity.index}/${identity.id}`,
                identity,
                actions,
                client,
                prefix,
                hash: location.hash,
                copy: config.copy,
                environment: open,
              })
            : null,
        );
      },
      destroy() {
        root.unmount();
      },
    };
  }

  function run(): void {
    try {
      const views = activeEnvironment(config, location.href) ? findDetailViews(document, location, prefix) : [];
      reconcileMounts(views, mounts, createMount, document);
    } catch (error) {
      console.debug(LOG, "reconcile failed:", error);
    }
  }

  let scheduled: number | undefined;
  function schedule(): void {
    if (scheduled !== undefined) return;
    scheduled = window.setTimeout(() => {
      scheduled = undefined;
      run();
    }, 100);
  }

  new MutationObserver(schedule).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["href"],
  });
  window.addEventListener("hashchange", schedule);
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (!isConfigChange(changes, areaName)) return;
    void store
      .load()
      .then((loaded) => {
        config = loaded.config;
        environment = activeEnvironment(config, location.href);
        actions = currentActions();
        run();
      })
      .catch((error: unknown) => console.debug(LOG, "config reload failed:", error));
  });
  run();
}
