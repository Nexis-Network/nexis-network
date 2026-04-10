import {
  formatCurrency,
  formatPercentage,
  formatRelativeTime,
} from "@/modules/prices/market-overview/formatters";
import { getTrendingCollection } from "@/server/market/coingecko";
import type { Source } from "@/lib/schema";
import type { TrendingEntity } from "@/types/market";

import { logger } from "@/lib/logger";

export type ImmediateChatReply = {
  message: string;
  sources: Source[];
};

export const CASUAL_GREETING_REGEX =
  /^(?:hey|hi|hello|gm|good\s+(?:morning|afternoon|evening))\b/i;
export const TRENDING_TRIGGER_REGEX =
  /\b(trending|top\s+trending|what(?:'|’)s\s+trending|hot)\b/i;
export const CRYPTO_KEYWORD_REGEX =
  /\b(crypto(?:currencies)?|coins?|tokens?)\b/i;

export const isSimpleGreeting = (
  input: string | null | undefined,
): boolean => {
  if (!input) return false;
  const normalized = input.trim().toLowerCase();
  if (!normalized) return false;
  if (!CASUAL_GREETING_REGEX.test(normalized)) {
    return false;
  }
  const wordCount = normalized.split(/\s+/).length;
  return wordCount <= 4;
};

export const isTrendingCryptoQuery = (
  input: string | null | undefined,
): boolean => {
  if (!input) return false;
  const normalized = input.trim().toLowerCase();
  if (!normalized) return false;
  return (
    TRENDING_TRIGGER_REGEX.test(normalized) &&
    CRYPTO_KEYWORD_REGEX.test(normalized)
  );
};

export const createImmediateResponse = (
  message: string,
  { sources = [] }: { sources?: Source[] } = {},
): ImmediateChatReply => ({
  message,
  sources,
});

export const formatTrendingTable = (coins: TrendingEntity[]): string => {
  const header =
    "| # | Coin | Price (USD) | 24h % | Rank |\n|---|------|-------------|-------|------|";
  const rows = coins
    .map((coin, index) => {
      const symbol = coin.symbol ? coin.symbol.toUpperCase() : "";
      const label = symbol ? `${coin.name} (${symbol})` : coin.name;
      const price = formatCurrency(coin.quickStats?.priceUsd ?? null, {
        currency: "USD",
      });
      const change = formatPercentage(
        coin.quickStats?.priceChangePercentage24h ?? null,
        { sign: true },
      );
      const rank = coin.marketCapRank ?? "—";
      return `| ${index + 1} | ${label} | ${price} | ${change} | ${rank} |`;
    })
    .join("\n");
  return `${header}\n${rows}`;
};

export const maybeCreateTrendingResponse = async (
  query: string,
): Promise<ImmediateChatReply | null> => {
  if (!isTrendingCryptoQuery(query)) {
    return null;
  }

  try {
    const { data, fetchedAt } = await getTrendingCollection();
    if (!data?.coins?.length) {
      return null;
    }

    const topCoins = data.coins.slice(0, 10);
    const updatedLabel = formatRelativeTime(fetchedAt);
    const freshness = updatedLabel === "—" ? "" : ` (updated ${updatedLabel})`;
    const intro = `Here are the coins CoinGecko lists as trending right now${freshness}.`;
    const table = formatTrendingTable(topCoins);
    const message = `${intro}\n\n${table}`;

    return createImmediateResponse(message, {
      sources: [
        {
          id: "coingecko-trending",
          title: "CoinGecko Trending API",
          url: "https://www.coingecko.com/en/api/documentation",
        },
      ],
    });
  } catch (error) {
    logger.error("[chat] Failed to build trending crypto response", error);
    return null;
  }
};

/**
 * Compute a safe text delta between two cumulative strings.
 *
 * - If the next value extends the previous value, return the appended slice.
 * - If the next value shrinks or is unrelated (sanitisation, redaction, etc.),
 *   fall back to the next value so the UI can replace the message content.
 * - Returns an empty string when there is no change.
 */
export const computeStringDelta = (
  previous: string,
  next: string,
): string => {
  if (!next) return next;

  if (!previous) {
    return next;
  }

  if (next === previous) {
    return "";
  }

  if (next.startsWith(previous)) {
    return next.slice(previous.length);
  }

  return next;
};
