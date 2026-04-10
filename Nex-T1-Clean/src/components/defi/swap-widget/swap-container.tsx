"use client";

import React, { useState, useEffect } from "react";
import { useSwapStore } from "@/stores/use-swap-store";
import { useShallow } from "zustand/react/shallow";
import { useDefaultSwapPair } from "@/modules/tokens/hooks/use-default-swap-pair";
import { useAccount, useChainId, useBalance } from "wagmi";
import { useUniswapQuote } from "@/hooks/use-uniswap-quote";
import { useUniswapExecution } from "@/hooks/use-uniswap-execution";
import { tryParseTokenAmountToBaseUnits } from "@/lib/utils/token-amounts";
import { TokenSelector } from "@/components/swap/token-selector";
import { useLiveAsset } from "@/hooks/use-live-asset";
import type { TokenInfo } from "@/stores/use-swap-store";

import { TokenExchangeHeader } from "./token-exchange-header";
import { SwapSellTabs } from "./swap-sell-tabs";
import { TokenAmountRow } from "./token-amount-row";
import { ExchangeRateCard } from "./exchange-rate-card";
import { SwapNowButton } from "./swap-now-button";
import { OrdersTradesPanel } from "./orders-trades-panel";

type SelectorFor = "sell" | "buy";

export function SwapWidgetContainer() {
  const {
    sellToken,
    buyToken,
    sellAmount,
    setSellAmount,
    setSellToken,
    setBuyToken,
  } = useSwapStore(
    useShallow((s) => ({
      sellToken: s.sellToken,
      buyToken: s.buyToken,
      sellAmount: s.sellAmount,
      setSellAmount: s.setSellAmount,
      setSellToken: s.setSellToken,
      setBuyToken: s.setBuyToken,
    }))
  );

  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { pair: defaultPair } = useDefaultSwapPair(chainId);

  const [mode, setMode] = useState<"swap" | "sell">("swap");
  const [selectorFor, setSelectorFor] = useState<SelectorFor>("sell");
  const [isTokenSelectorOpen, setIsTokenSelectorOpen] = useState(false);

  const { data: rawQuote, isLoading } = useUniswapQuote();
  const { status: execStatus, executeSwap } = useUniswapExecution();

  const { price: sellLivePrice } = useLiveAsset(
    sellToken?.symbol || "ETH", 0, chainId.toString()
  );
  const { price: buyLivePrice } = useLiveAsset(
    buyToken?.symbol || "USDT", 0, chainId.toString()
  );

  const sellTokenAddress =
    sellToken?.address === "native" || !sellToken?.address
      ? undefined
      : (sellToken.address as `0x${string}`);
  const buyTokenAddress =
    buyToken?.address === "native" || !buyToken?.address
      ? undefined
      : (buyToken.address as `0x${string}`);

  useBalance({
    address: address as `0x${string}`,
    // @ts-expect-error – token parameter exists at runtime
    token: sellTokenAddress,
    chainId: sellToken?.chainId,
    query: { enabled: isConnected && !!sellToken && !!address },
  });

  useBalance({
    address: address as `0x${string}`,
    // @ts-expect-error – token parameter exists at runtime
    token: buyTokenAddress,
    chainId: buyToken?.chainId,
    query: { enabled: isConnected && !!buyToken && !!address },
  });

  // Initialize default tokens only when none are selected yet (mount-only).
  useEffect(() => {
    if (!sellToken && !buyToken && defaultPair) {
      setSellToken(defaultPair.sellAsset);
      setBuyToken(defaultPair.buyAsset);
    }
  }, [buyToken, defaultPair, sellToken, setBuyToken, setSellToken]);

  const openSelector = (target: SelectorFor) => {
    setSelectorFor(target);
    setIsTokenSelectorOpen(true);
  };

  const handleTokenSelect = (token: TokenInfo) => {
    if (selectorFor === "sell") setSellToken(token);
    else setBuyToken(token);
  };

  const handleSwap = async () => {
    if (!rawQuote || !sellToken || !sellAmount) return;
    const parsedAmount = tryParseTokenAmountToBaseUnits(sellAmount, sellToken.decimals);
    if (!parsedAmount) return;
    await executeSwap({
      quote: rawQuote,
      tokenInAddress: sellToken.address,
      tokenInChainId: sellToken.chainId,
      amountInRaw: parsedAmount.toString(),
      chainId: sellToken.chainId,
    });
  };

  const isExecuting =
    execStatus !== "IDLE" && execStatus !== "SUCCESS" && execStatus !== "ERROR";

  const canExecuteSwap = Boolean(
    sellAmount &&
      sellToken &&
      buyToken &&
      rawQuote &&
      tryParseTokenAmountToBaseUnits(sellAmount, sellToken.decimals)
  );

  const buyAmountOut = rawQuote?.quote?.output?.amount || "";

  // Exchange rate string
  const exchangeRate = (() => {
    if (!sellLivePrice || !buyLivePrice || buyLivePrice === 0) return null;
    const rate = sellLivePrice / buyLivePrice;
    return rate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  })();

  const gasUsd = rawQuote?.quote?.gasFeeUSD
    ? `$${parseFloat(rawQuote.quote.gasFeeUSD).toFixed(2)}`
    : null;
  const gasPct = rawQuote?.quote?.gasFeeUSD && sellAmount && sellLivePrice
    ? `${((parseFloat(rawQuote.quote.gasFeeUSD) / (parseFloat(sellAmount) * sellLivePrice)) * 100).toFixed(2)}%`
    : null;

  const swapBtnLabel = !isConnected
    ? "Connect Wallet"
    : !sellAmount
    ? "Enter Amount"
    : isLoading
    ? "Fetching Quote..."
    : rawQuote
    ? "Swap Now"
    : "Insufficient Liquidity";

  return (
    <div className="flex flex-col w-full bg-[#111111] border border-white/[0.08] rounded-xl overflow-hidden">
      <TokenExchangeHeader />

      <SwapSellTabs activeTab={mode} onTabChange={setMode} />

      {/* Amount / Details label row */}
      <div className="flex items-center justify-between px-4 mb-[6px]">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide">Amount</span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wide">Details</span>
      </div>

      {/* Sell (top) token */}
      <TokenAmountRow
        symbol={sellToken?.symbol || "ETH"}
        logoURI={sellToken?.logoURI}
        amount={sellAmount}
        onChange={setSellAmount}
        onTokenSelect={() => openSelector("sell")}
      />

      {/* Buy (bottom) token */}
      <div className="mt-[2px]">
        <TokenAmountRow
          symbol={buyToken?.symbol || "USDT"}
          logoURI={buyToken?.logoURI}
          amount={buyAmountOut ? parseFloat(buyAmountOut).toFixed(4) : ""}
          readOnly
          onTokenSelect={() => openSelector("buy")}
        />
      </div>

      <ExchangeRateCard
        sellSymbol={sellToken?.symbol || "ETH"}
        buySymbol={buyToken?.symbol || "USDT"}
        exchangeRate={exchangeRate}
        networkFeeUsd={gasUsd}
        networkFeePct={gasPct}
        estimatedTime={rawQuote ? "~15 sec" : "Real time"}
      />

      <SwapNowButton
        label={swapBtnLabel}
        onClick={handleSwap}
        disabled={!canExecuteSwap || !isConnected || isExecuting}
        loading={isLoading || isExecuting}
      />

      <OrdersTradesPanel />

      <TokenSelector
        isOpen={isTokenSelectorOpen}
        onClose={() => setIsTokenSelectorOpen(false)}
        onSelect={handleTokenSelect}
      />
    </div>
  );
}
