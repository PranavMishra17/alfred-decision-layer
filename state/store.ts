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

// ---------------------------------------------------------------------------
// Settings slice (persisted — survives page reloads)
// ---------------------------------------------------------------------------

interface SettingsState {
  anthropicApiKey: string;
  cartesiaApiKey:  string;
  /** Single threshold slider: 0.1..0.9, default 0.5 */
  threshold:       number;
  /** One-shot failure injection flags — consumed on next P2 call */
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
  clearAllState:            ()               => void;
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
// Root store
// ---------------------------------------------------------------------------

type RootStore = SettingsSlice;

export const useStore = create<RootStore>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setAnthropicApiKey: (key) =>
        set({ anthropicApiKey: key }),

      setCartesiaApiKey: (key) =>
        set({ cartesiaApiKey: key }),

      setThreshold: (value) =>
        set({ threshold: Math.min(0.9, Math.max(0.1, value)) }),

      setInjectTimeout: (v) =>
        set({ injectTimeout: v }),

      setInjectMalformedOutput: (v) =>
        set({ injectMalformedOutput: v }),

      setInjectMissingContext: (v) =>
        set({ injectMissingContext: v }),

      clearAllState: () =>
        set({ ...defaultSettings }),
    }),
    {
      name:    "alfred-settings",
      storage: createJSONStorage(() => localStorage),
      // Only persist settings; conversation state is intentionally ephemeral
      partialize: (state) => ({
        anthropicApiKey:  state.anthropicApiKey,
        cartesiaApiKey:   state.cartesiaApiKey,
        threshold:        state.threshold,
      }),
    }
  )
);
