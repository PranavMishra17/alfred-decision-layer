"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AlfredAvatar }   from "@/components/shared/AlfredAvatar";
import { DecisionBadge }  from "@/components/shared/DecisionBadge";
import { pushClientEvent, getClientBus, initClientBus } from "@/lib/trace/bus";
import type { TraceEvent, Phase }                        from "@/types/trace";
import type { Verdict }                                  from "@/types/decision";

// ---------------------------------------------------------------------------
// Types for the run model the panel renders
// ---------------------------------------------------------------------------

type PhaseSection = {
  phase:  Phase;
  events: TraceEvent[];
  failed: boolean;
};

type RunData = {
  run_id:   string;
  sections: Partial<Record<Phase, PhaseSection>>;
  verdict?: Verdict;
  risk?:    number;
  rationale?: string;
  tokens:   string;
  done:     boolean;
};

const PHASE_LABELS: Record<Phase, string> = {
  P0: "Ingest",
  P1: "Hydrate",
  P2: "Reason",
  P3: "Decide",
  P4: "Act",
  P5: "Render",
};

// ---------------------------------------------------------------------------
// MindPanel component
// ---------------------------------------------------------------------------

/**
 * Agent Mind Panel — M3 implementation.
 * Subscribes to the client-side trace bus and renders phase-grouped run cards.
 * Source: DECISION_LAYER.md §18, UI-UX-DESIGN.md §5
 */
