/**
 * Nex Pipeline Telemetry -- Barrel Export + Initialization
 *
 * Domain: Chat Pipeline Observability
 * Responsibility: Single entry point to initialize the telemetry subsystem,
 *                 register metric instruments, and provide a session summary.
 *
 * Usage:
 *   import { initTelemetry, getTelemetrySummary } from "@/modules/chat/middleware/telemetry";
 *   const teardown = initTelemetry({ sessionId, userId });
 *   // ... run pipeline ...
 *   const summary = getTelemetrySummary(sessionId);
 *   teardown();
 */

import { logger } from "@/lib/logger";
import type { TraceContext } from "../../langfuse-tracing";
import { getSessionCostSummary, type SessionCostSummary } from "../cost-tracker";
import type { AggregatedHookResult } from "../types";

import {
  recordTokenUsage,
  recordToolExecution,
  recordHookExecution,
  recordCompaction,
  registerSessionCost,
  unregisterSessionCost,
  updateCacheHitRate,
  getSessionCostGauge,
  getCacheHitRateGauge,
} from "./metrics";

import {
  logToolUseEvent,
  logHookExecutionEvent,
  logCompactionEvent,
  logSessionLifecycleEvent,
} from "./events";

import {
  exportMetrics,
  startPeriodicFlush,
  stopPeriodicFlush,
  finalFlush,
  type MetricsSnapshot,
} from "./exporter";

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export {
  // Metrics
  recordTokenUsage,
  recordToolExecution,
  recordHookExecution,
  recordCompaction,
  registerSessionCost,
  unregisterSessionCost,
  updateCacheHitRate,
} from "./metrics";

export {
  // Events
  logPipelineEvent,
  logToolUseEvent,
  logHookExecutionEvent,
  logCompactionEvent,
  logSessionLifecycleEvent,
  logMcpConnectionEvent,
  logSubagentSpawnEvent,
  logMemoryAccessEvent,
  getBufferedEvents,
  clearEventBuffer,
  type PipelineEvent,
  type PipelineEventType,
  PIPELINE_EVENT_TYPES,
} from "./events";

export {
  // Exporter
  exportMetrics,
  exportToLangfuse,
  exportToSentry,
  startPeriodicFlush,
  stopPeriodicFlush,
  finalFlush,
  type MetricsSnapshot,
} from "./exporter";

// ---------------------------------------------------------------------------
// Initialization Config
// ---------------------------------------------------------------------------

export type TelemetryConfig = {
  sessionId: string;
  userId?: string | null;
  /** Langfuse trace context for forwarding metrics. Null to skip. */
  langfuseTrace?: TraceContext | null;
  /** Enable Sentry breadcrumb integration (default: false). */
  sentryEnabled?: boolean;
  /** Periodic flush interval in ms (default: 60_000). Set 0 to disable. */
  flushIntervalMs?: number;
};

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Initializes the telemetry subsystem for a pipeline session.
 *
 * - Ensures observable gauges are registered (idempotent).
 * - Emits a session_start event.
 * - Optionally starts a periodic flush loop.
 *
 * @returns A teardown function that performs a final flush and cleanup.
 */
export function initTelemetry(config: TelemetryConfig): () => MetricsSnapshot {
  const {
    sessionId,
    userId = null,
    langfuseTrace = null,
    sentryEnabled = false,
    flushIntervalMs = 60_000,
  } = config;

  // Force-register observable gauges so they are active from the start
  getSessionCostGauge();
  getCacheHitRateGauge();

  // Emit session start event
  logSessionLifecycleEvent({
    type: "session_start",
    sessionId,
    userId,
  });

  // Start periodic flush if requested
  if (flushIntervalMs > 0) {
    startPeriodicFlush({
      intervalMs: flushIntervalMs,
      sessionId,
      langfuseTrace,
      sentryEnabled,
    });
  }

  logger.debug("[nex-telemetry] Initialized", { sessionId });

  // Guard against double-teardown
  let tornDown = false;

  // Return teardown
  return () => {
    if (tornDown) {
      logger.debug("[nex-telemetry] Teardown already called, returning empty snapshot", { sessionId });
      return exportMetrics(sessionId);
    }
    tornDown = true;

    const endSummary = getSessionCostSummary(sessionId);
    logSessionLifecycleEvent({
      type: "session_end",
      sessionId,
      userId,
      totalCostUsd: endSummary?.totalCostUsd,
      totalTurns: endSummary?.turnCount,
    });

    const snapshot = finalFlush(sessionId, langfuseTrace);

    // Clean up session cost gauge entries to prevent memory leaks
    unregisterSessionCost(sessionId);

    return snapshot;
  };
}

// ---------------------------------------------------------------------------
// Session Summary (for UI display)
// ---------------------------------------------------------------------------

export type TelemetrySummary = {
  sessionId: string;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  cacheHitRate: number;
  turnCount: number;
  modelBreakdown: SessionCostSummary["modelBreakdown"];
};

/**
 * Returns a lightweight summary of session cost and usage,
 * suitable for rendering in a session info panel.
 */
export function getTelemetrySummary(sessionId: string): TelemetrySummary | null {
  const summary = getSessionCostSummary(sessionId);
  if (!summary) {
    return null;
  }

  return {
    sessionId: summary.sessionId,
    totalCostUsd: summary.totalCostUsd,
    totalInputTokens: summary.totalInputTokens,
    totalOutputTokens: summary.totalOutputTokens,
    cacheHitRate: summary.cacheHitRate,
    turnCount: summary.turnCount,
    modelBreakdown: summary.modelBreakdown,
  };
}

// ---------------------------------------------------------------------------
// Middleware Hook Helpers
// ---------------------------------------------------------------------------

/**
 * Records telemetry from an aggregated hook result.
 * Call this after dispatchHooks() completes.
 */
export function recordHookResults(
  sessionId: string | null,
  userId: string | null,
  hookEvent: string,
  results: AggregatedHookResult,
): void {
  for (const result of results.results) {
    recordHookExecution({
      event: hookEvent,
      outcome: result.outcome,
      durationMs: result.durationMs,
    });

    logHookExecutionEvent({
      sessionId,
      userId,
      hookEvent,
      outcome: result.outcome,
      durationMs: result.durationMs,
      hookName: result.hookName,
    });
  }
}

/**
 * Records telemetry for a completed tool execution.
 * Call this from the PostToolUse path.
 */
export function recordToolResult(params: {
  sessionId: string | null;
  userId: string | null;
  toolName: string;
  status: "success" | "error" | "timeout" | "blocked";
  durationMs: number;
  category?: string;
}): void {
  recordToolExecution({
    toolName: params.toolName,
    status: params.status,
    durationMs: params.durationMs,
  });

  logToolUseEvent({
    sessionId: params.sessionId,
    userId: params.userId,
    toolName: params.toolName,
    status: params.status,
    durationMs: params.durationMs,
    category: params.category,
  });
}
