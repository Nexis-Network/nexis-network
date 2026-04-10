"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import Image from "next/image";

import { AnimatedNumberInput } from "@/components/numbers/input-animation";

interface TokenAmountRowProps {
  symbol: string;
  logoURI?: string;
  amount: string;
  onChange?: (val: string) => void;
  readOnly?: boolean;
  onTokenSelect?: () => void;
}

function TokenIcon({ symbol, logoURI }: { symbol: string; logoURI?: string }) {
  if (logoURI) {
    return (
      <div className="w-[18px] h-[18px] rounded-full overflow-hidden flex-shrink-0">
        <Image src={logoURI} alt={symbol} width={18} height={18} className="object-cover" />
      </div>
    );
  }
  // fallback: colored circle with initials
  return (
    <div className="w-[18px] h-[18px] rounded-full bg-[#3B82F6] flex items-center justify-center flex-shrink-0">
      <span className="text-[6px] font-bold text-white leading-none">{symbol.slice(0, 2)}</span>
    </div>
  );
}

export function TokenAmountRow({
  symbol,
  logoURI,
  amount,
  onChange,
  readOnly = false,
  onTokenSelect,
}: TokenAmountRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-[10px] bg-[#161616] hover:bg-[#1a1a1a] transition-colors">
      {/* Left: token selector */}
      <button
        onClick={onTokenSelect}
        className="flex items-center gap-[6px] hover:opacity-80 transition-opacity"
      >
        <TokenIcon symbol={symbol} logoURI={logoURI} />
        <span className="text-[13px] font-medium text-white">{symbol}</span>
        <ChevronDown className="w-[12px] h-[12px] text-gray-400" />
      </button>

      {/* Right: amount input */}
      <AnimatedNumberInput
        align="right"
        inputMode="decimal"
        value={amount}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        placeholder="0.00"
        className="bg-transparent text-right text-[14px] font-mono text-white w-[110px] focus:outline-none placeholder-gray-600"
      />
    </div>
  );
}
