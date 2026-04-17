"use client";

import { AlfredAvatar } from "@/components/shared/AlfredAvatar";

/**
 * Agent Mind Panel — M1 empty shell.
 * Renders the structural layout: panel header (avatar, tool directory toggle,
 * run counter, export button), and the runs area.
 *
 * Trace bus subscription and progressive run rendering wired in M3.
 * Tool directory data wired in M2.
 *
 * Source: UI-UX-DESIGN.md §5
 */
export function MindPanel() {
  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: "var(--bg-secondary)" }}
    >
      {/* ----------------------------------------------------------------
          Panel header (fixed)
      ----------------------------------------------------------------- */}
      <header
        className="shrink-0 px-4 py-3 border-b flex items-center justify-between gap-3"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        {/* Avatar + title */}
        <div className="flex items-center gap-2">
          <AlfredAvatar state="idle" size={24} />
          <span
            className="font-mono text-xs font-semibold tracking-wide"
            style={{ color: "var(--text-secondary)" }}
          >
            Agent Mind
          </span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Run counter placeholder */}
          <span
            id="mind-panel-run-counter"
            className="font-mono text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            0 runs
          </span>

          {/* Available tools toggle (wired M2) */}
          <button
            id="mind-panel-tools-toggle"
            className="font-mono text-xs px-2 py-1 rounded border transition-colors duration-150"
            style={{
              color:           "var(--text-secondary)",
              borderColor:     "var(--border-subtle)",
              backgroundColor: "transparent",
            }}
            aria-label="Toggle available tools"
          >
            Tools
          </button>

          {/* Export traces (wired M3) */}
          <button
            id="mind-panel-export-btn"
            className="font-mono text-xs px-2 py-1 rounded border transition-colors duration-150"
            style={{
              color:           "var(--text-muted)",
              borderColor:     "var(--border-subtle)",
              backgroundColor: "transparent",
            }}
            aria-label="Export trace events as JSON"
            disabled
          >
            Export
          </button>
        </div>
      </header>

      {/* ----------------------------------------------------------------
          Available tools section — collapsed by default (wired M2)
      ----------------------------------------------------------------- */}
      <div
        id="mind-panel-tools-section"
        className="shrink-0 hidden border-b px-4 py-3"
        style={{ borderColor: "var(--border-subtle)" }}
        aria-label="Available tools"
      >
        <p
          className="font-mono text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          Tool registry loads in M2.
        </p>
      </div>

      {/* ----------------------------------------------------------------
          Decision runs area — scrollable (populated in M3)
      ----------------------------------------------------------------- */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4"
        id="mind-panel-runs-area"
        aria-label="Decision runs"
        aria-live="polite"
      >
        {/* Empty state */}
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div
            className="w-8 h-px mb-2"
            style={{ backgroundColor: "var(--border-subtle)" }}
          />
          <p
            className="font-mono text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            Decision runs appear here.
          </p>
          <p
            className="font-sans text-xs leading-relaxed max-w-48"
            style={{ color: "var(--text-muted)" }}
          >
            Send a message to alfred_ to watch the pipeline execute phase by phase.
          </p>
        </div>
      </div>
    </div>
  );
}
