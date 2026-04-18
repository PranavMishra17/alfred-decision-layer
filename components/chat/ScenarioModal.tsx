"use client";

import { useState } from "react";

export interface Scenario {
  id: string;
  title: string;
  category: string;
  description: string;
  context_type: string;
  predefined_instruction: string;
  user_message: string;
  mock_context: Record<string, unknown>;
  conversation_history?: { role: string; content: string; timestamp?: string }[];
  pre_seeded_obligations?: Record<string, unknown>[];
}

interface CalendarEvent {
  time: string;
  title: string;
  attendees?: string[];
  location: string;
}

interface SlotDay {
  day: string;
  slots: string[];
}

interface EmailDraft {
  to: string;
  subject: string;
  body: string;
}

interface EmailItem {
  from: string;
  subject: string;
  date: string;
  sensitivity?: string;
}

interface ScenarioModalProps {
  scenario: Scenario;
  onClose: () => void;
  onSend: (instruction: string) => void;
}

export function ScenarioModal({ scenario, onClose, onSend }: ScenarioModalProps) {
  const [instruction, setInstruction] = useState(scenario.user_message);
  const [showModify, setShowModify] = useState(false);

  const getBorderColor = () => {
    switch (scenario.category) {
      case "easy": return "border-[#8ABFA7]"; // sage equivalent
      case "ambiguous": return "border-[#C8B07A]"; // confirm equivalent
      case "adversarial": return "border-[#C28A8A]"; // refuse equivalent
      case "failure": return "border-[var(--text-muted)]";
      default: return "border-[var(--border-subtle)]";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className={`relative bg-[var(--bg-secondary)] border-2 ${getBorderColor()} rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] animate-scale-in`}>
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] rounded-t-xl">
          <div className="flex items-center gap-3">
            <h2 className="font-mono text-base font-bold text-white">{scenario.title}</h2>
            <span className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded border ${getBorderColor()}`}>
              {scenario.category}
            </span>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white font-mono text-xl">
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col overflow-y-auto p-5 gap-6">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs text-[var(--accent-copper)]">CONTEXT TYPE</span>
            <span className="font-sans text-sm text-[var(--text-secondary)] capitalize">
              {scenario.context_type.replace(/_/g, " ")}
            </span>
            <p className="font-sans text-sm italic text-[var(--text-muted)]">{scenario.description}</p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs text-[var(--accent-copper)]">MOCK CONTEXT PROVIDED</span>
            <MockContextSlate scenario={scenario} />
          </div>

          <div className="flex flex-col gap-3 p-4 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg">
            <span className="font-mono text-xs text-[var(--text-primary)]">PREDEFINED INSTRUCTION</span>
            {showModify ? (
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--accent-copper)] rounded p-2 text-sm text-white font-sans focus:outline-none"
                rows={3}
              />
            ) : (
              <p className="font-sans text-sm text-white">{instruction}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] rounded-b-xl shrink-0">
          <button
            onClick={() => setShowModify(!showModify)}
            className="font-mono text-xs px-3 py-1.5 rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-input)]"
          >
            {showModify ? "Lock Instruction" : "+ Modify Instruction"}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="font-mono text-xs text-[var(--text-muted)] hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onSend(instruction);
                onClose();
              }}
              className="font-mono text-xs px-4 py-2 rounded bg-[var(--accent-copper)] text-[var(--bg-primary)] font-bold hover:bg-[#D49E72] transition-colors"
            >
              Send to alfred_
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// UI Slates for specific context types
// ---------------------------------------------------------------------------

function MockContextSlate({ scenario }: { scenario: Scenario }) {
  const ctx = scenario.mock_context;
  if (!ctx) return null;

  try {
    if (ctx.calendar_events) return <CalendarSlate events={ctx.calendar_events as unknown as CalendarEvent[]} />;
    if (ctx.calendar_events_today && ctx.available_slots_this_week) {
       return (
         <div className="flex flex-col gap-4">
           <h4 className="font-mono text-[10px] uppercase text-[var(--text-secondary)]">Today&apos;s Schedule</h4>
           <CalendarSlate events={ctx.calendar_events_today as unknown as CalendarEvent[]} />
           <h4 className="font-mono text-[10px] uppercase text-[var(--text-secondary)] mt-2">Available Slots</h4>
           <div className="flex flex-wrap gap-2">
             {(ctx.available_slots_this_week as unknown as SlotDay[]).map((d, i: number) => (
               <div key={i} className="flex flex-col bg-[var(--bg-input)] p-2 rounded border border-[var(--border-subtle)] min-w-[100px]">
                 <span className="text-xs font-semibold text-[var(--accent-copper)] mb-1">{d.day}</span>
                 {d.slots.map((s: string) => <span key={s} className="text-xs font-mono text-[var(--text-secondary)]">{s}</span>)}
               </div>
             ))}
           </div>
         </div>
       );
    }
    if (ctx.draft) return <EmailDraftSlate draft={ctx.draft as unknown as EmailDraft} />;
    if (ctx.hr_emails) return <EmailListSlate emails={ctx.hr_emails as unknown as EmailItem[]} />;
    if (ctx.inbox_stats) return <MetricsSlate stats={ctx.inbox_stats as Record<string, unknown>} />;
  } catch {
    // fallback gracefully
  }

  // Fallback to raw JSON if no matched slate
  return (
    <pre className="p-3 bg-[var(--bg-input)] rounded-md font-mono text-[10px] text-[var(--text-muted)] overflow-x-auto">
      {JSON.stringify(ctx, null, 2)}
    </pre>
  );
}

function CalendarSlate({ events }: { events: CalendarEvent[] }) {
  return (
    <div className="flex flex-col gap-2 rounded-md bg-[var(--bg-input)] p-3 border border-[var(--border-subtle)]">
      {events.map((e, i) => (
        <div key={i} className="flex gap-4 p-2 rounded bg-[var(--bg-tertiary)] border-l-2 border-[var(--accent-olive)] items-center">
          <div className="text-xs font-mono text-[var(--text-muted)] w-28 shrink-0">{e.time}</div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm text-white font-sans truncate">{e.title}</span>
            <span className="text-xs text-[var(--text-secondary)] font-sans truncate">{e.attendees?.join(", ")}</span>
            <span className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">{e.location}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmailDraftSlate({ draft }: { draft: EmailDraft }) {
  return (
    <div className="flex flex-col rounded-md bg-white text-black p-4 border border-[var(--border-subtle)] shadow-inner font-sans gap-3">
      <div className="flex border-b border-gray-200 pb-2">
        <span className="text-sm font-bold text-gray-500 w-20">To:</span>
        <span className="text-sm text-gray-900">{draft.to}</span>
      </div>
      <div className="flex border-b border-gray-200 pb-2">
        <span className="text-sm font-bold text-gray-500 w-20">Subject:</span>
        <span className="text-sm text-gray-900 font-semibold">{draft.subject}</span>
      </div>
      <div className="pt-2">
        <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">{draft.body}</pre>
      </div>
    </div>
  );
}

function EmailListSlate({ emails }: { emails: EmailItem[] }) {
  return (
    <div className="flex flex-col rounded-md bg-[var(--bg-input)] border border-[var(--border-subtle)] overflow-hidden">
      {emails.map((e, i) => (
        <div key={i} className="flex flex-col p-3 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-tertiary)] transition-colors">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-semibold text-white truncate pr-4">{e.from}</span>
            <span className="text-[10px] font-mono text-[var(--text-muted)] whitespace-nowrap">{e.date}</span>
          </div>
          <span className="text-sm text-[var(--text-secondary)] truncate">{e.subject}</span>
          {e.sensitivity && (
            <span className="mt-2 w-max text-[10px] uppercase px-1.5 py-0.5 rounded bg-[var(--decision-refuse-bg)] text-[var(--decision-refuse)] border border-[var(--decision-refuse)] font-bold">
              {e.sensitivity}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function MetricsSlate({ stats }: { stats: Record<string, unknown> }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Object.entries(stats).map(([k, v]) => (
        <div key={k} className="flex flex-col p-4 rounded-md bg-[var(--bg-input)] border border-[var(--border-subtle)]">
          <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase mb-2 break-words">{k.replace(/_/g, " ")}</span>
          <span className="font-mono text-2xl text-[var(--accent-copper)] font-bold">{String(v)}</span>
        </div>
      ))}
    </div>
  );
}
