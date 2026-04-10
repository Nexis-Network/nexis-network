import Coingecko from "@coingecko/coingecko-typescript";

import {
  CoingeckoTokenInfo,
  CoingeckoTopPool,
  CoingeckoTopHolders,
  CoingeckoTopTraders,
  CoingeckoTrades,
  CoingeckoTrendingResponse,
} from "./coingecko-types";
import {
  resolveCoingeckoCredentials,
} from "@/server/market/coingecko-base";

const { proApiKey: PRO_API_KEY, demoApiKey: DEMO_API_KEY } = resolveCoingeckoCredentials({
  apiKey: process.env.COINGECKO_API_KEY || process.env.NEXT_PUBLIC_COINGECKO_API_KEY,
  proApiKey: process.env.COINGECKO_PRO_API_KEY,
  demoApiKey: process.env.COINGECKO_DEMO_API_KEY,
});

// NOTE: For on-chain endpoints we use the terminal/gecko terminal API
const ONCHAIN_BASE_URL = "https://api.geckoterminal.com/api/v2";

const useProEnvironment = Boolean(PRO_API_KEY);
const DEMO_FALLBACK_KEY = DEMO_API_KEY || PRO_API_KEY;

/**
 * Single, reusable SDK client instance.
 * Uses the SDK's built-in retry mechanism via maxRetries.
 */
const client = new Coingecko({
  proAPIKey: useProEnvironment ? PRO_API_KEY : undefined,
  demoAPIKey: useProEnvironment ? undefined : DEMO_FALLBACK_KEY,
  environment: useProEnvironment ? "pro" : "demo",
  maxRetries: 3,
});

/**
 * Helper to fetch from GeckoTerminal (on-chain data) API.
 * GeckoTerminal uses a separate API (api.geckoterminal.com) not covered
 * by the official CoinGecko SDK, so raw fetch is intentionally kept here.
 */
async function fetchGeckoTerminal<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${ONCHAIN_BASE_URL}${endpoint}`);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

  const headers: Record<string, string> = {
    accept: "application/json",
  };

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
    next: { revalidate: 60 } // Cache for 60 seconds
  });

  if (!response.ok) {
    if (response.status === 404 || response.status === 429) {
      console.warn(`[GeckoTerminal] ${response.status} on ${endpoint} - Returning empty data fallback.`);
      return { data: [] } as T;
    }
    throw new Error(`GeckoTerminal API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export class CoingeckoClient {
  /**
   * Get token info by contract address on a specific network.
   * Network ID examples: 'ethereum', 'polygon-pos', 'arbitrum-one', 'solana', 'base'
   */
  static async getTokenInfoByAddress(networkId: string, address: string): Promise<CoingeckoTokenInfo> {
    const response = await client.coins.contract.get(address, { id: networkId });
    return response as unknown as CoingeckoTokenInfo;
  }

  /**
   * Get top pools for a token address.
   * Network examples: 'eth', 'solana', 'base' (Note: GeckoTerminal has slightly different network IDs)
   */
  static async getTopPoolsByAddress(networkId: string, address: string): Promise<CoingeckoTopPool> {
    return fetchGeckoTerminal<CoingeckoTopPool>(`/networks/${networkId}/tokens/${address}/pools`);
  }

  /**
   * Get top holders for a token (GeckoTerminal endpoint — not covered by the SDK).
   */
  static async getTopHoldersByAddress(networkId: string, address: string): Promise<CoingeckoTopHolders> {
    return fetchGeckoTerminal<CoingeckoTopHolders>(`/networks/${networkId}/tokens/${address}/info`);
  }

  /**
   * Get top traders for a token (GeckoTerminal endpoint — not covered by the SDK).
   */
  static async getTopTradersByAddress(networkId: string, address: string): Promise<CoingeckoTopTraders> {
    return fetchGeckoTerminal<CoingeckoTopTraders>(`/networks/${networkId}/tokens/${address}/trades`);
  }

  /**
   * Get recent trades for a pool address (GeckoTerminal endpoint — not covered by the SDK).
   */
  static async getRecentTradesByAddress(networkId: string, address: string): Promise<CoingeckoTrades> {
    return fetchGeckoTerminal<CoingeckoTrades>(`/networks/${networkId}/pools/${address}/trades`);
  }

  /**
   * Get trending search coins.
   */
  static async getTrendingTokens(): Promise<CoingeckoTrendingResponse> {
    const response = await client.search.trending.get();
    return response as unknown as CoingeckoTrendingResponse;
  }
}
