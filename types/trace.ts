/**
 * TraceEvent — single event on the trace bus.
 * Every phase emits typed events; the mind panel subscribes.
 * Canonical source: DECISION_LAYER.md §6, §18
 */

export type Phase = "P0" | "P1" | "P2" | "P3" | "P4" | "P5";

/**
 * All legal event kind strings, grouped by phase.
 * Keeping as a union (not enum) so SSE serialization is just a string.
 */
export type TraceEventKind =
  // P0 — Ingest
  | "turn.received"
  | "injection.scanned"
  // P1 — Hydrate
  | "context.hydrated"
  // P2 — Reason
  | "reason.started"
  | "reason.delta"
  | "reason.complete"
  | "reason.failed"
  | "reason.retry"
  | "reason.safemode"
  // P3 — Decide
  | "decide.signals"
  | "decide.score"
  | "decide.verdict"
  // P4 — Act
  | "act.started"
  | "tool.called"
  | "tool.result"
  | "act.completed"
  // P5 — Render
  | "render.token"
  | "render.audio_chunk"
  | "render.done";

export type TraceEvent = {
  run_id: string;
  phase: Phase;
  kind: TraceEventKind;
  at: number;          // Date.now()
  payload: unknown;
};
