/**
 * Nex Pipeline Telemetry -- Metric Definitions
 *
 * Domain: Chat Pipeline Observability
 * Responsibility: Defines counters, histograms, and gauges for the chat
 *                 pipeline using the OpenTelemetry Metrics API.
 *
 * Depends on: @opentelemetry/api (available in this project)
 *
 * All metric names are prefixed with `nex.pipeline.` to avoid collisions.
 */

import { metrics, type Counter, type Histogram, type ObservableGauge } from "@opentelemetry/api";

// ---------------------------------------------------------------------------
// Meter
// ---------------------------------------------------------------------------

const METER_NAME = "nex.pipeline";
const METER_VERSION = "1.0.0";

function getMeter() {
  return metrics.getMeter(METER_NAME, METER_VERSION);
}

// ---------------------------------------------------------------------------
// Token Counters
// ---------------------------------------------------------------------------

let _inputTokensTotal: Counter | null = null;
let _outputTokensTotal: Counter | null = null;
let _cacheReadTokensTotal: Counter | null = null;
let _cacheCreationTokensTotal: Counter | null = null;

export function getInputTokensCounter(): Counter {
  if (!_inputTokensTotal) {
    _inputTokensTotal = getMeter().createCounter("nex.pipeline.input_tokens_total", {
      description: "Total input tokens consumed across all models",
      unit: "tokens",
    });
  }
  return _inputTokensTotal;
}

export function getOutputTokensCounter(): Counter {
  if (!_outputTokensTotal) {
    _outputTokensTotal = getMeter().createCounter("nex.pipeline.output_tokens_total", {
      description: "Total output tokens produced across all models",
      unit: "tokens",
    });
  }
  return _outputTokensTotal;
}

export function getCacheReadTokensCounter(): Counter {
  if (!_cacheReadTokensTotal) {
    _cacheReadTokensTotal = getMeter().createCounter("nex.pipeline.cache_read_tokens_total", {
      description: "Total cache-read input tokens (cache hits)",
      unit: "tokens",
    });
  }
  return _cacheReadTokensTotal;
}

export function getCacheCreationTokensCounter(): Counter {
  if (!_cacheCreationTokensTotal) {
    _cacheCreationTokensTotal = getMeter().createCounter("nex.pipeline.cache_creation_tokens_total", {
      description: "Total cache-creation input tokens (cache writes)",
      unit: "tokens",
    });
  }
  return _cacheCreationTokensTotal;
}

// ---------------------------------------------------------------------------
// Cost Gauge (observable -- pulled from SessionCostTracker)
// ---------------------------------------------------------------------------

/**
 * Callback map: sessionId -> latest cost value. Set by the exporter.
 *
 * Entries are evicted when they exceed MAX_SESSION_COST_ENTRIES to prevent
 * unbounded memory growth in long-running processes.
 */
const MAX_SESSION_COST_ENTRIES = 10_000;
const sessionCostValues = new Map<string, { costUsd: number; model: string }>();
let _sessionCostGauge: ObservableGauge | null = null;

export function registerSessionCost(sessionId: string, model: string, costUsd: number): void {
  sessionCostValues.set(sessionId, { costUsd, model });

  // Evict oldest entries when the map grows too large
  if (sessionCostValues.size > MAX_SESSION_COST_ENTRIES) {
    const iter = sessionCostValues.keys();
    const oldest = iter.next().value;
    if (oldest !== undefined) {
      sessionCostValues.delete(oldest);
    }
  }
}

/** Removes a session's cost entry. Call during session teardown. */
export function unregisterSessionCost(sessionId: string): void {
  sessionCostValues.delete(sessionId);
}

export function getSessionCostGauge(): ObservableGauge {
  if (!_sessionCostGauge) {
    _sessionCostGauge = getMeter().createObservableGauge("nex.pipeline.session_cost_usd", {
      description: "Accumulated session cost in USD",
      unit: "USD",
    });
    _sessionCostGauge.addCallback((result) => {
      for (const [sessionId, { costUsd, model }] of sessionCostValues) {
        result.observe(costUsd, { session_id: sessionId, model });
      }
    });
  }
  return _sessionCostGauge;
}

// ---------------------------------------------------------------------------
// Tool Metrics
// ---------------------------------------------------------------------------

let _toolExecutionsTotal: Counter | null = null;
let _toolDurationSeconds: Histogram | null = null;

