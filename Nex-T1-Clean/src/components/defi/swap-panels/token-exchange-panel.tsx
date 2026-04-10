"use client";

import { useState, useEffect, useMemo } from "react";
import { useSwapStore, type TokenInfo } from "@/stores/use-swap-store";
import { useShallow } from "zustand/react/shallow";
import { useDefaultSwapPair } from "@/modules/tokens/hooks/use-default-swap-pair";
import { useAccount, useChainId, useBalance } from "wagmi";
import { useUniswapQuote } from "@/hooks/use-uniswap-quote";
import { useUniswapExecution } from "@/hooks/use-uniswap-execution";
import { tryParseTokenAmountToBaseUnits } from "@/lib/utils/token-amounts";
import { AnimatedNumberInput } from "@/components/numbers/input-animation";
import { TokenSelector } from "@/components/swap/token-selector";
import { useLiveAsset } from "@/hooks/use-live-asset";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ExternalLink, MoreHorizontal, ChevronDown } from "lucide-react";

// ─── Sub-components ──────────────────────────────────────────────

function TokenIcon({ symbol, logoURI, size = 20 }: { symbol: string; logoURI?: string; size?: number }) {
  if (logoURI) {
    return (
      <div className="flex-shrink-0 overflow-hidden rounded-full" style={{ width: size, height: size }}>
        <Image src={logoURI} alt={symbol} width={size} height={size} className="object-cover" unoptimized />
      </div>
    );
  }
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-full bg-[#3B82F6]"
      style={{ width: size, height: size }}
    >
      <span className="text-[8px] font-bold text-white leading-none">{symbol.slice(0, 2)}</span>
    </div>
  );
}

function TokenPairLogo({ sell, buy, size = 18 }: {
  sell: { symbol: string; logoURI?: string };
  buy: { symbol: string; logoURI?: string };
  size?: number;
}) {
  return (
    <div className="flex -space-x-1.5 flex-shrink-0">
      <div className="relative z-10">
        <TokenIcon symbol={sell.symbol} logoURI={sell.logoURI} size={size} />
      </div>
      <div className="relative z-0">
        <TokenIcon symbol={buy.symbol} logoURI={buy.logoURI} size={size} />
      </div>
    </div>
  );
}

// ─── Main panel ──────────────────────────────────────────────────

type SelectorFor = "sell" | "buy";

