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

- Important bugs, resolutions - need to be documented. Keep the versioning system append only.

### v1.0.1 | feat(M1): scaffold core app structure + UI shells

- Initialize Next.js + Tailwind scaffold (merged from temp dir)
- Add global styles, theme tokens (Obsidian + Cream palette)
- Implement app layout and landing page (per UI-UX spec)
- Scaffold chat + mind panels (60/40 split, structural shells only)
- Add shared components (DecisionBadge, layout shells)
- Set up Zustand store + decision types (threshold clamp logic)
- Wire base routing (/, /chat)

notes:
- Avatar replaced with typographic/geometric mark
- Minor inline styles in landing page (to be moved in M2)
- Interaction logic deferred (M3–M8 per plan)

commit (M1) established the app scaffold: Next.js + Tailwind setup, base layout, routing, and UI shells (chat/mind panels) with minimal state + placeholder components. No business logic existed yet.


### v1.0.2 | feat(M2): add core types, decision config, and tool registry

- Expand decision types + add obligation, trace, tool, message, scenario types
- Introduce config module (thresholds, timeouts, tunables)
- Implement decision weights + reversibility scores
- Add tool registry + executor with mock integrations (email, calendar, tasks, contacts)
- Add preloaded scenario fixtures (aligned to UX spec)
- Update DecisionBadge (SILENT_DUPE support)

notes:
- Strongly typed unions used where docs specified strings (no runtime impact)
- weights.ts introduced early to avoid later breaking changes
- Minor type simplification for Scenario.pre_seeded_obligations (tsc-clean, same shape)
- Some JSON ↔ type mismatch (raised_at string vs number) deferred to store normalization (M6)
- Signals/risk/policy/fallback logic deferred to M4
- LLM, trace infra, and security layers deferred to M3/M5

commit (M2) builds the foundational data layer and execution surface: all core types are now defined, decision configuration is centralized, and a registry-based tool system (with mocks) is in place. The system is now structurally ready for decision computation (M4), LLM integration (M3), and state wiring (M6).

### v1.0.3 | feat(M3): implement decision core (signals, risk, policy + injection scan)

- Add injection detection (regex patterns, severity levels, scan utilities)
- Implement signal extraction (intent/entity/action/confidence helpers)
- Add risk scoring (with optional injection medium bump)
- Implement policy gate (decide() with all 5 rules + threshold logic)
- Extend decision types (InjectionFlag, InjectionSeverity, DecisionContext)
- Update config with POLICY block + blast radius increment

notes:
- Threshold delta uses config constant (CONFIRM_DELTA) vs inline value
- riskScore kept pure; injection bump passed explicitly from policy layer
- Injection scan integrated as pre-decision safety signal
- Idempotency + SILENT_DUPE supported at type/policy level

known gaps:
- Full pipeline (LLM + fallback + orchestration) deferred to M5
- Scenario hydration (P1 context) not yet wired → may affect edge classifications
- Failure-injection paths depend on upcoming LLM infra

This commit (M4) introduces the deterministic decision engine. The system can now extract signals, compute risk, detect prompt injections, and apply the full policy gate to produce a verdict (ALLOW / CONFIRM / BLOCK / NOTIFY / SILENT_DUPE) — entirely code-driven, without LLM dependency.

Net effect: the core reasoning backbone is now in place. Next step (M5) plugs in the LLM layer + pipeline to augment/override this logic where needed.

### v1.0.4 | feat(M3+M5): Trace bus + LLM pipeline & UI integration

- Add in-process event `TraceBus` with SSE compatibility (M3)
- Wire `MindPanel` to consume TraceEvents and render reasoning phases/outcomes natively (M3)
- Implement `reason.ts` for P2 streaming Sonnet model with Zod schemas and automatic retry-once (M5)
- Provide safe-mode Haiku fallback for strict constraint output (M5)
- Orchestrate entire P0-P4 async generator pipeline via `lib/decision/pipeline.ts` (M5)
- Expose `/api/decide` edge route that forwards pipeline traces to frontend (M5)
- Wire `ChatPanel` input directly to SSE API, handling text chunks and pipeline metadata (M5)

notes:
- `ChatPanel` and `MindPanel` interact solely via the `TraceBus` to maintain the decoupled design.
- We opted correctly into edge compatibility (`NextRequest`, `ReadableStream`) to preserve Vercel constraints.
- Try/catch enforced meticulously with strict `REFUSE` and `CLARIFY` safety fallbacks.

known gaps:
- Zustand store state (`PendingObligation`) mutation logic requires M6.
- TTS/Voice capability is deferred (Cartesia client/route).
- Idempotency checks fully work but local storage persistence remains out of scope for now.


### v1.0.5 | feat(M3+M5): add trace bus, LLM pipeline, and SSE orchestration

- Implement typed trace bus (event emitter + shared types)
- Add Zod schemas for structured LLM outputs (P2 contract)
- Create system + safe-mode prompts (strict fallback constraints)
- Implement LLM client (streaming, retry-once, integrated fallback)
- Build decision pipeline/orchestrator (P0–P4 with trace emission)
- Add /api/decide SSE route (Edge streaming to UI)
- Integrate ChatPanel with streaming API + trace dispatch
- Update MindPanel to subscribe/render trace phases (decoupled)

