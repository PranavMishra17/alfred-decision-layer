"use client";

import { useState, useEffect } from "react";
import type { Decision, ClarificationSpec, Verdict } from "@/types/decision";
import { DecisionBadge } from "@/components/shared/DecisionBadge";

interface OutcomeProps {
  decision?: Decision;
  action?: Record<string, unknown>; // the raw action
  clarification?: ClarificationSpec;
  onConfirm?: (overriddenObligationIds: string[]) => void;
  onClarify?: (answer: string) => void;
}

export function OutcomeCard({ decision, action, clarification, onConfirm, onClarify }: OutcomeProps) {
  if (!decision && clarification) {
    return <ClarifyCard clarification={clarification} onSubmit={onClarify} />;
  }

  if (!decision) return null;

  switch (decision.verdict) {
    case "SILENT":
    case "SILENT_DUPE":
      return <SilentCard verdict={decision.verdict} action={action || {}} />;
    case "NOTIFY":
      return <NotifyCard action={action || {}} />;
    case "CONFIRM":
      return <ConfirmCard decision={decision} action={action} onConfirm={onConfirm} />;
    case "REFUSE":
      return <RefuseCard decision={decision} />;
    case "CLARIFY":
      return clarification ? <ClarifyCard clarification={clarification} onSubmit={onClarify} /> : null;
    default:
      return null;
  }
}

function SilentCard({ verdict, action }: { verdict: string; action: Record<string, unknown> }) {
  const isDupe = verdict === "SILENT_DUPE";
  return (
    <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded bg-black/10 border border-transparent">
      <DecisionBadge verdict={verdict as Verdict} size="sm" />
      <span className="font-sans text-sm text-gray-400">
        {isDupe ? "Already handled — see previous turn." : `alfred_ acted silently via ${action?.tool || "tool_use"}.`}
      </span>
    </div>
  );
}

function NotifyCard({ action }: { action: Record<string, unknown> }) {
  const [timeLeft, setTimeLeft] = useState(10);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (cancelled || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((x) => x - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft, cancelled]);

  const progress = (timeLeft / 10) * 100;

  return (
    <div className="mt-2 p-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] flex justify-between items-center">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-xs text-[var(--accent-copper)]">ACTION</span>
        <span className="font-sans text-sm text-[var(--text-primary)]">
          {cancelled ? "Action cancelled." : `Executing ${action?.tool || "action"}...`}
        </span>
      </div>
      
      {!cancelled && timeLeft > 0 ? (
        <div className="flex items-center gap-3">
          <div className="relative w-6 h-6">
            <svg viewBox="0 0 36 36" className="w-6 h-6 -rotate-90">
              <path
                className="text-[var(--border-subtle)]"
                d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="currentColor" strokeWidth="3"
              />
              <path
                className="text-[var(--accent-copper)] transition-all duration-1000 linear"
                strokeDasharray={`${progress}, 100`}
                d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="currentColor" strokeWidth="3"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-[var(--text-secondary)]">{timeLeft}</span>
          </div>
          <button
            onClick={() => setCancelled(true)}
            className="px-3 py-1 text-xs font-mono rounded border border-[var(--text-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-input)]"
          >
            Undo
          </button>
        </div>
      ) : (
        <span className="font-mono text-xs text-[var(--text-muted)]">
          {cancelled ? "Cancelled" : "Done"}
        </span>
      )}
    </div>
  );
}

function ConfirmCard({ decision, action, onConfirm }: {
  decision: Decision;
  action?: Record<string, unknown>;
  onConfirm?: (overriddenObligationIds: string[]) => void;
}) {
  const [resolved, setResolved] = useState<"confirmed" | "cancelled" | null>(null);

  const handleConfirm = () => {
    setResolved("confirmed");
    const conflictIds = (action?.conflicts_with as string[]) ?? [];
    onConfirm?.(conflictIds);
  };

  return (
    <div className="mt-2 p-3 rounded-md border border-[var(--decision-confirm)] bg-[var(--bg-tertiary)] flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-xs text-[var(--decision-confirm)]">CONFIRMATION REQUIRED</span>
        <span className="font-sans text-sm text-[var(--text-primary)]">
          {decision.rationale}
        </span>
      </div>

      {!resolved ? (
        <div className="flex items-center gap-2">
          <button
            onClick={handleConfirm}
            className="px-3 py-1 rounded bg-[var(--decision-confirm)] text-[var(--bg-primary)] font-mono text-xs"
          >
            Confirm
          </button>
          <button
            onClick={() => setResolved("cancelled")}
            className="px-3 py-1 rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] font-mono text-xs hover:bg-[var(--bg-input)]"
          >
            Cancel
          </button>
        </div>
      ) : (
        <span className="font-mono text-xs text-[var(--text-muted)] transition-opacity duration-300">
          {resolved === "confirmed" ? "Confirmed — re-running..." : "Action Cancelled"}
        </span>
      )}
    </div>
  );
}

