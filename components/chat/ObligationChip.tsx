"use client";

import { useState } from "react";
import { useStore } from "@/state/store";

export function ObligationChip() {
  const open_obligations = useStore((s) => s.open_obligations);
  const resolveObligations = useStore((s) => s.resolveObligations);
  const [open, setOpen] = useState(false);

  if (open_obligations.length === 0) return null;

  return (
    <div className="relative mb-2 shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1 rounded-full border border-[var(--decision-confirm)] text-[var(--decision-confirm)] text-[10px] uppercase font-mono font-bold hover:bg-[var(--decision-confirm)]/10"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--decision-confirm)] animate-pulse" />
        {open_obligations.length} Open Obligation{open_obligations.length > 1 ? "s" : ""}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-72 max-h-64 overflow-y-auto bg-[var(--bg-tertiary)] border border-[var(--decision-confirm)] rounded-md shadow-lg p-2 flex flex-col gap-2 z-50">
          <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2 mb-1">
            <span className="font-mono text-[10px] text-[var(--text-muted)] tracking-wider uppercase">Active Constraints</span>
            <button onClick={() => setOpen(false)} className="text-[var(--text-muted)] hover:text-white font-mono text-xs">×</button>
          </div>
          {open_obligations.map((obl) => (
            <div key={obl.id} className="flex flex-col gap-1 p-2 bg-[var(--bg-primary)] rounded border border-[var(--border-subtle)]">
              <span className="font-mono text-[10px] text-[var(--accent-copper)]">{obl.action_ref}</span>
              <span className="font-sans text-xs text-[var(--text-secondary)]">{obl.condition}</span>
              <button
                onClick={() => resolveObligations([obl.id], "manual_dismiss")}
                className="self-end mt-1 font-mono text-[9px] text-[var(--text-muted)] hover:text-[var(--decision-confirm)] uppercase"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
