import { cookies } from "next/headers";
import { connection, type NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";

import { withTimeoutFallback } from "@/lib/utils/timeout";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { resolveUserWallets } from "@/server/wallets/user-wallets";
import { getOrSet } from "@/server/services/redis/cache";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import {
  createEmptyWalletSummary,
  type WalletSummaryEnvelope,
  type WalletSnapshot,
  type UnifiedAsset,
} from "@/modules/wallets/profile";
import type { WalletPortfolio, WalletChainSummary } from "@/lib/user/profile";
import { createClient as createServerSupabaseClient } from "@/server/services/supabase/server";

type TokenHoldingRow = {
  chain: string;
  token_address: string;
  name: string;
  symbol: string;
  decimals: number;
  ui_amount: number | null;
  price_usd: number | null;
  value_usd: number | null;
  logo_url: string | null;
};
import { redis, isRedisConfigured } from "@/server/services/redis";
import { enqueueJob } from "@/server/queues/enqueue";
import { processInline } from "@/server/queues/config";

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const CACHE_NAMESPACE = "wallet_summary";
// Reduced timeout - fail fast and return cached/empty rather than block
const SUMMARY_COMPUTE_TIMEOUT_MS = Number(
  process.env.WALLET_SUMMARY_TIMEOUT_MS ?? 12000,
);
// Increased cache TTL for better performance - wallet data doesn't change frequently
const SUMMARY_CACHE_TTL_SECONDS = Number(
  process.env.WALLET_SUMMARY_CACHE_TTL ?? 120,
); // 2 min
const SUMMARY_STALE_TTL_SECONDS = Number(
  process.env.WALLET_SUMMARY_STALE_TTL ?? 600,
); // 10 min stale

export async function GET(request: NextRequest) {
  await connection();
  return timeApiRoute("wallets.summary.GET", async () => {
    const jar = await cookies();
    const cookieBridge = createCookieBridge(jar);

    try {
      const { context } = await resolveSupabaseContext(cookieBridge, {
        request,
      });
      if (!context) {
        return cookieBridge.commit(apiResponse.unauthorized());
      }

      const url = new URL(request.url);
      const refreshRequested =
        (url.searchParams.get("refresh") ?? "").trim() === "1";
      const cacheKey = `user:${context.userId}:wallets:summary:v2`;

      // OPTIMIZATION 1: Check cache FIRST before any expensive operations
      // This provides sub-100ms responses for cached data
      if (!refreshRequested && isRedisConfigured) {
        try {
          const cached = await redis.get<string>(cacheKey);
          if (cached) {
            const envelope = deserializeWalletEnvelope(cached);
            if (envelope) {
              // Trigger background refresh if data is getting stale (older than TTL/2)
              const fetchedAt = envelope.fetchedAt
                ? new Date(envelope.fetchedAt).getTime()
                : 0;
              const age = Date.now() - fetchedAt;
              const halfTtl = (SUMMARY_CACHE_TTL_SECONDS * 1000) / 2;

              if (age > halfTtl) {
                // Background refresh - don't await
                refreshWalletSummaryInBackground(
                  context.userId,
                  context.email,
                  cacheKey,
                ).catch(() => {});
              }

              const response = apiResponse.success(envelope);
              response.headers.set(
                "Cache-Control",
                "private, max-age=60, stale-while-revalidate=600",
              );
              response.headers.set("X-Cache", "HIT");
              return cookieBridge.commit(response);
            }
          }
        } catch {
          // Cache miss or error - continue to compute
        }
      }

      // Wallets are provisioned through the current Nex wallet bootstrap flow.

      if (refreshRequested && isRedisConfigured) {
        await redis.del(cacheKey).catch(() => {});
      }

      // Ensure provisioning is triggered (idempotent)
      triggerBackgroundProvisioning(context.userId, context.email).catch(
        () => {},
      );

      const computeEnvelope = async () => {
        const wallets = await resolveUserWallets(context.userId).catch<
          WalletPortfolio[]
        >(() => []);
        if (!wallets.length) {
          return createEmptyWalletSummary();
        }

        // OPTIMIZATION 4: buildWalletSnapshot is now synchronous (no async ops)
        const snapshots = wallets.map((wallet) => {
          try {
            return buildWalletSnapshot(wallet);
          } catch (error) {
            if (!IS_PRODUCTION) {
              logger.warn("wallet_snapshot_failed", wallet.walletId, error);
            }
            return null;
          }
        });

        const filtered = snapshots.filter(
          (snapshot): snapshot is WalletSnapshot => snapshot !== null,
        );

        // OPTIMIZATION 4b: Enrich with assets (async, parallel)
        // This fetches real balances from Moralis for each wallet
        const enriched = await Promise.all(
          filtered.map((snap) =>
            enrichSnapshotWithAssets(snap, context.userId, refreshRequested),
          ),
        );

        const totalValue = sumValues(
          enriched.map((snap) => snap.totals.estimatedValueUsd),
        );

        return {
          wallets: enriched,
          aggregated: {
            totalWallets: filtered.length,
            estimatedValueUsd: totalValue,
          },
          fetchedAt: new Date().toISOString(),
        } satisfies WalletSummaryEnvelope;
      };

      const computeWithBudget = () =>
        withTimeoutFallback(computeEnvelope(), {
          timeoutMs: SUMMARY_COMPUTE_TIMEOUT_MS,
          fallback: () => createEmptyWalletSummary(),
          scope: "wallet_summary_compute",
        });

      const envelope = refreshRequested
        ? await computeWithBudget()
        : await getOrSet(cacheKey, computeWithBudget, {
            ttlSeconds: SUMMARY_CACHE_TTL_SECONDS,
            staleTtlSeconds: SUMMARY_STALE_TTL_SECONDS,
            coalesce: true,
            lockTtlSeconds: 15,
            namespace: CACHE_NAMESPACE,
            serialize: (value) => JSON.stringify(value),
            deserialize: deserializeWalletEnvelope,
          });

      const response = apiResponse.success(envelope);
      response.headers.set(
        "Cache-Control",
        "private, max-age=30, stale-while-revalidate=300",
      );
      return cookieBridge.commit(response);
    } catch (error) {
      if (!IS_PRODUCTION) {
        logger.error("wallet_summary_error", error);
      }
      return cookieBridge.commit(
        apiResponse.error(
          "WALLET_SUMMARY_FAILED",
          "Unable to load wallet summaries",
          502,
          error instanceof Error ? error.message : "",
        ),
      );
    }
  });
}

function buildWalletSnapshot(wallet: WalletPortfolio): WalletSnapshot {
  const address = typeof wallet.address === "string" ? wallet.address : null;
  const provider = wallet.providerName ?? null;
  const label = wallet.providerName ?? "Wallet";

  const chains: WalletChainSummary[] = Array.isArray(wallet.topChains)
    ? wallet.topChains
    : [];

  const tokens = [] as WalletSnapshot["tokens"];
  const nfts = [] as WalletSnapshot["nfts"];

  const estimatedValueUsd =
    typeof wallet.netWorthUsd === "number" &&
    Number.isFinite(wallet.netWorthUsd)
      ? wallet.netWorthUsd
      : null;

  return {
    customLabel: wallet.customLabel ?? null,
    id: wallet.walletId,
    address,
    provider,
    label,
    type: wallet.walletType,
    chains,
    tokens,
    nfts,
    totals: {
      tokenCount: tokens.length,
      nftCount: nfts.length,
      estimatedValueUsd,
      nativeValueUsd: null,
      totalPnlUsd: wallet.gainLoss24hUsd ?? null,
      totalPnlPercent: wallet.change24hPercent ?? null,
    },
    metadata: wallet.metadata ?? null,
  };
}

function sumValues(values: Array<number | null | undefined>): number | null {
  const filtered = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );
  if (!filtered.length) {
    return null;
  }
  const total = filtered.reduce((acc, value) => acc + value, 0);
  return Number.isFinite(total) ? Number(total.toFixed(2)) : null;
}

