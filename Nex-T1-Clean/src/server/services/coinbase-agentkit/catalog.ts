import "server-only";

export type CoinbaseAgentKitDomain =
  | "wallet"
  | "defi"
  | "builder"
  | "identity"
  | "market";

export type CoinbaseAgentKitDomainCatalogSnapshot = {
  domain: CoinbaseAgentKitDomain;
  providerNames: string[];
  actionCount: number;
  representativeActions: string[];
};

export const COINBASE_AGENTKIT_ALLOWED_ACTIONS: Record<
  CoinbaseAgentKitDomain,
  readonly string[]
> = {
  wallet: [
    "WalletActionProvider_get_wallet_details",
    "WalletActionProvider_native_transfer",
    "ERC20ActionProvider_get_balance",
    "ERC20ActionProvider_transfer",
    "ERC20ActionProvider_approve",
    "ERC20ActionProvider_get_allowance",
    "ERC20ActionProvider_get_erc20_token_address",
    "WethActionProvider_wrap_eth",
    "WethActionProvider_unwrap_eth",
    "CdpEvmWalletActionProvider_list_spend_permissions",
    "CdpEvmWalletActionProvider_get_swap_price",
    "CdpEvmWalletActionProvider_swap",
  ],
  defi: [
    "CompoundActionProvider_supply",
    "CompoundActionProvider_withdraw",
    "CompoundActionProvider_borrow",
    "CompoundActionProvider_repay",
    "CompoundActionProvider_get_portfolio",
    "MorphoActionProvider_deposit",
    "MorphoActionProvider_withdraw",
  ],
  builder: [
    "Erc721ActionProvider_mint",
    "WowActionProvider_create_token",
    "WowActionProvider_buy_token",
    "WowActionProvider_sell_token",
    "ClankerActionProvider_clank_token",
    "FlaunchActionProvider_flaunch",
    "FlaunchActionProvider_buyCoinWithETHInput",
    "FlaunchActionProvider_buyCoinWithCoinInput",
    "FlaunchActionProvider_sellCoin",
  ],
  identity: ["BasenameActionProvider_register_basename"],
  market: [
    "PythActionProvider_fetch_price_feed",
    "PythActionProvider_fetch_price",
  ],
} as const;

export const COINBASE_AGENTKIT_REPRESENTATIVE_ACTIONS: Record<
  CoinbaseAgentKitDomain,
  readonly string[]
> = {
  wallet: [
    "WalletActionProvider_get_wallet_details",
    "WalletActionProvider_native_transfer",
    "ERC20ActionProvider_transfer",
    "CdpEvmWalletActionProvider_list_spend_permissions",
    "WethActionProvider_wrap_eth",
    "CdpEvmWalletActionProvider_swap",
  ],
  defi: [
    "CompoundActionProvider_supply",
    "CompoundActionProvider_withdraw",
    "CompoundActionProvider_borrow",
    "MorphoActionProvider_deposit",
  ],
  builder: [
    "Erc721ActionProvider_mint",
    "WowActionProvider_create_token",
    "ClankerActionProvider_clank_token",
    "FlaunchActionProvider_flaunch",
  ],
  identity: ["BasenameActionProvider_register_basename"],
  market: [
    "PythActionProvider_fetch_price_feed",
    "PythActionProvider_fetch_price",
  ],
} as const;

const DOMAIN_PROVIDER_NAMES: Record<CoinbaseAgentKitDomain, string[]> = {
  wallet: ["wallet", "erc20", "weth", "cdp_evm_wallet"],
  defi: ["compound", "morpho"],
  builder: ["erc721", "wow", "clanker", "flaunch"],
  identity: ["basename"],
  market: ["pyth"],
};

export function getStaticCoinbaseAgentKitDomainCatalog(): CoinbaseAgentKitDomainCatalogSnapshot[] {
  return (
    Object.keys(COINBASE_AGENTKIT_ALLOWED_ACTIONS) as CoinbaseAgentKitDomain[]
  ).map((domain) => ({
    domain,
    providerNames: [...DOMAIN_PROVIDER_NAMES[domain]],
    actionCount: COINBASE_AGENTKIT_ALLOWED_ACTIONS[domain].length,
    representativeActions: [...COINBASE_AGENTKIT_REPRESENTATIVE_ACTIONS[domain]],
  }));
}
