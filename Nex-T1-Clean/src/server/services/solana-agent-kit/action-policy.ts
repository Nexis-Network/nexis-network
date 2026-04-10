import "server-only";

import type { AutonomousAction } from "@/lib/approvals/state-machine";

import type { SolanaAgentKitDomain } from "./plugin-registry";

export type SolanaAgentKitActionPolicy = {
  actionName: string;
  domain: SolanaAgentKitDomain;
  classification: "read" | "write";
  requiresApproval: boolean;
  requiresWallet: boolean;
  autonomousAction?: AutonomousAction;
};

const READ_ACTION_EXACT = new Set([
  "BALANCE_ACTION",
  "TOKEN_BALANCE_ACTION",
  "FETCH_PRICE",
  "FETCH_ASSETS_BY_OWNER",
  "GET_ASSET",
  "GET_ALL_REGISTERED_ALL_DOMAINS",
  "GET_ALL_TLDS",
  "GET_COINGECKO_LATEST_POOLS",
  "GET_COINGECKO_TOKEN_INFO_ACTION",
  "GET_COINGECKO_TOKEN_PRICE_DATA_ACTION",
  "GET_COINGECKO_TOP_GAINERS",
  "GET_COINGECKO_TRENDING_POOLS_ACTION",
  "GET_COINGECKO_TRENDING_TOKENS_ACTION",
  "GET_HELIOUS_WEBHOOK",
  "GET_LIMIT_ORDER_HISTORY",
  "GET_MAGICEDEN_COLLECTION_LISTINGS",
  "GET_MAGICEDEN_COLLECTION_STATS",
  "GET_MAIN_ALL_DOMAINS_DOMAIN",
  "GET_OPEN_LIMIT_ORDERS",
  "GET_OWNED_ALL_DOMAINS",
  "GET_OWNED_DOMAINS_FOR_TLD",
  "GET_POPULAR_MAGICEDEN_COLLECTIONS",
  "GET_PRIMARY_DOMAIN",
  "GET_SANCTUM_APY",
  "GET_SANCTUM_PRICE",
  "GET_SANCTUM_TVL",
  "GET_SANCTUM_OWNED_LST",
  "GET_TOKEN_DATA",
  "GET_TOKEN_DATA_OR_INFO_BY_TICKER_OR_SYMBOL",
  "GET_TPS",
  "GET_VOLTR_POSITION_VALUES",
  "OSEC_DECODE_VERIFICATION_PDA_DATA",
  "OSEC_GET_PROGRAM_BUILD_LOG",
  "OSEC_GET_PROGRAM_VERIFICATION_STATUS",
  "PARSE_ACCOUNT",
  "PARSE_INSTRUCTION",
  "PARSE_SOLANA_TRANSACTION",
  "PYTH_FETCH_PRICE",
  "RESOLVE_ALL_DOMAINS",
  "RESOLVE_SOL_DOMAIN",
  "RUGCHECK",
  "SEARCH_ASSETS",
  "SWITCHBOARD_SIMULATE_FEED",
  "WALLET_ADDRESS",
  "AVAILABLE_DRIFT_MARKETS",
  "DEBRIDGE_CHECK_TRANSACTION_STATUS",
  "DEBRIDGE_GET_SUPPORTED_CHAINS",
  "DEBRIDGE_GET_TOKENS_INFO",
  "DERIVE_DRIFT_VAULT_ADDRESS_ACTION",
  "DOES_USER_HAVE_DRIFT_ACCOUNT",
  "DRIFT_GET_ENTRY_QUOTE_OF_PERP_TRADE_ACTION",
  "DRIFT_GET_LEND_AND_BORROW_APY_ACTION",
  "DRIFT_PERP_MARKET_FUNDING_RATE_ACTION",
  "DRIFT_USER_ACCOUNT_INFO",
  "DRIFT_VAULT_INFO",
  "ELFA_API_KEY_STATUS_ACTION",
  "ELFA_GET_SMART_MENTIONS_ACTION",
  "ELFA_GET_TOP_MENTIONS_BY_TICKER_ACTION",
  "ELFA_PING_ACTION",
  "ELFA_SEARCH_MENTIONS_BY_KEYWORDS_ACTION",
  "ELFA_SMART_TWITTER_ACCOUNT_STATS_ACTION",
  "ELFA_TRENDING_TOKENS_ACTION",
  "GET_ASSETS_BY_AUTHORITY",
  "GET_ASSETS_BY_CREATOR",
  "GET_MESSARI_AI",
]);

