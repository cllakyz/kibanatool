// The row strip (spec 003): the marked actions of one result row's log, built and rendered as the bar builds them.
import { type SyntheticEvent, useMemo } from "react";
import type { Action, Environment } from "../core/config";
import type { DocIdentity } from "../core/types";
import { t } from "../i18n";
import type { KibanaClient } from "../kibana/client";
import { ActionButtons, buildButtons, useLogState } from "./log-buttons";

export interface RowStripProps {
  identity: DocIdentity;
  /** The row actions only (`rowActions`), recomputed when the config changes, so the fetch effect stays put. */
  actions: Action[];
  client: KibanaClient;
  prefix: string;
  /** The page the row sits on: Discover links keep its current time range when no window applies. */
  page: Pick<Location, "hash">;
  environment: Environment;
}

/** Spec 003 FR-008: the row, the grid and Kibana never see a click, press or key inside the strip. */
const keepInside = (event: SyntheticEvent): void => event.stopPropagation();

export function RowStrip({ identity, actions, client, prefix, page, environment }: RowStripProps) {
  const state = useLogState(identity, actions, client);
  const hash = page.hash;
  const buttons = useMemo(() => {
    if (state.status !== "ready") return null;
    const { hit, timeFields, dataViews } = state;
    return buildButtons(hit, actions, { prefix, dataViewId: identity.dataViewId, hash, environment, timeFields, dataViews });
  }, [state, actions, prefix, identity.dataViewId, hash, environment]);

  // Spec 003 FR-009: a short mark while the log loads, the bar's message on a failure, nothing when no action applies.
  let content;
  if (state.status === "loading") {
    content = (
      <span className="kt-strip kt-muted" aria-label={t("barLoading")} role="status">
        …
      </span>
    );
  } else if (state.status === "error") {
    content = (
      <span className="kt-strip kt-error" title={state.message} tabIndex={0}>
        !
      </span>
    );
  } else if (buttons && buttons.links.length + buttons.discover.length > 0) {
    content = (
      <div className="kt-strip" role="group" aria-label={t("rowStripLabel")}>
        <ActionButtons links={buttons.links} discover={buttons.discover} environmentName={environment.name} />
      </div>
    );
  } else {
    return null;
  }
  return (
    <div className="kt-row-root" onClick={keepInside} onPointerDown={keepInside} onMouseDown={keepInside} onKeyDown={keepInside}>
      {content}
    </div>
  );
}
