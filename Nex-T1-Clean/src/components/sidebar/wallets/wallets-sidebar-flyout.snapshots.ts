import { formatUnits } from "viem";

import { getChainIcon } from "@/components/app-header/header-wallet-control";
import type { WalletSnapshot, WalletTokenPosition } from "@/modules/wallets/profile";

type ConnectedWalletInfo = {
  connector: string;
  displayName: string;
} | null;

type NativeBalance = {
  symbol: string;
  decimals: number;
  value: bigint;
} | null | undefined;

type SupportedChainInfo = {
  id: number;
  name: string;
};

export function buildEoaWalletSnapshot(args: {
  isConnected: boolean;
  canQueryBalance: boolean;
  address: string | undefined;
  chainId: number | undefined;
  connectedWallet: ConnectedWalletInfo;
  balance: NativeBalance;
  supportedChains: SupportedChainInfo[];
  guestWalletData: WalletSnapshot | null;
}): WalletSnapshot | null {
  if (!args.isConnected || !args.canQueryBalance || !args.address) {
    return null;
  }

  if (args.guestWalletData?.address?.toLowerCase() === args.address.toLowerCase()) {
    const currentMetadata = args.guestWalletData.metadata || {};
    return {
      ...args.guestWalletData,
      provider: args.connectedWallet?.connector ?? "external",
      metadata: {
        ...currentMetadata,
        chainId: args.chainId,
        provider: args.connectedWallet?.connector,
        connected: true,
      },
    };
  }

  const currentChain = args.supportedChains.find((chain) => chain.id === args.chainId);
  const nativeToken = buildNativeEoaToken(args.balance, args.chainId);

  return {
    id: `eoa-${args.address}`,
    address: args.address,
    label: args.connectedWallet?.displayName ?? "External Wallet",
    customLabel: null,
    provider: args.connectedWallet?.connector ?? "external",
    type: "external_evm",
    metadata: {
      chainId: args.chainId,
      provider: args.connectedWallet?.connector,
      connected: true,
    },
    totals: {
      tokenCount: 1,
      nftCount: 0,
      estimatedValueUsd: 0,
      nativeValueUsd: null,
      totalPnlUsd: null,
      totalPnlPercent: null,
    },
    chains: [
      {
        name: currentChain?.name ?? "Unknown Chain",
        icon: getChainIcon(args.chainId),
        type: "mainnet",
      },
    ],
    tokens: nativeToken ? [nativeToken] : [],
    nfts: [],
  };
}

function buildNativeEoaToken(
  balance: NativeBalance,
  chainId: number | undefined,
): WalletTokenPosition | null {
  if (!balance) {
    return null;
  }

  return {
    id: `native-${chainId}`,
    chainId: chainId ?? null,
    platform: "evm",
    contract: null,
    name: balance.symbol,
    symbol: balance.symbol,
    decimals: balance.decimals,
    balance: Number(formatUnits(balance.value, balance.decimals)),
    priceUsd: null,
    valueUsd: null,
    change24hPercent: null,
    logoURI: getChainIcon(chainId),
    isNative: true,
  };
}
