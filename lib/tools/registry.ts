/**
 * Tool registry — single source of truth for all MCP tool definitions.
 * Canonical source: DECISION_LAYER.md §12; UI-UX-DESIGN.md §7
 *
 * To add a tool: add one entry here + one mock handler in lib/tools/mocks/.
 * To change risk metadata: edit here only — no code changes elsewhere needed.
 */

import type { ToolDefinition } from "@/types/tool";
import { UNDO_WINDOW } from "@/lib/config";

export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  // -------------------------------------------------------------------------
  // Read tools — risk floor 0, always SILENT unless forced otherwise
  // -------------------------------------------------------------------------

  read_inbox: {
    name: "read_inbox",
    description:
      "Read recent emails, optionally filtered by sender, subject, or date range.",
    parameters_schema: {
      type: "object",
      properties: {
        filter_from:    { type: "string",  description: "Filter by sender address" },
        filter_subject: { type: "string",  description: "Filter by subject keyword" },
        since:          { type: "string",  description: "ISO-8601 date lower bound" },
        limit:          { type: "number",  description: "Max messages to return (default 5)" },
      },
    },
    reversibility:          "reversible",
    default_blast_radius:   0.0,
    default_risk_floor:     0.0,
    default_verdict_hint:   "SILENT",
    undo_window_ms:         UNDO_WINDOW.DEFAULT_MS,
    stake_flags:            [],
    mock_handler:           "email",
  },

  read_calendar: {
    name: "read_calendar",
    description:
      "Read calendar events for a date or date range. Returns title, time, attendees, location.",
    parameters_schema: {
      type: "object",
      properties: {
        date:       { type: "string", description: "ISO-8601 date (YYYY-MM-DD)" },
        date_start: { type: "string", description: "ISO-8601 range start" },
        date_end:   { type: "string", description: "ISO-8601 range end" },
      },
    },
    reversibility:          "reversible",
    default_blast_radius:   0.0,
    default_risk_floor:     0.0,
    default_verdict_hint:   "SILENT",
    undo_window_ms:         UNDO_WINDOW.DEFAULT_MS,
    stake_flags:            [],
    mock_handler:           "calendar",
  },

  search_contacts: {
    name: "search_contacts",
    description:
      "Look up contact details by name, email, or role.",
    parameters_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Name, partial email, or job title" },
      },
    },
    reversibility:          "reversible",
    default_blast_radius:   0.0,
    default_risk_floor:     0.0,
    default_verdict_hint:   "SILENT",
    undo_window_ms:         UNDO_WINDOW.DEFAULT_MS,
    stake_flags:            [],
    mock_handler:           "contacts",
  },

  // -------------------------------------------------------------------------
  // State-mutating but reversible tools
  // -------------------------------------------------------------------------

  draft_email: {
    name: "draft_email",
    description:
      "Save an email draft without sending. Does not deliver anything.",
    parameters_schema: {
      type: "object",
      required: ["to", "subject", "body"],
      properties: {
        to:      { type: "string", description: "Recipient email address" },
        subject: { type: "string", description: "Email subject line" },
        body:    { type: "string", description: "Email body (plain text or markdown)" },
        cc:      { type: "string", description: "CC addresses, comma-separated" },
      },
    },
    reversibility:          "reversible",
    default_blast_radius:   0.1,
    default_risk_floor:     0.05,
    default_verdict_hint:   "SILENT",
    undo_window_ms:         UNDO_WINDOW.DEFAULT_MS,
    stake_flags:            [],
    mock_handler:           "email",
  },

  set_reminder: {
    name: "set_reminder",
    description:
      "Create a timed reminder or task for the user.",
    parameters_schema: {
      type: "object",
      required: ["text", "remind_at"],
      properties: {
        text:       { type: "string", description: "Reminder text" },
        remind_at:  { type: "string", description: "ISO-8601 datetime" },
      },
    },
    reversibility:          "reversible",
    default_blast_radius:   0.05,
    default_risk_floor:     0.05,
    default_verdict_hint:   "SILENT",
    undo_window_ms:         UNDO_WINDOW.DEFAULT_MS,
    stake_flags:            [],
    mock_handler:           "tasks",
  },

  manage_tasks: {
    name: "manage_tasks",
    description:
      "List, complete, or modify tasks. Completing a task marks it done but preserves history.",
    parameters_schema: {
      type: "object",
      properties: {
        action:  { type: "string", enum: ["list", "complete", "modify"], description: "Operation" },
        task_id: { type: "string", description: "Task ID (required for complete and modify)" },
        text:    { type: "string", description: "New task text (for modify)" },
      },
    },
    reversibility:          "partial",
    default_blast_radius:   0.1,
    default_risk_floor:     0.05,
    default_verdict_hint:   "NOTIFY",
    undo_window_ms:         UNDO_WINDOW.DEFAULT_MS,
    stake_flags:            [],
    mock_handler:           "tasks",
  },

  create_event: {
    name: "create_event",
    description:
      "Create a new calendar event and send invites to attendees.",
    parameters_schema: {
      type: "object",
      required: ["title", "start", "end"],
      properties: {
        title:     { type: "string", description: "Event title" },
        start:     { type: "string", description: "ISO-8601 datetime" },
        end:       { type: "string", description: "ISO-8601 datetime" },
        attendees: { type: "string", description: "Comma-separated email addresses" },
        location:  { type: "string", description: "Physical location or video link" },
      },
    },
    reversibility:          "partial",
    default_blast_radius:   0.35,
    default_risk_floor:     0.20,
    default_verdict_hint:   "NOTIFY",
    undo_window_ms:         UNDO_WINDOW.DEFAULT_MS,
    stake_flags:            [],
    mock_handler:           "calendar",
  },

  reschedule_event: {
    name: "reschedule_event",
    description:
      "Move an existing calendar event to a new time and notify attendees.",
    parameters_schema: {
      type: "object",
      required: ["event_id", "new_start", "new_end"],
      properties: {
        event_id:     { type: "string", description: "Calendar event ID" },
        new_start:    { type: "string", description: "ISO-8601 new start" },
        new_end:      { type: "string", description: "ISO-8601 new end" },
        notify_note:  { type: "string", description: "Optional note in the reschedule notification" },
      },
    },
    reversibility:          "partial",
    default_blast_radius:   0.40,
    default_risk_floor:     0.25,
    default_verdict_hint:   "CONFIRM",
    undo_window_ms:         UNDO_WINDOW.DEFAULT_MS,
    stake_flags:            [],
    mock_handler:           "calendar",
  },

  cancel_event: {
    name: "cancel_event",
    description:
      "Cancel a calendar event and notify all attendees.",
    parameters_schema: {
      type: "object",
      required: ["event_id"],
      properties: {
        event_id:    { type: "string", description: "Calendar event ID" },
        cancel_note: { type: "string", description: "Optional cancellation note to attendees" },
      },
    },
    reversibility:          "irreversible",
    default_blast_radius:   0.55,
    default_risk_floor:     0.35,
    default_verdict_hint:   "CONFIRM",
    undo_window_ms:         UNDO_WINDOW.DEFAULT_MS,
    stake_flags:            [],
    mock_handler:           "calendar",
  },

  // -------------------------------------------------------------------------
  // High-risk write tools
  // -------------------------------------------------------------------------

  send_email: {
    name: "send_email",
    description:
      "Send an email on the user's behalf. Irreversible once delivered.",
    parameters_schema: {
      type: "object",
      required: ["to", "subject", "body"],
      properties: {
        to:      { type: "string",  description: "Recipient email address" },
        subject: { type: "string",  description: "Email subject line" },
        body:    { type: "string",  description: "Email body (plain text or markdown)" },
        cc:      { type: "string",  description: "CC addresses, comma-separated" },
      },
    },
    reversibility:          "irreversible",
    default_blast_radius:   0.60,
    default_risk_floor:     0.40,
    default_verdict_hint:   "CONFIRM",
    undo_window_ms:         UNDO_WINDOW.DEFAULT_MS,
    stake_flags:            ["reputation"],
    mock_handler:           "email",
  },

  forward_email: {
    name: "forward_email",
    description:
      "Forward an email (or set of emails) to another recipient.",
    parameters_schema: {
      type: "object",
      required: ["message_id", "to"],
      properties: {
        message_id: { type: "string", description: "Email message ID or search query" },
        to:         { type: "string", description: "Forward-to email address" },
        note:       { type: "string", description: "Optional note prepended to the forwarded email" },
      },
    },
    reversibility:          "irreversible",
    default_blast_radius:   0.70,
    default_risk_floor:     0.50,
    default_verdict_hint:   "CONFIRM",
    undo_window_ms:         UNDO_WINDOW.DEFAULT_MS,
    stake_flags:            ["reputation", "legal"],
    mock_handler:           "email",
  },

  delete_emails: {
    name: "delete_emails",
    description:
      "Delete emails matching criteria. Irreversible mass action.",
    parameters_schema: {
      type: "object",
      required: ["criteria"],
      properties: {
        criteria: {
          type: "string",
          description:
            "Search string or natural-language description of emails to delete (e.g. 'all emails before January from newsletters')",
        },
        confirm_count: {
          type: "number",
          description: "Estimated email count the user explicitly acknowledged",
        },
      },
    },
    reversibility:          "irreversible",
    default_blast_radius:   0.95,
    default_risk_floor:     0.80,
    default_verdict_hint:   "REFUSE",
    undo_window_ms:         UNDO_WINDOW.DEFAULT_MS,
    stake_flags:            ["legal", "reputation"],
    mock_handler:           "email",
  },
} satisfies Record<string, ToolDefinition>;

/** Convenience helper — returns the registry entry or throws if key not found. */
export function getTool(name: string): ToolDefinition {
  const tool = TOOL_REGISTRY[name];
  if (!tool) {
    throw new Error(`Tool not found in registry: "${name}"`);
  }
  return tool;
}
