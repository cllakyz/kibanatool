// The per-document action bar (spec §7.7): link actions, Discover actions, then the copy menu.
import { type SyntheticEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Action, Config } from "../core/config";
import { type DiscoverButton, buildDiscoverButtons } from "../core/discover-actions";
import { flattenDoc } from "../core/fields";
import { type LinkButton, buildLinkButtons } from "../core/link-actions";
import { buildMarkdown } from "../core/markdown";
import type { DocIdentity, RawHit } from "../core/types";
import { type MessageKey, t } from "../i18n";
import { type KibanaClient, KibanaError } from "../kibana/client";
import { readGlobalTime } from "../kibana/discover-state";
import { fixedTimeUrl, singleDocPath } from "../kibana/url";
import { loadTimeFields, timeFieldTargets } from "./bar-data";
import { copyText } from "./clipboard";
import { type CopyItem, CopyMenu } from "./CopyMenu";

type State =
  | { status: "loading" }
  | { status: "ready"; hit: RawHit; timeFields: ReadonlyMap<string, string | undefined> }
  | { status: "error"; message: string };

export interface ActionBarProps {
  identity: DocIdentity;
  /** Recomputed only when the config changes (entrypoints/kibana.ts), so the fetch effect stays put. */
  actions: Action[];
  client: KibanaClient;
  prefix: string;
  /** location.hash: Discover links keep the current time range when no window applies. */
  hash: string;
  copy: Config["copy"];
}

/** Kibana would see these events on the host element otherwise (e.g. arrow keys move the 8.x/9.x flyout). */
const keepInside = (event: SyntheticEvent): void => event.stopPropagation();

export function ActionBar({ identity, actions, client, prefix, hash, copy }: ActionBarProps) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [notice, setNotice] = useState<MessageKey | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const { dataViewId, index, id } = identity;

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    Promise.all([client.fetchDoc(index, id), loadTimeFields(client, timeFieldTargets(actions, dataViewId))]).then(
      ([hit, timeFields]) => {
        if (!cancelled) setState({ status: "ready", hit, timeFields });
      },
      async (error: unknown) => {
        const message = await describeError(error, client);
        if (!cancelled) setState({ status: "error", message });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [dataViewId, index, id, actions, client]);

  useEffect(() => {
    if (notice === null) return;
    const timer = window.setTimeout(() => setNotice(null), 2500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const buttons = useMemo((): { links: LinkButton[]; discover: DiscoverButton[] } => {
    if (state.status !== "ready") return { links: [], discover: [] };
    const fields = flattenDoc(state.hit);
    return {
      links: buildLinkButtons(actions, fields),
      discover: buildDiscoverButtons(actions, fields, {
        prefix,
        dataViewId,
        currentTime: readGlobalTime(hash),
        timeFields: state.timeFields,
      }),
    };
  }, [state, actions, prefix, dataViewId, hash]);

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
  function copyToClipboard(text: string | null): void {
    if (text === null) {
      setNotice("noticeTimeNotConverted");
      return;
    }
    if (!rootRef.current) return;
    copyText(text, rootRef.current).then(
      () => setNotice("noticeCopied"),
      (error: unknown) => {
        console.debug("[kibanatool] copy failed:", error);
        setNotice("noticeCopyFailed");
      },
    );
  }

  const docUrl = (): string => `${location.origin}${singleDocPath(prefix, identity)}`;
  const copyItems: CopyItem[] = [
    {
      label: t("menuCopyMarkdown"),
      text: () =>
        buildMarkdown({
          hit,
          timeField: timeFields.get(dataViewId),
          fields: copy.markdownFields,
          maskPatterns: copy.maskPatterns,
          docUrl: docUrl(),
          linkLabel: t("markdownOpenInKibana"),
        }),
    },
    { label: t("menuCopyDocLink"), text: docUrl },
    { label: t("menuCopyFixedView"), text: () => fixedTimeUrl(location.href, new Date()) },
  ];

  return (
    <div className="kt-root" ref={rootRef} onClick={keepInside} onKeyDown={keepInside}>
      <div className="kt-bar">
        {buttons.links.map((button) => (
          <a key={button.id} className="kt-btn" href={button.url} target="_blank" rel="noopener noreferrer">
            {button.label}
          </a>
        ))}
        {buttons.discover.map((button) =>
          "url" in button ? (
            <a key={button.id} className="kt-btn kt-discover" href={button.url} target="_blank" rel="noopener noreferrer">
              {button.label}
            </a>
          ) : (
            <span key={button.id} className="kt-btn kt-disabled" aria-disabled="true" tabIndex={0} title={t("discoverNoTime")}>
              {button.label}
            </span>
          ),
        )}
        {notice && (
          <span className="kt-muted" role="status">
            {t(notice)}
          </span>
        )}
        <CopyMenu items={copyItems} onCopy={copyToClipboard} />
      </div>
    </div>
  );
}

async function describeError(error: unknown, client: KibanaClient): Promise<string> {
  if (!(error instanceof KibanaError)) return t("errorUnknown");
  switch (error.kind) {
    case "forbidden":
      return t("errorForbidden");
    case "notFound":
      return t("errorNotFound");
    case "network":
      return t("errorNetwork");
    case "server":
      return t("errorServer", String(error.status ?? "?"));
    case "incompatible":
      return t("errorIncompatible", (await client.getVersion()) ?? "?");
    default:
      return t("errorUnknown");
  }
}
