"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { initClientBus } from "@/lib/trace/bus";
import type { TraceEvent } from "@/types/trace";
import { useStore } from "@/state/store";
import { OutcomeCard } from "./OutcomeCards";
import { ScenarioTabs } from "./ScenarioTabs";
import type { Scenario } from "./ScenarioModal";
import { ScenarioSlate } from "./ScenarioSlate";
import type { Decision, ClarificationSpec } from "@/types/decision";
import { TTSPlayer } from "@/lib/tts/player";
import { AlfredAvatar } from "@/components/shared/AlfredAvatar";

// ---------------------------------------------------------------------------
// Input + message state
// ---------------------------------------------------------------------------

type MessageEntry = {
  id: string;
  role: "user" | "assistant";
  content: string;
  decisions?: Decision[];
  actions?: Record<string, unknown>[];
  clarifications?: ClarificationSpec[];
  scenario?: Scenario;
  safeModeFired?: boolean;
  errorFired?: boolean;
  originalUserMessage?: string;
};

/**
 * Chat Panel — M3 + M5 wiring.
 * Sends user turns to /api/decide, consumes SSE, dispatches TraceEvents
 * to MindPanel via a CustomEvent ("alfred:trace").
 *
 * Architecture: ChatPanel produces → MindPanel consumes (decoupled, no shared state).
 * Source: DECISION_LAYER.md §21
 */
