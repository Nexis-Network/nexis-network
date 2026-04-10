"use client";

import { AssetTick, MOCK_ASSETS } from "@/lib/utils/asset-normalization";
import { useSafeSwap } from "@/hooks/use-safe-swap";
import { Button } from "@/components/ui/button";
import { Settings, ArrowDown } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { TokenSelectDropdown } from "./token-select-dropdown";

interface TradingTerminalProps {
  asset: AssetTick;
}

export function TradingTerminal({ asset }: TradingTerminalProps) {
  const { isLoading: isSwapping, executeSwap, fetchQuote, quote, error } = useSafeSwap();
  const [amountIn, setAmountIn] = useState("");
  const [activeTab, setActiveTab] = useState("swap");
  
  // State for From/To tokens
  const [fromToken, setFromToken] = useState<AssetTick | undefined>(MOCK_ASSETS[0]); // Default to ETH/First mock
  const [toToken, setToToken] = useState<AssetTick>(asset);

  const handleSwitch = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp || asset);
  };

  // Auto-fetch quote when amount changes
  useEffect(() => {
    const timer = setTimeout(() => {
        if (!amountIn || isNaN(Number(amountIn)) || !fromToken || !toToken) return;
        
        // Use real address if available, fallback for safety
        const fromAddr = fromToken.address === 'native' ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' : fromToken.address;
        const toAddr = toToken.address === 'native' ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' : toToken.address;

        fetchQuote({
            fromToken: fromAddr,
            toToken: toAddr,
            amount: amountIn,
            fromChainId: String(fromToken.chainId || "1"),
            toChainId: String(toToken.chainId || "1"),
            fromAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", // Mock user
        });
    }, 600);

    return () => clearTimeout(timer);
  }, [amountIn, fromToken, toToken, fetchQuote]);

  return (
    <div className="w-full p-2">
      {/* Header Tabs */}
      <div className="flex items-center justify-between px-2 mb-2">
        <div className="flex items-center gap-1">
          {['Swap', 'Limit', 'Buy', 'Sell'].map((tab) => (
             <button 
               key={tab}
               onClick={() => setActiveTab(tab.toLowerCase())}
               className={cn(
                 "px-3 py-1.5 text-sm font-medium rounded-full transition-colors",
                 activeTab === tab.toLowerCase() ? "bg-transparent text-foreground" : "text-muted-foreground hover:text-foreground"
               )}
             >
               {tab}
             </button>
          ))}
        </div>
        <button className="text-muted-foreground hover:text-foreground p-1">
             <Settings className="w-4 h-4" /> 
        </button>
      </div>

      {/* Sell Input Card */}
      <div className="bg-transparent rounded-2xl p-4 mb-1 relative border border-transparent hover:border-border/60 transition-colors">
          <div className="flex justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Sell</span>
          </div>
          <div className="flex items-center justify-between gap-4">
              <input 
                 type="text" 
                 placeholder="0" 
                 value={amountIn}
                 onChange={(e) => setAmountIn(e.target.value)}
                 className="bg-transparent text-4xl font-medium text-foreground placeholder:text-muted-foreground/60 outline-none w-full min-w-0"
              />
              <div className="w-[140px] shrink-0">
                  <TokenSelectDropdown 
                      selectedToken={fromToken} 
                      onSelect={setFromToken} 
                      chainId={String(asset.chainId)}
                  />
              </div>
          </div>
          <div className="flex justify-between mt-2">
               <span className="text-xs text-muted-foreground">
                   {amountIn && fromToken ? `$${(parseFloat(amountIn) * (fromToken.price || 0)).toFixed(2)}` : '$0.00'}
               </span>
               <span className="text-xs text-muted-foreground">Balance: 0</span>
          </div>
      </div>

      {/* Switch Arrow */}
      <div className="relative h-2 z-10">
          <div className="absolute left-1/2 -translate-x-1/2 -top-4 bg-card p-1 rounded-lg border border-border/60">
              <div 
                  className="bg-transparent p-1.5 rounded-md cursor-pointer hover:bg-accent transition-colors"
                  onClick={handleSwitch}
              >
                   <ArrowDown className="w-4 h-4 text-foreground" />
              </div>
          </div>
      </div>

      {/* Buy Input Card */}
      <div className="bg-transparent rounded-2xl p-4 relative border border-transparent hover:border-border/60 transition-colors">
          <div className="flex justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Buy</span>
          </div>
          <div className="flex items-center justify-between gap-4">
              <input 
                 type="text" 
                 placeholder="0" 
                 readOnly
                 value={quote ? quote.amountOut.toFixed(4) : ""}
                 className="bg-transparent text-4xl font-medium text-foreground placeholder:text-muted-foreground/60 outline-none w-full min-w-0"
              />
              <div className="w-[140px] shrink-0">
                  <TokenSelectDropdown 
                      selectedToken={toToken} 
                      onSelect={setToToken} 
                      chainId={String(asset.chainId)}
                  />
              </div>
          </div>
           <div className="flex justify-between mt-2">
               <span className="text-xs text-muted-foreground">
                    {quote ? `$${(quote.amountOut * (toToken?.price || 0)).toFixed(2)}` : '$0.00'}
               </span>
               <span className="text-xs text-muted-foreground">Best price</span>
          </div>
      </div>

      {/* Setup / Action Button */}
      <Button 
          className="w-full mt-2 h-12 text-lg font-semibold bg-card/60 hover:bg-accent text-muted-foreground hover:text-foreground rounded-xl"
          disabled={!quote && !amountIn}
          onClick={quote ? (() => { void executeSwap(); }) : undefined}
      >
          {isSwapping ? "Swapping..." : (quote ? "Swap" : (amountIn ? "Fetching best price..." : "Enter an amount"))}
      </Button>

      {/* Error Message */}
      {error && (
         <div className="mt-2 text-center text-xs text-destructive">
             {error}
         </div>
      )}
    </div>
  );
}
