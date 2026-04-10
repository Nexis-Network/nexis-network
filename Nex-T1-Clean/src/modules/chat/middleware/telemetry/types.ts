/**
 * Nex Pipeline Telemetry -- Shared Type Definitions
 */

// ---------------------------------------------------------------------------
// Event Types
// ---------------------------------------------------------------------------

export const PIPELINE_EVENT_TYPES = [
  "tool_use",
  "hook_execution",
  "compaction",
  "memory_access",
  "mcp_connection",
  "subagent_spawn",
  "session_start",
  "session_end",
] as const;

export type PipelineEventType = (typeof PIPELINE_EVENT_TYPES)[number];

// ---------------------------------------------------------------------------
// Event Shape
// ---------------------------------------------------------------------------

export type PipelineEvent = {
  type: PipelineEventType;
  timestamp: string;
  sessionId: string | null;
  userId: string | null;
  metadata: Record<string, string | number | boolean | null>;
};