export function TokenExchangePanel() {
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
  const { status: execStatus, error: execError, executeSwap } = useUniswapExecution();

  // Keep only sellLivePrice for gas percentage calculation
  const { price: sellLivePrice } = useLiveAsset(sellToken?.symbol || "ETH", 0, chainId.toString());

  const sellTokenAddress =
    sellToken?.address === "native" || !sellToken?.address ? undefined : (sellToken.address as `0x${string}`);

  // Fetch on-chain balance for connected wallet
  useBalance({
    address: address as `0x${string}`,
    // @ts-expect-error – token parameter exists at runtime
    token: sellTokenAddress,
    chainId: sellToken?.chainId,
    query: { enabled: isConnected && !!sellToken && !!address },
  });

  // Initialize default tokens only when none are selected yet.
  // We must NOT reset on every chainId change — the user may intentionally
  // select cross-chain tokens. The wagmi chainId reflects the wallet's
  // connected network, not the swap-pair intent.
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

  const isExecuting = execStatus !== "IDLE" && execStatus !== "SUCCESS" && execStatus !== "ERROR";
  const canExecuteSwap = Boolean(
    sellAmount && sellToken && buyToken && rawQuote && tryParseTokenAmountToBaseUnits(sellAmount, sellToken.decimals)
  );

  const buyAmountOut = rawQuote?.quote?.output?.amount || "";

  // Derive exchange rate from quote (no extra API call)
  const exchangeRate = useMemo(() => {
    if (!rawQuote || !sellToken || !buyToken) return null;
    const inAmount = parseFloat(rawQuote.quote.input.amount) / (10 ** sellToken.decimals);
    const outAmount = parseFloat(rawQuote.quote.output.amount) / (10 ** buyToken.decimals);
    if (inAmount <= 0) return null;
    const rate = outAmount / inAmount;
    return rate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [rawQuote, sellToken, buyToken]);

  // Gas fee display
  const gasUsd = rawQuote?.quote?.gasFeeUSD
    ? `$${parseFloat(rawQuote.quote.gasFeeUSD).toFixed(2)}`
    : null;
  const gasPct =
    rawQuote?.quote?.gasFeeUSD && sellAmount && sellLivePrice
      ? `${((parseFloat(rawQuote.quote.gasFeeUSD) / (parseFloat(sellAmount) * sellLivePrice)) * 100).toFixed(2)}%`
      : null;

  // Estimated swap fee (Uniswap V3 standard LP fee ~0.3%)
  const swapFeeUsd = useMemo(() => {
    if (!sellAmount || !sellLivePrice) return null;
    const inputValueUsd = parseFloat(sellAmount) * sellLivePrice;
    if (!Number.isFinite(inputValueUsd) || inputValueUsd <= 0) return null;
    const fee = inputValueUsd * 0.003; // 0.3% standard Uniswap V3 fee tier
    return `$${fee.toFixed(2)}`;
  }, [sellAmount, sellLivePrice]);

  const swapBtnLabel = !isConnected
    ? "Connect Wallet"
    : !sellAmount
      ? "Enter Amount"
      : isLoading
        ? "Fetching Quote..."
        : rawQuote
          ? "Swap Now"
          : "Insufficient Liquidity";

  const sellSymbol = sellToken?.symbol || "ETH";
  const buySymbol = buyToken?.symbol || "USDT";

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#0F0F10]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <span className="text-[13px] font-medium text-white tracking-[0.01em]">Token Exchange</span>
        <div className="flex items-center gap-3">
          <button className="text-gray-400 hover:text-white transition-colors">
            <ExternalLink className="w-[14px] h-[14px]" />
          </button>
          <button className="text-gray-400 hover:text-white transition-colors">
            <MoreHorizontal className="w-[14px] h-[14px]" />
          </button>
        </div>
      </div>

      {/* Swap / Sell tabs */}
      <div className="mx-4 mb-3 flex items-center bg-[#1A1A1A] rounded-lg p-[3px] gap-[2px]">
        {(["swap", "sell"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMode(tab)}
            className={cn(
              "flex-1 py-[5px] rounded-md text-[12px] font-medium capitalize transition-colors",
              mode === tab ? "bg-[#252525] text-white shadow-sm" : "text-gray-400 hover:text-gray-300"
            )}
          >
            {tab === "swap" ? "Swap" : "Sell"}
          </button>
        ))}
      </div>

      {/* Amount / Details row */}
      <div className="flex items-center justify-between px-4 mb-[6px]">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide">Amount</span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wide">Details</span>
      </div>

      {/* Sell token row */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-[10px] sm:py-[12px] bg-[#161616] hover:bg-[#1a1a1a] transition-colors">
        <button onClick={() => openSelector("sell")} className="flex items-center gap-[6px] hover:opacity-80 transition-opacity shrink-0">
          <TokenIcon symbol={sellSymbol} logoURI={sellToken?.logoURI} size={18} />
          <span className="text-[13px] font-medium text-white">{sellSymbol}</span>
          <ChevronDown className="w-[12px] h-[12px] text-gray-400" />
        </button>
        <AnimatedNumberInput
          align="right"
          inputMode="decimal"
          value={sellAmount}
          onChange={(e) => setSellAmount(e.target.value)}
          placeholder="0.00"
          className="bg-transparent text-right text-[14px] font-mono text-white min-w-0 flex-1 ml-2 focus:outline-none placeholder-gray-600"
        />
      </div>

      {/* Buy token row */}
      <div className="mt-[2px] flex items-center justify-between px-3 sm:px-4 py-[10px] sm:py-[12px] bg-[#161616] hover:bg-[#1a1a1a] transition-colors">
        <button onClick={() => openSelector("buy")} className="flex items-center gap-[6px] hover:opacity-80 transition-opacity shrink-0">
          <TokenIcon symbol={buySymbol} logoURI={buyToken?.logoURI} size={18} />
          <span className="text-[13px] font-medium text-white">{buySymbol}</span>
          <ChevronDown className="w-[12px] h-[12px] text-gray-400" />
        </button>
        <AnimatedNumberInput
          align="right"
          inputMode="decimal"
          value={buyAmountOut ? parseFloat(buyAmountOut).toFixed(4) : ""}
          readOnly
          placeholder="0.00"
          className="bg-transparent text-right text-[14px] font-mono text-white min-w-0 flex-1 ml-2 focus:outline-none placeholder-gray-600"
        />
      </div>

      {/* Exchange rate details */}
      <div className="border-t border-white/[0.06] mt-1">
        <div className="flex items-center justify-between px-3 sm:px-4 py-[7px] gap-2">
          <span className="text-[10px] sm:text-[11px] text-gray-400 shrink-0">Exchange Rate</span>
          <div className="flex items-center gap-[6px] min-w-0">
            {sellToken && buyToken && (
              <TokenPairLogo
                sell={{ symbol: sellSymbol, logoURI: sellToken.logoURI }}
                buy={{ symbol: buySymbol, logoURI: buyToken.logoURI }}
                size={14}
              />
            )}
            <span className="text-[10px] sm:text-[11px] font-mono text-white text-right truncate">
              {exchangeRate ? `1 ${sellSymbol} = ${exchangeRate} ${buySymbol}` : "Enter amount for rate"}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between px-3 sm:px-4 py-[7px]">
          <span className="text-[10px] sm:text-[11px] text-gray-400">Network Fee</span>
          <span className="text-[10px] sm:text-[11px] font-mono text-white text-right">
            {gasUsd && gasPct ? `${gasUsd} (${gasPct})` : gasUsd ?? "—"}
          </span>
        </div>
        <div className="flex items-center justify-between px-3 sm:px-4 py-[7px]">
          <span className="text-[10px] sm:text-[11px] text-gray-400">Swap Fee</span>
          <span className="text-[10px] sm:text-[11px] font-mono text-white text-right">
            {swapFeeUsd ? `~${swapFeeUsd} (0.3%)` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between px-3 sm:px-4 py-[7px]">
          <span className="text-[10px] sm:text-[11px] text-gray-400">Est. Time</span>
          <span className="text-[10px] sm:text-[11px] font-mono text-white text-right">
            {rawQuote ? "~15 sec" : "Real time"}
          </span>
        </div>
      </div>

      {/* Swap button */}
      <div className="px-4 mt-3 mb-4">
        <button
          onClick={handleSwap}
          disabled={!canExecuteSwap || !isConnected || isExecuting}
          className={cn(
            "w-full h-[40px] rounded-lg text-[13px] font-semibold transition-all",
            "bg-[#c4c4c4] text-[#0A0A0A] hover:bg-white",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        >
          {isLoading || isExecuting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Processing...
            </span>
          ) : (
            swapBtnLabel
          )}
        </button>
      </div>

      {execError && (
        <div className="mx-4 mb-3 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {execError}
        </div>
      )}

      <TokenSelector isOpen={isTokenSelectorOpen} onClose={() => setIsTokenSelectorOpen(false)} onSelect={handleTokenSelect} />
    </div>
  );
}
