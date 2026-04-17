/**
 * PendingObligation type.
 * Canonical source: DECISION_LAYER.md §6, §10
 */

export type ObligationStatus = "open" | "resolved";

export type PendingObligation = {
  id: string;
  action_ref: string;             // human-readable, e.g. "reply to Acme"
  condition: string;              // e.g. "until legal reviews pricing language"
  status: ObligationStatus;
  raised_at: number;              // Unix timestamp ms
  resolved_at: number | null;
  resolved_by_turn_id: string | null;
};
