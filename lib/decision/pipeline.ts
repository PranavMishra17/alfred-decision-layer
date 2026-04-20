/**
 * P0-P4 pipeline orchestrator — async generator that yields TraceEvents.
 * The SSE route consumes this generator and forwards events to the client.
 *
 * Canonical source: DECISION_LAYER.md §4, §5, §21
 *
 * P0 — Ingest + parallel injection scan
 * P1 — Hydrate context
 * P2 — Reason (Sonnet, with fallbacks)
 * P3 — Decide (per action, deterministic)
 * P4 — Act (branch on verdict, update stores)
 *
 * P5 (render / SSE streaming) is handled by the route itself — the generator
 * yields trace events and the route writes them as SSE frames.
 *
 * House rules:
 *  - try/catch around every external call (DESIGN.md §2.2)
 *  - fallback order REFUSE > CLARIFY > CONFIRM > NOTIFY > SILENT in code
 *  - all timeouts/model IDs from lib/config
 */

import { createTraceBus }          from "@/lib/trace/bus";
import { scanForInjections,
         hasHighSeverityFlag }     from "@/lib/security/scan";
import { TOOL_REGISTRY }           from "@/lib/tools/registry";
import { extractSignals }          from "@/lib/decision/signals";
import { decide }                  from "@/lib/decision/policy";
import { executeTool }             from "@/lib/tools/executor";
import {
  callPrimaryModel,
  retryWithValidationError,
  callSafeMode,
}                                  from "@/lib/llm/reason";
import {
  buildSystemPrompt,
  buildUserMessage,
}                                  from "@/lib/llm/prompts/system";
import type { TraceEvent }         from "@/types/trace";
import type { DecisionContext,
              LLMReasoningOutput,
              Action, Decision }   from "@/types/decision";
import type { PendingObligation }  from "@/types/obligation";

// ---------------------------------------------------------------------------
// Public input shape
// ---------------------------------------------------------------------------

export type PipelineTurn = {
  /** Raw user message text */
  message: string;
  /** Concatenated attachment text (optional) */
  attachment_text?: string;
  /** BYOK Anthropic API key */
  api_key: string;
  /** Failure injection flags (one-shot, set by settings) */
  inject?: {
    timeout?:          boolean;
    malformed_output?: boolean;
    missing_context?:  boolean;
  };
};

export type PipelineContext = {
  conversation_history: { role: "user" | "assistant"; content: string }[];
  open_obligations:     PendingObligation[];
  idempotency:          Set<string>;
  threshold:            number;
  action_history:       Decision[];
};

// ---------------------------------------------------------------------------
// Generator — yields TraceEvent values consumed by the SSE route
// ---------------------------------------------------------------------------

