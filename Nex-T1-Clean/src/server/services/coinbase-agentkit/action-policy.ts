import "server-only";

import type { AutonomousAction } from "@/lib/approvals/state-machine";

import type { CoinbaseAgentKitDomain } from "./catalog";

export type CoinbaseAgentKitActionPolicy = {
  actionName: string;
  domain: CoinbaseAgentKitDomain;
  classification: "read" | "write";
  requiresApproval: boolean;
  requiresWallet: boolean;
  autonomousAction?: AutonomousAction;
  autonomousAllowed: boolean;
};

const READ_ACTIONS = new Set([
  "WalletActionProvider_get_wallet_details",
  "ERC20ActionProvider_get_balance",
  "ERC20ActionProvider_get_allowance",
  "ERC20ActionProvider_get_erc20_token_address",
  "CdpEvmWalletActionProvider_list_spend_permissions",
  "CompoundActionProvider_get_portfolio",
  "CdpEvmWalletActionProvider_get_swap_price",
  "PythActionProvider_fetch_price",
  "PythActionProvider_fetch_price_feed",
]);

const AUTONOMOUS_ALLOW_ACTIONS = new Set([
  "WethActionProvider_wrap_eth",
  "WethActionProvider_unwrap_eth",
  "CdpEvmWalletActionProvider_swap",
  "CompoundActionProvider_supply",
  "CompoundActionProvider_withdraw",
  "CompoundActionProvider_borrow",
  "CompoundActionProvider_repay",
  "MorphoActionProvider_deposit",
  "MorphoActionProvider_withdraw",
]);

function normalizeActionName(actionName: string): string {
  return actionName.trim();
}

function inferAutonomousAction(actionName: string): AutonomousAction | undefined {
  if (actionName.includes("swap") || actionName.includes("buy_")) {
    return "buy";
  }

  if (actionName.includes("sell") || actionName.includes("unwrap")) {
    return "sell";
  }

  if (
    actionName.includes("supply") ||
    actionName.includes("deposit") ||
    actionName.includes("withdraw") ||
    actionName.includes("borrow") ||
    actionName.includes("repay") ||
    actionName.includes("wrap")
  ) {
    return "stake";
  }

  return undefined;
}

export function classifyCoinbaseAgentKitAction(
  domain: CoinbaseAgentKitDomain,
  actionName: string,
): CoinbaseAgentKitActionPolicy {
  const normalized = normalizeActionName(actionName);
  const classification = READ_ACTIONS.has(normalized) ? "read" : "write";
  const autonomousAction = inferAutonomousAction(normalized.toLowerCase());

  return {
    actionName: normalized,
    domain,
    classification,
    requiresApproval: classification === "write",
    requiresWallet: true,
    autonomousAction,
    autonomousAllowed: AUTONOMOUS_ALLOW_ACTIONS.has(normalized),
  };
}
