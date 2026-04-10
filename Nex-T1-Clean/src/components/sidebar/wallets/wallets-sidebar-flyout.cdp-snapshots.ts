import type { ResolvedNetworkCapability } from "@/lib/networks/capabilities";
import { buildNetworkCapabilityMetadata } from "@/lib/networks/capabilities";
import type { WalletBalanceResult } from "@/lib/hooks/cdp/use-cdp-balance";
import type { WalletSnapshot, WalletTokenPosition } from "@/modules/wallets/profile";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";

export function buildCdpEvmWalletSnapshot(args: {
  address: string | null;
  label: string;
  capability: ResolvedNetworkCapability;
  balance: WalletBalanceResult | undefined;
}): WalletSnapshot | null {
  if (!args.address) {
    return null;
  }

  return {
    id: `cdp-evm-${args.address}`,
    address: args.address,
    label: args.label,
    customLabel: null,
    provider: "cdp",
    type: "embedded",
    metadata: {
      kind: "evm",
      provider: "cdp",
      walletType: "cdp",
      chainId: args.capability.chainId,
      ...buildNetworkCapabilityMetadata(args.capability),
    },
    totals: {
      tokenCount: args.balance?.tokens?.length ?? 0,
      nftCount: 0,
      estimatedValueUsd: args.balance?.totalUsdValue ?? 0,
      nativeValueUsd: args.balance?.native?.usdValue ?? null,
      totalPnlUsd: null,
      totalPnlPercent: null,
    },
    chains: [
      {
        name: args.capability.shortLabel,
        icon: args.capability.icon,
        type: args.capability.testnet ? "testnet" : "mainnet",
      },
    ],
    tokens: mapCdpTokens(args.balance, "evm", args.capability.chainId),
    nfts: [],
  };
}

export function buildCdpSolanaWalletSnapshot(args: {
  address: string | null;
  balance: WalletBalanceResult | undefined;
}): WalletSnapshot | null {
  if (!args.address) {
    return null;
  }

  return {
    id: `cdp-sol-${args.address}`,
    address: args.address,
    label: "Nex Wallet (SOL)",
    customLabel: null,
    provider: "cdp",
    type: "embedded",
    metadata: { kind: "solana", provider: "cdp", walletType: "cdp" },
    totals: {
      tokenCount: args.balance?.tokens?.length ?? 0,
      nftCount: 0,
      estimatedValueUsd: args.balance?.totalUsdValue ?? 0,
      nativeValueUsd: args.balance?.native?.usdValue ?? null,
      totalPnlUsd: null,
      totalPnlPercent: null,
    },
    chains: [{ name: "Solana", icon: LIQUID_GLASS_LOGOS.solana, type: "mainnet" }],
    tokens: mapCdpTokens(args.balance, "solana", null),
    nfts: [],
  };
}

function mapCdpTokens(
  balance: WalletBalanceResult | undefined,
  platform: "evm" | "solana",
  chainId: number | null,
): WalletTokenPosition[] {
  return (
    balance?.tokens?.map(
      (token, index): WalletTokenPosition => ({
        id: `cdp-${platform}-token-${index}`,
        chainId,
        platform,
        contract: token.address,
        name: token.name ?? token.symbol ?? "Unknown",
        symbol: token.symbol ?? "???",
        decimals: token.decimals,
        balance: Number(token.balance) / Math.pow(10, token.decimals),
        priceUsd: null,
        valueUsd: token.usdValue,
        change24hPercent: null,
        logoURI: null,
        isNative: false,
      }),
    ) ?? []
  );
}
