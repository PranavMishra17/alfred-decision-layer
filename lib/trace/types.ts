/**
 * Re-export all trace types for convenience.
 * Consumers import from "@/lib/trace/types" rather than "@/types/trace"
 * to keep the import surface clean.
 */

export type {
  TraceEvent,
  TraceEventKind,
  Phase,
} from "@/types/trace";
