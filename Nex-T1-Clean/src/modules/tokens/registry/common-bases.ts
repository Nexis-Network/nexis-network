import type { DefaultSwapPair, TokenAssetId } from "@/modules/tokens/types";
import { NATIVE_TOKEN_ADDRESS, SOLANA_CHAIN_ID } from "@/modules/tokens/chains";
import { buildTokenAssetId } from "@/modules/tokens/utils/asset-id";

const nativeId = (chainId: number): TokenAssetId =>
  buildTokenAssetId({ chainId, address: NATIVE_TOKEN_ADDRESS });

const assetId = (chainId: number, address: string): TokenAssetId =>
  buildTokenAssetId({ chainId, address });

export const COMMON_BASES_BY_CHAIN: Record<number, TokenAssetId[]> = {
  1: [nativeId(1), assetId(1, "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"), assetId(1, "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"), assetId(1, "0xdAC17F958D2ee523a2206206994597C13D831ec7"), assetId(1, "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599")],
  10: [nativeId(10), assetId(10, "0x4200000000000000000000000000000000000006"), assetId(10, "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85")],
  56: [nativeId(56), assetId(56, "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"), assetId(56, "0x55d398326f99059fF775485246999027B3197955")],
  137: [nativeId(137), assetId(137, "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"), assetId(137, "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359")],
  324: [nativeId(324), assetId(324, "0x1d17cbcf0d6d143135aE902365D2E5e2A16538D4")],
  8453: [nativeId(8453), assetId(8453, "0x4200000000000000000000000000000000000006"), assetId(8453, "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"), assetId(8453, "0x940181a94A35A4569E4529A3CDfB74e38FD98631")],
  42161: [nativeId(42161), assetId(42161, "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"), assetId(42161, "0xaf88d065e77c8cC2239327C5EDb3A432268e5831")],
  43114: [nativeId(43114), assetId(43114, "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"), assetId(43114, "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E")],
  81457: [nativeId(81457), assetId(81457, "0x4300000000000000000000000000000000000003")],
  [SOLANA_CHAIN_ID]: [nativeId(SOLANA_CHAIN_ID), assetId(SOLANA_CHAIN_ID, "So11111111111111111111111111111111111111112"), assetId(SOLANA_CHAIN_ID, "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), assetId(SOLANA_CHAIN_ID, "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB")],
};

export const DEFAULT_SWAP_PAIRS_BY_CHAIN: DefaultSwapPair[] = [
  { chainId: 1, sellAssetId: nativeId(1), buyAssetId: assetId(1, "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"), source: "registry" },
  { chainId: 10, sellAssetId: nativeId(10), buyAssetId: assetId(10, "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"), source: "registry" },
  { chainId: 56, sellAssetId: nativeId(56), buyAssetId: assetId(56, "0x55d398326f99059fF775485246999027B3197955"), source: "registry" },
  { chainId: 137, sellAssetId: nativeId(137), buyAssetId: assetId(137, "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"), source: "registry" },
  { chainId: 324, sellAssetId: nativeId(324), buyAssetId: assetId(324, "0x1d17cbcf0d6d143135aE902365D2E5e2A16538D4"), source: "registry" },
  { chainId: 8453, sellAssetId: nativeId(8453), buyAssetId: assetId(8453, "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"), source: "registry" },
  { chainId: 42161, sellAssetId: nativeId(42161), buyAssetId: assetId(42161, "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"), source: "registry" },
  { chainId: 43114, sellAssetId: nativeId(43114), buyAssetId: assetId(43114, "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E"), source: "registry" },
  { chainId: 81457, sellAssetId: nativeId(81457), buyAssetId: assetId(81457, "0x4300000000000000000000000000000000000003"), source: "registry" },
  { chainId: SOLANA_CHAIN_ID, sellAssetId: nativeId(SOLANA_CHAIN_ID), buyAssetId: assetId(SOLANA_CHAIN_ID, "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), source: "registry" },
];