export function ChatPanel() {
  const [messages, setMessages] = useState<MessageEntry[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");  // streaming response_draft tokens
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const ttsPlayerRef = useRef<TTSPlayer | null>(null);

  const anthropicApiKey = useStore((s) => s.anthropicApiKey);
  const cartesiaApiKey = useStore((s) => s.cartesiaApiKey);
  const threshold = useStore((s) => s.threshold);
  const open_obligations = useStore((s) => s.open_obligations);
  const idempotencyHashes = useStore((s) => s.idempotencyHashes);
  const actionHistory = useStore((s) => s.actionHistory);
  const addObligations = useStore((s) => s.addObligations);
  const resolveObligations = useStore((s) => s.resolveObligations);
  const addActionHistory = useStore((s) => s.addActionHistory);
  const addIdempotencyHash = useStore((s) => s.addIdempotencyHash);
  const injectTimeout = useStore((s) => s.injectTimeout);
  const injectMalformedOutput = useStore((s) => s.injectMalformedOutput);
  const injectMissingContext = useStore((s) => s.injectMissingContext);
  const setInjectTimeout = useStore((s) => s.setInjectTimeout);
  const setInjectMalformedOutput = useStore((s) => s.setInjectMalformedOutput);
  const setInjectMissingContext = useStore((s) => s.setInjectMissingContext);

  // ---------------------------------------------------------------------------
  // Send turn → /api/decide SSE
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const handleScenario = (e: Event) => {
      const ce = e as CustomEvent<{ instruction: string; scenario: Scenario }>;
      const { instruction, scenario } = ce.detail;

      const scenarioHistory: MessageEntry[] = (scenario.conversation_history || []).map((m, i: number) => ({
        id: `history-${i}`,
        role: m.role as "user" | "assistant",
        content: m.content
      }));
      setMessages([
        {
          id: `scenario-${Date.now()}`,
          role: "assistant", // Use assistant role to keep it left-aligned with contextual data
          content: "",
          scenario: scenario
        },
        ...scenarioHistory
      ]);
      setInput(instruction);

      setTimeout(() => {
        const btn = document.getElementById("chat-send-btn");
        if (btn && !btn.hasAttribute("disabled")) {
          btn.click();
        }
      }, 100);
    };
    window.addEventListener("alfred:submit-scenario", handleScenario);
    return () => window.removeEventListener("alfred:submit-scenario", handleScenario);
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;

    // Allow sending even if local anthropicApiKey is blank to hit the server's process.env fallback.
    // If the server also lacks it, the Edge API will return a 401 stringified error payload naturally.

    // Add user message immediately
    const userEntry: MessageEntry = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userEntry]);
    setInput("");
    setBusy(true);
    setDraft("");

    // Create a fresh abort controller for this turn
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      // Extract mock_context from the scenario slate entry and pass as attachment_text
      const scenarioEntry = messages.find((m) => m.scenario != null);
      const attachmentText = scenarioEntry?.scenario?.mock_context
        ? JSON.stringify(scenarioEntry.scenario.mock_context, null, 2)
        : undefined;

      const res = await fetch("/api/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          message: text,
          attachment_text: attachmentText,
          api_key: anthropicApiKey,
          threshold,
          conversation_history: messages.map((m) => ({ role: m.role, content: m.content })),
          open_obligations: open_obligations,
          idempotency_hashes: Array.from(idempotencyHashes),
          action_history: actionHistory,
          inject: {
            timeout: injectTimeout,
            malformed_output: injectMalformedOutput,
            missing_context: injectMissingContext,
          }
        }),
      });

      // Clear one-shot injection flags after successful trigger
      if (injectTimeout || injectMalformedOutput || injectMissingContext) {
        setInjectTimeout(false);
        setInjectMalformedOutput(false);
        setInjectMissingContext(false);
      }

      if (!res.ok || !res.body) {
        throw new Error(`API error ${res.status}`);
      }

      let runId = "";
      let tokenAccumulator = "";
      const turnDecisions: Decision[] = [];
      const turnActions: Record<string, unknown>[] = [];
      let turnClarifications: ClarificationSpec[] = [];
      let turnSafeModeFired = false;
      let turnErrorFired = false;

      // M9 TTS state
      let ttsMode: "pending" | "none" | "clarify" | "first_sentence" | "full" = "pending";
      let sentenceBuffer = "";
      let sentencesSpoken = 0;

      // Always create player — /api/tts falls back to server CARTESIA_API_KEY if no BYOK key
      ttsPlayerRef.current = new TTSPlayer(cartesiaApiKey);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event: TraceEvent = JSON.parse(line.slice(6));

            // Init bus on first event
            if (!runId && event.run_id) {
              runId = event.run_id;
              initClientBus(runId);
            }

            // Forward event to MindPanel via CustomEvent
            window.dispatchEvent(
              new CustomEvent("alfred:trace", { detail: event })
            );

            if (event.kind === "reason.complete") {
              const p = event.payload as { output?: { new_obligations?: { action_ref: string; condition: string }[]; obligation_resolutions?: string[]; clarification_specs?: ClarificationSpec[] } };
              if (p.output?.new_obligations?.length) {
                addObligations(p.output.new_obligations, event.run_id);
              }
              if (p.output?.obligation_resolutions?.length) {
                resolveObligations(p.output.obligation_resolutions, event.run_id);
              }
              if (p.output?.clarification_specs?.length) turnClarifications = p.output.clarification_specs;
            }
            if (event.kind === "act.completed") {
              const p = event.payload as { decision?: Decision; hash?: string; action?: Record<string, unknown> };
              if (p.decision) {
                addActionHistory(p.decision);
                turnDecisions.push(p.decision);
              }
              if (p.hash) addIdempotencyHash(p.hash);
              if (p.action) turnActions.push(p.action);
            }
            if (event.kind === "safemode.fired") {
              turnSafeModeFired = true;
            }
            if (event.kind === "reason.failed") {
              const p = event.payload as { reason?: string };
              if (p.reason === "injected_malformed_output") turnErrorFired = true;
            }

            // Accumulate response_draft tokens for chat display
            if (event.kind === "render.token") {
              // Resolve TTS Mode strictly upon reaching the P5 render phase securely
              if (ttsMode === "pending") {
                const verdicts = turnDecisions.map(d => d.verdict);
                if (verdicts.includes("CLARIFY") || turnClarifications.length > 0) ttsMode = "clarify";
                else if (verdicts.includes("REFUSE")) ttsMode = "full";
                else if (verdicts.includes("NOTIFY") || verdicts.includes("CONFIRM")) ttsMode = "first_sentence";
                else {
                  // If we're getting render tokens on a SILENT turn, the LLM wrote
                  // a response (e.g. answering a question or reading email aloud) — speak it
                  ttsMode = "full";
                }

                if (ttsMode === "clarify") {
                  ttsPlayerRef.current?.enqueueSentence("I need a quick clarification.");
                }
              }

              const p = event.payload as { token?: string };
              if (p.token) {
                tokenAccumulator += p.token;
                setDraft(tokenAccumulator);

                // Sentence buffering map for Cartesia
                if (ttsMode === "full" || ttsMode === "first_sentence") {
                  sentenceBuffer += p.token;
                  if (/[.?!]\s*$/.test(sentenceBuffer)) {
                    if (ttsMode === "full" || sentencesSpoken === 0) {
                      ttsPlayerRef.current?.enqueueSentence(sentenceBuffer);
                      sentencesSpoken++;
                    }
                    sentenceBuffer = "";
                  }
                }
              }
            }
          } catch {
            // Malformed SSE frame — skip
          }
        }
      }

      // Flush final TTS buffers cleanly natively post loop natively 
      if (sentenceBuffer.trim().length > 0 && (ttsMode === "full" || (ttsMode === "first_sentence" && sentencesSpoken === 0))) {
        ttsPlayerRef.current?.enqueueSentence(sentenceBuffer);
      }

      // Commit the final response
      if (tokenAccumulator || turnDecisions.length > 0 || turnClarifications.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: tokenAccumulator,
            decisions: turnDecisions,
            actions: turnActions,
            clarifications: turnClarifications,
            safeModeFired: turnSafeModeFired,
            errorFired: turnErrorFired,
            originalUserMessage: text,
          },
        ]);
      }
      setDraft("");
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `An error occurred: ${(err as Error).message}`,
          },
        ]);
      }
    } finally {
      setBusy(false);
      setDraft("");
      abortRef.current = null;
      // Scroll to end
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [input, busy, anthropicApiKey, threshold, messages, open_obligations, idempotencyHashes, actionHistory, addObligations, resolveObligations, addActionHistory, addIdempotencyHash, injectTimeout, injectMalformedOutput, injectMissingContext, setInjectTimeout, setInjectMalformedOutput, setInjectMissingContext, cartesiaApiKey]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    },
    [send]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    ttsPlayerRef.current?.abort();
  }, []);

  const rerun = useCallback(async (originalMessage: string, overriddenObligationIds: string[]) => {
    if (busy) return;
    setBusy(true);
    setDraft("");

    const ac = new AbortController();
    abortRef.current = ac;

    const filteredObligations = open_obligations.filter(
      (o) => !overriddenObligationIds.includes(o.id)
    );

    try {
      const scenarioEntry = messages.find((m) => m.scenario != null);
      const attachmentText = scenarioEntry?.scenario?.mock_context
        ? JSON.stringify(scenarioEntry.scenario.mock_context, null, 2)
        : undefined;

      const res = await fetch("/api/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          message: originalMessage,
          attachment_text: attachmentText,
          api_key: anthropicApiKey,
          threshold,
          conversation_history: messages.map((m) => ({ role: m.role, content: m.content })),
          open_obligations: filteredObligations,
          idempotency_hashes: Array.from(idempotencyHashes),
          action_history: actionHistory,
          inject: { timeout: false, malformed_output: false, missing_context: false },
        }),
      });

      if (!res.ok || !res.body) throw new Error(`API error ${res.status}`);

      let tokenAccumulator = "";
      const turnDecisions: Decision[] = [];
      const turnActions: Record<string, unknown>[] = [];
      let turnClarifications: ClarificationSpec[] = [];

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event: TraceEvent = JSON.parse(line.slice(6));
            window.dispatchEvent(new CustomEvent("alfred:trace", { detail: event }));
            if (event.kind === "reason.complete") {
              const p = event.payload as { output?: { new_obligations?: { action_ref: string; condition: string }[]; obligation_resolutions?: string[]; clarification_specs?: ClarificationSpec[] } };
              if (p.output?.new_obligations?.length) addObligations(p.output.new_obligations, event.run_id);
              if (p.output?.obligation_resolutions?.length) resolveObligations(p.output.obligation_resolutions, event.run_id);
              if (p.output?.clarification_specs?.length) turnClarifications = p.output.clarification_specs;
            }
            if (event.kind === "act.completed") {
              const p = event.payload as { decision?: Decision; hash?: string; action?: Record<string, unknown> };
              if (p.decision) { addActionHistory(p.decision); turnDecisions.push(p.decision); }
              if (p.hash) addIdempotencyHash(p.hash);
              if (p.action) turnActions.push(p.action);
            }
            if (event.kind === "render.token") {
              const p = event.payload as { token?: string };
              if (p.token) { tokenAccumulator += p.token; setDraft(tokenAccumulator); }
            }
          } catch { /* malformed SSE frame */ }
        }
      }

      if (tokenAccumulator || turnDecisions.length > 0 || turnClarifications.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: tokenAccumulator,
            decisions: turnDecisions,
            actions: turnActions,
            clarifications: turnClarifications,
          },
        ]);
      }
      setDraft("");
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setMessages((prev) => [...prev, {
          id: crypto.randomUUID(), role: "assistant",
          content: `Re-run error: ${(err as Error).message}`,
        }]);
      }
    } finally {
      setBusy(false);
      setDraft("");
      abortRef.current = null;
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [busy, open_obligations, messages, anthropicApiKey, threshold, idempotencyHashes, actionHistory, addObligations, resolveObligations, addActionHistory, addIdempotencyHash]);

  const clarifyRerun = useCallback(async (originalMessage: string, answer: string) => {
    const augmented = `${originalMessage}\n\nClarification: ${answer}`;
    await rerun(augmented, []);
  }, [rerun]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: "var(--bg-chat-surface)" }}>
      {messages.length === 0 && <ScenarioTabs />}

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
        id="chat-messages-area"
        aria-label="Conversation"
        aria-live="polite"
      >
        {messages.length === 0 && <WelcomePrompt />}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
            decisions={msg.decisions}
            actions={msg.actions}
            clarifications={msg.clarifications}
            scenario={msg.scenario}
            safeModeFired={msg.safeModeFired}
            errorFired={msg.errorFired}
            originalUserMessage={msg.originalUserMessage}
            onConfirm={rerun}
            onClarify={clarifyRerun}
          />
        ))}

        {/* Streaming draft */}
        {draft && (
          <MessageBubble role="assistant" content={draft} streaming />
        )}

        {/* Busy indicator */}
        {busy && !draft && (
          <div className="flex items-center gap-2 pl-2 mt-2">
            <AlfredAvatar state="thinking" size={24} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        className="shrink-0 border-t px-4 py-3"
        style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-input)" }}
      >
        <div
          className="flex items-end gap-2 rounded-lg border p-2"
          style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-primary)" }}
        >
          <textarea
            ref={inputRef}
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell alfred_ what to do..."
            rows={1}
            disabled={busy}
            aria-label="Message input"
            className="flex-1 resize-none bg-transparent outline-none font-sans text-sm leading-relaxed"
            style={{
              color: "var(--text-primary)",
              maxHeight: "120px",
              overflowY: "auto",
            }}
          />

          {busy ? (
            <button
              id="chat-cancel-btn"
              onClick={cancel}
              className="shrink-0 font-mono text-xs px-3 py-1.5 rounded border transition-colors duration-150"
              style={{
                color: "var(--decision-refuse)",
                borderColor: "var(--decision-refuse)",
                backgroundColor: "transparent",
              }}
              aria-label="Cancel request"
            >
              Stop
            </button>
          ) : (
            <button
              id="chat-send-btn"
              onClick={send}
              disabled={!input.trim()}
              className="shrink-0 font-mono text-xs px-3 py-1.5 rounded border transition-colors duration-150"
              style={{
                color: input.trim() ? "var(--bg-primary)" : "var(--text-muted)",
                backgroundColor: input.trim() ? "var(--accent-copper)" : "transparent",
                borderColor: input.trim() ? "var(--accent-copper)" : "var(--border-subtle)",
              }}
              aria-label="Send message"
            >
              Send
            </button>
          )}
        </div>

        <p className="font-mono text-xs mt-1.5 text-center" style={{ color: "var(--text-muted)" }}>
          {busy ? "Processing..." : "Enter to send, Shift+Enter for newline"}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Minimal markdown renderer — handles bold, italic, blockquote, line breaks
