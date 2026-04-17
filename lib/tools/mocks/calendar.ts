/**
 * Calendar mock handlers.
 * Tools covered: read_calendar, create_event, reschedule_event, cancel_event.
 *
 * Every handler is wrapped in try/catch per DESIGN.md §2.2.
 * Canonical source: UI-UX-DESIGN.md §7
 */

import type { ToolResult } from "@/types/tool";

// ---------------------------------------------------------------------------
// read_calendar
// ---------------------------------------------------------------------------

export async function readCalendar(
  params: Record<string, unknown>
): Promise<ToolResult> {
  const start = Date.now();
  try {
    const date = (params.date as string | undefined) ?? "tomorrow";

    return {
      tool:       "read_calendar",
      success:    true,
      simulated:  true,
      latency_ms: Date.now() - start,
      data: {
        date,
        events: MOCK_CALENDAR_EVENTS,
      },
    };
  } catch (err) {
    return errorResult("read_calendar", start, err);
  }
}

// ---------------------------------------------------------------------------
// create_event
// ---------------------------------------------------------------------------

export async function createEvent(
  params: Record<string, unknown>
): Promise<ToolResult> {
  const start = Date.now();
  try {
    return {
      tool:       "create_event",
      success:    true,
      simulated:  true,
      latency_ms: Date.now() - start,
      data: {
        event_id:   `evt-${Math.random().toString(36).slice(2, 10)}`,
        title:      params.title,
        start:      params.start,
        end:        params.end,
        attendees:  params.attendees,
        created_at: new Date().toISOString(),
        invites_sent: true,
      },
    };
  } catch (err) {
    return errorResult("create_event", start, err);
  }
}

// ---------------------------------------------------------------------------
// reschedule_event
// ---------------------------------------------------------------------------

export async function rescheduleEvent(
  params: Record<string, unknown>
): Promise<ToolResult> {
  const start = Date.now();
  try {
    return {
      tool:       "reschedule_event",
      success:    true,
      simulated:  true,
      latency_ms: Date.now() - start,
      data: {
        event_id:         params.event_id,
        new_start:        params.new_start,
        new_end:          params.new_end,
        rescheduled_at:   new Date().toISOString(),
        attendees_notified: true,
      },
    };
  } catch (err) {
    return errorResult("reschedule_event", start, err);
  }
}

// ---------------------------------------------------------------------------
// cancel_event
// ---------------------------------------------------------------------------

export async function cancelEvent(
  params: Record<string, unknown>
): Promise<ToolResult> {
  const start = Date.now();
  try {
    return {
      tool:       "cancel_event",
      success:    true,
      simulated:  true,
      latency_ms: Date.now() - start,
      data: {
        event_id:         params.event_id,
        cancelled_at:     new Date().toISOString(),
        attendees_notified: true,
      },
    };
  } catch (err) {
    return errorResult("cancel_event", start, err);
  }
}

// ---------------------------------------------------------------------------
// Shared mock data — matches preloaded.json scenario_01 fixture
// ---------------------------------------------------------------------------

const MOCK_CALENDAR_EVENTS = [
  {
    event_id:  "cal-001",
    title:     "Daily Standup",
    start:     "2026-04-18T09:00:00",
    end:       "2026-04-18T09:15:00",
    attendees: ["team-engineering@company.com"],
    location:  "Zoom",
  },
  {
    event_id:  "cal-002",
    title:     "1:1 with Sarah",
    start:     "2026-04-18T11:00:00",
    end:       "2026-04-18T11:30:00",
    attendees: ["sarah.chen@company.com"],
    location:  "Room 4B",
  },
  {
    event_id:  "cal-003",
    title:     "Client Call — Acme Corp",
    start:     "2026-04-18T14:00:00",
    end:       "2026-04-18T15:00:00",
    attendees: ["wally@acmecorp.com", "sarah.chen@company.com"],
    location:  "Zoom",
  },
  {
    event_id:  "cal-004",
    title:     "Design Review with Frontend Team",
    start:     "2026-04-18T15:00:00",
    end:       "2026-04-18T15:45:00",
    attendees: ["mike.chen@company.com", "priya.shah@company.com"],
    location:  "Room 2A",
  },
  {
    event_id:  "cal-005",
    title:     "Vendor Check-in — CloudScale",
    start:     "2026-04-18T15:00:00",
    end:       "2026-04-18T15:30:00",
    attendees: ["rep@cloudscale.io"],
    location:  "Zoom",
  },
];

function errorResult(tool: string, start: number, err: unknown): ToolResult {
  return {
    tool,
    success:    false,
    simulated:  true,
    latency_ms: Date.now() - start,
    data:       { error: err instanceof Error ? err.message : String(err) },
  };
}
