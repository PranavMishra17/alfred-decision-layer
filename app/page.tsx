import type { Metadata } from "next";
import Link from "next/link";
import { AlfredAvatar } from "@/components/shared/AlfredAvatar";
import { EasterEggAvatar } from "@/components/shared/EasterEggAvatar";
import { DecisionBadge } from "@/components/shared/DecisionBadge";
import type { Verdict } from "@/types/decision";

export const metadata: Metadata = {
  title: "alfred_ — Decision Layer",
  description:
    "When should an AI assistant act, ask, or refuse? Explore alfred_'s execution decision engine.",
};

const VERDICT_STRIP: {
  verdict: Verdict;
  label:   string;
  when:    string;
  sees:    string;
}[] = [
  {
    verdict: "SILENT",
    label:   "Execute silently",
    when:    "Risk below threshold, reversible tool, no conflicts",
    sees:    "Subtle badge — action happened, nothing to review",
  },
  {
    verdict: "NOTIFY",
    label:   "Execute + notify",
    when:    "Risk above silent threshold, low blast radius",
    sees:    "\"Done. Undo in 10s.\" card with countdown",
  },
  {
    verdict: "CONFIRM",
    label:   "Confirm before acting",
    when:    "High risk, or conflict with an open obligation",
    sees:    "Summary card with Confirm / Cancel buttons",
  },
  {
    verdict: "CLARIFY",
    label:   "Ask first",
    when:    "Intent, entity, or required parameter unresolved",
    sees:    "MCQ dialog or input fields — inline re-run",
  },
  {
    verdict: "REFUSE",
    label:   "Refuse",
    when:    "Policy violation, injection detected, irreversible mass action",
    sees:    "Short explanation — no tool call, no clarification",
  },
];

const PIPELINE_PHASES = [
  { phase: "P0", name: "Ingest",  desc: "Regex injection scan in parallel" },
  { phase: "P1", name: "Hydrate", desc: "Context assembled: tools, obligations, idempotency" },
  { phase: "P2", name: "Reason",  desc: "Sonnet parses intent → JSON with confidence scores" },
  { phase: "P3", name: "Decide",  desc: "Deterministic rule engine scores signals → verdict" },
  { phase: "P4", name: "Act",     desc: "Tool fires or waits based on verdict" },
];

