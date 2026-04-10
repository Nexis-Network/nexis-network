"use client";

import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import {
  getChatToolPartCallId,
  getChatToolPartInput,
  getChatToolPartName,
  isChatToolUIPart,
} from "@/modules/chat/ui-message-parts";
import type { JsonValue } from "@/types/json";

export function useToolHandler(
  messages: UIMessage[],
  onToolCall?: (toolCall: {
    toolName: string;
    args: JsonValue;
    toolCallId?: string;
    partIndex?: number;
  }) => void
) {
  // Track tool calls for callback
  const emittedToolCallsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!onToolCall || messages.length === 0) return;

    // AI SDK chat messages use the UIMessage part model here.
    // We assume the last message is relevant for tool calls
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || latestMessage.role !== "assistant" || !latestMessage.parts) return;

    for (const [partIndex, part] of latestMessage.parts.entries()) {
      if (!isChatToolUIPart(part)) {
        continue;
      }

      const toolCallId = getChatToolPartCallId(part);
      const dedupeKey = `${latestMessage.id}:${toolCallId ?? `${part.type}-${partIndex}`}`;

      if (emittedToolCallsRef.current.has(dedupeKey)) {
        continue;
      }

      emittedToolCallsRef.current.add(dedupeKey);
      onToolCall({
        toolName: getChatToolPartName(part),
        args: getChatToolPartInput(part),
        ...(toolCallId ? { toolCallId } : {}),
        partIndex,
      });
    }
  }, [messages, onToolCall]);
}
