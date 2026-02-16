// ---------------------------------------------------------------------------
// ERC-20 token allowance
// ---------------------------------------------------------------------------

/**
 * An ERC-20 approval that grants a spender address permission to
 * transfer up to `allowanceRaw` of the user's tokens.
 */
export interface TokenAllowance {
  readonly id: string;
  readonly chainId: number;
  readonly tokenSymbol: string;
  readonly tokenAddress: string;
  readonly tokenDecimals: number;
  readonly spenderAddress: string;
  /** Human-readable spender label (e.g. "Uniswap V3 Router"). */
  readonly spenderLabel?: string;
  /** Raw allowance in smallest unit. */
  readonly allowanceRaw: string;
  /** Human-readable formatted allowance. */
  readonly allowanceFormatted: string;
  /** True when allowance exceeds 2^128 (effectively unlimited). */
  readonly isUnlimited: boolean;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Any allowance above 2^128 is considered "unlimited". */
export const UNLIMITED_THRESHOLD = 2n ** 128n;

export function isUnlimitedAllowance(raw: string): boolean {
  try {
    return BigInt(raw) >= UNLIMITED_THRESHOLD;
  } catch {
    return false;
  }
}
