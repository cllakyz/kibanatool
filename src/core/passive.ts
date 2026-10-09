// Why a button is shown greyed out instead of working (Plan 4 spec §5.3). The bar and the options preview explain it.
export type PassiveReason =
  | { kind: "missingVariable"; variable: string }
  | { kind: "invalidVariable"; variable: string }
  | { kind: "dataViewNotFound"; name: string }
  | { kind: "dataViewAmbiguous"; name: string; count: number }
  | { kind: "dataViewLookupFailed" }
  | { kind: "noTime" };
