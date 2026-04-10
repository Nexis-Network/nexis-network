import "server-only";

import pMap from "p-map";

import { getOrSet } from "@/server/services/redis/cache";
import { asRecord, toNumber, toStringOrNull } from "@/server/moralis/utils";
import { normalizeSolanaAddress, normalizeSolanaNetwork } from "@/server/moralis/validation";

import { fetchAndSummarizeMintActivity } from "@/server/market/solana/helius-mint-activity";
import {
  getPumpfunBondingTokens,
  getPumpfunGraduatedTokens,
  getPumpfunNewTokens,
  getPumpfunTokenBondingStatus,
  getPumpfunTokenPairsByAddress,
  getPumpfunTokenSwaps,
} from "@/server/moralis/solana/pumpfun";
import { getSolanaOhlcvByPairAddress, getSolanaTokenPairStats } from "@/server/moralis/solana/dex";

import type { MemecoinCandidate, MemecoinEnrichment, MemecoinRow, MemecoinUniverse, SolanaCluster } from "./memecoin-types";

function cacheKey(parts: string[]) {
  return `sol:memecoin:${parts.join(":")}`;
}

function nowIso() {
  return new Date().toISOString();
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value != null;
}

function pickList(raw: UntypedJson): UntypedJson[] {
  const record = asRecord(raw);
  return (
    (Array.isArray(raw) ? raw : null) ??
    (Array.isArray(record?.result) ? (record?.result as UntypedJson[]) : null) ??
    (Array.isArray(record?.tokens) ? (record?.tokens as UntypedJson[]) : null) ??
    (Array.isArray(record?.data) ? (record?.data as UntypedJson[]) : null) ??
    []
  );
}

function normalizeCandidate(universe: MemecoinUniverse, raw: UntypedJson): MemecoinCandidate | null {
  const r = asRecord(raw) ?? {};
  const mint = toStringOrNull(r.address ?? r.mint ?? r.tokenAddress ?? r.token_address);
  if (!mint) return null;
  const normalizedMint = normalizeSolanaAddress(mint);
  return {
    universe,
    mint: normalizedMint,
    name: toStringOrNull(r.name ?? r.token_name) ?? null,
    symbol: toStringOrNull(r.symbol ?? r.token_symbol) ?? null,
    imageUrl: toStringOrNull(r.image ?? r.imageUrl ?? r.logo) ?? null,
    createdAt: toStringOrNull(r.createdAt ?? r.created_at ?? r.created) ?? null,
    priceUsd: toNumber(r.priceUsd ?? r.price_usd ?? r.usd_price) ?? null,
    marketCapUsd: toNumber(r.marketCapUsd ?? r.market_cap_usd ?? r.market_cap) ?? null,
    liquidityUsd: toNumber(r.liquidityUsd ?? r.liquidity_usd ?? r.liquidity) ?? null,
    volume24hUsd: toNumber(r.volumeUsd24h ?? r.volume_24h_usd ?? r.volume_usd_24h ?? r.volumeUsd) ?? null,
  };
}

function normalizeBondingProgress(raw: UntypedJson): number | null {
  const r = asRecord(raw) ?? {};
  const p = toNumber(r.bondingProgress ?? r.bonding_progress ?? r.progress);
  if (p == null) return null;
  // Moralis commonly returns 0..1 or 0..100 depending on endpoint version.
  if (p >= 0 && p <= 1) return Math.round(p * 1000) / 10;
  if (p >= 0 && p <= 100) return Math.round(p * 10) / 10;
  return null;
}

function pickPairAddress(raw: UntypedJson): string | null {
  const list = pickList(raw);
  for (const entry of list) {
    const r = asRecord(entry) ?? {};
    const pair = toStringOrNull(r.pairAddress ?? r.pair_address ?? r.address);
    if (!pair) continue;
    try {
      return normalizeSolanaAddress(pair);
    } catch {
      continue;
    }
  }
  return null;
}

