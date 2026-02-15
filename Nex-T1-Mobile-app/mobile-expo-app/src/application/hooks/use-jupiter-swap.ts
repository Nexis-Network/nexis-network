/**
 * useJupiterSwap Hook
 *
 * Provides swap quote fetching and execution via the `ICrossmintWalletService`
 * port resolved from the DI container. The service delegates to JupiterClient
 * for quote data.
 *
 * State is managed locally within the hook since it is transient per
 * swap operation and does not need to persist or be shared globally.
 */

import { useCallback, useMemo, useState } from 'react';

import type { ICrossmintWalletService, SwapQuote, SwapQuoteParams } from '@domain/wallet/ports/crossmint-wallet-service';
import { container, ServiceKeys } from '@application/container';

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export interface UseJupiterSwapReturn {
  /** The most recent swap quote, or null. */
  readonly quote: SwapQuote | null;
  /** Whether a quote or swap operation is in progress. */
  readonly isLoading: boolean;
  /** Last error message, or null. */
  readonly error: string | null;

  /** Fetch a swap quote from Jupiter DEX. */
  getQuote: (params: SwapQuoteParams) => Promise<void>;
  /** Execute the current quote via the user's wallet. */
  executeSwap: (walletAddress: string) => Promise<string | null>;
  /** Clear the quote, error, and loading state. */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useJupiterSwap(): UseJupiterSwapReturn {
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve the service once via DI container
  const crossmintService = useMemo(
    () =>
      container.resolve<ICrossmintWalletService>(
        ServiceKeys.CrossmintWalletService,
      ),
    [],
  );

  // --- Fetch a quote ---
  const getQuote = useCallback(
    async (params: SwapQuoteParams): Promise<void> => {
      setIsLoading(true);
      setError(null);
      setQuote(null);

      try {
        const result = await crossmintService.getSwapQuote(params);

        if (result.ok) {
          setQuote(result.value);
        } else {
          setError(result.error.message);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch swap quote',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [crossmintService],
  );

  // --- Execute the swap ---
  const executeSwap = useCallback(
    async (walletAddress: string): Promise<string | null> => {
      if (!quote) {
        setError('No quote available. Fetch a quote first.');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await crossmintService.executeSwap({
          walletAddress,
          quote,
        });

        if (result.ok) {
          return result.value;
        }

        setError(result.error.message);
        return null;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to execute swap',
        );
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [crossmintService, quote],
  );

  // --- Reset state ---
  const reset = useCallback((): void => {
    setQuote(null);
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    quote,
    isLoading,
    error,
    getQuote,
    executeSwap,
    reset,
  };
}
