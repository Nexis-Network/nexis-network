"use client";

import type { ReactNode } from "react";
import type { ChainTaskResult } from "@/app/chain";
import type { CryptoHeadline, PythMarketSnapshot } from "@/modules/prices/pyth/market";
import type { AIAgent, AIAgentStream, Source as SchemaSource, AIEvent } from "@/lib/schema";
import type { MarketIntentAnalysis } from "@/modules/prices/market-intent";
import { parallelProcessingSchema } from "@/lib/schema";
import type { ChatUIPart } from "@/modules/chat/ui-message-parts";
import type { z } from "zod";
import type { AgentStrategy } from "@/components/dashboard/chat-config";
export type Source = SchemaSource;
export type { AIAgentStream };

export type ParallelProcessingResult = z.infer<typeof parallelProcessingSchema>;

export type SearchResultData = {
  text: string;
  sources?: Source[];
  error?: {
    message: string;
  };
};

export type AssistantPayload =
  | AIEvent
  | {
      type: "analysis";
      topic: string;
      data: ParallelProcessingResult;
    }
  | {
      type: "chain";
      topic: string;
      data: ChainTaskResult;
    }
  | {
      type: "search";
      query: string;
      data: SearchResultData;
    }
  | {
      type: "web-preview";
      url: string;
      title?: string;
    }
  | {
      type: "pyth-chart";
      ticker: string;
      snapshot: PythMarketSnapshot | null;
      news?: CryptoHeadline[];
      error?: string | null;
      element?: ReactNode | null;
    }
  | {
      type: "coingecko-chart";
      id: string;
      name: string;
      symbol: string;
      imageUrl?: string | null;
      currentPriceUsd?: number | null;
      marketCapUsd?: number | null;
      volume24hUsd?: number | null;
      priceChange24hPct?: number | null;
      lastUpdated?: string | null;
      source?: "coingecko";
      vsCurrency?: string;
      chart?: {
        prices: [number, number][];
      } | null;
      error?: string | null;
    }
  | {
      type: "nft-chart";
      id: string;
      name: string;
      symbol: string;
      imageUrl?: string | null;
      floorPriceUsd?: number | null;
      floorPriceChangePct24h?: number | null;
      volume24hUsd?: number | null;
      marketCapUsd?: number | null;
      transactions24h?: number | null;
      summary?: string | null;
      lastUpdated?: string | null;
      chart?: {
        prices: [number, number][];
      } | null;
      error?: string | null;
    }
  | {
      type: "image-artifact";
      url: string;
      prompt: string;
      revisedPrompt?: string;
    }
  | {
      type: "file-analysis";
      filename: string;
      fileType: string;
      summary: string;
      keyPoints?: string[];
      fullText?: string;
    }
  | {
      type: "tool-execution";
      toolCallId?: string;
      toolName: string;
      status: "pending" | "executing" | "complete" | "error";
      input?: Record<string, UntypedJson>;
      output?: UntypedJson;
      error?: string;
      transactionHash?: string;
      executionTime?: number;
    }
  | {
      type: "approval_required";
      approvalId?: string;
      preview?: {
        title: string;
        description: string;
        items: Array<{ label: string; value: string }>;
      };
      expiresAt?: string;
      toolName?: string | null;
    }
  | {
      type: "approval_update";
      approvalId?: string;
      state?: string;
    }
  | {
      type: "orchestration";
      query: string;
    }
  | {
      type: "execution-result";
      data: import("@/lib/types").ExecutionResult;
    }
  | {
      type: "table-editor";
      data: UntypedJson; // Using any for flexibility or specific type if available
    }
  | {
      type: "market-terminal";
      data: UntypedJson;
    }
  // Polymarket prediction market payloads
  | { type: "polymarket-markets"; data: UntypedJson }
  | { type: "polymarket-market-detail"; data: UntypedJson }
  | { type: "polymarket-orderbook"; data: UntypedJson }
  | { type: "polymarket-positions"; data: UntypedJson }
  | { type: "polymarket-trades"; data: UntypedJson }
  | { type: "polymarket-trade-preview"; data: UntypedJson }
  | { type: "polymarket-order-status"; data: UntypedJson }
  | { type: "polymarket-blocked"; data: UntypedJson }
  | { type: "polymarket-bridge-status"; data: UntypedJson }
  | { type: "polymarket-deposit-info"; data: UntypedJson }
  | { type: "polymarket-price-chart"; data: UntypedJson }
  | { type: "polymarket-price-data"; data: UntypedJson }
  | { type: "polymarket-balance"; data: UntypedJson }
  | { type: "polymarket-supported-assets"; data: UntypedJson }
  | { type: "polymarket-error"; data: UntypedJson };

