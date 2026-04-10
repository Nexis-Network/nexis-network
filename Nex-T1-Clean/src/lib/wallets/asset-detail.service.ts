import type {
  AssetContractRef,
  AssetDetailQuery,
  AssetDetailRange,
  AssetDetailResponse,
  AssetExchangeRow,
  AssetLiveQuery,
  AssetLiveResponse,
  AssetLiquidityPairRow,
  AssetSentimentFactor,
} from "@/types/extension/asset-detail";

function toFinite(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeRange(range?: string): AssetDetailRange {
  const value = String(range ?? "1d").trim().toLowerCase();
  if (value === "7d") return "7d";
  if (value === "30d") return "30d";
  return "1d";
}

function normalizeRows(value: unknown): Array<[number, number]> {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!Array.isArray(row) || row.length < 2) return null;
      const ts = Number(row[0]);
      const num = Number(row[1]);
      if (!Number.isFinite(ts) || !Number.isFinite(num)) return null;
      return [ts, num] as [number, number];
    })
    .filter((row): row is [number, number] => Array.isArray(row));
}

function normalizeContracts(value: unknown, chainKeyFallback: string): AssetContractRef[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row) => row && typeof row === "object")
    .map((row) => {
      const entry = row as Record<string, unknown>;
      const address = toText(entry.address);
      if (!address) return null;
      return {
        chainKey: toText(entry.chainKey) || chainKeyFallback,
        chainName: toText(entry.chainName) || toText(entry.chainKey) || chainKeyFallback,
        address,
        isPrimary: Boolean(entry.isPrimary),
      } satisfies AssetContractRef;
    })
    .filter((row): row is AssetContractRef => row !== null);
}

function normalizeExchanges(value: unknown): AssetExchangeRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row) => row && typeof row === "object")
    .map((row) => {
      const entry = row as Record<string, unknown>;
      return {
        name: toText(entry.name) || "Unknown",
        pair: toText(entry.pair) || null,
        marketType: toText(entry.marketType) || null,
        trustScore: toText(entry.trustScore) || null,
        volumeUsd: toFinite(entry.volumeUsd),
        priceUsd: toFinite(entry.priceUsd),
        source: entry.source === "moralis" ? "moralis" : "coingecko",
      } satisfies AssetExchangeRow;
    });
}

function normalizePairs(value: unknown): AssetLiquidityPairRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row) => row && typeof row === "object")
    .map((row) => {
      const entry = row as Record<string, unknown>;
      return {
        pairLabel: toText(entry.pairLabel) || "Pair",
        pairAddress: toText(entry.pairAddress) || null,
        dexName: toText(entry.dexName) || null,
        liquidityUsd: toFinite(entry.liquidityUsd),
        volume24hUsd: toFinite(entry.volume24hUsd),
        chainKey: toText(entry.chainKey) || "1",
        source: entry.source === "moralis" ? "moralis" : "coingecko",
      } satisfies AssetLiquidityPairRow;
    });
}

function normalizeSentimentFactors(value: unknown): AssetSentimentFactor[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row) => row && typeof row === "object")
    .map((row) => {
      const entry = row as Record<string, unknown>;
      return {
        id: toText(entry.id) || "factor",
        contribution: toFinite(entry.contribution) ?? 0,
        value: toFinite(entry.value),
      } satisfies AssetSentimentFactor;
    });
}

function unwrapData(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};
  const record = payload as Record<string, unknown>;
  if (record.success === true && record.data && typeof record.data === "object") {
    return record.data as Record<string, unknown>;
  }
  return record;
}

