"use client";

/**
 * Payload Renderer
 * Centralized rendering for all assistant payload types
 */

import { memo } from "react";
import { FragmentPreview } from "@/components/chat/artifacts/fragment-preview";
import dynamic from "next/dynamic";
import { ChainVisualization, SearchResults } from "@/components/dashboard/lazy-components";

// Dynamic imports for heavy payload views
const AnalysisResultView = dynamic(
  () => import("@/components/chat/payloads/views/analysis-view").then((mod) => mod.AnalysisResultView),
  { loading: () => <div className="h-32 animate-pulse rounded-xl bg-muted/20" /> }
);

const PythChartPayloadView = dynamic(
  () => import("@/components/chat/payloads/views/pyth-chart-view").then((mod) => mod.PythChartPayloadView),
  { loading: () => <div className="h-64 animate-pulse rounded-xl bg-muted/20" /> }
);

const NftChartPayloadView = dynamic(
  () => import("@/components/chat/payloads/views/nft-chart-view").then((mod) => mod.NftChartPayloadView),
  { loading: () => <div className="h-48 animate-pulse rounded-xl bg-muted/20" /> }
);

const CoingeckoChartPayloadView = dynamic(
  () => import("@/components/chat/payloads/views/coingecko-chart-view").then((mod) => mod.CoingeckoChartPayloadView),
  { loading: () => <div className="h-48 animate-pulse rounded-xl bg-muted/20" /> }
);

const WebPreviewView = dynamic(
  () => import("@/components/chat/payloads/views/web-preview-view").then((mod) => mod.WebPreviewView),
  { loading: () => <div className="h-40 animate-pulse rounded-xl bg-muted/20" /> }
);

const GenericToolExecutionView = dynamic(
  () => import("@/components/chat/payloads/views/tool-execution-view").then((mod) => mod.GenericToolExecutionView),
  { loading: () => <div className="h-24 animate-pulse rounded-xl bg-muted/20" /> }
);
import { ImageArtifact } from "@/components/chat/artifacts/image-artifact";
import { FileAnalysisArtifact } from "@/components/chat/artifacts/file-analysis-artifact";
import { MarketTerminalArtifactCard } from "@/components/chat/artifacts/market-terminal-artifact";
import { TableEditorArtifact } from "@/components/artifacts/features/general/table-editor-artifact";

// Polymarket artifacts (dynamic imports for code splitting)
const PolymarketMarketList = dynamic(
  () => import("@/components/artifacts/polymarket/market-list-artifact").then((mod) => mod.MarketListArtifact),
  { loading: () => <div className="h-48 animate-pulse rounded-xl bg-muted/20" /> }
);
const PolymarketOrderbook = dynamic(
  () => import("@/components/artifacts/polymarket/orderbook-artifact").then((mod) => mod.OrderbookArtifact),
  { loading: () => <div className="h-64 animate-pulse rounded-xl bg-muted/20" /> }
);
const PolymarketPositions = dynamic(
  () => import("@/components/artifacts/polymarket/positions-artifact").then((mod) => mod.PositionsArtifact),
  { loading: () => <div className="h-48 animate-pulse rounded-xl bg-muted/20" /> }
);
const PolymarketTradePreview = dynamic(
  () => import("@/components/artifacts/polymarket/trade-preview-artifact").then((mod) => mod.TradePreviewArtifact),
  { loading: () => <div className="h-48 animate-pulse rounded-xl bg-muted/20" /> }
);
const PolymarketOrderStatus = dynamic(
  () => import("@/components/artifacts/polymarket/order-status-artifact").then((mod) => mod.OrderStatusArtifact),
  { loading: () => <div className="h-40 animate-pulse rounded-xl bg-muted/20" /> }
);
const PolymarketGeoBlocked = dynamic(
  () => import("@/components/artifacts/polymarket/geo-blocked-artifact").then((mod) => mod.GeoBlockedArtifact),
  { loading: () => <div className="h-24 animate-pulse rounded-xl bg-muted/20" /> }
);
const PolymarketBridgeStatus = dynamic(
  () => import("@/components/artifacts/polymarket/bridge-status-artifact").then((mod) => mod.BridgeStatusArtifact),
  { loading: () => <div className="h-48 animate-pulse rounded-xl bg-muted/20" /> }
);
import { CodeInterpreterBlock } from "@/components/chat/message/code-interpreter-block";
import { SandboxPreview } from "@/components/chat/message/sandbox-preview";
import type {
  AssistantPayload,
  DisplayPreferences,
  PythChartPayload,
} from "@/components/chat/types";

type PayloadRendererProps = {
  payload: AssistantPayload;
  index: number;
  messageId: string;
  preferences: DisplayPreferences;
  pythPayloads: PythChartPayload[];
  requestedTickers: string[];
};

