// Turns link actions into buttons for one document (spec §7.2; Plan 4 spec §5.3).
import type { Action, LinkAction } from "./config";
import { gateAction } from "./conditions";
import type { FieldMap } from "./fields";
import type { HiddenReason, PassiveReason } from "./passive";
import type { ActionButton } from "./types";
import { VARIABLE_PREFIX, type Variables, isHttpUrl, leadingVariablePaths, lookupVariable, startsWithHttp } from "./template";

export type LinkResolution = { ok: true; url: string } | { ok: false; reason: HiddenReason } | { ok: false; passive: PassiveReason };

const asIs = (value: string): string => value;

export function resolveLinkAction(action: LinkAction, fields: FieldMap, variables: Variables): LinkResolution {
  const gate = gateAction(action, action.urlTemplate, fields, variables, { field: encodeURIComponent, variable: asIs });
  if (!gate.ok) return gate;
  const invalid = invalidLeadingVariable(action.urlTemplate, variables);
  if (invalid !== undefined) return { ok: false, passive: { kind: "invalidVariable", variable: invalid } };
  // Parsing the result also catches values that break the host, e.g. "https://{host}/".
  return isHttpUrl(gate.text) ? { ok: true, url: gate.text } : { ok: false, reason: "invalidUrl" };
}

/** Plan 4 spec §3: the variable a URL template starts with, when its value is not an http(s) address. */
export function invalidLeadingVariable(template: string, variables: Variables): string | undefined {
  const used = leadingVariablePaths(template)?.find((path) => lookupVariable(variables, path) !== null);
  if (used === undefined) return undefined;
  return startsWithHttp(lookupVariable(variables, used) ?? "") ? undefined : used.slice(VARIABLE_PREFIX.length);
}

export function buildLinkButtons(actions: Action[], fields: FieldMap, variables: Variables): ActionButton[] {
  return actions.flatMap((action): ActionButton[] => {
    if (action.kind !== "link") return [];
    const result = resolveLinkAction(action, fields, variables);
    if (result.ok) return [{ id: action.id, label: action.label, url: result.url }];
    return "passive" in result ? [{ id: action.id, label: action.label, passive: result.passive }] : [];
  });
}
