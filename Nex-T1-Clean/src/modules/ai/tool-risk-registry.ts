export type ToolRiskLevel =
  | "read_only"
  | "simulate_only"
  | "approval_required"
  | "blocked";

const DIRECT_RISK_BY_TOOL: Record<string, ToolRiskLevel> = {
  escalate_to_human: "read_only",
  openai_mcp: "blocked",
  e2b_start_mcp_server: "blocked",
  e2b_call_mcp_tool: "blocked",
  trading_execute_order: "blocked",
  trading_cancel_order: "blocked",
  polymarket_trade: "simulate_only",
  evm_wallet_send_asset: "approval_required",
  safe_allowance: "approval_required",
  token_minter: "approval_required",
  bitcoin_network: "approval_required",
  cdp_batch_operations: "approval_required",
  cdp_commerce: "approval_required",
  cdp_policy: "approval_required",
  cdp_spend_permission: "approval_required",
  cdp_stake: "approval_required",
  cdp_unstake: "approval_required",
  cdp_wallet_send: "approval_required",
  cdp_wallet_swap: "approval_required",
  coinbase_agentkit_builder: "approval_required",
  coinbase_agentkit_defi: "approval_required",
  coinbase_agentkit_identity: "approval_required",
  coinbase_agentkit_wallet: "approval_required",
  solana_agentkit_blinks: "approval_required",
  solana_agentkit_defi: "approval_required",
  solana_agentkit_misc: "approval_required",
  solana_agentkit_nft: "approval_required",
  solana_agentkit_token: "approval_required",
  cow_swap_execute: "approval_required",
  helius_execute_jupiter_swap: "approval_required",
  bsc_chain: "approval_required",
};

const PREFIX_RISK_RULES: Array<[prefix: string, risk: ToolRiskLevel]> = [
  ["cdp_", "approval_required"],
  ["coinbase_agentkit_", "approval_required"],
  ["solana_agentkit_", "approval_required"],
];

export function getToolRiskLevel(toolId: string): ToolRiskLevel {
  const normalizedToolId = toolId.trim();
  if (!normalizedToolId) {
    return "read_only";
  }

  const direct = DIRECT_RISK_BY_TOOL[normalizedToolId];
  if (direct) {
    return direct;
  }

  const matchedPrefix = PREFIX_RISK_RULES.find(([prefix]) =>
    normalizedToolId.startsWith(prefix),
  );
  if (matchedPrefix) {
    return matchedPrefix[1];
  }

  return "read_only";
}

export function isToolBlocked(toolId: string): boolean {
  return getToolRiskLevel(toolId) === "blocked";
}

export function isSimulateOnlyTool(toolId: string): boolean {
  return getToolRiskLevel(toolId) === "simulate_only";
}

export function isApprovalRequiredTool(toolId: string): boolean {
  return getToolRiskLevel(toolId) === "approval_required";
}

export function filterBlockedToolIds(toolIds: readonly string[]): string[] {
  return toolIds.filter((toolId) => !isToolBlocked(toolId));
}
