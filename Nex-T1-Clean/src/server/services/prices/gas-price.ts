import { createPublicClient, http, type Chain } from "viem";

import { findSupportedChain } from "@/lib/chains";
import { logger } from "@/lib/logger";
import { redis } from "@/server/services/redis";

export type GasPriceSnapshot = {
  chainId: number;
  gasPriceWei: string;
  fetchedAt: number;
  cached: boolean;
  stale?: boolean;
};

export class GasPriceLookupError extends Error {
  constructor(
    message: string,
    readonly code: "UNSUPPORTED_CHAIN" | "SERVICE_UNAVAILABLE",
    readonly status: number,
  ) {
    super(message);
    this.name = "GasPriceLookupError";
  }
}

const CACHE_TTL_SECONDS = 15;
const STALE_CACHE_TTL_SECONDS = 5 * 60;
const RPC_TIMEOUT_MS = 5_000;
const RPC_RETRY_COUNT = 1;

/** Reliable public RPC endpoints as last-resort fallbacks when env/chain URLs fail. */
const FALLBACK_RPC_URLS: Partial<Record<number, readonly string[]>> = {
  1: [
    "https://eth.drpc.org",
    "https://rpc.flashbots.net",
    "https://1rpc.io/eth",
  ],
};

const RPC_ENV_CANDIDATES: Partial<Record<number, readonly string[]>> = {
  1: ["PREMIUM_RPC_URL_ETHEREUM", "SAFE_RPC_URL_ETHEREUM", "ETHEREUM_RPC_URL"],
  10: ["PREMIUM_RPC_URL_OPTIMISM", "SAFE_RPC_URL_OPTIMISM", "OPTIMISM_RPC_URL"],
  56: ["PREMIUM_RPC_URL_BNB", "SAFE_RPC_URL_BNB", "BNB_RPC_URL"],
  130: ["PREMIUM_RPC_URL_UNICHAIN", "SAFE_RPC_URL_UNICHAIN", "UNICHAIN_RPC_URL"],
  137: ["PREMIUM_RPC_URL_POLYGON", "SAFE_RPC_URL_POLYGON", "POLYGON_RPC_URL"],
  42161: ["PREMIUM_RPC_URL_ARBITRUM", "SAFE_RPC_URL_ARBITRUM", "ARBITRUM_RPC_URL"],
  42220: ["PREMIUM_RPC_URL_CELO", "SAFE_RPC_URL_CELO", "CELO_RPC_URL"],
  43114: ["PREMIUM_RPC_URL_AVALANCHE", "SAFE_RPC_URL_AVALANCHE", "AVALANCHE_RPC_URL"],
  8453: ["PREMIUM_RPC_URL_BASE", "SAFE_RPC_URL_BASE", "BASE_RPC_URL"],
  998: ["PREMIUM_RPC_URL_HYPERLIQUID_EVM", "HYPEREVM_RPC_URL", "HYPERLIQUID_EVM_RPC_URL"],
  999: ["PREMIUM_RPC_URL_HYPERLIQUID_EVM", "HYPEREVM_RPC_URL", "HYPERLIQUID_EVM_RPC_URL"],
};

function resolveRpcCandidates(chainId: number, chain: Chain): string[] {
  const envCandidates = (RPC_ENV_CANDIDATES[chainId] ?? [])
    .map((name) => process.env[name]?.trim())
    .filter((value): value is string => Boolean(value));
  const chainCandidates = [
    ...(chain.rpcUrls.default.http ?? []),
    ...(chain.rpcUrls.public?.http ?? []),
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  const fallbackCandidates = [...(FALLBACK_RPC_URLS[chainId] ?? [])];

  return Array.from(new Set([...envCandidates, ...chainCandidates, ...fallbackCandidates]));
}

async function fetchGasPriceFromRpcCandidates(
  chain: Chain,
  rpcCandidates: string[],
): Promise<bigint> {
  let lastError: unknown = null;

  for (const rpcUrl of rpcCandidates) {
    try {
      const client = createPublicClient({
        chain,
        transport: http(rpcUrl, {
          retryCount: RPC_RETRY_COUNT,
          timeout: RPC_TIMEOUT_MS,
        }),
      });
      return await client.getGasPrice();
    } catch (error) {
      logger.warn("[prices/gas] RPC candidate failed", {
        rpcUrl,
        error: error instanceof Error ? error.message : String(error),
      });
      lastError = error;
    }
  }

  throw lastError ?? new Error("No RPC URLs available for gas price lookup");
}

export async function lookupGasPrice(chainId = 1): Promise<GasPriceSnapshot> {
  const chain = findSupportedChain(chainId);
  if (!chain) {
    throw new GasPriceLookupError(`Unsupported chainId: ${chainId}`, "UNSUPPORTED_CHAIN", 400);
  }

  const rpcCandidates = resolveRpcCandidates(chainId, chain);
  const cacheKey = `gas-price:v1:${chainId}`;
  const staleCacheKey = `${cacheKey}:stale`;

  try {
    const cached = await redis.get<Pick<GasPriceSnapshot, "chainId" | "gasPriceWei" | "fetchedAt">>(
      cacheKey,
    );
    if (cached?.gasPriceWei) {
      return { ...cached, cached: true };
    }
  } catch {
    // Cache misses should not block the live lookup.
  }

  try {
    const gasPriceWei = await fetchGasPriceFromRpcCandidates(chain, rpcCandidates);
    const payload = {
      chainId,
      gasPriceWei: gasPriceWei.toString(),
      fetchedAt: Date.now(),
    };

    try {
      await redis.set(cacheKey, payload, { ex: CACHE_TTL_SECONDS });
      await redis.set(staleCacheKey, payload, { ex: STALE_CACHE_TTL_SECONDS });
    } catch {
      // Ignore cache write failures; the live payload is still usable.
    }

    return { ...payload, cached: false };
  } catch (error) {
    try {
      const staleCached = await redis.get<
        Pick<GasPriceSnapshot, "chainId" | "gasPriceWei" | "fetchedAt">
      >(staleCacheKey);
      if (staleCached?.gasPriceWei) {
        logger.warn("[prices/gas] Live RPC failed; serving stale cached gas price", {
          chainId,
          rpcCandidates,
          error,
        });
        return { ...staleCached, cached: true, stale: true };
      }
    } catch {
      // Ignore stale cache lookup failures and fall through to the service error.
    }

    logger.error("[prices/gas] Failed to fetch gas price", {
      chainId,
      rpcCandidates,
      error,
    });
    throw new GasPriceLookupError("Unable to fetch gas price", "SERVICE_UNAVAILABLE", 503);
  }
}
