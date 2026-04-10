"use client";

import { streamNftMarketAction, streamPythMarketAction, type NftMarketPayload } from "@/app/(marketing)/actions";
import { DEFAULT_PYTH_LOOKBACK_DAYS, DEFAULT_PYTH_RESOLUTION_MINUTES } from "@/components/dashboard/chat-config";
import { deriveDisplayPreferences } from "@/components/dashboard/chat-intent";
import type { ConversationMessage, AssistantPayload } from "@/components/dashboard/chat-types";
import { buildMarketContext } from "@/modules/prices/pyth/formatting";
import { analyzeMarketIntent, type MarketIntentAnalysis } from "@/modules/prices/market-intent";
import { useCallback, useRef } from "react";
import { upsertChartPayload } from "../controller/upsert-chart-payload";

export type PendingMarketData = {
  userText: string;
  intent: MarketIntentAnalysis;
  displayPreferences: ConversationMessage["displayPreferences"];
  requestedTickers: string[];
  primaryTicker: string | null;
  marketContext?: string;
  pythSnapshot?: UntypedJson;
  pythNews?: UntypedJson[];
  pythError?: string | null;
  extraPayloads?: AssistantPayload[];
};

export function useMarketProcessor() {
  const pendingMarketRef = useRef<PendingMarketData | null>(null);
  const enrichedAssistantIdsRef = useRef<Set<string>>(new Set());

  const processMarketRequest = useCallback(async (text: string) => {
    let intentAnalysis: MarketIntentAnalysis | null = null;
    if (text) {
      intentAnalysis = analyzeMarketIntent(text);
    }

    const intent: MarketIntentAnalysis = intentAnalysis ?? {
      mode: "general",
      confidence: "low",
      shouldShowMarketOverview: false,
      shouldActivateArtifact: false,
      assets: [],
      tickers: [],
      originalQuery: text,
      focusQuery: text,
      normalizedQuery: text.toLowerCase(),
      hasPrimaryKeyword: false,
      hasArtifactIntent: false,
      hasMarketPatternContext: false,
    };

    const normalized = text.toLowerCase();
    const looksLikeNftRequest =
      /\bnft\b/.test(normalized) || /\bfloor\b/.test(normalized) || /\bcollection\b/.test(normalized);

    let displayPreferences = deriveDisplayPreferences(text, intent, null);
    let requestedTickers = intent.tickers;
    let primaryTicker = displayPreferences.showMarketData ? requestedTickers[0] ?? null : null;

    let marketContext: string | undefined;
    let pythSnapshot: UntypedJson | undefined;
    let pythNews: UntypedJson[] | undefined;
    let pythError: string | null | undefined;
    let extraPayloads: AssistantPayload[] | undefined;

    const formatUsdCompact = (value: number | null | undefined) => {
      if (value == null || !Number.isFinite(value)) return "—";
      try {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: "USD",
          notation: "compact",
          maximumFractionDigits: 2,
        }).format(value);
      } catch {
        return `$${value.toFixed(2)}`;
      }
    };

    if (looksLikeNftRequest && text) {
      const nftResult = await streamNftMarketAction({
        query: text,
        days: 30,
        vsCurrency: "usd",
      });

      if (nftResult?.payload) {
        const payload = nftResult.payload as NftMarketPayload as AssistantPayload;
        extraPayloads = [payload];
        displayPreferences = { ...displayPreferences, showMarketData: true };

        const updatedAt = nftResult.payload.lastUpdated
          ? new Date(nftResult.payload.lastUpdated).toISOString()
          : new Date().toISOString();

        marketContext = [
          `Real-time NFT market data for ${nftResult.payload.name} (${nftResult.payload.symbol.toUpperCase()}) as of ${updatedAt}.`,
          `- Floor (USD): ${formatUsdCompact(nftResult.payload.floorPriceUsd ?? null)}`,
          nftResult.payload.floorPriceChangePct24h != null
            ? `- 24h floor change: ${nftResult.payload.floorPriceChangePct24h.toFixed(2)}%`
            : null,
          nftResult.payload.volume24hUsd != null
            ? `- 24h volume (USD): ${formatUsdCompact(nftResult.payload.volume24hUsd)}`
            : null,
          nftResult.payload.marketCapUsd != null
            ? `- Market cap (USD): ${formatUsdCompact(nftResult.payload.marketCapUsd)}`
            : null,
          nftResult.payload.transactions24h != null
            ? `- 24h sales: ${nftResult.payload.transactions24h}`
            : null,
          nftResult.payload.summary ? `Summary: ${nftResult.payload.summary}` : null,
          "In your response, include a 1–2 sentence summary, highlight the current floor and 24h move, and reference the embedded chart.",
        ]
          .filter((line): line is string => Boolean(line && line.trim().length > 0))
          .join("\n");
      } else if (nftResult?.error) {
        extraPayloads = [
          {
            type: "nft-chart",
            id: "unknown",
            name: "NFT collection",
            symbol: "NFT",
            error: nftResult.error,
          } as AssistantPayload,
        ];
        displayPreferences = { ...displayPreferences, showMarketData: true };
        marketContext = `NFT lookup failed: ${nftResult.error}`;
      }
    }

    if (!looksLikeNftRequest && displayPreferences.showMarketData && text) {
      try {
        const pythResult = await streamPythMarketAction({
          ticker: primaryTicker ?? undefined,
          query: primaryTicker ? undefined : text,
          lookbackDays: DEFAULT_PYTH_LOOKBACK_DAYS,
          resolutionMinutes: DEFAULT_PYTH_RESOLUTION_MINUTES,
        });

        pythSnapshot = pythResult?.snapshot ?? null;
        pythNews = Array.isArray(pythResult?.news) ? pythResult.news : [];
        pythError = pythResult?.error ?? null;

        if (pythSnapshot) {
          marketContext = buildMarketContext(pythSnapshot, pythNews);
          if (!primaryTicker) {
            primaryTicker = pythSnapshot.ticker;
          }
          if (requestedTickers.length === 0 && primaryTicker) {
            requestedTickers = [primaryTicker];
          }
        }
      } catch (error) {
        pythError = error instanceof Error ? error.message : "Unable to load live price chart.";
      }
    }

    const pendingData: PendingMarketData = {
      userText: text,
      intent,
      displayPreferences,
      requestedTickers,
      primaryTicker,
      marketContext,
      pythSnapshot,
      pythNews,
      pythError,
      extraPayloads,
    };

    pendingMarketRef.current = pendingData;
    return pendingData;
  }, []);

  const consumePendingMarketData = useCallback((
    assistantId: string, 
    currentPayloads: AssistantPayload[],
    dedupePayloads: (p: AssistantPayload[]) => AssistantPayload[]
  ) => {
    if (enrichedAssistantIdsRef.current.has(assistantId)) {
      pendingMarketRef.current = null;
      return null;
    }

    const pending = pendingMarketRef.current;
    if (!pending) return null;

    const shouldAttachPyth = Boolean(pending.displayPreferences?.showMarketData) &&
      Boolean(pending.primaryTicker || pending.pythSnapshot || pending.pythError);

    const withPyth = shouldAttachPyth
      ? upsertChartPayload(currentPayloads, {
          type: "pyth-chart",
          ticker: pending.primaryTicker ?? pending.requestedTickers?.[0] ?? "",
          snapshot: pending.pythSnapshot ?? null,
          news: pending.pythNews ?? [],
          error: pending.pythError ?? undefined,
        })
      : currentPayloads;

    const nextPayloads = pending.extraPayloads?.length
      ? dedupePayloads([...withPyth, ...pending.extraPayloads])
      : withPyth;

    enrichedAssistantIdsRef.current.add(assistantId);
    pendingMarketRef.current = null;

    return {
      payloads: nextPayloads,
      displayPreferences: pending.displayPreferences,
      intentAnalysis: pending.intent,
      requestedTickers: pending.requestedTickers,
      query: pending.userText,
    };
  }, []);

  return {
    pendingMarketRef,
    processMarketRequest,
    consumePendingMarketData,
  };
}