// ---------------------------------------------------------------------------

function renderMarkdown(text: string): React.ReactNode[] {
  return text.split("\n").map((line, lineIdx) => {
    const isQuote = line.startsWith("> ");
    const raw = isQuote ? line.slice(2) : line;

    // Parse inline: **bold**, *italic*, `code`
    const parts: React.ReactNode[] = [];
    const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
    let last = 0;
    let m;
    while ((m = pattern.exec(raw)) !== null) {
      if (m.index > last) parts.push(raw.slice(last, m.index));
      if (m[2] !== undefined) parts.push(<strong key={m.index}>{m[2]}</strong>);
      else if (m[3] !== undefined) parts.push(<em key={m.index}>{m[3]}</em>);
      else if (m[4] !== undefined) parts.push(<code key={m.index} className="font-mono text-xs px-1 py-0.5 rounded" style={{ backgroundColor: "var(--bg-input)" }}>{m[4]}</code>);
      last = m.index + m[0].length;
    }
    if (last < raw.length) parts.push(raw.slice(last));

    const lineContent = isQuote
      ? <blockquote key={lineIdx} className="border-l-2 pl-2 italic" style={{ borderColor: "var(--text-muted)", color: "var(--text-secondary)" }}>{parts}</blockquote>
      : <span key={lineIdx}>{parts}</span>;

    return lineIdx === 0
      ? lineContent
      : <React.Fragment key={lineIdx}><br />{lineContent}</React.Fragment>;
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MessageBubble({
  role, content, streaming = false, decisions, actions, clarifications, scenario,
  safeModeFired, errorFired, originalUserMessage, onConfirm, onClarify
}: {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  decisions?: Decision[];
  actions?: Record<string, unknown>[];
  clarifications?: ClarificationSpec[];
  scenario?: Scenario;
  safeModeFired?: boolean;
  errorFired?: boolean;
  originalUserMessage?: string;
  onConfirm?: (originalMessage: string, overriddenObligationIds: string[]) => void;
  onClarify?: (originalMessage: string, answer: string) => void;
}) {
  const isUser = role === "user";
  const allSilent = decisions && decisions.length > 0 && decisions.every(d => d.verdict === "SILENT" || d.verdict === "SILENT_DUPE");
  const hasContent = content && content.trim().length > 0;
  const showContent = !allSilent || streaming || hasContent; // Always show if LLM wrote a response

  return (
    <div className={`flex flex-col gap-2 w-full ${isUser ? "items-end" : "items-start"}`}>
      {scenario && (
        <div className="w-full max-w-[90%] mb-2">
          <ScenarioSlate scenario={scenario} />
        </div>
      )}

      {content && showContent && (
        <div
          className="max-w-[85%] px-3 py-2 rounded-lg font-sans text-sm leading-relaxed"
          style={{
            backgroundColor: isUser ? "var(--accent-copper)" : "var(--bg-tertiary)",
            color: isUser ? "var(--bg-primary)" : "var(--text-primary)",
          }}
        >
          {isUser ? content : renderMarkdown(content)}
          {streaming && (
            <span
              style={{
                display: "inline-block",
                width: "1px",
                height: "0.9em",
                backgroundColor: "currentColor",
                marginLeft: "2px",
                verticalAlign: "middle",
                animation: "caret-blink 1.1s step-end infinite",
              }}
            />
          )}
        </div>
      )}
      {!isUser && (
        <div className={`flex flex-col gap-2 w-full mt-1 ${isUser ? "items-end" : "items-start"}`}>
          {safeModeFired && (
            <div className="flex items-center gap-2 px-3 py-2 rounded border text-xs font-mono"
              style={{ borderColor: "var(--decision-confirm)", color: "var(--decision-confirm)", backgroundColor: "var(--decision-confirm)10" }}>
              ⚠ Primary reasoning timed out — safe mode active. Responses may be limited.
            </div>
          )}
          {errorFired && (
            <div className="flex items-center gap-2 px-3 py-2 rounded border text-xs font-mono"
              style={{ borderColor: "var(--decision-refuse)", color: "var(--decision-refuse)", backgroundColor: "var(--decision-refuse)10" }}>
              ⚠ Malformed output detected — recovery attempted via retry chain.
            </div>
          )}
          {decisions?.map((d, i) => (
            <OutcomeCard
              key={`d-${i}`}
              decision={d}
              action={actions?.[i]}
              onConfirm={onConfirm ? (ids) => onConfirm(originalUserMessage ?? "", ids) : undefined}
            />
          ))}
          {clarifications?.map((c, i) => (
            <OutcomeCard
              key={`c-${i}`}
              clarification={c}
              onClarify={onClarify ? (answer) => onClarify(originalUserMessage ?? "", answer) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ThinkingDots is handled via AlfredAvatar now.


function WelcomePrompt() {
  return (
    <div
      className="flex flex-col gap-2 items-start p-4 rounded-lg"
      style={{ backgroundColor: "var(--bg-tertiary)" }}
    >
      <p className="font-mono text-xs font-medium" style={{ color: "var(--accent-copper)" }}>
        alfred_
      </p>
      <p className="font-sans text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        Ready. Ask me to read your inbox, draft a reply, schedule a meeting, or manage tasks.
        Every action runs through the decision pipeline before it executes.
      </p>
    </div>
  );
}
