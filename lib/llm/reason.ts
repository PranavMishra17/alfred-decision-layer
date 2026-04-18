/**
 * Primary Sonnet call — P2 Reason.
 * Streaming, structured output, Zod-validated, retry-once, Haiku safe-mode fallback.
 * Canonical source: DECISION_LAYER.md §7, §17
 *
 * House rules:
 *  - try/catch around every external call (DESIGN.md §2.2)
 *  - emit trace events via the bus at every boundary
 *  - all timeouts / model IDs from lib/config — no inline values
 */

import Anthropic                   from "@anthropic-ai/sdk";
import type { TraceBus }           from "@/lib/trace/bus";
import { LLMOutputSchema }         from "@/lib/llm/schema";
import { SAFE_MODE_SYSTEM,
         buildSafeModeUserMessage } from "@/lib/llm/prompts/safe_mode";
import { LLM_CONFIG, TIMEOUTS }    from "@/lib/config";
import type { LLMReasoningOutput } from "@/types/decision";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function extractJSON(text: string): unknown {
  let clean = text.trim();
  const match = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    clean = match[1].trim();
  }
  return JSON.parse(clean);
}

// ---------------------------------------------------------------------------
// Primary Sonnet call with streaming
// ---------------------------------------------------------------------------

/**
 * Call the primary Sonnet model with a streaming request.
 * Returns the validated LLMReasoningOutput.
 *
 * On timeout → throws TimeoutError
 * On Zod validation failure → throws ZodError (caller retries once)
 * On any other error → rethrows
 */
export async function callPrimaryModel(
  apiKey:        string,
  systemPrompt:  string,
  userMessage:   string,
  bus:           TraceBus
): Promise<LLMReasoningOutput> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: false });

  bus.emit("P2", "reason.started", { model: LLM_CONFIG.PRIMARY_MODEL });

  const controller = new AbortController();
  const timeoutId  = setTimeout(
    () => controller.abort("timeout"),
    TIMEOUTS.LLM_PRIMARY_MS
  );

  try {
    let accumulated = "";

    const stream = client.messages.stream({
      model:      LLM_CONFIG.PRIMARY_MODEL,
      max_tokens: 2048,
      temperature: LLM_CONFIG.TEMPERATURE,
      system:     systemPrompt,
      messages:   [{ role: "user", content: userMessage }],
    });

    stream.on("text", (delta: string) => {
      accumulated += delta;
      bus.emit("P2", "reason.delta", { delta });
    });

    await stream.finalMessage();
    clearTimeout(timeoutId);

    // Zod validate
    let parsed: unknown;
    try {
      parsed = extractJSON(accumulated);
    } catch (e: unknown) {
      bus.emit("P2", "reason.failed", { reason: `JSON Extract Error: ${e instanceof Error ? e.message : String(e)}`, detail: accumulated });
      throw e;
    }
    const validated = LLMOutputSchema.parse(parsed);
    bus.emit("P2", "reason.complete", { output: validated });
    return validated as LLMReasoningOutput;
  } catch (err) {
    clearTimeout(timeoutId);
    const isTimeout = (err as Error)?.message?.includes("timeout") ||
                      controller.signal.aborted;
    bus.emit("P2", "reason.failed", {
      reason: isTimeout ? "timeout" : String(err),
    });
    throw err;
  }
}

/**
 * Retry once with the Zod validation error appended.
 * Source: DECISION_LAYER.md §17 — "Retry once with a follow-up user message"
 */
export async function retryWithValidationError(
  apiKey:        string,
  systemPrompt:  string,
  originalMessage: string,
  validationError: string,
  bus:           TraceBus
): Promise<LLMReasoningOutput> {
  bus.emit("P2", "reason.retry", { validation_error: validationError });

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: false });

  try {
    const retryMessage =
      `${originalMessage}\n\n[Your previous response failed JSON validation with error: ${validationError}. Return valid JSON matching the schema — no prose, no markdown.]`;

    const response = await client.messages.create({
      model:       LLM_CONFIG.PRIMARY_MODEL,
      max_tokens:  2048,
      temperature: LLM_CONFIG.TEMPERATURE,
      system:      systemPrompt,
      messages:    [{ role: "user", content: retryMessage }],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const parsed    = extractJSON(text);
    const validated = LLMOutputSchema.parse(parsed);
    bus.emit("P2", "reason.complete", { output: validated, retried: true });
    return validated as LLMReasoningOutput;
  } catch (err) {
    bus.emit("P2", "reason.failed", { reason: "retry_failed", detail: String(err) });
    throw err;
  }
}

/**
 * Safe-mode Haiku call — constrained to CLARIFY | REFUSE.
 * Called when primary + retry both fail.
 * Source: DECISION_LAYER.md §17
 */
export async function callSafeMode(
  apiKey:          string,
  originalMessage: string,
  reason:          string,
  bus:             TraceBus
): Promise<LLMReasoningOutput> {
  bus.emit("P2", "reason.safemode", { reason });

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: false });
  const controller = new AbortController();
  const timeoutId  = setTimeout(
    () => controller.abort("timeout"),
    TIMEOUTS.LLM_SAFEMODE_MS
  );

  try {
    const response = await client.messages.create({
      model:     LLM_CONFIG.SAFEMODE_MODEL,
      max_tokens: 512,
      temperature: 0,
      system:    SAFE_MODE_SYSTEM,
      messages:  [
        { role: "user", content: buildSafeModeUserMessage(originalMessage, reason) },
      ],
    });
    clearTimeout(timeoutId);

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    try {
      const parsed    = extractJSON(text);
      const validated = LLMOutputSchema.parse(parsed);
      bus.emit("P2", "reason.complete", { output: validated, safe_mode: true });
      return validated as LLMReasoningOutput;
    } catch {
      // Safe-mode also failed parsing — hard REFUSE per DECISION_LAYER.md §17
      bus.emit("P2", "reason.failed", { reason: "safe_mode_parse_failed" });
      return hardRefuseOutput("Unable to parse reasoning output.");
    }
  } catch (err) {
    clearTimeout(timeoutId);
    bus.emit("P2", "reason.failed", { reason: "safe_mode_error", detail: String(err) });
    return hardRefuseOutput(String(err));
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Produce a hard-REFUSE output when even safe-mode fails.
 * Source: DECISION_LAYER.md §17 — "emit a hard REFUSE"
 */
function hardRefuseOutput(detail: string): LLMReasoningOutput {
  return {
    request_type:           "adversarial",
    actions:                [],
    new_obligations:        [],
    obligation_resolutions: [],
    needs_clarification:    false,
    clarification_specs:    [],
    response_draft:
      `I was unable to process that request. ${detail}`,
  };
}
