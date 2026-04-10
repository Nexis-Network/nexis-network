import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";
import { getNztRollupConfig } from "@/lib/networks/capabilities";

export type ChainOption = {
  label: string;
  value: string;
  chainIdLabel: string;
  icon: string;
};

export type AssetOption = {
  id: string;
  label: string;
  symbol: string;
  decimals: number;
  usdPrice: number;
  icon: string;
};

const BASE_CHAIN_OPTIONS: ChainOption[] = [
  {
    label: "Base",
    value: "eip155:8453",
    chainIdLabel: "8453",
    icon: "/icons/chain-icons/base.svg",
  },
  {
    label: "Ethereum",
    value: "eip155:1",
    chainIdLabel: "1",
    icon: LIQUID_GLASS_LOGOS.ethereum,
  },
  {
    label: "Optimism",
    value: "eip155:10",
    chainIdLabel: "10",
    icon: "/icons/chain-icons/optimism.svg",
  },
  {
    label: "Arbitrum",
    value: "eip155:42161",
    chainIdLabel: "42161",
    icon: "/icons/chain-icons/arbitrum.svg",
  },
  {
    label: "Solana",
    value: "solana:101",
    chainIdLabel: "101",
    icon: LIQUID_GLASS_LOGOS.solana,
  },
];

/**
 * Accepted assets per chain with static USD price hints for the form preview.
 *
 * IMPORTANT: The `usdPrice` fields are used ONLY for the client-side
 * `AmountPreview` component to give the operator an approximate USD
 * equivalent while filling in the form. They are NOT used in any on-chain
 * calculation, API payload, or stored in the database.
 *
 * For production accuracy, these should be replaced with a real-time price
 * feed (e.g., from the existing `/api/prices/gas` or CoinGecko integration).
 * Until then, these static approximations are acceptable because:
 * 1. The actual campaign amounts are submitted in base units via `parseUnits`.
 * 2. On-chain economics depend on base-unit math, not these previews.
 */
const BASE_ACCEPTED_ASSETS_BY_CHAIN: Record<string, AssetOption[]> = {
  "eip155:8453": [
    {
      id: "native",
      label: "Native ETH",
      symbol: "ETH",
      decimals: 18,
      usdPrice: 3200,
      icon: "/icons/chain-icons/base.svg",
    },
    {
      id: "eip155:8453/erc20:0x4200000000000000000000000000000000000006",
      label: "Wrapped ETH",
      symbol: "WETH",
      decimals: 18,
      usdPrice: 3200,
      icon: LIQUID_GLASS_LOGOS.ethereum,
    },
    {
      id: "eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      label: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      usdPrice: 1,
      icon: LIQUID_GLASS_LOGOS.usdc,
    },
  ],
  "eip155:1": [
    {
      id: "native",
      label: "Native ETH",
      symbol: "ETH",
      decimals: 18,
      usdPrice: 3200,
      icon: LIQUID_GLASS_LOGOS.ethereum,
    },
    {
      id: "eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      label: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      usdPrice: 1,
      icon: LIQUID_GLASS_LOGOS.usdc,
    },
    {
      id: "eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7",
      label: "Tether",
      symbol: "USDT",
      decimals: 6,
      usdPrice: 1,
      icon: LIQUID_GLASS_LOGOS.tether,
    },
  ],
  "eip155:10": [
    {
      id: "native",
      label: "Native ETH",
      symbol: "ETH",
      decimals: 18,
      usdPrice: 3200,
      icon: "/icons/chain-icons/optimism.svg",
    },
    {
      id: "eip155:10/erc20:0x4200000000000000000000000000000000000006",
      label: "Wrapped ETH",
      symbol: "WETH",
      decimals: 18,
      usdPrice: 3200,
      icon: LIQUID_GLASS_LOGOS.ethereum,
    },
    {
      id: "eip155:10/erc20:0x0b2C639c533813f4Aa9D7837CaF62653d097Ff85",
      label: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      usdPrice: 1,
      icon: LIQUID_GLASS_LOGOS.usdc,
    },
  ],
  "eip155:42161": [
    {
      id: "native",
      label: "Native ETH",
      symbol: "ETH",
      decimals: 18,
      usdPrice: 3200,
      icon: "/icons/chain-icons/arbitrum.svg",
    },
    {
      id: "eip155:42161/erc20:0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
      label: "Wrapped ETH",
      symbol: "WETH",
      decimals: 18,
      usdPrice: 3200,
      icon: LIQUID_GLASS_LOGOS.ethereum,
    },
    {
      id: "eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      label: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      usdPrice: 1,
      icon: LIQUID_GLASS_LOGOS.usdc,
    },
  ],
  "solana:101": [
    {
      id: "native",
      label: "Native SOL",
      symbol: "SOL",
      decimals: 9,
      usdPrice: 190,
      icon: LIQUID_GLASS_LOGOS.solana,
    },
    {
      id: "solana:101/spl-token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      label: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      usdPrice: 1,
      icon: LIQUID_GLASS_LOGOS.usdc,
    },
    {
      id: "solana:101/spl-token:Es9vMFrzaCERhQhA8YfX4wz5k9M4M5VqWjYv7FpC18JN",
      label: "Tether",
      symbol: "USDT",
      decimals: 6,
      usdPrice: 1,
      icon: LIQUID_GLASS_LOGOS.tether,
    },
  ],
};

function getLaunchpadChainOptions(): ChainOption[] {
  const nztRollup = getNztRollupConfig();
  if (!nztRollup.chainId) {
    return BASE_CHAIN_OPTIONS;
  }

  return [
    {
      label: "NZT Rollup",
      value: `eip155:${nztRollup.chainId}`,
      chainIdLabel: String(nztRollup.chainId),
      icon: "/icons/chain-icons/nzt.svg",
    },
    ...BASE_CHAIN_OPTIONS,
  ];
}

function getAcceptedAssetsByChain(): Record<string, AssetOption[]> {
  const nztRollup = getNztRollupConfig();
  if (!nztRollup.chainId) {
    return BASE_ACCEPTED_ASSETS_BY_CHAIN;
  }

  return {
    ...BASE_ACCEPTED_ASSETS_BY_CHAIN,
    [`eip155:${nztRollup.chainId}`]: [
      {
        id: "native",
        label: `Native ${nztRollup.nativeSymbol}`,
        symbol: nztRollup.nativeSymbol,
        decimals: 18,
        usdPrice: 1,
        icon: "/icons/chain-icons/nzt.svg",
      },
    ],
  };
}

export const CHAIN_OPTIONS = getLaunchpadChainOptions();
export const ACCEPTED_ASSETS_BY_CHAIN = getAcceptedAssetsByChain();
export const DEFAULT_CHAIN_REF = CHAIN_OPTIONS[0]?.value ?? "eip155:8453";
export const DEFAULT_ACCEPTED_ASSETS = (
  ACCEPTED_ASSETS_BY_CHAIN[DEFAULT_CHAIN_REF] ?? []
)
  .slice(0, 2)
  .map((item) => item.id);
