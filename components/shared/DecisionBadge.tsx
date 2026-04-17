import type { Verdict } from "@/types/decision";

interface DecisionBadgeProps {
  verdict: Verdict;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const VERDICT_LABELS: Record<Verdict, string> = {
  SILENT:  "SILENT",
  NOTIFY:  "NOTIFY",
  CONFIRM: "CONFIRM",
  CLARIFY: "CLARIFY",
  REFUSE:  "REFUSE",
};

/**
 * Colored chip badge for a decision verdict.
 * Maps verdict to the design system decision color variables.
 * Source: UI-UX-DESIGN.md §2
 */
export function DecisionBadge({
  verdict,
  size = "sm",
  className = "",
}: DecisionBadgeProps) {
  const sizeClass =
    size === "lg"
      ? "px-3 py-1.5 text-sm font-semibold tracking-wider"
      : size === "md"
      ? "px-2.5 py-1 text-xs font-semibold tracking-wider"
      : "px-2 py-0.5 text-xs font-medium tracking-wider";

  return (
    <span
      className={`
        inline-flex items-center rounded border font-mono
        ${sizeClass}
        verdict-${verdict.toLowerCase()}
        ${className}
      `}
    >
      {VERDICT_LABELS[verdict]}
    </span>
  );
}
