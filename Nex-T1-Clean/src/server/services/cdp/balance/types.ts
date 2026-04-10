import { z } from "zod";

export type TokenBalance = {
  symbol: string | null;
  address: string;
  balance: string;
  usdValue: number;
  decimals: number;
  name?: string | null;
};

export type NativeBalance = {
  symbol: string;
  balance: string;
  usdValue: number;
  decimals: number;
};

export type WalletBalanceResult = {
  address: string;
  platform: "evm" | "solana";
  chainId?: number | string;
  native: NativeBalance;
  tokens: TokenBalance[];
  totalUsdValue: number;
};

export type MultiWalletBalanceResult = {
  wallets: Array<
    WalletBalanceResult & { status: "fulfilled" | "rejected"; error?: string }
  >;
  totalUsdValue: number;
};

export type BalanceFetchOptions = {
  platform: "evm" | "solana";
  chainId?: number | string;
  skipCache?: boolean;
};

export type MultiWalletEntry = {
  address: string;
  platform: "evm" | "solana";
  chainId?: number | string;
};

export type BatchBalanceEntry = {
  address: string;
  platform: "evm" | "solana";
  chainId?: number | string;
};

export const balanceOptionsSchema = z.object({
  platform: z.enum(["evm", "solana"]),
  chainId: z.union([z.number(), z.string()]).optional(),
  skipCache: z.boolean().optional().default(false),
});

export const multiWalletEntrySchema = z.object({
  address: z.string().min(1, "Address is required"),
  platform: z.enum(["evm", "solana"]),
  chainId: z.union([z.number(), z.string()]).optional(),
});

export const batchBalanceEntrySchema = z.object({
  address: z.string().min(1, "Address is required"),
  platform: z.enum(["evm", "solana"]),
  chainId: z.union([z.number(), z.string()]).optional(),
});

