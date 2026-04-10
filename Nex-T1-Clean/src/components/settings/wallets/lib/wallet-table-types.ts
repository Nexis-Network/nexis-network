import type { WalletAnalyticsPosition } from "@/lib/user/profile";
import type { WalletCategory } from "../wallet-type-badge";

export type WalletsTableProps = {
  wallets: import("@/lib/user/profile").WalletPortfolio[];
  isLoading: boolean;
  error?: string | null;
  initialAction?: "send" | "receive" | "export-private-key" | null;
  initialWalletAddress?: string | null;
};

export type ChainDisplay = {
  name: string;
  icon: string | null;
};

export type HoldingsCount = {
  tokens: number | null;
  nfts: number | null;
};

export type WalletRow = {
  id: string;
  label: string;
  provider: string | null;
  /** The raw provider identifier from wallet metadata (e.g. "cdp", "crossmint", "safe") */
  sourceProvider: string | null;
  address: string | null;
  smartAccountAddress: string | null;
  engineServerWalletAddress: string | null;
  chainId: number | null;
  isSmartAccount: boolean;
  provisioningStatus: string | null;
  lastError: string | null;
  chains: ChainDisplay[];
  type: WalletCategory;
  typeLabel: string;
  walletIcon: string | null;
  topAssets?: { icon?: string | null; symbol?: string | null }[];
  platform: "evm" | "solana" | "stellar" | "hyperliquid";
  totals: {
    netWorth: number | null;
    change24hPercent: number | null;
    costBasisUsd: number | null;
    unrealizedPnlUsd: number | null;
    tokenValueUsd: number | null;
    nftValueUsd: number | null;
  };
  analyticsPositions?: WalletAnalyticsPosition[];
  holdingsCount: HoldingsCount;
};
