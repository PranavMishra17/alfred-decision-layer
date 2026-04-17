/**
 * Decision policy gate — P3.
 * The single function that takes Action + SignalSet + DecisionContext
 * and produces a typed Decision.
 *
 * Hard rules fire first (in priority order), then threshold scoring.
 * The fallback order is enforced in code per DESIGN.md §2.2:
 *   REFUSE > CLARIFY > CONFIRM > NOTIFY > SILENT
 *
 * Canonical source: DECISION_LAYER.md §9
 */

import { randomUUID }                              from "crypto";
import type { Action, Decision, DecisionContext,
              SignalSet, Verdict }                 from "@/types/decision";
import { SIGNAL_THRESHOLDS, THRESHOLD_DEFAULTS,
         SECURITY }                               from "@/lib/config";
import { riskScore }                              from "@/lib/decision/risk";

/**
 * The full decision gate.
 *
 * Preconditions (enforced by caller / pipeline.ts):
 *   - action.tool exists in ctx.registry
 *   - signals were extracted by extractSignals() from the same action + ctx
 *
 * Never throws — any internal error produces a REFUSE verdict so the
 * fallback order is preserved even on unexpected failure.
 */
export function decide(
  action:  Action,
  signals: SignalSet,
  ctx:     DecisionContext
): Decision {
  try {
    return runGate(action, signals, ctx);
  } catch (err) {
    return makeDecision({
      action_id:        action.id,
      verdict:          "REFUSE",
      risk_score:       1,
      signals,
      rationale:        "internal policy gate error — safety fallback applied",
      fallback_applied: "REFUSE",
      gate_rule:        "error_fallback",
    });
  }
}

// ---------------------------------------------------------------------------
// Internal gate logic — exact DECISION_LAYER.md §9 order
// ---------------------------------------------------------------------------

