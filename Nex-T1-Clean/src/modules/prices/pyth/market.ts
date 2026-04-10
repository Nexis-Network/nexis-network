import { formatUsd, findPriceFeedBySymbol, type HistoricalBar } from "@/modules/prices/pyth/base";
import { getLatestPrice, getPriceFeedsData, getPriceHistory } from "@/server/market/pyth";
import { getCachedValue } from "@/server/services/redis/cache-helpers";
import { getCoinDetails, searchCoins } from "@/server/market/coingecko";
import { getEvmErc20TokenPrice } from "@/server/moralis/evm/token";
import { toNumber } from "@/server/moralis/utils";

export type CryptoHeadline = {
  title: string;
  url: string;
  publishedAt: string;
  source?: string;
};

export type PythMarketSnapshot = {
  ticker: string;
  priceFeedId: string;
  assetName?: string | null;
  assetSymbol?: string | null;
  assetImageUrl?: string | null;
  assetSummary?: string | null;
  price: number;
  emaPrice: number | null;
  publishTime: number;
  marketCapUsd?: number | null;
  volume24hUsd?: number | null;
  coingecko?: {
    id: string;
    priceUsd: number | null;
    change24hPct: number | null;
    marketCapUsd: number | null;
    volume24hUsd: number | null;
    lastUpdated: string | null;
  } | null;
  moralis?: {
    tokenAddress: string | null;
    priceUsd: number | null;
    change24hPct: number | null;
    exchangeName: string | null;
  } | null;
  change24h: number;
  change24hPct: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteCurrency: string;
  lookbackDays: number;
  resolutionMinutes: number;
};

const NEWS_CACHE_NAMESPACE = "pyth-news";
const SNAPSHOT_CACHE_NAMESPACE = "pyth-snapshot";
const DEFAULT_NEWS_CACHE_TTL_SECONDS = 5 * 60;
const DEFAULT_SNAPSHOT_CACHE_TTL_SECONDS = 30;

const NEWS_CACHE_TTL_SECONDS = parseTtl(
  process.env.PYTH_NEWS_CACHE_TTL_SECONDS,
  DEFAULT_NEWS_CACHE_TTL_SECONDS,
);
const SNAPSHOT_CACHE_TTL_SECONDS = parseTtl(
  process.env.PYTH_SNAPSHOT_CACHE_TTL_SECONDS,
  DEFAULT_SNAPSHOT_CACHE_TTL_SECONDS,
);

