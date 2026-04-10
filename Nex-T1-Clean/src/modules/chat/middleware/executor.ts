/**
 * Hook Executor -- Public API for running individual hooks
 *
 * Delegates to type-specific executors (shell, http, prompt),
 * enforces timeouts, parses output, and catches errors.
 * Never throws -- all failures are returned as HookResult.
 */

import { logger } from "@/lib/logger";
import type {
  HookCommand,
  HookInput,
  HookOutput,
  HookResult,
  HookResultOutcome,
} from "./types";
import { executeShellHook } from "./executor-shell";
import { executeHttpHook } from "./executor-http";
import { executePromptHook } from "./executor-prompt";
import { parseHookOutput } from "./executor-output";

/**
 * Executes a single hook command and returns a structured result.
 *
 * Handles all hook types (command, http, prompt), enforces timeouts,
 * parses output, and catches errors. Never throws -- all failures are
 * returned as HookResult with an appropriate outcome.
 */
export async function executeHook(
  hook: HookCommand,
  input: HookInput,
): Promise<HookResult> {
  const startTime = Date.now();
  const timeoutMs = (hook.timeout ?? 30) * 1000;
  const hookName = describeHook(hook);

  try {
    let output: HookOutput;

    switch (hook.type) {
      case "command": {
        const result = await executeShellHook(hook, input, timeoutMs);
        if (result.exitCode === -1) {
          return buildResult(hookName, input.hook_event_name, "timeout", null, startTime, "Hook timed out");
        }
        if (result.exitCode !== 0 && !result.stdout.trim()) {
          return buildResult(hookName, input.hook_event_name, "blocked", {
            decision: "block",
            reason: result.stderr.slice(0, 1024) || `Hook exited with code ${result.exitCode}`,
          }, startTime);
        }
        output = parseHookOutput(result.stdout);
        break;
      }

      case "http": {
        const result = await executeHttpHook(hook, input, timeoutMs);
        if (result.statusCode === 0) {
          return buildResult(hookName, input.hook_event_name, "error", null, startTime, result.body);
        }
        if (result.statusCode >= 400) {
          return buildResult(
            hookName,
            input.hook_event_name,
            "error",
            null,
            startTime,
            `HTTP ${result.statusCode}: ${result.body.slice(0, 500)}`,
          );
        }
        output = parseHookOutput(result.body);
        break;
      }

      case "prompt": {
        output = await executePromptHook(hook, input);
        break;
      }

      default: {
        const _exhaustive: never = hook;
        return buildResult(
          hookName,
          input.hook_event_name,
          "error",
          null,
          startTime,
          `Unknown hook type: ${(_exhaustive as HookCommand).type}`,
        );
      }
    }

    const outcome: HookResultOutcome = output.decision === "block" ? "blocked" : "success";
    return buildResult(hookName, input.hook_event_name, outcome, output, startTime);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Hook execution failed", { hookName, error: message });
    return buildResult(hookName, input.hook_event_name, "error", null, startTime, message);
  }
}

function buildResult(
  hookName: string,
  hookEvent: HookInput["hook_event_name"],
  outcome: HookResultOutcome,
  output: HookOutput | null,
  startTime: number,
  error?: string,
): HookResult {
  return {
    hookName,
    hookEvent,
    outcome,
    output,
    durationMs: Date.now() - startTime,
    error,
  };
}

/**
 * Returns a human-readable description of a hook for logging.
 * Never throws -- malformed URLs fall back to the raw string.
 */
function describeHook(hook: HookCommand): string {
  switch (hook.type) {
    case "command":
      return `command:${hook.command.slice(0, 40)}`;
    case "http": {
      try {
        return `http:${new URL(hook.url).hostname}`;
      } catch {
        return `http:${hook.url.slice(0, 40)}`;
      }
    }
    case "prompt":
      return `prompt:${hook.prompt.slice(0, 30)}`;
    default:
      return "unknown";
  }
}
