/**
 * /api/decide — SSE route, Edge runtime.
 * Orchestrates P0-P4 via runDecisionPipeline() and streams TraceEvents
 * as SSE frames to the client.
 *
 * Canonical source: DECISION_LAYER.md §21, §22
 *
 * Request body (POST):
 *   { message, api_key, conversation_history, open_obligations,
 *     idempotency_hashes, threshold, inject }
 *
 * SSE frames:
 *   data: <JSON-serialized TraceEvent>\n\n
 *
 * House rules:
 *  - try/catch around every external call (DESIGN.md §2.2)
 *  - no API keys ever logged
 *  - keys flow: client localStorage → request body → Anthropic; never persisted server-side
 */

import { NextRequest } from "next/server";
import { runDecisionPipeline, type PipelineTurn, type PipelineContext } from "@/lib/decision/pipeline";
import type { PendingObligation } from "@/types/obligation";
import type { Decision }          from "@/types/decision";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const api_key = (body.api_key || process.env.ANTHROPIC_API_KEY) as string | undefined;
  if (!api_key) {
    return new Response(
      JSON.stringify({ error: "api_key is required" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const message = body.message as string | undefined;
  if (!message?.trim()) {
    return new Response(
      JSON.stringify({ error: "message is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const turn: PipelineTurn = {
    message,
    attachment_text: body.attachment_text as string | undefined,
    api_key,
    inject: body.inject as PipelineTurn["inject"],
  };

  const pipelineCtx: PipelineContext = {
    conversation_history: (body.conversation_history as PipelineContext["conversation_history"]) ?? [],
    open_obligations:     (body.open_obligations     as PendingObligation[]) ?? [],
    idempotency:          new Set<string>((body.idempotency_hashes as string[]) ?? []),
    threshold:            typeof body.threshold === "number" ? body.threshold : 0.5,
    action_history:       (body.action_history as Decision[]) ?? [],
  };

  // ---------------------------------------------------------------------------
  // SSE stream
  // ---------------------------------------------------------------------------
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of runDecisionPipeline(turn, pipelineCtx)) {
          try {
            const frame = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(frame));
          } catch (serErr) {
            // Serialization error on a single event is non-fatal
            const errFrame = `data: ${JSON.stringify({
              run_id: "unknown", phase: "P0", kind: "render.done",
              at: Date.now(), payload: { error: "serialization_error" }
            })}\n\n`;
            controller.enqueue(encoder.encode(errFrame));
          }
        }
      } catch (err) {
        // Pipeline-level error — send a final error event before closing
        try {
          const errFrame = `data: ${JSON.stringify({
            run_id: "unknown", phase: "P0", kind: "render.done",
            at: Date.now(), payload: { error: String(err) }
          })}\n\n`;
          controller.enqueue(encoder.encode(errFrame));
        } catch { /* ignore */ }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
