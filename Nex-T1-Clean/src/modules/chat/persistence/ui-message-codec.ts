"use server";

import { validateUIMessages, type Tool, type UIMessage } from "ai";

import { logger } from "@/lib/logger";
import { sanitizeAssistantTranscriptText } from "@/modules/chat/pipeline/response/planning-filter";
import { deriveStructuredFallbackText } from "@/modules/chat/ui-fallback-text";

type LooseUIMessage = {
  id?: unknown;
  role?: unknown;
  parts?: unknown;
  metadata?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toLooseUIMessage(
  value: unknown,
  index: number,
): UIMessage | null {
  if (!isRecord(value) || !Array.isArray(value.parts)) {
    return null;
  }

  const candidate = value as LooseUIMessage;
  const id =
    typeof candidate.id === "string" && candidate.id.trim().length > 0
      ? candidate.id.trim()
      : `message-${index}`;

  return {
    id,
    role:
      typeof candidate.role === "string"
        ? (candidate.role as UIMessage["role"])
        : "assistant",
    parts: candidate.parts as UIMessage["parts"],
    ...(isRecord(candidate.metadata)
      ? { metadata: candidate.metadata as UIMessage["metadata"] }
      : {}),
  };
}

function buildLooseUIMessages(
  messages: unknown,
  mode: "strict" | "lenient",
): UIMessage[] {
  if (!Array.isArray(messages)) {
    throw new Error("messages_must_be_an_array");
  }

  const normalized = messages.map((message, index) =>
    toLooseUIMessage(message, index),
  );

  if (mode === "strict" && normalized.some((message) => message === null)) {
    throw new Error("messages_must_be_valid_ui_messages");
  }

  return normalized.filter((message): message is UIMessage => message !== null);
}

function normalizeRole(role: UIMessage["role"]): UIMessage["role"] {
  if (role === "user" || role === "assistant" || role === "system") {
    return role;
  }

  return "assistant";
}

function normalizeInputMessage(message: UIMessage): UIMessage | null {
  const role = normalizeRole(message.role);
  if (role === "user") {
    return {
      ...message,
      role,
    };
  }

  const textParts = Array.isArray(message.parts)
    ? message.parts
        .filter(
          (
            part,
          ): part is Extract<NonNullable<UIMessage["parts"]>[number], { type: "text" }> =>
            part.type === "text" && typeof part.text === "string",
        )
        .map((part) => ({
          ...part,
          text: sanitizeAssistantTranscriptText(part.text),
        }))
        .filter((part) => part.text.trim().length > 0)
    : [];

  if (textParts.length > 0) {
    return {
      ...message,
      role,
      parts: textParts,
    };
  }

  const fallbackText = deriveStructuredFallbackText({
    role,
    parts: Array.isArray(message.parts) ? message.parts : [],
  }).trim();

  if (fallbackText.length === 0) {
    return null;
  }

  return {
    ...message,
    role,
    parts: [
      {
        type: "text" as const,
        text: fallbackText,
      },
    ],
  };
}

async function validateCandidateMessages(
  messages: UIMessage[],
  options: {
    normalizeForInput: boolean;
    tools?: Record<string, Tool>;
  },
): Promise<UIMessage[]> {
  if (messages.length === 0) {
    return [];
  }

  const sanitizedMessages = options.normalizeForInput
    ? messages
        .map(normalizeInputMessage)
        .filter((message): message is UIMessage => message !== null)
    : messages;

  if (options.normalizeForInput && sanitizedMessages.length !== messages.length) {
    throw new Error("messages_must_be_valid_ui_messages");
  }

  return validateUIMessages({
    messages: sanitizedMessages,
    ...(options.tools
      ? {
          tools: options.tools as {
            [key: string]: Tool<unknown, unknown> | undefined;
          },
        }
      : {}),
  });
}

export async function validateInputUIMessages(
  messages: unknown,
  options?: { tools?: Record<string, Tool> },
): Promise<UIMessage[]> {
  return validateCandidateMessages(buildLooseUIMessages(messages, "strict"), {
    normalizeForInput: true,
    ...(options?.tools ? { tools: options.tools } : {}),
  });
}

export async function decodePersistedUIMessages(
  messages: unknown,
  options?: { tools?: Record<string, Tool> },
): Promise<UIMessage[]> {
  const candidates = buildLooseUIMessages(messages, "lenient");

  try {
    return await validateCandidateMessages(candidates, {
      normalizeForInput: false,
      ...(options?.tools ? { tools: options.tools } : {}),
    });
  } catch (error) {
    const recovered: UIMessage[] = [];

    for (const candidate of candidates) {
      try {
        const [validated] = await validateCandidateMessages([candidate], {
          normalizeForInput: false,
          ...(options?.tools ? { tools: options.tools } : {}),
        });
        if (validated) {
          recovered.push(validated);
        }
      } catch {
        continue;
      }
    }

    logger.warn("persisted_ui_messages_invalid", {
      attemptedCount: candidates.length,
      recoveredCount: recovered.length,
      error: error instanceof Error ? error.message : String(error),
    });

    return recovered;
  }
}
