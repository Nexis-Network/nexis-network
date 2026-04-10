export type CoinMentionTicker = {
  marketName: string;
  base: string;
  target: string;
  last?: number | null;
  volume?: number | null;
  tradeUrl?: string | null;
};

export type CoinMentionContractAddress = {
  chain: string;
  contractAddress: string;
};

export type TokenMentionSearchResult = {
  id: string;
  name: string;
  symbol: string;
  imageUrl?: string | null;
  marketCapRank?: number | null;
  launchedAt?: string | null;
};

export type TokenMentionRecentCollection = {
  items: TokenMentionSearchResult[];
  source: "coins-list-new" | "trending-fallback";
};

export type CoinMentionContextRecord = {
  id: string;
  name: string;
  symbol: string;
  imageUrl?: string | null;
  description?: string | null;
  homepageUrls: string[];
  blockchainSiteUrls: string[];
  twitterScreenName?: string | null;
  telegramChannelIdentifier?: string | null;
  githubUrls: string[];
  categories: string[];
  contractAddresses: CoinMentionContractAddress[];
  marketData: {
    currentPriceUsd?: number | null;
    priceChangePercentage24h?: number | null;
    marketCapUsd?: number | null;
    totalVolumeUsd?: number | null;
    athUsd?: number | null;
    athDate?: string | null;
    high24hUsd?: number | null;
    low24hUsd?: number | null;
    circulatingSupply?: number | null;
    totalSupply?: number | null;
    maxSupply?: number | null;
  };
  tickers: CoinMentionTicker[];
};

const COINGECKO_MENTION_PATTERN =
  /\[(?<label>[^\]]+)\]\(coingecko:(?<id>[a-z0-9-_.]+)\)/gi;

export type CoinGeckoMention = {
  id: string;
  label: string;
  start: number;
  end: number;
};

export function buildCoinMentionMarkup({
  id,
  label,
}: {
  id: string;
  label: string;
}): string {
  return `[${label}](coingecko:${id})`;
}

export function extractCoinGeckoMentionIds(text: string): string[] {
  const ids = new Set<string>();
  let match: RegExpExecArray | null;

  COINGECKO_MENTION_PATTERN.lastIndex = 0;

  while ((match = COINGECKO_MENTION_PATTERN.exec(text)) !== null) {
    const id = match.groups?.id?.trim().toLowerCase();
    if (id) {
      ids.add(id);
    }
  }

  return Array.from(ids);
}

