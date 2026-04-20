/**
 * CLI test harness for the Alfred decision pipeline.
 * Runs all preloaded scenarios through runDecisionPipeline and reports verdicts.
 *
 * Usage:
 *   npx tsx scripts/test-pipeline.ts              # reads ANTHROPIC_API_KEY from .env
 *
 * Optional flags:
 *   --scenario <id>        Run a single scenario by id
 *   --no-llm               Skip scenarios requiring a real LLM call (dry-run)
 *   --verbose              Print full trace events for each scenario
 *
 * Exit code: 0 if all expected_verdict matches, 1 if any mismatch.
 */

// ---------------------------------------------------------------------------
// Load .env file before anything else (no dotenv dep — uses Node built-ins)
// ---------------------------------------------------------------------------
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

import { runDecisionPipeline, type PipelineTurn, type PipelineContext } from "@/lib/decision/pipeline";
import type { PendingObligation } from "@/types/obligation";
import type { Decision } from "@/types/decision";
// Use a relative path for the JSON import to avoid module resolution issues
import scenariosRaw from "../scenarios/preloaded.json";

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const filterScenario = args.includes("--scenario") ? args[args.indexOf("--scenario") + 1] : null;
const verbose = args.includes("--verbose");
const noLlm = args.includes("--no-llm");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ScenarioJSON = {
  id: string;
  title: string;
  category: string;
  expected_verdict: string;
  failure_injection: string | null;
  pre_seeded_obligations: {
    id: string;
    action_ref: string;
    condition: string;
    status: "open" | "resolved";
    raised_at: string;
    resolved_at: null;
    resolved_by_turn_id: null;
  }[];
  conversation_history: { role: "user" | "assistant"; content: string }[];
  user_message: string;
  mock_context: Record<string, unknown>;
};

type TestResult = {
  id: string;
  title: string;
  category: string;
  expected: string;
  got: string;
  pass: boolean;
  verdicts: string[];
  durationMs: number;
  error?: string;
};

// ---------------------------------------------------------------------------
// Run one scenario
// ---------------------------------------------------------------------------

async function runScenario(s: ScenarioJSON, apiKey: string): Promise<TestResult> {
  const start = Date.now();

  const obligations: PendingObligation[] = s.pre_seeded_obligations.map((o) => ({
    ...o,
    raised_at: typeof o.raised_at === "string" ? new Date(o.raised_at).getTime() : Date.now(),
    resolved_at: null,
    resolved_by_turn_id: null,
  }));

  const turn: PipelineTurn = {
    message: s.user_message,
    attachment_text: Object.keys(s.mock_context).length > 0
      ? JSON.stringify(s.mock_context, null, 2)
      : undefined,
    api_key: apiKey,
    inject: {
      timeout: s.failure_injection === "timeout",
      malformed_output: s.failure_injection === "malformed_output",
      missing_context: s.failure_injection === "missing_context",
    },
  };

  const ctx: PipelineContext = {
    conversation_history: s.conversation_history,
    open_obligations: obligations,
    idempotency: new Set<string>(),
    threshold: 0.5,
    action_history: [],
  };

  const decisions: Decision[] = [];
  let error: string | undefined;
  let needsClarification = false;
  let requestType: string | undefined;
  let safeModeFired = false;

  try {
    for await (const event of runDecisionPipeline(turn, ctx)) {
      if (verbose) {
        console.log(`  [${event.phase}] ${event.kind}`, JSON.stringify(event.payload).slice(0, 120));
      }
      if (event.kind === "act.completed") {
        const p = event.payload as { decision?: Decision };
        if (p.decision) decisions.push(p.decision);
      }
      if (event.kind === "reason.complete") {
        const p = event.payload as { output?: { needs_clarification?: boolean; request_type?: string } };
        if (p.output?.needs_clarification) needsClarification = true;
        if (p.output?.request_type) requestType = p.output.request_type;
      }
      if (event.kind === "safemode.fired") {
        safeModeFired = true;
      }
    }
  } catch (err) {
    error = String(err);
  }

  const verdicts = decisions.map((d) => d.verdict);

  // Determine the dominant verdict:
  // - If actions were scored, use highest-priority verdict from P3
  // - "question" / "chit_chat" request_type with no actions → SILENT (LLM answered but didn't act)
  // - safe-mode no-action path with needs_clarification → CLARIFY
  const got = verdicts.length > 0
    ? (verdicts.includes("REFUSE") ? "REFUSE"
       : verdicts.includes("CONFIRM") ? "CONFIRM"
       : verdicts.includes("CLARIFY") ? "CLARIFY"
       : verdicts.includes("NOTIFY") ? "NOTIFY"
       : verdicts.includes("SILENT") ? "SILENT"
       : verdicts[0])
    : error ? "ERROR"
    : (requestType === "question" || requestType === "chit_chat") ? "SILENT"
    : needsClarification ? "CLARIFY"
    : safeModeFired ? "CLARIFY"  // safe-mode fired but parse also failed → treat as CLARIFY (safest outcome)
    : "UNKNOWN";

  const pass = got === s.expected_verdict;

  return {
    id: s.id,
    title: s.title,
    category: s.category,
    expected: s.expected_verdict,
    got,
    pass,
    verdicts,
    durationMs: Date.now() - start,
    error,
  };
}

// ---------------------------------------------------------------------------
// Reporter
// ---------------------------------------------------------------------------

function printResult(r: TestResult) {
  const icon = r.pass ? "✓" : "✗";
  const status = r.pass ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  const dur = `${r.durationMs}ms`;

  console.log(`  ${icon} [${r.category.padEnd(10)}] ${r.title.padEnd(35)} ${status}  expected=${r.expected.padEnd(10)} got=${r.got.padEnd(10)}  ${dur}`);

  if (!r.pass || r.error) {
    if (r.error) console.log(`      ERROR: ${r.error}`);
    if (r.verdicts.length > 1) console.log(`      all verdicts: ${r.verdicts.join(", ")}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  if (!apiKey && !noLlm) {
    console.error("Error: ANTHROPIC_API_KEY env var is required. Use --no-llm to skip LLM calls.");
    process.exit(1);
  }

  const scenarios = (scenariosRaw as ScenarioJSON[]).filter(
    (s) => !filterScenario || s.id === filterScenario
  );

  if (scenarios.length === 0) {
    console.error(`No scenario found with id: ${filterScenario}`);
    process.exit(1);
  }

  console.log(`\nalfred_ pipeline test harness`);
  console.log(`Running ${scenarios.length} scenario(s)...\n`);

  const results: TestResult[] = [];

  for (const s of scenarios) {
    if (noLlm) {
      results.push({
        id: s.id, title: s.title, category: s.category,
        expected: s.expected_verdict, got: "SKIPPED",
        pass: false, verdicts: [], durationMs: 0,
      });
      printResult({ id: s.id, title: s.title, category: s.category,
        expected: s.expected_verdict, got: "SKIPPED", pass: false, verdicts: [], durationMs: 0 });
      continue;
    }

    process.stdout.write(`  Running: ${s.title}...\r`);
    const result = await runScenario(s, apiKey);
    printResult(result);
    results.push(result);
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass && r.got !== "SKIPPED").length;
  const skipped = results.filter((r) => r.got === "SKIPPED").length;

  console.log(`\n${"─".repeat(80)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped / ${results.length} total`);

  if (failed > 0) {
    console.log(`\nFailed scenarios:`);
    results.filter((r) => !r.pass && r.got !== "SKIPPED").forEach((r) => {
      console.log(`  • ${r.id}: expected ${r.expected}, got ${r.got}`);
    });
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
