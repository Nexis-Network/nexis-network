import { isTransientProgressAssistantMessage } from "@/modules/chat/transient-progress-message";
import { deriveFallbackText } from "./fallback";
import { sanitizePartsForUseChat } from "./sanitize-parts";
import type { AnyUIMessage, MessagePart, NexChatMessage } from "./types";

function joinTextParts(parts: MessagePart[]): string {
  return parts
    .filter(
      (part): part is MessagePart & { type: "text"; text: string } =>
        part.type === "text" && typeof part.text === "string",
    )
    .map((part) => part.text)
    .join("\n");
}

export function mapNexChatMessageToUIMessage(msg: NexChatMessage): AnyUIMessage {
  const parts = sanitizePartsForUseChat(msg);
  const rawContent =
    typeof msg.content === "string" && msg.content.trim().length > 0
      ? msg.content.trim()
      : "";
  const derivedContent = isTransientProgressAssistantMessage({
    ...msg,
    parts,
  })
    ? ""
    : deriveFallbackText({
        ...msg,
        content: "",
      });
  const content =
    rawContent &&
    !(
      rawContent === "Structured response available." &&
      derivedContent &&
      derivedContent !== rawContent
    )
      ? rawContent
      : derivedContent || joinTextParts(parts);

  return {
    id: msg.id,
    role: msg.role,
    content,
    createdAt: msg.createdAt,
    parts,
  } as AnyUIMessage;
}
