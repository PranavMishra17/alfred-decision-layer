/**
 * Configurable risk signal weights.
 * ALL weight values are here — nothing is hardcoded in signals.ts or risk.ts.
 * Canonical source: DECISION_LAYER.md §8
 *
 * Changing a weight: edit this file and restart. No other files change.
 * Re-exports from config for convenience — decision layer imports from here.
 */

import { RISK_WEIGHTS } from "@/lib/config";

export const WEIGHTS = {
  /** How much irreversibility contributes to the weighted sum */
  toolReversibility: RISK_WEIGHTS.TOOL_REVERSIBILITY,

  /** Contribution of blast radius (0..1 from registry, possibly entity-adjusted) */
  blastRadius: RISK_WEIGHTS.BLAST_RADIUS,

  /** Contribution of 1 - entity_confidence */
  entityAmbiguity: RISK_WEIGHTS.ENTITY_AMBIGUITY,

  /** Contribution of 1 - intent_confidence */
  intentAmbiguity: RISK_WEIGHTS.INTENT_AMBIGUITY,

  /** Contribution of external_recipient flag */
  externalRecipient: RISK_WEIGHTS.EXTERNAL_RECIPIENT,

  /**
   * Weight applied to the clamped stake_flags contribution.
   * Actual contribution = WEIGHTS.stakeFlags * clamp(stakeCount * perFlag, 0, 1)
   */
  stakeFlags: RISK_WEIGHTS.STAKE_FLAGS,

  /** Points added per stake flag before clamping */
  stakePerFlag: RISK_WEIGHTS.STAKE_PER_FLAG,
} as const;

/**
 * Maps ToolDefinition.reversibility to the 0|0.5|1 numeric signal value.
 * Source: DECISION_LAYER.md §6 (SignalSet.tool_reversibility)
 */
export const REVERSIBILITY_SCORES = {
  reversible:   0   as const,
  partial:      0.5 as const,
  irreversible: 1   as const,
} satisfies Record<string, 0 | 0.5 | 1>;
