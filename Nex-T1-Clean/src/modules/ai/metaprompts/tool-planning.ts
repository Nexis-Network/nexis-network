import type { IntentCategory } from "@/modules/chat/intent-classifier";

export { TOOL_PLANNING_SPEC } from "./tool-planning-spec";

export type ToolPlanningMode = "fast" | "standard" | "deep";

/**
 * Maps intent to tool planning mode
 */
export function getToolPlanningMode(category: IntentCategory): ToolPlanningMode {
  const fastPathCategories: IntentCategory[] = [
    "greeting",
    "price_check",
    "balance_check",
    "wallet_create",
    "trending",
  ];

  const deepPathCategories: IntentCategory[] = [
    "research",
    "analysis",
    "complex_task",
  ];

  if (fastPathCategories.includes(category)) return "fast";
  if (deepPathCategories.includes(category)) return "deep";
  return "standard";
}

/**
 * Generates a tool planning hint based on intent
 */
export function buildToolPlanningHint(
  category: IntentCategory,
  suggestedTools: string[]
): string {
  const mode = getToolPlanningMode(category);

  if (mode === "fast") {
    return suggestedTools.length > 0
      ? `TOOL PATH: Fast. Execute ${suggestedTools[0]} immediately.`
      : "TOOL PATH: Fast. Direct response, no tool needed.";
  }

  if (mode === "deep") {
    return `TOOL PATH: Deep. Plan sequence: ${suggestedTools.slice(0, 3).join(" → ")}. Validate each step.`;
  }

  return suggestedTools.length > 0
    ? `TOOL PATH: Standard. Primary: ${suggestedTools[0]}. Fallback: ${suggestedTools[1] ?? "none"}.`
    : "TOOL PATH: Standard. Evaluate available tools for best match.";
}

/**
 * Tool categories for quick reference in prompts
 */
export const TOOL_CATEGORIES = {
  wallet: [
    "evm_wallet",
    "evm_wallet_send_asset",
    "cryptowallet_evm",
    "agent_wallet_list",
    "token_minter",
    "bitcoin_network",
    "wallet_get_holdings",
    "wallet_get_history",
    "wallet_get_nfts",
    "wallet_get_pnl",
    "wallet_get_transfers",
    "wallet_get_net_worth",
    "task_scheduler",
    "governance_inspector",
    "audit_contract",
    "safe_allowance",
    "help_create_wallet",
  ],
  defi: [
    "dexscreener",
    "uniswap_poolspy",
    "defi_llama",
  ],
  market: [
    "coingecko_trending",
    "binance_market_data",
    "ccxt",
    "cryptorank",
    "market_intelligence",
    "crypto_sentiment",
    "market_trending",
    "market_gainers",
    "market_losers",
    "market_filtered_tokens",
    "thegraph_token_metadata",
    "thegraph_token_balances",
    "thegraph_token_balances",
    "thegraph_token_transfers",
    "market_price_chart",
    "market_volume_chart",
  ],
  onchain: [
    "chainlink_feeds",
    "etherscan",
    "alchemy_sdk",
    "bsc_chain",
    "blocknative_gas",
    "thegraph_get_schema",
    "thegraph_query_subgraph",
    "simulate_transaction",
  ],
  research: [
    "exa_web_search",
    "openai_web_search",
    "openai_file_search",
    "openai_code_interpreter",
    "openai_image_generation",
    "e2b_code_interpreter",
    "e2b_write_file",
    "e2b_read_file",
  ],
  solana: [
    "helius_solana",
    "pumpfun_trader",
    "pumpfun_data",
    "pumpfun_chat",
    "pumpfun_new_tokens",
    "pumpfun_pairs",
    "pumpfun_prices",
    "pumpfun_metadata",
    "pumpfun_bonding_tokens",
    "pumpfun_graduated_tokens",
    "pumpfun_bonding_status",
    "pumpfun_swaps",
    "sol_pairs_by_token",
    "sol_pair_stats",
    "sol_ohlcv_by_pair",
    "sol_token_prices_batch",
  ],
  mcp: [
    "mcp_thegraph__getSubgraphSchema",
    "mcp_thegraph__querySubgraph",
    "mcp_nex__wormhole_supported_routes",
    "mcp_nex__wormhole_route_status",
    "mcp_nex__wormhole_bridge_token",
    "mcp_nex__wormhole_transfer_status",
  ],
} as const;

export type ToolCategory = keyof typeof TOOL_CATEGORIES;
