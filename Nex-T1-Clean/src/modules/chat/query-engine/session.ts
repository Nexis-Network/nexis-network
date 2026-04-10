/**
 * Centralized session state manager for the QueryEngine pipeline.
 *
 * Public API: create, update, get, subscribe, summarize, remove sessions.
 * Internal store logic is delegated to session-store.ts.
 */

import {
  sessions,
  listeners,
  ensureCleanupScheduled,
  stopCleanupIfEmpty,
  evictOneIfAtCapacity,
  notifyListeners,
  destroySessionStore,
} from "./session-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SessionStatus =
  | "initializing"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export type SessionState = Readonly<{
  sessionId: string;
  turnCount: number;
  toolCallCount: number;
  totalCostUsd: number;
  startTime: number;
  lastActivityTime: number;
  status: SessionStatus;
}>;

export type SessionSummary = Readonly<{
  sessionId: string;
  status: SessionStatus;
  turnCount: number;
  toolCallCount: number;
  totalCostUsd: number;
  durationMs: number;
  idleMs: number;
}>;

type SessionUpdater = (prev: SessionState) => SessionState;
type SessionListener = (state: SessionState) => void;

// Re-export for barrel
export { destroySessionStore } from "./session-store";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Create a new session with sensible defaults. */
export function createSession(sessionId: string): SessionState {
  if (sessions.has(sessionId)) {
    return sessions.get(sessionId)!;
  }

  evictOneIfAtCapacity();

  const now = Date.now();
  const state: SessionState = Object.freeze({
    sessionId,
    turnCount: 0,
    toolCallCount: 0,
    totalCostUsd: 0,
    startTime: now,
    lastActivityTime: now,
    status: "initializing" as const,
  });

  sessions.set(sessionId, state);
  ensureCleanupScheduled();
  return state;
}

/** Apply an immutable-style update to a session. */
export function updateSession(
  sessionId: string,
  updater: SessionUpdater,
): SessionState | null {
  const prev = sessions.get(sessionId);
  if (!prev) return null;

  const raw = updater(prev);
  const next: SessionState = Object.freeze({
    ...raw,
    lastActivityTime: Date.now(),
  });

  sessions.set(sessionId, next);
  notifyListeners(sessionId, next);
  return next;
}

/** Read the current state of a session without mutating it. */
export function getSession(sessionId: string): SessionState | null {
  return sessions.get(sessionId) ?? null;
}

/** Subscribe to changes for a specific session. Returns an unsubscribe function. */
export function onSessionChange(
  sessionId: string,
  listener: SessionListener,
): () => void {
  let set = listeners.get(sessionId);
  if (!set) {
    set = new Set();
    listeners.set(sessionId, set);
  }
  set.add(listener);

  return () => {
    set!.delete(listener);
    if (set!.size === 0) {
      listeners.delete(sessionId);
    }
  };
}

/** Build a reporting summary for the given session. */
export function getSessionSummary(sessionId: string): SessionSummary | null {
  const state = sessions.get(sessionId);
  if (!state) return null;

  const now = Date.now();
  return {
    sessionId: state.sessionId,
    status: state.status,
    turnCount: state.turnCount,
    toolCallCount: state.toolCallCount,
    totalCostUsd: state.totalCostUsd,
    durationMs: now - state.startTime,
    idleMs: now - state.lastActivityTime,
  };
}

/** Remove a session explicitly (e.g. on user disconnect). */
export function removeSession(sessionId: string): boolean {
  const deleted = sessions.delete(sessionId);
  listeners.delete(sessionId);
  stopCleanupIfEmpty();
  return deleted;
}

/** Return the number of active sessions (useful for diagnostics). */
export function getActiveSessionCount(): number {
  return sessions.size;
}
