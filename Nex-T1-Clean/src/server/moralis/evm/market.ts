import "server-only";

import { MORALIS_CACHE } from "@/server/moralis/cache-policy";
import { MoralisError, moralisRequest } from "@/server/moralis/client";
import { createLogger } from "@/server/logging/logging";
import { toNumber, toStringOrNull } from "@/server/moralis/utils";
import { normalizeEvmChain, normalizeMoralisChainFilter } from "@/server/moralis/validation";

export type MoralisEvmMarketDataErc20Token = {
  rank: number;
  token_name: string;
  token_symbol: string;
  token_logo: string;
  token_decimals: string;
  contract_address: string;
  price_usd: string;
  price_24h_percent_change: string;
  price_7d_percent_change: string;
  market_cap_usd: string;
};

export type MoralisEvmTopMoversResponse = {
  gainers: MoralisEvmMarketDataErc20Token[];
  losers: MoralisEvmMarketDataErc20Token[];
};

export type MoralisDiscoveryTimeFrame = "1h" | "24h" | "7d" | "30d";

export type MoralisEvmDiscoveryToken = Record<string, UntypedJson>;

export type MoralisEvmTopNftCollectionByMarketCap = {
  rank: number;
  collection_title: string;
  collection_image: string;
  floor_price_usd: string;
  floor_price_24hr_percent_change: string;
  market_cap_usd: string;
  market_cap_24hr_percent_change: string;
  volume_usd: string;
  volume_24hr_percent_change: string;
};

export type MoralisEvmHottestNftCollectionByVolume = {
  rank: number;
  collection_title: string;
  collection_image: string;
  floor_price_usd: string;
  floor_price_24hr_percent_change: string;
  volume_usd: string;
  volume_24hr_percent_change: string;
};

const logger = createLogger("moralis.evm.market");
const DISCOVERY_TIMEOUT_MS = 4_000;
const DISCOVERY_RETRIES = 0;

function shouldFallbackToTopMovers(params: {
  chain: `0x${string}`;
  fallbackToTopMovers?: boolean;
}): boolean {
  if (params.fallbackToTopMovers === false) return false;
  return params.chain === "0x1";
}

async function readTopMoversFallback(params: {
  chain: `0x${string}`;
  direction: "gainers" | "losers";
  status?: number;
}): Promise<UntypedJson> {
  logger.warnOnce(
    `discovery_${params.direction}_fallback_${params.chain}_${params.status ?? "unknown"}`,
    "moralis_discovery_failed_using_top_movers_fallback",
    {
      direction: params.direction,
      chain: params.chain,
      status: params.status,
    },
  );

  const payload = await moralisRequest<MoralisEvmTopMoversResponse>({
    api: "evm",
    path: "/market-data/erc20s/top-movers",
    timeoutMs: DISCOVERY_TIMEOUT_MS,
    retries: DISCOVERY_RETRIES,
    cache: {
      ...MORALIS_CACHE.marketMovers,
      tags: ["evm:market_top_movers"],
    },
  });

  return params.direction === "gainers" ? payload.gainers : payload.losers;
}

// Moralis docs: https://docs.moralis.com/web3-data-api/evm/reference/get-trending-tokens
export async function getEvmTrendingTokens(params?: {
  chain?: string | number | null;
  limit?: number;
}): Promise<UntypedJson> {
  const chain = normalizeMoralisChainFilter(params?.chain, "0x1");
  const limit = Math.min(100, Math.max(1, params?.limit ?? 20));

  return moralisRequest<UntypedJson>({
    api: "evm",
    path: "/tokens/trending",
    query: { chain, limit } as Record<string, UntypedJson>,
    cache: {
      ...MORALIS_CACHE.marketTrending,
      tags: [`chain:${chain}`, "evm:tokens_trending"],
    },
  });
}

// Moralis docs: https://docs.moralis.com/web3-data-api/evm/reference/get-tokens-with-top-gainers
export async function getEvmTopGainers(params?: {
  chain?: string | number | null;
  limit?: number;
  timeFrame?: MoralisDiscoveryTimeFrame;
  minMarketCap?: number;
  securityScore?: number;
  fallbackToTopMovers?: boolean;
}): Promise<UntypedJson> {
  const chain = normalizeEvmChain(params?.chain, "0x1");
  const limit = Math.min(100, Math.max(1, params?.limit ?? 20));
  try {
    return await moralisRequest<UntypedJson>({
      api: "evm",
      path: "/discovery/tokens/top-gainers",
      timeoutMs: DISCOVERY_TIMEOUT_MS,
      retries: DISCOVERY_RETRIES,
      query: {
        chain,
        limit,
        time_frame: params?.timeFrame ?? "24h",
        min_market_cap: params?.minMarketCap ?? undefined,
        security_score: params?.securityScore ?? undefined,
      } as Record<string, UntypedJson>,
      cache: {
        ...MORALIS_CACHE.marketMovers,
        tags: [`chain:${chain}`, `timeframe:${params?.timeFrame ?? "24h"}`, "evm:discovery_top_gainers"],
      },
    });
  } catch (error) {
    if (
      error instanceof MoralisError &&
      shouldFallbackToTopMovers({
        chain,
        fallbackToTopMovers: params?.fallbackToTopMovers,
      })
    ) {
      return readTopMoversFallback({
        chain,
        direction: "gainers",
        status: error.meta.status,
      });
    }
    throw error;
  }
}

