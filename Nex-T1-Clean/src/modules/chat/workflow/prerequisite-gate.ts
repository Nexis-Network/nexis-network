/**
 * Hard runtime gate that checks prerequisites before tool execution.
 * Runs in the tool execution path (after security guards) as defense in depth.
 *
 * No UI concerns, no event emission — just a pure prerequisite check.
 */

import { logger } from "@/lib/logger";
import {
  readWorkingMemoryState,
  resolveWorkingMemoryScope,
} from "../state/working-memory-store";
import { isToolGatedByRule, DEFAULT_WORKFLOW_RULES } from "./workflow-rules";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PrerequisiteCheckResult = {
  allowed: boolean;
  reason?: string;
  missingPrerequisites?: string[];
  ruleId?: string;
};

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class PrerequisiteViolationError extends Error {
  public readonly result: PrerequisiteCheckResult;

  constructor(result: PrerequisiteCheckResult) {
    super(`Prerequisite not met: ${result.reason ?? "unknown"}`);
    this.name = "PrerequisiteViolationError";
    this.result = result;
  }
}

// ---------------------------------------------------------------------------
// Feature flag
// ---------------------------------------------------------------------------

export function isPrerequisiteGateEnabled(): boolean {
  return process.env.NEX_WORKFLOW_GATES_ENABLED === "true";
}

// ---------------------------------------------------------------------------
// Core check
// ---------------------------------------------------------------------------

export async function checkToolPrerequisites(args: {
  toolName: string;
  input: UntypedJson;
  userId?: string;
  sessionId?: string;
}): Promise<PrerequisiteCheckResult> {
  if (!isPrerequisiteGateEnabled()) {
    return { allowed: true };
  }

  // Check for an exact tool name match first, then check for sub-command
  // rules. A gated tool like "coordinator:start" should match when
  // toolName is "coordinator" and input.action is "start".
  let rule = isToolGatedByRule(args.toolName, DEFAULT_WORKFLOW_RULES);

  if (!rule) {
    // Check whether any rule gates a sub-command of this tool.
    const input = args.input as Record<string, unknown> | null | undefined;
    const action = typeof input?.action === "string" ? input.action : null;
    if (action) {
      const qualifiedName = `${args.toolName}:${action}`;
      rule = isToolGatedByRule(qualifiedName, DEFAULT_WORKFLOW_RULES);
    }
  }

  if (!rule) {
    return { allowed: true };
  }

  // If the rule has a runtime condition and it evaluates to false, skip it.
  if (rule.conditionFn && !rule.conditionFn()) {
    return { allowed: true };
  }

  const scope = resolveWorkingMemoryScope({
    userId: args.userId,
    sessionId: args.sessionId,
  });

  const state = await readWorkingMemoryState(scope);

  // Find the active task — first todo with status "in_progress".
  const activeTask = state.todos.find((todo) => todo.status === "in_progress");

  if (!activeTask) {
    const reason =
      `Tool "${args.toolName}" is gated by rule "${rule.id}" ` +
      "but there is no active task in working memory.";
    logger.warn("[prerequisite-gate] blocked — no active task", {
      toolName: args.toolName,
      ruleId: rule.id,
    });
    return {
      allowed: false,
      reason,
      missingPrerequisites: rule.requiredPrerequisites,
      ruleId: rule.id,
    };
  }

  const completed = new Set(activeTask.completedVerification);

  const missing = rule.requiredPrerequisites.filter(
    (prereq) => !completed.has(prereq),
  );

  if (missing.length > 0) {
    const reason =
      `Tool "${args.toolName}" blocked by rule "${rule.id}": ` +
      `missing prerequisites [${missing.join(", ")}] ` +
      `on active task "${activeTask.title}" (${activeTask.id}).`;
    logger.warn("[prerequisite-gate] blocked — missing prerequisites", {
      toolName: args.toolName,
      ruleId: rule.id,
      missing,
      taskId: activeTask.id,
    });
    return {
      allowed: false,
      reason,
      missingPrerequisites: missing,
      ruleId: rule.id,
    };
  }

  return { allowed: true };
}