export function MindPanel() {
  const [runs,         setRuns]         = useState<RunData[]>([]);
  const [toolsOpen,    setToolsOpen]    = useState(false);
  const runsEndRef = useRef<HTMLDivElement>(null);

  // Expose a way for ChatPanel to push SSE events into the bus
  useEffect(() => {
    // Expose a way for ChatPanel to push SSE events into the bus
    const handler = (e: CustomEvent<TraceEvent>) => {
      pushClientEvent(e.detail);
      const bus = getClientBus();
      if (!bus) return;

      // Re-render on every new event
      setRuns((prev) => buildRunsList(bus.events));
    };

    const clearHandler = () => {
      setRuns([]);
      // We don't have a way to reset the physical events inside the global bus easily here, 
      // but new runs generate new buses via run_id anyway, so just clearing UI is fine!
    };

    window.addEventListener("alfred:trace" as string, handler as EventListener);
    window.addEventListener("alfred:clear-runs", clearHandler);
    return () => {
      window.removeEventListener("alfred:trace" as string, handler as EventListener);
      window.removeEventListener("alfred:clear-runs", clearHandler);
    };
  }, []);

  // Auto-scroll runs area to bottom when a new run is added
  useEffect(() => {
    runsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [runs.length]);

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: "var(--bg-secondary)" }}
    >
      {/* ----------------------------------------------------------------
          Header
      ----------------------------------------------------------------- */}
      <header
        className="shrink-0 px-4 py-3 border-b flex items-center justify-between gap-3"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2">
          <AlfredAvatar state="idle" size={24} />
          <span
            className="font-mono text-xs font-semibold tracking-wide"
            style={{ color: "var(--text-secondary)" }}
          >
            Agent Mind
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            id="mind-panel-run-counter"
            className="font-mono text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {runs.length} {runs.length === 1 ? "run" : "runs"}
          </span>

          <button
            id="mind-panel-tools-toggle"
            onClick={() => setToolsOpen((o) => !o)}
            className="font-mono text-xs px-2 py-1 rounded border transition-colors duration-150"
            style={{
              color:           toolsOpen ? "var(--accent-copper)" : "var(--text-secondary)",
              borderColor:     toolsOpen ? "var(--accent-copper)" : "var(--border-subtle)",
              backgroundColor: "transparent",
            }}
            aria-label="Toggle available tools"
            aria-expanded={toolsOpen}
          >
            Tools
          </button>

          <button
            id="mind-panel-export-btn"
            onClick={() => exportTraces(runs)}
            className="font-mono text-xs px-2 py-1 rounded border transition-colors duration-150"
            style={{
              color:           runs.length > 0 ? "var(--text-secondary)" : "var(--text-muted)",
              borderColor:     "var(--border-subtle)",
              backgroundColor: "transparent",
            }}
            aria-label="Export trace events as JSON"
            disabled={runs.length === 0}
          >
            Export
          </button>
        </div>
      </header>

      {/* ----------------------------------------------------------------
          Tools section — collapsible
      ----------------------------------------------------------------- */}
      {toolsOpen && <ToolsSection />}

      {/* ----------------------------------------------------------------
          Runs area
      ----------------------------------------------------------------- */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3"
        id="mind-panel-runs-area"
        aria-label="Decision runs"
        aria-live="polite"
      >
        {runs.length === 0 ? (
          <EmptyState />
        ) : (
          runs.map((run) => <RunCard key={run.run_id} run={run} />)
        )}
        <div ref={runsEndRef} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Run card
// ---------------------------------------------------------------------------

function RunCard({ run }: { run: RunData }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-tertiary)" }}
    >
      {/* Run header */}
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-left transition-colors duration-150"
        onClick={() => setCollapsed((c) => !c)}
        style={{ backgroundColor: "transparent" }}
        aria-expanded={!collapsed}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="font-mono text-xs truncate"
            style={{ color: "var(--text-muted)" }}
          >
            {run.run_id.slice(0, 8)}
          </span>
          {run.verdict && (
            <DecisionBadge verdict={run.verdict} size="sm" />
          )}
          {run.done ? null : (
            <span className="font-mono text-xs" style={{ color: "var(--accent-copper)", animation: "caret-blink 1.1s step-end infinite" }}>
              ...
            </span>
          )}
        </div>
        <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
          {collapsed ? "+" : "–"}
        </span>
      </button>

      {/* Phase sections */}
      {!collapsed && (
        <div className="flex flex-col border-t" style={{ borderColor: "var(--border-subtle)" }}>
          {(["P0", "P1", "P2", "P3", "P4", "P5"] as Phase[]).map((phase) => {
            const section = run.sections[phase];
            if (!section) return null;
            return (
              <PhaseRow
                key={phase}
                phase={phase}
                section={section}
                run={run}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase row
// ---------------------------------------------------------------------------

function PhaseRow({
  phase,
  section,
  run,
}: {
  phase:   Phase;
  section: PhaseSection;
  run:     RunData;
}) {
  const [open, setOpen] = useState(phase === "P3");

  const borderColor = section.failed
    ? "var(--decision-refuse)"
    : "var(--border-subtle)";

  return (
    <div
      className="border-l-2"
      style={{ borderLeftColor: borderColor }}
    >
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left"
        onClick={() => setOpen((o) => !o)}
        style={{ backgroundColor: "transparent" }}
      >
        <span
          className="font-mono text-xs font-medium w-5"
          style={{ color: section.failed ? "var(--decision-refuse)" : "var(--accent-copper)" }}
        >
          {phase}
        </span>
        <span
          className="font-mono text-xs"
          style={{ color: "var(--text-secondary)" }}
        >
          {PHASE_LABELS[phase]}
        </span>
        {section.failed && (
          <span className="font-mono text-xs ml-auto" style={{ color: "var(--decision-refuse)" }}>
            failed
          </span>
        )}
        {/* P3 shortcut: verdict + risk */}
        {phase === "P3" && run.verdict && (
          <span className="ml-auto flex items-center gap-1.5">
            <DecisionBadge verdict={run.verdict} size="sm" />
            {run.risk !== undefined && (
              <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                {(run.risk * 100).toFixed(0)}%
              </span>
            )}
          </span>
        )}
      </button>

      {open && (
        <div
          className="px-3 pb-2 flex flex-col gap-1"
        >
          {phase === "P3" && run.rationale && (
            <p className="font-sans text-xs italic" style={{ color: "var(--text-secondary)" }}>
              {run.rationale}
            </p>
          )}
          {phase === "P2" && run.tokens && (
            <pre
              className="font-mono text-xs p-2 rounded overflow-x-auto"
              style={{
                backgroundColor: "var(--bg-input)",
                color:           "var(--text-secondary)",
                maxHeight:       "120px",
              }}
            >
              {run.tokens}
            </pre>
          )}
          {section.events.map((e, i) => (
            <EventRow key={i} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual event row
// ---------------------------------------------------------------------------

function EventRow({ event }: { event: TraceEvent }) {
  return (
    <div
      className="flex items-start gap-2 py-0.5"
    >
      <span
        className="font-mono text-xs shrink-0"
        style={{ color: "var(--text-muted)", minWidth: "5rem" }}
      >
        {event.kind}
      </span>
      {event.payload !== undefined && event.payload !== null && (
        <span
          className="font-mono text-xs truncate"
          style={{ color: "var(--text-secondary)" }}
          title={typeof event.payload === "object" ? JSON.stringify(event.payload) : String(event.payload)}
        >
          {renderPayload(event.payload)}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tools section
// ---------------------------------------------------------------------------

function ToolsSection() {
  const tools = Object.values(
    // Dynamic import avoids tree-shaking issues
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("@/lib/tools/registry").TOOL_REGISTRY as Record<string, { name: string; description: string; reversibility: string; default_verdict_hint: string }>
  );

  return (
    <div
      className="shrink-0 border-b overflow-y-auto"
      style={{ borderColor: "var(--border-subtle)", maxHeight: "180px" }}
      aria-label="Available tools"
    >
      {tools.map((t) => (
        <div
          key={t.name}
          className="flex items-start gap-3 px-4 py-2 border-b last:border-b-0"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <span className="font-mono text-xs shrink-0 mt-0.5" style={{ color: "var(--accent-copper)", minWidth: "9rem" }}>
            {t.name}
          </span>
          <span className="font-sans text-xs" style={{ color: "var(--text-secondary)" }}>
            {t.description}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="w-8 h-px" style={{ backgroundColor: "var(--border-subtle)" }} />
      <p className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
        Decision runs appear here.
      </p>
      <p className="font-sans text-xs leading-relaxed max-w-48" style={{ color: "var(--text-muted)" }}>
        Send a message to alfred_ to watch the pipeline execute phase by phase.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRunsList(events: TraceEvent[]): RunData[] {
  const runsMap = new Map<string, RunData>();

  for (const e of events) {
    if (!runsMap.has(e.run_id)) {
      runsMap.set(e.run_id, {
        run_id:   e.run_id,
        sections: {},
        tokens:   "",
        done:     false,
      });
    }
    const run = runsMap.get(e.run_id)!;

    if (!run.sections[e.phase]) {
      run.sections[e.phase] = { phase: e.phase, events: [], failed: false };
    }
    run.sections[e.phase]!.events.push(e);

    if (e.kind.endsWith(".failed")) {
      run.sections[e.phase]!.failed = true;
    }
    if (e.kind === "decide.verdict") {
      const p = e.payload as { verdict?: Verdict; risk_score?: number; rationale?: string };
      if (p.verdict) run.verdict = p.verdict;
      if (p.risk_score !== undefined) run.risk = p.risk_score;
      if (p.rationale) run.rationale = p.rationale;
    }
    if (e.kind === "render.token") {
      const p = e.payload as { token?: string };
      run.tokens += p.token ?? "";
    }
    if (e.kind === "render.done") {
      run.done = true;
    }
  }

  return Array.from(runsMap.values());
}

function renderPayload(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (typeof payload !== "object" || payload === null) return String(payload);
  const keys = Object.keys(payload as object);
  if (keys.length === 0) return "";
  if (keys.length <= 2) return JSON.stringify(payload);
  return `{ ${keys.slice(0, 2).join(", ")} ... }`;
}

function exportTraces(runs: RunData[]): void {
  try {
    const all = runs.flatMap((r) =>
      Object.values(r.sections).flatMap((s) => s?.events ?? [])
    );
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `alfred_traces_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // Non-critical — user can retry
  }
}
