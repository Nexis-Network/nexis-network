"use client";

import type { ChatStatus } from "ai";

import type { ChatComposerStyle, ComposerContextUsage, PromptInputMessage } from "@/components/chat-composer/types";
import type { ChatModel } from "@/components/dashboard/chat-config";
import type { ChatCheckpoint, ConversationMessage } from "@/components/dashboard/chat-types";
import type { UseArtifactPanelStateReturn } from "@/hooks/ai";
import type { ChatExecutionPreferences } from "@/modules/chat/execution-preferences";
import type { MarketIntentAnalysis } from "@/modules/prices/market-intent";

import type { PendingApproval } from "./controller/approval-state";

export type RemoteStatus = "unknown" | "companion" | "remote";

export type UseChatControllerArgs = {
  rightPanelState?: UseArtifactPanelStateReturn;
  onMarketIntent?: (analysis: MarketIntentAnalysis) => void;
  onSelectedModelChange?: (model: ChatModel) => void;
};

export type UseChatControllerReturn = {
  messages: ConversationMessage[];
  inputValue: string;
  setInputValue: (value: string) => void;
  chatStatus: ChatStatus;
  selectedModel: ChatModel;
  handleModelChange: (value: string) => void;
  handlePromptClick: (prompt: string) => void;
  handleComposerSubmit: (input: PromptInputMessage) => Promise<boolean | void>;
  handleFollowUpDecision: (
    messageId: string,
    suggestionId: string,
    decision: "accept" | "decline",
  ) => Promise<void>;
  handleFollowUpQuestion: (question: string) => void;
  handleRegenerate: (messageId: string) => Promise<void>;
  handleEditMessage: (messageId: string) => void;
  handleDeleteMessage: (messageId: string) => Promise<void>;
  handleShareMessage: (messageId: string) => Promise<void>;
  remoteStatus: RemoteStatus;
  remoteStatusMessage: string | null;
  autoScrollTrigger: string;
  isAutoScrollActive: boolean;
  voiceModeActive: boolean;
  isBusy: boolean;
  authDialogOpen: boolean;
  setAuthDialogOpen: (open: boolean) => void;
  handleAuthNavigation: (view: "sign-in" | "sign-up") => void;
  isAuthChecking: boolean;
  layoutOffsetClass?: string;
  pendingApproval: PendingApproval | null;
  handleApprovePending: () => Promise<void>;
  handleRejectPending: (reason?: string) => Promise<void>;
  handlePendingExpired: () => void;
  checkpoints: ChatCheckpoint[];
  handleCreateCheckpoint: (messageId: string, label?: string) => void;
  handleRestoreCheckpoint: (checkpointId: string) => Promise<void>;
  contextUsage: ComposerContextUsage | null;
  executionPreferences: ChatExecutionPreferences;
  setExecutionPreferences: (
    value:
      | ChatExecutionPreferences
      | ((previous: ChatExecutionPreferences) => ChatExecutionPreferences),
  ) => void;
  composerStyle: ChatComposerStyle;
  setComposerStyle: (value: ChatComposerStyle) => void;
  usage:
    | {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      }
    | undefined;
};
