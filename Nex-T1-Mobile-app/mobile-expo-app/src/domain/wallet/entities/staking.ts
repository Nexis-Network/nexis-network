import type { Timestamp } from '@domain/common/types';
import type { ChainType } from './wallet';

// ---------------------------------------------------------------------------
// Staking position
// ---------------------------------------------------------------------------

/**
 * A staking or liquid-staking position held by the user.
 *
 * For EVM this typically represents a liquid staking token balance
 * (stETH, rETH, cbETH). For Solana it represents a native validator
 * stake account.
 */
export interface StakingPosition {
  readonly id: string;
  readonly chain: ChainType;
  readonly chainId: number | string;
  readonly protocolName: string;
  readonly stakedTokenSymbol: string;
  readonly stakedTokenAddress: string;
  /** Raw amount in smallest unit (wei, lamports). */
  readonly amountStaked: string;
  /** Human-readable formatted amount. */
  readonly amountStakedFormatted: string;
  readonly amountStakedUsd: number;
  readonly rewardsAccrued: string;
  readonly rewardsAccruedUsd: number;
  readonly apy?: number;
  readonly unlockDate?: Timestamp;
  readonly canUnstake: boolean;
  readonly canClaimRewards: boolean;
}
