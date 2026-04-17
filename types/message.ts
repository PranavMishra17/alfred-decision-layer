/**
 * Chat message types.
 * Canonical source: UI-UX-DESIGN.md §4.2
 */

import type { Verdict, Decision, ClarificationSpec } from "./decision";

export type MessageRole = "user" | "assistant" | "context";

/** A context message injected from a preloaded scenario (rendered read-only). */
export type ContextMessage = {
  kind: "context";
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;         // ISO-8601
};

/** The user's own live instruction message. */
export type UserMessage = {
  kind: "user";
  id: string;
  content: string;
  attachments: Attachment[];
  timestamp: number;         // Date.now()
};

/** An attachment sent with a user message. */
export type Attachment = {
  name: string;
  type: "pdf" | "txt" | "md" | "image";
  size_bytes: number;
  /** base64 or raw text depending on type */
  content: string;
};

/**
 * alfred_'s response — a group of per-action outcome cards.
 * One AssistantMessage per user turn, but it may contain
 * multiple action cards (multi-intent).
 */
export type AssistantMessage = {
  kind: "assistant";
  id: string;
  run_id: string;
  turn_id: string;
  action_cards: ActionCard[];
  timestamp: number;
};

/** One card per action produced by a turn. */
export type ActionCard =
  | SilentCard
  | SilentDupeCard
  | NotifyCard
  | ConfirmCard
  | ClarifyCard
  | RefuseCard;

type BaseCard = {
  action_id: string;
  verdict: Verdict;
  decision: Decision;
};

export type SilentCard = BaseCard & {
  verdict: "SILENT";
};

export type SilentDupeCard = BaseCard & {
  verdict: "SILENT_DUPE";
  original_turn_id: string;
};

export type NotifyCard = BaseCard & {
  verdict: "NOTIFY";
  summary: string;
  /** ms timestamp when the tool call fires; set on card creation */
  fires_at: number;
  /** "pending" | "executed" | "cancelled" */
  timer_state: "pending" | "executed" | "cancelled";
};

export type ConfirmCard = BaseCard & {
  verdict: "CONFIRM";
  summary: string;
  obligation_context: string | null; // cites the conflict obligation if any
  /** "awaiting" | "confirmed" | "cancelled" */
  confirm_state: "awaiting" | "confirmed" | "cancelled";
};

export type ClarifyCard = BaseCard & {
  verdict: "CLARIFY";
  spec: ClarificationSpec;
  /** "awaiting" | "submitted" */
  clarify_state: "awaiting" | "submitted";
};

export type RefuseCard = BaseCard & {
  verdict: "REFUSE";
  explanation: string;
};

/** Union of all chat message types. */
export type ChatMessage = ContextMessage | UserMessage | AssistantMessage;
