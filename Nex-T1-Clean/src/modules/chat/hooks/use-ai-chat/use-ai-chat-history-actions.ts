"use client";

import { useCallback } from "react";
import type { UIMessage } from "ai";

import { writeStoredActiveStreamConversationId } from "@/lib/hooks/chat/chat-resume-storage";
import type { AnyUIMessage, NexChatMessage } from "./use-ai-chat.types";

type SetChatMessages = (
  messages: AnyUIMessage[] | ((messages: AnyUIMessage[]) => AnyUIMessage[]),
) => void;

export function useNexChatHistoryActions(args: {
  setMessages: SetChatMessages;
  setLocalError: (error: Error | null) => void;
  mapToUIMessageInstance: (message: NexChatMessage) => UIMessage;
}): {
  append: (message: NexChatMessage) => void;
  replaceMessages: (messages: NexChatMessage[]) => void;
  clear: () => void;
} {
  const { setMessages, setLocalError, mapToUIMessageInstance } = args;

  const append = useCallback(
    (message: NexChatMessage) => {
      const uiMessage = mapToUIMessageInstance(message);

      setMessages((previousMessages) => [
        ...previousMessages,
        uiMessage as AnyUIMessage,
      ]);
    },
    [mapToUIMessageInstance, setMessages],
  );

  const replaceMessages = useCallback(
    (nextMessages: NexChatMessage[]) => {
      setMessages(
        nextMessages.map(
          (message) => mapToUIMessageInstance(message) as AnyUIMessage,
        ),
      );
    },
    [mapToUIMessageInstance, setMessages],
  );

  const clear = useCallback(() => {
    setMessages([]);
    setLocalError(null);
    writeStoredActiveStreamConversationId(null);
  }, [setLocalError, setMessages]);

  return { append, replaceMessages, clear };
}
