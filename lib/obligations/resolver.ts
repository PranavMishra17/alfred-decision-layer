/**
 * Pure functions for manipulating obligations.
 * Source: DECISION_LAYER.md §21
 */

import type { PendingObligation } from "@/types/obligation";

export function applyResolutions(
  current: PendingObligation[],
  resolvedIds: string[],
  turn_id: string
): PendingObligation[] {
  if (!resolvedIds || resolvedIds.length === 0) return current;

  return current.map((o) => {
    if (resolvedIds.includes(o.id) && o.status === "open") {
      return {
        ...o,
        status: "resolved",
        resolved_at: Date.now(),
        resolved_by_turn_id: turn_id,
      };
    }
    return o;
  });
}
