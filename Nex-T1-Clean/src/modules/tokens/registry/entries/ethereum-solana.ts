import type { TokenRegistryEntry } from "@/modules/tokens/types";
import { NATIVE_TOKEN_ADDRESS, SOLANA_CHAIN_ID } from "@/modules/tokens/chains";

export const ETHEREUM_SOLANA_REGISTRY: TokenRegistryEntry[] = [
  { chainId: 1, address: NATIVE_TOKEN_ADDRESS, symbol: "ETH", name: "Ethereum", decimals: 18, sources: ["registry"], tags: ["default", "popular"] },
  { chainId: 1, address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", name: "Wrapped Ether", decimals: 18, sources: ["registry"], tags: ["default", "wrapped"] },
  { chainId: 1, address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6, sources: ["registry"], tags: ["default", "stablecoin", "popular"] },
  { chainId: 1, address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether USD", decimals: 6, sources: ["registry"], tags: ["default", "stablecoin", "popular"] },
  { chainId: 1, address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", name: "Wrapped Bitcoin", decimals: 8, sources: ["registry"], tags: ["popular"] },
  { chainId: 1, address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", name: "Dai Stablecoin", decimals: 18, sources: ["registry"], tags: ["stablecoin"] },
  { chainId: 1, address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", symbol: "LINK", name: "Chainlink", decimals: 18, sources: ["registry"], tags: ["popular"] },
  { chainId: 1, address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", symbol: "UNI", name: "Uniswap", decimals: 18, sources: ["registry"], tags: ["popular"] },
  { chainId: 1, address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", symbol: "AAVE", name: "Aave", decimals: 18, sources: ["registry"], tags: ["popular"] },
  { chainId: SOLANA_CHAIN_ID, address: NATIVE_TOKEN_ADDRESS, symbol: "SOL", name: "Solana", decimals: 9, sources: ["registry"], tags: ["default", "popular"] },
  { chainId: SOLANA_CHAIN_ID, address: "So11111111111111111111111111111111111111112", symbol: "WSOL", name: "Wrapped SOL", decimals: 9, sources: ["registry"], tags: ["default", "wrapped"] },
  { chainId: SOLANA_CHAIN_ID, address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", symbol: "USDC", name: "USD Coin", decimals: 6, sources: ["registry"], tags: ["default", "stablecoin", "popular"] },
  { chainId: SOLANA_CHAIN_ID, address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", symbol: "USDT", name: "Tether USD", decimals: 6, sources: ["registry"], tags: ["default", "stablecoin"] },
  { chainId: SOLANA_CHAIN_ID, address: "JUPyiwrYJFskUPiHa7hkeR8VUtkWAqzsPeuYsSKhKb5", symbol: "JUP", name: "Jupiter", decimals: 6, sources: ["registry"], tags: ["popular"] },
  { chainId: SOLANA_CHAIN_ID, address: "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr", symbol: "PYTH", name: "Pyth Network", decimals: 6, sources: ["registry"], tags: ["popular"] },
  { chainId: SOLANA_CHAIN_ID, address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", symbol: "BONK", name: "Bonk", decimals: 5, sources: ["registry"], tags: ["popular"] },
  { chainId: SOLANA_CHAIN_ID, address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", symbol: "WIF", name: "dogwifhat", decimals: 6, sources: ["registry"], tags: ["popular"] },
  { chainId: SOLANA_CHAIN_ID, address: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", symbol: "RAY", name: "Raydium", decimals: 6, sources: ["registry"], tags: ["popular"] },
  { chainId: SOLANA_CHAIN_ID, address: "jtojtomePA8beP8AuQc6eKS59uyYPqM63h8eSJ9f3b3", symbol: "JTO", name: "Jito", decimals: 9, sources: ["registry"], tags: ["popular"] },
];
