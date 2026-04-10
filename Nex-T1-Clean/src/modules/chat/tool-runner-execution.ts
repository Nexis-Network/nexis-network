import type { Tool, ToolExecutionOptions } from "ai";

import {
  createToolSpan,
  endToolSpan,
  type TraceContext,
} from "./langfuse-tracing";
import {
  buildAugmentedExecutionOptions,
} from "./tool-runner-context";
import {
  guardToolExecution,
  isToolExecutionGuardEnabled,
  processToolResultSecurity,
  SecurityViolationError,
} from "./tool-runner-guardrails";
import {
  checkToolPrerequisites,
  isPrerequisiteGateEnabled,
  PrerequisiteViolationError,
} from "./workflow/prerequisite-gate";
import { maybeEmitUserUpdate } from "./tool-runner-updates";
import {
  emitPayloadBatch,
  extractStreamPayloadsFromChunk,
  extractWrappedToolResult,
  toAsyncToolResultIterator,
} from "./tool-runner-payloads";
import {
  beginToolInvocation,
  emitExecutingToolPayload,
  finalizeFailedInvocation,
  finalizeSuccessfulInvocation,
} from "./tool-runner-lifecycle";
import { handleWrappedToolResult } from "./tool-runner-results";
import type { ToolPlan } from "./tool-planning";
import type { EmitInvocation, ToolEventEmitter } from "./tool-runner-types";
import { classifyToolError, isErrorContractEnabled, type ToolExecutionError } from "./errors";
import { sleep } from "workflow";
import {
  executePreToolHooks,
  executePostToolHooks,
  executePostToolFailureHooks,
} from "./middleware";
import {
  recordToolExecution,
  logToolUseEvent,
} from "./middleware/telemetry";
import { logger } from "@/lib/logger";

/**
 * Deep-merges `source` into `target`, returning a new object.
 * - Plain objects are recursively merged.
 * - Arrays are replaced (not concatenated).
 * - Primitives are replaced.
 * - Depth is capped at `maxDepth` to prevent prototype-pollution vectors.
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  maxDepth: number,
  _currentDepth = 0,
): Record<string, unknown> {
  if (_currentDepth >= maxDepth) {
    // Beyond max depth, source wins (shallow replace)
    return { ...target, ...source };
  }

  const result: Record<string, unknown> = { ...target };

  for (const key of Object.keys(source)) {
    // Block prototype-pollution vectors
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      continue;
    }

    const sourceVal = source[key];
    const targetVal = target[key];

    if (
      isPlainMergeableObject(sourceVal) &&
      isPlainMergeableObject(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
        maxDepth,
        _currentDepth + 1,
      );
    } else {
      result[key] = sourceVal;
    }
  }

  return result;
}

function isPlainMergeableObject(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    Object.getPrototypeOf(v) === Object.prototype
  );
}

/**
 * Symbol used to tag errors intentionally thrown by PreToolUse hooks
 * so we can identify them reliably without fragile string matching.
 */
const HOOK_BLOCK_SYMBOL = Symbol.for("nex:hook-block");

type RunToolExecutionArgs = {
  toolName: string;
  toolImpl: Tool;
  input: UntypedJson;
  toolContext?: ToolExecutionOptions;
  toolPlan: ToolPlan;
  emitEvent: ToolEventEmitter;
  emitInvocation: EmitInvocation;
  traceContext: TraceContext | null;
  workflowStartTime: number | null;
  lastUpdateTime: number;
  totalInvocations: number;
  completedInvocations: number;
  maxInvocations: number;
  enableUserUpdates: boolean;
  userId?: string;
  sessionId?: string;
  skipGuardAllowlistCheck: boolean;
  latestSandboxId?: string;
  setLastUpdateTime: (value: number) => void;
  setLatestSandboxId: (sandboxId: string) => void;
  incrementActive: () => void;
  releaseActive: () => void;
  incrementTotalInvocations: () => void;
  incrementCompletedInvocations: () => void;
};

