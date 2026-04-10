"use client";

import type { ChatStatus } from "ai";

import type { UseArtifactPanelStateReturn } from "@/hooks/ai";
import type { ChatModel } from "@/components/dashboard/chat-config";
import type { MarketIntentAnalysis } from "@/modules/prices/market-intent";

export type ChatInterfaceProps = {
  rightPanelState?: UseArtifactPanelStateReturn;
  onMarketIntent?: (analysis: MarketIntentAnalysis) => void;
  onSelectedModelChange?: (model: ChatModel) => void;
  onChatStatusChange?: (status: ChatStatus) => void;
  layoutVariant?: "default" | "app";
  useExpandedConversationWidth?: boolean;
  addConversationLeftInset?: boolean;
};
