import { createElement } from "react";
import { type Root, createRoot } from "react-dom/client";
import { defineUnlistedScript } from "#imports";
import { browser } from "wxt/browser";
import { findDetailViews, findRows, rowIdentity, rowOf } from "../src/adapters/detect";
import { IDENTIFY_ROWS_EVENT, rowControlsLeft } from "../src/adapters/legacy-rows";
import type { DetailView } from "../src/adapters/types";
import { ActionBar } from "../src/content/ActionBar";
import { loadDataViews, loadTimeFields, timeFieldTargets } from "../src/content/bar-data";
import { type Mount, type MountHandle, reconcileMounts } from "../src/content/mounts";
import { createRowHost } from "../src/content/row-host";
import { ROW_HOST_TAG, batches } from "../src/content/rows";
import { RowStrip } from "../src/content/RowStrip";
import { BAR_CSS } from "../src/content/styles";
import { type Action, type Config, actionsForEnvironment, activeEnvironment, basePathOf, rowActions } from "../src/core/config";
import { createKibanaClient } from "../src/kibana/client";
import { kibanaPrefix } from "../src/kibana/prefix";
import { createConfigStore } from "../src/storage";
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
  // Spec 003 FR-004: the strip's actions; same lifetime as `actions`, so the strip's fetch effect stays put too.
  let marked = rowActions(actions);
  /** Data views whose lookups for the strip's Discover buttons were started (research R8; SC-003). */
  const warmed = new Set<string>();

  function currentActions(): Action[] {
    return environment ? actionsForEnvironment(config, environment.id) : [];
  }

  // Spec 003: one strip host that moves into the active result row (research R9).
  const rowHostElement = document.createElement(ROW_HOST_TAG);
  const rowShadow = rowHostElement.attachShadow({ mode: "open" });
  const rowStyle = document.createElement("style");
  rowStyle.textContent = BAR_CSS;
  const rowContainer = document.createElement("div");
  rowShadow.append(rowStyle, rowContainer);
  const rowRoot: Root = createRoot(rowContainer, {
    onUncaughtError: (error: unknown) => console.debug(LOG, "row strip failed:", error),
  });
  // On 7.17 the page-context script answers this during dispatchEvent, so the rows' attributes are fresh (research R2).
  const identifyRows = (): boolean => document.dispatchEvent(new CustomEvent(IDENTIFY_ROWS_EVENT));
  const rowHost = createRowHost(document, {
    host: rowHostElement,
    rowOf,
    identify: (row) => {
      identifyRows();
      return rowIdentity(row, location, prefix);
    },
    controlsLeft: rowControlsLeft,
    render(target) {
      const open = environment;
      if (target && open) {
        const theme = themeBehind(rowHostElement);
        if (rowHostElement.dataset.ktTheme !== theme) rowHostElement.dataset.ktTheme = theme;
      }
      rowRoot.render(
        target && open
          ? createElement(RowStrip, {
              key: `${target.identity.index}/${target.identity.id}`,
              identity: target.identity,
              actions: marked,
              client,
              prefix,
              page: location,
              environment: open,
            })
          : null,
      );
    },
  });

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
                page: location,
                now: () => new Date(),
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
    try {
      syncRows();
    } catch (error) {
      console.debug(LOG, "row pass failed:", error);
    }
  }

  /** Spec 003 research R8: only while a marked action applies; otherwise no row is read, fetched or changed (FR-014). */
  function syncRows(): void {
    const on = environment !== undefined && marked.length > 0;
    rowHost.setActive(on);
    if (!on) return;
    rowHost.refresh();
    identifyRows();
    const identities = findRows(document, location, prefix).flatMap(({ identity }) => (identity ? [identity] : []));
    for (const batch of batches(identities.map(({ index, id }) => ({ index, id })))) void client.prefetchDocs(batch);
    // The strip's Discover buttons need the data view's time field; looked up once, so a hover never waits for it.
    const dataViewId = identities[0]?.dataViewId;
    if (dataViewId === undefined || warmed.has(dataViewId)) return;
    warmed.add(dataViewId);
    const targets = marked;
    void loadDataViews(client, targets).then((views) => loadTimeFields(client, timeFieldTargets(targets, dataViewId, views)));
  }

  let scheduled: number | undefined;
  function schedule(): void {
    if (scheduled !== undefined) return;
    scheduled = window.setTimeout(() => {
      scheduled = undefined;
      run();
    }, 100);
  }

  // attributeFilter must stay narrow: the page-context script's row attributes must not trigger passes (spec 003 R9).
  new MutationObserver(schedule).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["href"],
  });
  window.addEventListener("hashchange", schedule);
  store.onChange(() => {
    void store
      .load()
      .then((loaded) => {
        config = loaded.config;
        environment = activeEnvironment(config, location.href);
        actions = currentActions();
        marked = rowActions(actions);
        warmed.clear();
        // The strip shows the new row actions from the next pointer move on (spec 003 FR-014a).
        rowHost.setActive(false);
        run();
      })
      .catch((error: unknown) => console.debug(LOG, "config reload failed:", error));
  });
  run();
}
