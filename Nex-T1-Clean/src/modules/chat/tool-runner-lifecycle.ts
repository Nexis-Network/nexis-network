import type { ToolExecutionOptions } from "ai";
import { nanoid } from "nanoid";

import { extractToolCallId } from "./tool-runner-context";
import {
  buildToolExecutionPayload,
  emitPayloadBatch,
} from "./tool-runner-payloads";
import { maybeEmitUserUpdate } from "./tool-runner-updates";
import { summarizeInput } from "./tool-planning";
import type { EmitInvocation, ToolEventEmitter } from "./tool-runner-types";

export function beginToolInvocation(args: {
  toolName: string;
  input: UntypedJson;
  toolContext?: ToolExecutionOptions;
  emitEvent: ToolEventEmitter;
  emitInvocation: EmitInvocation;
  incrementActive: () => void;
  incrementTotalInvocations: () => void;
}): {
  executionId: string;
  startedAt: number;
  toolCallId?: string;
  baseToolContext: ToolExecutionOptions;
} {
  const executionId = nanoid();
  const startedAt = Date.now();
  const toolCallId = extractToolCallId(args.toolContext);
  const baseToolContext =
    args.toolContext ??
    ({
      toolCallId: executionId,
      messages: [],
    } as ToolExecutionOptions);

  args.incrementActive();
  args.incrementTotalInvocations();

  args.emitInvocation({
    id: executionId,
    name: args.toolName,
    status: "executing",
    startedAt: new Date().toISOString(),
    summary: summarizeInput(args.input),
  });

  emitPayloadBatch(args.emitEvent, [
    buildToolExecutionPayload({
      id: executionId,
      toolCallId,
      toolName: args.toolName,
      status: "pending",
      input: args.input,
    }),
  ]);

  return {
    executionId,
    startedAt,
    toolCallId,
    baseToolContext,
  };
}

export function emitExecutingToolPayload(args: {
  executionId: string;
  toolCallId?: string;
  toolName: string;
  input: UntypedJson;
  emitEvent: ToolEventEmitter;
}) {
  emitPayloadBatch(args.emitEvent, [
    buildToolExecutionPayload({
      id: args.executionId,
      toolCallId: args.toolCallId,
      toolName: args.toolName,
      status: "executing",
      input: args.input,
    }),
  ]);
}

export function finalizeSuccessfulInvocation(args: {
  executionId: string;
  toolCallId?: string;
  toolName: string;
  input: UntypedJson;
  startedAt: number;
  artifactId?: string;
  lastResult: UntypedJson;
  emittedCompleted: boolean;
  emitEvent: ToolEventEmitter;
  emitInvocation: EmitInvocation;
  enableUserUpdates: boolean;
  workflowStartTime: number | null;
  lastUpdateTime: number;
  completedInvocations: number;
  totalInvocations: number;
  maxInvocations: number;
}): {
  completedInvocations: number;
  lastUpdateTime: number;
} {
  if (!args.emittedCompleted) {
    emitPayloadBatch(args.emitEvent, [
      buildToolExecutionPayload({
        id: args.executionId,
        toolCallId: args.toolCallId,
        toolName: args.toolName,
        status: "completed",
        input: args.input,
        output: args.lastResult,
        executionTime: Date.now() - args.startedAt,
      }),
    ]);
  }

  args.emitInvocation({
    id: args.executionId,
    name: args.toolName,
    status: "complete",
    completedAt: new Date().toISOString(),
    artifactId: args.artifactId,
  });

  const completedInvocations = args.completedInvocations + 1;
  const lastUpdateTime = args.enableUserUpdates
    ? maybeEmitUserUpdate({
        emitEvent: args.emitEvent,
        toolName: args.toolName,
        phase: "complete",
        result: args.lastResult,
        workflowStartTime: args.workflowStartTime,
        lastUpdateTime: args.lastUpdateTime,
        completedInvocations,
        totalInvocations: args.totalInvocations,
        maxInvocations: args.maxInvocations,
      })
    : args.lastUpdateTime;

  return {
    completedInvocations,
    lastUpdateTime,
  };
}

export function finalizeFailedInvocation(args: {
  executionId: string;
  toolCallId?: string;
  toolName: string;
  input: UntypedJson;
  startedAt: number;
  error: unknown;
  isSecurityError: boolean;
  emitEvent: ToolEventEmitter;
  emitInvocation: EmitInvocation;
  errorCategory?: string;
  userExplanation?: string;
}) {
  const errorMessage =
    args.error instanceof Error ? args.error.message : String(args.error);

  args.emitInvocation({
    id: args.executionId,
    name: args.toolName,
    status: "error",
    completedAt: new Date().toISOString(),
    error: args.userExplanation ?? errorMessage,
    ...(args.errorCategory ? { errorCategory: args.errorCategory } : {}),
  });

  emitPayloadBatch(args.emitEvent, [
    buildToolExecutionPayload({
      id: args.executionId,
      toolCallId: args.toolCallId,
      toolName: args.toolName,
      status: args.isSecurityError ? "security_blocked" : "error",
      input: args.input,
      error: args.userExplanation ?? errorMessage,
      executionTime: Date.now() - args.startedAt,
      securityBlocked: args.isSecurityError,
      ...(args.errorCategory ? { errorCategory: args.errorCategory } : {}),
    }),
  ]);

  if (args.isSecurityError) {
    args.emitEvent("security", {
      type: "tool_execution_blocked",
      toolName: args.toolName,
      reason: errorMessage,
    });
  }
}
