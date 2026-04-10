import type { Tool, ToolExecutionOptions } from "ai";

import type {
  AugmentedToolExecutionOptions,
  ToolExecutionExperimentalContext,
  ToolExecutionMetadata,
  ToolWithExecute,
} from "./tool-runner-types";

import { logger } from "@/lib/logger";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export function hasExecuteFunction(
  tool: UntypedJson,
  toolName: string,
): tool is ToolWithExecute {
  if (!tool || typeof tool !== "object") {
    logger.warn(`[ToolController] Tool "${toolName}" is not an object`);
    return false;
  }

  const candidateTool = tool as Record<string, UntypedJson>;
  if (typeof candidateTool.execute !== "function") {
    logger.warn(`[ToolController] Tool "${toolName}" has no execute function`);
    return false;
  }

  return true;
}

function extractExistingMetadata(
  toolContext: ToolExecutionOptions,
): ToolExecutionMetadata {
  const experimentalContext = asRecord(toolContext.experimental_context);
  const experimentalMetadata = asRecord(experimentalContext?.metadata);
  if (experimentalMetadata) {
    return experimentalMetadata as ToolExecutionMetadata;
  }

  const legacyMetadata = asRecord(
    (toolContext as unknown as { metadata?: unknown }).metadata,
  );
  if (legacyMetadata) {
    return legacyMetadata as ToolExecutionMetadata;
  }

  return {};
}

function buildExperimentalContext(
  toolContext: ToolExecutionOptions,
  metadata: ToolExecutionMetadata,
  userId?: string,
): ToolExecutionExperimentalContext {
  const experimentalContext = asRecord(toolContext.experimental_context);

  return {
    ...(experimentalContext ?? {}),
    ...(userId ? { userId } : {}),
    metadata,
  };
}

export function buildAugmentedExecutionOptions(args: {
  toolContext: ToolExecutionOptions;
  metadataPatch: ToolExecutionMetadata;
  userId?: string;
}): AugmentedToolExecutionOptions {
  const metadata = {
    ...extractExistingMetadata(args.toolContext),
    ...args.metadataPatch,
  };

  return {
    ...args.toolContext,
    ...(args.userId ? { userId: args.userId } : {}),
    metadata,
    experimental_context: buildExperimentalContext(
      args.toolContext,
      metadata,
      args.userId,
    ),
  };
}

export function extractToolCallId(
  toolContext?: ToolExecutionOptions,
): string | undefined {
  return typeof toolContext?.toolCallId === "string"
    ? toolContext.toolCallId
    : undefined;
}

export function getToolExecuteFunction(
  tool: Tool,
): ToolWithExecute["execute"] {
  if (!tool.execute) {
    throw new Error(`Tool execute function is missing.`);
  }

  return tool.execute as ToolWithExecute["execute"];
}