async function fetchJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(path, {
    method: "GET",
    credentials: "include",
    signal,
    cache: "no-store",
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : {};

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return payload;
}

export function buildAssetDetailPath(query: AssetDetailQuery): string | null {
  const chainId = String(query.chainId ?? "").trim();
  const address = String(query.address ?? "").trim();
  const symbol = String(query.symbol ?? "").trim();
  if (!chainId || (!address && !symbol)) return null;

  const params = new URLSearchParams();
  params.set("chainId", chainId);
  params.set("range", normalizeRange(query.range));
  if (address) params.set("address", address);
  if (symbol) params.set("symbol", symbol);

  return `/api/extension/market/asset-detail?${params.toString()}`;
}

export function buildAssetLivePath(query: AssetLiveQuery): string | null {
  const chainId = String(query.chainId ?? "").trim();
  const address = String(query.address ?? "").trim();
  const symbol = String(query.symbol ?? "").trim();
  if (!chainId || (!address && !symbol)) return null;

  const params = new URLSearchParams();
  params.set("chainId", chainId);
  if (address) params.set("address", address);
  if (symbol) params.set("symbol", symbol);

  return `/api/extension/market/asset-live?${params.toString()}`;
}

export function normalizeAssetDetailResponse(raw: unknown, query: AssetDetailQuery): AssetDetailResponse {
  const payload = unwrapData(raw);
  const range = normalizeRange(toText(payload?.query && (payload.query as Record<string, unknown>).range) || query.range);
  const chainId = toText(payload?.query && (payload.query as Record<string, unknown>).chainId) || String(query.chainId ?? "1");
  const chainKey = toText(payload?.query && (payload.query as Record<string, unknown>).chainKey) || chainId;

  const queryRecord = payload.query && typeof payload.query === "object" ? (payload.query as Record<string, unknown>) : {};
  const assetRecord = payload.asset && typeof payload.asset === "object" ? (payload.asset as Record<string, unknown>) : {};
  const chartsRecord = payload.charts && typeof payload.charts === "object" ? (payload.charts as Record<string, unknown>) : {};
  const availabilityRecord = payload.availability && typeof payload.availability === "object" ? (payload.availability as Record<string, unknown>) : {};
  const cacheRecord = payload.cache && typeof payload.cache === "object" ? (payload.cache as Record<string, unknown>) : {};

  return {
    query: {
      chainId,
      chainKey,
      family:
        queryRecord.family === "SOLANA" || queryRecord.family === "STELLAR"
          ? queryRecord.family
          : "EVM",
      ...(toText(queryRecord.address) ? { address: toText(queryRecord.address) } : query.address ? { address: String(query.address) } : {}),
      ...(toText(queryRecord.symbol) ? { symbol: toText(queryRecord.symbol) } : query.symbol ? { symbol: String(query.symbol) } : {}),
      range,
    },
    asset: {
      coingeckoId: toText(assetRecord.coingeckoId) || null,
      logoUrl: toText(assetRecord.logoUrl) || null,
      name: toText(assetRecord.name) || null,
      symbol: toText(assetRecord.symbol) || null,
      description: toText(assetRecord.description) || null,
      maxSupply: toFinite(assetRecord.maxSupply),
      totalSupply: toFinite(assetRecord.totalSupply),
      circulatingSupply: toFinite(assetRecord.circulatingSupply),
      marketCapUsd: toFinite(assetRecord.marketCapUsd),
      volume24hUsd: toFinite(assetRecord.volume24hUsd),
      athUsd: toFinite(assetRecord.athUsd),
      athDate: toText(assetRecord.athDate) || null,
      atlUsd: toFinite(assetRecord.atlUsd),
      atlDate: toText(assetRecord.atlDate) || null,
      contracts: normalizeContracts(assetRecord.contracts, chainKey),
    },
    charts: {
      range,
      prices: normalizeRows(chartsRecord.prices),
      totalVolumes: normalizeRows(chartsRecord.totalVolumes),
    },
    exchanges: normalizeExchanges(payload.exchanges),
    liquidityPairs: normalizePairs(payload.liquidityPairs),
    availability: {
      coinGecko: Boolean(availabilityRecord.coinGecko),
      moralis: Boolean(availabilityRecord.moralis),
      metadataComplete: Boolean(availabilityRecord.metadataComplete),
      chartsAvailable: Boolean(availabilityRecord.chartsAvailable),
      pairsAvailable: Boolean(availabilityRecord.pairsAvailable),
    },
    warnings: Array.isArray(payload.warnings)
      ? payload.warnings.map((entry) => String(entry)).filter(Boolean)
      : [],
    cache: {
      hit: Boolean(cacheRecord.hit),
      ttlSec: toFinite(cacheRecord.ttlSec) ?? 300,
      generatedAt: toText(cacheRecord.generatedAt) || new Date().toISOString(),
    },
  };
}

export function normalizeAssetLiveResponse(raw: unknown): AssetLiveResponse {
  const payload = unwrapData(raw);
  const sentimentRecord =
    payload.sentiment && typeof payload.sentiment === "object"
      ? (payload.sentiment as Record<string, unknown>)
      : {};
  const cacheRecord =
    payload.cache && typeof payload.cache === "object"
      ? (payload.cache as Record<string, unknown>)
      : {};

  return {
    priceUsd: toFinite(payload.priceUsd),
    change24hPct: toFinite(payload.change24hPct),
    marketCapUsd: toFinite(payload.marketCapUsd),
    volume24hUsd: toFinite(payload.volume24hUsd),
    sentiment: {
      label:
        sentimentRecord.label === "bullish" || sentimentRecord.label === "bearish"
          ? sentimentRecord.label
          : "neutral",
      score: toFinite(sentimentRecord.score) ?? 50,
      confidence: toFinite(sentimentRecord.confidence) ?? 0,
      factors: normalizeSentimentFactors(sentimentRecord.factors),
    },
    warnings: Array.isArray(payload.warnings)
      ? payload.warnings.map((entry) => String(entry)).filter(Boolean)
      : [],
    cache: {
      hit: Boolean(cacheRecord.hit),
      ttlSec: toFinite(cacheRecord.ttlSec) ?? 30,
      generatedAt: toText(cacheRecord.generatedAt) || new Date().toISOString(),
    },
  };
}

export async function fetchAssetDetail(query: AssetDetailQuery, signal?: AbortSignal): Promise<AssetDetailResponse | null> {
  const path = buildAssetDetailPath(query);
  if (!path) return null;

  const payload = await fetchJson(path, signal);
  return normalizeAssetDetailResponse(payload, query);
}

export async function fetchAssetLive(query: AssetLiveQuery, signal?: AbortSignal): Promise<AssetLiveResponse | null> {
  const path = buildAssetLivePath(query);
  if (!path) return null;

  const payload = await fetchJson(path, signal);
  return normalizeAssetLiveResponse(payload);
}
