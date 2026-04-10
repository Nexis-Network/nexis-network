/**
 * Chat System Types
 * Centralized type definitions for the modular chat architecture
 */

import type { ChatStatus } from "ai";
import type { AIAgent, AIAgentStream, Source } from "@/lib/schema";
import type { MarketIntentAnalysis } from "@/modules/prices/market-intent";
import type { ChatUIPart } from "@/modules/chat/ui-message-parts";
import type {
  AssistantPayload,
  ChatCheckpoint,
  ConversationMessage,
  DisplayPreferences,
  FollowUpSuggestion,
  PythChartPayload,
  CoingeckoChartPayload,
  AnalysisPayload,
  ParallelProcessingResult,
  WebPreviewPayload,

  NftChartPayload,
  PythChartPayloadViewProps,
} from "@/components/dashboard/chat-types";
import type { ChatModel } from "@/components/dashboard/chat-config";
import type { PanelRef } from "@/components/layout/panels/panel-types";
import type { useExpandablePanelState } from "@/components/layout/panels/expandable-panel";

// Re-export core types for convenience
export type {
  AssistantPayload,
  ChatCheckpoint,
  ConversationMessage,
  DisplayPreferences,
  FollowUpSuggestion,
  PythChartPayload,
  CoingeckoChartPayload,
  AnalysisPayload,
  ParallelProcessingResult,
  WebPreviewPayload,
  NftChartPayload,
  ChatModel,
  AIAgent,
  AIAgentStream,
  Source,
  MarketIntentAnalysis,

  ChatStatus,
  PythChartPayloadViewProps,
};

// Stream handler types
export type StreamHandlerOptions = {
  includeNull?: boolean;
  ignoreFallback?: boolean;
};

export type StreamHandlerCallback = (value: UntypedJson) => void;

// Message action types
export type MessageActionHandler = {
  onFeedback?: (messageId: string, feedback: "helpful" | "not_helpful") => void;
  onCopy?: (messageId: string) => void;
  onRegenerate?: (messageId: string) => void;
};

// Streaming state types
export type StreamingPhase =
  | "idle"
  | "analyzing"
  | "routing"
  | "thinking"
  | "fetching"
  | "executing"
  | "synthesizing"
  | "streaming"
  | "complete"
  | "error";

// Cache types
export type CacheStrategy = {
  ttl: number;
  key: (params: Record<string, string>) => string;
  shouldCache: (params: Record<string, UntypedJson>) => boolean;
};

// Command types
export type ChatCommand = "analyze" | "ideate" | "summarize" | "generate-image";

export type CommandExecutor = (
  command: ChatCommand,
  args: string,
  history: Array<{ role: string; content: string }>
) => Promise<ConversationMessage>;

export type LeftPanelChatProps = {
  panelState: ReturnType<typeof useExpandablePanelState>;
  defaultSize: number;
  panelRef: PanelRef;
};

export type MessagePart = ChatUIPart;

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
};
