/**
 * Mock tool executor.
 * Routes a validated tool call to its mock handler.
 * All calls are wrapped in try/catch — errors surface as ToolResult.success=false.
 *
 * This is the only entry point for P4 to invoke tools.
 * The pattern is: P3 selects verdict → P4 calls executeTool → mock handler runs.
 *
 * Canonical source: DECISION_LAYER.md §12, UI-UX-DESIGN.md §7
 * House rule: every external call try/catch-wrapped (DESIGN.md §2.2)
 */

import type { ToolCall, ToolResult } from "@/types/tool";
import { getTool } from "./registry";

import { readInbox, sendEmail, draftEmail, forwardEmail, deleteEmails } from "./mocks/email";
import { readCalendar, createEvent, rescheduleEvent, cancelEvent }        from "./mocks/calendar";
import { setReminder, manageTasks }                                        from "./mocks/tasks";
import { searchContacts }                                                  from "./mocks/contacts";

/** Dispatch map: registry name → mock handler function */
const HANDLERS: Record<
  string,
  (params: Record<string, unknown>) => Promise<ToolResult>
> = {
  read_inbox:       readInbox,
  send_email:       sendEmail,
  draft_email:      draftEmail,
  forward_email:    forwardEmail,
  delete_emails:    deleteEmails,
  read_calendar:    readCalendar,
  create_event:     createEvent,
  reschedule_event: rescheduleEvent,
  cancel_event:     cancelEvent,
  set_reminder:     setReminder,
  manage_tasks:     manageTasks,
  search_contacts:  searchContacts,
};

/**
 * Execute a tool call against its mock handler.
 * Validates the tool exists in both the registry and the handler map.
 * Never throws — always returns a ToolResult.
 */
export async function executeTool(call: ToolCall): Promise<ToolResult> {
  const start = Date.now();

  try {
    // Validate against registry (throws if unknown)
    getTool(call.tool);
  } catch {
    return {
      tool:       call.tool,
      success:    false,
      simulated:  true,
      latency_ms: Date.now() - start,
      data:       { error: `Unknown tool: "${call.tool}"` },
    };
  }

  const handler = HANDLERS[call.tool];
  if (!handler) {
    return {
      tool:       call.tool,
      success:    false,
      simulated:  true,
      latency_ms: Date.now() - start,
      data:       { error: `No mock handler registered for tool: "${call.tool}"` },
    };
  }

  try {
    return await handler(call.params);
  } catch (err) {
    return {
      tool:       call.tool,
      success:    false,
      simulated:  true,
      latency_ms: Date.now() - start,
      data:       { error: err instanceof Error ? err.message : String(err) },
    };
  }
}
