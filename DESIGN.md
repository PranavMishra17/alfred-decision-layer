# alfred_ Decision Layer — design.md

Source of truth for any coding agent (Claude Code, Codex, Cursor, human) working on this repo. Read this file first, every session, before writing a single line of code.

---

## 1. Canonical References

This file is the operating manual. It does not re-describe the system. Two companion documents own the substance; this file links to them and enforces discipline around them.

- **`DECISION_LAYER.md`** — the decision pipeline, data structures, signal scoring, policy gate, obligation model, failure modes, module layout, LLM/code responsibility matrix. This is the *brain* of the product.
- **`UI-UX-DESIGN.md`** — visual language, component inventory, page architecture, scenario flow, mind panel rendering, settings surface. This is the *face* of the product.

Any disagreement between the two design docs is resolved in favor of the document whose *domain* the question belongs to. Decision logic questions → `DECISION_LAYER.md`. Visual/interaction questions → `UI-UX-DESIGN.md`. Ambiguity that spans both is resolved in Section 3 of this file.

---

## 2. Operating Instructions for the Coding Agent

### 2.1 First read, every session

Before any implementation work, in this order:
1. Read `design.md` (this file) in full.
2. Skim `DECISION_LAYER.md` section headings. Read in full any section relevant to the current task.
3. Skim `UI-UX-DESIGN.md` section headings. Read in full any section relevant to the current task.

Do not begin implementation from memory of these docs. They are living; re-read.

### 2.2 House rules (carry into every change)

- No emojis anywhere — UI copy, comments, commit messages, log lines, error text.
- No hardcoded values. Thresholds, timeouts, weights, model IDs, tool metadata, regex patterns live in config files or the tool registry. If a magic number shows up inline, it's a bug.
- No scratch MD files, no summary files, no "notes.md". Only the three canonical docs above plus the eventual README.
- Every external call (Anthropic, Cartesia, mock tool invocations that could theoretically throw) is wrapped in `try / catch` with a logged, structured error. No silent failures.
- Comprehensive logs at phase boundaries (P0 → P5). Every log line carries `run_id` and `phase`. Use the trace bus as the log sink — do not `console.log` outside of dev tooling.
- Graceful error handling is load-bearing: the fallback order REFUSE > CLARIFY > CONFIRM > NOTIFY > SILENT is enforced in code, not suggested in prose. Every error path must be traceable to a verdict.
- Reusable code. No one-off test harnesses left in tree. No duplicated types — import from `types/`.
- No test files unless explicitly requested in the task description.

### 2.3 One resolved ambiguity between the two docs

The LLM does not invoke tools via native Anthropic `tool_use`. Tool definitions are *passed to the model as reference material* inside the prompt so it knows names and parameter shapes. The model returns `actions[]` in its structured JSON output. Code in P4 executes the mock handlers via the MCP-shaped client. This is the decision-then-execute pattern.

If anything in `DECISION_LAYER.md` reads otherwise, this section overrides.


### 2.4 Verify the design - NOT EXPECTED FROM YOU

Unless explicitly asked, you are not expected to verify the design. The design is verified by the user. You can suggest verification steps, but do not execute them unless explicitly asked.

---

## 3. Implementation Plan (Milestones)

Execute strictly in order. Do not start a milestone until the previous one compiles, runs, and is visible in the UI.

**M1 — Scaffold.** Next.js 14 App Router + TypeScript + Tailwind. Zustand + localStorage persistence. Landing page + empty chat page shell. CSS variables from UI doc §2.

**M2 — Types + Registry.** All types from `DECISION_LAYER.md` §6 into `types/`. Tool registry from UI doc §7 into `lib/tools/registry.ts` with mock handlers. Config surface into `lib/config/index.ts`.

**M3 — Trace bus + Mind panel shell.** `lib/trace/bus.ts` as a typed event emitter. Mind panel renders runs + empty phase sections. Panel subscribes to the bus. No LLM yet — wire up with synthetic events to prove the rendering loop.

**M4 — Decision core (code-only).** `lib/decision/{signals,risk,policy,weights}.ts`. Given a hand-crafted `Action + Context`, produce a `Decision`. Write signal extraction against the tool registry. Verify policy gates against the scenarios in the JSON by running them through a dev-only harness (not committed as tests — one-off validation).

**M5 — LLM integration (P2).** `/api/decide` SSE route. `lib/llm/reason.ts` with streaming Sonnet call, Zod-validated structured output, retry-once, Haiku safe-mode fallback. Prompt template per `DECISION_LAYER.md` §7.