// Moralis docs: https://docs.moralis.com/web3-data-api/evm/reference/get-tokens-with-top-losers
export async function getEvmTopLosers(params?: {
  chain?: string | number | null;
  limit?: number;
  timeFrame?: MoralisDiscoveryTimeFrame;
  minMarketCap?: number;
  securityScore?: number;
  fallbackToTopMovers?: boolean;
}): Promise<UntypedJson> {
  const chain = normalizeEvmChain(params?.chain, "0x1");
  const limit = Math.min(100, Math.max(1, params?.limit ?? 20));
  try {
    return await moralisRequest<UntypedJson>({
      api: "evm",
      path: "/discovery/tokens/top-losers",
      timeoutMs: DISCOVERY_TIMEOUT_MS,
      retries: DISCOVERY_RETRIES,
      query: {
        chain,
        limit,
        time_frame: params?.timeFrame ?? "24h",
        min_market_cap: params?.minMarketCap ?? undefined,
        security_score: params?.securityScore ?? undefined,
      } as Record<string, UntypedJson>,
      cache: {
        ...MORALIS_CACHE.marketMovers,
        tags: [`chain:${chain}`, `timeframe:${params?.timeFrame ?? "24h"}`, "evm:discovery_top_losers"],
      },
    });
  } catch (error) {
    if (
      error instanceof MoralisError &&
      shouldFallbackToTopMovers({
        chain,
        fallbackToTopMovers: params?.fallbackToTopMovers,
      })
    ) {
      return readTopMoversFallback({
        chain,
        direction: "losers",
        status: error.meta.status,
      });
    }
    throw error;
  }
}

// Moralis docs: https://docs.moralis.com/web3-data-api/evm/reference/get-filtered-tokens
// Guidance: https://docs.moralis.com/web3-data-api/evm/tutorials/filtered-tokens-api/overview
export async function getEvmFilteredTokens(body: Record<string, UntypedJson>): Promise<UntypedJson> {
  return moralisRequest<UntypedJson>({
    api: "evm",
    method: "POST",
    path: "/discovery/tokens",
    body,
    cache: {
      ...MORALIS_CACHE.marketFilteredTokens,
      tags: ["evm:filtered_tokens"],
    },
  });
}

// Legacy market data endpoints (Swagger-only; used as fallback when discovery endpoints are unavailable).
export async function getEvmTopMovers(): Promise<MoralisEvmTopMoversResponse> {
  return moralisRequest<MoralisEvmTopMoversResponse>({
    api: "evm",
    path: "/market-data/erc20s/top-movers",
    cache: {
      ...MORALIS_CACHE.marketMovers,
      tags: ["evm:market_top_movers"],
    },
  });
}

export async function getEvmTopTokensByMarketCap(): Promise<MoralisEvmMarketDataErc20Token[]> {
  const payload = await moralisRequest<UntypedJson>({
    api: "evm",
    path: "/market-data/erc20s/top-tokens",
    cache: {
      ...MORALIS_CACHE.marketMovers,
      tags: ["evm:market_top_tokens"],
    },
  });
  return Array.isArray(payload) ? (payload as MoralisEvmMarketDataErc20Token[]) : [];
}

export async function getEvmTopNftCollectionsByMarketCap(): Promise<MoralisEvmTopNftCollectionByMarketCap[]> {
  const payload = await moralisRequest<UntypedJson>({
    api: "evm",
    path: "/market-data/nfts/top-collections",
    cache: {
      ...MORALIS_CACHE.marketMovers,
      tags: ["evm:nfts_top_collections"],
    },
  });
  return Array.isArray(payload) ? (payload as MoralisEvmTopNftCollectionByMarketCap[]) : [];
}

export async function getEvmHottestNftCollectionsByVolume(): Promise<MoralisEvmHottestNftCollectionByVolume[]> {
  const payload = await moralisRequest<UntypedJson>({
    api: "evm",
    path: "/market-data/nfts/hottest-collections",
    cache: {
      ...MORALIS_CACHE.marketMovers,
      tags: ["evm:nfts_hottest_collections"],
    },
  });
  return Array.isArray(payload) ? (payload as MoralisEvmHottestNftCollectionByVolume[]) : [];
}

export function mapMarketErc20Token(raw: MoralisEvmMarketDataErc20Token) {
  return {
    rank: typeof raw.rank === "number" ? raw.rank : toNumber(raw.rank) ?? null,
    name: toStringOrNull(raw.token_name),
    symbol: toStringOrNull(raw.token_symbol),
    logoUrl: toStringOrNull(raw.token_logo),
    contractAddress: toStringOrNull(raw.contract_address)?.toLowerCase() ?? null,
    decimals: toNumber(raw.token_decimals),
    priceUsd: toNumber(raw.price_usd),
    priceChange24hPercent: toNumber(raw.price_24h_percent_change),
    priceChange7dPercent: toNumber(raw.price_7d_percent_change),
    marketCapUsd: toNumber(raw.market_cap_usd),
  };
}
