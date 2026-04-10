import { deriveFallbackText } from "./fallback";
import { coerceNonEmptyString } from "./guards";
import type { MessagePart, NexChatMessage } from "./types";

export function sanitizePartsForUseChat(message: NexChatMessage): MessagePart[] {
  const rawParts = Array.isArray(message.parts) ? message.parts : [];
  const textParts = rawParts
    .filter(
      (part): part is MessagePart & { type: "text"; text: string } =>
        part.type === "text" && typeof part.text === "string",
    )
    .map((part) => ({
      type: "text" as const,
      text: part.text,
    }));

  if (message.role === "user") {
    const fileParts = rawParts
      .map((part) => {
        const url = coerceNonEmptyString(part.url);
        const mediaType = coerceNonEmptyString(part.mediaType);
        if (part.type !== "file" || !url || !mediaType) {
          return null;
        }

        const filename = coerceNonEmptyString(part.filename);
        return {
          type: "file",
          url,
          mediaType,
          ...(filename ? { filename } : {}),
        } as MessagePart;
      })
      .filter((part): part is NonNullable<typeof part> => part !== null);

    if (textParts.length > 0 || fileParts.length > 0) {
      return [...textParts, ...fileParts];
    }
  } else if (rawParts.length > 0) {
    return rawParts;
  }

  const fallbackText = deriveFallbackText(message);
  return fallbackText ? [{ type: "text", text: fallbackText }] : [];
}
