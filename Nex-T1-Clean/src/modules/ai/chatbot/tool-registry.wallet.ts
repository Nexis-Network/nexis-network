import { cdpWalletsEnabled } from "./tool-registry.shared";
import type { ToolLoader } from "./tool-registry.types";

export const WALLET_TOOL_LOADERS: Record<string, ToolLoader> = {
  evm_wallet: {
    category: "wallet",
    load: async () => (await import("@/modules/ai/tools/evm-wallet-hitl")).evmWalletToolWithHITL,
  },
  evm_wallet_send_asset: {
    category: "wallet",
    load: async () => (await import("@/modules/ai/tools/evm-wallet-send-asset")).evmWalletSendAssetTool,
  },
  cryptowallet_evm: {
    category: "wallet",
    load: async () => (await import("@/modules/ai/tools/evm-wallet-hitl")).evmWalletToolWithHITL,
  },
  simulate_transaction: {
    category: "wallet",
    load: async () => (await import("@/modules/ai/tools/simulate-transaction")).simulateTransactionTool,
  },
  audit_contract: {
    category: "wallet",
    load: async () => (await import("@/modules/ai/tools/audit-contract")).auditContractTool,
  },
  governance_inspector: {
    category: "wallet",
    load: async () => (await import("@/modules/ai/tools/governance-inspector")).governanceInspectorTool,
  },
  token_minter: {
    category: "wallet",
    load: async () =>
      (await import("@/modules/ai/tools/token-minter-hitl")).tokenMinterToolWithHITL,
  },
  agent_wallet_list: {
    category: "wallet",
    load: async () => (await import("@/modules/ai/tools/agent-wallet-list")).agentWalletListTool,
  },
  wallet_get_holdings: {
    category: "wallet",
    load: async () => (await import("@/modules/ai/tools/moralis")).moralisWalletGetHoldingsTool,
  },
  wallet_get_history: {
    category: "wallet",
    load: async () => (await import("@/modules/ai/tools/moralis")).moralisWalletGetHistoryTool,
  },
  wallet_get_nfts: {
    category: "wallet",
    load: async () => (await import("@/modules/ai/tools/moralis")).moralisWalletGetNftsTool,
  },
  wallet_get_pnl: {
    category: "wallet",
    load: async () => (await import("@/modules/ai/tools/moralis")).moralisWalletGetPnlTool,
  },
  wallet_get_transfers: {
    category: "wallet",
    load: async () => (await import("@/modules/ai/tools/moralis")).moralisWalletGetTransfersTool,
  },
  wallet_get_net_worth: {
    category: "wallet",
    load: async () => (await import("@/modules/ai/tools/moralis")).moralisWalletGetNetWorthTool,
  },
  safe_allowance: {
    category: "wallet",
    load: async () => (await import("@/modules/ai/tools/safe-allowance")).safeAllowanceTool,
  },
  cdp_spend_permission: {
    category: "wallet",
    enabled: cdpWalletsEnabled,
    load: async () => (await import("@/modules/ai/tools/cdp-spend-permission")).cdpSpendPermissionTool,
  },
  cdp_wallet_send: {
    category: "wallet",
    enabled: cdpWalletsEnabled,
    load: async () => (await import("@/modules/ai/tools/cdp-wallet-send")).cdpWalletSendTool,
  },
  cdp_wallet_balance: {
    category: "wallet",
    enabled: cdpWalletsEnabled,
    load: async () => (await import("@/modules/ai/tools/cdp-wallet-balance")).cdpWalletBalanceTool,
  },
  cdp_wallet_swap: {
    category: "wallet",
    enabled: cdpWalletsEnabled,
    load: async () => (await import("@/modules/ai/tools/cdp-wallet-swap")).cdpWalletSwapTool,
  },
  coinbase_agentkit_wallet: {
    category: "wallet",
    enabled: cdpWalletsEnabled,
    load: async () =>
      (await import("@/modules/ai/tools/coinbase-agentkit")).coinbaseAgentKitWalletTool,
  },
  coinbase_agentkit_defi: {
    category: "wallet",
    enabled: cdpWalletsEnabled,
    load: async () =>
      (await import("@/modules/ai/tools/coinbase-agentkit")).coinbaseAgentKitDefiTool,
  },
  coinbase_agentkit_builder: {
    category: "wallet",
    enabled: cdpWalletsEnabled,
    load: async () =>
      (await import("@/modules/ai/tools/coinbase-agentkit")).coinbaseAgentKitBuilderTool,
  },
  coinbase_agentkit_identity: {
    category: "wallet",
    enabled: cdpWalletsEnabled,
    load: async () =>
      (await import("@/modules/ai/tools/coinbase-agentkit")).coinbaseAgentKitIdentityTool,
  },
  coinbase_agentkit_market: {
    category: "wallet",
    enabled: cdpWalletsEnabled,
    load: async () =>
      (await import("@/modules/ai/tools/coinbase-agentkit")).coinbaseAgentKitMarketTool,
  },
  cdp_policy: {
    category: "wallet",
    enabled: cdpWalletsEnabled,
    load: async () => (await import("@/modules/ai/tools/cdp-policy")).cdpPolicyTool,
  },
  cdp_stake: {
    category: "wallet",
    enabled: cdpWalletsEnabled,
    load: async () => (await import("@/modules/ai/tools/cdp-staking")).cdpStakeTool,
  },
  cdp_unstake: {
    category: "wallet",
    enabled: cdpWalletsEnabled,
    load: async () => (await import("@/modules/ai/tools/cdp-staking")).cdpUnstakeTool,
  },
  cdp_staking_positions: {
    category: "wallet",
    enabled: cdpWalletsEnabled,
    load: async () => (await import("@/modules/ai/tools/cdp-staking")).cdpStakingPositionsTool,
  },
  cdp_commerce: {
    category: "wallet",
    enabled: cdpWalletsEnabled,
    load: async () => (await import("@/modules/ai/tools/cdp-commerce")).cdpCommerceTool,
  },
  cdp_usdc_rewards: {
    category: "wallet",
    enabled: cdpWalletsEnabled,
    load: async () => (await import("@/modules/ai/tools/cdp-usdc-rewards")).cdpUsdcRewardsTool,
  },
  cdp_batch_operations: {
    category: "wallet",
    enabled: cdpWalletsEnabled,
    load: async () => (await import("@/modules/ai/tools/cdp-batch-operations")).cdpBatchOperationsTool,
  },
  help_create_wallet: {
    category: "wallet",
    load: async () => (await import("@/modules/ai/tools/help-create-wallet")).helpCreateWalletTool,
  },
  dao_create: {
    category: "wallet",
    load: async () => (await import("@/modules/ai/tools/dao-management")).daoCreateTool,
  },
  dao_import: {
    category: "wallet",
    load: async () => (await import("@/modules/ai/tools/dao-management")).daoImportTool,
  },
  dao_draft_proposal: {
    category: "wallet",
    load: async () => (await import("@/modules/ai/tools/dao-management")).daoDraftProposalTool,
  },
  dao_submit_proposal: {
    category: "wallet",
    load: async () => (await import("@/modules/ai/tools/dao-management")).daoSubmitProposalTool,
  },
  dao_vote: {
    category: "wallet",
    load: async () => (await import("@/modules/ai/tools/dao-management")).daoVoteTool,
  },
  dao_create_treasury_action: {
    category: "wallet",
    load: async () =>
      (await import("@/modules/ai/tools/dao-management")).daoCreateTreasuryActionTool,
  },
  dao_execute_treasury_action: {
    category: "wallet",
    load: async () =>
      (await import("@/modules/ai/tools/dao-management")).daoExecuteTreasuryActionTool,
  },
  dao_manage_members: {
    category: "wallet",
    load: async () => (await import("@/modules/ai/tools/dao-management")).daoManageMembersTool,
  },
  dao_update_capabilities: {
    category: "wallet",
    load: async () =>
      (await import("@/modules/ai/tools/dao-management")).daoUpdateCapabilitiesTool,
  },
  dao_sync: {
    category: "wallet",
    load: async () => (await import("@/modules/ai/tools/dao-management")).daoSyncTool,
  },
};
