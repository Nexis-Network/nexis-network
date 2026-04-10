import type { WalletChainSummary } from "@/lib/user/profile";

export type UnifiedAsset = {
  id: string;
  chainId: number | null;
  platform: "evm" | "solana" | "default";
  contract: string | null; // null for native
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  balance: number;
  uiAmount?: number; // Optional redundant field if needed for stricter typing
  uiAmountString?: string;
  priceUsd: number | null;
  valueUsd: number | null;
  change24hPercent: number | null;
  logoURI: string | null;
  isNative: boolean;
};

// Backward compatibility
export type WalletTokenPosition = UnifiedAsset;

export type UnifiedTransaction = {
  id: string; // hash
  hash: string;
  chainId: number;
  blockNumber: number | null;
  blockTime: number; // unix timestamp
  from: string;
  to: string;
  value: number; // native value usually
  asset?: UnifiedAsset; // if token transfer
  type: "send" | "receive" | "swap" | "unknown";
  status: "confirmed" | "pending" | "failed";
  explorerUrl: string | null;
};

export type WalletNftPosition = {
  id: string;
  name: string | null;
  description: string | null;
  image: string | null;
  collection: string | null;
  chainId: number | null;
  priceUsd: number | null;
  contract?: string | null;
  tokenId?: string | null;
};

export type WalletSnapshot = {
  id: string;
  address: string | null;
  provider: string | null;
  label: string | null;
  customLabel: string | null;
  type: string;
  chains: WalletChainSummary[];
  tokens: WalletTokenPosition[];
  nfts: WalletNftPosition[];
  totals: {
    tokenCount: number;
    nftCount: number;
    estimatedValueUsd: number | null;
    nativeValueUsd: number | null;
    totalPnlUsd: number | null;
    totalPnlPercent: number | null;
  };
  metadata: Record<string, UntypedJson> | null;
};

export type WalletSummaryEnvelope = {
  wallets: WalletSnapshot[];
  aggregated: {
    totalWallets: number;
    estimatedValueUsd: number | null;
  };
  fetchedAt: string;
};

export function createEmptyWalletSummary(): WalletSummaryEnvelope {
  return {
    wallets: [],
    aggregated: {
      totalWallets: 0,
      estimatedValueUsd: null,
    },
    fetchedAt: new Date().toISOString(),
  };
}
