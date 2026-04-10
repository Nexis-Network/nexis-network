import {
  AI_INSIGHT_CATEGORY,
  INSIGHT_SENTENCE_MAX_LENGTH,
} from "@/server/insights/constants";
import { ensureValidInsightOutput } from "@/server/insights/validation";

function formatCompactUsd(value: number): string {
  if (!Number.isFinite(value)) {
    return "$0";
  }

  const absoluteValue = Math.abs(value);
  if (absoluteValue >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (absoluteValue >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (absoluteValue >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

function trimSentence(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= INSIGHT_SENTENCE_MAX_LENGTH) {
    return trimmed;
  }

  return `${trimmed.slice(0, INSIGHT_SENTENCE_MAX_LENGTH - 1).trimEnd()}.`;
}

export function buildAssetFallbackInsight(features: {
  symbol?: string | null;
  priceUsd?: number | null;
  change24hPercent?: number | null;
  volume24hUsd?: number | null;
} | null) {
  if (!features || !Number.isFinite(features.priceUsd)) {
    return null;
  }

  const symbol = String(features.symbol ?? "Asset").trim().toUpperCase() || "ASSET";
  const change = Number.isFinite(features.change24hPercent)
    ? Number(features.change24hPercent!.toFixed(1))
    : null;
  const volume = Number.isFinite(features.volume24hUsd) ? features.volume24hUsd : null;

  const sentence = trimSentence(
    change == null
      ? `${symbol} is trading near ${formatCompactUsd(features.priceUsd!)}, with recent market activity remaining mixed.`
      : `${symbol} is ${change >= 0 ? "up" : "down"} ${Math.abs(change)}% in 24h at ${formatCompactUsd(features.priceUsd!)}${volume ? ` on ${formatCompactUsd(volume)} volume` : ""}, signaling ${change >= 0 ? "stronger" : "weaker"} near-term attention.`,
  );

  return ensureValidInsightOutput({
    sentence,
    reasonCodes: ["fallback_asset_market"],
    confidence: 0.42,
    category: AI_INSIGHT_CATEGORY.ASSET,
  });
}

export function buildPortfolioFallbackNewsInsight(
  articles: Array<{ title?: string | null; source?: string | null }> | null | undefined,
) {
  const leadArticle = (Array.isArray(articles) ? articles : []).find(
    (article) => article && typeof article.title === "string" && article.title.trim().length > 0,
  );

  if (!leadArticle?.title) {
    return null;
  }

  const source =
    typeof leadArticle.source === "string" && leadArticle.source.trim().length > 0
      ? leadArticle.source.trim()
      : "the market";
  const headline = leadArticle.title.trim().replace(/[.!?]+$/g, "");
  const sentence = trimSentence(
    `${headline} is shaping the current crypto backdrop, keeping ${source} in focus across portfolio headlines.`,
  );

  return ensureValidInsightOutput({
    sentence,
    reasonCodes: ["fallback_news"],
    confidence: 0.35,
    category: AI_INSIGHT_CATEGORY.FALLBACK_NEWS,
  });
}