export function extractCoinGeckoMentions(text: string): CoinGeckoMention[] {
  const mentions: CoinGeckoMention[] = [];
  let match: RegExpExecArray | null;

  COINGECKO_MENTION_PATTERN.lastIndex = 0;

  while ((match = COINGECKO_MENTION_PATTERN.exec(text)) !== null) {
    const id = match.groups?.id?.trim().toLowerCase();
    const label = match.groups?.label?.trim();
    if (!id || !label) {
      continue;
    }

    mentions.push({
      id,
      label,
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return mentions;
}

function compactDescription(description: string | null | undefined): string | null {
  if (!description) {
    return null;
  }
  const trimmed = description.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.length > 240 ? `${trimmed.slice(0, 237)}...` : trimmed;
}

function formatContractAddresses(
  contracts: CoinMentionContractAddress[],
): string | null {
  if (!contracts.length) {
    return null;
  }

  return contracts
    .slice(0, 5)
    .map(({ chain, contractAddress }) => `${chain}: ${contractAddress}`)
    .join(" | ");
}

function formatTickers(tickers: CoinMentionTicker[]): string | null {
  if (!tickers.length) {
    return null;
  }

  return tickers
    .slice(0, 5)
    .map((ticker) => {
      const volume =
        typeof ticker.volume === "number" ? ` volume=${ticker.volume}` : "";
      const price = typeof ticker.last === "number" ? ` last=${ticker.last}` : "";
      return `${ticker.marketName} ${ticker.base}/${ticker.target}${price}${volume}`;
    })
    .join(" | ");
}

export function formatCoinMentionContext(
  records: CoinMentionContextRecord[],
): string {
  if (records.length === 0) {
    return "";
  }

  const lines = ["CoinGecko token context:"];

  for (const record of records) {
    const homepage = record.homepageUrls[0] ?? null;
    const explorer = record.blockchainSiteUrls[0] ?? null;
    const github = record.githubUrls[0] ?? null;
    const contracts = formatContractAddresses(record.contractAddresses);
    const tickers = formatTickers(record.tickers);
    const description = compactDescription(record.description);

    lines.push(`- ${record.name} (${record.symbol.toUpperCase()}) [coin id: ${record.id}]`);
    if (record.imageUrl) {
      lines.push(`  Image: ${record.imageUrl}`);
    }
    if (description) {
      lines.push(`  Description: ${description}`);
    }
    if (homepage) {
      lines.push(`  Website: ${homepage}`);
    }
    if (explorer) {
      lines.push(`  Explorer: ${explorer}`);
    }
    if (record.twitterScreenName) {
      lines.push(`  Twitter/X: https://x.com/${record.twitterScreenName.replace(/^@/, "")}`);
    }
    if (record.telegramChannelIdentifier) {
      lines.push(`  Telegram: https://t.me/${record.telegramChannelIdentifier.replace(/^@/, "")}`);
    }
    if (github) {
      lines.push(`  GitHub: ${github}`);
    }
    if (record.categories.length > 0) {
      lines.push(`  Categories: ${record.categories.slice(0, 8).join(", ")}`);
    }
    if (contracts) {
      lines.push(`  Contracts: ${contracts}`);
    }
    if (typeof record.marketData.currentPriceUsd === "number") {
      lines.push(`  Current price (USD): ${record.marketData.currentPriceUsd}`);
    }
    if (typeof record.marketData.priceChangePercentage24h === "number") {
      lines.push(`  24h change (%): ${record.marketData.priceChangePercentage24h}`);
    }
    if (typeof record.marketData.marketCapUsd === "number") {
      lines.push(`  Market cap (USD): ${record.marketData.marketCapUsd}`);
    }
    if (typeof record.marketData.totalVolumeUsd === "number") {
      lines.push(`  24h volume (USD): ${record.marketData.totalVolumeUsd}`);
    }
    if (typeof record.marketData.athUsd === "number") {
      lines.push(
        `  ATH (USD): ${record.marketData.athUsd}${
          record.marketData.athDate ? ` on ${record.marketData.athDate}` : ""
        }`,
      );
    }
    if (
      typeof record.marketData.high24hUsd === "number" ||
      typeof record.marketData.low24hUsd === "number"
    ) {
      lines.push(
        `  24h range (USD): ${record.marketData.low24hUsd ?? "n/a"} -> ${
          record.marketData.high24hUsd ?? "n/a"
        }`,
      );
    }
    if (typeof record.marketData.circulatingSupply === "number") {
      lines.push(`  Circulating supply: ${record.marketData.circulatingSupply}`);
    }
    if (typeof record.marketData.totalSupply === "number") {
      lines.push(`  Total supply: ${record.marketData.totalSupply}`);
    }
    if (typeof record.marketData.maxSupply === "number") {
      lines.push(`  Max supply: ${record.marketData.maxSupply}`);
    }
    if (tickers) {
      lines.push(`  Top exchange tickers: ${tickers}`);
    }
  }

  return lines.join("\n");
}

export function isCoinGeckoMentionHref(value: string): boolean {
  return value.toLowerCase().startsWith("coingecko:");
}

export function extractCoinGeckoIdFromHref(value: string): string | null {
  if (!isCoinGeckoMentionHref(value)) {
    return null;
  }
  const id = value.slice("coingecko:".length).trim().toLowerCase();
  return id || null;
}
