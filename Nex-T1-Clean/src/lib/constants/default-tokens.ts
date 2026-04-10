/**
 * Default tokens configuration for portfolio display.
 * These tokens are always shown in the token table, even with zero balance.
 */

import { LIQUID_GLASS_LOGOS } from "@/lib/liquid-glass-logos";

export interface DefaultToken {
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
  contractAddress: string | null; // null for native tokens
  isNative?: boolean;
  isWrapped?: boolean;
}

export interface NetworkDefaultTokens {
  networkId: string;
  networkName: string;
  tokens: DefaultToken[];
}

// Standard USDC addresses per network
const USDC_ADDRESSES: Record<string, string> = {
  ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  optimism: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
  arbitrum: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  polygon: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  avalanche: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
  solana: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
};

// Standard USDT addresses per network
const USDT_ADDRESSES: Record<string, string> = {
  ethereum: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  // Note: Base does not have native USDT - intentionally excluded
  optimism: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
  arbitrum: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
  polygon: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
  avalanche: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
  solana: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
};

// Default tokens for "All Networks" selection
export const ALL_NETWORKS_DEFAULT_TOKENS: DefaultToken[] = [
  {
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    contractAddress: null,
    isNative: true,
    logoUrl: LIQUID_GLASS_LOGOS.ethereum,
  },
  {
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    contractAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    isWrapped: true,
    logoUrl: LIQUID_GLASS_LOGOS.ethereum,
  },
  {
    symbol: "SOL",
    name: "Solana",
    decimals: 9,
    contractAddress: null,
    isNative: true,
    logoUrl: LIQUID_GLASS_LOGOS.solana,
  },
  {
    symbol: "AVAX",
    name: "Avalanche",
    decimals: 18,
    contractAddress: null,
    isNative: true,
    logoUrl: "/icons/chain-icons/avax.svg",
  },
  {
    symbol: "POL",
    name: "Polygon",
    decimals: 18,
    contractAddress: null,
    isNative: true,
    logoUrl: "/icons/chain-icons/polygon.svg",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    contractAddress: USDC_ADDRESSES.ethereum,
    logoUrl: LIQUID_GLASS_LOGOS.usdc,
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    contractAddress: USDT_ADDRESSES.ethereum,
    logoUrl: LIQUID_GLASS_LOGOS.tether,
  },
];

