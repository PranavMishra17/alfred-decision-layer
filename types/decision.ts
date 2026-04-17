/**
 * Core decision-layer types.
 * Canonical source: DECISION_LAYER.md §6
 * M2 will expand these with the full type set; M1 plants the
 * Verdict union which the shared badge component needs now.
 */

export type Verdict =
  | "SILENT"
  | "NOTIFY"
  | "CONFIRM"
  | "CLARIFY"
  | "REFUSE";