function computeTrendFromCandles(raw: UntypedJson, timeframe: "15m" | "1h" | "4h"): MemecoinEnrichment["trend"] {
  const record = asRecord(raw);
  const list =
    (Array.isArray(raw) ? raw : null) ??
    (Array.isArray(record?.result) ? (record?.result as UntypedJson[]) : null) ??
    (Array.isArray(record?.ohlcv) ? (record?.ohlcv as UntypedJson[]) : null) ??
    (Array.isArray(record?.data) ? (record?.data as UntypedJson[]) : null) ??
    [];

  const closes: number[] = [];
  for (const entry of list) {
    const r = asRecord(entry) ?? {};
    const close = toNumber(r.close);
    if (close == null) continue;
    closes.push(close);
  }

  if (closes.length < 3) {
    return { timeframe, candleCount: closes.length, returnPct: null, volatilityPct: null };
  }

  const first = closes[0]!;
  const last = closes[closes.length - 1]!;
  const returnPct = first > 0 ? ((last - first) / first) * 100 : null;

  const rets: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    const prev = closes[i - 1]!;
    const cur = closes[i]!;
    if (prev <= 0) continue;
    rets.push((cur - prev) / prev);
  }
  if (rets.length < 2) {
    return { timeframe, candleCount: closes.length, returnPct, volatilityPct: null };
  }
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1);
  const stdev = Math.sqrt(variance);
  const volatilityPct = stdev * 100;

  return { timeframe, candleCount: closes.length, returnPct, volatilityPct };
}

function summarizeSwaps(raw: UntypedJson): MemecoinEnrichment["swapsSummary"] {
  const record = asRecord(raw);
  const list =
    (Array.isArray(raw) ? raw : null) ??
    (Array.isArray(record?.result) ? (record?.result as UntypedJson[]) : null) ??
    (Array.isArray(record?.swaps) ? (record?.swaps as UntypedJson[]) : null) ??
    (Array.isArray(record?.data) ? (record?.data as UntypedJson[]) : null) ??
    [];

  if (list.length === 0) {
    return { sampleSize: 0, buys: null, sells: null, buySellRatio: null, uniqueTraders: null, topTraderShare: null };
  }

  let buys = 0;
  let sells = 0;
  const traderCounts = new Map<string, number>();

  const tryAddTrader = (addr: string | null) => {
    if (!addr) return;
    try {
      const normalized = normalizeSolanaAddress(addr);
      traderCounts.set(normalized, (traderCounts.get(normalized) ?? 0) + 1);
    } catch {
      // ignore
    }
  };

  for (const entry of list) {
    const r = asRecord(entry) ?? {};
    const side = toStringOrNull(r.side ?? r.transactionType ?? r.transaction_type ?? r.type)?.toLowerCase();
    if (side === "buy") buys += 1;
    if (side === "sell") sells += 1;

    // Moralis varies field names; best-effort extraction.
    tryAddTrader(toStringOrNull(r.trader ?? r.traderAddress ?? r.trader_address ?? r.owner ?? r.user ?? r.walletAddress ?? r.wallet_address));
    tryAddTrader(toStringOrNull(r.buyer ?? r.buyerAddress ?? r.buyer_address));
    tryAddTrader(toStringOrNull(r.seller ?? r.sellerAddress ?? r.seller_address));
  }

  const sampleSize = list.length;
  const uniqueTraders = traderCounts.size;
  let topTraderShare: number | null = null;
  if (uniqueTraders > 0) {
    const top = Math.max(...Array.from(traderCounts.values()));
    topTraderShare = sampleSize > 0 ? top / sampleSize : null;
  }
  const buySellRatio = sells > 0 ? buys / sells : buys > 0 ? 999 : null;

  return {
    sampleSize,
    buys,
    sells,
    buySellRatio,
    uniqueTraders,
    topTraderShare,
  };
}

function toUnixSeconds(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1_000_000_000_000 ? Math.trunc(value / 1000) : Math.trunc(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const asNum = Number(trimmed);
    if (Number.isFinite(asNum)) {
      return asNum > 1_000_000_000_000 ? Math.trunc(asNum / 1000) : Math.trunc(asNum);
    }
    const asDate = Date.parse(trimmed);
    if (Number.isFinite(asDate)) {
      return Math.trunc(asDate / 1000);
    }
  }
  return null;
}

