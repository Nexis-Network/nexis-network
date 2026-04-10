import { getChainInfo, SOLANA_CHAIN_ID } from "@/modules/tokens/chains";
import type { TokenInfo } from "@/stores/use-swap-store";

export type FilterType =
  | "All"
  | "Base"
  | "Ethereum"
  | "Arbitrum"
  | "Solana"
  | "Optimism"
  | "Polygon"
  | "BSC"
  | "Avalanche"
  | "Blast"
  | "Unichain"
  | "ZKSync";

export const TOKEN_SELECTOR_FILTERS: FilterType[] = [
  "All",
  "Ethereum",
  "Base",
  "Arbitrum",
  "Optimism",
  "Polygon",
  "BSC",
  "Avalanche",
  "Solana",
  "Blast",
  "Unichain",
  "ZKSync",
];

export const POPULAR_TOKEN_SYMBOLS = ["ETH", "USDC", "USDT", "SOL", "WETH"];

const FILTER_CHAIN_ID: Partial<Record<FilterType, number>> = {
  Ethereum: 1,
  Base: 8453,
  Arbitrum: 42161,
  Optimism: 10,
  Polygon: 137,
  BSC: 56,
  Avalanche: 43114,
  Solana: SOLANA_CHAIN_ID,
  Blast: 81457,
  Unichain: 130,
  ZKSync: 324,
};

export function getFilterLogo(filter: FilterType): string | undefined {
  const chainId = FILTER_CHAIN_ID[filter];
  return chainId ? getChainInfo(chainId)?.logoURI : undefined;
}

export function matchesTokenFilter(token: TokenInfo, selectedChain: FilterType): boolean {
  if (selectedChain === "All") {
    return true;
  }

  return token.chainId === FILTER_CHAIN_ID[selectedChain];
}

export function resolveSelectedChainId(selectedChain: FilterType): number | null {
  return FILTER_CHAIN_ID[selectedChain] ?? null;
}
