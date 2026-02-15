import type { Result } from '@domain/common/types';
import type { DomainError } from '@domain/common/errors/domain-error';
import type { ChainType, Wallet } from '@domain/wallet/entities/wallet';

// ---------------------------------------------------------------------------
// Swap types
// ---------------------------------------------------------------------------

export interface SwapQuoteParams {
  readonly inputMint: string;
  readonly outputMint: string;
  readonly amount: string;
  readonly slippageBps: number;
}

export interface SwapQuote {
  readonly inputMint: string;
  readonly outputMint: string;
  readonly inputAmount: string;
  readonly outputAmount: string;
  readonly priceImpactPct: number;
  readonly routeData: unknown;
}

export interface ExecuteSwapParams {
  readonly walletAddress: string;
  readonly quote: SwapQuote;
}

// ---------------------------------------------------------------------------
// Port interface
// ---------------------------------------------------------------------------

export interface ICrossmintWalletService {
  createSmartWallet(
    chain: ChainType,
    ownerJwt: string,
  ): Promise<Result<Wallet, DomainError>>;

  getOrCreateWallets(
    chains: ReadonlyArray<ChainType>,
    ownerJwt: string,
  ): Promise<Result<ReadonlyArray<Wallet>, DomainError>>;

  getSwapQuote(
    params: SwapQuoteParams,
  ): Promise<Result<SwapQuote, DomainError>>;

  executeSwap(
    params: ExecuteSwapParams,
  ): Promise<Result<string, DomainError>>;
}
