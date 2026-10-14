// Why an action shows no button (spec §7.2) or a greyed-out one (Plan 4 spec §5.3). The bar and the options preview explain it.

/** Why an action shows no button at all; the options preview names it. */
export type HiddenReason = "disabled" | "conditions" | "missingValue" | "invalidUrl";

/** Why a button is shown greyed out instead of working. */
export type PassiveReason =
  | { kind: "missingVariable"; variable: string }
  | { kind: "invalidVariable"; variable: string }
  | { kind: "dataViewNotFound"; name: string }
  | { kind: "dataViewAmbiguous"; name: string; count: number }
  | { kind: "dataViewLookupFailed" }
  | { kind: "noTime" };
