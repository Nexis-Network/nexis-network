// ---------------------------------------------------------------------------
// Multi-chain gas estimation types
// ---------------------------------------------------------------------------

export type GasSpeed = 'slow' | 'standard' | 'fast';

/**
 * EVM gas estimate for a single speed tier.
 * Supports EIP-1559 (maxFeePerGas + priorityFee) model.
 */
export interface EvmGasTier {
  readonly speed: GasSpeed;
  readonly gasLimit: bigint;
  readonly maxFeePerGas: bigint;
  readonly maxPriorityFeePerGas: bigint;
  readonly estimatedFeeWei: bigint;
  readonly estimatedFeeNative: string;
  readonly estimatedFeeUsd: number;
}

/**
 * Solana gas estimate — based on lamports-per-signature model.
 */
export interface SolanaGasEstimate {
  readonly lamportsPerSignature: number;
  readonly signatureCount: number;
  readonly totalLamports: number;
  readonly feeSol: string;
  readonly feeUsd: number;
}

/**
 * Stellar gas estimate — based on stroops-per-operation model.
 */
export interface StellarGasEstimate {
  readonly baseFeeStroops: number;
  readonly operationCount: number;
  readonly totalStroops: number;
  readonly feeXlm: string;
  readonly feeUsd: number;
}

/**
 * Discriminated union for multi-chain gas estimates.
 * EVM returns 3 speed tiers; Solana and Stellar return a single estimate.
 */
export type GasEstimate =
  | { readonly chain: 'evm'; readonly tiers: readonly [EvmGasTier, EvmGasTier, EvmGasTier] }
  | { readonly chain: 'solana'; readonly estimate: SolanaGasEstimate }
  | { readonly chain: 'stellar'; readonly estimate: StellarGasEstimate };
