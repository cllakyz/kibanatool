// The per-document action bar (spec §7.7): link actions, Discover actions, then the copy menu.
import { type SyntheticEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Action, Config, Environment } from "../core/config";
import { buildCurl, requestPrefix } from "../core/curl";
import { buildJson } from "../core/json-copy";
import { panelFields } from "../core/json-tree";
import { buildMarkdown } from "../core/markdown";
import type { ActionButton, DocIdentity } from "../core/types";
import { type MessageKey, t } from "../i18n";
import type { KibanaClient } from "../kibana/client";
import { fixedTimeUrl, singleDocPath } from "../kibana/url";
import { copyText } from "./clipboard";
import { type CopyItem, CopyMenu } from "./CopyMenu";
import { JsonView, PanelBoundary } from "./JsonView";
import { ActionButtons, buildButtons, useLogState } from "./log-buttons";

export interface ActionBarProps {
  identity: DocIdentity;
  /** Recomputed only when the config changes (entrypoints/kibana.ts), so the fetch effect stays put. */
  actions: Action[];
  client: KibanaClient;
  prefix: string;
  /**
   * The page the bar sits on (the host passes `location`): Discover links keep its current time range when no
   * window applies, and copies read its address at the click.
   */
  page: Pick<Location, "href" | "hash" | "origin">;
  /** The clock for "view with fixed time". */
  now: () => Date;
  copy: Config["copy"];
  /** The open environment: its variables fill {env.…}, its name explains passive buttons (Plan 4). */
  environment: Environment;
}

/** Kibana would see these events on the host element otherwise (e.g. arrow keys move the 8.x/9.x flyout). */
const keepInside = (event: SyntheticEvent): void => event.stopPropagation();

export function ActionBar({ identity, actions, client, prefix, page, now, copy, environment }: ActionBarProps) {
  const state = useLogState(identity, actions, client);
  const [notice, setNotice] = useState<MessageKey | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const { dataViewId, index, id } = identity;

  useEffect(() => {
    if (notice === null) return;
    const timer = window.setTimeout(() => setNotice(null), 2500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const hash = page.hash;
  const buttons = useMemo((): { links: ActionButton[]; discover: ActionButton[] } => {
    if (state.status !== "ready") return { links: [], discover: [] };
    const { hit, timeFields, dataViews } = state;
    return buildButtons(hit, actions, { prefix, dataViewId, hash, environment, timeFields, dataViews });
  }, [state, actions, prefix, dataViewId, hash, environment]);

  const panelEntries = useMemo(() => (state.status === "ready" ? panelFields(state.hit._source ?? {}) : []), [state]);

  const hasRequest = useMemo(() => state.status === "ready" && requestPrefix(state.hit._source ?? {}) !== undefined, [state]);

  if (state.status !== "ready") {
    return (
      <div className="kt-root">
        <div className="kt-bar">
          {state.status === "loading" ? (
            <span className="kt-muted">{t("barLoading")}</span>
          ) : (
            <span className="kt-error">{state.message}</span>
          )}
        </div>
      </div>
    );
  }
  const { hit, timeFields } = state;

  // writeText only works inside the click, so nothing is awaited before copyText.
  function copyToClipboard(text: string): void {
    if (!rootRef.current) return;
    copyText(text, rootRef.current).then(
      () => setNotice("noticeCopied"),
      (error: unknown) => {
        console.debug("[kibanatool] copy failed:", error);
        setNotice("noticeCopyFailed");
      },
    );
  }

  const docUrl = (): string => `${page.origin}${singleDocPath(prefix, identity)}`;
  const copyItems: CopyItem[] = [
    {
      label: t("menuCopyMarkdown"),
      text: () =>
        buildMarkdown({
          hit,
          timeField: timeFields.get(dataViewId),
          fields: copy.markdownFields,
          maskPatterns: copy.maskPatterns,
          valueMasks: copy.valueMasks,
          docUrl: docUrl(),
          linkLabel: t("markdownOpenInKibana"),
        }),
    },
    { label: t("menuCopyJson"), text: () => buildJson(hit, copy.maskPatterns, copy.valueMasks) },
    // Plan 7 spec §6: only for a log that records a request, so buildCurl returns a command here.
    ...(hasRequest ? [{ label: t("menuCopyCurl"), text: () => buildCurl(hit, copy.maskPatterns, copy.valueMasks) ?? null }] : []),
    { label: t("menuCopyDocLink"), text: docUrl },
    { label: t("menuCopyFixedView"), text: () => fixedTimeUrl(page.href, now()), unavailable: "noticeTimeNotConverted" },
  ];

  return (
    <div className="kt-root" ref={rootRef} onClick={keepInside} onKeyDown={keepInside}>
      <div className="kt-bar">
        <ActionButtons links={buttons.links} discover={buttons.discover} environmentName={environment.name} />
        {panelEntries.length > 0 && (
          <button type="button" className="kt-ghost" aria-expanded={panelOpen} onClick={() => setPanelOpen(!panelOpen)}>
            {t("viewButton")}
          </button>
        )}
        {notice && (
          <span className="kt-muted" role="status">
            {t(notice)}
          </span>
        )}
        <CopyMenu items={copyItems} onCopy={copyToClipboard} onFail={setNotice} />
      </div>
      {panelOpen && panelEntries.length > 0 && (
        // A new log gets a new boundary, so a panel that failed on one log opens on the next (spec 002 FR-017).
        <PanelBoundary key={`${index}/${id}`}>
          <JsonView fields={panelEntries} onCopy={copyToClipboard} onClose={() => setPanelOpen(false)} />
        </PanelBoundary>
      )}
    </div>
  );
}
