export type Benchmark = {
  s: string;
  t: number[];
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
};

export type BenchmarkOptions = {
  resolutionMinutes?: number;
  from?: number;
  to?: number;
  rangeDays?: number;
};

export type SimplePriceFeed = {
  id: string;
  symbol: string;
  displaySymbol: string;
  description: string;
  base: string;
  quoteCurrency: string;
};

export type HistoricalBar = {
  timestamp: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type LatestPrice = {
  id: string;
  price: number;
  confidence: number;
  emaPrice: number | null;
  publishTime: number;
  expo: number;
};

export const applyExpo = (value: string, expo: number) => Number(value) * Math.pow(10, expo);

export function normalizePythTicker(raw: string, defaultQuote = "USD"): string | null {
  const quoteFallback = defaultQuote.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "USD";
  const trimmed = raw.replace(/^crypto\./i, "").trim();
  if (!trimmed) {
    return null;
  }

  if (!trimmed.includes("/")) {
    const symbol = trimmed.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (!symbol) {
      return null;
    }
    return `${symbol}/${quoteFallback}`;
  }

  const [baseRaw, quoteRaw] = trimmed.split("/", 2);
  const base = (baseRaw ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const quote = (quoteRaw ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || quoteFallback;

  if (!base) {
    return null;
  }

  return `${base}/${quote}`;
}

export function findPriceFeedBySymbol(priceFeeds: SimplePriceFeed[], ticker: string) {
  const normalized = normalizePythTicker(ticker);
  if (!normalized) {
    return undefined;
  }

  const normalizedLower = normalized.toLowerCase();
  return priceFeeds.find((feed) => {
    const normalizedSymbol = normalizePythTicker(feed.symbol);
    if (normalizedSymbol?.toLowerCase() === normalizedLower) {
      return true;
    }

    const normalizedDisplaySymbol = normalizePythTicker(feed.displaySymbol ?? "");
    return normalizedDisplaySymbol?.toLowerCase() === normalizedLower;
  });
}

export function formatUsd(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(value);
}
