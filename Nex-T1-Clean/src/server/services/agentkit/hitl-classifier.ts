/**
 * AgentKit HITL (Human-in-the-Loop) Action Classifier
 *
 * Classifies AgentKit actions as "read" (no approval needed) or "write"
 * (requires human approval before execution) based on action name patterns.
 *
 * This ensures value-moving operations always go through our approval
 * state machine, even when executed via AgentKit.
 */

/** Actions that move value or modify on-chain state — require HITL approval */
const WRITE_ACTION_PATTERNS: ReadonlySet<string> = new Set([
  // Wallet operations
  "native_transfer",
  "transfer",
  "approve",

  // Swaps
  "swap",
  "get_swap_price",

  // Wrapping
  "wrap_eth",
  "unwrap_eth",

  // Bridging
  "bridge_token",

  // Lending (Compound)
  "supply",
  "borrow",
  "repay",
  "withdraw",

  // Vaults (Morpho)
  "deposit",

  // Staking
  "stake",
  "unstake",

  // Token creation
  "clank_token",
  "create_token",
  "buy_token",
  "sell_token",
  "flaunch",

  // NFT
  "mint",
  "list_nft",

  // Spend permissions
  "use_spend_permission",
  "revoke_base_account_spend_permission",
  "spend_from_base_account_permission",

  // DeFi routing
  "route",

  // Faucet (testnet only, still classify as write for safety)
  "request_faucet_funds",

  // Superfluid
  "create_stream",
  "update_stream",
  "delete_stream",
  "wrap_superfluid_token",

  // Onramp (URL generation is read-like but involves money)
  "get_onramp_buy_url",
]);

/** Actions that only read data — no approval needed */
const READ_ACTION_PATTERNS: ReadonlySet<string> = new Set([
  // Wallet
  "get_wallet_details",
  "get_balance",
  "get_allowance",
  "get_erc20_token_address",

  // Portfolio
  "get_portfolio",
  "get_nfts_by_account",

  // Spend permissions (read)
  "list_spend_permissions",
  "list_base_account_spend_permissions",

  // Price data
  "fetch_price",
  "fetch_price_feed_id",
  "get_token_prices",

  // Protocol data
  "find_protocol",
  "get_protocol",

  // Markets
  "get_active_markets",
  "get_market_details",

  // Social (read)
  "account_details",
  "account_mentions",

  // Vaults (read)
  "vaults",
  "vault_details",
  "vault_historical_data",
  "user_idle_assets",
  "positions",

  // Deposit status
  "check_deposit_status",

  // Research
  "research_question",

  // Token search
  "find-token",
  "quote",
]);

export type HitlClassification = "read" | "write";

/**
 * Classify an AgentKit action as read or write.
 * Unknown actions default to "write" (fail-safe: require approval).
 */
export function classifyAction(actionName: string): HitlClassification {
  if (READ_ACTION_PATTERNS.has(actionName)) return "read";
  if (WRITE_ACTION_PATTERNS.has(actionName)) return "write";

  // Fail-safe: unknown actions require approval
  return "write";
}

/**
 * Check if an action requires human-in-the-loop approval.
 */
export function requiresHitl(actionName: string): boolean {
  return classifyAction(actionName) === "write";
}
