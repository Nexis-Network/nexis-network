"use client";

import { useState } from "react";
import { getSwapQuote, type SwapQuoteRequest, type SwapQuotePayload } from "@/lib/swap-aggregator";

type SafeSwapExecutionConfig = {
  safeAddress?: string;
  chainId?: number;
  requiresMfa?: boolean;
};

/**
 * Hook to integrate Safe swap execution via Safe tx request flow.
 * Handles quoting, proposal, and state management.
 */
export function useSafeSwap(config: SafeSwapExecutionConfig = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [quote, setQuote] = useState<SwapQuotePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch a quote from the server-side aggregator (Li.Fi / 0x / Jupiter)
   */
  const fetchQuote = async (request: SwapQuoteRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      // Calls the server action mapped in lib/swap-aggregator.ts
      const result = await getSwapQuote(request);
      setQuote(result);
    } catch (err: UntypedJson) {
      setError(err instanceof Error ? err.message : "Failed to fetch quote");
      setQuote(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Propose the swap as a Safe tx request using the aggregator transaction payload.
   */
  const executeSwap = async (override: SafeSwapExecutionConfig = {}) => {
    if (!quote || !quote.aggregator.transactionRequest) {
      setError("No valid quote to execute");
      return null;
    }

    const safeAddress = (override.safeAddress ?? config.safeAddress ?? "").trim();
    if (!safeAddress) {
      setError("Safe wallet required to execute swap");
      return null;
    }

    if (quote.input.fromAddress && quote.input.fromAddress.toLowerCase() !== safeAddress.toLowerCase()) {
      setError("Quote address does not match Safe wallet");
      return null;
    }

    const tx = quote.aggregator.transactionRequest;
    const chainId = override.chainId ?? config.chainId ?? tx.chainId;
    if (!chainId || !tx.to || !tx.data) {
      setError("Missing swap transaction details");
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/wallets/safe/tx-requests/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chainId,
          safeAddress,
          to: tx.to,
          valueWei: tx.value ?? "0",
          data: tx.data,
          createdBy: "user",
          requiresMfa: override.requiresMfa ?? config.requiresMfa ?? true,
        }),
      });

      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setError(payload?.message || payload?.error || "Swap execution failed");
        return null;
      }
      return payload;
    } catch (err: UntypedJson) {
      setError(err instanceof Error ? err.message : "Swap execution failed");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fetchQuote,
    executeSwap,
    quote,
    isLoading,
    error,
  };
}
