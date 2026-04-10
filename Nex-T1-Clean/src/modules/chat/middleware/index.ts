/**
 * Chat Pipeline Middleware System
 *
 * Enterprise-grade middleware for the agentic chat pipeline.
 *
 * Subsystems:
 * 1. Hook System — Pre/post tool execution hooks, session lifecycle hooks
 * 2. Cost Tracker — Per-model token usage and cost accounting
 * 3. Persistent Memory — Cross-session memory with 4-type taxonomy
 * 4. Auto-Compaction — Context window management via summarization
 * 5. Context Enhancer — Prompt caching boundaries and provenance tracking
 *
 * Configuration: .nex-hooks.json (project) or ~/.nex-t1/hooks.json (user)
 *
 * @example Hook configuration
 * ```json
 * {
 *   "PreToolUse": [
 *     {
 *       "matcher": "wallet_*",
 *       "hooks": [
 *         {
 *           "type": "command",
 *           "command": "echo '{\"decision\": \"block\", \"reason\": \"Wallet ops disabled\"}'"
 *         }
 *       ]
 *     }
 *   ]
 * }
 * ```
 */

// ── Hook System ──────────────────────────────────────────────────────────

export type {
  HookEvent,
  HookCommand,
  ShellHookCommand,
  HttpHookCommand,
  PromptHookCommand,
  HookMatcher,
  HooksConfig,
  HookInput,
  PreToolUseHookInput,
  PostToolUseHookInput,
  PostToolUseFailureHookInput,
  StopHookInput,
  SessionStartHookInput,
  SessionEndHookInput,
  HookOutput,
  HookDecision,
  HookResult,
  AggregatedHookResult,
} from "./types";

export { HOOK_EVENTS } from "./types";

export { loadHooksConfig, invalidateHooksConfigCache } from "./config";

export {
  dispatchHooks,
  executePreToolHooks,
  executePostToolHooks,
  executePostToolFailureHooks,
  executeStopHooks,
  executeSessionStartHooks,
  executeSessionEndHooks,
  executePreCompactHooks,
  executePostCompactHooks,
  resetOnceHookTracking,
} from "./dispatcher";

export { executeHook } from "./executor";

// ── Cost Tracker ─────────────────────────────────────────────────────────

export type {
  ModelUsage,
  ModelPricing,
  TurnUsage,
  SessionCostSummary,
} from "./cost-tracker";

export {
  SessionCostTracker,
  getOrCreateSessionTracker,
  getSessionCostSummary,
  clearSessionTracker,
  getActiveSessionCount,
  calculateCost,
  getPricing,
} from "./cost-tracker";

// ── Persistent Memory ────────────────────────────────────────────────────

export type {
  MemoryType,
  MemoryFrontmatter,
  MemoryFile,
  MemoryConfig,
  MemoryIndexEntry,
} from "./memory";

export {
  MEMORY_TYPES,
  DEFAULT_MEMORY_CONFIG,
  getMemoryDir,
  ensureMemoryDir,
  scanMemoryFiles,
  readIndex,
  buildMemoryPrompt,
  writeMemoryFile,
  updateIndex,
} from "./memory";

// ── Auto-Compaction ──────────────────────────────────────────────────────

export type {
  CompactionConfig,
  CompactionResult,
} from "./compaction";

export {
  estimateTokens,
  estimateMessagesTokens,
  microcompact,
  buildCompactionPrompt,
  compactMessages,
  shouldAutoCompact,
  recordCompactionResult,
  markCompactionInProgress,
  clearSessionState,
  getActiveSessionCount as getActiveCompactionSessionCount,
} from "./compaction";

// ── Context Enhancer ─────────────────────────────────────────────────────

export type {
  CacheScope,
  PromptSection,
  ContextProvenanceEntry,
  ContextEnhancementOptions,
} from "./context-enhancer";

export {
  SYSTEM_PROMPT_DYNAMIC_BOUNDARY,
  splitPromptAtBoundary,
  ProvenanceCollector,
  wrapInSystemReminder,
  enhanceWithMemory,
  enhanceContext,
} from "./context-enhancer";

// ── Pipeline Telemetry ──────────────────────────────────────────────────

export type {
  TelemetryConfig,
  TelemetrySummary,
  MetricsSnapshot,
  PipelineEvent,
  PipelineEventType,
} from "./telemetry";

export {
  initTelemetry,
  getTelemetrySummary,
  recordTokenUsage,
  recordToolExecution,
  recordHookExecution,
  recordCompaction,
  recordToolResult,
  recordHookResults,
  logPipelineEvent,
  logToolUseEvent,
  logHookExecutionEvent,
  logCompactionEvent,
  logSessionLifecycleEvent,
  logMcpConnectionEvent,
  logSubagentSpawnEvent,
  logMemoryAccessEvent,
  exportMetrics,
  startPeriodicFlush,
  stopPeriodicFlush,
  finalFlush,
  PIPELINE_EVENT_TYPES,
} from "./telemetry";

// ── MCP Client ──────────────────────────────────────────────────────────
export * as mcp from "./mcp";

// ── Subagent Isolation ──────────────────────────────────────────────────
export * as subagent from "./subagent";

// ── Skill/Plugin System ─────────────────────────────────────────────────
export * as skills from "./skills";
