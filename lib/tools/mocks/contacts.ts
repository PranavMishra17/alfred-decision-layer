/**
 * Contacts mock handler.
 * Tools covered: search_contacts.
 *
 * Every handler is wrapped in try/catch per DESIGN.md §2.2.
 * Canonical source: UI-UX-DESIGN.md §7
 */

import type { ToolResult } from "@/types/tool";

// ---------------------------------------------------------------------------
// search_contacts
// ---------------------------------------------------------------------------

export async function searchContacts(
  params: Record<string, unknown>
): Promise<ToolResult> {
  const start = Date.now();
  try {
    const query = (params.query as string | undefined)?.toLowerCase() ?? "";

    const results = MOCK_CONTACTS.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        c.title.toLowerCase().includes(query)
    );

    return {
      tool:       "search_contacts",
      success:    true,
      simulated:  true,
      latency_ms: Date.now() - start,
      data:       { contacts: results, total_found: results.length },
    };
  } catch (err) {
    return errorResult("search_contacts", start, err);
  }
}

// ---------------------------------------------------------------------------
// Mock directory — mirrors contacts referenced in preloaded.json scenarios
// ---------------------------------------------------------------------------

const MOCK_CONTACTS = [
  {
    id:            "c-001",
    name:          "Wally Nguyen",
    email:         "wally@acmecorp.com",
    title:         "VP Partnerships",
    company:       "Acme Corp",
    domain:        "acmecorp.com",
    is_external:   true,
  },
  {
    id:            "c-002",
    name:          "Lisa Park",
    email:         "lisa.park@meridiangroup.com",
    title:         "Vendor Success Manager",
    company:       "Meridian Group",
    domain:        "meridiangroup.com",
    is_external:   true,
  },
  {
    id:            "c-003",
    name:          "Sarah Chen",
    email:         "sarah.chen@company.com",
    title:         "Design Lead",
    company:       "Company",
    domain:        "company.com",
    is_external:   false,
  },
  {
    id:            "c-004",
    name:          "Mike Chen",
    email:         "mike.chen@company.com",
    title:         "Frontend Engineer",
    company:       "Company",
    domain:        "company.com",
    is_external:   false,
  },
  {
    id:            "c-005",
    name:          "Dave Wilson",
    email:         "dave.wilson@company.com",
    title:         "VP Engineering",
    company:       "Company",
    domain:        "company.com",
    is_external:   false,
    note:          "Claims received via personal Gmail are unverified",
  },
  {
    id:            "c-006",
    name:          "Jordan Miller",
    email:         "jordan.miller@company.com",
    title:         "Product Manager",
    company:       "Company",
    domain:        "company.com",
    is_external:   false,
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
