'use client';

import React, { useEffect, useState } from "react";
import { ArrowDownUp, Settings as SettingsIcon, Info } from "lucide-react";
import { useSwapStore, TokenInfo } from "@/stores/use-swap-store";
import { useShallow } from "zustand/react/shallow";
import { TokenSelector } from "@/components/swap/token-selector";
import { useDefaultSwapPair } from "@/modules/tokens/hooks/use-default-swap-pair";
import { SlippageSettings } from "@/components/swap/slippage-settings";
import { AssetInput } from "@/components/swap/asset-input";
import { useAccount, useChainId } from "wagmi";
import { useUniswapExecution, SwapExecutionStatus } from "@/hooks/use-uniswap-execution";
import { useUniswapQuote } from "@/hooks/use-uniswap-quote";
import { TxProgressStepper } from "@/components/swap/tx-progress-stepper";
import { tryParseTokenAmountToBaseUnits } from "@/lib/utils/token-amounts";
import { DestinationWalletSelector } from "@/components/swap/destination-wallet-selector";

export function UniswapSwapForm() {
  const {
    sellToken,
    buyToken,
    sellAmount,
    buyAmount,
    setSellAmount,
    switchTokens,
    setSellToken,
    setBuyToken,
  } = useSwapStore(
    useShallow((s) => ({
      sellToken: s.sellToken,
      buyToken: s.buyToken,
      sellAmount: s.sellAmount,
      buyAmount: s.buyAmount,
      setSellAmount: s.setSellAmount,
      switchTokens: s.switchTokens,
      setSellToken: s.setSellToken,
      setBuyToken: s.setBuyToken,
    }))
  );

  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { pair: defaultPair } = useDefaultSwapPair(chainId);

  const [isTokenSelectorOpen, setIsTokenSelectorOpen] = useState(false);
  const [selectorType, setSelectorType] = useState<"pay" | "receive">("pay");
  const [destinationAddress, setDestinationAddress] = useState<string | null>(null);
  const [isBuyMode, setIsBuyMode] = useState(true);
  
  const { data: rawQuote, isLoading, error: quoteError } = useUniswapQuote();

  const openTokenSelector = (type: "pay" | "receive") => {
    setSelectorType(type);
    setIsTokenSelectorOpen(true);
  };

  const handleTokenSelect = (token: TokenInfo) => {
    if (selectorType === "pay") setSellToken(token);
    else setBuyToken(token);
  };
  
  // Initialize default tokens only when none are selected yet (mount-only).
  useEffect(() => {
    if (!sellToken && !buyToken && defaultPair) {
      setSellToken(defaultPair.sellAsset);
      setBuyToken(defaultPair.buyAsset);
    }
  }, [buyToken, defaultPair, sellToken, setBuyToken, setSellToken]);

  const sellUsd = "$0.00"; 
  const buyUsd = rawQuote?.quote?.gasFeeUSD ? `Est. network fee: $${parseFloat(rawQuote.quote.gasFeeUSD).toFixed(2)}` : "$0.00";

  const { status: execStatus, error: execError, executeSwap } = useUniswapExecution();

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

  const isExecuting = execStatus !== 'IDLE' && execStatus !== 'SUCCESS' && execStatus !== 'ERROR';
  const displayError = (quoteError as Error)?.message || execError;
  const canExecuteSwap = Boolean(
    sellAmount &&
      sellToken &&
      buyToken &&
      rawQuote &&
      tryParseTokenAmountToBaseUnits(sellAmount, sellToken.decimals),
  );

  return (
    <div className="flex flex-col items-start w-[341.66px] font-sans">
      <div className="flex flex-col gap-[12px] items-start relative w-full">
        
        {/* Header Options */}
        <div className="flex items-start justify-between relative w-full">
          <div className="flex gap-[8px] items-center relative">
            <button 
              onClick={() => {
                if (!isBuyMode && !isExecuting) {
                  switchTokens();
                  setIsBuyMode(true);
                }
              }}
              className={`border border-[rgba(255,255,255,0.12)] flex h-[32px] items-center justify-center px-[11px] rounded-[6px] text-[14px] transition-colors ${
                isBuyMode
                  ? "backdrop-blur-[20px] bg-[rgba(255,255,255,0.08)] text-white"
                  : "backdrop-blur-[20px] bg-[rgba(255,255,255,0.02)] text-[#acadae] hover:bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)]"
              }`}
            >
              Buy
            </button>
            <button 
              onClick={() => {
                if (isBuyMode && !isExecuting) {
                  switchTokens();
                  setIsBuyMode(false);
                }
              }}
              className={`border border-[rgba(255,255,255,0.12)] flex h-[32px] items-center justify-center px-[11px] rounded-[6px] text-[14px] transition-colors ${
                !isBuyMode
                  ? "backdrop-blur-[20px] bg-[rgba(255,255,255,0.08)] text-white"
                  : "backdrop-blur-[20px] bg-[rgba(255,255,255,0.02)] text-[#acadae] hover:bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)]"
              }`}
            >
              Sell
            </button>
          </div>
          <div className="flex gap-[4px] items-start relative">
            <button className="border border-transparent flex h-[32px] items-center justify-center px-[11px] rounded-[6px] text-[#acadae] text-[14px] hover:bg-[#141415] transition-colors gap-1">
              Auto <span className="text-[#3c3d40] mx-[2px]">|</span> 1%
            </button>
            <SlippageSettings
              triggerAriaLabel="Open slippage settings"
              triggerClassName="border border-transparent flex h-[32px] w-[32px] items-center justify-center rounded-[6px] hover:bg-[#141415] transition-colors relative z-20 overflow-visible group"
              buttonContent={<SettingsIcon className="w-[18px] h-[18px] text-[#acadae]" />}
            />
          </div>
        </div>

        {displayError && (
          <div className="w-full bg-red-500/10 border border-red-500/20 p-2 rounded text-red-400 text-xs flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0" />
            <span className="truncate">{displayError}</span>
          </div>
        )}

        {/* Swap Inputs Stack */}
        <div className="h-[297px] relative w-full shrink-0">
          <AssetInput
            type="pay"
            token={sellToken}
            amount={sellAmount}
            onAmountChange={setSellAmount}
            balance="0.00"
            usdValue={sellUsd}
            onTokenClick={() => !isExecuting && openTokenSelector("pay")}
            onMaxClick={() => !isExecuting && setSellAmount("0.00")}
          />

          <div className="absolute h-[12px] left-0 right-0 top-[162px] z-10">
            <div className="relative w-full h-full flex justify-center items-center">
              <button
                onClick={() => !isExecuting && switchTokens()}
                disabled={isExecuting}
                className="absolute bg-[#141415] border border-[#26272d] flex items-center justify-center p-[7px] rounded-[8px] w-[32px] h-[32px] hover:bg-[#1a1b1c] transition-colors disabled:opacity-50"
              >
                <ArrowDownUp className="h-[18px] w-[18px] text-[#acadae]" />
              </button>
            </div>
          </div>

          <AssetInput
            type="receive"
            token={buyToken}
            amount={buyAmount}
            onAmountChange={() => {}} 
            balance="0.00"
            usdValue={buyUsd}
            onTokenClick={() => !isExecuting && openTokenSelector("receive")}
          />
        </div>

        {/* Destination Wallet */}
        <DestinationWalletSelector 
          selectedAddress={destinationAddress}
          onSelect={setDestinationAddress}
        />

        {/* CTA Button */}
        <button
          className="bg-[rgba(7,134,255,0.4)] flex h-[40px] items-center justify-center text-white text-[13.6px] font-medium leading-[21px] rounded-[6px] w-full hover:bg-[rgba(7,134,255,0.6)] transition-colors disabled:cursor-not-allowed px-[20px]"
          disabled={!canExecuteSwap || isLoading || !isConnected || isExecuting}
          onClick={handleSwap}
        >
          {!isConnected 
            ? "Connect Wallet" 
            : isExecuting
              ? execStatus.replace('_', ' ')
              : isLoading 
                ? "Fetching Route..." 
                : rawQuote 
                  ? "Buy" 
                  : "Enter Amount"
          } 
        </button>

        {execStatus !== 'IDLE' && (
          <div className="mt-2 w-full">
            <TxProgressStepper steps={getSwapSteps(execStatus)} />
          </div>
        )}

        <TokenSelector
          isOpen={isTokenSelectorOpen}
          onClose={() => setIsTokenSelectorOpen(false)}
          onSelect={handleTokenSelect}
        />
      </div>
    </div>
  );
}

