import type { Chain } from "viem";

import { getChainIconPath } from "@/lib/chain-icons";

export type ChainOption = {
  id: number;
  label: string;
  symbol: string;
  icon: string;
  chain: Chain;
};

const FALLBACK_SYMBOL = "ETH";

export const DROPDOWN_MAX_VISIBLE_ROWS = 5;
export const DROPDOWN_ROW_HEIGHT_REM = 3.5;

export function buildChainOptions(chains: Chain[]): ChainOption[] {
  return chains
    .filter((chain): chain is Chain => Boolean(chain && typeof chain.id === "number"))
    .map((chain) => {
      const symbol =
        typeof chain.nativeCurrency?.symbol === "string" && chain.nativeCurrency.symbol.trim().length > 0
          ? chain.nativeCurrency.symbol.trim().toUpperCase()
          : FALLBACK_SYMBOL;
      const label = typeof chain.name === "string" && chain.name.trim().length > 0 ? chain.name.trim() : `Chain ${chain.id}`;
      return {
        id: chain.id,
        label,
        symbol,
        icon: getChainIconPath(chain),
        chain,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function filterChainOptions(options: ChainOption[], query: string): ChainOption[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return options;
  }

  return options.filter((option) => {
    if (option.label.toLowerCase().includes(trimmed)) {
      return true;
    }
    if (option.symbol.toLowerCase().includes(trimmed)) {
      return true;
    }
    return String(option.id).includes(trimmed);
  });
}

export function getDropdownMaxHeightRem(visibleRows = DROPDOWN_MAX_VISIBLE_ROWS): number {
  const rows = Math.max(1, visibleRows);
  return rows * DROPDOWN_ROW_HEIGHT_REM;
}

