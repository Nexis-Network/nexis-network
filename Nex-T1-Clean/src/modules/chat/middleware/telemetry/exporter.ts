/**
 * Nex Pipeline Telemetry -- Metrics Exporter
 *
 * Domain: Chat Pipeline Observability
 * Responsibility: Collects current metric values from the cost tracker and
 *                 event buffer, formats them as JSON for API consumption,
 *                 and provides integration points for Langfuse and Sentry.
 *
 * Depends on: ./metrics, ./events, ../cost-tracker, ../../langfuse-tracing
 */

import { logger } from "@/lib/logger";
import {
  getSessionCostSummary,
  getActiveSessionCount,
  type SessionCostSummary,
} from "../cost-tracker";
import {
  registerSessionCost,
  updateCacheHitRate,
} from "./metrics";
import {
  getBufferedEvents,
  type PipelineEvent,
} from "./events";
import { recordEvent, type TraceContext } from "../../langfuse-tracing";

// ---------------------------------------------------------------------------
// Export Shape
// ---------------------------------------------------------------------------

export type MetricsSnapshot = {
  timestamp: string;
  activeSessions: number;
  session: SessionCostSummary | null;
  recentEvents: ReadonlyArray<PipelineEvent>;
  recentEventCount: number;
};

// ---------------------------------------------------------------------------
// Core Export
// ---------------------------------------------------------------------------

/**
 * Collects a point-in-time snapshot of all telemetry for a given session.
 *
 * @param sessionId - Target session. When null, only global metrics are returned.
 * @param options   - Controls how many events to include (default 50).
 */
export function exportMetrics(
  sessionId: string | null,
  options: { maxEvents?: number } = {},
): MetricsSnapshot {
  const maxEvents = options.maxEvents ?? 50;
  const summary = sessionId ? getSessionCostSummary(sessionId) : null;

  // Sync observable gauges with latest cost tracker state
  if (summary) {
    for (const [model, usage] of Object.entries(summary.modelBreakdown)) {
      registerSessionCost(summary.sessionId, model, usage.totalCostUsd);
    }
    updateCacheHitRate(summary.cacheHitRate);
  }

  const allEvents = getBufferedEvents();
  const relevantEvents = sessionId
    ? allEvents.filter((e) => e.sessionId === sessionId)
    : allEvents;

  const recentEvents = relevantEvents.slice(-maxEvents);

  return {
    timestamp: new Date().toISOString(),
    activeSessions: getActiveSessionCount(),
    session: summary,
    recentEvents,
    recentEventCount: relevantEvents.length,
  };
}

// ---------------------------------------------------------------------------
// Langfuse Integration
// ---------------------------------------------------------------------------

/**
 * Pushes the latest metrics snapshot into a Langfuse trace as a custom event.
 * Silently no-ops when Langfuse is not configured or traceContext is null.
 */
export function exportToLangfuse(
  traceContext: TraceContext | null,
  sessionId: string,
): void {
  if (!traceContext) {
    return;
  }

  const snapshot = exportMetrics(sessionId, { maxEvents: 10 });
  if (!snapshot.session) {
    return;
  }

  recordEvent(traceContext, {
    name: "nex.pipeline.metrics_snapshot",
    level: "DEFAULT",
    metadata: {
      total_cost_usd: snapshot.session.totalCostUsd,
      total_input_tokens: snapshot.session.totalInputTokens,
      total_output_tokens: snapshot.session.totalOutputTokens,
      cache_hit_rate: snapshot.session.cacheHitRate,
      turn_count: snapshot.session.turnCount,
      active_sessions: snapshot.activeSessions,
    },
  });
}

// ---------------------------------------------------------------------------
// Sentry Breadcrumb Integration
// ---------------------------------------------------------------------------

/**
 * Adds a Sentry breadcrumb with the current session cost summary.
 * Imported dynamically to avoid hard coupling when Sentry is not configured.
 */
export async function exportToSentry(sessionId: string): Promise<void> {
  const summary = getSessionCostSummary(sessionId);
  if (!summary) {
    return;
  }

  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.addBreadcrumb({
      category: "nex.pipeline.telemetry",
      message: `Session ${sessionId}: $${summary.totalCostUsd.toFixed(4)} over ${summary.turnCount} turns`,
      level: "info",
      data: {
        totalCostUsd: summary.totalCostUsd,
        totalInputTokens: summary.totalInputTokens,
        totalOutputTokens: summary.totalOutputTokens,
        cacheHitRate: summary.cacheHitRate,
        turnCount: summary.turnCount,
      },
    });
  } catch {
    // Sentry not available -- silently ignore
  }
}

// ---------------------------------------------------------------------------
// Periodic Flush
// ---------------------------------------------------------------------------

let flushInterval: ReturnType<typeof setInterval> | null = null;

export type PeriodicFlushConfig = {
  /** Flush interval in milliseconds (default: 60_000). */
  intervalMs?: number;
  /** Session ID to flush. Required for session-scoped metrics. */
  sessionId: string;
  /** Langfuse trace context for forwarding metrics. Null to skip. */
  langfuseTrace?: TraceContext | null;
  /** Whether to also push a Sentry breadcrumb on each flush. */
  sentryEnabled?: boolean;
  /** Callback invoked with each snapshot. */
  onFlush?: (snapshot: MetricsSnapshot) => void;
};

/**
 * Starts a periodic flush loop that exports metrics at a configurable interval.
 * Only one flush loop is active at a time; calling again replaces the previous one.
 */
export function startPeriodicFlush(config: PeriodicFlushConfig): void {
  stopPeriodicFlush();

  const intervalMs = config.intervalMs ?? 60_000;

  flushInterval = setInterval(() => {
    try {
      const snapshot = exportMetrics(config.sessionId);

      if (config.langfuseTrace) {
        exportToLangfuse(config.langfuseTrace, config.sessionId);
      }

      if (config.sentryEnabled) {
        void exportToSentry(config.sessionId);
      }

      config.onFlush?.(snapshot);
    } catch (error) {
      logger.error("[nex-telemetry] Periodic flush failed", { error });
    }
  }, intervalMs);

  // Allow the Node process to exit even if flush is pending
  if (flushInterval && typeof flushInterval === "object" && "unref" in flushInterval) {
    flushInterval.unref();
  }
}

/**
 * Stops the periodic flush loop.
 */
export function stopPeriodicFlush(): void {
  if (flushInterval !== null) {
    clearInterval(flushInterval);
    flushInterval = null;
  }
}

/**
 * Performs a final flush -- exports metrics and pushes to integrations.
 * The shared event ring buffer is NOT cleared (it is self-evicting and
 * may contain events from other sessions).
 */
export function finalFlush(
  sessionId: string,
  langfuseTrace?: TraceContext | null,
): MetricsSnapshot {
  stopPeriodicFlush();

  const snapshot = exportMetrics(sessionId);

  if (langfuseTrace) {
    exportToLangfuse(langfuseTrace, sessionId);
  }

  void exportToSentry(sessionId);

  // Note: the event ring buffer is self-evicting and shared across sessions.
  // We do NOT clear it here to avoid destroying other sessions' events.
  // The ring buffer's fixed capacity (1000) prevents unbounded growth.

  return snapshot;
}
