"use client";

import { ChatComposer } from "@/components/chat-composer";
import { AuthRequiredDialog } from "@/components/chat-composer/auth-required-dialog";
import { ApprovalModal } from "@/components/approvals/approval-modal";
import { cn } from "@/lib/utils";

import { ChatConversationView } from "./chat-conversation-view";
import { ChatRemoteStatus } from "./chat-remote-status";
import type { ChatInterfaceContentProps } from "./chat-interface-content.types";

export function ChatInterfaceContent({
  addConversationLeftInset,
  authDialogOpen,
  autoScrollTrigger,
  chatStatus,
  checkpoints,
  composerDraftState,
  composerStyle,
  contextUsage,
  conversationWidthClass,
  executionPreferences,
  handleApprovePending,
  handleAuthNavigation,
  handleCreateCheckpoint,
  handleDeleteMessage,
  handleEditMessage,
  handleFollowUpDecision,
  handleFollowUpQuestion,
  handleModelChange,
  handlePendingExpired,
  handlePromptClick,
  handleRejectPending,
  handleRegenerate,
  handleRestoreCheckpoint,
  handleShareMessage,
  hasUserMessage,
  inputValue,
  isAutoScrollActive,
  isBusy,
  layoutOffsetClass,
  layoutVariant,
  messages,
  onComposerSubmit,
  pendingApproval,
  remoteStatus,
  remoteStatusMessage,
  selectedModel,
  setAuthDialogOpen,
  setComposerStyle,
  setExecutionPreferences,
  setInputValue,
  voiceModeActive,
}: ChatInterfaceContentProps) {
  return (
    <div
      className={cn(
        "relative mx-auto flex h-full min-h-0 min-w-0 w-full max-w-full flex-col items-center overflow-hidden",
        layoutVariant === "app"
          ? "px-0"
          : "px-4 md:px-8 lg:px-16 xl:px-[205px]",
        layoutVariant === "default" && layoutOffsetClass,
      )}
    >
      <div
        className={cn(
          "relative z-30 w-full shrink-0 pt-0",
          conversationWidthClass,
        )}
      >
        <ChatRemoteStatus status={remoteStatus} message={remoteStatusMessage} />
      </div>

      <div
        className="relative z-10 flex min-h-0 min-w-0 w-full flex-1 flex-col items-center overflow-y-auto overflow-x-hidden px-2 sm:px-3 md:px-4 no-scrollbar"
        data-onboarding-id="chat-feed"
      >
        <ChatConversationView
          addLeftInset={addConversationLeftInset}
          conversationWidthClass={conversationWidthClass}
          messages={messages}
          autoScrollTrigger={autoScrollTrigger}
          isAutoScrollActive={isAutoScrollActive}
          voiceModeActive={voiceModeActive}
          onFollowUpDecision={handleFollowUpDecision}
          onFollowUpQuestion={handleFollowUpQuestion}
          onRegenerate={handleRegenerate}
          onEdit={handleEditMessage}
          onDelete={handleDeleteMessage}
          onShare={handleShareMessage}
          checkpoints={checkpoints}
          onCheckpointCreate={handleCreateCheckpoint}
          onCheckpointRestore={handleRestoreCheckpoint}
        />
      </div>

      <div
        className={cn(
          "relative z-20 flex min-w-0 w-full shrink-0 max-w-full justify-center bg-transparent pb-[9px]",
          layoutVariant === "app"
            ? "app-chat-composer-shell px-3 sm:px-4 md:px-5 lg:px-6 xl:px-8"
            : "px-0",
          conversationWidthClass,
        )}
        data-onboarding-id="chat-composer"
      >
        <ChatComposer
          key={composerStyle}
          inputValue={inputValue}
          messages={messages}
          onInputChange={setInputValue}
          onSubmit={onComposerSubmit}
          status={chatStatus}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
          onPromptSelect={handlePromptClick}
          isBusy={isBusy}
          hidePromptShortcuts={layoutVariant === "app" || hasUserMessage}
          contextUsage={contextUsage ?? undefined}
          showStarsOverlay={layoutVariant === "app"}
          composerStyle={composerStyle}
          onComposerStyleChange={setComposerStyle}
          executionPreferences={executionPreferences}
          onExecutionPreferencesChange={setExecutionPreferences}
          draftState={composerDraftState}
        />
      </div>

      {pendingApproval ? (
        <ApprovalModal
          approvalId={pendingApproval.approvalId}
          preview={pendingApproval.preview}
          expiresAt={new Date(pendingApproval.expiresAt)}
          toolName={pendingApproval.toolName}
          onApprove={handleApprovePending}
          onReject={handleRejectPending}
          onExpired={handlePendingExpired}
        />
      ) : null}

      <AuthRequiredDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        onNavigate={handleAuthNavigation}
      />
    </div>
  );
}