function deserializeWalletEnvelope(
  raw: UntypedJson,
): WalletSummaryEnvelope | null {
  if (typeof raw !== "string") {
    return null;
  }
  if (!raw) {
    return createEmptyWalletSummary();
  }
  try {
    const parsed = JSON.parse(raw) as Partial<WalletSummaryEnvelope>;
    if (!parsed || !Array.isArray(parsed.wallets) || !parsed.aggregated) {
      return createEmptyWalletSummary();
    }
    return {
      wallets: parsed.wallets,
      aggregated: parsed.aggregated,
      fetchedAt:
        typeof parsed.fetchedAt === "string"
          ? parsed.fetchedAt
          : new Date().toISOString(),
    };
  } catch (error) {
    logger.warn("wallet_summary_deserialize_failed", error);
    return createEmptyWalletSummary();
  }
}

/**
 * Triggers wallet provisioning in background (fire-and-forget)
 * This ensures wallets are created without blocking the response
 */
async function triggerBackgroundProvisioning(
  userId: string,
  email?: string | null,
) {
  // Safe provisioning is async; never block the response path.
  // This is idempotent (server-side lock + upsert in provisioning service).
  try {
    void enqueueJob("user_wallet_bootstrap", {
      userId,
      email: email ?? null,
      source: "api.nex.wallets.summary",
    });
  } catch {
    // best-effort; summary endpoint should remain responsive even if queue fails
  } finally {
    void processInline;
  }
}

/**
 * Refreshes wallet summary cache in background
 * Called when cached data is stale but still valid
 */
