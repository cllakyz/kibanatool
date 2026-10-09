// Turns link actions into buttons for one document (spec §7.2; Plan 4 spec §5.3).
import type { Action, LinkAction } from "./config";
import { evaluateConditions } from "./conditions";
import type { FieldMap } from "./fields";
import type { PassiveReason } from "./passive";
import { VARIABLE_PREFIX, type Variables, fillTemplate, isHttpUrl, leadingVariablePaths, lookupVariable } from "./template";

export type LinkButton = { id: string; label: string; url: string } | { id: string; label: string; passive: PassiveReason };

/** Why an action shows no button; the options page preview names it. */
export type HiddenReason = "disabled" | "conditions" | "missingValue" | "invalidUrl";

export type LinkResolution = { ok: true; url: string } | { ok: false; reason: HiddenReason } | { ok: false; passive: PassiveReason };

const asIs = (value: string): string => value;

export function resolveLinkAction(action: LinkAction, fields: FieldMap, variables: Variables): LinkResolution {
  if (!action.enabled) return { ok: false, reason: "disabled" };
  if (!evaluateConditions(action.conditions, fields)) return { ok: false, reason: "conditions" };
  const filled = fillTemplate(action.urlTemplate, fields, variables, { field: encodeURIComponent, variable: asIs });
  if (!filled.ok) {
    return filled.reason === "missingVariable"
      ? { ok: false, passive: { kind: "missingVariable", variable: filled.variable } }
      : { ok: false, reason: "missingValue" };
  }
  const invalid = invalidLeadingVariable(action.urlTemplate, variables);
  if (invalid !== undefined) return { ok: false, passive: { kind: "invalidVariable", variable: invalid } };
  // Parsing the result also catches values that break the host, e.g. "https://{host}/".
  return isHttpUrl(filled.text) ? { ok: true, url: filled.text } : { ok: false, reason: "invalidUrl" };
}

/** Plan 4 spec §3: the variable a URL template starts with, when its value is not an http(s) address. */
export function invalidLeadingVariable(template: string, variables: Variables): string | undefined {
  const used = leadingVariablePaths(template)?.find((path) => lookupVariable(variables, path) !== null);
  if (used === undefined) return undefined;
  return /^https?:\/\//i.test(lookupVariable(variables, used) ?? "") ? undefined : used.slice(VARIABLE_PREFIX.length);
}

export function buildLinkButtons(actions: Action[], fields: FieldMap, variables: Variables): LinkButton[] {
  return actions.flatMap((action): LinkButton[] => {
    if (action.kind !== "link") return [];
    const result = resolveLinkAction(action, fields, variables);
    if (result.ok) return [{ id: action.id, label: action.label, url: result.url }];
    return "passive" in result ? [{ id: action.id, label: action.label, passive: result.passive }] : [];
  });
}
