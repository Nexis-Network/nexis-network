import "server-only";

import { createPublicClient, erc20Abi, formatUnits, http } from "viem";
import {
  arbitrum,
  avalanche,
  base,
  baseSepolia,
  mainnet,
  optimism,
  polygon,
  sepolia,
} from "viem/chains";

const CHAIN_BY_ID = {
  1: mainnet,
  10: optimism,
  137: polygon,
  8453: base,
  84532: baseSepolia,
  42161: arbitrum,
  43114: avalanche,
  11155111: sepolia,
} as const;

type DecimalCacheEntry = {
  decimals: number;
  expiresAt: number;
};

const DECIMALS_CACHE_TTL_MS = 1000 * 60 * 5;
const TOKEN_DECIMALS_CACHE = new Map<string, DecimalCacheEntry>();

function getChain(chainId: number) {
  return CHAIN_BY_ID[chainId as keyof typeof CHAIN_BY_ID] ?? base;
}

function getCacheKey(chainId: number, tokenAddress: string): string {
  return `${chainId}:${tokenAddress.toLowerCase()}`;
}

async function getTokenDecimals(chainId: number, tokenAddress: `0x${string}`): Promise<number> {
  const cacheKey = getCacheKey(chainId, tokenAddress);
  const cached = TOKEN_DECIMALS_CACHE.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.decimals;
  }

  const client = createPublicClient({
    chain: getChain(chainId),
    transport: http(),
  });

  const decimals = await client.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "decimals",
  });

  TOKEN_DECIMALS_CACHE.set(cacheKey, {
    decimals,
    expiresAt: Date.now() + DECIMALS_CACHE_TTL_MS,
  });

  return decimals;
}

export async function formatErc20BaseUnitsForAgentKit(args: {
  chainId: number;
  tokenAddress: string;
  amount: string;
}): Promise<string> {
  const decimals = await getTokenDecimals(
    args.chainId,
    args.tokenAddress as `0x${string}`,
  );

  return formatUnits(BigInt(args.amount), decimals);
}

