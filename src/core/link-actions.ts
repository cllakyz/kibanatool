// Turns link actions into buttons for one document (spec §7.2).
import type { Action } from "./config";
import { evaluateConditions } from "./conditions";
import type { FieldMap } from "./fields";
import { isHttpUrlTemplate, resolveTemplate } from "./template";

export interface LinkButton {
  id: string;
  label: string;
  url: string;
}

export function buildLinkButtons(actions: Action[], fields: FieldMap): LinkButton[] {
  const buttons: LinkButton[] = [];
  for (const action of actions) {
    if (action.kind !== "link" || !action.enabled) continue;
    if (!evaluateConditions(action.conditions, fields)) continue;
    const url = resolveTemplate(action.urlTemplate, fields, encodeURIComponent);
    if (url === null || !isHttpUrlTemplate(url)) continue;
    buttons.push({ id: action.id, label: action.label, url });
  }
  return buttons;
}
