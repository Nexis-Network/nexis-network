import type { Tool, ToolExecutionOptions } from "ai";

import type { TraceContext } from "./langfuse-tracing";
import type { ToolInvocation } from "./types";

export type ToolControllerOptions = {
  maxConcurrent?: number;
  maxInvocations?: number;
  emitEvent: (type: string, data: UntypedJson) => void;
  priorityTools?: string[];
  enableUserUpdates?: boolean;
  traceContext?: TraceContext | null;
  sandboxID?: string;
  userId?: string;
  sessionId?: string;
  skipGuardAllowlistCheck?: boolean;
};

export type ToolEventEmitter = ToolControllerOptions["emitEvent"];

export type ToolModelOutput = Awaited<
  ReturnType<Exclude<Tool["toModelOutput"], undefined>>
>;

export type ToolWithExecute = Tool & {
  execute: Exclude<Tool["execute"], undefined>;
};

export type ToolExecutionMetadata = Record<string, UntypedJson>;

export type ToolExecutionExperimentalContext = Record<string, unknown> & {
  userId?: string;
  metadata?: ToolExecutionMetadata;
};

export type AugmentedToolExecutionOptions = ToolExecutionOptions & {
  userId?: string;
  metadata?: ToolExecutionMetadata;
  experimental_context?: ToolExecutionExperimentalContext;
};

export type ToolPayloadRecord = Record<string, UntypedJson>;

export type WrappedToolResult = {
  result: UntypedJson;
};

export type EmitInvocation = (invocation: ToolInvocation) => void;

export type ToolRunPhase = "start" | "complete";
