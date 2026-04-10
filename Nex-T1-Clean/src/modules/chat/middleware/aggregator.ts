/**
 * Hook Aggregator -- Result aggregation and once-hook tracking
 *
 * Merges results from multiple hooks into a single aggregated result,
 * and manages the bounded tracking set for once-hooks.
 */

import type {
  HookCommand,
  HookResult,
  AggregatedHookResult,
} from "./types";

// ---------------------------------------------------------------------------
// Once-hook tracking (bounded)
// ---------------------------------------------------------------------------

/**
 * Maximum number of once-hook keys to track. When exceeded, the oldest
 * entries are evicted. This prevents unbounded memory growth in long-running
 * server processes.
 */
const MAX_ONCE_HOOKS = 1024;

const executedOnceHooks = new Map<string, number>();

export function getOnceKey(hook: HookCommand): string {
  switch (hook.type) {
    case "command":
      return `once:command:${hook.command}`;
    case "http":
      return `once:http:${hook.url}`;
    case "prompt":
      // Use full prompt hash to avoid collisions from truncation
      return `once:prompt:${simpleHash(hook.prompt)}`;
    default:
      return `once:unknown`;
  }
}

/** Records a once-hook as executed, evicting oldest entries if over capacity. */
export function markOnceHookExecuted(key: string): void {
  executedOnceHooks.set(key, Date.now());

  // Evict oldest entries when over capacity
  if (executedOnceHooks.size > MAX_ONCE_HOOKS) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    executedOnceHooks.forEach((t, k) => {
      if (t < oldestTime) {
        oldestTime = t;
        oldestKey = k;
      }
    });
    if (oldestKey) {
      executedOnceHooks.delete(oldestKey);
    }
  }
}

/** Checks if a once-hook has already been executed. */
export function hasOnceHookExecuted(key: string): boolean {
  return executedOnceHooks.has(key);
}

/**
 * Resets the once-hook tracking state.
 * Intended for testing or session reset scenarios.
 */
export function resetOnceHookTracking(): void {
  executedOnceHooks.clear();
}

/**
 * Simple string hash for generating stable keys.
 * Not cryptographic -- used only for deduplication.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return hash.toString(36);
}

// ---------------------------------------------------------------------------
// Result aggregation
// ---------------------------------------------------------------------------

/**
 * Aggregates multiple hook results into a single summary.
 *
 * - System messages are merged (all kept)
 * - Last updatedInput wins (shallow merge)
 * - Any block decision stops further processing
 * - Any continue=false prevents continuation
 */
export function aggregateResults(
  results: HookResult[],
): AggregatedHookResult {
  let blocked = false;
  let blockReason: string | undefined;
  let preventContinuation = false;
  const systemMessages: string[] = [];
  let updatedInput: Record<string, unknown> | null = null;
  const additionalContextParts: string[] = [];
  let totalDurationMs = 0;

  for (const result of results) {
    totalDurationMs += result.durationMs;

    if (!result.output) continue;

    if (result.output.decision === "block") {
      blocked = true;
      blockReason = blockReason ?? result.output.reason ?? "Blocked by hook";
    }

    if (result.output.continue === false) {
      preventContinuation = true;
    }

    if (result.output.systemMessage) {
      systemMessages.push(result.output.systemMessage);
    }

    if (result.output.updatedInput) {
      updatedInput = { ...(updatedInput ?? {}), ...result.output.updatedInput };
    }

    if (result.output.additionalContext) {
      additionalContextParts.push(result.output.additionalContext);
    }
  }

  return {
    results,
    blocked,
    blockReason,
    preventContinuation,
    additionalContext:
      additionalContextParts.length > 0
        ? additionalContextParts.join("\n")
        : null,
    updatedInput,
    systemMessages,
    totalDurationMs,
  };
}