function parseTtl(raw: string | undefined, fallback: number): number {
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

const cleanNewsUrl = (rawUrl: string) => {
  try {
    const url = new URL(rawUrl);
    if (url.hostname === "news.google.com" && url.searchParams.has("url")) {
      return decodeURIComponent(url.searchParams.get("url") ?? rawUrl);
    }
  } catch {
    return rawUrl;
  }
  return rawUrl;
};

const MORALIS_ERC20_ADDRESS_BY_TICKER: Record<string, string> = {
  // Wrapped ETH / BTC for Moralis ERC20 pricing (EVM only).
  ETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  BTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
};

function stripHtml(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toBriefSummary(raw: string | null | undefined, maxSentences = 2): string | null {
  if (!raw) return null;
  const cleaned = stripHtml(raw);
  if (!cleaned) return null;
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!sentences.length) return null;
  return sentences.slice(0, Math.max(1, Math.min(maxSentences, 2))).join(" ");
}

async function fetchCoinGeckoMetaByTicker(baseSymbol: string) {
  const normalized = baseSymbol.trim().toLowerCase();
  if (!normalized) return null;

  const search = await searchCoins(normalized);
  const results = search.data ?? [];
  if (!results.length) return null;

  const symbolMatches = results.filter((r) => r.symbol?.toLowerCase() === normalized);
  const ranked = (list: typeof results) =>
    [...list].sort((a, b) => {
      const aRank = typeof a.marketCapRank === "number" ? a.marketCapRank : Number.POSITIVE_INFINITY;
      const bRank = typeof b.marketCapRank === "number" ? b.marketCapRank : Number.POSITIVE_INFINITY;
      return aRank - bRank;
    });

  const best =
    ranked(symbolMatches)[0] ??
    ranked(results)[0] ??
    null;

  if (!best?.id) return null;
  return best.id;
}

function resolveMoralisErc20Address(baseSymbol: string, coingeckoNetworks: { chain: string; contractAddress?: string | null }[] | undefined) {
  const upper = baseSymbol.trim().toUpperCase();
  const fromMap = MORALIS_ERC20_ADDRESS_BY_TICKER[upper];
  if (fromMap) return fromMap;

  const networks = Array.isArray(coingeckoNetworks) ? coingeckoNetworks : [];
  const ethereum = networks.find((n) => n.chain?.toLowerCase() === "ethereum");
  if (ethereum?.contractAddress && /^0x[a-fA-F0-9]{40}$/.test(ethereum.contractAddress)) {
    return ethereum.contractAddress;
  }

  return null;
}

async function fetchCryptoNewsInternal(symbol: string, limit: number): Promise<CryptoHeadline[]> {
  const query = encodeURIComponent(`${symbol} cryptocurrency`);
  const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

  const res = await fetch(rssUrl, {
    headers: {
      "Content-Type": "application/rss+xml",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch news (status ${res.status})`);
  }

  const xml = await res.text();
  const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g)).slice(0, limit);

  return items
    .map((match) => {
      const content = match[1];
      const titleMatch = content.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
      const linkMatch = content.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = content.match(/<pubDate>(.*?)<\/pubDate>/);
      const sourceMatch = content.match(/<source[^>]*>(.*?)<\/source>/);

      const rawTitle = titleMatch?.[1]?.trim();
      const rawUrl = linkMatch?.[1]?.trim();
      const rawDate = pubDateMatch?.[1]?.trim();

      if (!rawTitle || !rawUrl) {
        return null;
      }

      const parsedDate = rawDate ? new Date(rawDate).toISOString() : new Date().toISOString();

      return {
        title: decodeHtmlEntities(rawTitle),
        url: cleanNewsUrl(rawUrl),
        publishedAt: parsedDate,
        source: sourceMatch ? decodeHtmlEntities(sourceMatch[1]?.trim() ?? "") : undefined,
      } as CryptoHeadline;
    })
    .filter((item): item is CryptoHeadline => Boolean(item));
}

export async function fetchCryptoNews(baseSymbol: string, limit = 4): Promise<CryptoHeadline[]> {
  const symbol = baseSymbol?.toUpperCase();
  if (!symbol) {
    return [];
  }

  return getCachedValue(
    NEWS_CACHE_NAMESPACE,
    [symbol, limit],
    NEWS_CACHE_TTL_SECONDS,
    () => fetchCryptoNewsInternal(symbol, limit),
  );
}

type SnapshotKey = {
  ticker: string;
  lookbackDays: number;
  resolutionMinutes: number;
};

type SnapshotResult = {
  snapshot: PythMarketSnapshot | null;
  news: CryptoHeadline[];
  error?: string;
};

const loadSnapshot = async ({
  ticker,
  lookbackDays,
  resolutionMinutes,
}: SnapshotKey): Promise<SnapshotResult> => {
  if (!ticker) {
    return { snapshot: null, news: [], error: "Ticker is required" };
  }

  const feeds = await getPriceFeedsData();
  const feed = findPriceFeedBySymbol(feeds, ticker);

  if (!feed) {
    return {
      snapshot: null,
      news: [],
      error: `No Pyth price feed found for ticker ${ticker}`,
    };
  }

  const [history, latest] = await Promise.all([
    getPriceHistory(feed.symbol, {
      rangeDays: lookbackDays,
      resolutionMinutes,
    }),
    getLatestPrice(feed.id),
  ]);

  const latestTimestamp = latest.publishTime;
  const latestPrice = latest.price;
  const dayAgo = latestTimestamp - 24 * 60 * 60;

  const windowBars: HistoricalBar[] = history.filter((bar) => bar.timestamp >= dayAgo);
  const referenceBar =
    [...history].reverse().find((bar) => bar.timestamp <= dayAgo) ?? history[0];

  const referenceClose = referenceBar?.close ?? latestPrice;
  const change24h = latestPrice - referenceClose;
  const change24hPct = referenceClose === 0 ? 0 : (change24h / referenceClose) * 100;

  const high24h = windowBars.length
    ? Math.max(...windowBars.map((bar) => bar.high), latestPrice)
    : latestPrice;
  const low24h = windowBars.length
    ? Math.min(...windowBars.map((bar) => bar.low), latestPrice)
    : latestPrice;
  const volume24h = windowBars.reduce((total, bar) => total + (bar.volume ?? 0), 0);

  const baseSymbol = feed.base?.trim().toUpperCase() || feed.symbol.split("/")[0]?.trim().toUpperCase() || "";

  const [news, coingeckoId] = await Promise.all([
    fetchCryptoNews(baseSymbol || feed.base),
    fetchCoinGeckoMetaByTicker(baseSymbol).catch(() => null),
  ]);

  const coingecko = coingeckoId
    ? await getCoinDetails(coingeckoId)
        .then((res) => res.data)
        .catch(() => null)
    : null;

  const moralisAddress = resolveMoralisErc20Address(baseSymbol, coingecko?.networks);
  const moralis = moralisAddress
    ? await getEvmErc20TokenPrice({
        chain: "0x1",
        address: moralisAddress,
        include24hrPercentChange: true,
      })
        .then((price) => ({
          tokenAddress: moralisAddress,
          priceUsd: typeof price?.usdPrice === "number" ? price.usdPrice : toNumber(price?.usdPrice) ?? null,
          change24hPct: toNumber((price)?.["24hrPercentChange"]) ?? null,
          exchangeName: typeof (price)?.exchangeName === "string" ? (price).exchangeName : null,
        }))
        .catch(() => null)
    : null;

  const snapshot: PythMarketSnapshot = {
    ticker: feed.displaySymbol ?? feed.symbol,
    priceFeedId: feed.id,
    assetName: coingecko?.name ?? null,
    assetSymbol: coingecko?.symbol ? coingecko.symbol.toUpperCase() : baseSymbol || null,
    assetImageUrl: coingecko?.image?.small ?? coingecko?.image?.thumb ?? coingecko?.image?.large ?? null,
    assetSummary: toBriefSummary(coingecko?.description),
    price: latestPrice,
    emaPrice: latest.emaPrice,
    publishTime: latestTimestamp,
    marketCapUsd: coingecko?.marketData?.marketCapUsd ?? null,
    volume24hUsd: coingecko?.marketData?.totalVolumeUsd ?? null,
    coingecko: coingecko
      ? {
          id: coingecko.id,
          priceUsd: coingecko.marketData.currentPriceUsd ?? null,
          change24hPct: coingecko.marketData.priceChangePercentage24h ?? null,
          marketCapUsd: coingecko.marketData.marketCapUsd ?? null,
          volume24hUsd: coingecko.marketData.totalVolumeUsd ?? null,
          lastUpdated: coingecko.marketData.lastUpdated ?? null,
        }
      : null,
    moralis,
    change24h,
    change24hPct,
    high24h,
    low24h,
    volume24h,
    quoteCurrency: feed.quoteCurrency,
    lookbackDays,
    resolutionMinutes,
  };

  return { snapshot, news };
};

const resolveSnapshot = async (key: SnapshotKey): Promise<SnapshotResult> => {
  const { ticker, lookbackDays, resolutionMinutes } = key;

  return getCachedValue(
    SNAPSHOT_CACHE_NAMESPACE,
    [ticker, lookbackDays, resolutionMinutes],
    SNAPSHOT_CACHE_TTL_SECONDS,
    () => loadSnapshot(key),
  );
};

export async function getPythMarketSnapshot({
  ticker,
  lookbackDays = 7,
  resolutionMinutes = 15,
}: {
  ticker: string;
  lookbackDays?: number;
  resolutionMinutes?: number;
}): Promise<SnapshotResult> {
  const normalizedTicker = ticker?.trim() || "";
  try {
    return await resolveSnapshot({
      ticker: normalizedTicker,
      lookbackDays,
      resolutionMinutes,
    });
  } catch (error) {
    return {
      snapshot: null,
      news: [],
      error:
        error instanceof Error
          ? error.message
          : `Failed to compute Pyth snapshot for ${normalizedTicker}`,
    };
  }
}

export function buildSnapshotSummary(
  snapshot: PythMarketSnapshot,
  focus?: string,
  notes?: string,
): string {
  const lines = [
    `### ${snapshot.ticker} Market Update`,
    `- Last price: ${formatUsd(snapshot.price)}`,
    `- 24h change: ${formatUsd(snapshot.change24h)} (${snapshot.change24hPct.toFixed(2)}%)`,
    `- 24h high / low: ${formatUsd(snapshot.high24h)} / ${formatUsd(snapshot.low24h)}`,
    `- 24h volume: ${snapshot.volume24h.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })} ${snapshot.quoteCurrency}`,
  ];

  if (snapshot.emaPrice !== null) {
    lines.push(`- EMA price: ${formatUsd(snapshot.emaPrice)}`);
  }

  if (focus) {
    lines.push(`- Focus: ${focus.trim()}`);
  }

  if (notes) {
    lines.push(`- Notes: ${notes.trim()}`);
  }

  lines.push(
    `Data powered by the [Pyth Network](https://pyth.network). Snapshot captured at ${new Date(
      snapshot.publishTime * 1000,
    ).toLocaleString()}.`,
  );

  return lines.join("\n");
}
