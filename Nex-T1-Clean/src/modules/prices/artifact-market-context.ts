"use server";

import type { UIMessage } from "ai";

import { analyzeMarketIntent } from "@/modules/prices/market-intent";

type MessagePart = NonNullable<UIMessage["parts"]>[number];
type JsonRecord = Record<string, UntypedJson>;

type CryptoTicker = {
  base: string;
  target: string;
  market?: string;
  last?: number;
};

type CryptoMarketData = {
  name?: string;
  symbol?: string;
  priceUsd?: number;
  marketCap?: number;
  volume?: number;
  priceChange24h?: number;
  liquidityScore?: number;
  tickers: CryptoTicker[];
};

type StockMarketData = {
  symbol: string;
  currency?: string;
  lastClose: number | null;
  exchange?: string;
  regularMarketTime?: number;
};

type LiveMarketData = CryptoMarketData | StockMarketData | null;

const isRecord = (value: UntypedJson): value is JsonRecord =>
  typeof value === "object" && value !== null;

const readString = (value: UntypedJson): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined;

const readNumber = (value: UntypedJson): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

function getPartText(part: MessagePart): string {
  return part.type === "text" && typeof part.text === "string" ? part.text : "";
}

function extractPromptText(messages: UIMessage[]): string {
  return messages
    .map((message) => (message.parts ?? []).map(getPartText).join(" "))
    .join(" ")
    .toLowerCase();
}

async function fetchJson(url: string): Promise<JsonRecord | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const value = (await response.json()) as UntypedJson;
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

async function fetchCryptoData(
  symbolOrName: string,
): Promise<CryptoMarketData | null> {
  const assetId = symbolOrName.toLowerCase().replace(/[^a-z0-9-]/g, "");
  const raw = await fetchJson(
    `https://api.coingecko.com/api/v3/coins/${assetId}?localization=false&tickers=true&market_data=true`,
  );
  if (!raw) {
    return null;
  }

  const marketData = isRecord(raw.market_data) ? raw.market_data : null;
  const priceData =
    marketData && isRecord(marketData.current_price)
      ? marketData.current_price
      : null;
  const marketCapData =
    marketData && isRecord(marketData.market_cap) ? marketData.market_cap : null;
  const volumeData =
    marketData && isRecord(marketData.total_volume)
      ? marketData.total_volume
      : null;

  const tickers: CryptoTicker[] = [];
  if (Array.isArray(raw.tickers)) {
    for (const ticker of raw.tickers) {
      if (!isRecord(ticker)) {
        continue;
      }

      const market = isRecord(ticker.market) ? ticker.market : null;
      const base = readString(ticker.base);
      const target = readString(ticker.target);
      if (!base || !target) {
        continue;
      }

      tickers.push({
        base,
        target,
        market: market ? readString(market.name) : undefined,
        last: readNumber(ticker.last) ?? undefined,
      });

      if (tickers.length >= 3) {
        break;
      }
    }
  }

  return {
    name: readString(raw.name),
    symbol: readString(raw.symbol)?.toUpperCase(),
    priceUsd: priceData ? readNumber(priceData.usd) : undefined,
    marketCap: marketCapData ? readNumber(marketCapData.usd) : undefined,
    volume: volumeData ? readNumber(volumeData.usd) : undefined,
    priceChange24h: marketData
      ? readNumber(marketData.price_change_percentage_24h)
      : undefined,
    liquidityScore: readNumber(raw.liquidity_score),
    tickers,
  };
}