export const PayloadRenderer = memo(function PayloadRenderer({
  payload,
  index,
  messageId,
  preferences,
  pythPayloads,
  requestedTickers,
}: PayloadRendererProps) {
  switch (payload.type) {
    case "analysis":
      if (!preferences.showStructuredData) {
        return null;
      }
      return (
        <AnalysisResultView
          key={`${messageId}-analysis-${index}`}
          payload={payload}
        />
      );

    case "chain":
      if (!preferences.showStructuredData) {
        return null;
      }
      return (
        <ChainVisualization
          key={`${messageId}-chain-${index}`}
          data={payload.data}
        />
      );

    case "search":
      if (!preferences.showSearchResults) {
        return null;
      }
      return (
        <SearchResults
          key={`${messageId}-search-${index}`}
          error={payload.data.error?.message ?? null}
          loading={false}
          query={payload.query}
          result={
            payload.data.error
              ? null
              : {
                  text: payload.data.text,
                  sources: payload.data.sources,
                }
          }
        />
      );

    case "pyth-chart":
      if (!preferences.showMarketData) {
        return null;
      }
      if (pythPayloads.length === 0) {
        return null;
      }
      if (pythPayloads[0] !== payload) {
        return null;
      }
      return (
        <PythChartPayloadView
          key={`${messageId}-pyth-group`}
          payloads={pythPayloads}
          requestedTickers={requestedTickers}
        />
      );

    case "nft-chart":
      if (!preferences.showMarketData) {
        return null;
      }
      return (
        <NftChartPayloadView
          key={`${messageId}-nft-${index}`}
          payload={payload}
        />
      );

    case "coingecko-chart":
      if (!preferences.showMarketData) {
        return null;
      }
      return (
        <CoingeckoChartPayloadView
          key={`${messageId}-coingecko-${index}`}
          payload={payload}
        />
      );

    case "web-preview":
      if (!preferences.showWebPreview) {
        return null;
      }
      return (
        <WebPreviewView
          key={`${messageId}-preview-${index}`}
          payload={payload}
        />
      );

    case "image-artifact":
      return (
        <ImageArtifact
          key={`${messageId}-image-${index}`}
          payload={payload}
        />
      );

    case "file-analysis":
      return (
        <FileAnalysisArtifact
          key={`${messageId}-file-${index}`}
          payload={payload}
        />
      );

    case "tool-execution":
      const toolName = payload.toolName;

      if (toolName === "emit_artifact" && payload.status !== "error") {
        return null;
      }
      
      if (
        toolName === "e2b_code_interpreter" ||
        toolName === "openai_code_interpreter" ||
        toolName === "run_python"
      ) {
         const input = payload.input;
         const output = payload.output;
         
         // Extract code from input (support multiple formats)
         const code = typeof input === "string" ? input : (input?.code || "");
         const language = typeof input === "object" ? (input?.language || "python") : "python";
         
         // Handle loading state: if status is executing and no output yet
         const isLoading = payload.status === "executing" || payload.status === "pending";

         return (
            <CodeInterpreterBlock
               key={`${messageId}-code-${index}`}
               code={code}
               language={language}
               result={output}
               isLoading={isLoading}
            />
         );
      }
      
      if (toolName === "e2b_get_preview_url") {
          const output = payload.output;
          const isLoading = payload.status === "executing" || payload.status === "pending";
          const url = output?.url;
          const port = output?.port;
          
          if (url || isLoading) {
              return (
                  <SandboxPreview
                    key={`${messageId}-sandbox-${index}`}
                    url={url}
                    port={port}
                    isLoading={isLoading}
                  />
              );
          }
      }

      // Fallback for other tools
      return (
        <GenericToolExecutionView 
          key={`${messageId}-tool-${index}`}
          toolName={payload.toolName}
          status={payload.status}
          input={payload.input}
          output={payload.output}
          error={payload.error}
        />
      );

    case "execution-result":
      return (
        <FragmentPreview
          key={`${messageId}-execution-${index}`}
          result={payload.data}
        />
      );

    case "table-editor":
      return (
        <TableEditorArtifact
          key={`${messageId}-table-${index}`}
          data={payload.data}
        />
      );

    case "market-terminal":
      return (
        <MarketTerminalArtifactCard
          key={`${messageId}-market-terminal-${index}`}
          data={payload.data}
        />
      );

    // Polymarket artifacts
    case "polymarket-markets":
      return <PolymarketMarketList key={`${messageId}-poly-markets-${index}`} data={payload.data} />;
    case "polymarket-market-detail":
      return <PolymarketMarketList key={`${messageId}-poly-detail-${index}`} data={payload.data} />;
    case "polymarket-orderbook":
      return <PolymarketOrderbook key={`${messageId}-poly-book-${index}`} data={payload.data} />;
    case "polymarket-positions":
      return <PolymarketPositions key={`${messageId}-poly-pos-${index}`} data={payload.data} />;
    case "polymarket-trade-preview":
      return <PolymarketTradePreview key={`${messageId}-poly-trade-${index}`} data={payload.data} />;
    case "polymarket-order-status":
      return <PolymarketOrderStatus key={`${messageId}-poly-order-${index}`} data={payload.data} />;
    case "polymarket-blocked":
      return <PolymarketGeoBlocked key={`${messageId}-poly-blocked-${index}`} data={payload.data} />;
    case "polymarket-bridge-status":
      return <PolymarketBridgeStatus key={`${messageId}-poly-bridge-${index}`} data={payload.data} />;

    default:
      return null;
  }
});
