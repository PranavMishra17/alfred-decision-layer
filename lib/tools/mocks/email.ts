/**
 * Email mock handlers.
 * Tools covered: read_inbox, send_email, draft_email, forward_email, delete_emails.
 *
 * Every handler is wrapped in try/catch per DESIGN.md §2.2.
 * Returns a ToolResult — simulated: true always.
 * Canonical source: UI-UX-DESIGN.md §7
 */

import type { ToolResult } from "@/types/tool";

// ---------------------------------------------------------------------------
// read_inbox
// ---------------------------------------------------------------------------

export async function readInbox(
  params: Record<string, unknown>
): Promise<ToolResult> {
  const start = Date.now();
  try {
    const limit = typeof params.limit === "number" ? params.limit : 5;
    const filterFrom = params.filter_from as string | undefined;

    const emails = MOCK_EMAILS.filter((e) =>
      filterFrom ? e.from.includes(filterFrom) : true
    ).slice(0, limit);

    return {
      tool:        "read_inbox",
      success:     true,
      simulated:   true,
      latency_ms:  Date.now() - start,
      data:        { emails, total_returned: emails.length },
    };
  } catch (err) {
    return errorResult("read_inbox", start, err);
  }
}

// ---------------------------------------------------------------------------
// send_email
// ---------------------------------------------------------------------------

export async function sendEmail(
  params: Record<string, unknown>
): Promise<ToolResult> {
  const start = Date.now();
  try {
    return {
      tool:       "send_email",
      success:    true,
      simulated:  true,
      latency_ms: Date.now() - start,
      data: {
        sent:       true,
        message_id: `mock-${Math.random().toString(36).slice(2, 10)}`,
        to:         params.to,
        subject:    params.subject,
        queued_at:  new Date().toISOString(),
      },
    };
  } catch (err) {
    return errorResult("send_email", start, err);
  }
}

// ---------------------------------------------------------------------------
// draft_email
// ---------------------------------------------------------------------------

export async function draftEmail(
  params: Record<string, unknown>
): Promise<ToolResult> {
  const start = Date.now();
  try {
    return {
      tool:       "draft_email",
      success:    true,
      simulated:  true,
      latency_ms: Date.now() - start,
      data: {
        draft_id:   `draft-${Math.random().toString(36).slice(2, 10)}`,
        to:         params.to,
        subject:    params.subject,
        saved_at:   new Date().toISOString(),
      },
    };
  } catch (err) {
    return errorResult("draft_email", start, err);
  }
}

// ---------------------------------------------------------------------------
// forward_email
// ---------------------------------------------------------------------------

export async function forwardEmail(
  params: Record<string, unknown>
): Promise<ToolResult> {
  const start = Date.now();
  try {
    return {
      tool:       "forward_email",
      success:    true,
      simulated:  true,
      latency_ms: Date.now() - start,
      data: {
        forwarded:  true,
        message_id: `fwd-${Math.random().toString(36).slice(2, 10)}`,
        to:         params.to,
        sent_at:    new Date().toISOString(),
      },
    };
  } catch (err) {
    return errorResult("forward_email", start, err);
  }
}

// ---------------------------------------------------------------------------
// delete_emails
// ---------------------------------------------------------------------------

export async function deleteEmails(
  params: Record<string, unknown>
): Promise<ToolResult> {
  const start = Date.now();
  try {
    // Mock: use a fixed deleted count for demo purposes
    const deletedCount = 4283;
    return {
      tool:       "delete_emails",
      success:    true,
      simulated:  true,
      latency_ms: Date.now() - start,
      data: {
        deleted:    deletedCount,
        criteria:   params.criteria,
        deleted_at: new Date().toISOString(),
      },
    };
  } catch (err) {
    return errorResult("delete_emails", start, err);
  }
}

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const MOCK_EMAILS = [
  {
    id:      "msg-001",
    from:    "hr-notifications@company.com",
    subject: "2026 Salary Review Cycle — Manager Guidelines",
    date:    "2026-04-10",
    snippet: "Please review the attached manager guidelines for the upcoming salary review cycle.",
    sensitivity: "confidential",
  },
  {
    id:      "msg-002",
    from:    "lisa.park@meridiangroup.com",
    subject: "Re: Vendor onboarding follow-up",
    date:    "2026-04-14",
    snippet: "Great working with you on this. Looking forward to the next phase.",
    sensitivity: "normal",
  },
  {
    id:      "msg-003",
    from:    "wally@acmecorp.com",
    subject: "Re: Q3 Renewal Discussion",
    date:    "2026-04-16",
    snippet: "Thanks for the proposal. We'd like to discuss the terms further.",
    sensitivity: "normal",
  },
  {
    id:      "msg-004",
    from:    "jordan.miller@company.com",
    subject: "Meeting invite: Product Roadmap Alignment",
    date:    "2026-04-17",
    snippet: "Inviting you to a 30-min sync on Friday at 4pm.",
    sensitivity: "normal",
  },
  {
    id:      "msg-005",
    from:    "compensation@company.com",
    subject: "Updated Compensation Bands — Q2 2026",
    date:    "2026-04-12",
    snippet: "The updated compensation bands for Q2 2026 are attached. Handle with care.",
    sensitivity: "confidential",
  },
];

// ---------------------------------------------------------------------------
// Shared error helper
// ---------------------------------------------------------------------------

function errorResult(tool: string, start: number, err: unknown): ToolResult {
  return {
    tool,
    success:    false,
    simulated:  true,
    latency_ms: Date.now() - start,
    data:       { error: err instanceof Error ? err.message : String(err) },
  };
}
