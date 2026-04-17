import type { Metadata } from "next";
import Link from "next/link";
import { AlfredAvatar } from "@/components/shared/AlfredAvatar";
import { DecisionBadge } from "@/components/shared/DecisionBadge";
import type { Verdict } from "@/types/decision";

export const metadata: Metadata = {
  title: "alfred_ — Decision Layer",
  description:
    "When should an AI assistant act, ask, or refuse? Explore alfred_'s execution decision engine.",
};

// ---------------------------------------------------------------------------
// Decision reference strip data — no hardcoded display strings inline;
// labels and descriptions come from this config object.
// ---------------------------------------------------------------------------

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
    sees:    "A thumbs-up badge with a mind panel link",
  },
  {
    verdict: "NOTIFY",
    label:   "Execute + notify",
    when:    "Risk above silent threshold, low blast radius",
    sees:    "\"Done. Undo in 10s.\" card with countdown",
  },
  {
    verdict: "CONFIRM",
    label:   "Confirm before",
    when:    "High risk, or conflict with an open obligation",
    sees:    "Summary card with Confirm / Cancel",
  },
  {
    verdict: "CLARIFY",
    label:   "Ask first",
    when:    "Intent, entity, or required parameter unresolved",
    sees:    "MCQ dialog or input fields — inline confirm",
  },
  {
    verdict: "REFUSE",
    label:   "Refuse",
    when:    "Policy violation, injection detected, irreversible mass action",
    sees:    "Short explanation — no tool call, no clarification",
  },
];

export default function LandingPage() {
  return (
    <main
      className="min-h-dvh flex flex-col items-center justify-center px-6 py-12"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* ----------------------------------------------------------------
          Hero
      ----------------------------------------------------------------- */}
      <section
        className="w-full max-w-3xl flex flex-col items-center text-center gap-8 animate-fade-in"
      >
        {/* Wordmark + avatar */}
        <div className="flex items-center gap-3">
          <AlfredAvatar state="idle" size={48} />
          <h1
            className="font-mono text-3xl font-bold tracking-tight"
            style={{ color: "var(--accent-copper)" }}
          >
            alfred_
          </h1>
        </div>

        {/* Headline */}
        <div className="flex flex-col gap-3">
          <p
            className="font-mono text-xl font-semibold tracking-wide"
            style={{ color: "var(--text-primary)" }}
          >
            Decision Layer
          </p>
          <p
            className="font-sans text-base leading-relaxed max-w-xl mx-auto"
            style={{ color: "var(--text-secondary)" }}
          >
            When should an AI assistant act, ask, or refuse? Explore the
            execution decision engine — watch every phase of the pipeline in
            real time as alfred_ parses intent, scores risk, and selects a
            verdict.
          </p>
        </div>

        {/* CTA */}
        <Link
          href="/chat"
          id="cta-talk-to-alfred"
          className="cta-link inline-flex items-center gap-2 font-mono text-sm font-semibold
                     px-6 py-3 rounded-md animate-sand-pulse"
        >
          Talk to alfred_
          <svg
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 8h10M9 4l4 4-4 4"
              stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </Link>
      </section>

      {/* ----------------------------------------------------------------
          5-verdict reference strip
      ----------------------------------------------------------------- */}
      <section
        className="w-full max-w-3xl mt-16 animate-fade-in"
        style={{ animationDelay: "150ms", opacity: 0, animationFillMode: "forwards" }}
        aria-label="Five decision verdicts"
      >
        <p
          className="font-mono text-xs font-medium tracking-widest uppercase mb-5 text-center"
          style={{ color: "var(--text-muted)" }}
        >
          Five execution verdicts
        </p>
        <div className="flex flex-col gap-3">
          {VERDICT_STRIP.map((entry) => (
            <div
              key={entry.verdict}
              className="verdict-row flex items-start gap-4 rounded-lg px-4 py-4 border"
              style={{
                backgroundColor: "var(--bg-tertiary)",
                borderColor:     "var(--border-subtle)",
              }}
            >
              <div className="mt-0.5 shrink-0">
                <DecisionBadge verdict={entry.verdict} size="md" />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <p
                  className="font-sans text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {entry.label}
                </p>
                <p
                  className="font-sans text-xs leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span style={{ color: "var(--text-muted)" }}>When: </span>
                  {entry.when}
                </p>
                <p
                  className="font-sans text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  <span>User sees: </span>
                  {entry.sees}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------------
          Footer note
      ----------------------------------------------------------------- */}
      <footer
        className="mt-12 font-sans text-xs text-center"
        style={{ color: "var(--text-muted)" }}
      >
        Prototype — all tool calls are simulated. No real integrations.
      </footer>
    </main>
  );
}
