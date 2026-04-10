"use client";

import { ChevronDown } from "lucide-react";
import Image from "next/image";
import { TokenInfo } from "@/stores/use-swap-store";

interface AssetInputProps {
  type: "pay" | "receive";
  token: TokenInfo | null;
  amount: string;
  balance?: string;
  usdValue?: string;
  onAmountChange?: (value: string) => void;
  onTokenClick?: () => void;
  onMaxClick?: () => void;
}

export function AssetInput({
  type,
  token,
  amount,
  balance,
  usdValue,
  onAmountChange,
  onTokenClick,
  onMaxClick,
}: AssetInputProps) {
  const isPay = type === "pay";

  if (isPay) {
    return (
      <div
        className="w-full backdrop-blur-[12px] bg-[#141415] border border-[#26272d] flex flex-col items-start p-px rounded-[12px] font-sans"
      >
        <div className="relative rounded-[12px] shrink-0 w-full">
          <div className="flex flex-col items-start justify-between pb-[10.5px] pt-[16px] px-[16px] w-full">
            <div className="flex items-start justify-between w-full">
              <div className="text-[13.1px] text-[#acadae]">Pay with</div>
              <div className="flex gap-[8px] items-center">
                <button
                  onClick={onMaxClick}
                  className="bg-[#141415] border border-[#26272d] flex h-[24px] items-center justify-center px-[7px] py-[1px] rounded-[4px] hover:bg-white/5 transition-colors"
                >
                  <span className="font-sans font-normal text-[11.6px] text-[#acadae]">Max</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between w-full mt-3">
              <input
                type="text"
                value={amount}
                onChange={(e) => onAmountChange?.(e.target.value)}
                placeholder="0"
                className="bg-transparent text-[28px] sm:text-[32px] font-medium text-white placeholder-[#acadae] outline-none min-w-0 flex-1 p-0 m-0 font-mono"
              />
              <button
                onClick={onTokenClick}
                className="bg-[#141415] border border-[#26272d] h-[40px] flex items-center justify-center px-[11px] rounded-[6px] hover:bg-[#1a1b1c] transition-colors shrink-0 ml-2"
              >
                <div className="flex items-center gap-[8px]">
                  <div className="relative w-[24px] h-[24px] rounded-full overflow-hidden bg-[#2C2C2C] flex items-center justify-center shrink-0">
                    {token ? (
                      token.logoURI ? (
                        <Image src={token.logoURI} alt={token.symbol} fill className="object-cover" />
                      ) : (
                        <span className="text-white font-bold text-[10px]">{token.symbol.substring(0,2)}</span>
                      )
                    ) : null}
                  </div>
                  <span className="font-sans font-medium text-[13.7px] text-white">
                    {token ? token.symbol : "Select"}
                  </span>
                  <ChevronDown className="text-[#acadae] w-[20px] h-[20px] ml-1" />
                </div>
              </button>
            </div>

            <div className="flex items-center justify-between w-full mt-3">
              <span className="text-[14px] font-mono font-normal text-[#acadae]">
                {usdValue || "$0.00"}
              </span>
              <span className="text-[14px] font-mono font-normal text-[#acadae] truncate ml-2">
                {balance || "0.00"} {token?.symbol}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full backdrop-blur-[12px] bg-[#141415] border border-[#26272d] flex flex-col items-start p-px rounded-[12px] font-sans"
    >
      <div className="relative rounded-[12px] shrink-0 w-full">
        <div className="flex flex-col gap-[0px] items-start justify-between p-[16px] w-full">
          <div className="flex items-start w-full">
            <span className="text-[13.2px] text-[#acadae] leading-[21px]">Receive</span>
          </div>

          <div className="flex items-center justify-between w-full mt-3">
            <input
              type="text"
              value={amount || "—"}
              readOnly
              className="bg-transparent text-[20px] font-mono font-medium text-white opacity-75 placeholder-[#acadae] outline-none min-w-0 flex-1 p-0 m-0"
            />
            <button
              onClick={onTokenClick}
              className="bg-[#141415] border border-[#26272d] h-[40px] flex items-center justify-center px-[11px] rounded-[6px] opacity-40 hover:opacity-100 hover:bg-[#1a1b1c] transition-colors shrink-0 ml-2"
            >
              <div className="flex items-center gap-[8px]">
                <div className="relative w-[24px] h-[24px] rounded-full overflow-hidden bg-[#2C2C2C] flex items-center justify-center shrink-0">
                  {token ? (
                    token.logoURI ? (
                      <Image src={token.logoURI} alt={token.symbol} fill className="object-cover" />
                    ) : (
                      <span className="text-white font-bold text-[10px]">{token.symbol.substring(0,2)}</span>
                    )
                  ) : null}
                </div>
                <span className="font-sans font-medium text-[13.9px] text-white">
                  {token ? token.symbol : "Select"}
                </span>
                <ChevronDown className="text-[#acadae] w-[20px] h-[20px] ml-1" />
              </div>
            </button>
          </div>

          <div className="flex items-center justify-between w-full mt-3">
            <span className="text-[14px] font-mono font-normal text-[#acadae] leading-[21px]">
              $0.00
            </span>
            <span className="text-[14px] font-mono font-normal text-[#acadae] leading-[21px] truncate ml-2">
              0.00 {token?.symbol}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
