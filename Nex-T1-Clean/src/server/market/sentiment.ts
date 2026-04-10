import type { AssetSentimentFactor } from "@/types/extension/asset-detail";

export type SentimentLabel = "bullish" | "neutral" | "bearish";

export type QuantSentimentResult = {
  label: SentimentLabel;
  score: number;
  confidence: number;
  factors: AssetSentimentFactor[];
};

export type QuantSentimentInput = {
  priceChange24hPct?: number | null;
  volumeChange24hPct?: number | null;
  volume24hUsd?: number | null;
  marketCapUsd?: number | null;
  liquidityUsd?: number | null;
  holdersChange24hPct?: number | null;
  moralisTokenScore?: number | null;
  volatility24hPct?: number | null;
};

type WeightedFactor = {
  id: string;
  weight: number;
  score: number | null;
  value: number | null;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function finite(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function linearScore(value: number, min: number, max: number): number {
  if (max <= min) return 50;
  const normalized = (value - min) / (max - min);
  return clamp(normalized * 100, 0, 100);
}

function safeRatio(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null) return null;
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return numerator / denominator;
}

function computePriceMomentum(change24hPct: number | null): number | null {
  if (change24hPct === null) return null;
  return linearScore(change24hPct, -20, 20);
}

function computeVolumeMomentum(args: {
  volumeChange24hPct: number | null;
  volume24hUsd: number | null;
  marketCapUsd: number | null;
}): number | null {
  if (args.volumeChange24hPct !== null) {
    return linearScore(args.volumeChange24hPct, -30, 30);
  }

  const volumeToCap = safeRatio(args.volume24hUsd, args.marketCapUsd);
  if (volumeToCap !== null) {
    return linearScore(volumeToCap, 0.01, 0.45);
  }

  return null;
}

function computeLiquidityDepth(args: { liquidityUsd: number | null; marketCapUsd: number | null }): number | null {
  const liquidityToCap = safeRatio(args.liquidityUsd, args.marketCapUsd);
  if (liquidityToCap !== null) {
    return linearScore(liquidityToCap, 0.005, 0.25);
  }

  if (args.liquidityUsd !== null && args.liquidityUsd > 0) {
    const logValue = Math.log10(args.liquidityUsd);
    return linearScore(logValue, 4, 8);
  }

  return null;
}

function computeHolderActivity(holdersChange24hPct: number | null): number | null {
  if (holdersChange24hPct === null) return null;
  return linearScore(holdersChange24hPct, -5, 5);
}

function computeMoralisTokenScore(score: number | null): number | null {
  if (score === null) return null;
  return clamp(score, 0, 100);
}

function computeVolatilityPenalty(input: QuantSentimentInput): number {
  const fromVolatility = finite(input.volatility24hPct);
  const fromPriceChange = finite(input.priceChange24hPct);
  const proxy = Math.abs(fromVolatility ?? fromPriceChange ?? 0);
  if (proxy <= 8) return 0;
  return clamp(((proxy - 8) / 42) * 10, 0, 10);
}

export function computeQuantSentiment(input: QuantSentimentInput): QuantSentimentResult {
  const priceChange24hPct = finite(input.priceChange24hPct);
  const volumeChange24hPct = finite(input.volumeChange24hPct);
  const volume24hUsd = finite(input.volume24hUsd);
  const marketCapUsd = finite(input.marketCapUsd);
  const liquidityUsd = finite(input.liquidityUsd);
  const holdersChange24hPct = finite(input.holdersChange24hPct);
  const moralisTokenScore = finite(input.moralisTokenScore);

  const factors: WeightedFactor[] = [
    {
      id: "price_momentum_24h",
      weight: 25,
      score: computePriceMomentum(priceChange24hPct),
      value: priceChange24hPct,
    },
    {
      id: "volume_momentum",
      weight: 20,
      score: computeVolumeMomentum({ volumeChange24hPct, volume24hUsd, marketCapUsd }),
      value: volumeChange24hPct ?? safeRatio(volume24hUsd, marketCapUsd),
    },
    {
      id: "liquidity_depth",
      weight: 20,
      score: computeLiquidityDepth({ liquidityUsd, marketCapUsd }),
      value: liquidityUsd ?? safeRatio(liquidityUsd, marketCapUsd),
    },
    {
      id: "holder_activity",
      weight: 15,
      score: computeHolderActivity(holdersChange24hPct),
      value: holdersChange24hPct,
    },
    {
      id: "moralis_token_score",
      weight: 20,
      score: computeMoralisTokenScore(moralisTokenScore),
      value: moralisTokenScore,
    },
  ];

  const availableFactors = factors.filter((factor) => factor.score !== null);
  const availableWeight = availableFactors.reduce((sum, factor) => sum + factor.weight, 0);
  const weightedSum = availableFactors.reduce(
    (sum, factor) => sum + ((factor.score as number) * factor.weight) / 100,
    0,
  );

  const baseScore = availableWeight > 0 ? (weightedSum / availableWeight) * 100 : 50;
  const volatilityPenalty = computeVolatilityPenalty(input);
  const finalScore = clamp(baseScore - volatilityPenalty, 0, 100);

  const confidence = Math.round((availableFactors.length / factors.length) * 100);
  const roundedScore = Math.round(finalScore);

  let label: SentimentLabel = "neutral";
  if (roundedScore >= 67) label = "bullish";
  else if (roundedScore <= 33) label = "bearish";

  const responseFactors: AssetSentimentFactor[] = availableFactors.map((factor) => ({
    id: factor.id,
    contribution: Number((((factor.score as number) * factor.weight) / 100).toFixed(2)),
    value: factor.value,
  }));

  if (volatilityPenalty > 0) {
    responseFactors.push({
      id: "volatility_penalty",
      contribution: Number((-volatilityPenalty).toFixed(2)),
      value: Math.abs(finite(input.volatility24hPct) ?? finite(input.priceChange24hPct) ?? 0),
    });
  }

  return {
    label,
    score: roundedScore,
    confidence,
    factors: responseFactors,
  };
}
