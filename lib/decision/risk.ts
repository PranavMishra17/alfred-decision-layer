/**
 * Risk scoring — P3, pure function.
 * Takes: a fully populated SignalSet + the ToolDefinition for this action.
 * Returns: risk score in [0, 1].
 *
 * Formula from DECISION_LAYER.md §8:
 *   score = min(1, tool.default_risk_floor + weighted_sum)
 *
 *   weighted_sum =
 *     W.toolReversibility * signal.tool_reversibility  +
 *     W.blastRadius       * signal.blast_radius        +
 *     W.entityAmbiguity   * signal.entity_ambiguity    +
 *     W.intentAmbiguity   * signal.intent_ambiguity    +
 *     W.externalRecipient * signal.external_recipient  +
 *     W.stakeFlags        * min(1, |stake_flags| * W.stakePerFlag)
 *
 * Weights live in lib/decision/weights.ts (sourced from lib/config).
 */

import type { SignalSet }      from "@/types/decision";
import type { ToolDefinition } from "@/types/tool";
import { WEIGHTS }             from "@/lib/decision/weights";

/**
 * Compute the risk score for one action.
 *
 * The medium-injection bump documented in DECISION_LAYER.md §16 is applied
 * here: if any injection_detected signal is present (even non-high severity),
 * the caller should pass the medium risk bump separately. The binary
 * signal.injection_detected is consumed by policy.ts, not by the score.
 *
 * @param signals - Extracted SignalSet for this action
 * @param tool    - ToolDefinition from the registry
 * @param injectionMediumBump - Optional extra score to add when a medium-severity
 *                               injection flag was present (from SECURITY config)
 */
export function riskScore(
  signals:             SignalSet,
  tool:                ToolDefinition,
  injectionMediumBump: number = 0
): number {
  const stakeContribution = Math.min(
    1,
    signals.stake_flags.length * WEIGHTS.stakePerFlag
  );

  const weighted =
    WEIGHTS.toolReversibility * signals.tool_reversibility +
    WEIGHTS.blastRadius       * signals.blast_radius       +
    WEIGHTS.entityAmbiguity   * signals.entity_ambiguity   +
    WEIGHTS.intentAmbiguity   * signals.intent_ambiguity   +
    WEIGHTS.externalRecipient * signals.external_recipient +
    WEIGHTS.stakeFlags        * stakeContribution;

  return Math.min(1, tool.default_risk_floor + weighted + injectionMediumBump);
}
