"use client";

import { Scenario } from "./ScenarioModal";

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

export function ScenarioSlate({ scenario }: { scenario: Scenario }) {
  const ctx = scenario.mock_context;
  if (!ctx) return null;

  try {
    if (ctx.meeting_invite) {
      return (
        <MeetingInviteSlate
          invite={ctx.meeting_invite as unknown as MeetingInvite}
          conflict={ctx.conflict as unknown as MeetingConflict | undefined}
        />
      );
    }
    if (ctx.inbox_preview) {
      return <EmailInboxPreviewSlate preview={ctx.inbox_preview as unknown as InboxPreview} />;
    }
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
            <span className="text-[10px] font-mono text-[var(--decision-refuse)] mt-1 uppercase tracking-tight">{e.sensitivity}</span>
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
        <div key={k} className="flex flex-col p-3 rounded-md bg-[var(--bg-input)] border border-[var(--border-subtle)]">
          <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">{k.replace(/_/g, " ")}</span>
          <span className="text-lg font-bold text-white tabular-nums">{String(v)}</span>
        </div>
      ))}
    </div>
  );
}

interface MeetingInvite {
  from: string;
  title: string;
  date: string;
  time: string;
  status: string;
}

interface MeetingConflict {
  title: string;
  time: string;
  date: string;
}

function MeetingInviteSlate({ invite, conflict }: { invite: MeetingInvite; conflict?: MeetingConflict }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col rounded-md bg-[var(--bg-input)] border border-[var(--border-subtle)] p-3 gap-2">
        <div className="flex justify-between items-center">
          <span className="font-mono text-[10px] uppercase text-[var(--accent-copper)]">Meeting Invite</span>
          <span className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded ${
            invite.status === "pending"
              ? "border border-[var(--decision-confirm)] text-[var(--decision-confirm)]"
              : "border border-[var(--border-subtle)] text-[var(--text-muted)]"
          }`}>{invite.status}</span>
        </div>
        <span className="font-sans text-sm font-semibold text-white">{invite.title}</span>
        <span className="font-mono text-xs text-[var(--text-secondary)]">{invite.date} · {invite.time}</span>
        <span className="font-mono text-xs text-[var(--text-muted)]">From: {invite.from}</span>
      </div>
      {conflict && (
        <div className="flex flex-col rounded-md bg-[var(--bg-input)] border border-[var(--decision-refuse)] p-3 gap-1">
          <span className="font-mono text-[10px] uppercase text-[var(--decision-refuse)]">Conflict</span>
          <span className="font-sans text-sm text-white">{conflict.title}</span>
          <span className="font-mono text-xs text-[var(--text-muted)]">{conflict.date} · {conflict.time}</span>
        </div>
      )}
    </div>
  );
}

interface InboxPreview {
  from: string;
  subject: string;
  date: string;
  body: string;
}

function EmailInboxPreviewSlate({ preview }: { preview: InboxPreview }) {
  return (
    <div className="flex flex-col rounded-md bg-white text-black p-4 border border-[var(--border-subtle)] shadow-inner font-sans gap-3">
      <div className="flex border-b border-gray-200 pb-2">
        <span className="text-sm font-bold text-gray-500 w-20">From:</span>
        <span className="text-sm text-gray-900">{preview.from}</span>
      </div>
      <div className="flex border-b border-gray-200 pb-2">
        <span className="text-sm font-bold text-gray-500 w-20">Subject:</span>
        <span className="text-sm text-gray-900 font-semibold">{preview.subject}</span>
      </div>
      <div className="flex border-b border-gray-200 pb-2">
        <span className="text-sm font-bold text-gray-500 w-20">Date:</span>
        <span className="text-sm text-gray-900">{preview.date}</span>
      </div>
      <div className="pt-2">
        <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">{preview.body}</pre>
      </div>
    </div>
  );
}
