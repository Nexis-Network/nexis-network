/**
 * Per-Model Cost Tracker
 *
 * Tracks token usage and costs per model, per session, with cache accounting.
 * Pricing logic is in cost-pricing.ts.
 */

import { calculateCost, sanitizeTokenCount } from "./cost-pricing";
import type { ModelUsage, TurnUsage, SessionCostSummary } from "./cost-pricing";

// ---------------------------------------------------------------------------
// Re-exports for barrel compatibility
// ---------------------------------------------------------------------------

export type { ModelPricing, ModelUsage, TurnUsage, SessionCostSummary } from "./cost-pricing";
export { getPricing, calculateCost } from "./cost-pricing";

// ---------------------------------------------------------------------------
// Session Cost Tracker
// ---------------------------------------------------------------------------

const MAX_RETAINED_TURNS = 500;
const MAX_SESSIONS = 10_000;
const SESSION_TTL_MS = 4 * 60 * 60 * 1_000;
const EVICTION_SWEEP_INTERVAL_MS = 60_000;

const sessionTrackers = new Map<string, SessionCostTracker>();
let lastEvictionSweep = Date.now();

function evictExpiredSessions(): void {
  const now = Date.now();
  if (now - lastEvictionSweep < EVICTION_SWEEP_INTERVAL_MS) return;
  lastEvictionSweep = now;

  const cutoff = now - SESSION_TTL_MS;
  for (const [id, tracker] of sessionTrackers) {
    if (tracker.createdAtMs < cutoff) {
      sessionTrackers.delete(id);
    }
  }
}

function evictOldestIfNeeded(): void {
  if (sessionTrackers.size <= MAX_SESSIONS) return;

  let oldestId: string | null = null;
  let oldestTime = Infinity;
  for (const [id, tracker] of sessionTrackers) {
    if (tracker.createdAtMs < oldestTime) {
      oldestTime = tracker.createdAtMs;
      oldestId = id;
    }
  }
  if (oldestId) {
    sessionTrackers.delete(oldestId);
  }
}

export class SessionCostTracker {
  readonly sessionId: string;
  readonly createdAtMs: number;

  private modelUsage: Map<string, ModelUsage> = new Map();
  private turns: TurnUsage[] = [];
  private startedAt: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.createdAtMs = Date.now();
    this.startedAt = new Date(this.createdAtMs).toISOString();
  }

  recordTurn(args: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens?: number;
    cacheCreationInputTokens?: number;
    reasoningTokens?: number;
    durationMs: number;
  }): TurnUsage {
    const safeInput = sanitizeTokenCount(args.inputTokens);
    const safeOutput = sanitizeTokenCount(args.outputTokens);
    const cacheRead = sanitizeTokenCount(args.cacheReadInputTokens ?? 0);
    const cacheCreation = sanitizeTokenCount(args.cacheCreationInputTokens ?? 0);
    const reasoning = sanitizeTokenCount(args.reasoningTokens ?? 0);
    const durationMs = Number.isFinite(args.durationMs) ? Math.max(0, args.durationMs) : 0;

    const costUsd = calculateCost(args.model, safeInput, safeOutput, cacheRead, cacheCreation);

    const existing = this.modelUsage.get(args.model) ?? {
      inputTokens: 0, outputTokens: 0, cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0, reasoningTokens: 0, totalCostUsd: 0,
    };

    existing.inputTokens += safeInput;
    existing.outputTokens += safeOutput;
    existing.cacheReadInputTokens += cacheRead;
    existing.cacheCreationInputTokens += cacheCreation;
    existing.reasoningTokens += reasoning;
    existing.totalCostUsd += costUsd;
    this.modelUsage.set(args.model, existing);

    const turn: TurnUsage = {
      model: args.model, inputTokens: safeInput, outputTokens: safeOutput,
      cacheReadInputTokens: cacheRead, cacheCreationInputTokens: cacheCreation,
      reasoningTokens: reasoning, costUsd, durationMs,
      turnNumber: this.getTotalTurnCount() + 1,
      timestamp: new Date().toISOString(),
    };

    this.turns.push(turn);
    if (this.turns.length > MAX_RETAINED_TURNS) {
      this.turns = this.turns.slice(-MAX_RETAINED_TURNS);
    }

    return turn;
  }

  private getTotalTurnCount(): number {
    if (this.turns.length > 0) {
      return this.turns[this.turns.length - 1].turnNumber;
    }
    return 0;
  }

  getSummary(): SessionCostSummary {
    let totalCostUsd = 0, totalInputTokens = 0, totalOutputTokens = 0;
    let totalCacheReadTokens = 0, totalCacheCreationTokens = 0, totalReasoningTokens = 0;
    const modelBreakdown: Record<string, ModelUsage> = {};

    for (const [model, usage] of this.modelUsage) {
      modelBreakdown[model] = { ...usage };
      totalCostUsd += usage.totalCostUsd;
      totalInputTokens += usage.inputTokens;
      totalOutputTokens += usage.outputTokens;
      totalCacheReadTokens += usage.cacheReadInputTokens;
      totalCacheCreationTokens += usage.cacheCreationInputTokens;
      totalReasoningTokens += usage.reasoningTokens;
    }

    const totalCacheParticipating = totalCacheReadTokens + totalCacheCreationTokens;
    const cacheHitRate = totalCacheParticipating > 0
      ? totalCacheReadTokens / totalCacheParticipating : 0;

    return {
      sessionId: this.sessionId, totalCostUsd, totalInputTokens, totalOutputTokens,
      totalCacheReadTokens, totalCacheCreationTokens, totalReasoningTokens,
      turnCount: this.getTotalTurnCount(), modelBreakdown, cacheHitRate,
      turns: [...this.turns], startedAt: this.startedAt,
      updatedAt: new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getOrCreateSessionTracker(sessionId: string): SessionCostTracker {
  evictExpiredSessions();
  let tracker = sessionTrackers.get(sessionId);
  if (!tracker) {
    evictOldestIfNeeded();
    tracker = new SessionCostTracker(sessionId);
    sessionTrackers.set(sessionId, tracker);
  }
  return tracker;
}

export function getSessionCostSummary(sessionId: string): SessionCostSummary | null {
  const tracker = sessionTrackers.get(sessionId);
  return tracker?.getSummary() ?? null;
}

export function clearSessionTracker(sessionId: string): void {
  sessionTrackers.delete(sessionId);
}

/** Returns the number of active session trackers. Useful for monitoring. */
export function getActiveSessionCount(): number {
  return sessionTrackers.size;
}