function runGate(
  action:  Action,
  signals: SignalSet,
  ctx:     DecisionContext
): Decision {
  // -----------------------------------------------------------------------
  // Rule 1 — Policy violation or high-severity injection → REFUSE
  // Source: DECISION_LAYER.md §9, first if-block
  // -----------------------------------------------------------------------
  if (signals.policy_violation || signals.injection_detected) {
    const rule = signals.injection_detected
      ? "injection_detected"
      : "policy_violation";
    return makeDecision({
      action_id:        action.id,
      verdict:          "REFUSE",
      risk_score:       1,
      signals,
      rationale:        signals.injection_detected
        ? "Prompt injection pattern detected — request refused."
        : "Action violates execution policy.",
      fallback_applied: null,
      gate_rule:        rule,
    });
  }

  // -----------------------------------------------------------------------
  // Rule 2 — Low confidence on intent or entities → CLARIFY
  // Source: DECISION_LAYER.md §9, second if-block
  // -----------------------------------------------------------------------
  if (
    action.intent_confidence < SIGNAL_THRESHOLDS.INTENT_CLARIFY ||
    action.entity_confidence < SIGNAL_THRESHOLDS.ENTITY_CLARIFY
  ) {
    return makeDecision({
      action_id:        action.id,
      verdict:          "CLARIFY",
      risk_score:       riskScore(signals, ctx.registry[action.tool]),
      signals,
      rationale:
        action.intent_confidence < SIGNAL_THRESHOLDS.INTENT_CLARIFY
          ? "Intent is ambiguous — clarification needed before acting."
          : "One or more entities could not be resolved — clarification needed.",
      fallback_applied: null,
      gate_rule:        "unresolved_params",
    });
  }

  // -----------------------------------------------------------------------
  // Rule 3 — Open obligation conflict → CONFIRM
  // Source: DECISION_LAYER.md §9, third if-block
  // -----------------------------------------------------------------------
  if (signals.obligation_conflict) {
    return makeDecision({
      action_id:        action.id,
      verdict:          "CONFIRM",
      risk_score:       riskScore(signals, ctx.registry[action.tool]),
      signals,
      rationale:        buildObligationRationale(action, ctx),
      fallback_applied: null,
      gate_rule:        "conflicts_open_obligation",
    });
  }

  // -----------------------------------------------------------------------
  // Rule 4 — Idempotency dedup → SILENT_DUPE
  // Source: DECISION_LAYER.md §9, fourth if-block; §11
  // -----------------------------------------------------------------------
  if (ctx.idempotency.has(action.hash)) {
    return makeDecision({
      action_id:        action.id,
      verdict:          "SILENT_DUPE",
      risk_score:       0,
      signals,
      rationale:        "This action was already executed in the last run.",
      fallback_applied: null,
      gate_rule:        "already_executed",
    });
  }

  // -----------------------------------------------------------------------
  // Rule 5 — Threshold scoring
  // Source: DECISION_LAYER.md §9, last block
  // -----------------------------------------------------------------------
  const mediumBump = hasMediumInjection(ctx)
    ? SECURITY.SEVERITY_SCORES.medium
    : 0;

  const tool  = ctx.registry[action.tool];
  const score = riskScore(signals, tool, mediumBump);
  const t     = ctx.settings.threshold;
  const confirmCutoff = t + THRESHOLD_DEFAULTS.CONFIRM_DELTA;

  if (score >= confirmCutoff) {
    return makeDecision({
      action_id:        action.id,
      verdict:          "CONFIRM",
      risk_score:       score,
      signals,
      rationale:        `Risk score ${score.toFixed(2)} exceeds confirm threshold ${confirmCutoff.toFixed(2)}.`,
      fallback_applied: null,
      gate_rule:        "high_risk",
    });
  }

  if (score >= t) {
    return makeDecision({
      action_id:        action.id,
      verdict:          "NOTIFY",
      risk_score:       score,
      signals,
      rationale:        `Risk score ${score.toFixed(2)} exceeds notify threshold ${t.toFixed(2)}.`,
      fallback_applied: null,
      gate_rule:        "medium_risk",
    });
  }

  return makeDecision({
    action_id:        action.id,
    verdict:          "SILENT",
    risk_score:       score,
    signals,
    rationale:        `Risk score ${score.toFixed(2)} is below notify threshold ${t.toFixed(2)}.`,
    fallback_applied: null,
    gate_rule:        "low_risk",
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MakeDecisionArgs = {
  action_id:        string;
  verdict:          Verdict;
  risk_score:       number;
  signals:          SignalSet;
  rationale:        string;
  fallback_applied: Verdict | null;
  gate_rule:        string;
};

function makeDecision(args: MakeDecisionArgs): Decision {
  return {
    action_id:        args.action_id,
    verdict:          args.verdict,
    risk_score:       Math.min(1, Math.max(0, args.risk_score)),
    signals:          args.signals,
    rationale:        args.rationale,
    fallback_applied: args.fallback_applied,
    gate_rule:        args.gate_rule,
  };
}

/**
 * Build a human-readable rationale for an obligation conflict.
 * Cites the specific conflicting obligation if found in ctx.
 */
function buildObligationRationale(
  action: Action,
  ctx:    DecisionContext
): string {
  const cited = ctx.open_obligations.filter((o) =>
    action.conflicts_with.includes(o.id)
  );
  if (cited.length === 0) {
    return "This action conflicts with an open obligation.";
  }
  if (cited.length === 1) {
    return `You said to hold off: "${cited[0].condition}" — confirm to proceed anyway.`;
  }
  const items = cited.map((o) => `"${o.condition}"`).join(", ");
  return `This action conflicts with ${cited.length} open obligations: ${items}`;
}

/**
 * Returns true if any injection flag is medium severity.
 * Used to compute the medium bump in risk scoring.
 * Source: DECISION_LAYER.md §16
 */
function hasMediumInjection(ctx: DecisionContext): boolean {
  return ctx.injection_flags.some((f) => f.severity === "medium");
}
