"use client";

import { useCallback, useRef } from "react";
import { toast } from "sonner";

import { useConversationSession } from "@/components/chat/conversation-session-provider";
import { useCreditsContext } from "@/components/providers/credits-provider";
import { useChatMetrics } from "@/hooks/chat/use-chat-metrics";

import { toUserFacingChatError } from "./controller/chat-error";
import { useChatAuth } from "./modules/use-chat-auth";
import { useChatCheckpoints } from "./modules/use-chat-checkpoints";
import { useChatComposerStyle } from "./modules/use-chat-composer-style";
import { useChatExecutionPreferences } from "./modules/use-chat-execution-preferences";
import { useChatModel } from "./modules/use-chat-model";
import { useChatVoiceMode } from "./modules/use-chat-voice-mode";
import { useChatWalletContext } from "./modules/use-chat-wallet-context";
import { useMarketProcessor } from "./modules/use-market-processor";
import { useChatControllerAiState } from "./use-chat-controller-ai-state";
import { createChatStoreId } from "./use-chat-controller-utils";
import type { UseChatControllerArgs } from "./use-chat-controller.types";

export function useChatControllerRuntime({
  onSelectedModelChange,
}: UseChatControllerArgs = {}) {
  const initialChatStoreIdRef = useRef<string | null>(null);
  const {
    messages: sessionMessages,
    appendMessage: addMessage,
    updateMessage,
    removeMessage,
    replaceMessages,
    persistMessages,
    createNewConversation,
    currentConversationId,
    historySyncVersion,
    registerHistorySyncListener,
    resumeStreamOnMount,
    setCurrentConversationId,
  } = useConversationSession();

  if (!initialChatStoreIdRef.current) {
    initialChatStoreIdRef.current = createChatStoreId(currentConversationId);
  }

  const {
    authDialogOpen,
    setAuthDialogOpen,
    isLoggedIn,
    isAuthChecking,
    handleAuthNavigation,
  } = useChatAuth();
  const metrics = useChatMetrics();
  const {
    credits: remainingCredits,
    loading: creditsLoading,
    plan,
    refreshCredits,
  } = useCreditsContext();
  const { selectedModel, promptProfileId, handleModelChange } = useChatModel({
    plan,
    onSelectedModelChange,
    onRestrictedModelSelect: (model) => {
      toast.error(
        `${model.name} is not available on your current plan. Upgrade to use this model.`,
        {
          action: {
            label: "Upgrade",
            onClick: () => {
              window.location.href = "/settings/billing";
            },
          },
        },
      );
    },
  });
  const { composerStyle, setComposerStyle } = useChatComposerStyle();
  const { executionPreferences, setExecutionPreferences } =
    useChatExecutionPreferences();
  const { checkpoints, handleCreateCheckpoint, handleRestoreCheckpoint } =
    useChatCheckpoints(sessionMessages);
  const { processMarketRequest, consumePendingMarketData } =
    useMarketProcessor();
  const { walletContext } = useChatWalletContext();
  const { voiceModeActive } = useChatVoiceMode();
  const handleChatError = useCallback(
    (error: Error) => {
      void refreshCredits();
      toast.error(`Chat error: ${toUserFacingChatError(error)}`);
      metrics.trackError(error);
    },
    [metrics, refreshCredits],
  );
  const handleChatFinish = useCallback(() => {
    void refreshCredits();
  }, [refreshCredits]);
  const aiState = useChatControllerAiState({
    sessionMessages,
    executionPreferences,
    historySyncVersion,
    initialChatStoreId:
      initialChatStoreIdRef.current ?? createChatStoreId(currentConversationId),
    currentConversationId,
    setCurrentConversationId,
    createNewConversation,
    resumeStreamOnMount,
    selectedModel,
    promptProfileId,
    onError: handleChatError,
    onFinish: handleChatFinish,
  });

  return {
    sessionMessages,
    addMessage,
    updateMessage,
    removeMessage,
    replaceMessages,
    persistMessages,
    currentConversationId,
    historySyncVersion,
    registerHistorySyncListener,
    resumeStreamOnMount,
    setCurrentConversationId,
    authDialogOpen,
    setAuthDialogOpen,
    isLoggedIn,
    isAuthChecking,
    handleAuthNavigation,
    remainingCredits,
    creditsLoading,
    selectedModel,
    handleModelChange,
    composerStyle,
    setComposerStyle,
    executionPreferences,
    setExecutionPreferences,
    checkpoints,
    handleCreateCheckpoint,
    handleRestoreCheckpoint,
    processMarketRequest,
    consumePendingMarketData,
    walletContext,
    voiceModeActive,
    ...aiState,
  };
}
