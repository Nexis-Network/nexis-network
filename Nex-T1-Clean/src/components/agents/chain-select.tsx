"use client";

import Image from "next/image";
import { useMemo } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";

type ChainOption = {
  caip2: string;
  label: string;
  nativeSymbol: string;
  nativeDecimals: number;
  logoSrc?: string;
};

const CHAIN_OPTIONS: ChainOption[] = [
  {
    caip2: "eip155:1",
    label: "Ethereum",
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    logoSrc: LIQUID_GLASS_LOGOS.ethereum,
  },
  { caip2: "eip155:8453", label: "Base", nativeSymbol: "ETH", nativeDecimals: 18 },
  { caip2: "eip155:10", label: "Optimism", nativeSymbol: "ETH", nativeDecimals: 18 },
  {
    caip2: "solana:101",
    label: "Solana",
    nativeSymbol: "SOL",
    nativeDecimals: 9,
    logoSrc: LIQUID_GLASS_LOGOS.solana,
  },
];

export type ChainSelectValue = ChainOption;

type ChainSelectProps = {
  value?: string;
  onChange: (option: ChainOption) => void;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
};

export function ChainSelect({ value, onChange, disabled = false, id, placeholder }: ChainSelectProps) {
  const items = useMemo(() => CHAIN_OPTIONS, []);

  return (
    <Select
      value={value ?? items[0]?.caip2}
      onValueChange={(next) => {
        const option = items.find((item) => item.caip2 === next);
        if (option) onChange(option);
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder ?? "Select network"} />
      </SelectTrigger>
      <SelectContent>
        {items.map((option) => (
          <SelectItem key={option.caip2} value={option.caip2}>
            <span className="flex items-center gap-2">
              {option.logoSrc ? (
                <Image
                  src={option.logoSrc}
                  alt=""
                  width={16}
                  height={16}
                  className="shrink-0 rounded-full object-contain"
                  aria-hidden="true"
                />
              ) : null}
              <span>{option.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function chainOptionFromValue(value: string | null | undefined): ChainOption | undefined {
  if (!value) return undefined;
  return CHAIN_OPTIONS.find((item) => item.caip2 === value);
}
