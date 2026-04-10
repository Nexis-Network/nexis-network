import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useAccount } from "wagmi";
import { getQuoteAction } from "@/server/actions/uniswap";
import { toProviderTokenAddress } from "@/modules/tokens/utils/asset-id";
import { useSwapStore } from "@/stores/use-swap-store";
import { useShallow } from "zustand/react/shallow";
import {
  formatTokenAmountFromBaseUnits,
  tryParseTokenAmountToBaseUnits,
} from "@/lib/utils/token-amounts";

export function useUniswapQuote() {
  const { sellToken, buyToken, sellAmount, slippage, setBuyAmount } = useSwapStore(
    useShallow((s) => ({
      sellToken: s.sellToken,
      buyToken: s.buyToken,
      sellAmount: s.sellAmount,
      slippage: s.slippage,
      setBuyAmount: s.setBuyAmount,
    }))
  );
  const { address } = useAccount();

  const rawAmount = useMemo(() => {
    if (!sellToken) {
      return null;
    }

    return tryParseTokenAmountToBaseUnits(sellAmount, sellToken.decimals)?.toString() ?? null;
  }, [sellAmount, sellToken]);

  const enabled = Boolean(sellToken && buyToken && address && rawAmount);
  const sellProviderAddress = sellToken ? toProviderTokenAddress(sellToken) : null;
  const buyProviderAddress = buyToken ? toProviderTokenAddress(buyToken) : null;

  const query = useQuery({
    queryKey: [
      "uniswap-quote",
      address,
      sellToken?.chainId,
      sellProviderAddress,
      buyToken?.chainId,
      buyProviderAddress,
      rawAmount,
      slippage,
    ],
    queryFn: async () => {
      const response = await getQuoteAction({
        swapper: address!.toLowerCase(),
        tokenIn: sellProviderAddress!,
        tokenOut: buyProviderAddress!,
        tokenInChainId: sellToken!.chainId.toString(),
        tokenOutChainId: buyToken!.chainId.toString(),
        amount: rawAmount!,
        type: "EXACT_INPUT",
        slippageTolerance: slippage,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to fetch quote");
      }

      return response.data;
    },
    enabled: enabled && Boolean(sellProviderAddress && buyProviderAddress),
    refetchInterval: 30_000, // 30s — balance freshness with API credit conservation
    staleTime: 10_000,
  });

  // Sync computed output amount to the UI display store
  useEffect(() => {
    if (query.data && buyToken) {
      const formattedOut = formatTokenAmountFromBaseUnits(query.data.quote.output.amount, buyToken.decimals, 6);
      setBuyAmount(formattedOut);
    } else if (!enabled) {
      setBuyAmount("");
    }
  }, [query.data, buyToken, setBuyAmount, enabled]);

  return query;
}
