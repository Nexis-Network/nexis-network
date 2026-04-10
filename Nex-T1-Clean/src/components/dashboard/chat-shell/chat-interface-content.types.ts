"use client";

import { useComposerDraftState } from "@/components/chat-composer/hooks/use-composer-draft-state";

import { useChatController } from "./hooks/use-chat-controller";

type ChatControllerState = ReturnType<typeof useChatController>;

export type ChatInterfaceContentProps = {
  addConversationLeftInset: boolean;
  authDialogOpen: boolean;
  autoScrollTrigger: string;
  chatStatus: import("ai").ChatStatus;
  checkpoints: ChatControllerState["checkpoints"];
  composerDraftState: ReturnType<typeof useComposerDraftState>;
  composerStyle: ChatControllerState["composerStyle"];
  contextUsage: ChatControllerState["contextUsage"];
  conversationWidthClass: string;
  executionPreferences: ChatControllerState["executionPreferences"];
  handleApprovePending: ChatControllerState["handleApprovePending"];
  handleAuthNavigation: ChatControllerState["handleAuthNavigation"];
  handleCreateCheckpoint: ChatControllerState["handleCreateCheckpoint"];
  handleDeleteMessage: ChatControllerState["handleDeleteMessage"];
  handleEditMessage: ChatControllerState["handleEditMessage"];
  handleFollowUpDecision: ChatControllerState["handleFollowUpDecision"];
  handleFollowUpQuestion: ChatControllerState["handleFollowUpQuestion"];
  handleModelChange: ChatControllerState["handleModelChange"];
  handlePendingExpired: ChatControllerState["handlePendingExpired"];
  handlePromptClick: ChatControllerState["handlePromptClick"];
  handleRejectPending: ChatControllerState["handleRejectPending"];
  handleRegenerate: ChatControllerState["handleRegenerate"];
  handleRestoreCheckpoint: ChatControllerState["handleRestoreCheckpoint"];
  handleShareMessage: ChatControllerState["handleShareMessage"];
  hasUserMessage: boolean;
  inputValue: string;
  isAutoScrollActive: boolean;
  isBusy: boolean;
  layoutOffsetClass: ChatControllerState["layoutOffsetClass"];
  layoutVariant: "default" | "app";
  messages: ChatControllerState["messages"];
  onComposerSubmit: ChatControllerState["handleComposerSubmit"];
  pendingApproval: ChatControllerState["pendingApproval"];
  remoteStatus: ChatControllerState["remoteStatus"];
  remoteStatusMessage: ChatControllerState["remoteStatusMessage"];
  selectedModel: ChatControllerState["selectedModel"];
  setAuthDialogOpen: ChatControllerState["setAuthDialogOpen"];
  setComposerStyle: ChatControllerState["setComposerStyle"];
  setExecutionPreferences: ChatControllerState["setExecutionPreferences"];
  setInputValue: ChatControllerState["setInputValue"];
  voiceModeActive: boolean;
};
