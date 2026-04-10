import { connection, NextResponse } from "next/server";

import { defaultHeliusClient } from "@/server/services/mcp/helius-client";
import { getCoinMarketChart } from "@/server/market/coingecko";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { cookies } from "next/headers";
import { resolveProfileAggregate } from "@/server/profile/profile-aggregate";
import { createEmptyProfile } from "@/lib/user/profile";
import { redis } from "@/server/services/redis";
import { metrics, timeVendor } from "@/server/instrumentation/metrics";
import { detectWalletKind } from "@/server/wallets/detect-kind";
import { withTimeoutFallback } from "@/lib/utils/timeout";
import { createPublicClient, formatUnits, http } from "viem";
import { mainnet } from "viem/chains";


import { logger } from '@/lib/logger';
type RangeKey = "1h" | "1d" | "1w" | "1m" | "3m" | "6m" | "12m";

const RANGE_TO_DAYS: Record<RangeKey, number> = {
  "1h": 1,
  "1d": 1,
  "1w": 7,
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "12m": 365,
};


const mainnetClient = createPublicClient({ chain: mainnet, transport: http() });

export async function GET(req: Request) {
  await connection();
  const url = new URL(req.url);
  const range = (url.searchParams.get("range") as RangeKey) || "12m";
  const walletParam = url.searchParams.get("wallet");
  const rawFilter = walletParam?.trim() ?? "all";
  const filterIsAll = rawFilter.length === 0 || rawFilter.toLowerCase() === "all";
  const walletFilterValue = filterIsAll ? "all" : rawFilter;
  const walletFilterLower = filterIsAll ? "all" : rawFilter.toLowerCase();

  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);
  const { context } = await resolveSupabaseContext(cookieBridge, { refreshSession: false, request: req });
  // Require a verified Supabase session before returning personalized balances
  if (!context?.accessToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Per-user, per-range cache for the final series to reduce repeated recompute across tabs.
  const userId = String(context.userId ?? "");
  const cacheKey = `networth:v2:${userId}:${range}:${walletFilterLower || "all"}`;
  try {
    const cached = await redis.get<{ range: RangeKey; wallets: Array<{ address: string | null; kind: string | null }>; totals: { eth: number; sol: number }; series: Array<{ t: number; v: number }>; cache: string }>(cacheKey);
    if (cached) {
      metrics.cacheHit("networth_series");
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60", "X-Cache": "HIT" },
      });
    }
    metrics.cacheMiss("networth_series");
  } catch { }

  // Try to get cached profile first to avoid slow resolveProfileAggregate calls
  // This prevents 30s+ timeouts when profile aggregation is slow
  let profile = createEmptyProfile();

  if (context?.userId) {
    try {
      const { getCachedProfileAggregate } = await import("@/server/profile/profile-cache");
      const cached = await getCachedProfileAggregate(String(context.userId));
      if (cached && Array.isArray(cached.wallets) && cached.wallets.length > 0) {
        profile = cached;
        metrics.cacheHit("networth_profile");
      } else {
        // Only call resolveProfileAggregate if cache miss, with shorter timeout
        metrics.cacheMiss("networth_profile");
        const resolved = await withTimeoutFallback(
          resolveProfileAggregate(context, { enrich: false }),
          {
            timeoutMs: 10_000, // Reduced from 30s to 10s - prefer cached data
            scope: "networth:profile",
            fallback: () => createEmptyProfile(),
            onTimeout: () => {
              logger.warn("[networth] Profile aggregate timeout after 10s, using empty wallets. Consider using cached profile.");
            },
          }
        );
        profile = resolved;
      }
    } catch (error) {
      logger.warn("[networth] Failed to get profile, using empty wallets", error);
      profile = createEmptyProfile();
    }
  }
  const wallets = Array.isArray(profile.wallets) ? profile.wallets : [];

  const walletEntries = wallets.map((wallet) => {
    const address = typeof wallet.address === "string" ? wallet.address.trim() : "";
    const addressLower = address ? address.toLowerCase() : "";
    const kind = detectWalletKind(wallet);
    return {
      wallet,
      address: address || null,
      addressLower: addressLower || null,
      kind,
    };
  });

  // Collect native balances for EVM (ETH) and Solana (SOL)
  let totalEth = 0; // in ETH
  let totalSol = 0; // in SOL

  const evmAddressMap = new Map<string, string>();
  const solAddressSet = new Set<string>();

  for (const entry of walletEntries) {
    if (!entry.address) continue;
    if (entry.kind === "evm") {
      evmAddressMap.set(entry.addressLower ?? entry.address.toLowerCase(), entry.address);
    } else if (entry.kind === "solana") {
      solAddressSet.add(entry.address);
    }
  }

  const evmAddresses = Array.from(evmAddressMap.values());
  const solAddresses = Array.from(solAddressSet);

  // Helpers: balance caches to avoid hammering vendors on refreshes or slow connections
  const cacheOr = async (key: string, ttl: number, fetcher: () => Promise<number>): Promise<number> => {
    try {
      const cached = await redis.get<number>(key);
      if (typeof cached === "number" && Number.isFinite(cached)) return cached;
    } catch { }
    const value = await fetcher().catch(() => 0);
    try {
      await redis.set(key, value, { ex: ttl });
    } catch { }
    return value;
  };

  // EVM native balance via viem (Ethereum mainnet) (per-address cached for 30s)
  try {
    if (evmAddresses.length) {
      const results = await Promise.all(
        evmAddresses.map(async (addr) =>
          cacheOr(`balance:evm:1:${addr.toLowerCase()}`, 30, async () => {
            const balance = await timeVendor("viem_getBalance", () =>
              mainnetClient.getBalance({ address: addr as `0x${string}` }),
            ).catch(() => 0n);
            return Number(formatUnits(balance, 18));
          }),
        ),
      );
      totalEth = results.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
    }
  } catch { }

  // Solana native via Helius get_balance (lamports) — per-address cached for 30s
  try {
    if (solAddresses.length) {
      const balances = await Promise.all(
        solAddresses.map(async (address) =>
          cacheOr(`balance:sol:${address.toLowerCase()}`, 30, async () => {
            try {
              const res = await defaultHeliusClient.invokeRaw("helius_get_balance", { address });
              const payload = res.toolResult ?? res.response?.toolResult ?? {};
              const lamports = typeof payload?.result === "number" ? payload.result : 0;
              return lamports / 1_000_000_000;
            } catch {
              return 0;
            }
          }),
        ),
      );
      totalSol = balances.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
    }
  } catch { }

  // Optional: filter by specific wallet (address)
  if (walletFilterValue !== "all") {
    // If a specific wallet filter is applied, recompute per single wallet
    const selected = walletEntries.find((entry) => {
      if (!entry.address) return false;
      if (entry.kind === "solana") {
        return (
          entry.address === walletFilterValue ||
          (entry.addressLower && entry.addressLower === walletFilterLower)
        );
      }
      return entry.addressLower === walletFilterLower;
    });

    if (selected) {
      totalEth = 0;
      totalSol = 0;
      if (selected.kind === "evm" && selected.address) {
        try {
          const balance = await timeVendor("viem_getBalance", () =>
            mainnetClient.getBalance({ address: selected.address as `0x${string}` }),
          ).catch(() => 0n);
          const val = Number(formatUnits(balance, 18));
          totalEth = Number.isFinite(val) ? val : 0;
        } catch { }
      }
      if (selected.kind === "solana" && selected.address) {
        try {
          const res = await timeVendor("helius_get_balance", () =>
            defaultHeliusClient.invokeRaw("helius_get_balance", { address: selected.address! }),
          );
          const payload = res.toolResult ?? res.response?.toolResult ?? {};
          const lamports = typeof payload?.result === "number" ? payload.result : 0;
          totalSol = lamports / 1_000_000_000;
        } catch { }
      }
    }
  }

  // Fetch price history for ETH and SOL and aggregate to USD series
  const days = RANGE_TO_DAYS[range] ?? 365;
  // Fetch price history for ETH and SOL with defensive fallbacks.
  // In dev or when API limits are hit, Coingecko can intermittently fail.
  // We degrade to an empty series rather than returning a 500.
  const [ethChart, solChart] = await Promise.all([
    totalEth > 0
      ? getCoinMarketChart("ethereum", {
        vsCurrency: "usd",
        days,
        interval: days > 30 ? "daily" : undefined,
      }).catch(() => null)
      : Promise.resolve(null),
    totalSol > 0
      ? getCoinMarketChart("solana", {
        vsCurrency: "usd",
        days,
        interval: days > 30 ? "daily" : undefined,
      }).catch(() => null)
      : Promise.resolve(null),
  ]);

  type Point = { t: number; v: number };
  const mergeSeries = (): Point[] => {
    const points = new Map<number, number>();
    const add = (series: Awaited<ReturnType<typeof getCoinMarketChart>> | null, qty: number) => {
      const prices = series?.data?.prices;
      if (!Array.isArray(prices)) return;
      for (const [ts, price] of prices) {
        const usd = price * qty;
        points.set(ts, (points.get(ts) ?? 0) + usd);
      }
    };
    add(ethChart, totalEth);
    add(solChart, totalSol);
    return Array.from(points.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([t, v]) => ({ t, v }));
  };

  let series = mergeSeries();
  // For 1h range, clip to the last 60 minutes
  if (range === "1h") {
    const cutoff = Date.now() - 60 * 60 * 1000;
    series = series.filter((p) => p.t >= cutoff);
  }

  const latestEthPrice =
    Array.isArray(ethChart?.data?.prices) && ethChart.data.prices.length
      ? ethChart.data.prices[ethChart.data.prices.length - 1]?.[1] ?? null
      : null;
  const latestSolPrice =
    Array.isArray(solChart?.data?.prices) && solChart.data.prices.length
      ? solChart.data.prices[solChart.data.prices.length - 1]?.[1] ?? null
      : null;

  const totalEthUsd = latestEthPrice != null ? totalEth * latestEthPrice : 0;
  const totalSolUsd = latestSolPrice != null ? totalSol * latestSolPrice : 0;

  const payload = {
    range,
    wallets: walletEntries.map((entry) => ({
      address: entry.address ?? null,
      kind: entry.kind === "unknown" ? null : entry.kind,
    })),
    totals: { eth: totalEth, sol: totalSol },
    totalsUsd: { eth: totalEthUsd, sol: totalSolUsd },
    totalUsd: totalEthUsd + totalSolUsd,
    series,
    cache: "coingecko-layered",
  };

  try {
    await redis.set(cacheKey, payload, { ex: 60 });
  } catch { }

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120", "X-Cache": "MISS" },
  });
}
