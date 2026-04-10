/**
 * Hook Dispatcher -- Orchestrates hook execution for pipeline events
 *
 * Matches events to configured hooks, executes them in order,
 * aggregates results, and handles short-circuiting (blocking, continuation).
 *
 * Key behaviors:
 * - Hooks execute sequentially within a matcher (order matters)
 * - A hook returning decision=block stops further hooks and blocks the operation
 * - A hook returning continue=false stops further hooks (but doesn't block)
 * - Results are aggregated: system messages merged, last updatedInput wins
 * - Errors in individual hooks don't block other hooks (fail-open)
 * - Once hooks auto-remove after first successful execution
 */

import { logger } from "@/lib/logger";
import { loadHooksConfig } from "./config";
import { executeHook } from "./executor";
import { getMatchingHooks } from "./matcher";
import {
  aggregateResults,
  getOnceKey,
  hasOnceHookExecuted,
  markOnceHookExecuted,
} from "./aggregator";
import type {
  HookEvent,
  HookInput,
  HookResult,
  AggregatedHookResult,
} from "./types";

// ---------------------------------------------------------------------------
// Core dispatch
// ---------------------------------------------------------------------------

/**
 * Dispatches hooks for a given event, executing matching hooks sequentially
 * and returning aggregated results.
 *
 * Hooks are matched by event type and optional pattern (e.g., tool name).
 * Execution short-circuits on `decision: "block"` or `continue: false`.
 * Once-hooks are automatically tracked and skipped on subsequent invocations.
 */
export async function dispatchHooks(
  event: HookEvent,
  input: HookInput,
  projectRoot?: string,
): Promise<AggregatedHookResult> {
  const config = await loadHooksConfig(projectRoot);
  const matchingHooks = getMatchingHooks(config, event, input);

  if (matchingHooks.length === 0) {
    return aggregateResults([]);
  }

  const results: HookResult[] = [];

  for (const { hook } of matchingHooks) {
    // Skip once-hooks that already ran
    if (hook.once) {
      const key = getOnceKey(hook);
      if (hasOnceHookExecuted(key)) continue;
    }

    const result = await executeHook(hook, input);
    results.push(result);

    // Mark once-hooks as executed
    if (hook.once && result.outcome === "success") {
      markOnceHookExecuted(getOnceKey(hook));
    }

    // Short-circuit on block
    if (result.output?.decision === "block") {
      logger.info("Hook blocked operation", {
        hookName: result.hookName,
        event,
        reason: result.output.reason,
      });
      break;
    }

    // Short-circuit on continue=false
    if (result.output?.continue === false) {
      break;
    }
  }

  const aggregated = aggregateResults(results);

  if (results.length > 0) {
    logger.debug("Hook dispatch complete", {
      event,
      hookCount: results.length,
      blocked: aggregated.blocked,
      totalDurationMs: aggregated.totalDurationMs,
    });
  }

  return aggregated;
}

// ---------------------------------------------------------------------------
// Re-exports for backward compatibility
// ---------------------------------------------------------------------------

export { resetOnceHookTracking } from "./aggregator";

export {
  executePreToolHooks,
  executePostToolHooks,
  executePostToolFailureHooks,
  executeStopHooks,
  executeSessionStartHooks,
  executeSessionEndHooks,
  executePreCompactHooks,
  executePostCompactHooks,
} from "./dispatcher-convenience";
