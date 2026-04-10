/**
 * Nex Pipeline Telemetry -- Structured Event Logging
 * Subsystems: ./rate-limiter.ts, ./pii-redactor.ts, ./ring-buffer.ts
 */

import { logger } from "@/lib/logger";

import { isRateLimited } from "./rate-limiter";
import { redactMetadata } from "./pii-redactor";
import { pushEvent, getBufferedEvents, clearEventBuffer } from "./ring-buffer";
import { PIPELINE_EVENT_TYPES, type PipelineEventType, type PipelineEvent } from "./types";

export { PIPELINE_EVENT_TYPES, getBufferedEvents, clearEventBuffer };
export type { PipelineEventType, PipelineEvent };

/** Log a structured, PII-redacted, rate-limited pipeline event. */
export function logPipelineEvent(event: PipelineEvent): void {
  if (isRateLimited(event.type)) {
    return;
  }

  const safeEvent: PipelineEvent = {
    ...event,
    metadata: redactMetadata(event.metadata),
  };

  pushEvent(safeEvent);

  logger.debug(`[nex-telemetry] ${safeEvent.type}`, {
    sessionId: safeEvent.sessionId,
    userId: safeEvent.userId,
    ...safeEvent.metadata,
  });
}

// ---------------------------------------------------------------------------
// Convenience Builders
// ---------------------------------------------------------------------------

export function logToolUseEvent(params: {
  sessionId: string | null;
  userId: string | null;
  toolName: string;
  status: string;
  durationMs: number;
  category?: string;
}): void {
  logPipelineEvent({
    type: "tool_use",
    timestamp: new Date().toISOString(),
    sessionId: params.sessionId,
    userId: params.userId,
    metadata: {
      tool_name: params.toolName,
      status: params.status,
      duration_ms: params.durationMs,
      category: params.category ?? null,
    },
  });
}

export function logHookExecutionEvent(params: {
  sessionId: string | null;
  userId: string | null;
  hookEvent: string;
  outcome: string;
  durationMs: number;
  hookName?: string;
}): void {
  logPipelineEvent({
    type: "hook_execution",
    timestamp: new Date().toISOString(),
    sessionId: params.sessionId,
    userId: params.userId,
    metadata: {
      hook_event: params.hookEvent,
      outcome: params.outcome,
      duration_ms: params.durationMs,
      hook_name: params.hookName ?? null,
    },
  });
}

export function logCompactionEvent(params: {
  sessionId: string | null;
  userId: string | null;
  durationMs: number;
  tokensBefore: number;
  tokensAfter: number;
}): void {
  logPipelineEvent({
    type: "compaction",
    timestamp: new Date().toISOString(),
    sessionId: params.sessionId,
    userId: params.userId,
    metadata: {
      duration_ms: params.durationMs,
      tokens_before: params.tokensBefore,
      tokens_after: params.tokensAfter,
      reduction_ratio: params.tokensBefore > 0
        ? Number(((1 - params.tokensAfter / params.tokensBefore) * 100).toFixed(1))
        : 0,
    },
  });
}

export function logSessionLifecycleEvent(params: {
  type: "session_start" | "session_end";
  sessionId: string | null;
  userId: string | null;
  model?: string;
  totalTurns?: number;
  totalCostUsd?: number;
}): void {
  logPipelineEvent({
    type: params.type,
    timestamp: new Date().toISOString(),
    sessionId: params.sessionId,
    userId: params.userId,
    metadata: {
      model: params.model ?? null,
      total_turns: params.totalTurns ?? null,
      total_cost_usd: params.totalCostUsd ?? null,
    },
  });
}

export function logMcpConnectionEvent(params: {
  sessionId: string | null;
  userId: string | null;
  serverName: string;
  status: "connected" | "disconnected" | "error";
  toolCount?: number;
}): void {
  logPipelineEvent({
    type: "mcp_connection",
    timestamp: new Date().toISOString(),
    sessionId: params.sessionId,
    userId: params.userId,
    metadata: {
      server_name: params.serverName,
      status: params.status,
      tool_count: params.toolCount ?? null,
    },
  });
}

export function logSubagentSpawnEvent(params: {
  sessionId: string | null;
  userId: string | null;
  agentType: string;
  status: "started" | "stopped" | "error";
}): void {
  logPipelineEvent({
    type: "subagent_spawn",
    timestamp: new Date().toISOString(),
    sessionId: params.sessionId,
    userId: params.userId,
    metadata: {
      agent_type: params.agentType,
      status: params.status,
    },
  });
}

export function logMemoryAccessEvent(params: {
  sessionId: string | null;
  userId: string | null;
  operation: "read" | "write" | "scan";
  memoryType?: string;
  fileCount?: number;
}): void {
  logPipelineEvent({
    type: "memory_access",
    timestamp: new Date().toISOString(),
    sessionId: params.sessionId,
    userId: params.userId,
    metadata: {
      operation: params.operation,
      memory_type: params.memoryType ?? null,
      file_count: params.fileCount ?? null,
    },
  });
}
