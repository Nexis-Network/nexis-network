import { isMarketMcpToolAvailable, MARKET_MCP_BASE_URLS } from "./tool-registry.shared";
import type { ToolLoader } from "./tool-registry.types";

export const MARKET_DEFI_TOOL_LOADERS: Record<string, ToolLoader> = {
  dexscreener: {
    category: "defi",
    enabled: () => isMarketMcpToolAvailable(MARKET_MCP_BASE_URLS.dexscreener),
    load: async () => (await import("@/modules/ai/tools/dexscreener")).dexscreenerTool,
  },
  uniswap_get_quote: {
    category: "defi",
    load: async () => (await import("@/modules/ai/tools/uniswap-tools")).uniswap_get_quote,
  },
  uniswap_create_lp: {
    category: "defi",
    load: async () => (await import("@/modules/ai/tools/uniswap-lp-tools")).uniswap_create_lp,
  },
  uniswap_poolspy: {
    category: "defi",
    load: async () => (await import("@/modules/ai/tools/uniswap-poolspy")).uniswapPoolSpyTool,
  },
  defi_llama: {
    category: "defi",
    load: async () => (await import("@/modules/ai/tools/defillama")).defiLlamaTool,
  },
  cow_swap_quote: {
    category: "defi",
    load: async () => (await import("@/modules/ai/tools/cow-swap/cow-swap-tools")).cowSwapQuoteTool,
  },
  cow_swap_execute: {
    category: "defi",
    load: async () => (await import("@/modules/ai/tools/cow-swap/cow-swap-tools")).cowSwapExecuteTool,
  },
  cow_swap_status: {
    category: "defi",
    load: async () => (await import("@/modules/ai/tools/cow-swap/cow-swap-tools")).cowSwapStatusTool,
  },
  binance_market_data: {
    category: "market",
    enabled: () => isMarketMcpToolAvailable(MARKET_MCP_BASE_URLS.binance),
    load: async () => (await import("@/modules/ai/tools/binance")).binanceTool,
  },
  coingecko_trending: {
    category: "market",
    load: async () => (await import("@/modules/ai/tools/coingecko-trending")).coingeckoTrendingTool,
  },
  cryptorank: {
    category: "market",
    load: async () => (await import("@/modules/ai/tools/cryptorank")).cryptorankTool,
  },
  market_intelligence: {
    category: "market",
    load: async () => (await import("@/modules/ai/tools/market-intelligence")).marketIntelligenceTool,
  },
  market_snapshot: {
    category: "market",
    load: async () => (await import("@/modules/ai/tools/market-tools")).getGlobalCryptoMarketSnapshot,
  },
  market_search: {
    category: "market",
    load: async () => (await import("@/modules/ai/tools/market-tools")).searchCoins,
  },
  market_token_prices: {
    category: "market",
    load: async () => (await import("@/modules/ai/tools/market-tools")).getOnchainTokenPrices,
  },
  market_token_data: {
    category: "market",
    load: async () => (await import("@/modules/ai/tools/market-tools")).getOnchainTokenData,
  },
  ccxt: {
    category: "market",
    load: async () => (await import("@/modules/ai/tools/ccxt")).ccxtTool,
  },
  crypto_sentiment: {
    category: "market",
    load: async () => (await import("@/modules/ai/tools/crypto-sentiment")).cryptoSentimentTool,
  },
  market_trending: {
    category: "market",
    load: async () =>
      (await import("@/modules/ai/tools/market-trending-prioritized")).marketTrendingPrioritizedTool,
  },
  market_gainers: {
    category: "market",
    load: async () => (await import("@/modules/ai/tools/moralis")).moralisMarketGainersTool,
  },
  market_losers: {
    category: "market",
    load: async () => (await import("@/modules/ai/tools/moralis")).moralisMarketLosersTool,
  },
  market_filtered_tokens: {
    category: "market",
    load: async () => (await import("@/modules/ai/tools/moralis")).moralisMarketFilteredTokensTool,
  },
  market_price_chart: {
    category: "market",
    load: async () => (await import("@/modules/ai/tools/market-charts")).showPriceChartTool,
  },
  market_volume_chart: {
    category: "market",
    load: async () => (await import("@/modules/ai/tools/market-charts")).showVolumeChartTool,
  },
};
