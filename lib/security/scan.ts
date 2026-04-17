/**
 * Injection scanner — P0 parallel scan.
 * Runs all patterns against the raw user message and returns any flags.
 *
 * This is non-blocking: the caller invokes it concurrently with P1/P2.
 * The resulting flags feed into DecisionContext.injection_flags.
 *
 * Canonical source: DECISION_LAYER.md §16
 * House rule: try/catch around every call (DESIGN.md §2.2)
 */

import type { InjectionFlag } from "@/types/decision";
import { INJECTION_PATTERNS } from "./injection_patterns";

/**
 * Scan a string for injection patterns.
 * Returns all matches — caller decides what to do with severity.
 * Never throws.
 *
 * @param text - Concatenated user message text (and any attachment text if present)
 * @returns Array of InjectionFlag, empty if clean
 */
export function scanForInjections(text: string): InjectionFlag[] {
  try {
    const flags: InjectionFlag[] = [];

    for (const { label, pattern, severity } of INJECTION_PATTERNS) {
      try {
        const match = pattern.exec(text);
        if (match) {
          flags.push({
            pattern:      label,
            severity,
            matched_text: match[0].slice(0, 120), // cap match length for log safety
          });
        }
      } catch (patternErr) {
        // A single bad pattern should not abort the whole scan
        flags.push({
          pattern:      label,
          severity:     "low",
          matched_text: `[pattern error: ${patternErr instanceof Error ? patternErr.message : String(patternErr)}]`,
        });
      }
    }

    return flags;
  } catch (err) {
    // Complete scan failure — return a low-severity flag so the trace records it
    return [
      {
        pattern:      "scan_failure",
        severity:     "low",
        matched_text: `[scan failed: ${err instanceof Error ? err.message : String(err)}]`,
      },
    ];
  }
}

/**
 * Convenience: returns true if any flag in the set is high severity.
 * Used by SignalSet.injection_detected computation in signals.ts.
 */
export function hasHighSeverityFlag(flags: InjectionFlag[]): boolean {
  return flags.some((f) => f.severity === "high");
}