function ClarifyCard({ clarification, onSubmit }: {
  clarification: ClarificationSpec;
  onSubmit?: (answer: string) => void;
}) {
  const [selected, setSelected] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!selected.trim()) return;
    setSubmitted(true);
    onSubmit?.(selected);
  };

  return (
    <div className="mt-2 p-3 rounded-md border border-[var(--decision-clarify)] bg-[var(--bg-tertiary)] flex flex-col gap-3">
      <span className="font-mono text-xs text-[var(--decision-clarify)]">CLARIFICATION NEEDED</span>
      <span className="font-sans text-sm text-[var(--text-primary)]">{clarification.question}</span>

      {!submitted ? (
        <>
          {clarification.style === "mcq" && clarification.options && (
            <div className="flex flex-col gap-2">
              {clarification.options.map(o => (
                <label key={o.id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-[var(--bg-input)]">
                  <input
                    type="radio"
                    name={clarification.action_id || "clarify"}
                    value={o.label}
                    onChange={(e) => setSelected(e.target.value)}
                  />
                  <span className="font-sans text-sm text-[var(--text-secondary)]">{o.label}</span>
                </label>
              ))}
            </div>
          )}
          {(clarification.style === "input_fields" || clarification.style === "mixed") && clarification.fields && (
            <div className="flex flex-col gap-2">
              {clarification.fields.map(f => (
                <div key={f.key} className="flex flex-col gap-1">
                  <label className="font-mono text-xs text-[var(--text-muted)]">{f.label}</label>
                  <input
                    type={f.type === "datetime" ? "text" : f.type}
                    defaultValue={f.default ?? ""}
                    className="bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded px-2 py-1 text-sm text-white font-sans focus:outline-none focus:border-[var(--decision-clarify)]"
                    onChange={(e) => setSelected(e.target.value)}
                    placeholder={f.label}
                  />
                </div>
              ))}
            </div>
          )}
          {clarification.allow_custom && (clarification.style === "input_fields" || !clarification.options) && (
            <textarea
              className="bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded px-2 py-1 text-sm text-white font-sans focus:outline-none focus:border-[var(--decision-clarify)] resize-none"
              rows={2}
              placeholder="Type your answer..."
              onChange={(e) => setSelected(e.target.value)}
            />
          )}
          <button
            onClick={handleSubmit}
            disabled={!selected.trim()}
            className="self-start px-3 py-1 rounded font-mono text-xs disabled:opacity-40"
            style={{
              backgroundColor: selected.trim() ? "var(--decision-clarify)" : "transparent",
              color: selected.trim() ? "var(--bg-primary)" : "var(--text-muted)",
              border: selected.trim() ? "none" : "1px solid var(--border-subtle)",
            }}
          >
            Submit
          </button>
        </>
      ) : (
        <span className="font-mono text-xs text-[var(--text-muted)]">Submitted — re-running...</span>
      )}
    </div>
  );
}

function RefuseCard({ decision }: { decision: Decision }) {
  const showFollowUp = decision.gate_rule === "policy_violation" || decision.gate_rule === "already_executed";

  return (
    <div className="mt-2 p-3 rounded-md border border-[var(--decision-refuse)] bg-[var(--decision-refuse)]/[0.05] flex flex-col gap-2">
      <span className="font-mono text-xs text-[var(--decision-refuse)]">REFUSED</span>
      <span className="font-sans text-sm text-[var(--text-primary)]">{decision.rationale}</span>
      {showFollowUp && (
        <span className="font-sans text-xs text-[var(--text-muted)] border-t border-[var(--border-subtle)] pt-2 mt-1">
          I can help you identify and review those items first before taking action.
        </span>
      )}
    </div>
  );
}