export type DisplayPreferences = {
  showMarketData: boolean;
  showSources: boolean;
  showSearchResults: boolean;
  showWebPreview: boolean;
  showStructuredData: boolean;
};

export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  showMarketData: false,
  showSources: false,
  showSearchResults: false,
  showWebPreview: false,
  showStructuredData: false,
};

export type FollowUpSuggestionType =
  | "market-data"
  | "structured-data"
  | "web-preview"
  | "artifact-panel";

export type FollowUpSuggestion = {
  id: string;
  type: FollowUpSuggestionType;
  question: string;
  confirmLabel: string;
  declineLabel: string;
  status: "pending" | "processing" | "accepted" | "dismissed";
  context?: {
    tickers?: string[];
    query?: string;
    url?: string;
    title?: string;
  };
};

export type FollowUpSuggestionStatus = FollowUpSuggestion["status"];

export type ConversationStatus = "pending" | "ready" | "error";

export type MessagePart = ChatUIPart;

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content?: string;
  parts?: MessagePart[];
  status: ConversationStatus;
  thoughts: AIAgentStream[];
  agent?: AIAgent | null;
  sources: Source[];
  toolInvocation?: {
    name: string;
    description?: string;
  };
  payloads?: AssistantPayload[];
  query?: string;
  model?: string;
  strategy?: AgentStrategy;
  automationPreferences?: Record<string, boolean>;
  displayPreferences?: DisplayPreferences;
  suggestions?: FollowUpSuggestion[];
  intentAnalysis?: MarketIntentAnalysis;
  requestedTickers?: string[];
  followUpQuestions?: string[];
  toolInvocations?: ToolInvocation[];
};

export type ToolInvocation = {
  toolCallId: string;
  toolName: string;
  args: UntypedJson;
} & (
  | { state: 'call' }
  | { state: 'result'; result: UntypedJson }
);

export type ChatCheckpoint = {
  id: string;
  label: string;
  summary?: string | null;
  messageId: string;
  messageIndex: number;
  createdAt: string;
  role: ConversationMessage["role"];
  restoredAt?: string | null;
};

export type ParsedSegment =
  | { type: "heading"; level: number; text: string; id: string }
  | { type: "paragraph"; text: string; id: string }
  | { type: "blockquote"; text: string; id: string }
  | { type: "list"; ordered: boolean; items: string[]; id: string }
  | { type: "code"; text: string; id: string; language?: string }
  | { type: "hr"; id: string }
  | { type: "table"; headers: string[]; rows: string[][]; id: string };

export type ParsedSection = {
  heading?: Extract<ParsedSegment, { type: "heading" }>;
  segments: ParsedSegment[];
};

export type SegmentVariant = "default" | "intro";

export type AnalysisPayload = Extract<AssistantPayload, { type: "analysis" }>;

export type PythChartPayload = Extract<AssistantPayload, { type: "pyth-chart" }>;
export type CoingeckoChartPayload = Extract<AssistantPayload, { type: "coingecko-chart" }>;
export type NftChartPayload = Extract<AssistantPayload, { type: "nft-chart" }>;

export type PythChartPayloadViewProps = {
  payloads: AssistantPayload[];
  requestedTickers: string[];
};

export type WebPreviewPayload = Extract<AssistantPayload, { type: "web-preview" }>;
