"use client";

export type CdpTokenBalance = {
  symbol: string | null;
  address: string;
  balance: string;
  usdValue: number;
  decimals: number;
  name?: string | null;
};

export type WalletBalanceResult = {
  address: string;
  platform: "evm" | "solana";
  chainId?: number | string;
  native: {
    symbol: string;
    balance: string;
    usdValue: number;
    decimals: number;
  };
  tokens: CdpTokenBalance[];
  totalUsdValue: number;
};

export type CdpWalletDescriptor = {
  address: string;
  platform: "evm" | "solana";
  chainId?: number;
};

