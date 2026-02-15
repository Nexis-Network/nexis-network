/**
 * Jupiter DEX Client
 *
 * Thin wrapper around the Jupiter Lite API (`https://lite-api.jup.ag/swap`)
 * for fetching swap quotes and building swap transactions on Solana.
 *
 * - `getQuote()`:  GET /quote — returns the best route for a token pair.
 * - `buildSwapTransaction()`: POST /swap — builds a serialised transaction
 *   from a previously fetched quote.
 *
 * All public methods return domain `Result` types so callers never need to
 * handle raw exceptions.
 */

import type { Result } from '@domain/common/types';
import { success, failure } from '@domain/common/types';
import { DomainError } from '@domain/common/errors/domain-error';
import type { SwapQuoteParams, SwapQuote } from '@domain/wallet/ports/crossmint-wallet-service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const JUPITER_BASE_URL = 'https://lite-api.jup.ag/swap';

/**
 * Jupiter recommends limiting the number of accounts to 33 for mobile
 * wallets to avoid transaction-size limits.
 */
const MAX_ACCOUNTS = 33;

// ---------------------------------------------------------------------------
// JupiterClient
// ---------------------------------------------------------------------------

export class JupiterClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? JUPITER_BASE_URL;
  }

  /**
   * Fetch the best swap quote from Jupiter.
   *
   * Makes a GET request to `/quote` with the token pair, amount, and
   * slippage as query parameters.
   */
  async getQuote(
    params: SwapQuoteParams,
  ): Promise<Result<SwapQuote, DomainError>> {
    try {
      const url = new URL(`${this.baseUrl}/quote`);
      url.searchParams.set('inputMint', params.inputMint);
      url.searchParams.set('outputMint', params.outputMint);
      url.searchParams.set('amount', params.amount);
      url.searchParams.set('slippageBps', String(params.slippageBps));
      url.searchParams.set('maxAccounts', String(MAX_ACCOUNTS));

      const response = await fetch(url.toString());

      if (!response.ok) {
        const text = await response.text().catch(() => 'Unknown error');
        return failure(
          new DomainError(
            `Jupiter quote request failed (HTTP ${response.status}): ${text}`,
            'JUPITER_QUOTE_ERROR',
          ),
        );
      }

      const data = await response.json();

      const quote: SwapQuote = {
        inputMint: data.inputMint ?? params.inputMint,
        outputMint: data.outputMint ?? params.outputMint,
        inputAmount: data.inAmount ?? params.amount,
        outputAmount: data.outAmount ?? '0',
        priceImpactPct: parseFloat(data.priceImpactPct ?? '0'),
        routeData: data,
      };

      return success(quote);
    } catch (err) {
      return failure(
        new DomainError(
          `Jupiter quote failed: ${err instanceof Error ? err.message : String(err)}`,
          'JUPITER_QUOTE_ERROR',
        ),
      );
    }
  }

  /**
   * Build a serialised swap transaction from a previously fetched quote.
   *
   * Makes a POST request to `/swap` with the full quote response and
   * the user's Solana public key.
   *
   * @returns The base64-encoded transaction string.
   */
  async buildSwapTransaction(
    quoteResponse: unknown,
    userPublicKey: string,
  ): Promise<Result<string, DomainError>> {
    try {
      const response = await fetch(`${this.baseUrl}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse,
          userPublicKey,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => 'Unknown error');
        return failure(
          new DomainError(
            `Jupiter swap request failed (HTTP ${response.status}): ${text}`,
            'JUPITER_SWAP_ERROR',
          ),
        );
      }

      const data = await response.json();
      return success(data.swapTransaction as string);
    } catch (err) {
      return failure(
        new DomainError(
          `Jupiter swap failed: ${err instanceof Error ? err.message : String(err)}`,
          'JUPITER_SWAP_ERROR',
        ),
      );
    }
  }
}
