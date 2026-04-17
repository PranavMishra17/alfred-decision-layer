/**
 * Tasks mock handlers.
 * Tools covered: set_reminder, manage_tasks.
 *
 * Every handler is wrapped in try/catch per DESIGN.md §2.2.
 * Canonical source: UI-UX-DESIGN.md §7
 */

import type { ToolResult } from "@/types/tool";

// ---------------------------------------------------------------------------
// set_reminder
// ---------------------------------------------------------------------------

export async function setReminder(
  params: Record<string, unknown>
): Promise<ToolResult> {
  const start = Date.now();
  try {
    return {
      tool:       "set_reminder",
      success:    true,
      simulated:  true,
      latency_ms: Date.now() - start,
      data: {
        reminder_id: `rem-${Math.random().toString(36).slice(2, 10)}`,
        text:        params.text,
        remind_at:   params.remind_at,
        created_at:  new Date().toISOString(),
      },
    };
  } catch (err) {
    return errorResult("set_reminder", start, err);
  }
}

// ---------------------------------------------------------------------------
// manage_tasks
// ---------------------------------------------------------------------------

export async function manageTasks(
  params: Record<string, unknown>
): Promise<ToolResult> {
  const start = Date.now();
  try {
    const action = params.action as string | undefined;

    if (action === "list" || !action) {
      return {
        tool:       "manage_tasks",
        success:    true,
        simulated:  true,
        latency_ms: Date.now() - start,
        data:       { tasks: MOCK_TASKS },
      };
    }

    return {
      tool:       "manage_tasks",
      success:    true,
      simulated:  true,
      latency_ms: Date.now() - start,
      data: {
        action,
        task_id:      params.task_id,
        updated_at:   new Date().toISOString(),
      },
    };
  } catch (err) {
    return errorResult("manage_tasks", start, err);
  }
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_TASKS = [
  { id: "task-001", text: "Review Q3 renewal contract with legal",  done: false, due: "2026-04-20" },
  { id: "task-002", text: "Follow up with Meridian after onboarding", done: true,  due: "2026-04-17" },
  { id: "task-003", text: "Send board prep deck to leadership",       done: false, due: "2026-04-18" },
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
