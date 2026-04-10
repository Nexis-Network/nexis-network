import type { CoinMarketRow } from "@/types/market";
import { getTopCoins } from "@/server/market/coingecko";

export type MarketMoverDirection = "gainers" | "losers";
export type MarketMoverTimeFrame = "1h" | "24h" | "7d" | "30d";

export type MarketMoverToken = {
  id: string;
  chain: `0x${string}`;
  address: string | null;
  symbol: string | null;
  name: string | null;
  logoUrl: string | null;
  priceUsd: number | null;
  priceChange24hPercent: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  securityScore: number | null;
};

type CoinGeckoMoversParams = {
  chain: `0x${string}`;
  direction: MarketMoverDirection;
  limit: number;
  timeFrame: MarketMoverTimeFrame;
  minMarketCap?: number;
};

const MIN_SCAN_SIZE = 120;
const MAX_SCAN_SIZE = 250;
const SCAN_MULTIPLIER = 8;
const COINGECKO_MOVER_TIMEOUT_MS = 4_500;

function getTimeframeDelta(row: CoinMarketRow, timeFrame: MarketMoverTimeFrame): number | null {
  if (timeFrame === "1h") {
    return typeof row.priceChangePercentage1h === "number" ? row.priceChangePercentage1h : null;
  }
  if (timeFrame === "7d") {
    return typeof row.priceChangePercentage7d === "number" ? row.priceChangePercentage7d : null;
  }
  if (timeFrame === "30d") {
    return typeof row.priceChangePercentage30d === "number" ? row.priceChangePercentage30d : null;
  }
  return typeof row.priceChangePercentage24h === "number" ? row.priceChangePercentage24h : null;
}

function normalizeMoverToken(row: CoinMarketRow, chain: `0x${string}`): MarketMoverToken {
  const rawAddress = typeof row.address === "string" && row.address.length > 0 ? row.address : null;
  const normalizedAddress = rawAddress ? rawAddress.toLowerCase() : null;
  const id = normalizedAddress ? `${chain}:${normalizedAddress}` : `coingecko:${row.id}`;
  const symbol = typeof row.symbol === "string" && row.symbol.length > 0 ? row.symbol.toUpperCase() : null;

  return {
    id,
    chain,
    address: normalizedAddress,
    symbol,
    name: typeof row.name === "string" && row.name.length > 0 ? row.name : null,
    logoUrl: typeof row.image === "string" && row.image.length > 0 ? row.image : null,
    priceUsd: typeof row.currentPrice === "number" ? row.currentPrice : row.priceUsd,
    priceChange24hPercent:
      typeof row.priceChangePercentage24h === "number" ? row.priceChangePercentage24h : null,
    marketCapUsd: typeof row.marketCap === "number" ? row.marketCap : row.marketCapUsd,
    volume24hUsd: typeof row.totalVolume === "number" ? row.totalVolume : row.volume24hUsd,
    securityScore: null,
  };
}

export async function getCoinGeckoMarketMovers(params: CoinGeckoMoversParams): Promise<MarketMoverToken[]> {
  const scanSize = Math.min(
    MAX_SCAN_SIZE,
    Math.max(MIN_SCAN_SIZE, Math.max(params.limit, 1) * SCAN_MULTIPLIER),
  );
  const timeoutSignal =
    typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(COINGECKO_MOVER_TIMEOUT_MS)
      : undefined;

  const snapshot = await getTopCoins({
    page: 1,
    perPage: scanSize,
    order: "market_cap_desc",
    priceChangePercentage: "1h,24h,7d,30d",
    sparkline: false,
  }, {
    signal: timeoutSignal,
    timeoutMs: COINGECKO_MOVER_TIMEOUT_MS,
  });

  const candidates = snapshot.data
    .map((row) => ({
      row,
      delta: getTimeframeDelta(row, params.timeFrame),
      marketCapUsd: typeof row.marketCap === "number" ? row.marketCap : row.marketCapUsd,
      volume24hUsd: typeof row.totalVolume === "number" ? row.totalVolume : row.volume24hUsd,
    }))
    .filter((entry) => entry.delta !== null)
    .filter((entry) =>
      typeof params.minMarketCap === "number"
        ? typeof entry.marketCapUsd === "number" && entry.marketCapUsd >= params.minMarketCap
        : true,
    )
    .filter((entry) => (params.direction === "gainers" ? entry.delta! > 0 : entry.delta! < 0))
    .sort((a, b) => {
      const deltaDiff = params.direction === "gainers" ? b.delta! - a.delta! : a.delta! - b.delta!;
      if (deltaDiff !== 0) return deltaDiff;
      const leftVolume = typeof a.volume24hUsd === "number" ? a.volume24hUsd : 0;
      const rightVolume = typeof b.volume24hUsd === "number" ? b.volume24hUsd : 0;
      return rightVolume - leftVolume;
    });

  return candidates.slice(0, params.limit).map(({ row }) => normalizeMoverToken(row, params.chain));
}