export default function LandingPage() {
  return (
    <main
      className="min-h-dvh flex flex-col items-center relative overflow-hidden"
      style={{ background: "var(--bg-primary)" }}
    >
      <EasterEggAvatar />

      {/* ----------------------------------------------------------------
          Hero — full-bleed with subtle grid texture
      ----------------------------------------------------------------- */}
      <section
        className="w-full flex flex-col items-center justify-center text-center px-6 pt-24 pb-20 relative"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        {/* Faint radial glow behind hero */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -60%)",
            width: 600,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(ellipse at center, #C4A88210 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Wordmark */}
        <div className="flex items-center gap-3 mb-8 animate-fade-in">
          <AlfredAvatar state="idle" size={52} />
          <h1
            className="font-mono text-4xl font-bold tracking-tight"
            style={{ color: "var(--accent-copper)" }}
          >
            alfred_
          </h1>
        </div>

        {/* Headline stack */}
        <div
          className="flex flex-col gap-4 max-w-2xl animate-fade-in"
          style={{ animationDelay: "60ms", animationFillMode: "backwards" }}
        >
          <p
            className="font-mono text-sm font-medium tracking-widest uppercase"
            style={{ color: "var(--text-muted)" }}
          >
            Execution Decision Layer
          </p>
          <h2
            className="font-sans text-3xl font-semibold leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            When should an AI assistant act,&nbsp;ask, or refuse?
          </h2>
          <p
            className="font-sans text-base leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Every message passes through a five-phase hybrid pipeline — LLM
            reasoning paired with a deterministic policy engine. Watch every
            signal, score, and verdict in real time as alfred_ decides whether to
            act silently, confirm with you, or refuse entirely.
          </p>
        </div>

        {/* CTA row */}
        <div
          className="flex flex-col items-center gap-4 mt-10 animate-fade-in"
          style={{ animationDelay: "120ms", animationFillMode: "backwards" }}
        >
          {/* Primary CTA */}
          <Link
            href="/chat"
            id="cta-talk-to-alfred"
            className="cta-link inline-flex items-center gap-2 font-mono text-sm font-semibold
                       px-6 py-3 rounded-md animate-sand-pulse"
          >
            Talk to alfred_
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>

          {/* Secondary links */}
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/PranavMishra17/alfred-decision-layer"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 rounded border transition-colors duration-150 hover:border-[var(--text-muted)]"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)", backgroundColor: "var(--bg-secondary)" }}
            >
              {/* GitHub icon */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
              GitHub
            </a>
            <span style={{ color: "var(--border-subtle)" }}>·</span>
            <a
              href="https://portfolio-pranav-mishra-paranoid.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 rounded border transition-colors duration-150 hover:border-[var(--text-muted)]"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)", backgroundColor: "var(--bg-secondary)" }}
            >
              {/* Person icon */}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
              Pranav Mishra
            </a>
          </div>

          <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
            9 preloaded scenarios · real pipeline · open Mind Panel
          </span>
        </div>
      </section>

      {/* ----------------------------------------------------------------
          Pipeline trace — horizontal phase bar
      ----------------------------------------------------------------- */}
      <section
        className="w-full max-w-4xl px-6 pt-16 pb-12 animate-fade-in"
        style={{ animationDelay: "150ms", animationFillMode: "backwards" }}
        aria-label="Pipeline phases"
      >
        <p
          className="font-mono text-xs font-medium tracking-widest uppercase mb-6 text-center"
          style={{ color: "var(--text-muted)" }}
        >
          Five-phase pipeline
        </p>

        <div className="relative flex items-start gap-0">
          {/* Connector line */}
          <div
            aria-hidden="true"
            className="absolute top-4 left-0 right-0 h-px"
            style={{
              background: "linear-gradient(to right, transparent 0%, var(--border-subtle) 10%, var(--border-subtle) 90%, transparent 100%)",
              marginLeft: "calc(10% + 12px)",
              marginRight: "calc(10% + 12px)",
            }}
          />

          {PIPELINE_PHASES.map((p) => (
            <div key={p.phase} className="flex-1 flex flex-col items-center gap-2 px-2 relative">
              {/* Node */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-semibold z-10"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  border:          "1px solid var(--border-subtle)",
                  color:           "var(--accent-copper)",
                }}
              >
                {p.phase}
              </div>
              {/* Label */}
              <p className="font-mono text-xs font-semibold text-center" style={{ color: "var(--text-primary)" }}>
                {p.name}
              </p>
              <p className="font-sans text-[11px] leading-tight text-center hidden md:block" style={{ color: "var(--text-muted)" }}>
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------------
          Verdict reference — 2-col grid, full-width card style
      ----------------------------------------------------------------- */}
      <section
        className="w-full max-w-4xl px-6 pb-16 animate-fade-in"
        style={{ animationDelay: "200ms", animationFillMode: "backwards" }}
        aria-label="Five decision verdicts"
      >
        <p
          className="font-mono text-xs font-medium tracking-widest uppercase mb-6 text-center"
          style={{ color: "var(--text-muted)" }}
        >
          Five execution verdicts
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {VERDICT_STRIP.map((entry, index) => (
            <div
              key={entry.verdict}
              className={`verdict-row flex flex-row items-start gap-4 rounded-lg px-5 py-4 border${
                index === 4 ? " md:col-span-2 md:max-w-[50%] md:mx-auto w-full" : ""
              }`}
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor:     "var(--border-subtle)",
              }}
            >
              {/* Badge column */}
              <div className="pt-0.5 shrink-0">
                <DecisionBadge verdict={entry.verdict} size="md" />
              </div>

              {/* Text column */}
              <div className="flex flex-col gap-1 min-w-0">
                <p className="font-sans text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {entry.label}
                </p>
                <p className="font-sans text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  <span className="font-mono" style={{ color: "var(--text-muted)" }}>when </span>
                  {entry.when}
                </p>
                <p className="font-sans text-xs" style={{ color: "var(--text-muted)" }}>
                  <span className="font-mono">user sees </span>
                  {entry.sees}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------------
          Signal strip — what the pipeline measures
      ----------------------------------------------------------------- */}
      <section
        className="w-full animate-fade-in"
        style={{
          borderTop:          "1px solid var(--border-subtle)",
          animationDelay:     "250ms",
          animationFillMode:  "backwards",
        }}
        aria-label="Decision signals"
      >
        <div className="w-full max-w-4xl mx-auto px-6 py-12">
          <p
            className="font-mono text-xs font-medium tracking-widest uppercase mb-6 text-center"
            style={{ color: "var(--text-muted)" }}
          >
            Signals scored per action
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              ["tool_reversibility",  "0 · 0.5 · 1",    "Can the action be undone?"],
              ["blast_radius",        "0 → 1",           "How many people/records affected?"],
              ["entity_ambiguity",    "1 − confidence",  "Did the LLM resolve all entities?"],
              ["intent_ambiguity",    "1 − confidence",  "Is the user's intent fully clear?"],
              ["obligation_conflict", "0 or 1",          "Conflicts with an open hold?"],
              ["policy_violation",    "0 or 1",          "Hard rule: REFUSE tool or pattern?"],
              ["external_recipient",  "0 or 1",          "Outbound to non-internal address?"],
              ["stake_flags",         "money · legal · rep", "High-stakes language detected?"],
              ["injection_detected",  "0 or 1",          "Prompt injection pattern found?"],
            ].map(([name, range, desc]) => (
              <div
                key={name}
                className="flex flex-col gap-1 px-3 py-3 rounded-md"
                style={{ backgroundColor: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] truncate" style={{ color: "var(--accent-copper)" }}>
                    {name}
                  </span>
                  <span className="font-mono text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>
                    {range}
                  </span>
                </div>
                <p className="font-sans text-[11px] leading-tight" style={{ color: "var(--text-secondary)" }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------
          Footer
      ----------------------------------------------------------------- */}
      <footer
        className="w-full px-6 py-6 flex items-center justify-between"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2">
          <AlfredAvatar state="idle" size={24} />
          <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
            alfred_ decision layer
          </span>
        </div>
        <span className="font-sans text-xs" style={{ color: "var(--text-muted)" }}>
          Prototype — all tool calls are simulated.
        </span>
      </footer>
    </main>
  );
}
