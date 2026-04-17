/**
 * Global configuration constants.
 * ALL magic numbers live here — nothing is hardcoded inline.
 * Canonical source: DECISION_LAYER.md §9, §14, §17, §19
 *
 * To tune risk behaviour: edit this file only. No code changes needed.
 */

// ---------------------------------------------------------------------------
// LLM model identifiers
// ---------------------------------------------------------------------------

export const LLM_CONFIG = {
  /** Primary reasoning model — one streaming call per turn */
  PRIMARY_MODEL: "claude-sonnet-4-6",
  /** Safe-mode fallback — constrained to CLARIFY | REFUSE */
  SAFEMODE_MODEL: "claude-haiku-4-5",
  /** Temperature — low enough for deterministic entity resolution */
  TEMPERATURE: 0.2,
  /** How many past turns to include in context */
  CONTEXT_TURNS: 10,
} as const;

// ---------------------------------------------------------------------------
// Pipeline timeouts (ms)
// ---------------------------------------------------------------------------

export const TIMEOUTS = {
  /** P2 Sonnet call hard timeout before Haiku safe-mode fires */
  LLM_PRIMARY_MS: 12_000,
  /** P2 Haiku safe-mode call timeout */
  LLM_SAFEMODE_MS: 8_000,
} as const;

// ---------------------------------------------------------------------------
// Decision thresholds
// ---------------------------------------------------------------------------

export const THRESHOLD_DEFAULTS = {
  /** Default slider position; user can adjust 0.1..0.9 */
  THRESHOLD: 0.5,
  THRESHOLD_MIN: 0.1,
  THRESHOLD_MAX: 0.9,
  /**
   * confirm_cutoff = threshold + CONFIRM_DELTA.
   * Source: DECISION_LAYER.md §9
   */
  CONFIRM_DELTA: 0.20,
} as const;

export const SIGNAL_THRESHOLDS = {
  /** intent_confidence below this forces CLARIFY */
  INTENT_CLARIFY: 0.5,
  /** entity_confidence below this forces CLARIFY */
  ENTITY_CLARIFY: 0.5,
  /**
   * injection_confidence above this forces REFUSE.
   * Regex severity "high" maps to 1.0; "medium" to 0.5; "low" to 0.1.
   */
  INJECTION_REFUSE: 0.9,
  /** Medium-severity injection bump added to risk score */
  INJECTION_MEDIUM_RISK_BUMP: 0.30,
} as const;

// ---------------------------------------------------------------------------
// Undo window
// ---------------------------------------------------------------------------

export const UNDO_WINDOW = {
  /** Global default for NOTIFY verdicts (ms). Per-tool overrides in registry. */
  DEFAULT_MS: 10_000,
} as const;

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------

export const IDEMPOTENCY = {
  /** Rolling window of turns to remember action hashes for dedup */
  TURN_WINDOW: 10,
} as const;

// ---------------------------------------------------------------------------
// Risk signal weights
// Source: DECISION_LAYER.md §8
// Sum does NOT need to equal 1.0 — the formula adds base then clamps to 1.
// ---------------------------------------------------------------------------

export const RISK_WEIGHTS = {
  TOOL_REVERSIBILITY: 0.30,
  BLAST_RADIUS:       0.20,
  ENTITY_AMBIGUITY:   0.15,
  INTENT_AMBIGUITY:   0.10,
  EXTERNAL_RECIPIENT: 0.10,
  /**
   * stake_flags contribution: each flag adds STAKE_PER_FLAG up to a max of 1.
   * Weight is applied to the clamped value.
   */
  STAKE_FLAGS:        0.15,
  STAKE_PER_FLAG:     0.5,
} as const;

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

export const SECURITY = {
  /**
   * Regex patterns are defined in lib/security/injection_patterns.ts.
   * Severity levels map to numeric scores here.
   */
  SEVERITY_SCORES: {
    high:   1.0,
    medium: 0.5,
    low:    0.1,
  },
} as const;
