import { connection, NextRequest } from "next/server";
import { cookies } from "next/headers";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import {
  getCachedNativeBalanceWithMeta,
  refreshNativeBalance,
  refreshNativeBalanceInBackground,
  type NativeBalanceChainKind,
} from "@/server/wallets/native-balance-cache";
import { enqueueJob } from "@/server/queues/enqueue";
import { processInline } from "@/server/queues/config";


import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  await connection();
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);
  const { context } = await resolveSupabaseContext(cookieBridge, { refreshSession: false });

  if (!context?.userId) {
    return cookieBridge.commit(apiResponse.unauthorized());
  }

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") as NativeBalanceChainKind | null;
  const address = url.searchParams.get("address");
  const chainIdParam = url.searchParams.get("chainId");
  const refresh = url.searchParams.get("refresh") === "1";

  if (!kind || (kind !== "evm" && kind !== "solana")) {
    return cookieBridge.commit(apiResponse.badRequest("Invalid chain kind"));
  }

  if (!address) {
    return cookieBridge.commit(apiResponse.badRequest("Missing address"));
  }

  let chainId: number | undefined;
  if (chainIdParam) {
    const parsed = Number(chainIdParam);
    if (!Number.isFinite(parsed)) {
      return cookieBridge.commit(apiResponse.badRequest("Invalid chain ID"));
    }
    chainId = parsed;
  }

  const normalizedAddress = kind === "evm" ? address.trim().toLowerCase() : address.trim();

  const cacheOptions = { chainKind: kind, address: normalizedAddress, chainId } as const;

  // OPTIMIZATION: Stale-while-revalidate pattern
  // Return cached data immediately (even if stale), refresh in background
  const cached = await getCachedNativeBalanceWithMeta(cacheOptions);
  let value = cached.value;
  let source: "cache" | "stale" | "refreshed" | "refreshing" = cached.value !== null 
    ? (cached.isStale ? "stale" : "cache") 
    : "refreshing";

  const triggerRefresh = () => {
    if (processInline) {
      // In development: refresh in background, don't block response
      refreshNativeBalanceInBackground(cacheOptions);
    } else {
      // In production: use job queue
      enqueueJob("native_balance_refresh", {
        kind,
        address: normalizedAddress,
        chainId: chainId ?? null,
      }).catch((error) => {
        logger.warn("native_balance_refresh_enqueue_failed", { error });
      });
    }
  };

  // Force refresh requested or no cached data
  if (refresh || value === null) {
    if (value === null) {
      // No cached data - must wait for fetch
      if (processInline) {
        value = await refreshNativeBalance(cacheOptions);
        source = "refreshed";
      } else {
        triggerRefresh();
      }
    } else {
      // Have stale data - return it and refresh in background
      triggerRefresh();
    }
  } else if (cached.isStale) {
    // Data is stale - trigger background refresh
    triggerRefresh();
  }

  const response = apiResponse.success({
    value,
    source,
    address: normalizedAddress,
    chainId: chainId ?? null,
    kind,
  });
  
  // Add cache headers for client-side caching
  response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=300");
  
  return cookieBridge.commit(response);
}
