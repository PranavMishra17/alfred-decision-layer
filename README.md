# alfred_ — Decision Layer

A hybrid LLM + deterministic decision pipeline that determines when an AI assistant should act silently, notify the user, confirm before acting, ask for clarification, or refuse. Built as a Next.js 14 application with a real-time trace UI.

**Live demo:** [[Alfred_](https://alfred-decision-layer-lime.vercel.app)]

---

## Quick Start

```bash
npm install
npm run dev         # → http://localhost:3000
```

**API keys:** Open Settings in the top-right corner. Add your Anthropic API key (required). Cartesia API key is optional — enables voice readout.

**Scenarios:** Click any preloaded scenario tab to load context and submit. The pipeline runs and both the chat and the Mind Panel update in real time.

---

## How Decisions Are Made

Every user message passes through five stages:

| Stage | Name | What happens |
|-------|------|-------------|
| P0 | Ingest | Regex injection scan runs in parallel |
| P1 | Hydrate | Context assembled: tools, open obligations, idempotency set |
| P2 | Reason | Claude Sonnet parses intent → JSON with actions, confidence scores, obligations |
| P3 | Decide | Deterministic rule engine applies signals → one of five verdicts |
| P4 | Act | Tool fires (or waits) based on verdict |

Final verdict is one of: **SILENT**, **NOTIFY**, **CONFIRM**, **CLARIFY**, **REFUSE**.

### Decision Signals

| Signal | Source | Why it matters |
|--------|--------|---------------|
| `tool_reversibility` | Tool registry | Irreversible actions (send, delete) cost more than reads |
| `blast_radius` | Tool registry + entity count | How many people/records are affected |
| `entity_ambiguity` | `1 - entity_confidence` from LLM | Unresolved entities → ask first |
| `intent_ambiguity` | `1 - intent_confidence` from LLM | Unclear intent → ask first |
| `obligation_conflict` | Open obligations store | Prior "hold until X" conditions detected |
| `policy_violation` | Deterministic rules | Tools marked REFUSE (e.g. bulk delete) |
| `external_recipient` | Email domain check vs `company.com` | Outbound to non-internal addresses |
| `stake_flags` | Regex on params + entities | Money, legal, or reputational language detected |
| `injection_detected` | P0 regex scan | High-severity prompt injection patterns |

Risk score formula:
```
score = min(1, tool.risk_floor + Σ(weight × signal))
```
Thresholds (user-adjustable): `score < 0.50` → SILENT, `0.50–0.70` → NOTIFY, `≥ 0.70` → CONFIRM. Hard rules (injection, policy) fire before scoring.

### LLM vs Deterministic Split

**Claude Sonnet decides:**
- What the user wants (intent parsing)
- Which tool to call with which parameters
- How confident it is in each entity (person, time, email, amount)
- Whether a new "hold until X" obligation was created
- Whether a prior obligation was resolved

**Code computes deterministically:**
- Whether to execute, notify, confirm, clarify, or refuse
- The risk score from the signal weights
- Policy violations (bulk delete, external forwarding rules)
- Injection detection via regex
- Idempotency dedup (same action in same window → skip)
- Obligation conflict detection (action.conflicts_with → CONFIRM)

The LLM never calls tools. It proposes. Code decides.

### Prompt Design

The system prompt is schema-first: the LLM is shown the exact JSON structure it must return and the full tool registry before any instructions. Obligations are injected as a named block so the model can detect conflicts. Confidence values are explicitly requested (0.0–1.0) and used directly as signals.

Safe-mode (Haiku fallback) uses a separate constrained prompt that limits output to CLARIFY or REFUSE, ensuring a valid response even when Sonnet times out.

---

## Failure Modes

| Failure | Detection | Recovery |
|---------|-----------|---------|
| LLM timeout (>12s) | AbortController fires | Haiku safe-mode call (8s timeout) |
| Malformed JSON from LLM | Zod schema validation fails | Retry once with error feedback; then Haiku safe-mode |
| Safe-mode also fails | Try/catch around safe-mode call | Hard REFUSE with static message |
| P3 policy gate crash | Try/catch in `decide()` | REFUSE (fallback order: REFUSE > CLARIFY > CONFIRM > NOTIFY > SILENT) |
| Missing API key | Route validation | 401 before pipeline starts |

Failure paths are visible in the Mind Panel under P2 with red badges. Safe-mode activation shows an amber banner in the chat.

---

## Preloaded Scenarios

| # | Title | Category | Expected Verdict |
|---|-------|----------|-----------------|
| 1 | Check My Calendar | easy | SILENT (answers with calendar summary) |
| 2 | Send Pre-Approved Email | easy | NOTIFY (10s undo window) |
| 3 | The Contradicted Instruction | ambiguous | CONFIRM (obligation conflict) |
| 4 | Vague Reschedule | ambiguous | CLARIFY (which meeting? which time?) |
| 5 | Bulk Delete | adversarial | REFUSE (irreversible mass action) |
| 6 | Social Engineering | adversarial | CONFIRM (score=1.0, all signals fire) |
| 7 | LLM Timeout Simulation | failure | CLARIFY via safe-mode fallback |
| 8 | Malformed Output Recovery | failure | NOTIFY via retry/safe-mode chain |
| 9 | Read Email Aloud | easy | SILENT + TTS readout |

---

## CLI Test Harness

Run all scenarios against the live pipeline without the UI:

```bash
ANTHROPIC_API_KEY=sk-... npx tsx scripts/test-pipeline.ts

# Single scenario:
ANTHROPIC_API_KEY=sk-... npx tsx scripts/test-pipeline.ts --scenario scenario_03_contradicted_instruction

# Verbose trace output:
ANTHROPIC_API_KEY=sk-... npx tsx scripts/test-pipeline.ts --verbose

# Dry-run (no API calls, just parses scenarios):
npx tsx scripts/test-pipeline.ts --no-llm
```

Exit code 0 if all `expected_verdict` fields match, 1 if any mismatch.

---

## Evolving the System

**Next 6 months — if I owned this:**

1. **Per-contact trust scores.** Replace the binary `external_recipient` signal with a trust tier (verified partner, known contact, unknown, blocked). This makes S6 nuanced — Dave's corporate email would score differently than his Gmail.

2. **Per-tool policy customization.** Let users configure thresholds and conditions per tool via the UI ("always confirm `send_email` to external recipients regardless of risk score").

3. **Multi-step action chains.** Right now each turn is a single action. The LLM should be able to propose a dependency graph: "read inbox → filter → draft reply → await confirm → send." The pipeline runs each node with its own gate.

4. **Obligation UI management.** Surface open obligations as a first-class management surface — let users review, edit conditions, and manually resolve holds without needing to trigger a new turn.

5. **Audit log export.** Every decision is already trace-evented. Export the full decision log (signals, scores, verdicts, rationale) as JSON/CSV for compliance review.

6. **Richer tool registry.** As alfred_ gains riskier tools (file system, payments, code execution), the registry metadata — risk floor, blast radius, stake flags — becomes the primary safety surface. The pipeline requires no code changes; just new registry entries and mock handlers.

---

## Architecture Reference

- [DECISION_LAYER.md](./DECISION_LAYER.md) — Signal definitions, schema, P0-P5 spec
- [DESIGN.md](./DESIGN.md) — Milestone history, design principles
- [UI-UX-DESIGN.md](./UI-UX-DESIGN.md) — Chat and Mind Panel interaction spec
