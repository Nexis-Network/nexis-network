"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowDownUp, CheckCircle2, AlertCircle } from "lucide-react";
import { AssetInput } from "./asset-input";
import { useSwapStore, TokenInfo } from "@/stores/use-swap-store";
import { useShallow } from "zustand/react/shallow";
import {
  formatBalanceInputValue,
  formatDisplayBalance,
} from "@/lib/cdp/cdp-balance-format";
import { getChainInfo } from "@/modules/tokens/chains";
import { getNativeAssetForChain } from "@/modules/tokens/utils/asset-id";
import { Button } from "@/components/ui/button";

import { TokenSelector } from "./token-selector";
import { SlippageSettings } from "./slippage-settings";

import { useSwapQuoteHook } from "@/hooks/use-swap-quote";
import { useResolvedCdpWallets } from "@/lib/cdp/use-resolved-cdp-wallets";
import { useCdpBalance } from "@/lib/hooks/cdp/use-cdp-balance";
import { createClient } from "@/lib/supabase/client";

interface SwapWidgetProps {
    defaultToken?: TokenInfo;
}

export function SwapWidget({ defaultToken }: SwapWidgetProps) {
  const {
    sellToken,
    buyToken,
    sellAmount,
    buyAmount,
    slippage,
    setSellAmount,
    setBuyAmount,
    switchTokens,
    setSellToken,
    setBuyToken,
    quote,
    isLoading,
    error,
  } = useSwapStore(
    useShallow((s) => ({
      sellToken: s.sellToken,
      buyToken: s.buyToken,
      sellAmount: s.sellAmount,
      buyAmount: s.buyAmount,
      slippage: s.slippage,
      setSellAmount: s.setSellAmount,
      setBuyAmount: s.setBuyAmount,
      switchTokens: s.switchTokens,
      setSellToken: s.setSellToken,
      setBuyToken: s.setBuyToken,
      quote: s.quote,
      isLoading: s.isLoading,
      error: s.error,
    }))
  );

  // Use the swap logic hook
  useSwapQuoteHook();

  // Nex Wallet integration
  const { evmAddress: cdpEvmAddress } = useResolvedCdpWallets();
  const { data: cdpBalance } = useCdpBalance(
    cdpEvmAddress,
    "evm",
    sellToken?.chainId,
  );
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapResult, setSwapResult] = useState<{ txHash: string } | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);

  // Reset swap result/error when inputs change
  useEffect(() => {
    setSwapResult(null);
    setSwapError(null);
  }, [sellToken, buyToken, sellAmount]);

  // Derive CDP balance display for the sell token
  const isNativeSellToken = sellToken?.isNative === true || sellToken?.standard === "NATIVE";
  const cdpSellBalance = isNativeSellToken
    ? cdpBalance?.native?.balance ?? null
    : cdpBalance?.tokens?.find(
        (t) => t.address?.toLowerCase() === sellToken?.address?.toLowerCase(),
      )?.balance ?? null;
  const cdpSellDecimals = isNativeSellToken
    ? cdpBalance?.native?.decimals ?? sellToken?.decimals ?? 18
    : cdpBalance?.tokens?.find(
        (t) => t.address?.toLowerCase() === sellToken?.address?.toLowerCase(),
      )?.decimals ?? sellToken?.decimals ?? 18;

  const handleCdpSwap = useCallback(async () => {
    if (!cdpEvmAddress || !sellToken || !buyToken || !sellAmount) return;
    setIsSwapping(true);
    setSwapError(null);
    setSwapResult(null);
    try {
      const session = await createClient().auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch(`/api/cdp/wallets/${encodeURIComponent(cdpEvmAddress)}/swap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fromToken: sellToken.address,
          toToken: buyToken.address,
          amount: sellAmount,
          chainId: sellToken.chainId,
          slippageBps: Math.round(slippage * 100),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? data.error ?? "Swap failed");
      setSwapResult({ txHash: data.data?.txHash ?? data.txHash ?? "" });
    } catch (err) {
      setSwapError(err instanceof Error ? err.message : "Swap failed");
    } finally {
      setIsSwapping(false);
    }
  }, [cdpEvmAddress, sellToken, buyToken, sellAmount, slippage]);

  const canSwap =
    !!sellAmount &&
    !!sellToken &&
    !!buyToken &&
    !isLoading &&
    !isSwapping &&
    (!!cdpEvmAddress || !!quote);

  const [isTokenSelectorOpen, setIsTokenSelectorOpen] = useState(false);
  const [selectorType, setSelectorType] = useState<"pay" | "receive">("pay");

  const openTokenSelector = (type: "pay" | "receive") => {
    setSelectorType(type);
    setIsTokenSelectorOpen(true);
  };

  const handleTokenSelect = (token: TokenInfo) => {
    if (selectorType === "pay") {
      setSellToken(token);
    } else {
      setBuyToken(token);
    }
  };

  // Mock initial state for visualization if empty
  useEffect(() => {
    if (!sellToken) {
        if (defaultToken) {
            setSellToken(defaultToken);
        } else {
            const nativeAsset = getNativeAssetForChain(1);
            const chain = getChainInfo(1);
            if (!chain) {
              return;
            }
            setSellToken({
              ...nativeAsset,
              chain,
              supportStatus: "supported",
              safetyStatus: "default",
              liquidityPairs: [],
              sources: ["registry"],
              tags: ["default"],
              isVerified: true,
              isCustom: false,
              logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
            });
        }
    }
  }, [sellToken, setSellToken, defaultToken]);

  // Derived Values from Quote
  const sellUsd = quote?.aggregator?.quote?.fromAmountUSD 
      ? `$${parseFloat(quote.aggregator.quote.fromAmountUSD).toFixed(2)}` 
      : "$0.00";
      
  const buyUsd = quote?.aggregator?.quote?.toAmountUSD
      ? `$${parseFloat(quote.aggregator.quote.toAmountUSD).toFixed(2)}`
      : "$0.00";

  // Format CDP sell-side balance for display
  const sellBalanceDisplay = cdpEvmAddress && cdpSellBalance
    ? formatDisplayBalance(cdpSellBalance, cdpSellDecimals)
    : "0.0000...04";

  const sellMaxAmount = cdpEvmAddress && cdpSellBalance
    ? formatBalanceInputValue(cdpSellBalance, cdpSellDecimals)
    : "0.000004";

  return (
    <div className="flex flex-col items-center gap-0 p-0 w-full" style={{ fontFamily: "var(--font-geist-sans)" }}>

      {/* Top Header Row with Wallet & Settings (Outside the cards) */}
      <div className="mb-4 flex w-full max-w-[372.7px] items-center justify-between px-1">
         {/* Nex Wallet indicator */}
         {cdpEvmAddress ? (
           <div className="flex items-center gap-2 text-xs text-muted-foreground">
             <div className="h-2 w-2 rounded-full bg-green-500" />
             <span className="font-mono">{cdpEvmAddress.slice(0, 6)}...{cdpEvmAddress.slice(-4)}</span>
             <span className="text-zinc-500">Nex Wallet</span>
           </div>
         ) : (
           <div />
         )}
         {/* Advanced Settings - using SlippageSettings popover */}
         <SlippageSettings />
      </div>

      {/* Swap Inputs Container */}
      <div className="relative flex w-full max-w-[372.7px] flex-col items-center gap-2">
        <AssetInput
          type="pay"
          token={sellToken}
          amount={sellAmount}
          onAmountChange={setSellAmount}
          balance={sellBalanceDisplay}
          usdValue={sellUsd}
          onTokenClick={() => openTokenSelector("pay")}
          onMaxClick={() => setSellAmount(sellMaxAmount)}
        />

        {/* Switch Button — centered between the two inputs */}
        <div className="-my-3 z-30 flex items-center justify-center">
             <button
               onClick={switchTokens}
               className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[#131313] border-[4px] border-[#0f0f10] shadow-sm hover:bg-transparent transition-colors group"
             >
                <ArrowDownUp className="h-4 w-4 text-[#9A9A9A] group-hover:text-white transition-colors" />
             </button>
        </div>

        <AssetInput
          type="receive"
          token={buyToken}
          amount={quote?.amountOut ? quote.amountOut.toFixed(6) : buyAmount}
          onAmountChange={setBuyAmount}
          balance="-"
          usdValue={buyUsd}
          onTokenClick={() => openTokenSelector("receive")}
        />
      </div>

      {/* Error from quote hook */}
      {error ? (
        <div className="mt-4 w-full max-w-[372.7px] rounded-[12px] border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      ) : null}

      {/* CDP swap error */}
      {swapError ? (
        <div className="mt-4 flex w-full max-w-[372.7px] items-center gap-2 rounded-[12px] border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {swapError}
        </div>
      ) : null}

      {/* CDP swap success */}
      {swapResult ? (
        <div className="mt-4 flex w-full max-w-[372.7px] items-center gap-2 rounded-[12px] border border-green-500/25 bg-green-500/10 px-3 py-2 text-xs text-green-300">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>Swap complete</span>
          {swapResult.txHash && (
            <span className="font-mono text-green-400">{swapResult.txHash.slice(0, 10)}...</span>
          )}
        </div>
      ) : null}

      {/* Action Button */}
      <Button
        className="mt-4 h-[56px] sm:h-[64px] w-full max-w-[372.7px] rounded-[20px] bg-[#7C7C7C] text-[16px] sm:text-[18px] font-medium text-[#3F3F3F] hover:bg-[#8C8C8C] shadow-none disabled:opacity-50"
        disabled={!canSwap}
        onClick={cdpEvmAddress ? handleCdpSwap : undefined}
      >
        {isSwapping
          ? "Swapping..."
          : swapResult
            ? "Swap Complete!"
            : cdpEvmAddress
              ? "Swap"
              : isLoading
                ? "Fetching Quote..."
                : "Connect Wallet"}
      </Button>

      <TokenSelector
        isOpen={isTokenSelectorOpen}
        onClose={() => setIsTokenSelectorOpen(false)}
        onSelect={handleTokenSelect}
      />
    </div>
  );
}
