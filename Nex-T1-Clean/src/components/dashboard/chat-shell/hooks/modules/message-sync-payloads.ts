"use client";

import type { AssistantPayload } from "@/components/dashboard/chat-types";
import { isAIEventType } from "@/modules/chat/stream/aievent-contract";

export function dedupeMessagePayloads(
  payloads: AssistantPayload[] = [],
): AssistantPayload[] {
  if (payloads.length < 2) {
    return payloads;
  }

  const keyToIndex = new Map<string, number>();
  const next: AssistantPayload[] = [];

  for (const payload of payloads) {
    if (!payload) {
      continue;
    }
    let key = payload.type;
    let preferLatest = false;

    switch (payload.type) {
      case "tool-execution":
        key += `:${payload.toolCallId ?? payload.transactionHash ?? payload.toolName}`;
        preferLatest = true;
        break;
      case "citation":
        key += `:${payload.url}`;
        break;
      case "tool_call":
        key += `:${payload.toolCallId ?? payload.toolName}`;
        preferLatest = true;
        break;
      case "tool_result":
        key += `:${payload.toolCallId ?? payload.toolName}`;
        preferLatest = true;
        break;
      case "artifact_update":
        key += `:${payload.artifactId}:${payload.artifactType ?? ""}`;
        preferLatest = true;
        break;
      case "agent_handoff":
        key += `:${payload.fromAgent ?? ""}:${payload.toAgent}`;
        preferLatest = true;
        break;
      case "sandbox_start":
        key += `:${payload.sandboxId}`;
        preferLatest = true;
        break;
      case "sandbox_stream":
        key += `:${payload.sandboxId}:${payload.streamType}`;
        preferLatest = true;
        break;
      case "terminal_stream":
        key += `:${payload.command}`;
        preferLatest = true;
        break;
      case "workflow_update":
        key += `:${payload.workflowId}:${payload.stepName}`;
        preferLatest = true;
        break;
      case "task_update":
        key += `:${payload.taskId}`;
        preferLatest = true;
        break;
      case "test_result":
        key += `:${payload.testId}`;
        preferLatest = true;
        break;
      case "approval_required":
        key += `:${payload.approvalId ?? payload.toolName ?? ""}`;
        preferLatest = true;
        break;
      case "approval_update":
        key += `:${payload.approvalId ?? ""}`;
        preferLatest = true;
        break;
      case "confirmation_request":
        key += `:${payload.confirmationId}`;
        preferLatest = true;
        break;
      case "confirmation_response":
        key += `:${payload.confirmationId}`;
        preferLatest = true;
        break;
      case "image_output":
        key += `:${payload.url}`;
        preferLatest = true;
        break;
      case "transcription_output":
        key += `:${payload.sourceId ?? ""}`;
        preferLatest = true;
        break;
      case "jsx_output":
        preferLatest = true;
        break;
      case "web_preview_output":
        key += `:${payload.url ?? ""}`;
        preferLatest = true;
        break;
      case "web-preview":
        key += `:${payload.url}`;
        break;
      case "pyth-chart":
        key += `:${payload.ticker}`;
        break;
      case "coingecko-chart":
        key += `:${payload.id}:${payload.symbol}`;
        break;
      case "nft-chart":
        key += `:${payload.id}`;
        break;
      case "image-artifact":
        key += `:${payload.url}:${payload.prompt}`;
        break;
      case "orchestration":
        key += `:${payload.query}`;
        break;
      case "search":
        key += `:${payload.query}`;
        break;
      case "analysis":
      case "chain":
        key += `:${payload.topic}`;
        break;
      case "file-analysis":
        key += `:${payload.filename}:${payload.fileType}`;
        break;
      default:
        if (typeof payload.type === "string" && isAIEventType(payload.type)) {
          preferLatest = true;
        }
        break;
    }

    const existingIndex = keyToIndex.get(key);
    if (existingIndex === undefined) {
      keyToIndex.set(key, next.length);
      next.push(payload);
      continue;
    }

    if (preferLatest) {
      next[existingIndex] = payload;
    }
  }

  return next;
}
