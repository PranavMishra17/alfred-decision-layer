/**
 * Trace bus — in-process typed event emitter.
 * Single instance per run, consumed by the SSE route and mind panel.
 *
 * Architecture (DECISION_LAYER.md §4, §18):
 *   - append-only per run
 *   - broadcast: SSE → client, localStorage → replay
 *   - every phase emits at minimum "{phase}.started" + "{phase}.completed"
 *
 * Usage:
 *   const bus = createTraceBus(run_id)
 *   bus.emit("P2", "reason.started", { model: "claude-sonnet-4-6" })
 *   for await (const event of bus) { ... }   // async iteration
 *
 * House rule: this module has NO UI imports. It is consumed by the pipeline
 * and serialised as SSE by the route. The mind panel reads SSE, not this module.
 */

import type { TraceEvent, TraceEventKind, Phase } from "@/types/trace";

export type TraceBus = {
  /** Emit a typed event onto the bus */
  emit(phase: Phase, kind: TraceEventKind, payload?: unknown): void;
  /** All events accumulated so far, in order */
  events: TraceEvent[];
  /** subscribe a callback — returns an unsubscribe fn */
  subscribe(cb: (event: TraceEvent) => void): () => void;
  /** run_id this bus belongs to */
  run_id: string;
};

/**
 * Create a fresh trace bus for one decision run.
 * Not a singleton — each /api/decide invocation creates its own.
 */
export function createTraceBus(run_id: string): TraceBus {
  const events: TraceEvent[] = [];
  const listeners: Set<(event: TraceEvent) => void> = new Set();

  function emit(phase: Phase, kind: TraceEventKind, payload: unknown = null): void {
    const event: TraceEvent = { run_id, phase, kind, at: Date.now(), payload };
    events.push(event);
    listeners.forEach((cb) => {
      try {
        cb(event);
      } catch {
        // Listener errors must never crash the pipeline
      }
    });
  }

  function subscribe(cb: (event: TraceEvent) => void): () => void {
    listeners.add(cb);
    // Replay buffered events to late subscribers
    for (const e of events) {
      try {
        cb(e);
      } catch {
        /* ignore */
      }
    }
    return () => listeners.delete(cb);
  }

  return { run_id, events, emit, subscribe };
}

/**
 * Client-side singleton bus — used by the mind panel to receive SSE events
 * forwarded from the server route. Recreated on each new run.
 */
let _clientBus: TraceBus | null = null;

export function getClientBus(): TraceBus | null {
  return _clientBus;
}

export function initClientBus(run_id: string): TraceBus {
  _clientBus = createTraceBus(run_id);
  return _clientBus;
}

export function pushClientEvent(event: TraceEvent): void {
  if (!_clientBus || _clientBus.run_id !== event.run_id) {
    _clientBus = createTraceBus(event.run_id);
  }
  _clientBus.emit(event.phase, event.kind, event.payload);
}