function getSwapSteps(status: SwapExecutionStatus) {
  const steps = [
    {
      id: "approval",
      label: "Token Approval",
      description: "Checking and granting token spending allowance",
      status: "idle" as "idle" | "loading" | "success" | "error"
    },
    {
      id: "permit",
      label: "Sign Permit",
      description: "Sign gasless permission for Uniswap to trade",
      status: "idle" as "idle" | "loading" | "success" | "error"
    },
    {
      id: "swap",
      label: "Execute Swap",
      description: "Submit transaction to the network",
      status: "idle" as "idle" | "loading" | "success" | "error"
    }
  ];

  if (status === "IDLE") return steps;

  if (['CHECKING_APPROVAL', 'APPROVING', 'WAITING_APPROVAL'].includes(status)) {
    steps[0].status = 'loading';
  } else if (status === 'ERROR' && steps[0].status === 'loading') { 
    steps[0].status = 'error';
  } else if (['SIGNING_PERMIT', 'CONFIGURING_SWAP', 'SUBMITTING', 'SUCCESS'].includes(status)) {
    steps[0].status = 'success';
  }

  if (status === 'SIGNING_PERMIT') {
    steps[1].status = 'loading';
  } else if (['CONFIGURING_SWAP', 'SUBMITTING', 'SUCCESS'].includes(status)) {
    steps[1].status = 'success';
  }

  if (['CONFIGURING_SWAP', 'SUBMITTING'].includes(status)) {
    steps[2].status = 'loading';
  } else if (status === 'SUCCESS') {
    steps[2].status = 'success';
  } else if (status === 'ERROR') {
    const activeStep = steps.find(s => s.status !== 'success');
    if (activeStep) activeStep.status = 'error';
  }

  return steps;
}
