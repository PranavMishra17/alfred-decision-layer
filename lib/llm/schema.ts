/**
 * Zod schema for the structured JSON output returned by P2 (Sonnet).
 * This is the single source of validation truth — both reason.ts and
 * the retry prompt use this schema.
 *
 * Canonical source: DECISION_LAYER.md §7
 */

import { z } from "zod";

const ResolvedEntitySchema = z.object({
  type:       z.enum(["person", "time", "email", "amount", "location", "other"]),
  raw:        z.string(),
  resolved:   z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

const ActionSchema = z.object({
  tool:               z.string(),
  params:             z.record(z.string(), z.unknown()),
  entities:           z.array(ResolvedEntitySchema),
  entity_confidence:  z.number().min(0).max(1),
  intent_confidence:  z.number().min(0).max(1),
  conditions:         z.array(z.string()),
  conflicts_with:     z.array(z.string()),
});

const NewObligationSchema = z.object({
  action_ref: z.string(),
  condition:  z.string(),
});

const ClarificationFieldSchema = z.object({
  key:     z.string(),
  label:   z.string(),
  type:    z.enum(["text", "email", "datetime", "number"]),
  default: z.string().optional(),
});

const ClarificationOptionSchema = z.object({
  id:             z.string(),
  label:          z.string(),
  params_preview: z.record(z.string(), z.unknown()),
});

const ClarificationSpecSchema = z.object({
  style:        z.enum(["mcq", "input_fields", "mixed"]),
  question:     z.string(),
  options:      z.array(ClarificationOptionSchema).optional(),
  fields:       z.array(ClarificationFieldSchema).optional(),
  allow_custom: z.boolean(),
});

export const LLMOutputSchema = z.object({
  request_type:           z.enum(["action", "question", "chit_chat", "adversarial"]),
  actions:                z.array(ActionSchema),
  new_obligations:        z.array(NewObligationSchema),
  obligation_resolutions: z.array(z.string()),
  needs_clarification:    z.boolean(),
  clarification_specs:    z.array(ClarificationSpecSchema),
  response_draft:         z.string(),
});

export type LLMOutputRaw = z.infer<typeof LLMOutputSchema>;
