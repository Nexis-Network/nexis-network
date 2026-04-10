import type { UIMessage } from "ai";

import { stringifyChatMessageContent } from "@/modules/chat/message-content";
import { findLatestMessageByRole } from "@/modules/chat/message-search";
import type { ChatAgentRequest } from "@/modules/chat/types";
import type { ChatExecutionPreferences } from "@/modules/chat/execution-preferences";
import {
  isChatFileUIPart,
  isChatImageUIPart,
  isChatTextUIPart,
} from "@/modules/chat/ui-message-parts";
import type { JsonObject, JsonValue } from "@/types/json";

type StructuredMessageContentPart =
  | { type: "text"; text: string }
  | { type: "image"; image: JsonValue; mimeType?: string }
  | { type: "file"; data: JsonValue; mimeType?: string };

export type ChatRequestDraft = Omit<ChatAgentRequest, "walletContext"> & {
  walletContext?: JsonObject;
};

function getLegacyMessageContent(message: UIMessage): unknown {
  return (message as UIMessage & { content?: unknown }).content;
}

function getPartMimeType(part: {
  mimeType?: string;
  mediaType?: string;
}): string | undefined {
  if (typeof part.mimeType === "string") {
    return part.mimeType;
  }

  if (typeof part.mediaType === "string") {
    return part.mediaType;
  }

  return undefined;
}

function extractContentFromMessage(
  message: UIMessage,
): string | StructuredMessageContentPart[] {
  if (Array.isArray(message.parts) && message.parts.length > 0) {
    const textParts: string[] = [];
    const structuredParts: StructuredMessageContentPart[] = [];
    let hasAttachments = false;

    for (const rawPart of message.parts as Array<unknown>) {
      const part = rawPart;
      if (isChatTextUIPart(part)) {
        const trimmed = part.text.trim();
        if (trimmed.length > 0) {
          textParts.push(trimmed);
          structuredParts.push({ type: "text", text: trimmed });
        }
        continue;
      }

      if (isChatImageUIPart(part)) {
        hasAttachments = true;
        const image = part.image ?? part.url;
        if (image !== undefined) {
          structuredParts.push({
            type: "image",
            image: image as JsonValue,
            ...(getPartMimeType(part)
              ? { mimeType: getPartMimeType(part) }
              : {}),
          });
        }
        continue;
      }

      if (isChatFileUIPart(part)) {
        hasAttachments = true;
        const data =
          "data" in part
            ? ((part as { data?: unknown; url?: unknown }).data ??
              (part as { url?: unknown }).url)
            : (part as { url?: unknown }).url;

        if (data !== undefined) {
          structuredParts.push({
            type: "file",
            data: data as JsonValue,
            ...(getPartMimeType(
              part as { mimeType?: string; mediaType?: string },
            )
              ? {
                  mimeType: getPartMimeType(
                    part as { mimeType?: string; mediaType?: string },
                  ),
                }
              : {}),
          });
        }
      }
    }

    if (hasAttachments && structuredParts.length > 0) {
      return structuredParts;
    }

    const textContent = textParts.join("\n");

    if (textContent.length > 0) return textContent;
  }

  const rawContent = getLegacyMessageContent(message);

  if (typeof rawContent === "string") {
    const trimmed = rawContent.trim();
    if (trimmed.length > 0) return trimmed;
  }

  if (Array.isArray(rawContent)) {
    const joined = rawContent
      .map((item) => stringifyChatMessageContent(item))
      .join("\n")
      .trim();

    if (joined.length > 0) return joined;
  }

  return "";
}

export function buildChatRequestFromUI(params: {
  messages: UIMessage[];
  sessionId?: string;
  model?: string;
  systemPromptProfileId?: string;
  walletContext?: JsonObject;
  executionPreferences?: ChatExecutionPreferences;
}): ChatRequestDraft {
  const chatMessages = params.messages
    .filter(
      (message) => message.role === "user" || message.role === "assistant",
    )
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: extractContentFromMessage(message),
    }))
    .filter((message) => {
      if (typeof message.content === "string") {
        return message.content.length > 0;
      }
      return Array.isArray(message.content) && message.content.length > 0;
    });

  if (chatMessages.length === 0) {
    throw new Error("At least one user message is required.");
  }

  return {
    ...(params.model ? { model: params.model } : {}),
    messages: chatMessages,
    ...(params.sessionId ? { sessionId: params.sessionId } : {}),
    ...(params.systemPromptProfileId
      ? { systemPromptProfileId: params.systemPromptProfileId }
      : {}),
    ...(params.walletContext ? { walletContext: params.walletContext } : {}),
    ...(params.executionPreferences
      ? { executionPreferences: params.executionPreferences }
      : {}),
  };
}

export function extractLatestUserMessageText(
  messages: ChatAgentRequest["messages"],
): string {
  return stringifyChatMessageContent(
    findLatestMessageByRole(messages, "user")?.content ?? "",
  );
}
