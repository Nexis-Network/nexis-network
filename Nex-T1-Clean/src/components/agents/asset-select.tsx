"use client";

import Image from "next/image";
import { useMemo } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";

type AssetOption = {
  caip19: string | null;
  label: string;
  symbol: string;
  decimals: number;
  logoSrc?: string;
};

const CHAIN_ASSET_MAP: Record<string, AssetOption[]> = {
  "eip155:1": [
    {
      caip19: null,
      label: "ETH (native)",
      symbol: "ETH",
      decimals: 18,
      logoSrc: LIQUID_GLASS_LOGOS.ethereum,
    },
    {
      caip19: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      label: "USDC",
      symbol: "USDC",
      decimals: 6,
      logoSrc: LIQUID_GLASS_LOGOS.usdc,
    },
  ],
  "eip155:8453": [
    {
      caip19: null,
      label: "ETH (native)",
      symbol: "ETH",
      decimals: 18,
      logoSrc: LIQUID_GLASS_LOGOS.ethereum,
    },
    {
      caip19: "eip155:8453/erc20:0xd9aaec86b65d86f6a7b5b1b0c8c3a7c7e3c4f1f3",
      label: "USDC",
      symbol: "USDC",
      decimals: 6,
      logoSrc: LIQUID_GLASS_LOGOS.usdc,
    },
  ],
  "eip155:10": [
    {
      caip19: null,
      label: "ETH (native)",
      symbol: "ETH",
      decimals: 18,
      logoSrc: LIQUID_GLASS_LOGOS.ethereum,
    },
    {
      caip19: "eip155:10/erc20:0x7f5c764cbc14f9669b88837ca1490cca17c31607",
      label: "USDC",
      symbol: "USDC",
      decimals: 6,
      logoSrc: LIQUID_GLASS_LOGOS.usdc,
    },
  ],
  "solana:101": [
    {
      caip19: null,
      label: "SOL (native)",
      symbol: "SOL",
      decimals: 9,
      logoSrc: LIQUID_GLASS_LOGOS.solana,
    },
    {
      caip19: "solana:101/spl:EPjFWdd5AufqSSqeM2qZQF16WMG8LQzy6349X8R4w6C9",
      label: "USDC",
      symbol: "USDC",
      decimals: 6,
      logoSrc: LIQUID_GLASS_LOGOS.usdc,
    },
  ],
};

export type AssetSelectValue = AssetOption;

type AssetSelectProps = {
  chainId: string | null | undefined;
  value?: string | null;
  onChange: (option: AssetOption) => void;
  disabled?: boolean;
  id?: string;
};

export function AssetSelect({ chainId, value, onChange, disabled = false, id }: AssetSelectProps) {
  const assets = useMemo(() => {
    if (!chainId) return [];
    return CHAIN_ASSET_MAP[chainId] ?? [];
  }, [chainId]);

  const normalizedValue = useMemo(() => {
    if (value) return value;
    const primary = assets[0]?.caip19 ?? "native";
    return primary ?? "native";
  }, [assets, value]);

  return (
    <Select
      value={normalizedValue ?? "native"}
      onValueChange={(next) => {
        const option = assets.find((asset) => (asset.caip19 ?? "native") === next);
        if (option) onChange(option);
      }}
      disabled={disabled || assets.length === 0}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={assets.length ? "Select asset" : "No assets"} />
      </SelectTrigger>
      <SelectContent>
        {assets.map((option) => (
          <SelectItem key={option.caip19 ?? "native"} value={option.caip19 ?? "native"}>
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

export function assetOptionFromValue(chainId: string | null | undefined, value: string | null | undefined): AssetOption | undefined {
  if (!chainId) return undefined;
  const options = CHAIN_ASSET_MAP[chainId] ?? [];
  const normalized = value ?? null;
  return options.find((option) => option.caip19 === normalized) ?? options[0];
}
