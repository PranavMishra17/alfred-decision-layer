"use client";

import { useState, useEffect } from "react";
import type { Decision, ClarificationSpec, Verdict } from "@/types/decision";
import { DecisionBadge } from "@/components/shared/DecisionBadge";

interface OutcomeProps {
  decision?: Decision;
  action?: Record<string, unknown>; // the raw action
  clarification?: ClarificationSpec; 
}

export function OutcomeCard({ decision, action, clarification }: OutcomeProps) {
  if (!decision && clarification) {
    return <ClarifyCard clarification={clarification} />;
  }
  
  if (!decision) return null;

  switch (decision.verdict) {
    case "SILENT":
    case "SILENT_DUPE":
      return <SilentCard verdict={decision.verdict} action={action || {}} />;
    case "NOTIFY":
      return <NotifyCard action={action || {}} />;
    case "CONFIRM":
      return <ConfirmCard decision={decision} />;
    case "REFUSE":
      return <RefuseCard decision={decision} />;
    case "CLARIFY":
      return clarification ? <ClarifyCard clarification={clarification} /> : null;
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

function ConfirmCard({ decision }: { decision: Decision }) {
  const [resolved, setResolved] = useState<"confirmed" | "cancelled" | null>(null);
  
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
          <button onClick={() => setResolved("confirmed")} className="px-3 py-1 rounded bg-[var(--decision-confirm)] text-[var(--bg-primary)] font-mono text-xs">Confirm</button>
          <button onClick={() => setResolved("cancelled")} className="px-3 py-1 rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] font-mono text-xs hover:bg-[var(--bg-input)]">Cancel</button>
        </div>
      ) : (
        <span className="font-mono text-xs text-[var(--text-muted)] transition-opacity duration-300">
          {resolved === "confirmed" ? "Action Confirmed" : "Action Cancelled"}
        </span>
      )}
    </div>
  );
}

function ClarifyCard({ clarification }: { clarification: ClarificationSpec }) {
  return (
    <div className="mt-2 p-3 rounded-md border border-[var(--decision-clarify)] bg-[var(--bg-tertiary)] flex flex-col gap-3">
      <span className="font-mono text-xs text-[var(--decision-clarify)]">CLARIFICATION NEEDED</span>
      <span className="font-sans text-sm text-[var(--text-primary)]">{clarification.question}</span>
      {clarification.style === "mcq" && clarification.options && (
        <div className="flex flex-col gap-2">
          {clarification.options.map(o => (
            <label key={o.id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-[var(--bg-input)]">
              <input type="radio" name={clarification.action_id} value={o.id} />
              <span className="font-sans text-sm text-[var(--text-secondary)]">{o.label}</span>
            </label>
          ))}
        </div>
      )}
      <button className="self-start px-3 py-1 rounded bg-[var(--decision-clarify)] text-[var(--bg-primary)] font-mono text-xs">Submit</button>
    </div>
  );
}

function RefuseCard({ decision }: { decision: Decision }) {
  return (
    <div className="mt-2 p-3 rounded-md border border-[var(--decision-refuse)] bg-[var(--decision-refuse)]/[0.05] flex flex-col gap-1">
      <span className="font-mono text-xs text-[var(--decision-refuse)]">REFUSED</span>
      <span className="font-sans text-sm text-[var(--text-primary)]">{decision.rationale}</span>
    </div>
  );
}
