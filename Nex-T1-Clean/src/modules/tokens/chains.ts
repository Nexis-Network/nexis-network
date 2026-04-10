import type { ChainAssetInfo } from "@/modules/tokens/types";

export const NATIVE_TOKEN_ADDRESS = "native";
export const EVM_NATIVE_PROVIDER_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
export const SOLANA_CHAIN_ID = 999999;

const sharedGas = {
  marginBps: 2000,
  supportsEip1559: true,
  maxPriorityFeeGwei: 2,
  maxFeeGwei: 40,
} as const;

export const CHAIN_REGISTRY: Record<number, ChainAssetInfo> = {
  1: {
    chainId: 1,
    slug: "ethereum",
    name: "Ethereum",
    platform: "evm",
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
    explorerBaseUrl: "https://etherscan.io",
    averageBlockTimeMs: 12_000,
    pollingIntervalMs: 15_000,
    nativeSymbol: "ETH",
    wrappedNativeSymbol: "WETH",
    aliases: ["eth", "mainnet"],
    gasConfig: sharedGas,
    gasWarningThresholds: { mediumUsd: 8, highUsd: 25 },
  },
  10: {
    chainId: 10,
    slug: "optimism",
    name: "Optimism",
    platform: "evm",
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png",
    explorerBaseUrl: "https://optimistic.etherscan.io",
    averageBlockTimeMs: 2_000,
    pollingIntervalMs: 5_000,
    nativeSymbol: "ETH",
    wrappedNativeSymbol: "WETH",
    aliases: ["op"],
    gasConfig: sharedGas,
    gasWarningThresholds: { mediumUsd: 1, highUsd: 5 },
  },
  56: {
    chainId: 56,
    slug: "bsc",
    name: "BNB Smart Chain",
    platform: "evm",
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png",
    explorerBaseUrl: "https://bscscan.com",
    averageBlockTimeMs: 3_000,
    pollingIntervalMs: 6_000,
    nativeSymbol: "BNB",
    wrappedNativeSymbol: "WBNB",
    aliases: ["bnb", "binance"],
    gasConfig: { ...sharedGas, supportsEip1559: false },
    gasWarningThresholds: { mediumUsd: 0.5, highUsd: 2 },
  },
  130: {
    chainId: 130,
    slug: "unichain",
    name: "Unichain",
    platform: "evm",
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
    explorerBaseUrl: "https://uniscan.xyz",
    averageBlockTimeMs: 1_000,
    pollingIntervalMs: 4_000,
    nativeSymbol: "ETH",
    wrappedNativeSymbol: "WETH",
    aliases: ["uni"],
    gasConfig: sharedGas,
    gasWarningThresholds: { mediumUsd: 1, highUsd: 5 },
  },
  137: {
    chainId: 137,
    slug: "polygon",
    name: "Polygon",
    platform: "evm",
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png",
    explorerBaseUrl: "https://polygonscan.com",
    averageBlockTimeMs: 2_000,
    pollingIntervalMs: 5_000,
    nativeSymbol: "POL",
    wrappedNativeSymbol: "WPOL",
    aliases: ["matic", "polygon_pos"],
    gasConfig: sharedGas,
    gasWarningThresholds: { mediumUsd: 0.5, highUsd: 3 },
  },
  324: {
    chainId: 324,
    slug: "zksync",
    name: "zkSync Era",
    platform: "evm",
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/zksync/info/logo.png",
    explorerBaseUrl: "https://explorer.zksync.io",
    averageBlockTimeMs: 1_000,
    pollingIntervalMs: 4_000,
    nativeSymbol: "ETH",
    wrappedNativeSymbol: "WETH",
    aliases: ["zksync-era", "era"],
    gasConfig: sharedGas,
    gasWarningThresholds: { mediumUsd: 1, highUsd: 5 },
  },
  8453: {
    chainId: 8453,
    slug: "base",
    name: "Base",
    platform: "evm",
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png",
    explorerBaseUrl: "https://basescan.org",
    averageBlockTimeMs: 2_000,
    pollingIntervalMs: 5_000,
    nativeSymbol: "ETH",
    wrappedNativeSymbol: "WETH",
    aliases: ["coinbase-base"],
    gasConfig: sharedGas,
    gasWarningThresholds: { mediumUsd: 1, highUsd: 5 },
  },
  42161: {
    chainId: 42161,
    slug: "arbitrum",
    name: "Arbitrum",
    platform: "evm",
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png",
    explorerBaseUrl: "https://arbiscan.io",
    averageBlockTimeMs: 250,
    pollingIntervalMs: 3_000,
    nativeSymbol: "ETH",
    wrappedNativeSymbol: "WETH",
    aliases: ["arb", "arbitrum-one"],
    gasConfig: sharedGas,
    gasWarningThresholds: { mediumUsd: 1, highUsd: 6 },
  },
  43114: {
    chainId: 43114,
    slug: "avalanche",
    name: "Avalanche",
    platform: "evm",
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png",
    explorerBaseUrl: "https://snowtrace.io",
    averageBlockTimeMs: 2_000,
    pollingIntervalMs: 5_000,
    nativeSymbol: "AVAX",
    wrappedNativeSymbol: "WAVAX",
    aliases: ["avax", "avax-c"],
    gasConfig: sharedGas,
    gasWarningThresholds: { mediumUsd: 0.5, highUsd: 3 },
  },
  81457: {
    chainId: 81457,
    slug: "blast",
    name: "Blast",
    platform: "evm",
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/blast/info/logo.png",
    explorerBaseUrl: "https://blastscan.io",
    averageBlockTimeMs: 2_000,
    pollingIntervalMs: 5_000,
    nativeSymbol: "ETH",
    wrappedNativeSymbol: "WETH",
    aliases: ["blast-mainnet"],
    gasConfig: sharedGas,
    gasWarningThresholds: { mediumUsd: 1, highUsd: 5 },
  },
  [SOLANA_CHAIN_ID]: {
    chainId: SOLANA_CHAIN_ID,
    slug: "solana",
    name: "Solana",
    platform: "solana",
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png",
    explorerBaseUrl: "https://solscan.io",
    averageBlockTimeMs: 400,
    pollingIntervalMs: 2_500,
    nativeSymbol: "SOL",
    wrappedNativeSymbol: "WSOL",
    aliases: ["sol", "mainnet-beta"],
    gasConfig: {
      marginBps: 2000,
      supportsEip1559: false,
    },
    gasWarningThresholds: { mediumUsd: 0.25, highUsd: 1 },
  },
};

export const SUPPORTED_CHAIN_IDS = Object.keys(CHAIN_REGISTRY).map(Number);

export function getChainInfo(chainId: number): ChainAssetInfo | null {
  return CHAIN_REGISTRY[chainId] ?? null;
}

export function resolveChainId(input: number | string | undefined | null): number | null {
  if (typeof input === "number" && Number.isFinite(input)) {
    return CHAIN_REGISTRY[input] ? input : null;
  }

  if (!input) {
    return null;
  }

  const normalized = String(input).trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === "solana") {
    return SOLANA_CHAIN_ID;
  }

  const numeric = Number(normalized);
  if (Number.isFinite(numeric) && CHAIN_REGISTRY[numeric]) {
    return numeric;
  }

  const match = Object.values(CHAIN_REGISTRY).find(
    (chain) => chain.slug === normalized || chain.aliases.includes(normalized),
  );

  return match?.chainId ?? null;
}

export function getChainSlug(chainId: number): string {
  return getChainInfo(chainId)?.slug ?? String(chainId);
}