function summarizeKolActivity(params: {
  swaps: UntypedJson;
  kolWalletSet: Set<string>;
  lookbackMinutes: number;
  nowUnix: number;
}): NonNullable<NonNullable<MemecoinEnrichment["birdeye"]>["kolSummary"]> | null {
  const { kolWalletSet, lookbackMinutes, nowUnix } = params;
  if (kolWalletSet.size === 0) {
    return null;
  }

  const swaps = pickList(params.swaps);
  const lookbackUnix = lookbackMinutes > 0 ? nowUnix - lookbackMinutes * 60 : null;

  let buys = 0;
  let sells = 0;
  let lastTradeAt: number | null = null;
  const uniqueKolTraders = new Set<string>();

  const markIfKol = (value: unknown): boolean => {
    const wallet = toStringOrNull(value);
    if (!wallet) return false;
    try {
      const normalized = normalizeSolanaAddress(wallet);
      if (kolWalletSet.has(normalized)) {
        uniqueKolTraders.add(normalized);
        return true;
      }
    } catch {
      // ignore invalid wallet-like value
    }
    return false;
  };

  for (const entry of swaps) {
    const r = asRecord(entry) ?? {};
    const tradeUnix = toUnixSeconds(
      r.blockTime ??
        r.blockTimestamp ??
        r.block_timestamp ??
        r.timestamp ??
        r.time ??
        r.createdAt ??
        r.created_at,
    );
    if (lookbackUnix != null && tradeUnix != null && tradeUnix < lookbackUnix) {
      continue;
    }

    const hasKolTrader =
      markIfKol(r.trader ?? r.traderAddress ?? r.trader_address ?? r.owner ?? r.user ?? r.walletAddress ?? r.wallet_address) ||
      markIfKol(r.buyer ?? r.buyerAddress ?? r.buyer_address) ||
      markIfKol(r.seller ?? r.sellerAddress ?? r.seller_address);
    if (!hasKolTrader) {
      continue;
    }

    const side = toStringOrNull(r.side ?? r.transactionType ?? r.transaction_type ?? r.type)?.toLowerCase();
    if (side === "buy") buys += 1;
    if (side === "sell") sells += 1;
    if (tradeUnix != null) {
      lastTradeAt = lastTradeAt == null ? tradeUnix : Math.max(lastTradeAt, tradeUnix);
    }
  }

  return {
    walletCount: kolWalletSet.size,
    lookbackMinutes,
    buys,
    sells,
    uniqueKolTraders: uniqueKolTraders.size,
    lastTradeAt,
  };
}



export async function fetchMemecoinCandidates(params: {
  universe: MemecoinUniverse;
  cluster: SolanaCluster;
  limit: number;
}): Promise<MemecoinCandidate[]> {
  const network = normalizeSolanaNetwork(params.cluster === "devnet" ? "devnet" : "mainnet");
  const limit = Math.min(200, Math.max(5, params.limit));
  const universe = params.universe;

  const key = cacheKey(["candidates", universe, network, String(limit)]);
  return getOrSet(
    key,
    async () => {
      if (universe === "birdeye_meme_list") {
        return [];
      }

      const raw =
        universe === "pumpfun_new"
          ? await getPumpfunNewTokens({ network, limit })
          : universe === "pumpfun_graduated"
            ? await getPumpfunGraduatedTokens({ network, limit })
            : await getPumpfunBondingTokens({ network, limit });

      const list = pickList(raw);
      return list
        .map((entry) => {
          try {
            return normalizeCandidate(universe, entry);
          } catch {
            return null;
          }
        })
        .filter(isDefined)
        .slice(0, limit);
    },
    {
      ttlSeconds: 10,
      staleTtlSeconds: 60,
      coalesce: true,
      lockTtlSeconds: 5,
      namespace: "sol_memecoin",
    },
  );
}

