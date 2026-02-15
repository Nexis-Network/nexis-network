import type { Timestamp, UUID } from '@domain/common/types';

// ---------------------------------------------------------------------------
// Chain type
// ---------------------------------------------------------------------------

export type ChainType = 'evm' | 'solana' | 'sui' | 'stellar';

// ---------------------------------------------------------------------------
// Deployment status (shared across wallet & agent)
// ---------------------------------------------------------------------------

export type DeploymentStatus = 'creating' | 'running' | 'stopped' | 'failed';

export type WalletProviderType = 'crossmint' | 'walletconnect' | 'safe';

// ---------------------------------------------------------------------------
// Wallet entity
// ---------------------------------------------------------------------------

/**
 * A user-owned wallet that may be a smart-account (Safe) or an EOA.
 */
export interface Wallet {
  readonly id: UUID;
  readonly address: string;
  readonly chainType: ChainType;
  /** Numeric chain ID for EVM chains (e.g. 1, 8453, 137). */
  readonly chainId?: number | undefined;
  readonly label: string;
  readonly isPrimary: boolean;
  /** Only populated for Safe smart-account wallets. */
  readonly safeVersion: string | undefined;
  readonly deploymentStatus: DeploymentStatus;
  readonly walletProvider: WalletProviderType;
  readonly crossmintWalletId?: string | undefined;
}

// ---------------------------------------------------------------------------
// Token balance
// ---------------------------------------------------------------------------

/**
 * A single token balance for a given wallet.
 */
export interface TokenBalance {
  readonly tokenAddress: string;
  readonly symbol: string;
  readonly name: string;
  /** Raw balance as a decimal string (to avoid floating-point precision loss). */
  readonly balance: string;
  readonly decimals: number;
  /** Fiat value; undefined when price data is unavailable. */
  readonly usdValue: number | undefined;
  readonly iconUrl: string | undefined;
  /** Chain identifier for multi-chain aggregation. */
  readonly chainId?: number | string | undefined;
}

// ---------------------------------------------------------------------------
// Portfolio aggregates
// ---------------------------------------------------------------------------

/**
 * Per-chain balance breakdown within a portfolio.
 */
export interface ChainBalance {
  readonly chainId: string | number;
  readonly chainName: string;
  readonly totalUsd: number;
  readonly tokens: ReadonlyArray<TokenBalance>;
}

/**
 * Aggregated portfolio across all chains and wallets.
 */
export interface Portfolio {
  readonly totalUsd: number;
  readonly change24h: number;
  readonly change24hPercent: number;
  readonly chains: ReadonlyArray<ChainBalance>;
  readonly updatedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Transaction
// ---------------------------------------------------------------------------

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

/**
 * An on-chain transaction record.
 */
export interface Transaction {
  readonly hash: string;
  readonly from: string;
  readonly to: string;
  /** Value transferred as a decimal string. */
  readonly value: string;
  /** Gas consumed, as a decimal string. */
  readonly gasUsed: string | undefined;
  readonly status: TransactionStatus;
  readonly timestamp: Timestamp;
  readonly chainId: number;
}
