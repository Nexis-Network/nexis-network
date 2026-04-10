import {
  createProgressEvent,
  generateUserUpdate,
  shouldSendUpdate,
  type UserUpdate,
} from "@/modules/ai/metaprompts";

import { formatToolNameForUser, summarizeResultForUser } from "./tool-planning";
import type {
  ToolEventEmitter,
  ToolRunPhase,
} from "./tool-runner-types";

export function maybeEmitUserUpdate(args: {
  emitEvent: ToolEventEmitter;
  toolName: string;
  phase: ToolRunPhase;
  result?: UntypedJson;
  workflowStartTime: number | null;
  lastUpdateTime: number;
  completedInvocations: number;
  totalInvocations: number;
  maxInvocations: number;
}): number {
  const now = Date.now();
  const elapsedMs = args.workflowStartTime ? now - args.workflowStartTime : 0;
  const timeSinceLastUpdate = now - args.lastUpdateTime;
  const shouldUpdate = shouldSendUpdate(
    args.completedInvocations,
    args.totalInvocations,
    elapsedMs,
  );
  const needsHeartbeat = timeSinceLastUpdate > 10000 && elapsedMs > 10000;

  if (!shouldUpdate && !needsHeartbeat) {
    return args.lastUpdateTime;
  }

  let update: UserUpdate;

  if (args.phase === "start") {
    update = {
      type: "tool_start",
      message: `Executing ${formatToolNameForUser(args.toolName)}...`,
      toolName: args.toolName,
      step: args.totalInvocations,
      totalSteps: args.maxInvocations,
      elapsedMs,
    };
  } else {
    update = {
      type: "tool_complete",
      message: summarizeResultForUser(args.toolName, args.result),
      toolName: args.toolName,
      step: args.completedInvocations,
      totalSteps: args.totalInvocations,
      elapsedMs,
    };
  }

  const displayMessage = generateUserUpdate(update);
  const progressEvent = createProgressEvent(
    displayMessage,
    args.completedInvocations,
    args.totalInvocations,
    elapsedMs,
  );

  args.emitEvent(progressEvent.type, progressEvent.data);
  return now;
}
