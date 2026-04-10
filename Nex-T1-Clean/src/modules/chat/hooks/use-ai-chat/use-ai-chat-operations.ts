"use client";

import { useCallback } from "react";
import type { FileUIPart } from "ai";

import { writeStoredActiveStreamConversationId } from "@/lib/hooks/chat/chat-resume-storage";
import { isLocalConversationId } from "@/modules/chat/persistence/local-conversation-id";
import { resolveConversationIdForSend } from "./modules/resolve-conversation-id";
import { useNexChatHistoryActions } from "./use-ai-chat-history-actions";
import { scrubChatStoreMessages } from "./use-ai-chat-utils";
import type { UseNexChatOperationsArgs } from "./use-ai-chat-operations.types";
import { logger } from "@/lib/logger";

export function useNexChatOperations({
  chatMessages,
  setMessages,
  sendSdkMessage,
  cancelActiveStream,
  regenerate,
  stopSdkChat,
  resume,
  conversationId,
  chatRequestBody,
  handleConversationId,
  resolveConversationId,
  onErrorRef,
  setLocalError,
  setLocalInput,
  mapToUIMessageInstance,
  firstAssistantMessageLoggedRef,
  firstAssistantTextLoggedRef,
}: UseNexChatOperationsArgs) {
  const scrubInvalidMessages = useCallback(() => {
    const sanitizedMessages = scrubChatStoreMessages(chatMessages);

    setMessages(sanitizedMessages);
  }, [chatMessages, setMessages]);

  const stop = useCallback(() => {
    writeStoredActiveStreamConversationId(null);
    const shouldCancelServerStream =
      typeof conversationId === "string" &&
      conversationId.length > 0 &&
      !isLocalConversationId(conversationId);

    if (!shouldCancelServerStream) {
      stopSdkChat();
      return;
    }

    if (!resume) {
      stopSdkChat();
    }

    void cancelActiveStream(conversationId)
      .then((result) => {
        if (resume && result !== "cancelled") {
          stopSdkChat();
        }
      })
      .catch((error) => {
        const resolvedError =
          error instanceof Error ? error : new Error(String(error));
        logger.error("[useNexChat] stop error:", resolvedError);
        setLocalError(resolvedError);
        onErrorRef.current?.(resolvedError);
        stopSdkChat();
      });
  }, [
    cancelActiveStream,
    conversationId,
    onErrorRef,
    resume,
    setLocalError,
    stopSdkChat,
  ]);

  const sendMessage = useCallback(
    async ({
      text,
      files,
      body,
    }: {
      text: string;
      files?: FileUIPart[];
      body?: Record<string, UntypedJson>;
    }) => {
      setLocalError(null);
      setLocalInput("");
      firstAssistantMessageLoggedRef.current = false;
      firstAssistantTextLoggedRef.current = false;

      try {
        scrubInvalidMessages();
        const requestConversationId = await resolveConversationIdForSend({
          conversationId,
          text,
          handleConversationId,
          resolveConversationId,
        });
        if (requestConversationId) {
          writeStoredActiveStreamConversationId(requestConversationId);
        }

        const messagePayload =
          Array.isArray(files) && files.length > 0 ? { text, files } : { text };
        const requestBody = { ...chatRequestBody, ...(body ?? {}) };
        if (requestConversationId) {
          requestBody.sessionId = requestConversationId;
        }
        const requestOptions =
          Object.keys(requestBody).length > 0 ? { body: requestBody } : undefined;

        await sendSdkMessage(messagePayload, requestOptions);
      } catch (error) {
        writeStoredActiveStreamConversationId(null);
        logger.error("[useNexChat] sendMessage error:", error);
        const resolvedError =
          error instanceof Error ? error : new Error(String(error));
        setLocalError(resolvedError);
        onErrorRef.current?.(resolvedError);
      }
    },
    [
      chatRequestBody,
      conversationId,
      firstAssistantMessageLoggedRef,
      firstAssistantTextLoggedRef,
      handleConversationId,
      onErrorRef,
      resolveConversationId,
      scrubInvalidMessages,
      sendSdkMessage,
      setLocalError,
      setLocalInput,
    ],
  );

  const reload = useCallback(async () => {
    setLocalError(null);
    writeStoredActiveStreamConversationId(null);

    try {
      scrubInvalidMessages();
      await regenerate();
    } catch (error) {
      writeStoredActiveStreamConversationId(null);
      logger.error("[useNexChat] reload error:", error);
      const resolvedError =
        error instanceof Error ? error : new Error(String(error));
      setLocalError(resolvedError);
      onErrorRef.current?.(resolvedError);
    }
  }, [onErrorRef, regenerate, scrubInvalidMessages, setLocalError]);
  const { append, replaceMessages, clear } = useNexChatHistoryActions({
    setMessages,
    setLocalError,
    mapToUIMessageInstance,
  });

  return {
    stop,
    sendMessage,
    reload,
    append,
    replaceMessages,
    clear,
  };
}
