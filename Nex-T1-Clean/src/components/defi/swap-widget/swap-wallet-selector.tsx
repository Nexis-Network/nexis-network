"use client";

import React from "react";
import { ChevronDown, Wallet, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwapWalletSelectorProps {
  selectedWallet?: string;
  onSelect?: (wallet: string) => void;
  error?: string;
}

export function SwapWalletSelector({ selectedWallet, onSelect, error }: SwapWalletSelectorProps) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-xl bg-[#131313] border border-white/5 w-full mt-2">
      <span className="text-sm text-gray-300 font-medium">Destination wallet</span>
      
      <button 
        onClick={() => onSelect?.("dummy_action_or_open_modal")}
        className={cn(
          "flex items-center justify-between w-full px-3 py-2.5 rounded-lg bg-[#0A0A0A] border transition-colors",
          error ? "border-red-500/50" : "border-white/10 hover:border-white/20"
        )}
      >
        <div className="flex items-center gap-3">
          <Wallet className="w-4 h-4 text-gray-400" />
          <span className={cn("text-sm", selectedWallet ? "text-white" : "text-gray-500")}>
            {selectedWallet || "Select destination wallet"}
          </span>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>

      {error && (
        <div className="flex items-center gap-1.5 mt-1 text-red-500 text-xs">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