**M6 — Obligations + Idempotency.** Zustand slices. Obligation resolution detection via LLM output, explicit-only. Idempotency hash window.

**M7 — Chat panel + outcome cards.** Scenario tabs, scenario modal, message bubbles, the five outcome cards (Silent badge, Undo card with 10s countdown, Confirm card, Clarify dialog, Refuse message). Multi-intent grouping. Obligation chip + drawer.

**M8 — Failure injection.** Settings sheet. Three one-shot injection buttons. Verify all three failure paths surface distinct rose-bordered mind panel sections.

**M9 — TTS (optional-by-key).** `/api/tts` Cartesia proxy, sentence buffer, verdict gating per `DECISION_LAYER.md` §15.

**M10 — Polish + Deploy.** Landing page fidelity, mobile drawer, export JSON, `?replay={run_id}`. Deploy to Vercel. Verify all 8 scenarios behave per UI doc §6.

Each milestone closes with a **self-audit** (Section 5).

---

## 4. Sub-agent / Parallel Work Patterns

When delegating work inside a single milestone, spawn sub-tasks only along these independent seams:

- **UI component** vs **decision logic** — always safe to parallelize. `lib/decision/` has zero UI imports.
- **Tool mock handlers** — each mock in `lib/tools/mocks/*.ts` is independent. Parallelize one per sub-agent.
- **Scenario validation runs** — each of the 8 scenarios can be verified independently once M4 is green.

Never parallelize:
- Changes to shared types in `types/`.
- Changes to the trace bus contract in `lib/trace/`.
- Changes to the tool registry structure (adding entries is fine; changing `ToolDefinition` shape is a serial change).
- Prompt edits to `lib/llm/prompts/system.ts` — single author per iteration.

Sub-agent handoff format: the parent agent writes a task brief that names the files in scope, the types being consumed, and the acceptance criterion. The child agent returns a diff summary plus a self-audit block (Section 5). No verbal-only handoffs.

---

## 5. Self-Audit After Every Iteration

At the end of any meaningful change (milestone close, sub-task completion, bug fix), the agent emits a self-audit block in the chat response. Format:

```
SELF-AUDIT
Milestone:        Mx — <name>
Files touched:    <paths>
Docs consulted:   <sections from the two canonical docs>
Assumptions:      <any assumption made because a doc was silent>
Deviations:       <anywhere the implementation departs from the docs, with reason>
Known gaps:       <what was deferred and why>
Next action:      <what the next iteration should pick up>
```

Deviations are not forbidden. Silent deviations are. If `DECISION_LAYER.md` says one thing and the code does another, it is logged here and the doc is either updated in the same PR or an issue is filed.

---

## 6. Bug / Error Reporting Protocol

Bugs found mid-iteration — whether via manual testing, injection scenarios, or an unexpected trace event — are reported inline in the chat response using this format:

```
BUG
Where:     <file + phase, e.g. lib/decision/policy.ts, P3>
Symptom:   <observable behavior>
Expected:  <per which doc + section>
Severity:  blocker | serious | minor
Triage:    fix-now | park | duplicate-of-<id>
```

Blockers halt the current milestone. Serious bugs are fixed before the milestone closes. Minor bugs are listed under "Known gaps" in the self-audit and carried forward.

Runtime errors caught by the graceful-handling paths are not bugs — they are features. They must still surface in the mind panel with a rose border per UI doc §5.3, and they must obey the fallback order.

---

## 7. What Not to Build

Explicit out-of-scope list from the two design docs, consolidated. Do not let scope creep introduce any of these without a human decision:

- Real third-party integrations (Gmail, Google Calendar, Outlook, Slack, Cartesia voice cloning).
- Voice input (STT). TTS out only.
- Authentication, multi-user state, server-side persistence.
- Durable scheduling. The 10s undo window is client-side `setTimeout` only.
- Learned risk weights, per-user autonomy preferences, automatic obligation expiry.
- Light mode, accessibility audit, analytics, prompt caching.
- Tests. Dev-time validation harnesses are acceptable if not committed.

If a task appears to require any of the above, stop and raise a BUG block with severity `blocker` and triage `park`.

---

## 8. Version

### v1.0.0 | summary of changes in one line 

DESIGN.md v1. Revise only when the canonical docs materially change or when a new operating rule is adopted across the team. Bump version on every change.

- Important bugs, resolutions - need to be documented. Keep the versioning system append only.
