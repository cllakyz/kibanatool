// The localized reason of a passive button (Plan 4 spec §5.3): the bar's tooltip and the options preview.
import type { PassiveReason } from "./core/passive";
import { t } from "./i18n";

export function describePassive(reason: PassiveReason, environmentName: string): string {
  switch (reason.kind) {
    case "missingVariable":
      return t("passiveMissingVariable", environmentName, reason.variable);
    case "invalidVariable":
      return t("passiveInvalidVariable", environmentName, reason.variable);
    case "dataViewNotFound":
      return t("passiveDataViewNotFound", reason.name);
    case "dataViewAmbiguous":
      return t("passiveDataViewAmbiguous", reason.name, String(reason.count));
    case "dataViewLookupFailed":
      return t("passiveDataViewLookupFailed");
    case "noTime":
      return t("discoverNoTime");
  }
}
