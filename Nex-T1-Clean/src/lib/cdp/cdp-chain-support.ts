import type { WalletChainSummary } from "@/lib/user/profile";
import { findSupportedChain } from "@/lib/chains";
import { LIQUID_GLASS_LOGOS } from "@/lib/liquid-glass-logos";

const DEFAULT_CDP_EVM_CHAIN_ID = 8453;

export const CDP_EMBEDDED_EVM_NETWORK_BY_CHAIN_ID = {
  1: "ethereum",
  10: "optimism",
  56: "binance",
  137: "polygon",
  8453: "base",
  84532: "base-sepolia",
  42161: "arbitrum",
  43114: "avalanche",
  11155111: "ethereum-sepolia",
  11155420: "optimism-sepolia",
  421614: "arbitrum-sepolia",
  560048: "ethereum-hoodi",
  7777777: "zora",
} as const;

export const CDP_BALANCE_API_NETWORK_BY_CHAIN_ID = {
  1: "ethereum",
  8453: "base",
  84532: "base-sepolia",
} as const;

type EmbeddedNetworkMap = typeof CDP_EMBEDDED_EVM_NETWORK_BY_CHAIN_ID;
type BalanceApiNetworkMap = typeof CDP_BALANCE_API_NETWORK_BY_CHAIN_ID;

export type CdpEmbeddedEvmChainId = Extract<keyof EmbeddedNetworkMap, number>;
export type CdpBalanceApiChainId = Extract<keyof BalanceApiNetworkMap, number>;
export type CdpEmbeddedEvmNetwork =
  EmbeddedNetworkMap[CdpEmbeddedEvmChainId];
export type CdpBalanceApiNetwork =
  BalanceApiNetworkMap[CdpBalanceApiChainId];

const CHAIN_ICON_BY_ID: Record<number, string> = {
  1: LIQUID_GLASS_LOGOS.ethereum,
  10: "/icons/chain-icons/optimism.svg",
  56: LIQUID_GLASS_LOGOS.bnb,
  137: "/icons/chain-icons/polygon.svg",
  8453: "/icons/chain-icons/base.svg",
  84532: "/icons/chain-icons/base.svg",
  42161: "/icons/chain-icons/arbitrum.svg",
  43114: "/icons/chain-icons/avax.svg",
  11155111: LIQUID_GLASS_LOGOS.ethereum,
  11155420: "/icons/chain-icons/optimism.svg",
  421614: "/icons/chain-icons/arbitrum.svg",
  560048: LIQUID_GLASS_LOGOS.ethereum,
  7777777: "/icons/chain-icons/zora.svg",
};

const CHAIN_SUMMARY_BY_ID: Record<
  number,
  { name: string; type: "mainnet" | "testnet" }
> = {
  1: { name: "Ethereum", type: "mainnet" },
  10: { name: "Optimism", type: "mainnet" },
  56: { name: "BNB Chain", type: "mainnet" },
  137: { name: "Polygon", type: "mainnet" },
  8453: { name: "Base", type: "mainnet" },
  84532: { name: "Base Sepolia", type: "testnet" },
  42161: { name: "Arbitrum", type: "mainnet" },
  43114: { name: "Avalanche", type: "mainnet" },
  11155111: { name: "Ethereum Sepolia", type: "testnet" },
  11155420: { name: "Optimism Sepolia", type: "testnet" },
  421614: { name: "Arbitrum Sepolia", type: "testnet" },
  560048: { name: "Hoodi", type: "testnet" },
  7777777: { name: "Zora", type: "mainnet" },
};

