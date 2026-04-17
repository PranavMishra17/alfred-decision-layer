/**
 * Preloaded scenario type.
 * Mirrors the shape of scenarios/preloaded.json.
 * Canonical source: UI-UX-DESIGN.md §6
 */

import type { PendingObligation } from "./obligation";

export type ScenarioCategory = "easy" | "ambiguous" | "adversarial" | "failure";

export type ScenarioContextType =
  | "direct_message"
  | "email_thread"
  | "group_chat";

export type FailureInjection = "timeout" | "malformed_output" | "missing_context" | null;

export type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO-8601
};

export type Scenario = {
  id: string;
  title: string;
  category: ScenarioCategory;
  description: string;
  context_type: ScenarioContextType;
  predefined_instruction: string;
  expected_verdict: string;
  expected_rationale: string;
  failure_injection: FailureInjection;
  pre_seeded_obligations: {
    id: string;
    action_ref: string;
    condition: string;
    status: "open" | "resolved";
    raised_at: string;       // ISO-8601 string as it appears in JSON
    resolved_at: null;
    resolved_by_turn_id: null;
  }[];
  conversation_history: ConversationTurn[];
  user_message: string;
  attachments: unknown[];
  mock_context: Record<string, unknown>;
};
