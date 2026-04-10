"use client";

import { useCallback } from "react";

import type { PromptInputMessage } from "@/components/chat-composer/types";

import { submitComposerMessage } from "./modules/chat-submit";

type UseChatControllerSubmitArgs = Omit<
  Parameters<typeof submitComposerMessage>[0],
  "message"
>;

export function useChatControllerSubmit({
  chatStatus,
  isLoggedIn,
  creditsLoading,
  remainingCredits,
  selectedModel,
  walletContext,
  processMarketRequest,
  sendMessage,
  setAuthDialogOpen,
  onMarketIntent,
}: UseChatControllerSubmitArgs) {
  return useCallback(
    async (message: PromptInputMessage) => {
      return submitComposerMessage({
        chatStatus,
        isLoggedIn,
        creditsLoading,
        remainingCredits,
        message,
        selectedModel,
        walletContext,
        processMarketRequest,
        sendMessage,
        setAuthDialogOpen,
        onMarketIntent,
      });
    },
    [
      chatStatus,
      creditsLoading,
      isLoggedIn,
      onMarketIntent,
      processMarketRequest,
      remainingCredits,
      selectedModel,
      sendMessage,
      setAuthDialogOpen,
      walletContext,
    ],
  );
}