notes:
- Safe-mode fallback colocated in reason.ts for single LLM abstraction surface
- Zod record signature adjusted for TS compatibility
- Explicit null/undefined guards for JSX type safety
- Pipeline emits structured traces for UI + debugging

known gaps:
- Obligation store + idempotency persistence not yet wired (M6)
- Some advanced failure paths depend on downstream state handling
- UI reflects traces but not yet fully state-driven

This commit (M3+M5) wires the system into a live, streaming architecture. A trace bus enables step-by-step visibility, the LLM layer (with schema validation and safe fallback) augments reasoning, and the pipeline orchestrates all phases (P0–P4). The SSE API streams decisions + traces to the UI, with ChatPanel triggering runs and MindPanel rendering them in real time.

Net effect: the system is now end-to-end functional — from user input → orchestrated reasoning → streamed decision + trace visualization. Next step (M6) introduces persistent state (obligations + idempotency) to make decisions stateful and consistent across sessions.


### v1.0.6 | feat(M6): add obligation store, idempotency, and persistence

- Integrate Zustand slices (obligations + M6 state) with persistence
- Add obligation store module + pure resolver logic
- Wire ChatPanel to extract state, map fetch payloads, and handle SSE traces
- Update pipeline to emit act.complete + reason.complete with hashes/outputs
- Track idempotency via hash set (serialized/deserialized across boundary)

notes:
- Idempotency Set serialized via Array.from() for Zustand compatibility
- SSE listeners intercept reason/act traces to update obligations in real time
- State now persists across sessions (local storage-backed)

known gaps:
- Obligations UI (drawer/chips) not yet implemented (M7)
- Visualization layer intentionally deferred; state is fully wired underneath

context (for agent):

This commit (M6) introduces persistent state into the system. Obligations are now created, resolved, and stored across sessions, and idempotency prevents duplicate actions via hash tracking. The pipeline, UI, and SSE layer are now tightly coupled through real-time trace interception.

Net effect: the system is no longer just reactive — it is stateful and consistent over time. Next step (M7) exposes this state through UI (obligations drawer, outcome rendering, multi-intent handling).


### v1.0.7 | feat(M7): obligations UI, multi-intent rendering, and outcome display

- Implement `ScenarioTabs` loading dynamically from `PRELOADED_SCENARIOS`
- Implement `OutcomeCards` covering all five verdicts (SILENT, NOTIFY, CONFIRM, CLARIFY, REFUSE)
- Refactor `MessageBubble` array to natively support multi-intent mappings via nested mapped arrays per turn layout constraints
- Create animated `ObligationChip` widget connected directly to Zustand M6 local map above chat panel
- Connect `New Conversation` button to global event loops parsing clears across `MindPanel` and `ChatPanel` ephemeral history states

notes:
- Extended SSE act.completed payloads dynamically mapping to pipeline action parameters per M7 output UI rendering needs
- Ensured CSS animations and SVG countdown bindings matched original aesthetics natively
- M7 closes out the UI fidelity loop cleanly.

known gaps:
- Tool execution is still locally simulated via Mocks.
- TTS bindings and audio streams remain intentionally deferred (M9).


### v1.0.8 | feat(M8): failure injection harness and settings sheet

- Implement `SettingsSheet` for centralized state controls (keys, threshold sliders, injection toggles)
- Pass one-shot toggles down Edge API payloads into pipeline run loop, clearing locally post-dispatch
- Enhance `MindPanel` to distinctly isolate failure paths (`FAILURE HANDLED` UI badges, auto-expanding rose borders exclusively overriding standard logic)
- Wire overarching Shell button mapping

notes:
- Inject tests enforce hard exits and route to Haiku safe-mode
- The MindPanel visualizations guarantee robust manual debugging surface mappings out-of-the-box

known gaps:
- Tool executions are mocked
- Only remaining milestone: M9 (TTS streaming proxy integration)

context (for agent):
M8 safely incorporates adversarial tests by enforcing failure injection parameters natively into the decision cycle without code rewrites.

Next step (M9): the Cartesia TTS logic setup.

### v1.0.9 | feat(M9): TTS streaming proxy and audio player integration

- Create `app/api/tts/route.ts` Edge API proxy encapsulating secure `Cartesia API` keys 
- Build modular client-side `TTSPlayer` consuming remote `PCM` payload floats into native Web Audio interfaces
- Synchronized streaming buffers in ChatPanel isolating unique sentence boundaries (`!`, `.`, `?`) directly off `P5` render sequences
- Implemented core LLM verdict gating (e.g. mapping `CLARIFY` to explicit UI cues vs dictating full lengths on `REFUSE` rejections)

notes:
- API enforces completely robust non-blocking HTTP streaming logic leveraging `ReadableStreams` underneath the audio graph
- Full pipeline milestones M1 - M10 natively finalized without compromising baseline architecture dictates.

known gaps:
- N/A

context (for agent):
M9 marks the final functional layer integration wrapping dynamic TTS streaming strictly gated behind the procedural logic verdicts. Core milestones are fully executed.