export async function enrichMemecoinRows(params: {
  cluster: SolanaCluster;
  candidates: MemecoinCandidate[];
  concurrency?: number;
  kolWallets?: string[] | null;
  kolLookbackMinutes?: number | null;
  heliusSignatureLimit?: number | null;
  heliusTxDetailLimit?: number | null;
}): Promise<MemecoinRow[]> {
  const network = normalizeSolanaNetwork(params.cluster === "devnet" ? "devnet" : "mainnet");
  const concurrency = Math.min(10, Math.max(1, params.concurrency ?? 6));
  const kolLookbackMinutes = Math.min(24 * 60, Math.max(0, Math.floor(params.kolLookbackMinutes ?? 180)));
  const kolWallets = (params.kolWallets ?? [])
    .map((w) => {
      try {
        return normalizeSolanaAddress(w);
      } catch {
        return null;
      }
    })
    .filter((v): v is string => Boolean(v));
  const kolWalletSet = new Set(kolWallets);
  const heliusSignatureLimit = Math.min(200, Math.max(0, Math.floor(params.heliusSignatureLimit ?? 80)));
  const heliusTxDetailLimit = Math.min(60, Math.max(0, Math.floor(params.heliusTxDetailLimit ?? 25)));

  return pMap(
    params.candidates,
    async (candidate): Promise<MemecoinRow> => {
      const mint = normalizeSolanaAddress(candidate.mint);
      const key = cacheKey(["enrich", network, mint]);

      const enrichment = await getOrSet(
        key,
        async (): Promise<MemecoinEnrichment> => {
          const now = Date.now();
          const nowUnix = Math.floor(now / 1000);

          const bondingRaw = await getPumpfunTokenBondingStatus({ network, address: mint }).catch(() => null);
          const bondingProgress = bondingRaw ? normalizeBondingProgress(bondingRaw) : null;

          const pairsRaw = await getPumpfunTokenPairsByAddress({ network, address: mint }).catch(() => null);
          const pairAddress = pairsRaw ? pickPairAddress(pairsRaw) : null;

          const pairStatsRaw = pairAddress
            ? await getSolanaTokenPairStats({ network, pairAddress }).catch(() => null)
            : null;
          const pairStatsRecord = asRecord(pairStatsRaw) ?? {};
          const pairStats = pairAddress
            ? {
                priceUsd: toNumber(pairStatsRecord.priceUsd ?? pairStatsRecord.price_usd ?? pairStatsRecord.price) ?? null,
                liquidityUsd:
                  toNumber(pairStatsRecord.liquidityUsd ?? pairStatsRecord.liquidity_usd ?? pairStatsRecord.liquidity) ??
                  null,
                volume24hUsd:
                  toNumber(pairStatsRecord.volumeUsd24h ?? pairStatsRecord.volume_24h_usd ?? pairStatsRecord.volume_usd_24h) ??
                  null,
                fdvUsd: toNumber(pairStatsRecord.fdvUsd ?? pairStatsRecord.fdv_usd ?? pairStatsRecord.fdv) ?? null,
                marketCapUsd:
                  toNumber(pairStatsRecord.marketCapUsd ?? pairStatsRecord.market_cap_usd ?? pairStatsRecord.market_cap) ??
                  null,
              }
            : null;

          const trend: MemecoinEnrichment["trend"] =
            pairAddress
              ? computeTrendFromCandles(
                  await getSolanaOhlcvByPairAddress({
                    network,
                    pairAddress,
                    // Use smaller candle granularity to produce enough samples for basic volatility.
                    fromDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
                    toDate: nowIso(),
                    timeframe: "15m",
                    currency: "usd",
                    limit: 12,
                  }).catch(() => ({})),
                  "1h",
                )
              : { timeframe: "1h", candleCount: 0, returnPct: null, volatilityPct: null };

          const swapsRaw = await getPumpfunTokenSwaps({ network, address: mint, limit: 50 }).catch(() => null);
          const swapsSummary = swapsRaw ? summarizeSwaps(swapsRaw) : null;
          const kolSummary = swapsRaw
            ? summarizeKolActivity({
                swaps: swapsRaw,
                kolWalletSet,
                lookbackMinutes: kolLookbackMinutes,
                nowUnix,
              })
            : kolWalletSet.size > 0
              ? {
                  walletCount: kolWalletSet.size,
                  lookbackMinutes: kolLookbackMinutes,
                  buys: 0,
                  sells: 0,
                  uniqueKolTraders: 0,
                  lastTradeAt: null,
                }
              : null;

          const createdAtUnix = toUnixSeconds(candidate.createdAt);

          const helius =
            params.cluster === "mainnet-beta" && heliusSignatureLimit > 0
              ? await fetchAndSummarizeMintActivity({
                  mint,
                  signatureLimit: heliusSignatureLimit,
                  txDetailLimit: heliusTxDetailLimit,
                  concurrency: 6,
                  createdAtUnix,
                }).catch(() => null)
              : null;

          return {
            mint,
            bondingProgress,
            pairAddress,
            pairStats,
            trend,
            swapsSummary,
            birdeye: {
              supply: null,
              circulatingSupply: null,
              security: null,
              tradeData: null,
              holdersSummary: null,
              kolSummary,
            },
            helius,
          };
        },
        {
          ttlSeconds: 15,
          staleTtlSeconds: 120,
          coalesce: true,
          lockTtlSeconds: 10,
          namespace: "sol_memecoin",
        },
      );

      return { candidate, enrichment };
    },
    { concurrency },
  );
}
