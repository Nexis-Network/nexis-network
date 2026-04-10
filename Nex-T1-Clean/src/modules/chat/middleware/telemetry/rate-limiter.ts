/**
 * Nex Telemetry Rate Limiter -- Per-Event-Type Rate Bucket Management
 *
 * Enforces a maximum number of events per minute per event type
 * to prevent runaway telemetry from overwhelming downstream systems.
 */

import type { PipelineEventType } from "./types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MAX_EVENTS_PER_MINUTE = 100;
const RATE_WINDOW_MS = 60_000;

// ---------------------------------------------------------------------------
// Internal State
// ---------------------------------------------------------------------------

type RateBucket = {
  count: number;
  windowStart: number;
};

const rateBuckets = new Map<PipelineEventType, RateBucket>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns true if the given event type has exceeded its rate limit
 * for the current window. If not rate-limited, increments the counter.
 */
export function isRateLimited(eventType: PipelineEventType): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(eventType);

  if (!bucket || now - bucket.windowStart >= RATE_WINDOW_MS) {
    rateBuckets.set(eventType, { count: 1, windowStart: now });
    return false;
  }

  if (bucket.count >= MAX_EVENTS_PER_MINUTE) {
    return true;
  }

  bucket.count++;
  return false;
}
