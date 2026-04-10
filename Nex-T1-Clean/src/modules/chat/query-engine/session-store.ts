/**
 * Internal Session Store
 *
 * Map management, TTL cleanup, and eviction logic for the session state manager.
 */

import type { SessionState, SessionStatus } from "./session";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_ACTIVE_SESSIONS = 500;
const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour
const CLEANUP_INTERVAL_MS = 60 * 1000; // sweep every 60 s

// ---------------------------------------------------------------------------
// Internal store
// ---------------------------------------------------------------------------

export const sessions = new Map<string, SessionState>();
export const listeners = new Map<string, Set<(state: SessionState) => void>>();

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

// ---------------------------------------------------------------------------
// Lifecycle helpers
// ---------------------------------------------------------------------------

function isStale(session: SessionState, now: number): boolean {
  return now - session.lastActivityTime > SESSION_TTL_MS;
}

function evictStaleSessions(): void {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (isStale(session, now)) {
      sessions.delete(id);
      listeners.delete(id);
    }
  }
  stopCleanupIfEmpty();
}

export function ensureCleanupScheduled(): void {
  if (cleanupTimer !== null) return;
  cleanupTimer = setInterval(evictStaleSessions, CLEANUP_INTERVAL_MS);
  if (typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

export function stopCleanupIfEmpty(): void {
  if (sessions.size > 0 || cleanupTimer === null) return;
  clearInterval(cleanupTimer);
  cleanupTimer = null;
}

/**
 * When the store is at capacity, evict the oldest idle session that is in a
 * terminal status first, then fall back to the least-recently-active session.
 */
export function evictOneIfAtCapacity(): void {
  if (sessions.size < MAX_ACTIVE_SESSIONS) return;

  const terminalStatuses: ReadonlySet<SessionStatus> = new Set([
    "completed",
    "failed",
    "cancelled",
  ]);

  let candidate: string | null = null;
  let candidateTime = Infinity;

  for (const [id, s] of sessions) {
    if (terminalStatuses.has(s.status) && s.lastActivityTime < candidateTime) {
      candidate = id;
      candidateTime = s.lastActivityTime;
    }
  }

  if (candidate === null) {
    for (const [id, s] of sessions) {
      if (s.lastActivityTime < candidateTime) {
        candidate = id;
        candidateTime = s.lastActivityTime;
      }
    }
  }

  if (candidate !== null) {
    sessions.delete(candidate);
    listeners.delete(candidate);
  }
}

export function notifyListeners(sessionId: string, state: SessionState): void {
  const set = listeners.get(sessionId);
  if (!set || set.size === 0) return;
  for (const fn of set) {
    try {
      fn(state);
    } catch {
      // Listener errors must not break the update path.
    }
  }
}

/**
 * Tear down the session store entirely. Clears all sessions, listeners,
 * and the cleanup timer.
 */
export function destroySessionStore(): void {
  sessions.clear();
  listeners.clear();
  if (cleanupTimer !== null) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
