import type { ToolCategory } from "./tool-registry.types";
import { isToolBlocked } from "@/modules/ai/tool-risk-registry";

const TOOL_CATEGORY_ORDER: ToolCategory[] = [
  "search",
  "ai",
  "wallet",
  "defi",
  "market",
  "onchain",
  "solana",
  "bitcoin",
  "browser",
  "optional",
];

const CATEGORY_TOOL_IDS: Record<ToolCategory, readonly string[]> = {
  search: ["aws_docs_search", "cloud_run_docs_search", "exa_web_search", "openai_web_search"],
  ai: [
    "agent_memory", "dao_directory_search", "dao_get_overview", "dao_get_proposals",
    "e2b_call_mcp_tool", "e2b_code_interpreter", "e2b_get_preview_url", "e2b_install_mcp_bridge",
    "e2b_list_dir", "e2b_list_mcp_tools", "e2b_npm_install", "e2b_npm_run", "e2b_read_file",
    "e2b_start_mcp_server", "e2b_write_file", "emit_artifact", "graph_knowledge",
    "openai_code_interpreter", "openai_file_search", "openai_image", "openai_mcp",
    "start_durable_workflow", "updateWorkingMemory", "working_memory_todos",
  ],
  wallet: [
    "agent_wallet_list", "audit_contract", "cdp_batch_operations", "cdp_commerce", "cdp_policy",
    "cdp_spend_permission", "cdp_stake", "cdp_staking_positions", "cdp_unstake", "cdp_usdc_rewards",
    "cdp_wallet_balance", "cdp_wallet_send", "cdp_wallet_swap", "coinbase_agentkit_builder",
    "coinbase_agentkit_defi", "coinbase_agentkit_identity", "coinbase_agentkit_market",
    "coinbase_agentkit_wallet", "cryptowallet_evm", "dao_create", "dao_create_treasury_action",
    "dao_draft_proposal", "dao_execute_treasury_action", "dao_import", "dao_manage_members",
    "dao_submit_proposal", "dao_sync", "dao_update_capabilities", "dao_vote", "evm_wallet",
    "evm_wallet_send_asset",
    "governance_inspector", "help_create_wallet", "safe_allowance", "simulate_transaction",
    "token_minter", "wallet_get_history", "wallet_get_holdings", "wallet_get_net_worth",
    "wallet_get_nfts", "wallet_get_pnl", "wallet_get_transfers",
  ],
  defi: [
    "cow_swap_execute", "cow_swap_quote", "cow_swap_status", "defi_llama", "dexscreener",
    "polymarket_bridge", "polymarket_markets", "polymarket_orderbook", "polymarket_positions",
    "polymarket_trade", "trading_cancel_order", "trading_execute_order", "trading_fetch_balance",
    "trading_open_orders", "uniswap_create_lp", "uniswap_get_quote", "uniswap_poolspy",
  ],
  market: [
    "binance_market_data", "ccxt", "coingecko_trending", "crypto_sentiment", "cryptorank",
    "market_filtered_tokens", "market_gainers", "market_intelligence", "market_losers",
    "market_price_chart", "market_search", "market_snapshot", "market_token_data",
    "market_token_prices", "market_trending", "market_volume_chart", "thegraph_token_balances",
    "thegraph_token_metadata", "thegraph_token_transfers",
  ],
  onchain: [
    "alchemy_sdk", "blocknative_gas", "bsc_chain", "chainlink_feeds", "etherscan",
    "thegraph_get_schema", "thegraph_query_subgraph",
  ],
  solana: [
    "helius_solana", "pumpfun_bonding_status", "pumpfun_bonding_tokens", "pumpfun_chat",
    "pumpfun_data", "pumpfun_graduated_tokens", "pumpfun_market", "pumpfun_metadata",
    "pumpfun_new_tokens", "pumpfun_pairs", "pumpfun_prices", "pumpfun_swaps", "pumpfun_trader",
    "sol_ohlcv_by_pair", "sol_pair_stats", "sol_pairs_by_token", "sol_token_prices_batch",
    "solana_agentkit_blinks", "solana_agentkit_defi", "solana_agentkit_misc",
    "solana_agentkit_nft", "solana_agentkit_token",
  ],
  bitcoin: ["bitcoin_network"],
  browser: ["browser_read_dom"],
  optional: ["bedrock_code_interpreter", "task_scheduler"],
};

const CDP_WALLET_TOOL_IDS = new Set([
  "cdp_batch_operations", "cdp_commerce", "cdp_policy", "cdp_spend_permission", "cdp_stake",
  "cdp_staking_positions", "cdp_unstake", "cdp_usdc_rewards", "cdp_wallet_balance",
  "cdp_wallet_send", "cdp_wallet_swap", "coinbase_agentkit_builder", "coinbase_agentkit_defi",
  "coinbase_agentkit_identity", "coinbase_agentkit_market", "coinbase_agentkit_wallet",
  "solana_agentkit_blinks", "solana_agentkit_defi", "solana_agentkit_misc",
  "solana_agentkit_nft", "solana_agentkit_token",
]);

const TOOL_CATEGORY_BY_ID = Object.fromEntries(
  TOOL_CATEGORY_ORDER.flatMap((category) =>
    CATEGORY_TOOL_IDS[category].map((toolId) => [toolId, category] as const),
  ),
) as Record<string, ToolCategory>;

const envTrue = (value: string | undefined): boolean =>
  typeof value === "string" && ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());

export const getCatalogToolIds = (): string[] =>
  TOOL_CATEGORY_ORDER.flatMap((category) => [...CATEGORY_TOOL_IDS[category]]);

export const getCatalogToolCategories = (): ToolCategory[] => [...TOOL_CATEGORY_ORDER];

export const getCatalogToolCategory = (toolId: string): ToolCategory =>
  TOOL_CATEGORY_BY_ID[toolId] ?? "optional";

export const isCatalogToolEnabled = (toolId: string): boolean => {
  if (isToolBlocked(toolId)) {
    return false;
  }

  if (toolId === "updateWorkingMemory") {
    return envTrue(process.env.AI_SDK_V6_MEMORY_ADAPTER_ENABLED ?? "true");
  }

  if (toolId === "bedrock_code_interpreter") {
    return Boolean(process.env.BEDROCK_AGENT_ID && process.env.BEDROCK_AGENT_ALIAS_ID);
  }

  if (toolId === "exa_web_search") {
    return Boolean(process.env.EXA_API_KEY);
  }

  if (CDP_WALLET_TOOL_IDS.has(toolId)) {
    return process.env.NEXT_PUBLIC_ENABLE_CDP_WALLETS === "true";
  }

  return true;
};
