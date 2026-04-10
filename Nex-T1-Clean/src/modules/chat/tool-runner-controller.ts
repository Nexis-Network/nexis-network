import type { Tool, ToolExecutionOptions } from "ai";

import { hasExecuteFunction } from "./tool-runner-context";
import { runToolExecution } from "./tool-runner-execution";
import { createDefaultToolModelOutput } from "./tool-runner-output";
import type { ToolControllerOptions } from "./tool-runner-types";
import type { ToolInvocation } from "./types";
import {
  buildToolPlan,
  DEFAULT_PRIORITY_TOOL_NAMES,
  formatToolPlanText,
  type ToolPlan,
} from "./tool-planning";

import { logger } from "@/lib/logger";

const DEFAULT_PRIORITY_TOOLS = new Set(DEFAULT_PRIORITY_TOOL_NAMES);

export class ToolController {
  private active = 0;
  private totalInvocations = 0;
  private completedInvocations = 0;
  private readonly slotWaiters = new Set<() => void>();
  private readonly maxConcurrent: number;
  private readonly maxInvocations: number;
  private readonly priorityTools: Set<string>;
  private readonly enableUserUpdates: boolean;
  private readonly skipGuardAllowlistCheck: boolean;
  private workflowStartTime: number | null = null;
  private lastUpdateTime = 0;
  private latestSandboxId: string | undefined;

  constructor(private readonly options: ToolControllerOptions) {
    this.maxConcurrent =
      options.maxConcurrent ?? Number(process.env.NEX_TOOL_MAX_CONCURRENT ?? 3);
    this.maxInvocations =
      options.maxInvocations ??
      Number(process.env.NEX_TOOL_MAX_INVOCATIONS ?? 6);
    this.priorityTools = new Set(
      options.priorityTools ?? DEFAULT_PRIORITY_TOOLS,
    );
    this.enableUserUpdates = options.enableUserUpdates ?? true;
    this.latestSandboxId = options.sandboxID;
    this.skipGuardAllowlistCheck = options.skipGuardAllowlistCheck ?? true;
  }

  wrapToolset(toolset: Record<string, Tool>): Record<string, Tool> {
    const run = this.run.bind(this);
    const validEntries: Array<[string, Tool]> = [];
    const invalidTools: string[] = [];

    for (const [toolName, toolImpl] of Object.entries(toolset)) {
      if (!hasExecuteFunction(toolImpl, toolName)) {
        invalidTools.push(toolName);
        continue;
      }

      validEntries.push([
        toolName,
        {
          ...toolImpl,
          async *execute(
            input: UntypedJson,
            toolContext: ToolExecutionOptions,
          ) {
            return yield* run(toolName, toolImpl, input, toolContext);
          },
          async toModelOutput(options: {
            toolCallId: string;
            input: UntypedJson;
            output: UntypedJson;
          }) {
            if (toolImpl.toModelOutput) {
              return await toolImpl.toModelOutput(options);
            }

            return createDefaultToolModelOutput(toolName, options);
          },
        } satisfies Tool,
      ]);
    }

    if (invalidTools.length > 0) {
      logger.warn(
        `[ToolController] Filtered out ${invalidTools.length} tools without execute: ${invalidTools.join(", ")}`,
      );
      this.options.emitEvent("tool_validation_warning", {
        invalidTools,
        validCount: validEntries.length,
      });
    }

    return Object.fromEntries(validEntries);
  }

  resetWorkflowState() {
    this.completedInvocations = 0;
    this.workflowStartTime = null;
    this.lastUpdateTime = 0;
  }

  private async waitForAvailableSlot(limit: number) {
    while (this.active >= limit) {
      await new Promise<void>((resolve) => {
        this.slotWaiters.add(resolve);
      });
    }
  }

  private releaseSlot() {
    this.active = Math.max(0, this.active - 1);

    if (this.slotWaiters.size === 0) {
      return;
    }

    const waiters = Array.from(this.slotWaiters);
    this.slotWaiters.clear();

    for (const resolve of waiters) {
      resolve();
    }
  }

  private async *run(
    toolName: string,
    toolImpl: Tool,
    input: UntypedJson,
    toolContext?: ToolExecutionOptions,
  ) {
    const isPriority = this.priorityTools.has(toolName);
    const effectiveMaxConcurrent = isPriority
      ? this.maxConcurrent + 1
      : this.maxConcurrent;

    await this.waitForAvailableSlot(effectiveMaxConcurrent);
    if (this.totalInvocations >= this.maxInvocations) {
      throw new Error(
        `Tool invocation budget exhausted (${this.maxInvocations}).`,
      );
    }

    const toolPlan = buildToolPlan(toolName, input, this.priorityTools);
    this.emitToolPlan(toolPlan);

    if (this.workflowStartTime === null) {
      this.workflowStartTime = Date.now();
    }

    return yield* runToolExecution({
      toolName,
      toolImpl,
      input,
      toolContext,
      toolPlan,
      emitEvent: this.options.emitEvent,
      emitInvocation: this.emitInvocation.bind(this),
      traceContext: this.options.traceContext ?? null,
      workflowStartTime: this.workflowStartTime,
      lastUpdateTime: this.lastUpdateTime,
      totalInvocations: this.totalInvocations,
      completedInvocations: this.completedInvocations,
      maxInvocations: this.maxInvocations,
      enableUserUpdates: this.enableUserUpdates,
      userId: this.options.userId,
      sessionId: this.options.sessionId,
      skipGuardAllowlistCheck: this.skipGuardAllowlistCheck,
      latestSandboxId: this.latestSandboxId,
      setLastUpdateTime: (value) => {
        this.lastUpdateTime = value;
      },
      setLatestSandboxId: (sandboxId) => {
        this.latestSandboxId = sandboxId;
      },
      incrementActive: () => {
        this.active += 1;
      },
      releaseActive: () => {
        this.releaseSlot();
      },
      incrementTotalInvocations: () => {
        this.totalInvocations += 1;
      },
      incrementCompletedInvocations: () => {
        this.completedInvocations += 1;
      },
    });
  }

  private emitInvocation(invocation: ToolInvocation) {
    this.options.emitEvent("tool-event", invocation);
  }

  private emitToolPlan(plan: ToolPlan) {
    this.options.emitEvent("tool_plan", {
      toolName: plan.toolName,
      intent: plan.intent,
      category: plan.category,
      mode: plan.mode,
      reasoning: plan.reasoning,
      approvalRequired: plan.approvalRequired,
      estimatedDurationMs: plan.estimatedDurationMs,
      planText: formatToolPlanText(plan),
    });
  }
}
