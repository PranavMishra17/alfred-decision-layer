/**
 * ToolDefinition and related types.
 * Canonical source: DECISION_LAYER.md §6, §12; UI-UX-DESIGN.md §7
 */

import type { Verdict } from "./decision";

export type Reversibility = "reversible" | "partial" | "irreversible";

/**
 * JSON Schema shape used for tool parameter schemas.
 * Kept minimal — only the fields the registry actually uses.
 */
export type JSONSchema = {
  type: "object";
  required?: string[];
  properties: Record<
    string,
    {
      type: string;
      description?: string;
      enum?: unknown[];
    }
  >;
};

/** Registry entry — one per tool. Single source of truth for risk metadata. */
export type ToolDefinition = {
  name: string;
  description: string;
  parameters_schema: JSONSchema;
  reversibility: Reversibility;
  default_blast_radius: number;     // 0..1
  default_risk_floor: number;       // 0..1, minimum risk any call carries
  default_verdict_hint: Verdict;    // bias when signals are borderline
  undo_window_ms: number;           // per-tool override of global 10s
  stake_flags: string[];            // baseline flags always present
  /** Path-like key into the mocks registry, not a real FS path */
  mock_handler: string;
};

/** Logged in the trace when a tool is actually called by P4. */
export type ToolCall = {
  tool: string;
  params: Record<string, unknown>;
  called_at: number;
};

/** Returned by a mock handler and logged in the trace. */
export type ToolResult = {
  tool: string;
  success: boolean;
  data: unknown;
  simulated: true;    // always true — no real integrations in v1
  latency_ms: number;
};
