/**
 * Core decision-layer types.
 * Canonical source: DECISION_LAYER.md §6
 */

export type Verdict =
  | "SILENT"
  | "NOTIFY"
  | "CONFIRM"
  | "CLARIFY"
  | "REFUSE"
  | "SILENT_DUPE"; // idempotency catch; rendered as "already done" card

export type ResolvedEntity = {
  type: "person" | "time" | "email" | "amount" | "location" | "other";
  raw: string;
  resolved: string | null;
  confidence: number; // 0..1
};

/** One parsed intent within a turn. Produced by P2, scored by P3. */
export type Action = {
  id: string;                          // uuid
  hash: string;                        // tool + normalized params + turn window
  tool: string;                        // must match registry key
  params: Record<string, unknown>;
  entities: ResolvedEntity[];
  entity_confidence: number;           // 0..1
  intent_confidence: number;           // 0..1
  conditions: string[];                // detected conditions from message
  conflicts_with: string[];            // open obligation ids
};

/** Deterministic signal set computed per action in P3. */
export type SignalSet = {
  tool_reversibility: 0 | 0.5 | 1;    // from registry
  blast_radius: number;                // 0..1
  entity_ambiguity: number;            // 1 - entity_confidence
  intent_ambiguity: number;            // 1 - intent_confidence
  obligation_conflict: 0 | 1;
  policy_violation: 0 | 1;
  external_recipient: 0 | 1;
  stake_flags: string[];               // ["money", "legal", "reputation", ...]
  injection_detected: 0 | 1;
};

/** Verdict selection result, one per action. Produced by P3. */
export type Decision = {
  action_id: string;
  verdict: Verdict;
  risk_score: number;                  // 0..1
  signals: SignalSet;
  rationale: string;                   // short, shown in mind panel
  fallback_applied: Verdict | null;    // non-null if safety fallback was used
  gate_rule: string;                   // which policy rule fired, e.g. "obligation_conflict"
};

/**
 * Clarification dialog spec.
 * Only populated when needs_clarification is true in P2 output.
 * Source: DECISION_LAYER.md §6, §13
 */
export type ClarificationSpec = {
  action_id: string;
  style: "mcq" | "input_fields" | "mixed";
  question: string;
  options?: {
    id: string;
    label: string;
    params_preview: Record<string, unknown>;
  }[];
  fields?: {
    key: string;
    label: string;
    type: "text" | "email" | "datetime" | "number";
    default?: string;
  }[];
  /** Adds "Other..." option that reveals a free-text input → re-routes to fresh P2 */
  allow_custom: boolean;
};

/**
 * Structured output returned by P2 (Sonnet).
 * Validated via Zod in lib/llm/schema.ts before P3 consumes it.
 * Source: DECISION_LAYER.md §7
 */
export type LLMReasoningOutput = {
  request_type: "action" | "question" | "chit_chat" | "adversarial";
  actions: Omit<Action, "id" | "hash">[];   // id + hash stamped by P0/P3 code
  new_obligations: {
    action_ref: string;
    condition: string;
  }[];
  obligation_resolutions: string[];          // obligation ids being resolved
  needs_clarification: boolean;
  clarification_specs: Omit<ClarificationSpec, "action_id">[];
  response_draft: string;
};