// Per-network default tokens configuration
export const NETWORK_DEFAULT_TOKENS: NetworkDefaultTokens[] = [
  {
    networkId: "ethereum",
    networkName: "Ethereum",
    tokens: [
      {
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        contractAddress: null,
        isNative: true,
        logoUrl: LIQUID_GLASS_LOGOS.ethereum,
      },
      {
        symbol: "WETH",
        name: "Wrapped Ether",
        decimals: 18,
        contractAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        isWrapped: true,
        logoUrl: LIQUID_GLASS_LOGOS.ethereum,
      },
      {
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        contractAddress: USDC_ADDRESSES.ethereum,
        logoUrl: LIQUID_GLASS_LOGOS.usdc,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        decimals: 6,
        contractAddress: USDT_ADDRESSES.ethereum,
        logoUrl: LIQUID_GLASS_LOGOS.tether,
      },
    ],
  },
  {
    networkId: "base",
    networkName: "Base",
    tokens: [
      {
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        contractAddress: null,
        isNative: true,
        logoUrl: LIQUID_GLASS_LOGOS.ethereum,
      },
      {
        symbol: "WETH",
        name: "Wrapped Ether",
        decimals: 18,
        contractAddress: "0x4200000000000000000000000000000000000006",
        isWrapped: true,
        logoUrl: LIQUID_GLASS_LOGOS.ethereum,
      },
      {
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        contractAddress: USDC_ADDRESSES.base,
        logoUrl: LIQUID_GLASS_LOGOS.usdc,
      },
      // Note: USDT intentionally excluded - Base does not have native USDT
    ],
  },
  {
    networkId: "optimism",
    networkName: "Optimism",
    tokens: [
      {
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        contractAddress: null,
        isNative: true,
        logoUrl: LIQUID_GLASS_LOGOS.ethereum,
      },
      {
        symbol: "WETH",
        name: "Wrapped Ether",
        decimals: 18,
        contractAddress: "0x4200000000000000000000000000000000000006",
        isWrapped: true,
        logoUrl: LIQUID_GLASS_LOGOS.ethereum,
      },
      {
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        contractAddress: USDC_ADDRESSES.optimism,
        logoUrl: LIQUID_GLASS_LOGOS.usdc,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        decimals: 6,
        contractAddress: USDT_ADDRESSES.optimism,
        logoUrl: LIQUID_GLASS_LOGOS.tether,
      },
    ],
  },
  {
    networkId: "arbitrum",
    networkName: "Arbitrum",
    tokens: [
      {
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        contractAddress: null,
        isNative: true,
        logoUrl: LIQUID_GLASS_LOGOS.ethereum,
      },
      {
        symbol: "WETH",
        name: "Wrapped Ether",
        decimals: 18,
        contractAddress: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
        isWrapped: true,
        logoUrl: LIQUID_GLASS_LOGOS.ethereum,
      },
      {
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        contractAddress: USDC_ADDRESSES.arbitrum,
        logoUrl: LIQUID_GLASS_LOGOS.usdc,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        decimals: 6,
        contractAddress: USDT_ADDRESSES.arbitrum,
        logoUrl: LIQUID_GLASS_LOGOS.tether,
      },
    ],
  },
  {
    networkId: "polygon",
    networkName: "Polygon",
    tokens: [
      {
        symbol: "POL",
        name: "Polygon",
        decimals: 18,
        contractAddress: null,
        isNative: true,
        logoUrl: "/icons/chain-icons/polygon.svg",
      },
      {
        symbol: "WPOL",
        name: "Wrapped POL",
        decimals: 18,
        contractAddress: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
        isWrapped: true,
        logoUrl: "/icons/chain-icons/polygon.svg",
      },
      {
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        contractAddress: USDC_ADDRESSES.polygon,
        logoUrl: LIQUID_GLASS_LOGOS.usdc,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        decimals: 6,
        contractAddress: USDT_ADDRESSES.polygon,
        logoUrl: LIQUID_GLASS_LOGOS.tether,
      },
    ],
  },
  {
    networkId: "solana",
    networkName: "Solana",
    tokens: [
      {
        symbol: "SOL",
        name: "Solana",
        decimals: 9,
        contractAddress: null,
        isNative: true,
        logoUrl: LIQUID_GLASS_LOGOS.solana,
      },
      {
        symbol: "WSOL",
        name: "Wrapped SOL",
        decimals: 9,
        contractAddress: "So11111111111111111111111111111111111111112",
        isWrapped: true,
        logoUrl: LIQUID_GLASS_LOGOS.solana,
      },
      {
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        contractAddress: USDC_ADDRESSES.solana,
        logoUrl: LIQUID_GLASS_LOGOS.usdc,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        decimals: 6,
        contractAddress: USDT_ADDRESSES.solana,
        logoUrl: LIQUID_GLASS_LOGOS.tether,
      },
    ],
  },
  {
    networkId: "avalanche",
    networkName: "Avalanche",
    tokens: [
      {
        symbol: "AVAX",
        name: "Avalanche",
        decimals: 18,
        contractAddress: null,
        isNative: true,
        logoUrl: "/icons/tokens/avax.svg",
      },
      {
        symbol: "WAVAX",
        name: "Wrapped AVAX",
        decimals: 18,
        contractAddress: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
        isWrapped: true,
        logoUrl: "/icons/tokens/avax.svg",
      },
      {
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        contractAddress: USDC_ADDRESSES.avalanche,
        logoUrl: LIQUID_GLASS_LOGOS.usdc,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        decimals: 6,
        contractAddress: USDT_ADDRESSES.avalanche,
        logoUrl: LIQUID_GLASS_LOGOS.tether,
      },
    ],
  },
  {
    networkId: "linea",
    networkName: "Linea",
    tokens: [
      {
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        contractAddress: null,
        isNative: true,
        logoUrl: LIQUID_GLASS_LOGOS.ethereum,
      },
      {
        symbol: "WETH",
        name: "Wrapped Ether",
        decimals: 18,
        contractAddress: "0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f",
        isWrapped: true,
        logoUrl: "/icons/tokens/weth.svg",
      },
      {
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        contractAddress: "0x176211869cA2b568f2A7D4EE941E073a821EE1ff",
        logoUrl: LIQUID_GLASS_LOGOS.usdc,
      },
    ],
  },
];

/**
 * Get default tokens for a specific network or all networks
 */
export function getDefaultTokensForNetwork(networkId: string): DefaultToken[] {
  if (networkId === "all") {
    return ALL_NETWORKS_DEFAULT_TOKENS;
  }
  
  const networkConfig = NETWORK_DEFAULT_TOKENS.find(
    (n) => n.networkId === networkId
  );
  
  return networkConfig?.tokens || [];
}

/**
 * Create a unique key for a token (used for deduplication)
 */
export function getTokenKey(
  contractAddress: string | null,
  chainId: string
): string {
  const addr = contractAddress?.toLowerCase() || "native";
  return `${chainId}-${addr}`;
}
