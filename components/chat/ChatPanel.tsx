"use client";

/**
 * Chat Panel — M1 empty shell.
 * Renders the structural layout: scenario tab strip placeholder,
 * scrollable message area, and fixed input bar.
 *
 * Content and interactivity wired in M7 (scenario tabs, message bubbles,
 * outcome cards, obligation chip, input bar).
 *
 * Source: UI-UX-DESIGN.md §4
 */
export function ChatPanel() {
  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      {/* ----------------------------------------------------------------
          Scenario tab strip placeholder (populated in M7)
      ----------------------------------------------------------------- */}
      <div
        className="shrink-0 px-4 py-2 border-b flex items-center gap-2 overflow-x-auto"
        style={{ borderColor: "var(--border-subtle)" }}
        aria-label="Scenario tabs"
        id="scenario-tab-strip"
      >
        <span
          className="font-mono text-xs whitespace-nowrap"
          style={{ color: "var(--text-muted)" }}
        >
          Scenarios — coming in M7
        </span>
      </div>

      {/* ----------------------------------------------------------------
          Message area — scrollable, bottom-anchored
      ----------------------------------------------------------------- */}
      <div
        className="flex-1 overflow-y-auto flex flex-col-reverse px-4 py-4 gap-3"
        id="chat-message-area"
        aria-label="Chat messages"
      >
        {/* Empty state */}
        <div
          className="flex flex-col items-center justify-center gap-4 py-16 text-center"
          aria-live="polite"
        >
          <p
            className="font-sans text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            Pick a scenario above or type a message to alfred_.
          </p>
        </div>
      </div>

      {/* ----------------------------------------------------------------
          Input bar (wired in M7; structure planted now)
      ----------------------------------------------------------------- */}
      <div
        className="shrink-0 px-4 pb-4 pt-2 border-t"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        {/* Obligations chip placeholder */}
        <div id="obligations-chip-slot" className="mb-2" />

        {/* Input row */}
        <div
          className="flex items-end gap-2 rounded-lg border px-3 py-2"
          style={{
            backgroundColor: "var(--bg-input)",
            borderColor:     "var(--border-subtle)",
          }}
        >
          <textarea
            id="chat-input-field"
            rows={1}
            placeholder="Message alfred_..."
            className="flex-1 resize-none bg-transparent font-sans text-sm outline-none leading-relaxed"
            style={{
              color:            "var(--text-primary)",
              caretColor:       "var(--accent-copper)",
              maxHeight:        "96px",
            }}
            aria-label="Message input"
            disabled
          />
          <button
            id="chat-send-btn"
            className="shrink-0 p-1.5 rounded transition-colors duration-150"
            style={{
              backgroundColor: "var(--bg-tertiary)",
              color:           "var(--text-muted)",
            }}
            disabled
            aria-label="Send message"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M2 14L14 8 2 2v4.5l8 1.5-8 1.5V14z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        <p
          className="mt-1.5 font-sans text-xs text-center"
          style={{ color: "var(--text-muted)" }}
        >
          Prototype — tool calls are simulated
        </p>
      </div>
    </div>
  );
}