export async function* runDecisionPipeline(
  turn: PipelineTurn,
  ctx:  PipelineContext
): AsyncGenerator<TraceEvent> {
  const run_id = crypto.randomUUID();
  const bus    = createTraceBus(run_id);

  // Yield a helper — every bus event is forwarded to the SSE caller

  let cursor = 0;
  function* flush(): Generator<TraceEvent> {
    const events = bus.events.slice(cursor);
    cursor += events.length;
    for (const e of events) yield e;
  }

  // ===========================================================================
  // P0 — Ingest
  // ===========================================================================
  bus.emit("P0", "turn.received", { message: turn.message, run_id });
  yield* flush();

  // Parallel injection scan (non-blocking per §4)
  const injectionFlags = scanForInjections(
    turn.message + " " + (turn.attachment_text ?? "")
  );
  bus.emit("P0", "injection.scanned", { flags: injectionFlags });
  yield* flush();

  // ===========================================================================
  // P1 — Hydrate
  // ===========================================================================
  const tools = Object.values(TOOL_REGISTRY);

  const decisionCtx: DecisionContext = {
    registry:         TOOL_REGISTRY,
    open_obligations: ctx.open_obligations,
    idempotency:      ctx.idempotency,
    settings:         { threshold: ctx.threshold },
    injection_flags:  injectionFlags,
    action_history:   ctx.action_history,
  };

  bus.emit("P1", "context.hydrated", {
    obligations:    ctx.open_obligations.length,
    idempotency:    ctx.idempotency.size,
    tool_count:     tools.length,
  });
  yield* flush();

  // ===========================================================================
  // P2 — Reason
  // ===========================================================================
  const systemPrompt = buildSystemPrompt(tools, ctx.open_obligations);
  const userMsg      = buildUserMessage(
    ctx.conversation_history,
    turn.message,
    turn.attachment_text
  );

  let llmOutput: LLMReasoningOutput;

  try {
    if (turn.inject?.timeout) {
      bus.emit("P2", "reason.failed", { reason: "injected_timeout" });
      yield* flush();
      llmOutput = await callSafeMode(turn.api_key, turn.message, "injected_timeout", bus);
      llmOutput = { ...llmOutput, actions: [] };
      bus.emit("P2", "safemode.fired", { reason: "timeout" });
      yield* flush();
    } else if (turn.inject?.malformed_output) {
      bus.emit("P2", "reason.started", { model: "injected" });
      bus.emit("P2", "reason.failed", { reason: "injected_malformed_output" });
      yield* flush();
      llmOutput = await callSafeMode(turn.api_key, turn.message, "injected_malformed_output", bus);
      llmOutput = { ...llmOutput, actions: [] };
      bus.emit("P2", "safemode.fired", { reason: "malformed_output" });
      yield* flush();
    } else {
      try {
        llmOutput = await callPrimaryModel(turn.api_key, systemPrompt, userMsg, bus);
      } catch (primaryErr) {
        // Zod error or timeout → retry once
        const isZodError = (primaryErr as Error)?.name === "ZodError";
        if (isZodError) {
          try {
            llmOutput = await retryWithValidationError(
              turn.api_key,
              systemPrompt,
              userMsg,
              String(primaryErr),
              bus
            );
          } catch {
            llmOutput = await callSafeMode(turn.api_key, turn.message, "retry_failed", bus);
          }
        } else {
          llmOutput = await callSafeMode(turn.api_key, turn.message, String(primaryErr), bus);
        }
      }
    }
  } catch (err) {
    // Total P2 failure — hard refuse
    bus.emit("P2", "reason.failed", { reason: "catastrophic", detail: String(err) });
    llmOutput = {
      request_type:           "adversarial",
      actions:                [],
      new_obligations:        [],
      obligation_resolutions: [],
      needs_clarification:    false,
      clarification_specs:    [],
      response_draft:         "I was unable to process that request.",
    };
  }

  yield* flush();

  // High-severity injection + adversarial request_type both force empty actions
  if (hasHighSeverityFlag(injectionFlags) || llmOutput.request_type === "adversarial") {
    llmOutput = { ...llmOutput, actions: [] };
  }

  bus.emit("P2", "reason.complete", { output: llmOutput });
  yield* flush();

  // ===========================================================================
  // P3 — Decide (per action)
  // ===========================================================================
  const decisions: Decision[] = [];

  for (const rawAction of llmOutput.actions) {
    const action: Action = {
      id:   crypto.randomUUID(),
      hash: `${rawAction.tool}:${JSON.stringify(rawAction.params)}`,
      ...rawAction,
      entities: rawAction.entities ?? [],
    };

    try {
      const signals  = extractSignals(action, decisionCtx);
      bus.emit("P3", "decide.signals", { action_id: action.id, signals });
      yield* flush();

      const decision = decide(action, signals, decisionCtx);
      bus.emit("P3", "decide.score",   { action_id: action.id, risk_score: decision.risk_score });
      bus.emit("P3", "decide.verdict", { action_id: action.id, verdict: decision.verdict, rationale: decision.rationale });
      yield* flush();

      decisions.push(decision);
    } catch (err) {
      // Single-action P3 fault → REFUSE on that action per fallback order
      const refuseDecision: Decision = {
        action_id:        action.id,
        verdict:          "REFUSE",
        risk_score:       1,
        signals:          {
          tool_reversibility: 1, blast_radius: 1, entity_ambiguity: 1,
          intent_ambiguity: 1, obligation_conflict: 0, policy_violation: 1,
          external_recipient: 0, stake_flags: ["_error"], injection_detected: 0,
        },
        rationale:        `Decision error: ${err instanceof Error ? err.message : String(err)}`,
        fallback_applied: "REFUSE",
        gate_rule:        "p3_error_fallback",
      };
      bus.emit("P3", "decide.verdict", { action_id: action.id, verdict: "REFUSE", error: true });
      yield* flush();
      decisions.push(refuseDecision);
    }
  }

  // ===========================================================================
  // P4 — Act
  // ===========================================================================
  for (const decision of decisions) {
    bus.emit("P4", "act.started", { action_id: decision.action_id, verdict: decision.verdict });
    yield* flush();

    if (decision.verdict === "SILENT" || decision.verdict === "NOTIFY") {
      // SILENT fires immediately; NOTIFY fires after undo window (client manages timer)
      const rawAction = llmOutput.actions.find(
        (a) => `${a.tool}:${JSON.stringify(a.params)}` === decision.action_id.split(":").slice(1).join(":")
      );

      if (rawAction) {
        const call = { tool: rawAction.tool, params: rawAction.params, called_at: Date.now() };
        bus.emit("P4", "tool.called", { call });
        yield* flush();

        try {
          const result = await executeTool(call);
          bus.emit("P4", "tool.result", { result });
          yield* flush();
        } catch (err) {
          bus.emit("P4", "tool.result", { error: String(err), success: false });
          yield* flush();
        }
      }
    }

    const rawAction = llmOutput.actions.find(
      (a) => `${a.tool}:${JSON.stringify(a.params)}` === decision.action_id.split(":").slice(1).join(":")
    );
    bus.emit("P4", "act.completed", {
      action_id: decision.action_id,
      decision,
      action: rawAction,
      hash: rawAction ? `${decision.action_id.split(":")[1]}:${JSON.stringify(rawAction.params)}` : undefined
    });
    yield* flush();
  }

  // ===========================================================================
  // P5 — Render (response_draft emitted as token stream)
  // ===========================================================================
  const words = llmOutput.response_draft.split(" ");
  for (const word of words) {
    bus.emit("P5", "render.token", { token: word + " " });
    yield* flush();
  }
  bus.emit("P5", "render.done", { run_id });
  yield* flush();
}
