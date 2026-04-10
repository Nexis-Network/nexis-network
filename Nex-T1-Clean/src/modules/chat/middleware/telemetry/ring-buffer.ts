/**
 * Nex Telemetry Ring Buffer -- Fixed-Capacity Event Storage
 *
 * O(1) insertion, O(n) ordered snapshot retrieval.
 * Prevents unbounded memory growth for pipeline events.
 */

import type { PipelineEvent } from "./types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MAX_BUFFER_SIZE = 1000;

// ---------------------------------------------------------------------------
// Internal State
// ---------------------------------------------------------------------------

const ringBuffer: Array<PipelineEvent | null> = new Array<PipelineEvent | null>(
  MAX_BUFFER_SIZE,
).fill(null);
let ringHead = 0; // next write position
let ringCount = 0; // number of items currently stored

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a readonly snapshot of buffered events in chronological order.
 */
export function getBufferedEvents(): ReadonlyArray<PipelineEvent> {
  if (ringCount === 0) return [];
  const result: PipelineEvent[] = new Array(ringCount);
  const start = (ringHead - ringCount + MAX_BUFFER_SIZE) % MAX_BUFFER_SIZE;
  for (let i = 0; i < ringCount; i++) {
    result[i] = ringBuffer[(start + i) % MAX_BUFFER_SIZE] as PipelineEvent;
  }
  return result;
}

/**
 * Clears the event buffer.
 */
export function clearEventBuffer(): void {
  ringBuffer.fill(null);
  ringHead = 0;
  ringCount = 0;
}

/**
 * Appends an event to the ring buffer, evicting the oldest if full.
 */
export function pushEvent(event: PipelineEvent): void {
  ringBuffer[ringHead] = event;
  ringHead = (ringHead + 1) % MAX_BUFFER_SIZE;
  if (ringCount < MAX_BUFFER_SIZE) {
    ringCount++;
  }
}
