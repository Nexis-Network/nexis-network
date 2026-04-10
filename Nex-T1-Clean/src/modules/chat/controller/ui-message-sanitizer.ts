import type { UIMessage } from "ai";

import { extractTextFromUIMessage } from "@/server/chat/conversation-store";
import { sanitizeAssistantTranscriptText } from "@/modules/chat/pipeline/response/planning-filter";
import { deriveStructuredFallbackText } from "@/modules/chat/ui-fallback-text";
import { isTransientProgressAssistantMessage } from "@/modules/chat/transient-progress-message";

type MessagePart = {
  type?: unknown;
  id?: unknown;
  text?: unknown;
  toolName?: unknown;
  toolCallId?: unknown;
  data?: unknown;
  input?: unknown;
  output?: unknown;
  result?: unknown;
  state?: unknown;
  approval?: unknown;
  errorText?: unknown;
  rawInput?: unknown;
  providerExecuted?: unknown;
  callProviderMetadata?: unknown;
  preliminary?: unknown;
  title?: unknown;
};

type SanitizeUiMessagesOptions = {
  preserveStaticToolTypes?: boolean;
};

type SanitizedUIPart = NonNullable<UIMessage["parts"]>[number];

function normalizeRole(role: UIMessage["role"] | string | undefined): UIMessage["role"] {
  if (role === "user" || role === "assistant" || role === "system") {
    return role;
  }

  return "assistant";
}

function deriveFallbackText(message: UIMessage): string {
  const extracted = sanitizeAssistantTranscriptText(
    extractTextFromUIMessage(message),
  ).trim();
  return deriveStructuredFallbackText({
    role: message.role,
    content: extracted,
    parts: Array.isArray(message.parts)
      ? (message.parts as MessagePart[])
      : [],
  });
}

function isToolContinuationPart(part: unknown): part is MessagePart {
  if (!part || typeof part !== "object" || Array.isArray(part)) {
    return false;
  }

  const candidate = part as MessagePart;
  if (
    typeof candidate.type === "string" &&
    (candidate.type === "dynamic-tool" || candidate.type.startsWith("tool-"))
  ) {
    return true;
  }

  return (
    typeof candidate.state === "string" &&
    typeof candidate.toolName === "string"
  );
}

function deriveToolName(part: MessagePart): string | null {
  if (typeof part.toolName === "string" && part.toolName.trim().length > 0) {
    return part.toolName.trim();
  }

  if (typeof part.type === "string" && part.type.startsWith("tool-")) {
    const derived = part.type.slice("tool-".length).trim();
    return derived.length > 0 ? derived : null;
  }

  return null;
}

function deriveToolCallId(part: MessagePart): string | null {
  if (typeof part.toolCallId === "string" && part.toolCallId.trim().length > 0) {
    return part.toolCallId.trim();
  }

  if (typeof part.id === "string" && part.id.trim().length > 0) {
    return part.id.trim();
  }

  return null;
}

function normalizeContinuationPart(
  part: MessagePart | SanitizedUIPart,
  options: SanitizeUiMessagesOptions,
): SanitizedUIPart {
  if (
    options.preserveStaticToolTypes ||
    !isToolContinuationPart(part) ||
    part.type === "dynamic-tool"
  ) {
    return part as SanitizedUIPart;
  }

  const toolName = deriveToolName(part);
  const toolCallId = deriveToolCallId(part);

  if (!toolName || !toolCallId) {
    return part as SanitizedUIPart;
  }

  return {
    ...part,
    type: "dynamic-tool" as const,
    toolName,
    toolCallId,
  } as SanitizedUIPart;
}

export function sanitizeUiMessagesForNativeChatRoute(
  uiMessages: UIMessage[],
  options: SanitizeUiMessagesOptions = {},
): UIMessage[] {
  return uiMessages.map((message) => {
    const role = normalizeRole(message.role);

    if (role === "user") {
      return {
        ...message,
        role,
      };
    }

    const continuationParts = Array.isArray(message.parts)
      ? message.parts.filter(
          (part): part is typeof part => {
            if (part.type === "text" && typeof part.text === "string") {
              return (
                sanitizeAssistantTranscriptText(part.text).trim().length > 0
              );
            }

            return isToolContinuationPart(part);
          },
        ).map((part) => {
          if (part.type === "text" && typeof part.text === "string") {
            return {
              ...part,
              text: sanitizeAssistantTranscriptText(part.text),
            };
          }

          return normalizeContinuationPart(part, options);
        })
      : [];

    if (continuationParts.length > 0) {
      return {
        ...message,
        role,
        parts: continuationParts,
      };
    }

    if (isTransientProgressAssistantMessage(message)) {
      return {
        ...message,
        role,
        parts: [],
      };
    }

    const fallbackText = deriveFallbackText(message);
    return {
      ...message,
      role,
      parts: [{ type: "text" as const, text: fallbackText }],
    };
  });
}
