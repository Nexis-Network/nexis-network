import type { ToolLoader } from "./tool-registry.types";

export const ONCHAIN_TOOL_LOADERS: Record<string, ToolLoader> = {
  thegraph_get_schema: {
    category: "onchain",
    load: async () => (await import("@/modules/ai/tools/thegraph-subgraph")).getSubgraphSchemaTool,
  },
  thegraph_query_subgraph: {
    category: "onchain",
    load: async () => (await import("@/modules/ai/tools/thegraph-subgraph")).querySubgraphTool,
  },
  thegraph_token_metadata: {
    category: "market",
    load: async () => (await import("@/modules/ai/tools/thegraph-token")).getTokenMetadataTool,
  },
  thegraph_token_balances: {
    category: "market",
    load: async () => (await import("@/modules/ai/tools/thegraph-token")).getTokenBalancesTool,
  },
  thegraph_token_transfers: {
    category: "market",
    load: async () => (await import("@/modules/ai/tools/thegraph-token")).getTokenTransfersTool,
  },
  chainlink_feeds: {
    category: "onchain",
    load: async () =>
      (await import("@/modules/ai/tools/chainlink-price-feeds")).chainlinkPriceFeedsTool,
  },
  etherscan: {
    category: "onchain",
    load: async () => (await import("@/modules/ai/tools/etherscan")).etherscanTool,
  },
  alchemy_sdk: {
    category: "onchain",
    load: async () => (await import("@/modules/ai/tools/alchemy")).alchemyTool,
  },
  bsc_chain: {
    category: "onchain",
    load: async () => (await import("@/modules/ai/tools/bsc-chain")).bscChainTool,
  },
  blocknative_gas: {
    category: "onchain",
    load: async () => (await import("@/modules/ai/tools/blocknative")).blocknativeTool,
  },
  bitcoin_network: {
    category: "bitcoin",
    load: async () => (await import("@/modules/ai/tools/bitcoin-hitl")).bitcoinToolWithHITL,
  },
  browser_read_dom: {
    category: "browser",
    load: async () => (await import("@/modules/ai/tools/browser")).browserReadDomTool,
  },
  trading_execute_order: {
    category: "defi",
    load: async () => (await import("@/modules/ai/tools/trading-execution")).tradingExecutionTool,
  },
  trading_cancel_order: {
    category: "defi",
    load: async () => (await import("@/modules/ai/tools/trading-execution")).tradingCancelOrderTool,
  },
  trading_fetch_balance: {
    category: "defi",
    load: async () => (await import("@/modules/ai/tools/trading-execution")).tradingFetchBalanceTool,
  },
  trading_open_orders: {
    category: "defi",
    load: async () => (await import("@/modules/ai/tools/trading-execution")).tradingOpenOrdersTool,
  },
  polymarket_markets: {
    category: "defi",
    load: async () => (await import("@/modules/ai/tools/polymarket-markets")).polymarketMarkets,
  },
  polymarket_orderbook: {
    category: "defi",
    load: async () => (await import("@/modules/ai/tools/polymarket-orderbook")).polymarketOrderbook,
  },
  polymarket_positions: {
    category: "defi",
    load: async () => (await import("@/modules/ai/tools/polymarket-positions")).polymarketPositions,
  },
  polymarket_trade: {
    category: "defi",
    load: async () => (await import("@/modules/ai/tools/polymarket-trade")).polymarketTrade,
  },
  polymarket_bridge: {
    category: "defi",
    load: async () => (await import("@/modules/ai/tools/polymarket-bridge")).polymarketBridge,
  },
};
