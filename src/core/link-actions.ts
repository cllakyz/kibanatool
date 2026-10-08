// Turns link actions into buttons for one document (spec §7.2).
import type { Action, LinkAction } from "./config";
import { evaluateConditions } from "./conditions";
import type { FieldMap } from "./fields";
import { isHttpUrl, resolveTemplate } from "./template";

export interface LinkButton {
  id: string;
  label: string;
  url: string;
}

/** Why an action shows no button; the options page preview names it. */
export type HiddenReason = "disabled" | "conditions" | "missingValue" | "invalidUrl";

export type LinkResolution = { ok: true; url: string } | { ok: false; reason: HiddenReason };

export function resolveLinkAction(action: LinkAction, fields: FieldMap): LinkResolution {
  if (!action.enabled) return { ok: false, reason: "disabled" };
  if (!evaluateConditions(action.conditions, fields)) return { ok: false, reason: "conditions" };
  const url = resolveTemplate(action.urlTemplate, fields, encodeURIComponent);
  if (url === null) return { ok: false, reason: "missingValue" };
  // Parsing the result also catches values that break the host, e.g. "https://{host}/".
  return isHttpUrl(url) ? { ok: true, url } : { ok: false, reason: "invalidUrl" };
}

export function buildLinkButtons(actions: Action[], fields: FieldMap): LinkButton[] {
  return actions.flatMap((action) => {
    if (action.kind !== "link") return [];
    const result = resolveLinkAction(action, fields);
    return result.ok ? [{ id: action.id, label: action.label, url: result.url }] : [];
  });
}
