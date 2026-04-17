/**
 * Scenarios loader.
 * Imports the preloaded.json fixture and provides typed access.
 * Canonical source: UI-UX-DESIGN.md §6; DESIGN.md M2
 */

import type { Scenario } from "@/types/scenario";
import raw from "@/scenarios/preloaded.json";

/** All 8 preloaded scenarios, typed. */
export const PRELOADED_SCENARIOS: Scenario[] = raw as unknown as Scenario[];

/** Look up a scenario by id. Returns undefined if not found. */
export function getScenario(id: string): Scenario | undefined {
  return PRELOADED_SCENARIOS.find((s) => s.id === id);
}
