import "server-only";

import { z } from "zod";

import type { MemecoinRow } from "./memecoin-types";

export const memecoinAutotradeParamsSchema = z.object({
  kind: z.literal("solana_memecoin_autotrade"),
  cluster: z.enum(["mainnet-beta", "devnet"]).default("mainnet-beta"),
  universe: z.enum(["pumpfun_bonding", "pumpfun_new", "pumpfun_graduated", "birdeye_meme_list"]).default("pumpfun_bonding"),

  // Candidate selection
  candidateLimit: z.number().int().min(5).max(200).default(80),
  enrichTopN: z.number().int().min(5).max(80).default(40),

  // Hard gates
  minLiquidityUsd: z.number().nonnegative().default(5_000),
  maxMarketCapUsd: z.number().positive().default(250_000),
  minVolume24hUsd: z.number().nonnegative().default(2_000),
  minBondingProgress: z.number().min(0).max(100).default(10),
  maxBondingProgress: z.number().min(0).max(100).default(95),

  // Trend heuristics
  minReturnPct1h: z.number().default(-10),
  maxVolatilityPct1h: z.number().positive().default(60),

  // Anti-manipulation heuristics
  maxTopTraderShare: z.number().min(0).max(1).default(0.25),
  minUniqueTraders: z.number().int().min(0).default(30),

  // Optional KOL wallets signal (addresses) evaluated via Birdeye token transactions.
  kolWallets: z.array(z.string().min(20).max(80)).max(50).default([]),
  kolLookbackMinutes: z.number().int().min(0).max(24 * 60).default(180),

  // Helius bundler/sniper heuristics (evaluated via recent mint tx signatures + fee payer extraction).
  heliusSignatureLimit: z.number().int().min(0).max(200).default(80),
  heliusTxDetailLimit: z.number().int().min(0).max(60).default(25),

  // Decision
  minScoreToTrade: z.number().min(0).max(100).default(70),

  // Execution control
  execution: z.object({
    mode: z.enum(["propose", "execute"]).default("propose"),
    signingMode: z.enum(["non_custodial", "custodial_legacy"]).default("non_custodial"),
    walletAddress: z.string().trim().min(1).max(128).optional(),
    chainId: z.number().int().positive().optional(),
    buyAmountSol: z.number().positive().default(0.05),
    slippageBps: z.number().int().min(5).max(5000).default(500),
    maxTradesPerDay: z.number().int().min(0).max(200).default(10),
    maxSolPerDay: z.number().nonnegative().default(1.0),
    cooldownMinutesPerMint: z.number().int().min(0).max(24 * 60).default(120),
  }).default({ mode: "propose" }),
});

export type MemecoinAutotradeParams = z.infer<typeof memecoinAutotradeParamsSchema>;

