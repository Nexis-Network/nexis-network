/**
 * Crossmint Wallet Service Adapter
 *
 * Implements `ICrossmintWalletService` from the domain layer. This adapter
 * bridges Crossmint smart wallet operations with the domain's Result-based
 * patterns.
 *
 * DESIGN DECISIONS:
 *
 * - `createSmartWallet` and `getOrCreateWallets` return "use hook instead"
 *   failures because actual wallet creation is driven by React hooks
 *   (`useCrossmintWallet`) which manage the Crossmint SDK lifecycle.
 *   The adapter exists so that non-React code (use cases, DI) can reference
 *   the ICrossmintWalletService interface.
 *
 * - `getSwapQuote` delegates to `JupiterClient` for real DEX quotes.
 *
 * - `executeSwap` also returns "use hook" because swap execution requires
 *   Crossmint's signer context which is only available inside React hooks.
 *
 * - `mapCrossmintWalletToDomain` is a pure function exported for use by
 *   React hooks that need to convert Crossmint API responses into domain
 *   Wallet entities.
 */

import type { Result } from '@domain/common/types';
import { success, failure, createUUID } from '@domain/common/types';
import { DomainError } from '@domain/common/errors/domain-error';
import type {
  ChainType,
  Wallet,
} from '@domain/wallet/entities/wallet';
import type {
  ICrossmintWalletService,
  SwapQuoteParams,
  SwapQuote,
  ExecuteSwapParams,
} from '@domain/wallet/ports/crossmint-wallet-service';
import { JupiterClient } from './jupiter-client';

// ---------------------------------------------------------------------------
// Crossmint response mapping
// ---------------------------------------------------------------------------

export interface CrossmintWalletResponse {
  readonly address: string;
  readonly chain: ChainType;
  readonly walletId?: string;
}

/**
 * Map a Crossmint wallet API response to a domain Wallet entity.
 *
 * This is a pure function so it can be used by React hooks that directly
 * interact with the Crossmint SDK without going through the adapter class.
 */
export function mapCrossmintWalletToDomain(
  response: CrossmintWalletResponse,
): Wallet {
  const addr = response.address;
  return {
    id: createUUID(deterministicUUID(addr)),
    address: addr,
    chainType: response.chain,
    label: `Crossmint ${addr.slice(0, 6)}...${addr.slice(-4)}`,
    isPrimary: false,
    safeVersion: undefined,
    deploymentStatus: 'running',
    walletProvider: 'crossmint',
    crossmintWalletId: response.walletId,
  } satisfies Wallet;
}

// ---------------------------------------------------------------------------
// CrossmintWalletServiceAdapter
// ---------------------------------------------------------------------------

export class CrossmintWalletServiceAdapter implements ICrossmintWalletService {
  private readonly jupiterClient: JupiterClient;

  constructor(jupiterClient?: JupiterClient) {
    this.jupiterClient = jupiterClient ?? new JupiterClient();
  }

  /**
   * Wallet creation is handled by React hooks (useCrossmintWallet).
   * This method exists to satisfy the interface for DI purposes.
   */
  async createSmartWallet(
    _chain: ChainType,
    _ownerJwt: string,
  ): Promise<Result<Wallet, DomainError>> {
    return failure(
      new DomainError(
        'Wallet creation must be performed via the useCrossmintWallet hook.',
        'USE_HOOK',
      ),
    );
  }

  /**
   * Multi-chain wallet creation is handled by React hooks.
   * This method exists to satisfy the interface for DI purposes.
   */
  async getOrCreateWallets(
    _chains: ReadonlyArray<ChainType>,
    _ownerJwt: string,
  ): Promise<Result<ReadonlyArray<Wallet>, DomainError>> {
    return failure(
      new DomainError(
        'Wallet creation must be performed via the useCrossmintWallet hook.',
        'USE_HOOK',
      ),
    );
  }

  /**
   * Fetch a swap quote from Jupiter DEX.
   */
  async getSwapQuote(
    params: SwapQuoteParams,
  ): Promise<Result<SwapQuote, DomainError>> {
    return this.jupiterClient.getQuote(params);
  }

  /**
   * Swap execution requires the Crossmint signer context from React hooks.
   * This method exists to satisfy the interface for DI purposes.
   */
  async executeSwap(
    _params: ExecuteSwapParams,
  ): Promise<Result<string, DomainError>> {
    return failure(
      new DomainError(
        'Swap execution must be performed via the useCrossmintWallet hook.',
        'USE_HOOK',
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers (module-private)
// ---------------------------------------------------------------------------

/**
 * Produce a deterministic UUID v4-shaped string from a wallet address so
 * that the same address always maps to the same domain entity id.
 *
 * Unlike the WalletConnect adapter which only handles EVM hex addresses,
 * this function first converts the address bytes to hex, ensuring it works
 * with base58 Solana addresses and any other encoding.
 */
function deterministicUUID(address: string): string {
  // Convert each character's char code to a two-digit hex string.
  // This ensures any address encoding (hex, base58, etc.) produces valid hex.
  const hex = Array.from(address)
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
    .padEnd(32, '0')
    .slice(0, 32);

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `a${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}
