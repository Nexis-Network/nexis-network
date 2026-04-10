"use client";

import type { LanguageModelUsage } from "ai";

import type { ComposerContextUsage } from "@/components/chat-composer/types";
import type { ChatModel } from "@/components/dashboard/chat-config";
import type { ConversationMessage } from "@/components/dashboard/chat-types";
import type { NexChatMessage } from "@/types/chat-message";
import { getModelContextLimit } from "@/modules/chat/model-context-limits";

export function createChatStoreId(seed?: string | null): string {
  if (typeof seed === "string" && seed.trim().length > 0) {
    return seed.trim();
  }

  const randomPart =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  return `draft:${randomPart}`;
}

export function toHydratedAiMessage(
  message: ConversationMessage,
): NexChatMessage {
  const textFromParts = (message.parts ?? [])
    .filter(
      (part): part is typeof part & { text: string } =>
        part.type === "text" && typeof part.text === "string",
    )
    .map((part) => part.text)
    .join("\n")
    .trim();

  return {
    id: message.id,
    role: message.role,
    content: message.content ?? textFromParts,
    parts: message.parts?.map((part) => ({ ...part })),
  };
}

export function buildComposerContextUsage(
  usage:
    | {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      }
    | undefined,
  selectedModel: ChatModel,
): ComposerContextUsage | null {
  if (!usage) {
    return null;
  }

  return {
    usedTokens: usage.totalTokens,
    maxTokens:
      selectedModel.contextWindow ??
      selectedModel.maxTokens ??
      getModelContextLimit(selectedModel.model),
    usage: {
      ...usage,
      inputTokens: usage.promptTokens,
      outputTokens: usage.completionTokens,
    } as unknown as LanguageModelUsage,
    modelId: selectedModel.model,
  };
}
