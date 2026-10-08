// The per-document action bar (spec §7.7). Plan 1 renders link actions only.
import { useEffect, useMemo, useState } from "react";
import type { Action } from "../core/config";
import { flattenDoc } from "../core/fields";
import { buildLinkButtons } from "../core/link-actions";
import type { DocIdentity, RawHit } from "../core/types";
import { t } from "../i18n";
import { type KibanaClient, KibanaError } from "../kibana/client";

type State = { status: "loading" } | { status: "ready"; hit: RawHit } | { status: "error"; message: string };

export interface ActionBarProps {
  identity: DocIdentity;
  actions: Action[];
  client: KibanaClient;
}

export function ActionBar({ identity, actions, client }: ActionBarProps) {
  const [state, setState] = useState<State>({ status: "loading" });
  const { index, id } = identity;

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    client.fetchDoc(index, id).then(
      (hit) => {
        if (!cancelled) setState({ status: "ready", hit });
      },
      async (error: unknown) => {
        const message = await describeError(error, client);
        if (!cancelled) setState({ status: "error", message });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [index, id, client]);

  const buttons = useMemo(
    () => (state.status === "ready" ? buildLinkButtons(actions, flattenDoc(state.hit)) : []),
    [state, actions],
  );

  if (state.status === "loading") {
    return (
      <div className="kt-bar">
        <span className="kt-muted">{t("barLoading")}</span>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="kt-bar">
        <span className="kt-error">{state.message}</span>
      </div>
    );
  }
  if (buttons.length === 0) return null;
  return (
    <div className="kt-bar">
      {buttons.map((button) => (
        <a
          key={button.id}
          className="kt-btn"
          href={button.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          {button.label}
        </a>
      ))}
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
