// What the action bar and the row strip share (spec 003 research R13): loading one log, building its buttons and
// rendering them, so the two can never disagree about a button (spec 003 FR-005; constitution III).
import { useEffect, useState } from "react";
import type { Action, Environment } from "../core/config";
import { buildDiscoverButtons } from "../core/discover-actions";
import { flattenDoc } from "../core/fields";
import { buildLinkButtons } from "../core/link-actions";
import type { ActionButton, DataViewSummary, DocIdentity, RawHit } from "../core/types";
import { t } from "../i18n";
import { type KibanaClient, KibanaError } from "../kibana/client";
import { readGlobalTime } from "../kibana/discover-state";
import { discoverUrl } from "../kibana/url";
import { describePassive } from "../passive-text";
import { loadDataViews, loadTimeFields, timeFieldTargets } from "./bar-data";

export type LogState =
  | { status: "loading" }
  | {
      status: "ready";
      hit: RawHit;
      timeFields: ReadonlyMap<string, string | undefined>;
      dataViews: readonly DataViewSummary[] | null;
    }
  | { status: "error"; message: string };

/** The raw log plus what its Discover buttons need (spec §7.3, §7.4; Plan 4 spec §5.2), or the reason it failed. */
export function useLogState(identity: DocIdentity, actions: Action[], client: KibanaClient): LogState {
  const [state, setState] = useState<LogState>({ status: "loading" });
  const { dataViewId, index, id } = identity;

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    const barData = async () => {
      const dataViews = await loadDataViews(client, actions);
      const timeFields = await loadTimeFields(client, timeFieldTargets(actions, dataViewId, dataViews));
      return { dataViews, timeFields };
    };
    Promise.all([client.fetchDoc(index, id), barData()]).then(
      ([hit, { dataViews, timeFields }]) => {
        if (!cancelled) setState({ status: "ready", hit, timeFields, dataViews });
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

  return state;
}

export interface ButtonContext {
  prefix: string;
  dataViewId: string;
  /** The page's hash: Discover links keep its current time range when no window applies. */
  hash: string;
  environment: Environment;
  timeFields: ReadonlyMap<string, string | undefined>;
  dataViews: readonly DataViewSummary[] | null;
}

/** The link and Discover buttons of one log, in settings order. */
export function buildButtons(hit: RawHit, actions: Action[], context: ButtonContext): { links: ActionButton[]; discover: ActionButton[] } {
  const fields = flattenDoc(hit);
  const { prefix, dataViewId, hash, environment, timeFields, dataViews } = context;
  return {
    links: buildLinkButtons(actions, fields, environment.variables),
    discover: buildDiscoverButtons(actions, fields, {
      link: (target) => discoverUrl({ prefix, ...target }),
      dataViewId,
      currentTime: readGlobalTime(hash),
      timeFields,
      variables: environment.variables,
      dataViews,
    }),
  };
}

/** A working link opens in a new tab; Plan 4 spec §5.3: a passive one is greyed out, with the reason as its tooltip. */
export function ActionButtons({ links, discover, environmentName }: { links: ActionButton[]; discover: ActionButton[]; environmentName: string }) {
  const actionButton = (button: ActionButton, className: string) =>
    "url" in button ? (
      <a key={button.id} className={className} href={button.url} target="_blank" rel="noopener noreferrer">
        {button.label}
      </a>
    ) : (
      <span key={button.id} className="kt-btn kt-disabled" aria-disabled="true" tabIndex={0} title={describePassive(button.passive, environmentName)}>
        {button.label}
      </span>
    );
  return (
    <>
      {links.map((button) => actionButton(button, "kt-btn"))}
      {discover.map((button) => actionButton(button, "kt-btn kt-discover"))}
    </>
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
