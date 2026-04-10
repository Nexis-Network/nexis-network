"use client";

import { useComposerDraftState } from "@/components/chat-composer/hooks/use-composer-draft-state";

import { resolveConversationWidthClass } from "./constants";
import { useChatController } from "./hooks/use-chat-controller";
import { useChatWarmup } from "./hooks/use-chat-warmup";

import { ChatInterfaceContent } from "./chat-interface-content";
import type { ChatInterfaceProps } from "./chat-interface.types";
import { useChatInterfaceEffects } from "./use-chat-interface-effects";

export function ChatInterface({
  rightPanelState,
  onMarketIntent,
  onSelectedModelChange,
  onChatStatusChange,
  layoutVariant = "default",
  useExpandedConversationWidth = false,
  addConversationLeftInset = false,
}: ChatInterfaceProps = {}) {
  useChatWarmup();
  const composerDraftState = useComposerDraftState();
  const {
    messages,
    inputValue,
    setInputValue,
    chatStatus,
    selectedModel,
    handleModelChange,
    handlePromptClick,
    handleComposerSubmit,
    handleFollowUpDecision,
    handleFollowUpQuestion,
    handleRegenerate,
    handleEditMessage,
    handleDeleteMessage,
    handleShareMessage,
    remoteStatus,
    remoteStatusMessage,
    autoScrollTrigger,
    isAutoScrollActive,
    voiceModeActive,
    isBusy,
    authDialogOpen,
    setAuthDialogOpen,
    handleAuthNavigation,
    layoutOffsetClass,
    pendingApproval,
    handleApprovePending,
    handleRejectPending,
    handlePendingExpired,
    checkpoints,
    handleCreateCheckpoint,
    handleRestoreCheckpoint,
    contextUsage,
    executionPreferences,
    setExecutionPreferences,
  } = useChatController({
    rightPanelState,
    onMarketIntent,
    onSelectedModelChange,
  });

  const composerStyle = "default" as const;

  const hasUserMessage = messages.some((message) => message.role === "user");
  useChatInterfaceEffects({
    chatStatus,
    handleComposerSubmit,
    onChatStatusChange,
  });

  const conversationWidthClass = resolveConversationWidthClass({
    layoutVariant,
    useExpandedConversationWidth,
  });

  return (
    <ChatInterfaceContent
      addConversationLeftInset={addConversationLeftInset}
      authDialogOpen={authDialogOpen}
      autoScrollTrigger={autoScrollTrigger}
      chatStatus={chatStatus}
      checkpoints={checkpoints}
      composerDraftState={composerDraftState}
      composerStyle={composerStyle}
      contextUsage={contextUsage}
      conversationWidthClass={conversationWidthClass}
      executionPreferences={executionPreferences}
      handleApprovePending={handleApprovePending}
      handleAuthNavigation={handleAuthNavigation}
      handleCreateCheckpoint={handleCreateCheckpoint}
      handleDeleteMessage={handleDeleteMessage}
      handleEditMessage={handleEditMessage}
      handleFollowUpDecision={handleFollowUpDecision}
      handleFollowUpQuestion={handleFollowUpQuestion}
      handleModelChange={handleModelChange}
      handlePendingExpired={handlePendingExpired}
      handlePromptClick={handlePromptClick}
      handleRejectPending={handleRejectPending}
      handleRegenerate={handleRegenerate}
      handleRestoreCheckpoint={handleRestoreCheckpoint}
      handleShareMessage={handleShareMessage}
      hasUserMessage={hasUserMessage}
      inputValue={inputValue}
      isAutoScrollActive={isAutoScrollActive}
      isBusy={isBusy}
      layoutOffsetClass={layoutOffsetClass}
      layoutVariant={layoutVariant}
      messages={messages}
      onComposerSubmit={handleComposerSubmit}
      pendingApproval={pendingApproval}
      remoteStatus={remoteStatus}
      remoteStatusMessage={remoteStatusMessage}
      selectedModel={selectedModel}
      setAuthDialogOpen={setAuthDialogOpen}
      setComposerStyle={() => undefined}
      setExecutionPreferences={setExecutionPreferences}
      setInputValue={setInputValue}
      voiceModeActive={voiceModeActive}
    />
  );
}
