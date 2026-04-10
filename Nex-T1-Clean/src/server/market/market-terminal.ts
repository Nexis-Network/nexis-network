import {
  MarketTerminalScreenerResponseSchema,
  MarketTerminalTradeHistoryResponseSchema,
  type MarketTerminalScreenerResponse,
  type MarketTerminalScreenerRow,
  type MarketTerminalTradeHistoryResponse,
  type MarketTerminalTradeRow,
} from "@/modules/shared/artifacts/market-terminal";
import { getUnifiedMarketAssets } from "@/server/market/assets";
import { coingeckoOnchainTradeWS } from "@/server/market/coingecko-onchain-ws";
import type { CoinMarketRow } from "@/types/market";

function toNullableNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeChain(value: string | null | undefined): string {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : "unknown";
}

function deriveLiquidityScore(asset: CoinMarketRow): number | null {
  const marketCap = toNullableNumber(asset.marketCap ?? asset.marketCapUsd);
  const volume24h = toNullableNumber(asset.volume24hUsd ?? asset.totalVolume);

  if (marketCap == null || marketCap <= 0 || volume24h == null) {
    return null;
  }

  const ratio = Math.min(1, volume24h / marketCap);
  return Number((ratio * 100).toFixed(2));
}

function normalizeScreenerRow(asset: CoinMarketRow): MarketTerminalScreenerRow {
  const assetId = (asset.coingeckoId ?? asset.id ?? asset.symbol).toLowerCase();
  const chain = normalizeChain(asset.chain);

  return {
    assetId,
    symbol: asset.symbol.toUpperCase(),
    name: asset.name,
    chain,
    price: toNullableNumber(asset.currentPrice ?? asset.priceUsd),
    change24hPct: toNullableNumber(asset.priceChangePercentage24h),
    marketCap: toNullableNumber(asset.marketCap ?? asset.marketCapUsd),
    volume24h: toNullableNumber(asset.volume24hUsd ?? asset.totalVolume),
    liquidityScore: deriveLiquidityScore(asset),
    auditScore: toNullableNumber(asset.auditScore),
    narrative: asset.narrative ?? null,
    socialDominance: toNullableNumber(asset.socialDominance),
    // The artifact UI does not currently render sparklines or logos.
    // Keep the payload lean so the screener stays responsive in production.
    sparkline: [],
    imageUrl: null,
    swapTarget: {
      assetId,
      symbol: asset.symbol.toUpperCase(),
      chain,
    },
  };
}

function filterRows(
  rows: MarketTerminalScreenerRow[],
  query: string,
): MarketTerminalScreenerRow[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return rows;
  }

  return rows.filter((row) => {
    return (
      row.assetId.includes(normalizedQuery) ||
      row.symbol.toLowerCase().includes(normalizedQuery) ||
      row.name.toLowerCase().includes(normalizedQuery) ||
      row.chain.toLowerCase().includes(normalizedQuery) ||
      (row.narrative ?? "").toLowerCase().includes(normalizedQuery)
    );
  });
}

export async function buildMarketTerminalScreenerResponse(params: {
  chain?: string;
  query?: string;
  limit?: number;
  offset?: number;
}): Promise<MarketTerminalScreenerResponse> {
  const limit = Math.min(Math.max(params.limit ?? 100, 1), 250);
  const offset = Math.max(params.offset ?? 0, 0);
  const chain = params.chain?.trim() || "all";
  const rawAssets = await getUnifiedMarketAssets({
    chain,
    limit,
    offset,
  });

  const rows = filterRows(
    rawAssets.map(normalizeScreenerRow),
    params.query ?? "",
  );

  return MarketTerminalScreenerResponseSchema.parse({
    rows,
    metadata: {
      universe: "crypto",
      rowCount: rows.length,
      generatedAt: new Date().toISOString(),
      coinIds: rows.slice(0, 25).map((row) => row.assetId),
    },
    recommendedPivotFields: [
      "chain",
      "narrative",
      "symbol",
      "auditScore",
    ],
    recommendedMeasureFields: [
      "price",
      "change24hPct",
      "marketCap",
      "volume24h",
      "liquidityScore",
      "socialDominance",
    ],
  });
}

function normalizeTradeRow(
  trade: ReturnType<typeof coingeckoOnchainTradeWS.getRecentTrades>[number],
): MarketTerminalTradeRow {
  return {
    id: `${trade.txHash}:${trade.timestamp}`,
    poolKey: `${trade.network}:${trade.poolAddress}`.toLowerCase(),
    network: trade.network,
    poolAddress: trade.poolAddress,
    txHash: trade.txHash,
    side: trade.type,
    tokenAmount: trade.tokenAmount,
    quoteAmount: trade.quoteAmount,
    volumeUsd: trade.volumeUsd,
    priceNative: trade.priceNative,
    priceUsd: trade.priceUsd,
    timestamp: trade.timestamp,
  };
}

export function buildMarketTerminalTradeHistoryResponse(params: {
  pools: string[];
  limit?: number;
}): MarketTerminalTradeHistoryResponse {
  const limit = Math.min(Math.max(params.limit ?? 100, 1), 500);
  const rows = coingeckoOnchainTradeWS
    .getRecentTrades(params.pools, limit)
    .map(normalizeTradeRow);

  return MarketTerminalTradeHistoryResponseSchema.parse({
    rows,
    metadata: {
      pools: params.pools,
      rowCount: rows.length,
      generatedAt: new Date().toISOString(),
    },
  });
}
