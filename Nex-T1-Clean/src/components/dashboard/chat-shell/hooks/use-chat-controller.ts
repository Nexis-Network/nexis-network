"use client";

import { useEffect, useMemo } from "react";
import { buildAutoScrollTrigger } from "@/components/dashboard/chat-shell/utils/auto-scroll-trigger";
import { useChatMessageActions } from "./modules/use-chat-message-actions";
import { useMessageSync } from "./modules/use-message-sync";
import { useChatApprovalController } from "./modules/use-chat-approval-controller";
import { useChatSessionSync } from "./modules/use-chat-session-sync";
import { useChatControllerHistorySync } from "./use-chat-controller-history-sync";
import { useChatControllerRuntime } from "./use-chat-controller-runtime";
import { useChatControllerSubmit } from "./use-chat-controller-submit";
import type {
  UseChatControllerArgs,
  UseChatControllerReturn,
} from "./use-chat-controller.types";
import { buildComposerContextUsage } from "./use-chat-controller-utils";

export type { RemoteStatus } from "./use-chat-controller.types";

export function useChatController({
  onMarketIntent,
  onSelectedModelChange,
}: UseChatControllerArgs = {}): UseChatControllerReturn {
  const runtime = useChatControllerRuntime({ onSelectedModelChange });
  const {
    normalizeAiMessages,
    mapToConversationMessage,
    dedupePayloads,
    mergeSources,
  } = useMessageSync();
  useChatControllerHistorySync({
    historySyncVersion: runtime.historySyncVersion,
    aiMessagesLength: runtime.aiMessages.length,
    sessionMessagesLength: runtime.sessionMessages.length,
    hydratedAiMessages: runtime.hydratedAiMessages,
    hydrateMessage: runtime.hydrateMessage,
    registerHistorySyncListener: runtime.registerHistorySyncListener,
    replaceAiMessages: runtime.replaceAiMessages,
    stopChat: runtime.stopChat,
    clearChat: runtime.clearChat,
  });

  const normalizedAiMessages = useMemo(
    () => normalizeAiMessages(runtime.aiMessages),
    [runtime.aiMessages, normalizeAiMessages],
  );

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      (window as Window & { __TEST_MODE?: boolean }).__TEST_MODE !== true
    ) {
      return;
    }

    const debugWindow = window as Window & {
      __NEX_DEBUG_AI_MESSAGES?: unknown;
      __NEX_DEBUG_NORMALIZED_AI_MESSAGES?: unknown;
      __NEX_DEBUG_SESSION_MESSAGES?: unknown;
    };

    debugWindow.__NEX_DEBUG_AI_MESSAGES = runtime.aiMessages;
    debugWindow.__NEX_DEBUG_NORMALIZED_AI_MESSAGES = normalizedAiMessages;
    debugWindow.__NEX_DEBUG_SESSION_MESSAGES = runtime.sessionMessages;
  }, [normalizedAiMessages, runtime.aiMessages, runtime.sessionMessages]);

  useChatSessionSync({
    normalizedAiMessages,
    aiStatus: runtime.aiStatus,
    selectedModelValue: runtime.selectedModel.value,
    sessionMessages: runtime.sessionMessages,
    addMessage: runtime.addMessage,
    removeMessage: runtime.removeMessage,
    updateMessage: runtime.updateMessage,
    mapToConversationMessage,
    dedupePayloads,
    mergeSources,
    consumePendingMarketData: runtime.consumePendingMarketData,
  });

  const messages = runtime.sessionMessages;
  const inputValue = runtime.aiInput;
  const setInputValue = runtime.setAiInput;
  const chatStatus = runtime.aiStatus;

  const {
    handlePromptClick,
    handleFollowUpDecision,
    handleFollowUpQuestion,
    handleRegenerate,
    handleEditMessage,
    handleDeleteMessage,
    handleShareMessage,
  } = useChatMessageActions({
    messages,
    sessionMessages: runtime.sessionMessages,
    chatStatus,
    selectedModel: runtime.selectedModel,
    setInputValue,
    reloadChat: runtime.reloadChat,
    replaceMessages: runtime.replaceMessages,
    persistMessages: runtime.persistMessages,
  });

  const {
    pendingApproval,
    handleApprovePending,
    handleRejectPending,
    handlePendingExpired,
  } = useChatApprovalController({
    messages,
    respondToToolApproval: runtime.respondToToolApproval,
  });

  const autoScrollTrigger = useMemo(
    () => buildAutoScrollTrigger(messages),
    [messages],
  );
  const handleComposerSubmit = useChatControllerSubmit({
    chatStatus,
    isLoggedIn: runtime.isLoggedIn,
    creditsLoading: runtime.creditsLoading,
    remainingCredits: runtime.remainingCredits,
    selectedModel: runtime.selectedModel,
    walletContext: runtime.walletContext,
    processMarketRequest: runtime.processMarketRequest,
    sendMessage: runtime.sendMessage,
    setAuthDialogOpen: runtime.setAuthDialogOpen,
    onMarketIntent,
  });

  return {
    messages,
    inputValue,
    setInputValue,
    chatStatus,
    selectedModel: runtime.selectedModel,
    handleModelChange: runtime.handleModelChange,
    handlePromptClick,
    handleComposerSubmit,
    handleFollowUpDecision,
    handleFollowUpQuestion,
    handleRegenerate,
    handleEditMessage,
    handleDeleteMessage,
    handleShareMessage,
    remoteStatus: "companion",
    remoteStatusMessage: null,
    autoScrollTrigger,
    isAutoScrollActive: true,
    voiceModeActive: runtime.voiceModeActive,
    isBusy: chatStatus === "streaming" || chatStatus === "submitted",
    authDialogOpen: runtime.authDialogOpen,
    setAuthDialogOpen: runtime.setAuthDialogOpen,
    handleAuthNavigation: runtime.handleAuthNavigation,
    isAuthChecking: runtime.isAuthChecking,
    pendingApproval,
    handleApprovePending,
    handleRejectPending,
    handlePendingExpired,
    checkpoints: runtime.checkpoints,
    handleCreateCheckpoint: runtime.handleCreateCheckpoint,
    handleRestoreCheckpoint: runtime.handleRestoreCheckpoint,
    contextUsage: buildComposerContextUsage(
      runtime.aiUsage,
      runtime.selectedModel,
    ),
    executionPreferences: runtime.executionPreferences,
    setExecutionPreferences: runtime.setExecutionPreferences,
    composerStyle: runtime.composerStyle,
    setComposerStyle: runtime.setComposerStyle,
    usage: runtime.aiUsage,
  };
}