export async function* runToolExecution(
  args: RunToolExecutionArgs,
): AsyncGenerator<UntypedJson, void, void> {
  let lastUpdateTime = args.lastUpdateTime;
  let totalInvocations = args.totalInvocations;
  let completedInvocations = args.completedInvocations;

  const spanContext = createToolSpan(args.traceContext, {
    toolName: args.toolName,
    input: args.input,
    category: args.toolPlan.category,
    requiresApproval: args.toolPlan.approvalRequired,
  });

  if (args.enableUserUpdates) {
    lastUpdateTime = maybeEmitUserUpdate({
      emitEvent: args.emitEvent,
      toolName: args.toolName,
      phase: "start",
      workflowStartTime: args.workflowStartTime,
      lastUpdateTime,
      completedInvocations,
      totalInvocations,
      maxInvocations: args.maxInvocations,
    });
    args.setLastUpdateTime(lastUpdateTime);
  }

  // ── PreToolUse hooks ──────────────────────────────────────────────────
  // Run before guards so hooks can block or modify input before execution.
  // Hooks are fail-open: errors in hooks don't block tool execution.
  //
  // Config loading note: loadHooksConfig() (called via dispatchHooks) uses a
  // 60-second in-memory cache with in-flight dedup. The first call per TTL
  // window pays the filesystem cost; subsequent calls within the same window
  // (including the post-tool hooks later in this function) resolve instantly.
  let effectiveInput = args.input;
  try {
    const preHookResult = await executePreToolHooks({
      toolName: args.toolName,
      toolInput: args.input,
      toolCategory: args.toolPlan.category,
      requiresApproval: args.toolPlan.approvalRequired,
      sessionId: args.sessionId ?? null,
      userId: args.userId ?? null,
    });

    if (preHookResult.blocked) {
      endToolSpan(spanContext, {
        error: preHookResult.blockReason ?? "Blocked by PreToolUse hook",
        status: "error",
      });
      const blockError = new Error(
        `Tool "${args.toolName}" blocked: ${preHookResult.blockReason ?? "blocked by policy hook"}`,
      );
      // Tag with a symbol so we can reliably detect hook blocks without
      // fragile string matching on error messages.
      (blockError as unknown as Record<symbol, unknown>)[HOOK_BLOCK_SYMBOL] = true;
      throw blockError;
    }

    if (preHookResult.updatedInput) {
      effectiveInput = deepMerge(
        args.input as Record<string, unknown>,
        preHookResult.updatedInput as Record<string, unknown>,
        5,
      ) as UntypedJson;
    }

    if (preHookResult.systemMessages.length > 0) {
      args.emitEvent("tool-event", {
        type: "hook_context",
        toolName: args.toolName,
        messages: preHookResult.systemMessages,
      });
    }
  } catch (error) {
    if (
      error instanceof Error &&
      (error as unknown as Record<symbol, unknown>)[HOOK_BLOCK_SYMBOL] === true
    ) {
      throw error; // Re-throw intentional hook blocks
    }
    // Fail-open: log warning and continue if hooks error unexpectedly
    logger.warn("PreToolUse hook failed unexpectedly (fail-open)", {
      toolName: args.toolName,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  // ── End PreToolUse hooks ────────────────────────────────────────────

  if (isToolExecutionGuardEnabled()) {
    try {
      await guardToolExecution({
        toolName: args.toolName,
        input: effectiveInput,
        emitEvent: args.emitEvent,
        traceContext: args.traceContext,
        userId: args.userId,
        sessionId: args.sessionId,
        skipGuardAllowlistCheck: args.skipGuardAllowlistCheck,
      });
    } catch (error) {
      endToolSpan(spanContext, {
        error: error instanceof Error ? error.message : String(error),
        status: "error",
      });
      throw error;
    }
  }

  if (isPrerequisiteGateEnabled()) {
    try {
      const prereqResult = await checkToolPrerequisites({
        toolName: args.toolName,
        input: effectiveInput,
        userId: args.userId,
        sessionId: args.sessionId,
      });
      if (!prereqResult.allowed) {
        endToolSpan(spanContext, {
          error: prereqResult.reason,
          status: "error",
        });
        throw new PrerequisiteViolationError(prereqResult);
      }
    } catch (error) {
      if (error instanceof PrerequisiteViolationError) {
        throw error;
      }
      // Prerequisite gate failure should not block tool execution on error
      // (fail-open for non-critical gate infrastructure)
    }
  }

  const { executionId, startedAt, toolCallId, baseToolContext } =
    beginToolInvocation({
      toolName: args.toolName,
      input: effectiveInput,
      toolContext: args.toolContext,
      emitEvent: args.emitEvent,
      emitInvocation: args.emitInvocation,
      incrementActive: args.incrementActive,
      incrementTotalInvocations: args.incrementTotalInvocations,
    });
  totalInvocations += 1;

  const MAX_TRANSIENT_RETRIES = 2;
  const BASE_BACKOFF_MS = 1000;
  let attempt = 0;
  let lastError: unknown = null;

  while (attempt <= MAX_TRANSIENT_RETRIES) {
    let artifactId: string | undefined;
    let emittedExecuting = false;
    let emittedCompleted = false;
    let lastResult: UntypedJson | undefined;

    try {
      if (!args.toolImpl.execute) {
        throw new Error(
          `Tool "${args.toolName}" does not have an execute function.`,
        );
      }

      const executionResult = args.toolImpl.execute(
        effectiveInput,
        buildAugmentedExecutionOptions({
          toolContext: baseToolContext,
          metadataPatch: {
            invocationSource: "chat",
            ...(args.userId ? { userId: args.userId } : {}),
            ...(args.sessionId ? { sessionId: args.sessionId } : {}),
            ...(args.latestSandboxId
              ? { sandbox_id: args.latestSandboxId }
              : {}),
          },
          userId: args.userId,
        }),
      );

      for await (const chunk of toAsyncToolResultIterator(executionResult)) {
        if (!emittedExecuting) {
          emitExecutingToolPayload({
            executionId,
            toolCallId,
            toolName: args.toolName,
            input: args.input,
            emitEvent: args.emitEvent,
          });
          emittedExecuting = true;
        }

        const streamedPayloads = extractStreamPayloadsFromChunk(chunk);
        if (streamedPayloads.length > 0) {
          emitPayloadBatch(args.emitEvent, streamedPayloads);
          continue;
        }

        const wrappedToolResult = extractWrappedToolResult(chunk);
        if (!wrappedToolResult) {
          yield chunk;
          continue;
        }

        lastResult = await processToolResultSecurity({
          toolName: args.toolName,
          input: args.input,
          resultPayload: wrappedToolResult.result,
          emitEvent: args.emitEvent,
        });

        const handledResult = await handleWrappedToolResult({
          toolName: args.toolName,
          input: args.input,
          resultPayload: lastResult,
          executionId,
          toolCallId,
          startedAt,
          emitEvent: args.emitEvent,
          userId: args.userId,
          sessionId: args.sessionId,
          updateLatestSandboxId: args.setLatestSandboxId,
        });

        artifactId = handledResult.artifactId;
        emittedCompleted = true;
        yield lastResult;
      }

      const successState = finalizeSuccessfulInvocation({
        executionId,
        toolCallId,
        toolName: args.toolName,
        input: args.input,
        startedAt,
        artifactId,
        lastResult,
        emittedCompleted,
        emitEvent: args.emitEvent,
        emitInvocation: args.emitInvocation,
        enableUserUpdates: args.enableUserUpdates,
        workflowStartTime: args.workflowStartTime,
        lastUpdateTime,
        completedInvocations,
        totalInvocations,
        maxInvocations: args.maxInvocations,
      });
      args.incrementCompletedInvocations();
      completedInvocations = successState.completedInvocations;
      lastUpdateTime = successState.lastUpdateTime;

      endToolSpan(spanContext, {
        result: lastResult,
        status: "success",
      });
      args.setLastUpdateTime(lastUpdateTime);

      // ── PostToolUse hooks (fire-and-forget, non-blocking) ───────────
      if (lastResult !== undefined) {
        executePostToolHooks({
          toolName: args.toolName,
          toolInput: effectiveInput,
          toolOutput: lastResult,
          toolCategory: args.toolPlan.category,
          durationMs: Date.now() - startedAt,
          sessionId: args.sessionId ?? null,
          userId: args.userId ?? null,
        }).catch((hookError) => {
          logger.warn("PostToolUse hook failed (non-blocking)", {
            toolName: args.toolName,
            error: hookError instanceof Error ? hookError.message : String(hookError),
          });
        });
      }
      // ── End PostToolUse hooks ───────────────────────────────────────

      // ── Telemetry: record successful tool execution ─────────────────
      try {
        const toolDurationMs = Date.now() - startedAt;
        recordToolExecution({
          toolName: args.toolName,
          status: "success",
          durationMs: toolDurationMs,
        });
        logToolUseEvent({
          toolName: args.toolName,
          status: "success",
          durationMs: toolDurationMs,
          category: args.toolPlan.category,
          sessionId: args.sessionId ?? null,
          userId: args.userId ?? null,
        });
      } catch (telemetryError) {
        logger.warn("Telemetry recording failed (non-blocking)", {
          toolName: args.toolName,
          error: telemetryError instanceof Error ? telemetryError.message : String(telemetryError),
        });
      }
      // ── End telemetry ───────────────────────────────────────────────

      // Success — break out of the retry loop
      break;
    } catch (error) {
      const isSecurityError = error instanceof SecurityViolationError;

      // Classify error if contract is enabled
      let classifiedError: ToolExecutionError | undefined;
      if (isErrorContractEnabled() && !(error instanceof PrerequisiteViolationError)) {
        classifiedError = classifyToolError(error, args.toolName, toolCallId, args.input);
      }

      // Retry transient errors when error contract is enabled
      if (
        isErrorContractEnabled() &&
        classifiedError?.retry.retryable &&
        attempt < MAX_TRANSIENT_RETRIES &&
        !(error instanceof PrerequisiteViolationError) &&
        !isSecurityError
      ) {
        attempt++;
        const backoffMs =
          (classifiedError.retry.backoffMs ?? BASE_BACKOFF_MS) *
          Math.pow(2, attempt - 1);
        args.emitEvent("tool_retry", {
          toolName: args.toolName,
          attempt,
          maxRetries: MAX_TRANSIENT_RETRIES,
          backoffMs,
          errorCategory: classifiedError.errorCategory,
        });
        await sleep(backoffMs);
        lastError = error;
        continue;
      }

      finalizeFailedInvocation({
        executionId,
        toolCallId,
        toolName: args.toolName,
        input: args.input,
        startedAt,
        error,
        isSecurityError,
        emitEvent: args.emitEvent,
        emitInvocation: args.emitInvocation,
        ...(classifiedError ? {
          errorCategory: classifiedError.errorCategory,
          userExplanation: classifiedError.userExplanation,
        } : {}),
      });

      endToolSpan(spanContext, {
        error: classifiedError?.internalDetail ?? (error instanceof Error ? error.message : String(error)),
        status: "error",
        ...(classifiedError ? {
          errorCategory: classifiedError.errorCategory,
          retryable: classifiedError.retry.retryable,
        } : {}),
      });
      // ── PostToolUseFailure hooks (fire-and-forget) ─────────────────
      executePostToolFailureHooks({
        toolName: args.toolName,
        toolInput: effectiveInput,
        errorMessage: classifiedError?.internalDetail ?? (error instanceof Error ? error.message : String(error)),
        errorCategory: classifiedError?.errorCategory ?? "internal",
        sessionId: args.sessionId ?? null,
        userId: args.userId ?? null,
      }).catch((hookError) => {
        logger.warn("PostToolUseFailure hook failed (non-blocking)", {
          toolName: args.toolName,
          error: hookError instanceof Error ? hookError.message : String(hookError),
        });
      });
      // ── End PostToolUseFailure hooks ────────────────────────────────

      // ── Telemetry: record failed tool execution ─────────────────────
      try {
        const failDurationMs = Date.now() - startedAt;
        recordToolExecution({
          toolName: args.toolName,
          status: isSecurityError ? "blocked" : "error",
          durationMs: failDurationMs,
        });
        logToolUseEvent({
          toolName: args.toolName,
          status: isSecurityError ? "blocked" : "error",
          durationMs: failDurationMs,
          category: args.toolPlan.category,
          sessionId: args.sessionId ?? null,
          userId: args.userId ?? null,
        });
      } catch (telemetryError) {
        logger.warn("Telemetry recording failed (non-blocking)", {
          toolName: args.toolName,
          error: telemetryError instanceof Error ? telemetryError.message : String(telemetryError),
        });
      }
      // ── End telemetry ───────────────────────────────────────────────

      throw classifiedError ?? error;
    } finally {
      // Only release active on the final attempt (success or non-retryable failure)
      if (attempt >= MAX_TRANSIENT_RETRIES || lastError === null || attempt === 0) {
        // This runs on success (break), on non-retryable throw, or on final retry throw.
        // On retryable continue, we skip release because we re-enter the loop.
      }
    }
  }

  args.releaseActive();
}
