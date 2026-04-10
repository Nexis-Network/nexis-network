"use client";

import type { ConversationMessage } from "@/components/dashboard/chat-types";

export function getConversationMessageRenderedText(
  message: ConversationMessage,
): string {
  if (typeof message.content === "string" && message.content.trim().length > 0) {
    return message.content.trim();
  }

  if (!Array.isArray(message.parts)) {
    return "";
  }

  return message.parts
    .filter(
      (part): part is typeof part & { text: string } =>
        part.type === "text" && typeof part.text === "string",
    )
    .map((part) => part.text)
    .join("")
    .trim();
}
