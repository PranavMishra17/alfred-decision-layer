/**
 * Signal extraction — P3, pure function.
 * Takes: one parsed Action + the assembled DecisionContext.
 * Returns: fully populated SignalSet.
 *
 * No LLM calls, no side effects, no randomness.
 * All weights and thresholds come from lib/config, never hardcoded inline.
 *
 * Canonical source: DECISION_LAYER.md §8
 * Formula:
 *   risk_score = min(1, tool.default_risk_floor + weighted_sum)
 *   weighted_sum = Σ(weight[i] * signal[i])
 */

import type { Action, DecisionContext, SignalSet } from "@/types/decision";
import type { ToolDefinition }                     from "@/types/tool";
import { POLICY, BLAST_RADIUS_ENTITY_INCREMENT }   from "@/lib/config";
import { REVERSIBILITY_SCORES }                    from "@/lib/decision/weights";

/**
 * Extract all signals for one action.
 * Throws if the tool is not in ctx.registry (caller must validate first).
 */
export function extractSignals(action: Action, ctx: DecisionContext): SignalSet {
  const tool = ctx.registry[action.tool];
  if (!tool) {
    throw new Error(
      `signals: unknown tool "${action.tool}" — validate against registry before calling`
    );
  }

  return {
    tool_reversibility: REVERSIBILITY_SCORES[tool.reversibility],
    blast_radius:       adjustBlastRadius(tool, action),
    entity_ambiguity:   1 - action.entity_confidence,
    intent_ambiguity:   1 - action.intent_confidence,
    obligation_conflict: action.conflicts_with.length > 0 ? 1 : 0,
    policy_violation:   checkPolicy(action, tool),
    external_recipient: hasExternalRecipient(action, tool) ? 1 : 0,
    stake_flags:        mergeStakeFlags(action, tool),
    injection_detected: ctx.injection_flags.some((f) => f.severity === "high") ? 1 : 0,
  };
}

// ---------------------------------------------------------------------------
// Signal helpers
// ---------------------------------------------------------------------------

/**
 * Blast radius adjustment.
 * Starts at tool default. Each additional countable entity (email/person)
 * beyond the first adds BLAST_RADIUS_ENTITY_INCREMENT. Clamped to [0, 1].
 * Source: DECISION_LAYER.md §8 — adjustBlastRadius(default, entities)
 */
function adjustBlastRadius(tool: ToolDefinition, action: Action): number {
  const countable = action.entities.filter(
    (e) => e.type === "email" || e.type === "person"
  );
  const additional = Math.max(0, countable.length - 1);
  return Math.min(1, tool.default_blast_radius + additional * BLAST_RADIUS_ENTITY_INCREMENT);
}

/**
 * Policy violation check.
 * Returns 1 if the action violates a hard policy rule:
 *   1. Tool is explicitly marked default_verdict_hint:"REFUSE" (e.g. delete_emails)
 *   2. Outbound tool with "legal" stake + external recipient (social-engineering pattern)
 * Source: DECISION_LAYER.md §9 — "policy_violation" input to decide()
 */
function checkPolicy(action: Action, tool: ToolDefinition): 0 | 1 {
  // Rule 1 — tool is self-declaring as high-risk
  if (tool.default_verdict_hint === "REFUSE") return 1;

  // Rule 2 — sensitive outbound to external address
  const isOutbound = POLICY.OUTBOUND_EMAIL_TOOLS.includes(tool.name);
  const hasLegalStake = tool.stake_flags.includes("legal");
  if (isOutbound && hasLegalStake && hasExternalRecipient(action, tool)) {
    return 1;
  }

  return 0;
}

/**
 * External recipient detection.
 * Checks action params (to/forward_to/cc) and resolved email entities
 * against the configured internal domain.
 * Source: DECISION_LAYER.md §8 — external_recipient signal
 */
function hasExternalRecipient(action: Action, tool: ToolDefinition): boolean {
  const internalDomain = POLICY.INTERNAL_EMAIL_DOMAIN;

  // 1. Check typed entities
  const emailEntities = action.entities.filter((e) => e.type === "email");
  for (const entity of emailEntities) {
    const resolved = entity.resolved;
    if (resolved && !resolved.endsWith(`@${internalDomain}`)) {
      return true;
    }
  }

  // 2. Only check params for outbound tools (avoids false positives on read tools)
  if (!POLICY.OUTBOUND_EMAIL_TOOLS.includes(tool.name)) return false;

  const paramKeys = ["to", "cc", "forward_to"];
  for (const key of paramKeys) {
    const val = action.params[key];
    if (typeof val === "string" && val.includes("@")) {
      // Multiple addresses comma-separated
      const addresses = val.split(",").map((a) => a.trim());
      for (const addr of addresses) {
        if (addr && !addr.endsWith(`@${internalDomain}`)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Merge tool's baseline stake_flags with action-level detected stakes.
 * Patterns are sourced from config — no regex literals here.
 * Source: DECISION_LAYER.md §8 — detectStakes(action, tool)
 */
function mergeStakeFlags(action: Action, tool: ToolDefinition): string[] {
  const flags = new Set(tool.stake_flags);

  // Serialize params + entity resolved values for pattern matching
  const corpus = [
    JSON.stringify(action.params),
    ...action.entities.map((e) => e.raw + " " + (e.resolved ?? "")),
  ]
    .join(" ")
    .toLowerCase();

  try {
    if (new RegExp(POLICY.STAKE_PATTERN_MONEY, "i").test(corpus)) {
      flags.add("money");
    }
    if (new RegExp(POLICY.STAKE_PATTERN_LEGAL, "i").test(corpus)) {
      flags.add("legal");
    }
    if (new RegExp(POLICY.STAKE_PATTERN_REPUTATION, "i").test(corpus)) {
      flags.add("reputation");
    }
  } catch (err) {
    // Malformed pattern from config — log but do not crash signal extraction
    flags.add(`_pattern_error:${err instanceof Error ? err.message : "unknown"}`);
  }

  return Array.from(flags);
}