async function refreshWalletSummaryInBackground(
  userId: string,
  email?: string | null,
  cacheKey?: string,
) {
  try {
    // Trigger provisioning first
    await triggerBackgroundProvisioning(userId, email);

    // Then recompute summary
    const wallets = await resolveUserWallets(userId).catch<WalletPortfolio[]>(
      () => [],
    );
    if (!wallets.length) return;

    const snapshots = wallets.map((wallet) => {
      try {
        return buildWalletSnapshot(wallet);
      } catch {
        return null;
      }
    });

    const filtered = snapshots.filter(
      (snapshot): snapshot is WalletSnapshot => snapshot !== null,
    );

    // Enrich in background too
    const enriched = await Promise.all(
      filtered.map((snap) => enrichSnapshotWithAssets(snap, userId, true)),
    );
    const totalValue = sumValues(
      enriched.map((snap) => snap.totals.estimatedValueUsd),
    );

    const envelope: WalletSummaryEnvelope = {
      wallets: enriched,
      aggregated: {
        totalWallets: filtered.length,
        estimatedValueUsd: totalValue,
      },
      fetchedAt: new Date().toISOString(),
    };

    // Update cache
    if (cacheKey && isRedisConfigured) {
      await redis
        .setex(cacheKey, SUMMARY_CACHE_TTL_SECONDS, JSON.stringify(envelope))
        .catch(() => {});
    }
  } catch (error) {
    if (!IS_PRODUCTION) {
      logger.warn("wallet_summary_background_refresh_failed", error);
    }
  }
}

import { WalletAssetsService } from "@/server/services/wallet-assets";

import { logger } from "@/lib/logger";
// ... existing code ...

async function enrichSnapshotWithAssets(
  snapshot: WalletSnapshot,
  userId: string,
  shouldSync: boolean,
): Promise<WalletSnapshot> {
  // Use the ID (which is now UUID) to fetch holdings from DB
  if (!snapshot.id || !snapshot.address) return snapshot;

  try {
    let tokens: UnifiedAsset[] = [];

    if (shouldSync) {
      // Sync from Birdeye/Moralis
      // Determine chain for call.
      const effectiveChain =
        (snapshot.metadata?.chainId as string | number) ??
        (snapshot.type === "external_connected" &&
        snapshot.metadata?.kind === "solana"
          ? "solana"
          : 1);

      const assetsResult = await WalletAssetsService.syncAssets(
        userId,
        snapshot.id,
        snapshot.address,
        effectiveChain,
      );
      // Extract assets array from result
      tokens = assetsResult.success ? assetsResult.assets : [];
    } else {
      // Read from DB
      const supabase = await createServerSupabaseClient();
      if (supabase) {
        const { data: rawHoldings } = await supabase
          .from("token_holdings")
          .select("*")
          .eq("user_wallet_id", snapshot.id);

        if (rawHoldings) {
          tokens = rawHoldings.map((h: TokenHoldingRow) => {
            let chainId: number = 1;
            let platform: "evm" | "solana" = "evm";

            if (h.chain === "solana") {
              platform = "solana";
              chainId = 101;
            } else {
              platform = "evm";
              switch (h.chain) {
                case "ethereum":
                  chainId = 1;
                  break;
                case "base":
                  chainId = 8453;
                  break;
                case "arbitrum":
                  chainId = 42161;
                  break;
                case "optimism":
                  chainId = 10;
                  break;
                case "polygon":
                  chainId = 137;
                  break;
                case "bsc":
                  chainId = 56;
                  break;
                default:
                  chainId = 1;
                  break;
              }
            }

            return {
              id: `${h.chain}-${h.token_address}`,
              chainId,
              platform,
              contract: h.token_address === "native" ? null : h.token_address,
              name: h.name,
              symbol: h.symbol,
              decimals: h.decimals,
              balance: h.ui_amount ?? 0,
              uiAmount: h.ui_amount ?? 0,
              priceUsd: h.price_usd,
              valueUsd: h.value_usd,
              change24hPercent: null,
              logoURI: h.logo_url,
              isNative: h.token_address === "native",
            };
          });
        }
      }
    }

    if (!tokens.length && !shouldSync) return snapshot;

    snapshot.tokens = tokens;
    snapshot.totals.tokenCount = tokens.length;

    // Recalculate totals from data
    const totalUsd = tokens.reduce(
      (sum: number, h) => sum + (h.valueUsd ?? 0),
      0,
    );
    snapshot.totals.estimatedValueUsd = totalUsd;

    // Attempt to identify native balance
    const native = tokens.find(
      (h) => h.isNative || h.symbol === "ETH" || h.symbol === "SOL",
    );
    if (native) {
      snapshot.totals.nativeValueUsd = native.valueUsd;
    }

    return snapshot;
  } catch (error) {
    if (!IS_PRODUCTION) {
      logger.warn(
        `[wallet-summary] asset enrichment failed for ${snapshot.id}`,
        error,
      );
    }
    return snapshot;
  }
}
