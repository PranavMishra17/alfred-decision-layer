/**
 * Zustand slice for obligations.
 * Source: DECISION_LAYER.md §6, §21
 */

import type { StateCreator }      from "zustand";
import type { PendingObligation } from "@/types/obligation";
import { applyResolutions }       from "./resolver";

export interface ObligationSlice {
  open_obligations: PendingObligation[];
  addObligations: (
    newObligations: { action_ref: string; condition: string }[],
    turn_id: string
  ) => void;
  resolveObligations: (obligationIds: string[], turn_id: string) => void;
  clearObligations: () => void;
}

export const createObligationSlice: StateCreator<ObligationSlice> = (set) => ({
  open_obligations: [],

  addObligations: (newObligations, turn_id) =>
    set((state) => {
      const added: PendingObligation[] = newObligations.map((o) => ({
        id: `obl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        action_ref: o.action_ref,
        condition: o.condition,
        status: "open",
        raised_at: Date.now(),
        resolved_at: null,
        resolved_by_turn_id: null,
      }));
      return { open_obligations: [...state.open_obligations, ...added] };
    }),

  resolveObligations: (obligationIds, turn_id) =>
    set((state) => ({
      open_obligations: applyResolutions(state.open_obligations, obligationIds, turn_id),
    })),

  clearObligations: () => set({ open_obligations: [] }),
});
