import {
  applyExpo,
  type Benchmark,
  type BenchmarkOptions,
  type HistoricalBar,
  type LatestPrice,
  normalizePythTicker,
  type SimplePriceFeed,
} from "@/modules/prices/pyth/base";
import { getCachedValue, clearCacheNamespace } from "@/server/services/redis/cache-helpers";

const BENCHMARK_BASE_URL = "https://benchmarks.pyth.network/v1";
const HERMES_BASE_URL = "https://hermes.pyth.network/api";
const CACHE_NAMESPACE = "pyth";

const DEFAULT_BENCHMARK_RANGE_DAYS = 30;
const DEFAULT_BENCHMARK_RESOLUTION = 30;

const DEFAULT_PRICE_FEEDS_TTL = 60 * 10; // 10 minutes
const DEFAULT_LATEST_PRICE_TTL = 15; // 15 seconds
const DEFAULT_BENCHMARK_TTL = 60; // 1 minute
const DEFAULT_HISTORY_TTL = 60; // 1 minute

const PRICE_FEEDS_TTL_SECONDS = parseTtl(process.env.PYTH_PRICE_FEEDS_TTL_SECONDS, DEFAULT_PRICE_FEEDS_TTL);
const LATEST_PRICE_TTL_SECONDS = parseTtl(process.env.PYTH_LATEST_PRICE_TTL_SECONDS, DEFAULT_LATEST_PRICE_TTL);
const BENCHMARK_TTL_SECONDS = parseTtl(process.env.PYTH_BENCHMARK_TTL_SECONDS, DEFAULT_BENCHMARK_TTL);
const HISTORY_TTL_SECONDS = parseTtl(process.env.PYTH_PRICE_HISTORY_TTL_SECONDS, DEFAULT_HISTORY_TTL);

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

function normaliseBenchmarkOptions(ticker: string, options: BenchmarkOptions = {}) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const resolutionMinutes = Math.max(1, options.resolutionMinutes ?? DEFAULT_BENCHMARK_RESOLUTION);
  const resolutionSeconds = resolutionMinutes * 60;
  const toCandidate = options.to ?? nowSeconds;
  const to = Math.floor(toCandidate / resolutionSeconds) * resolutionSeconds;
  const rangeSeconds = (options.rangeDays ?? DEFAULT_BENCHMARK_RANGE_DAYS) * 24 * 60 * 60;
  const from = options.from ?? Math.max(0, to - rangeSeconds);

  return {
    ticker: normalizePythTicker(ticker) ?? "BTC/USD",
    resolutionMinutes,
    from,
    to,
    rangeDays: options.rangeDays ?? DEFAULT_BENCHMARK_RANGE_DAYS,
  };
}

async function fetchBenchmarkData(options: ReturnType<typeof normaliseBenchmarkOptions>): Promise<Benchmark> {
  const searchParams = new URLSearchParams({
    symbol: `Crypto.${options.ticker}`,
    resolution: options.resolutionMinutes.toString(),
    from: options.from.toString(),
    to: options.to.toString(),
  });

  const res = await fetch(`${BENCHMARK_BASE_URL}/shims/tradingview/history?${searchParams.toString()}`, {
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch benchmark data for ${options.ticker}: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as Benchmark;
}

export async function getBenchmarkData(ticker = "BTC/USD", options: BenchmarkOptions = {}): Promise<Benchmark> {
  const resolved = normaliseBenchmarkOptions(ticker, options);

  return getCachedValue(
    CACHE_NAMESPACE,
    ["benchmark", resolved],
    BENCHMARK_TTL_SECONDS,
    () => fetchBenchmarkData(resolved),
  );
}

export async function getPriceHistory(ticker: string, options: BenchmarkOptions = {}): Promise<HistoricalBar[]> {
  const resolved = normaliseBenchmarkOptions(ticker, options);

  return getCachedValue(
    CACHE_NAMESPACE,
    ["history", resolved],
    HISTORY_TTL_SECONDS,
    async () => {
      const benchmark = await getBenchmarkData(resolved.ticker, resolved);

      if (!benchmark.t?.length) {
        return [];
      }

      return benchmark.t.map((timestamp, index) => ({
        timestamp,
        date: new Date(timestamp * 1000).toISOString(),
        open: benchmark.o[index],
        high: benchmark.h[index],
        low: benchmark.l[index],
        close: benchmark.c[index],
        volume: benchmark.v[index],
      }));
    },
  );
}

async function fetchPriceFeeds(): Promise<SimplePriceFeed[]> {
  const res = await fetch(`${BENCHMARK_BASE_URL}/price_feeds/?asset_type=crypto`, {
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch price feeds: ${res.status} ${res.statusText}`);
  }

  const payload = (await res.json()) as Array<{
    id: string;
    attributes: {
      symbol: string;
      base: string;
      description: string;
      display_symbol?: string;
      quote_currency: string;
    };
  }>;

  return payload.map((priceFeed) => {
    const symbol = priceFeed.attributes.symbol.replace("Crypto.", "");
    return {
      id: priceFeed.id,
      symbol,
      displaySymbol: priceFeed.attributes.display_symbol ?? symbol,
      description: priceFeed.attributes.description,
      base: priceFeed.attributes.base,
      quoteCurrency: priceFeed.attributes.quote_currency,
    };
  });
}

export async function getPriceFeedsData(): Promise<SimplePriceFeed[]> {
  return getCachedValue(
    CACHE_NAMESPACE,
    ["price-feeds"],
    PRICE_FEEDS_TTL_SECONDS,
    () => fetchPriceFeeds(),
  );
}

async function fetchLatestPrice(id: string): Promise<LatestPrice> {
  if (!id) {
    throw new Error("Price feed id is required");
  }

  const searchParams = new URLSearchParams({ "ids[]": id });
  const res = await fetch(`${HERMES_BASE_URL}/latest_price_feeds?${searchParams.toString()}`, {
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch latest price for ${id}: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as Array<{
    id: string;
    price: { price: string; conf: string; expo: number; publish_time: number };
    ema_price?: { price: string; conf: string; expo: number; publish_time: number } | null;
  }>;

  const record = data[0];

  if (!record) {
    throw new Error(`No latest price data returned for feed ${id}`);
  }

  const { price, ema_price: emaPrice } = record;

  return {
    id: record.id,
    price: applyExpo(price.price, price.expo),
    confidence: applyExpo(price.conf, price.expo),
    emaPrice: emaPrice ? applyExpo(emaPrice.price, emaPrice.expo) : null,
    publishTime: price.publish_time,
    expo: price.expo,
  };
}

export async function getLatestPrice(id: string): Promise<LatestPrice> {
  return getCachedValue(
    CACHE_NAMESPACE,
    ["latest", id],
    LATEST_PRICE_TTL_SECONDS,
    () => fetchLatestPrice(id),
  );
}

export async function clearPythCache(): Promise<void> {
  await clearCacheNamespace(CACHE_NAMESPACE);
}
