import { emitApprovalLifecycleEvents } from "@/modules/chat/approval-events";
import { persistToolArtifact } from "@/modules/chat/tool-persistence";
import { upsertUserArtifactRecord } from "@/server/services/artifacts/user-artifacts";
import { registerSandboxOwnership } from "@/server/services/e2b/sandbox-session";
import { setConversationSandboxId } from "@/server/services/e2b/sandbox-service";
import { logger } from "@/lib/logger";

import { classifyToolResult, isErrorContractEnabled } from "./errors";
import {
  buildImageArtifactPayloads,
  buildToolExecutionPayload,
  emitPayloadBatch,
} from "./tool-runner-payloads";
import type { ToolEventEmitter } from "./tool-runner-types";

function asRecord(value: UntypedJson): Record<string, UntypedJson> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, UntypedJson>)
    : {};
}

function resolveToolArtifactType(toolName: string): string {
  if (
    toolName === "e2b_code_interpreter" ||
    toolName === "openai_code_interpreter"
  ) {
    return "code-execution";
  }

  if (toolName === "e2b_get_preview_url") {
    return "web-preview";
  }

  if (
    toolName === "e2b_write_file" ||
    toolName === "e2b_read_file" ||
    toolName === "e2b_list_dir"
  ) {
    return "file-tree";
  }

  if (toolName === "e2b_npm_run" || toolName === "e2b_npm_install") {
    return "terminal";
  }

  if (toolName.includes("simulate") || toolName.includes("transaction")) {
    return "transaction-simulation";
  }

  return "tool-output";
}

async function syncSandboxOwnership(args: {
  record: Record<string, UntypedJson>;
  userId: string;
  sessionId?: string;
  toolName: string;
  executionId: string;
  resultPayload: UntypedJson;
  updateLatestSandboxId: (sandboxId: string) => void;
}) {
  const sandboxId =
    (typeof args.record.sandboxID === "string" && args.record.sandboxID) ||
    (typeof args.record.sandboxId === "string" && args.record.sandboxId) ||
    null;

  if (sandboxId) {
    args.updateLatestSandboxId(sandboxId);

    try {
      await registerSandboxOwnership(args.userId, sandboxId);
    } catch (error) {
      logger.warn("[ToolController] Failed to register sandbox ownership", error);
    }

    if (args.sessionId) {
      try {
        await setConversationSandboxId(args.sessionId, sandboxId);
      } catch (error) {
        logger.warn(
          "[ToolController] Failed to persist conversation sandbox ID",
          error,
        );
      }
    }
  }

  const previewUrl =
    (typeof args.record.url === "string" && args.record.url) ||
    (typeof args.record.previewUrl === "string" && args.record.previewUrl) ||
    null;

  const artifactId = sandboxId
    ? `sandbox:${sandboxId}`
    : `tool:${args.sessionId ?? "session"}:${args.toolName}`;

  void upsertUserArtifactRecord({
    artifactId,
    userId: args.userId,
    conversationId: args.sessionId ?? null,
    artifactType: resolveToolArtifactType(args.toolName),
    title: args.toolName.replace(/_/g, " "),
    tags: [args.toolName, resolveToolArtifactType(args.toolName)],
    sandboxId,
    previewUrl,
    snapshot: args.resultPayload,
    metadata: {
      executionId: args.executionId,
      toolName: args.toolName,
      source: "tool_runner",
    },
  });
}

export async function handleWrappedToolResult(args: {
  toolName: string;
  input: UntypedJson;
  resultPayload: UntypedJson;
  executionId: string;
  toolCallId?: string;
  startedAt: number;
  emitEvent: ToolEventEmitter;
  userId?: string;
  sessionId?: string;
  updateLatestSandboxId: (sandboxId: string) => void;
}): Promise<{ artifactId?: string }> {
  const artifactId = await persistToolArtifact(args.toolName, args.resultPayload);

  if (isErrorContractEnabled()) {
    const resultStatus = classifyToolResult(args.toolName, args.resultPayload);
    switch (resultStatus) {
      case "error":
        logger.warn("[ToolResult] Tool returned error result", {
          toolName: args.toolName,
          result: args.resultPayload,
        });
        break;
      case "permission_denied":
        logger.warn("[ToolResult] Tool returned permission denied", {
          toolName: args.toolName,
          result: args.resultPayload,
        });
        args.emitEvent("tool_permission_denied", {
          toolName: args.toolName,
          executionId: args.executionId,
        });
        break;
      case "empty_result":
        logger.debug("[ToolResult] Tool returned empty result", {
          toolName: args.toolName,
        });
        break;
      case "partial_result":
        logger.info("[ToolResult] Tool returned partial result", {
          toolName: args.toolName,
        });
        break;
      default:
        break;
    }
  }

  emitApprovalLifecycleEvents({
    output: args.resultPayload,
    toolName: args.toolName,
    emit: args.emitEvent,
  });

  emitPayloadBatch(args.emitEvent, [
    buildToolExecutionPayload({
      id: args.executionId,
      toolCallId: args.toolCallId,
      toolName: args.toolName,
      status: "completed",
      input: args.input,
      output: args.resultPayload,
      executionTime: Date.now() - args.startedAt,
    }),
  ]);

  if (args.userId) {
    await syncSandboxOwnership({
      record: asRecord(args.resultPayload),
      userId: args.userId,
      sessionId: args.sessionId,
      toolName: args.toolName,
      executionId: args.executionId,
      resultPayload: args.resultPayload,
      updateLatestSandboxId: args.updateLatestSandboxId,
    });
  }

  emitPayloadBatch(
    args.emitEvent,
    buildImageArtifactPayloads({
      input: args.input,
      resultPayload: args.resultPayload,
    }),
  );

  return { artifactId };
}
