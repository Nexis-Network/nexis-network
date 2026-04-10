import { useEffect } from "react";
import { useAccount } from "wagmi";
import { logger } from "@/lib/logger";
import { useSwapStore } from "@/stores/use-swap-store";
import { useShallow } from "zustand/react/shallow";
import { getSwapQuote, SwapQuoteRequest } from "@/lib/swap-aggregator";
import { useDebounce } from "@/hooks/use-debounce";
export function useSwapQuoteHook() {
  const {
    sellToken,
    buyToken,
    sellAmount,
    slippage,
    setBuyAmount,
    setQuote,
    setIsLoading,
    setError,
    resetQuoteState,
  } = useSwapStore(
    useShallow((s) => ({
      sellToken: s.sellToken,
      buyToken: s.buyToken,
      sellAmount: s.sellAmount,
      slippage: s.slippage,
      setBuyAmount: s.setBuyAmount,
      setQuote: s.setQuote,
      setIsLoading: s.setIsLoading,
      setError: s.setError,
      resetQuoteState: s.resetQuoteState,
    }))
  );
  const { address, isConnected } = useAccount();

  const debouncedAmount = useDebounce(sellAmount, 500);

  useEffect(() => {
    let cancelled = false;

    async function fetchQuote() {
      const parsedAmount = Number.parseFloat(debouncedAmount);
      if (!sellToken || !buyToken || !debouncedAmount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        resetQuoteState();
        setBuyAmount("");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const request: SwapQuoteRequest = {
            fromToken: sellToken.address, 
            toToken: buyToken.address,
            amount: debouncedAmount,
            tradeType: "EXACT_INPUT", // Defaulting to simple exact input for this phase
            fromChainId: sellToken.chainId,
            toChainId: buyToken.chainId,
            slippagePercentage: slippage,
            ...(isConnected && address ? { fromAddress: address } : {}),
        };

        const nextQuote = await getSwapQuote(request);
        if (cancelled) {
          return;
        }

        setQuote(nextQuote);
        setBuyAmount(nextQuote.amountOut.toFixed(6));
      } catch (err) {
        if (cancelled) {
          return;
        }

        logger.error("Swap quote error:", err);
        setError("Failed to fetch quote. Please try again.");
        setQuote(null);
        setBuyAmount("");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void fetchQuote();

    return () => {
      cancelled = true;
    };
  }, [
    address,
    buyToken,
    debouncedAmount,
    isConnected,
    resetQuoteState,
    sellToken,
    setBuyAmount,
    setError,
    setIsLoading,
    setQuote,
    slippage,
  ]);
}