function parseChainId(
  chainId: number | string | null | undefined,
): number | null {
  if (typeof chainId === "number") {
    return Number.isFinite(chainId) && chainId > 0 ? chainId : null;
  }

  if (typeof chainId !== "string") return null;
  const trimmed = chainId.trim();
  if (!trimmed) return null;

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function isCdpEmbeddedEvmChainId(
  chainId: number,
): chainId is CdpEmbeddedEvmChainId {
  return chainId in CDP_EMBEDDED_EVM_NETWORK_BY_CHAIN_ID;
}

export function isCdpBalanceApiChainId(
  chainId: number,
): chainId is CdpBalanceApiChainId {
  return chainId in CDP_BALANCE_API_NETWORK_BY_CHAIN_ID;
}

export function resolveCdpEmbeddedEvmChainId(
  chainId: number | string | null | undefined,
): CdpEmbeddedEvmChainId {
  const parsed = parseChainId(chainId);
  if (parsed && isCdpEmbeddedEvmChainId(parsed)) {
    return parsed;
  }
  return DEFAULT_CDP_EVM_CHAIN_ID;
}

export function resolveCdpEmbeddedEvmNetwork(
  chainId: number | string | null | undefined,
): CdpEmbeddedEvmNetwork {
  return CDP_EMBEDDED_EVM_NETWORK_BY_CHAIN_ID[
    resolveCdpEmbeddedEvmChainId(chainId)
  ];
}

export function resolveCdpBalanceApiNetwork(
  chainId: number | string | null | undefined,
): CdpBalanceApiNetwork | null {
  const resolved = resolveCdpEmbeddedEvmChainId(chainId);
  if (!isCdpBalanceApiChainId(resolved)) {
    return null;
  }
  return CDP_BALANCE_API_NETWORK_BY_CHAIN_ID[resolved];
}

export function resolveCdpNativeAsset(
  chainId: number | string | null | undefined,
): {
  chainId: CdpEmbeddedEvmChainId;
  symbol: string;
  decimals: number;
} {
  const resolved = resolveCdpEmbeddedEvmChainId(chainId);
  const chain = findSupportedChain(resolved);

  return {
    chainId: resolved,
    symbol: chain?.nativeCurrency.symbol ?? "ETH",
    decimals: chain?.nativeCurrency.decimals ?? 18,
  };
}

export function resolveCoinGeckoPlatformForChain(
  chainId: number | string | null | undefined,
): string {
  switch (resolveCdpEmbeddedEvmChainId(chainId)) {
    case 10:
    case 11155420:
      return "optimistic-ethereum";
    case 56:
      return "binance-smart-chain";
    case 137:
      return "polygon-pos";
    case 42161:
    case 421614:
      return "arbitrum-one";
    case 43114:
      return "avalanche";
    case 8453:
    case 84532:
      return "base";
    default:
      return "ethereum";
  }
}

export function resolveCoinGeckoNativeAssetId(
  platform: "evm" | "solana",
  chainId?: number | string | null,
): string {
  if (platform === "solana") {
    return "solana";
  }

  switch (resolveCdpEmbeddedEvmChainId(chainId)) {
    case 56:
      return "binancecoin";
    case 137:
      return "matic-network";
    case 43114:
      return "avalanche-2";
    default:
      return "ethereum";
  }
}

export function getCdpEmbeddedWalletChainSummaries(): WalletChainSummary[] {
  return Object.keys(CDP_EMBEDDED_EVM_NETWORK_BY_CHAIN_ID).reduce<
    WalletChainSummary[]
  >((chains, value) => {
    const chainId = Number(value);
    if (!Number.isFinite(chainId)) {
      return chains;
    }

    const chain = findSupportedChain(chainId);
    const summary = CHAIN_SUMMARY_BY_ID[chainId];
    if (!chain && !summary) {
      return chains;
    }

    chains.push({
      name: chain?.name ?? summary?.name ?? `Chain ${chainId}`,
      icon: CHAIN_ICON_BY_ID[chainId] ?? null,
      type: chain?.testnet ? "testnet" : summary?.type ?? "mainnet",
    });

    return chains;
  }, []);
}

export function getCdpEmbeddedEvmChainPresentation(
  chainId: number | string | null | undefined,
): {
  chainId: CdpEmbeddedEvmChainId;
  icon: string | null;
  name: string;
  type: "mainnet" | "testnet";
} {
  const resolved = resolveCdpEmbeddedEvmChainId(chainId);
  const chain = findSupportedChain(resolved);
  const summary = CHAIN_SUMMARY_BY_ID[resolved];

  return {
    chainId: resolved,
    icon: CHAIN_ICON_BY_ID[resolved] ?? null,
    name: chain?.name ?? summary?.name ?? `Chain ${resolved}`,
    type: chain?.testnet ? "testnet" : summary?.type ?? "mainnet",
  };
}
