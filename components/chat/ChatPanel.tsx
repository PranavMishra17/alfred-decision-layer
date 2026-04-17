"use client";

import { useRef, useState, useCallback } from "react";
import { initClientBus }           from "@/lib/trace/bus";
import type { TraceEvent }         from "@/types/trace";
import { useStore }                from "@/state/store";

// ---------------------------------------------------------------------------
// Input + message state
// ---------------------------------------------------------------------------

type MessageEntry = {
  id:      string;
  role:    "user" | "assistant";
  content: string;
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
  const [messages, setMessages]   = useState<MessageEntry[]>([]);
  const [input,    setInput]      = useState("");
  const [busy,     setBusy]       = useState(false);
  const [draft,    setDraft]      = useState("");  // streaming response_draft tokens
  const messagesEndRef            = useRef<HTMLDivElement>(null);
  const inputRef                  = useRef<HTMLTextAreaElement>(null);
  const abortRef                  = useRef<AbortController | null>(null);

  const { anthropicApiKey, threshold } = useStore((s) => ({
    anthropicApiKey: s.anthropicApiKey,
    threshold:    s.threshold,
  }));

  // ---------------------------------------------------------------------------
  // Send turn → /api/decide SSE
  // ---------------------------------------------------------------------------
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;

    if (!anthropicApiKey) {
      setMessages((prev) => [...prev, {
        id:      crypto.randomUUID(),
        role:    "assistant",
        content: "No API key configured. Open Settings and enter your Anthropic key.",
      }]);
      return;
    }

    // Add user message immediately
    const userEntry: MessageEntry = {
      id:      crypto.randomUUID(),
      role:    "user",
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
      const res = await fetch("/api/decide", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        signal:  ac.signal,
        body:    JSON.stringify({
          message:              text,
          api_key:              anthropicApiKey,
          threshold,
          conversation_history: messages.map((m) => ({ role: m.role, content: m.content })),
          open_obligations:     [],
          idempotency_hashes:   [],
          action_history:       [],
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`API error ${res.status}`);
      }

      // Initialise client trace bus for this run
      let runId = "";
      let tokenAccumulator = "";

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

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

            // Accumulate response_draft tokens for chat display
            if (event.kind === "render.token") {
              const p = event.payload as { token?: string };
              if (p.token) {
                tokenAccumulator += p.token;
                setDraft(tokenAccumulator);
              }
            }
          } catch {
            // Malformed SSE frame — skip
          }
        }
      }

      // Commit the final response
      if (tokenAccumulator) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: tokenAccumulator },
        ]);
      }
      setDraft("");
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setMessages((prev) => [
          ...prev,
          {
            id:      crypto.randomUUID(),
            role:    "assistant",
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
  }, [input, busy, anthropicApiKey, threshold, messages]);

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
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: "var(--bg-chat-surface)" }}>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
        id="chat-messages-area"
        aria-label="Conversation"
        aria-live="polite"
      >
        {messages.length === 0 && <WelcomePrompt />}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
        ))}

        {/* Streaming draft */}
        {draft && (
          <MessageBubble role="assistant" content={draft} streaming />
        )}

        {/* Busy indicator */}
        {busy && !draft && (
          <div className="flex items-center gap-2 pl-2">
            <ThinkingDots />
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
                color:           input.trim() ? "var(--bg-primary)" : "var(--text-muted)",
                backgroundColor: input.trim() ? "var(--accent-copper)" : "transparent",
                borderColor:     input.trim() ? "var(--accent-copper)" : "var(--border-subtle)",
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
// Sub-components
// ---------------------------------------------------------------------------

function MessageBubble({
  role, content, streaming = false,
}: {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[85%] px-3 py-2 rounded-lg font-sans text-sm leading-relaxed"
        style={{
          backgroundColor: isUser ? "var(--accent-copper)" : "var(--bg-tertiary)",
          color:           isUser ? "var(--bg-primary)"    : "var(--text-primary)",
        }}
      >
        {content}
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
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex gap-1 items-center h-5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: "var(--text-muted)",
            animation:       `thinking-dot 1.2s ${i * 0.2}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}

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
