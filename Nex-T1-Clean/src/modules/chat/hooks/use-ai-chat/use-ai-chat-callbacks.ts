"use client";

import type { UIMessage } from "ai";
import { useCallback, useState } from "react";

import { writeStoredActiveStreamConversationId } from "@/lib/hooks/chat/chat-resume-storage";
import type { UseNexChatOptions } from "./use-ai-chat.types";
import { isExpectedChatError, normalizeConversationId } from "./use-ai-chat-utils";
import { logger } from "@/lib/logger";

type LatestRef<T> = {
  current: T;
};

type ConversationStateArgs = Pick<
  UseNexChatOptions,
  "conversationId" | "onConversationId"
> & {
  isConversationIdControlled: boolean;
};

export function useConversationState(args: ConversationStateArgs): {
  conversationId: string | null;
  handleConversationId: (nextConversationId: string) => void;
} {
  const {
    conversationId: controlledConversationId,
    isConversationIdControlled,
    onConversationId,
  } = args;
  const normalizedControlledConversationId = normalizeConversationId(
    controlledConversationId,
  );
  const [uncontrolledConversationId, setUncontrolledConversationId] =
    useState<string | null>(normalizedControlledConversationId);
  const conversationId = isConversationIdControlled
    ? normalizedControlledConversationId
    : uncontrolledConversationId;

  const handleConversationId = useCallback(
    (nextConversationId: string) => {
      const normalizedConversationId = normalizeConversationId(
        nextConversationId,
      );

      if (!normalizedConversationId) {
        return;
      }

      if (!isConversationIdControlled) {
        setUncontrolledConversationId(normalizedConversationId);
      }

      onConversationId?.(normalizedConversationId);
    },
    [isConversationIdControlled, onConversationId],
  );

  return { conversationId, handleConversationId };
}

export function useChatLifecycleCallbacks(args: {
  onErrorRef: LatestRef<UseNexChatOptions["onError"]>;
  onFinishRef: LatestRef<UseNexChatOptions["onFinish"]>;
  setLocalError: (error: Error | null) => void;
}): {
  handleChatError: (error: Error) => void;
  handleChatFinish: (result: UntypedJson) => void;
} {
  const { onErrorRef, onFinishRef, setLocalError } = args;

  const handleChatError = useCallback(
    (error: Error) => {
      const resolvedError =
        error instanceof Error ? error : new Error(String(error));

      writeStoredActiveStreamConversationId(null);

      if (isExpectedChatError(resolvedError)) {
        logger.warn("[useNexChat] expected chat error", resolvedError.message);
      } else {
        logger.error("[useNexChat] useChat onError:", resolvedError);
      }

      setLocalError(resolvedError);
      onErrorRef.current?.(resolvedError);
    },
    [onErrorRef, setLocalError],
  );

  const handleChatFinish = useCallback(
    (result: UntypedJson) => {
      const finishResult =
        typeof result === "object" && result !== null
          ? (result as {
              message?: UIMessage | null;
              finishReason?: string;
              isError?: boolean;
            })
          : {};
      const message = finishResult.message;

      if (message && typeof message === "object") {
        onFinishRef.current?.(message as UIMessage);
      }

      writeStoredActiveStreamConversationId(null);
    },
    [onFinishRef],
  );

  return { handleChatError, handleChatFinish };
}