export type MemecoinScore = {
  score: number; // 0..100
  reasons: string[];
  hardRejectReasons: string[];
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function num(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function pct(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}%`;
}

export function scoreMemecoin(row: MemecoinRow, params: MemecoinAutotradeParams): MemecoinScore {
  const hardRejectReasons: string[] = [];
  const reasons: string[] = [];

  const c = row.candidate;
  const e = row.enrichment;

  const liquidityUsd = num(e.pairStats?.liquidityUsd) ?? num(c.liquidityUsd);
  const marketCapUsd = num(e.pairStats?.marketCapUsd) ?? num(c.marketCapUsd);
  const volume24hUsd = num(e.pairStats?.volume24hUsd) ?? num(c.volume24hUsd);
  const bondingProgress = num(e.bondingProgress);
  const returnPct1h = num(e.trend?.timeframe === "1h" ? e.trend.returnPct : null);
  const volatilityPct1h = num(e.trend?.timeframe === "1h" ? e.trend.volatilityPct : null);
  const topTraderShare = num(e.swapsSummary?.topTraderShare);
  const uniqueTraders = typeof e.swapsSummary?.uniqueTraders === "number" ? e.swapsSummary.uniqueTraders : null;
  const honeypot = e.birdeye?.security?.isHoneypot === true;
  const top10HolderShare = num(e.birdeye?.holdersSummary?.top10SharePct);
  const top1HolderShare = num(e.birdeye?.holdersSummary?.top1SharePct);
  const uniqueWallets24h = num(e.birdeye?.tradeData?.uniqueWallets24h);
  const kolBuys = typeof e.birdeye?.kolSummary?.buys === "number" ? e.birdeye.kolSummary.buys : null;
  const kolSells = typeof e.birdeye?.kolSummary?.sells === "number" ? e.birdeye.kolSummary.sells : null;
  const heliusBundlerScore = num(e.helius?.suspectedBundlerScore);
  const heliusSniperScore = num(e.helius?.suspectedSniperScore);
  const maxUniqueFeePayersInSlot = typeof e.helius?.maxUniqueFeePayersInSlot === "number" ? e.helius.maxUniqueFeePayersInSlot : null;
  const maxUniqueBuyersInSlot = typeof e.helius?.maxUniqueBuyersInSlot === "number" ? e.helius.maxUniqueBuyersInSlot : null;
  const maxUniqueBuyLikeBuyersInSlot =
    typeof e.helius?.maxUniqueBuyLikeBuyersInSlot === "number" ? e.helius.maxUniqueBuyLikeBuyersInSlot : null;
  const earlyUniqueFreshBuyers = typeof e.helius?.earlyUniqueFreshBuyers === "number" ? e.helius.earlyUniqueFreshBuyers : null;
  const earlyUniqueFreshBuyLikeBuyers =
    typeof e.helius?.earlyUniqueFreshBuyLikeBuyers === "number" ? e.helius.earlyUniqueFreshBuyLikeBuyers : null;

  if (liquidityUsd != null && liquidityUsd < params.minLiquidityUsd) {
    hardRejectReasons.push(`Liquidity below $${params.minLiquidityUsd.toLocaleString()}`);
  }
  if (marketCapUsd != null && marketCapUsd > params.maxMarketCapUsd) {
    hardRejectReasons.push(`Market cap above $${params.maxMarketCapUsd.toLocaleString()}`);
  }
  if (volume24hUsd != null && volume24hUsd < params.minVolume24hUsd) {
    hardRejectReasons.push(`Volume(24h) below $${params.minVolume24hUsd.toLocaleString()}`);
  }
  if (bondingProgress != null) {
    if (bondingProgress < params.minBondingProgress) {
      hardRejectReasons.push(`Bonding progress below ${params.minBondingProgress}%`);
    }
    if (bondingProgress > params.maxBondingProgress) {
      hardRejectReasons.push(`Bonding progress above ${params.maxBondingProgress}%`);
    }
  }
  if (returnPct1h != null && returnPct1h < params.minReturnPct1h) {
    hardRejectReasons.push(`1h return below ${params.minReturnPct1h}%`);
  }
  if (volatilityPct1h != null && volatilityPct1h > params.maxVolatilityPct1h) {
    hardRejectReasons.push(`1h volatility above ${params.maxVolatilityPct1h}%`);
  }
  if (topTraderShare != null && topTraderShare > params.maxTopTraderShare) {
    hardRejectReasons.push(`Top trader share above ${(params.maxTopTraderShare * 100).toFixed(0)}%`);
  }
  if (uniqueTraders != null && uniqueTraders < params.minUniqueTraders) {
    hardRejectReasons.push(`Unique traders below ${params.minUniqueTraders}`);
  }
  if (honeypot) {
    hardRejectReasons.push("Birdeye: flagged as honeypot");
  }
  // Extremely concentrated same-slot fee payer bursts are almost always bots/bundles.
  if (maxUniqueFeePayersInSlot != null && maxUniqueFeePayersInSlot >= 30) {
    hardRejectReasons.push("Helius: extreme bundled activity (unique fee payers in one slot)");
  }
  // Same-slot buy bursts are more directly tied to memecoin sniping/bundling.
  const burstBuyers = maxUniqueBuyLikeBuyersInSlot ?? maxUniqueBuyersInSlot;
  if (burstBuyers != null && burstBuyers >= 35) {
    hardRejectReasons.push("Helius: extreme bundled buy burst (unique buy-like buyers in one slot)");
  }

  if (hardRejectReasons.length > 0) {
    return { score: 0, reasons, hardRejectReasons };
  }

  // Weighted score (simple, deterministic, explainable)
  let score = 0;

  if (liquidityUsd != null) {
    // Sweet spot: enough liquidity to enter/exit, still early.
    const liqScore = liquidityUsd >= 50_000 ? 20 : liquidityUsd >= 20_000 ? 16 : liquidityUsd >= 10_000 ? 12 : 8;
    score += liqScore;
    reasons.push(`Liquidity: $${Math.round(liquidityUsd).toLocaleString()}`);
  }

  if (marketCapUsd != null) {
    const mcScore = marketCapUsd <= 75_000 ? 20 : marketCapUsd <= 150_000 ? 14 : 8;
    score += mcScore;
    reasons.push(`Market cap: $${Math.round(marketCapUsd).toLocaleString()}`);
  }

  if (volume24hUsd != null) {
    const volScore = volume24hUsd >= 100_000 ? 20 : volume24hUsd >= 50_000 ? 16 : volume24hUsd >= 20_000 ? 12 : 8;
    score += volScore;
    reasons.push(`24h volume: $${Math.round(volume24hUsd).toLocaleString()}`);
  }

  if (bondingProgress != null) {
    // Middle of curve often best risk/reward; too early = no traction, too late = crowded.
    const bpScore = bondingProgress >= 25 && bondingProgress <= 75 ? 20 : 12;
    score += bpScore;
    reasons.push(`Bonding progress: ${pct(bondingProgress)}`);
  }

  if (returnPct1h != null) {
    const trendScore = returnPct1h >= 25 ? 10 : returnPct1h >= 10 ? 7 : returnPct1h >= 0 ? 4 : 1;
    score += trendScore;
    reasons.push(`1h return: ${pct(returnPct1h)}`);
  }

  if (volatilityPct1h != null) {
    const volPenalty = volatilityPct1h >= 50 ? 8 : volatilityPct1h >= 35 ? 5 : 2;
    score -= volPenalty;
    reasons.push(`1h volatility: ${pct(volatilityPct1h)}`);
  }

  if (topTraderShare != null) {
    const penalty = topTraderShare >= 0.25 ? 12 : topTraderShare >= 0.15 ? 8 : topTraderShare >= 0.1 ? 4 : 0;
    score -= penalty;
    reasons.push(`Top trader share: ${(topTraderShare * 100).toFixed(1)}%`);
  }

  if (uniqueTraders != null) {
    const utScore = uniqueTraders >= 200 ? 10 : uniqueTraders >= 100 ? 7 : uniqueTraders >= 50 ? 4 : 0;
    score += utScore;
    reasons.push(`Unique traders: ${uniqueTraders}`);
  }

  if (uniqueWallets24h != null) {
    const uwScore = uniqueWallets24h >= 600 ? 10 : uniqueWallets24h >= 300 ? 7 : uniqueWallets24h >= 150 ? 4 : 0;
    score += uwScore;
    reasons.push(`Birdeye unique wallets(24h): ${Math.round(uniqueWallets24h)}`);
  }

  if (top10HolderShare != null) {
    const penalty = top10HolderShare >= 0.9 ? 12 : top10HolderShare >= 0.8 ? 8 : top10HolderShare >= 0.7 ? 4 : 0;
    score -= penalty;
    reasons.push(`Birdeye top10 holders share: ${(top10HolderShare * 100).toFixed(1)}%`);
  } else if (top1HolderShare != null) {
    reasons.push(`Birdeye top holder share: ${(top1HolderShare * 100).toFixed(1)}%`);
  }

  if (params.kolWallets.length > 0 && (kolBuys != null || kolSells != null)) {
    const activity = (kolBuys ?? 0) + (kolSells ?? 0);
    const kolScore = activity >= 6 ? 8 : activity >= 3 ? 5 : activity >= 1 ? 3 : 0;
    score += kolScore;
    reasons.push(`KOL activity (lookback): buys=${kolBuys ?? 0}, sells=${kolSells ?? 0}`);
  }

  if (heliusBundlerScore != null) {
    const penalty = heliusBundlerScore >= 0.9 ? 18 : heliusBundlerScore >= 0.75 ? 12 : heliusBundlerScore >= 0.6 ? 6 : 0;
    score -= penalty;
    reasons.push(`Helius bundled activity score: ${(heliusBundlerScore * 100).toFixed(0)}%`);
  }

  if (heliusSniperScore != null) {
    const add = heliusSniperScore >= 0.9 ? 8 : heliusSniperScore >= 0.7 ? 5 : heliusSniperScore >= 0.5 ? 3 : 0;
    score += add;
    reasons.push(`Helius early activity score: ${(heliusSniperScore * 100).toFixed(0)}%`);
  }

  const effectiveEarlyFresh = earlyUniqueFreshBuyLikeBuyers ?? earlyUniqueFreshBuyers;
  if (effectiveEarlyFresh != null) {
    const add = effectiveEarlyFresh >= 15 ? 6 : effectiveEarlyFresh >= 8 ? 4 : effectiveEarlyFresh >= 3 ? 2 : 0;
    score += add;
    reasons.push(`Helius early fresh buyers: ${effectiveEarlyFresh}`);
  }

  return { score: clampScore(score), reasons, hardRejectReasons };
}