const READ_PREFIXES = [
  "GET_",
  "FETCH_",
  "SEARCH_",
  "RESOLVE_",
  "PARSE_",
  "AVAILABLE_",
];

const WRITE_PREFIXES = [
  "APPROVE_",
  "BID_",
  "CANCEL_",
  "CLOSE_",
  "CLAIM_",
  "COMPRESSED_",
  "CREATE_",
  "DEPOSIT_",
  "DEPLOY_",
  "EXECUTE_",
  "FLASH_",
  "LAUNCH_",
  "LEND_",
  "LIST_",
  "LULO_",
  "MINT_",
  "OPEN_",
  "PLACE_",
  "PLAY_",
  "RAYDIUM_",
  "REGISTER_",
  "REQUEST_",
  "SANCTUM_",
  "SOLUTIOFI_",
  "STAKE_",
  "SWAP",
  "TRADE",
  "TRANSFER",
  "UNSTAKE_",
  "UPDATE_",
  "WITHDRAW_",
];

function normalizeActionName(actionName: string): string {
  return actionName.trim().toUpperCase();
}

function isReadAction(actionName: string): boolean {
  const normalized = normalizeActionName(actionName);
  if (READ_ACTION_EXACT.has(normalized)) {
    return true;
  }

  return READ_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function isWriteAction(actionName: string): boolean {
  const normalized = normalizeActionName(actionName);
  return WRITE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(prefix),
  );
}

function inferAutonomousAction(actionName: string): AutonomousAction | undefined {
  const normalized = normalizeActionName(actionName);

  if (normalized.includes("BRIDGE") || normalized.includes("DEBRIDGE")) {
    return "bridge";
  }

  if (
    normalized.includes("DEPLOY") ||
    normalized.includes("LAUNCH") ||
    normalized.includes("CREATE_3LAND") ||
    normalized.includes("REGISTER_DOMAIN")
  ) {
    return "deploy";
  }

  if (
    normalized.includes("STAKE") ||
    normalized.includes("LEND") ||
    normalized.includes("WITHDRAW")
  ) {
    return "stake";
  }

  if (
    normalized.includes("SELL") ||
    normalized.includes("CLOSE_PERP") ||
    normalized.includes("REMOVE_LIQUIDITY")
  ) {
    return "sell";
  }

  if (
    normalized.includes("BUY") ||
    normalized.includes("TRADE") ||
    normalized.includes("SWAP") ||
    normalized.includes("BID") ||
    normalized.includes("OPEN_PERP")
  ) {
    return "buy";
  }

  return undefined;
}

function inferRequiresWallet(classification: "read" | "write", actionName: string): boolean {
  if (classification === "write") {
    return true;
  }

  const normalized = normalizeActionName(actionName);
  return normalized === "BALANCE_ACTION" || normalized === "TOKEN_BALANCE_ACTION" || normalized === "WALLET_ADDRESS";
}

export function classifySolanaAgentKitAction(
  domain: SolanaAgentKitDomain,
  actionName: string,
): SolanaAgentKitActionPolicy {
  const normalized = normalizeActionName(actionName);
  const classification = isReadAction(normalized) && !isWriteAction(normalized) ? "read" : "write";

  return {
    actionName: normalized,
    domain,
    classification,
    requiresApproval: classification === "write",
    requiresWallet: inferRequiresWallet(classification, normalized),
    autonomousAction: inferAutonomousAction(normalized),
  };
}
