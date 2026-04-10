import { cdpWalletsEnabled } from "./tool-registry.shared";
import type { ToolLoader } from "./tool-registry.types";

export const SOLANA_TOOL_LOADERS: Record<string, ToolLoader> = {
  helius_solana: {
    category: "solana",
    load: async () => (await import("@/modules/ai/tools/helius")).heliusTool,
  },
  pumpfun_trader: {
    category: "solana",
    load: async () => (await import("@/modules/ai/tools/pumpfun-trader")).pumpFunTraderTool,
  },
  pumpfun_market: {
    category: "solana",
    load: async () => (await import("@/modules/ai/tools/pumpfun-market")).pumpfunMarketTool,
  },
  pumpfun_data: {
    category: "solana",
    load: async () => (await import("@/modules/ai/tools/pumpfun-data")).pumpFunDataTool,
  },
  pumpfun_chat: {
    category: "solana",
    load: async () => (await import("@/modules/ai/tools/pumpfun-chat")).pumpFunChatTool,
  },
  pumpfun_new_tokens: {
    category: "solana",
    load: async () => (await import("@/modules/ai/tools/moralis")).moralisPumpfunNewTokensTool,
  },
  pumpfun_pairs: {
    category: "solana",
    load: async () => (await import("@/modules/ai/tools/moralis")).moralisPumpfunPairsTool,
  },
  pumpfun_prices: {
    category: "solana",
    load: async () => (await import("@/modules/ai/tools/moralis")).moralisPumpfunPricesTool,
  },
  pumpfun_metadata: {
    category: "solana",
    load: async () => (await import("@/modules/ai/tools/moralis")).moralisPumpfunMetadataTool,
  },
  pumpfun_bonding_tokens: {
    category: "solana",
    load: async () =>
      (await import("@/modules/ai/tools/moralis")).moralisPumpfunBondingTokensTool,
  },
  pumpfun_graduated_tokens: {
    category: "solana",
    load: async () =>
      (await import("@/modules/ai/tools/moralis")).moralisPumpfunGraduatedTokensTool,
  },
  pumpfun_bonding_status: {
    category: "solana",
    load: async () =>
      (await import("@/modules/ai/tools/moralis")).moralisPumpfunBondingStatusTool,
  },
  pumpfun_swaps: {
    category: "solana",
    load: async () => (await import("@/modules/ai/tools/moralis")).moralisPumpfunSwapsTool,
  },
  sol_pairs_by_token: {
    category: "solana",
    load: async () => (await import("@/modules/ai/tools/moralis")).moralisSolPairsByTokenTool,
  },
  sol_pair_stats: {
    category: "solana",
    load: async () => (await import("@/modules/ai/tools/moralis")).moralisSolPairStatsTool,
  },
  sol_ohlcv_by_pair: {
    category: "solana",
    load: async () => (await import("@/modules/ai/tools/moralis")).moralisSolOhlcvByPairTool,
  },
  sol_token_prices_batch: {
    category: "solana",
    load: async () => (await import("@/modules/ai/tools/moralis")).moralisSolTokenPricesBatchTool,
  },
  solana_agentkit_token: {
    category: "solana",
    enabled: cdpWalletsEnabled,
    load: async () => (await import("@/modules/ai/tools/solana-agentkit")).solanaAgentKitTokenTool,
  },
  solana_agentkit_nft: {
    category: "solana",
    enabled: cdpWalletsEnabled,
    load: async () => (await import("@/modules/ai/tools/solana-agentkit")).solanaAgentKitNftTool,
  },
  solana_agentkit_defi: {
    category: "solana",
    enabled: cdpWalletsEnabled,
    load: async () => (await import("@/modules/ai/tools/solana-agentkit")).solanaAgentKitDefiTool,
  },
  solana_agentkit_misc: {
    category: "solana",
    enabled: cdpWalletsEnabled,
    load: async () => (await import("@/modules/ai/tools/solana-agentkit")).solanaAgentKitMiscTool,
  },
  solana_agentkit_blinks: {
    category: "solana",
    enabled: cdpWalletsEnabled,
    load: async () => (await import("@/modules/ai/tools/solana-agentkit")).solanaAgentKitBlinksTool,
  },
};