export function getToolExecutionsCounter(): Counter {
  if (!_toolExecutionsTotal) {
    _toolExecutionsTotal = getMeter().createCounter("nex.pipeline.tool_executions_total", {
      description: "Total tool executions",
      unit: "executions",
    });
  }
  return _toolExecutionsTotal;
}

export function getToolDurationHistogram(): Histogram {
  if (!_toolDurationSeconds) {
    _toolDurationSeconds = getMeter().createHistogram("nex.pipeline.tool_duration_seconds", {
      description: "Tool execution duration in seconds",
      unit: "s",
    });
  }
  return _toolDurationSeconds;
}

// ---------------------------------------------------------------------------
// Hook Metrics
// ---------------------------------------------------------------------------

let _hookExecutionsTotal: Counter | null = null;
let _hookDurationSeconds: Histogram | null = null;

export function getHookExecutionsCounter(): Counter {
  if (!_hookExecutionsTotal) {
    _hookExecutionsTotal = getMeter().createCounter("nex.pipeline.hook_executions_total", {
      description: "Total hook executions",
      unit: "executions",
    });
  }
  return _hookExecutionsTotal;
}

export function getHookDurationHistogram(): Histogram {
  if (!_hookDurationSeconds) {
    _hookDurationSeconds = getMeter().createHistogram("nex.pipeline.hook_duration_seconds", {
      description: "Hook execution duration in seconds",
      unit: "s",
    });
  }
  return _hookDurationSeconds;
}

// ---------------------------------------------------------------------------
// Compaction Metrics
// ---------------------------------------------------------------------------

let _compactionTriggersTotal: Counter | null = null;
let _compactionDurationSeconds: Histogram | null = null;

export function getCompactionTriggersCounter(): Counter {
  if (!_compactionTriggersTotal) {
    _compactionTriggersTotal = getMeter().createCounter("nex.pipeline.compaction_triggers_total", {
      description: "Total compaction triggers",
      unit: "triggers",
    });
  }
  return _compactionTriggersTotal;
}

export function getCompactionDurationHistogram(): Histogram {
  if (!_compactionDurationSeconds) {
    _compactionDurationSeconds = getMeter().createHistogram("nex.pipeline.compaction_duration_seconds", {
      description: "Compaction duration in seconds",
      unit: "s",
    });
  }
  return _compactionDurationSeconds;
}

// ---------------------------------------------------------------------------
// Cache Hit Rate (observable gauge, pulled from cost tracker summary)
// ---------------------------------------------------------------------------

let _cacheHitRateGauge: ObservableGauge | null = null;
let _cacheHitRateValue = 0;

export function updateCacheHitRate(rate: number): void {
  _cacheHitRateValue = Math.max(0, Math.min(1, rate));
}

export function getCacheHitRateGauge(): ObservableGauge {
  if (!_cacheHitRateGauge) {
    _cacheHitRateGauge = getMeter().createObservableGauge("nex.pipeline.cache_hit_rate", {
      description: "Fraction of cacheable tokens that were cache hits (0-1)",
      unit: "ratio",
    });
    _cacheHitRateGauge.addCallback((result) => {
      result.observe(_cacheHitRateValue);
    });
  }
  return _cacheHitRateGauge;
}

// ---------------------------------------------------------------------------
// Convenience: Record a full turn of token usage
// ---------------------------------------------------------------------------

export function recordTokenUsage(params: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}): void {
  const labels = { model: params.model };
  getInputTokensCounter().add(params.inputTokens, labels);
  getOutputTokensCounter().add(params.outputTokens, labels);
  getCacheReadTokensCounter().add(params.cacheReadTokens, labels);
  getCacheCreationTokensCounter().add(params.cacheCreationTokens, labels);
}

export function recordToolExecution(params: {
  toolName: string;
  status: "success" | "error" | "timeout" | "blocked";
  durationMs: number;
}): void {
  const labels = { tool_name: params.toolName, status: params.status };
  getToolExecutionsCounter().add(1, labels);
  getToolDurationHistogram().record(params.durationMs / 1000, labels);
}

export function recordHookExecution(params: {
  event: string;
  outcome: string;
  durationMs: number;
}): void {
  const labels = { event: params.event, outcome: params.outcome };
  getHookExecutionsCounter().add(1, labels);
  getHookDurationHistogram().record(params.durationMs / 1000, labels);
}

export function recordCompaction(durationMs: number): void {
  getCompactionTriggersCounter().add(1);
  getCompactionDurationHistogram().record(durationMs / 1000);
}
