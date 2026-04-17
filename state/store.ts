/**
 * Zustand root store — M1 shell.
 * Persistent slices are added milestone by milestone.
 * M2 adds: obligations, idempotency, action history, tool registry.
 * M3 adds: trace bus subscription references.
 *
 * Using the recommended zustand pattern with `create` + optional
 * `persist` middleware (wired in state/persist.ts for keyed slices).
 *
 * Source: DECISION_LAYER.md §19, UI-UX-DESIGN.md §8
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createObligationSlice }      from "@/lib/obligations/store";
import type { ObligationSlice }       from "@/lib/obligations/store";
import type { Decision }              from "@/types/decision";

// ---------------------------------------------------------------------------
// Settings slice (persisted — survives page reloads)
// ---------------------------------------------------------------------------

interface SettingsState {
  anthropicApiKey: string;
  cartesiaApiKey:  string;
  threshold:       number;
  injectTimeout:          boolean;
  injectMalformedOutput:  boolean;
  injectMissingContext:   boolean;
}

interface SettingsActions {
  setAnthropicApiKey:       (key: string)    => void;
  setCartesiaApiKey:        (key: string)    => void;
  setThreshold:             (value: number)  => void;
  setInjectTimeout:         (v: boolean)     => void;
  setInjectMalformedOutput: (v: boolean)     => void;
  setInjectMissingContext:  (v: boolean)     => void;
}

type SettingsSlice = SettingsState & SettingsActions;

const defaultSettings: SettingsState = {
  anthropicApiKey:         "",
  cartesiaApiKey:          "",
  threshold:               0.5,
  injectTimeout:           false,
  injectMalformedOutput:   false,
  injectMissingContext:    false,
};

// ---------------------------------------------------------------------------
// M6 Slices: History & Idempotency
// ---------------------------------------------------------------------------

interface M6State {
  actionHistory:        Decision[];
  idempotencyHashes:    string[];
}

interface M6Actions {
  addActionHistory:     (d: Decision) => void;
  addIdempotencyHash:   (hash: string) => void;
  clearAllState:        () => void;
}

type M6Slice = M6State & M6Actions;

// ---------------------------------------------------------------------------
// Root store
// ---------------------------------------------------------------------------

type RootStore = SettingsSlice & ObligationSlice & M6Slice;

export const useStore = create<RootStore>()(
  persist(
    (set, get, api) => ({
      ...defaultSettings,
      
      // Settings slice
      setAnthropicApiKey: (key) => set({ anthropicApiKey: key }),
      setCartesiaApiKey:  (key) => set({ cartesiaApiKey: key }),
      setThreshold:       (value) => set({ threshold: Math.min(0.9, Math.max(0.1, value)) }),
      setInjectTimeout:         (v) => set({ injectTimeout: v }),
      setInjectMalformedOutput: (v) => set({ injectMalformedOutput: v }),
      setInjectMissingContext:  (v) => set({ injectMissingContext: v }),

      // M6 slices
      actionHistory: [],
      idempotencyHashes: [],
      
      addActionHistory: (d) =>
        set((state) => ({ actionHistory: [...state.actionHistory, d] })),
        
      addIdempotencyHash: (hash) =>
        set((state) => ({ idempotencyHashes: [...state.idempotencyHashes, hash] })),

      // Obligations slice
      ...createObligationSlice(set, get, api),

      // Clear all state (Settings remains untouched except if you want, but default clears conversation)
      clearAllState: () => {
        set({
          actionHistory: [],
          idempotencyHashes: [],
          open_obligations: [],
        });
      },
    }),
    {
      name:    "alfred-settings",
      storage: createJSONStorage(() => localStorage),
      // Only persist settings; conversation state is intentionally ephemeral
      // Wait, M6 states "persistent state (obligations + idempotency) to make decisions stateful and consistent across sessions."
      partialize: (state) => ({
        anthropicApiKey:    state.anthropicApiKey,
        cartesiaApiKey:     state.cartesiaApiKey,
        threshold:          state.threshold,
        open_obligations:   state.open_obligations,
        idempotencyHashes:  state.idempotencyHashes,
        actionHistory:      state.actionHistory,
      }),
    }
  )
);
