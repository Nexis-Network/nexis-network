import { redis } from "@/server/services/redis";
import { defaultHeliusClient } from "@/server/services/mcp/helius-client";
import { metrics, timeVendor } from "@/server/instrumentation/metrics";
import { withTimeoutFallback } from "@/lib/utils/timeout";
import { createPublicClient, formatUnits, http, type Address } from "viem";
import {
  mainnet,
  base,
  arbitrum,
  optimism,
  polygon,
  bsc,
  avalanche,
} from "viem/chains";

const SOL_LAMPORTS = 1_000_000_000;
// Increased cache TTL - native balances don't change frequently
const BALANCE_TTL_SECONDS = Number(
  process.env.NATIVE_BALANCE_TTL_SECONDS ?? 120,
); // 2 min
const STALE_TTL_SECONDS = Number(process.env.NATIVE_BALANCE_STALE_TTL ?? 600); // 10 min stale
// Reduced timeout to fail fast
const NATIVE_BALANCE_TIMEOUT_MS = Number(
  process.env.NATIVE_BALANCE_TIMEOUT_MS ?? 2500,
);

export type NativeBalanceChainKind = "evm" | "solana";

type BaseBalanceOptions = {
  chainKind: NativeBalanceChainKind;
  address: string;
};

export type EvmBalanceOptions = BaseBalanceOptions & {
  chainKind: "evm";
  chainId?: number | null;
};

export type SolBalanceOptions = BaseBalanceOptions & {
  chainKind: "solana";
};

export type NativeBalanceOptions = EvmBalanceOptions | SolBalanceOptions;

export const normalizeAddressForLookup = (
  kind: NativeBalanceChainKind,
  address: string,
): string => {
  if (!address) return "";
  return kind === "evm" ? address.trim().toLowerCase() : address.trim();
};

const normalizeAddress = (options: NativeBalanceOptions): string => {
  if (options.chainKind === "evm") {
    return options.address.trim().toLowerCase();
  }
  return options.address.trim();
};

export const buildNativeBalanceCacheKey = (
  options: NativeBalanceOptions,
): string => {
  const normalized = normalizeAddress(options);
  const chainSegment =
    options.chainKind === "evm" ? String(options.chainId ?? "primary") : "sol";
  return `native-balance:${options.chainKind}:${chainSegment}:${normalized}`;
};

export type CachedBalanceResult = {
  value: number | null;
  isStale: boolean;
  cachedAt?: number;
};

export async function getCachedNativeBalance(
  options: NativeBalanceOptions,
): Promise<number | null> {
  const result = await getCachedNativeBalanceWithMeta(options);
  return result.value;
}

export async function getCachedNativeBalanceWithMeta(
  options: NativeBalanceOptions,
): Promise<CachedBalanceResult> {
  const key = buildNativeBalanceCacheKey(options);
  const metaKey = `${key}:meta`;

  const [cached, meta] = await Promise.all([
    withTimeoutFallback(
      redis.get<number>(key).catch(() => null),
      {
        timeoutMs: 200,
        fallback: () => null,
        scope: "native_balance_cache_read",
      },
    ),
    withTimeoutFallback(
      redis.get<number>(metaKey).catch(() => null),
      {
        timeoutMs: 200,
        fallback: () => null,
        scope: "native_balance_meta_read",
      },
    ),
  ]);

  if (typeof cached === "number" && Number.isFinite(cached)) {
    metrics.cacheHit("native_balance");
    const cachedAt = typeof meta === "number" ? meta : Date.now();
    const age = Date.now() - cachedAt;
    const isStale = age > BALANCE_TTL_SECONDS * 1000;
    return { value: cached, isStale, cachedAt };
  }

  metrics.cacheMiss("native_balance");
  return { value: null, isStale: true };
}

// In-flight request tracking for request coalescing
const inFlightRequests = new Map<string, Promise<number | null>>();

export async function refreshNativeBalance(
  options: NativeBalanceOptions,
): Promise<number | null> {
  const key = buildNativeBalanceCacheKey(options);

  // Request coalescing - don't start duplicate fetches
  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing;
  }

  const fetchPromise = (async () => {
    const fetcher = async () => {
      if (options.chainKind === "evm") {
        return fetchEvmNativeBalance(options).catch(() => null);
      }
      if (options.chainKind === "solana") {
        return fetchSolanaNativeBalance(options.address).catch(() => null);
      }
      return null;
    };

    const value = await withTimeoutFallback(fetcher(), {
      timeoutMs: NATIVE_BALANCE_TIMEOUT_MS,
      scope: `native_balance_refresh_${options.chainKind}`,
      fallback: () => null,
    });

    if (value != null && Number.isFinite(value)) {
      const metaKey = `${key}:meta`;
      // Store value with extended TTL (stale data is better than no data)
      // Store metadata for staleness tracking
      await Promise.all([
        withTimeoutFallback(
          redis.set(key, value, { ex: STALE_TTL_SECONDS }).catch(() => {}),
          {
            timeoutMs: 200,
            fallback: () => "OK",
            scope: "native_balance_cache_write",
          },
        ),
        withTimeoutFallback(
          redis
            .set(metaKey, Date.now(), { ex: STALE_TTL_SECONDS })
            .catch(() => {}),
          {
            timeoutMs: 200,
            fallback: () => "OK",
            scope: "native_balance_meta_write",
          },
        ),
      ]);
    }

    return value;
  })();

  inFlightRequests.set(key, fetchPromise);

  try {
    return await fetchPromise;
  } finally {
    inFlightRequests.delete(key);
  }
}

/**
 * Refresh balance in background (fire-and-forget)
 * Used for stale-while-revalidate pattern
 */
export function refreshNativeBalanceInBackground(
  options: NativeBalanceOptions,
): void {
  refreshNativeBalance(options).catch(() => {});
}

async function fetchEvmNativeBalance(
  options: EvmBalanceOptions,
): Promise<number | null> {
  const addr = options.address?.trim();
  if (!addr) return null;

  const chainId = options.chainId ?? 1;
  const chain =
    chainId === 8453
      ? base
      : chainId === 42161
        ? arbitrum
        : chainId === 10
          ? optimism
          : chainId === 137
            ? polygon
            : chainId === 56
              ? bsc
              : chainId === 43114
                ? avalanche
                : mainnet;

  const balance = await timeVendor("viem_getBalance", () =>
    createPublicClient({ chain, transport: http() }).getBalance({
      address: addr as Address,
    }),
  ).catch(() => 0n);

  return Number(formatUnits(balance, chain.nativeCurrency.decimals));
}

async function fetchSolanaNativeBalance(
  address: string,
): Promise<number | null> {
  const payload = await timeVendor("helius_get_balance", () =>
    defaultHeliusClient.invokeRaw("helius_get_balance", { address }),
  ).catch(() => null);
  if (!payload) {
    return null;
  }
  const lamports = (() => {
    const payloadRecord = payload as unknown as Record<string, UntypedJson>;
    const responseRecord =
      payloadRecord.response && typeof payloadRecord.response === "object"
        ? (payloadRecord.response as Record<string, UntypedJson>)
        : null;
    const toolResult =
      (payloadRecord.toolResult as Record<string, UntypedJson> | undefined) ??
      (responseRecord?.toolResult as Record<string, UntypedJson> | undefined) ??
      undefined;
    if (typeof toolResult?.result === "number") {
      return toolResult.result;
    }
    if (typeof payloadRecord.result === "number") {
      return payloadRecord.result;
    }
    return 0;
  })();
  if (!Number.isFinite(lamports)) {
    return null;
  }
  return lamports / SOL_LAMPORTS;
}
