import "server-only";

export type SolanaAgentKitDomain = "token" | "nft" | "defi" | "misc" | "blinks";

export type SolanaAgentKitDomainCatalogSnapshot = {
  domain: SolanaAgentKitDomain;
  pluginName: string;
  actionCount: number;
  representativeActions: string[];
};

export const SOLANA_AGENTKIT_PLUGIN_MODULE_IDS: Record<SolanaAgentKitDomain, string> = {
  token: "@solana-agent-kit/plugin-token",
  nft: "@solana-agent-kit/plugin-nft",
  defi: "@solana-agent-kit/plugin-defi",
  misc: "@solana-agent-kit/plugin-misc",
  blinks: "@solana-agent-kit/plugin-blinks",
};

export const SOLANA_AGENTKIT_REPRESENTATIVE_ACTIONS: Record<
  SolanaAgentKitDomain,
  string[]
> = {
  token: [
    "GET_TOKEN_DATA",
    "FETCH_PRICE",
    "TRANSFER",
    "SWAP",
    "TRADE",
    "STAKE_WITH_JUPITER",
    "COMPRESSED_AIRDROP",
    "LAUNCH_PUMPFUN_TOKEN",
  ],
  nft: [
    "DEPLOY_COLLECTION",
    "DEPLOY_TOKEN",
    "MINT_NFT",
    "LIST_NFT_FOR_SALE",
    "CREATE_3LAND_COLLECTIBLE",
    "LIST_MAGICEDEN_NFT",
  ],
  defi: [
    "LULO_LEND",
    "OPEN_PERP_TRADE_LONG",
    "CREATE_METEORA_DLMM_POOL",
    "RAYDIUM_CREATE_CPMM",
    "CREATE_ORCA_SINGLE_SIDED_WHIRLPOOL",
    "DEBRIDGE_CREATE_BRIDGE_ORDER",
  ],
  misc: [
    "RESOLVE_SOL_DOMAIN",
    "REGISTER_DOMAIN",
    "GET_COINGECKO_TOKEN_INFO_ACTION",
    "GET_COINGECKO_TOP_GAINERS",
    "CREATE_GIBWORK_TASK",
    "CREATE_MULTISIG_ACTION",
  ],
  blinks: ["PLAY_ROCK_PAPER_SCISSORS"],
};

const DOMAIN_DISPLAY_NAMES: Record<SolanaAgentKitDomain, string> = {
  token: "Token plugin",
  nft: "NFT plugin",
  defi: "DeFi plugin",
  misc: "Misc plugin",
  blinks: "Blinks plugin",
};

const DOMAIN_ACTION_COUNTS: Record<SolanaAgentKitDomain, number> = {
  token: 8,
  nft: 6,
  defi: 6,
  misc: 6,
  blinks: 1,
};

export function getStaticSolanaAgentKitDomainCatalog(): SolanaAgentKitDomainCatalogSnapshot[] {
  return (Object.keys(SOLANA_AGENTKIT_PLUGIN_MODULE_IDS) as SolanaAgentKitDomain[]).map(
    (domain) => ({
      domain,
      pluginName: DOMAIN_DISPLAY_NAMES[domain],
      actionCount: DOMAIN_ACTION_COUNTS[domain],
      representativeActions: [...SOLANA_AGENTKIT_REPRESENTATIVE_ACTIONS[domain]],
    }),
  );
}
