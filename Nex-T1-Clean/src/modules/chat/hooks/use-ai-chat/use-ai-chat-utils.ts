"use client";

import type { UIMessage } from "ai";

import { sanitizeUiMessagesForNativeChatRoute } from "@/modules/chat/controller/ui-message-sanitizer";
import { isTransientProgressAssistantMessage } from "@/modules/chat/transient-progress-message";

import {
  mapNexChatMessageToUIMessage,
  type NexChatMessage,
} from "./modules/use-chat-normalization";
import type { AnyUIMessage } from "./use-ai-chat.types";

export const EMPTY_BODY: Record<string, UntypedJson> = {};

const EXPECTED_CHAT_ERROR_CODES = ["amount_exceeded", "rate_limited"] as const;

export const mapToUIMessage = (message: NexChatMessage): UIMessage =>
  mapNexChatMessageToUIMessage(message);

export function isExpectedChatError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return EXPECTED_CHAT_ERROR_CODES.some((code) => message.includes(code));
}

export function normalizeConversationId(value?: string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function createSdkInitialMessages(
  initialMessages?: NexChatMessage[],
): UIMessage[] | undefined {
  if (!Array.isArray(initialMessages) || initialMessages.length === 0) {
    return undefined;
  }

  return initialMessages.map((message) => ({
    id: message.id,
    role: message.role as "user" | "assistant" | "system",
    content: message.content,
    parts: [{ type: "text" as const, text: message.content }],
  }));
}

export function createClientTimeContext():
  | {
      timeZone: string;
      timestamp: string;
      formatted24h: string;
      locale: string;
    }
  | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const now = new Date();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const locale = navigator.language || "en-US";
    const formatted24h = new Intl.DateTimeFormat(locale, {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZoneName: "short",
    }).format(now);

    return {
      timeZone,
      timestamp: now.toISOString(),
      formatted24h,
      locale,
    };
  } catch {
    return undefined;
  }
}

export function buildChatRequestBody(args: {
  model?: string;
  systemPromptProfileId?: string;
  conversationId: string | null;
  clientTimeContext?: {
    timeZone: string;
    timestamp: string;
    formatted24h: string;
    locale: string;
  };
  body: Record<string, UntypedJson>;
}): Record<string, UntypedJson> {
  const {
    model,
    systemPromptProfileId,
    conversationId,
    clientTimeContext,
    body,
  } = args;

  return {
    model,
    systemPromptProfileId,
    clientTimeContext,
    ...(conversationId ? { sessionId: conversationId } : {}),
    ...body,
  };
}

export function scrubChatStoreMessages(
  messages: AnyUIMessage[],
): AnyUIMessage[] {
  const sanitized = sanitizeUiMessagesForNativeChatRoute(
    messages.filter((message) => {
      if (message.role === "user") {
        return true;
      }

      const hasContent =
        typeof message.content === "string" && message.content.trim().length > 0;
      const hasParts =
        Array.isArray(message.parts) && message.parts.length > 0;

      if (!(hasContent || hasParts)) {
        return false;
      }

      return !isTransientProgressAssistantMessage(message);
    }),
    { preserveStaticToolTypes: true },
  );

  return sanitized as AnyUIMessage[];
}
