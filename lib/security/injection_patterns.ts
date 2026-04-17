/**
 * Prompt injection patterns — P0 parallel scan.
 * Every pattern carries a human-readable label and a severity level.
 *
 * Only "high" severity forces REFUSE in P3 (via injection_detected signal).
 * "medium" bumps risk score by SECURITY.SEVERITY_SCORES.medium in risk.ts.
 * "low" is logged only — no decision impact.
 *
 * Canonical source: DECISION_LAYER.md §16
 * House rule: no hardcoded values — all pattern strings live here, not in scan.ts.
 */

import type { InjectionSeverity } from "@/types/decision";

export type InjectionPattern = {
  label: string;
  pattern: RegExp;
  severity: InjectionSeverity;
};

export const INJECTION_PATTERNS: InjectionPattern[] = [
  // -------------------------------------------------------------------------
  // Instruction override — high severity
  // -------------------------------------------------------------------------
  {
    label:    "instruction_override_ignore",
    pattern:  /ignore\s+(all\s+)?previous\s+instructions/i,
    severity: "high",
  },
  {
    label:    "instruction_override_disregard",
    pattern:  /disregard\s+your\s+prompt/i,
    severity: "high",
  },
  {
    label:    "instruction_override_forget",
    pattern:  /forget\s+(everything|all)\s+(you('ve|\s+have)\s+been\s+told|above)/i,
    severity: "high",
  },

  // -------------------------------------------------------------------------
  // Role hijack — high severity
  // -------------------------------------------------------------------------
  {
    label:    "role_hijack_you_are_now",
    pattern:  /you\s+are\s+now\s+a/i,
    severity: "high",
  },
  {
    label:    "role_hijack_act_as",
    pattern:  /act\s+as\s+(if\s+)?(you('re|\s+are)\s+)?a\b/i,
    severity: "high",
  },
  {
    label:    "role_hijack_pretend",
    pattern:  /pretend\s+(you\s+are|to\s+be)\s+a/i,
    severity: "high",
  },

  // -------------------------------------------------------------------------
  // System prompt leak — medium severity
  // -------------------------------------------------------------------------
  {
    label:    "system_prompt_reveal",
    pattern:  /reveal\s+your\s+(system\s+)?instructions/i,
    severity: "medium",
  },
  {
    label:    "system_prompt_show",
    pattern:  /show\s+me\s+your\s+(prompt|system\s+prompt|instructions)/i,
    severity: "medium",
  },
  {
    label:    "system_prompt_what",
    pattern:  /what\s+(is|are)\s+your\s+(system\s+)?prompt/i,
    severity: "medium",
  },

  // -------------------------------------------------------------------------
  // Credential / key exfiltration — high severity
  // -------------------------------------------------------------------------
  {
    label:    "exfiltration_api_key",
    pattern:  /send.*api[\s_-]?key/i,
    severity: "high",
  },
  {
    label:    "exfiltration_credentials",
    pattern:  /email.*credentials/i,
    severity: "high",
  },
  {
    label:    "exfiltration_password",
    pattern:  /forward.*(password|secret|token)/i,
    severity: "high",
  },

  // -------------------------------------------------------------------------
  // DAN / jailbreak markers — high severity
  // -------------------------------------------------------------------------
  {
    label:    "jailbreak_dan",
    pattern:  /\bDAN\b|do\s+anything\s+now/i,
    severity: "high",
  },
  {
    label:    "jailbreak_no_restrictions",
    pattern:  /without\s+(any\s+)?(restrictions|limitations|filters|rules)/i,
    severity: "medium",
  },

  // -------------------------------------------------------------------------
  // Suspicious meta-instructions — low severity (log only)
  // -------------------------------------------------------------------------
  {
    label:    "meta_instruction_end_prompt",
    pattern:  /\[END\s+OF\s+PROMPT\]|\[SYSTEM\]/i,
    severity: "low",
  },
  {
    label:    "meta_context_tag_abuse",
    pattern:  /<\/?context>/i,
    severity: "low",
  },
];