async function fetchStockData(ticker: string): Promise<StockMarketData | null> {
  const raw = await fetchJson(
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker.toUpperCase()}?interval=1d&range=5d`,
  );
  if (!raw) {
    return null;
  }

  const chart = isRecord(raw.chart) ? raw.chart : null;
  const firstResult = Array.isArray(chart?.result)
    ? chart.result.find(isRecord)
    : null;
  if (!firstResult) {
    return null;
  }

  const indicators = isRecord(firstResult.indicators)
    ? firstResult.indicators
    : null;
  const firstQuote =
    indicators && Array.isArray(indicators.quote)
      ? indicators.quote.find(isRecord)
      : null;
  const meta = isRecord(firstResult.meta) ? firstResult.meta : null;
  if (!firstQuote || !meta) {
    return null;
  }

  const closeValues = Array.isArray(firstQuote.close)
    ? firstQuote.close.filter((value): value is number => typeof value === "number")
    : [];

  return {
    symbol: readString(meta.symbol) ?? ticker.toUpperCase(),
    currency: readString(meta.currency),
    lastClose: closeValues.length > 0 ? closeValues.at(-1) ?? null : null,
    exchange: readString(meta.exchangeName),
    regularMarketTime: readNumber(meta.regularMarketTime),
  };
}

function formatLiveMarketData(liveData: LiveMarketData): string {
  if (!liveData) {
    return "No validated live market data was available for this request.";
  }

  if ("priceUsd" in liveData) {
    const tickers = liveData.tickers
      .map(
        (ticker) =>
          `${ticker.base}/${ticker.target}${ticker.last ? ` @ ${ticker.last}` : ""}${ticker.market ? ` (${ticker.market})` : ""}`,
      )
      .join(", ");

    return [
      `Crypto asset: ${liveData.name ?? "Unknown"} (${liveData.symbol ?? "N/A"})`,
      `Price USD: ${liveData.priceUsd ?? "n/a"}`,
      `Market cap USD: ${liveData.marketCap ?? "n/a"}`,
      `24h volume USD: ${liveData.volume ?? "n/a"}`,
      `24h change %: ${liveData.priceChange24h ?? "n/a"}`,
      `Liquidity score: ${liveData.liquidityScore ?? "n/a"}`,
      tickers ? `Observed tickers: ${tickers}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  }

  const stockData = liveData as StockMarketData;
  return [
    `Stock symbol: ${stockData.symbol}`,
    `Currency: ${stockData.currency ?? "n/a"}`,
    `Last close: ${stockData.lastClose ?? "n/a"}`,
    `Exchange: ${stockData.exchange ?? "n/a"}`,
    `Regular market time: ${stockData.regularMarketTime ?? "n/a"}`,
  ].join("\n");
}

export async function resolveArtifactMarketContext(messages: UIMessage[]) {
  const prompt = extractPromptText(messages);
  const intent = analyzeMarketIntent(prompt, { originalQuery: prompt });
  const fallbackAsset = prompt.match(/\b[a-z0-9]{2,10}\b/)?.[0] ?? "";
  const fallbackStock = prompt.match(/\b[A-Z]{1,5}\b/)?.[0] ?? "";

  const liveData =
    intent.mode === "crypto"
      ? await fetchCryptoData(intent.tickers[0]?.split("/")[0] ?? fallbackAsset)
      : intent.mode === "stock"
        ? await fetchStockData(intent.tickers[0] ?? fallbackStock)
        : null;

  return {
    mode: intent.mode,
    modeInstruction:
      intent.mode === "crypto"
        ? "Focus on tokenomics, market structure, and on-chain context."
        : intent.mode === "stock"
          ? "Focus on market structure, valuation signals, and trading context."
          : "Focus on financial operations, burn analysis, and business health.",
    intentSignals: [
      `Detected mode: ${intent.mode}`,
      intent.tickers.length > 0
        ? `Relevant tickers/assets: ${intent.tickers.join(", ")}`
        : null,
      intent.assets.length > 0
        ? `Relevant assets: ${intent.assets.join(", ")}`
        : null,
      intent.confidence
        ? `Intent confidence: ${intent.confidence}`
        : null,
    ]
      .filter(Boolean)
      .join("\n"),
    liveDataContext: formatLiveMarketData(liveData),
  };
}
