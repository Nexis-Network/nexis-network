import { connection } from "next/server";
import { cookies } from "next/headers";


import { apiResponse } from "@/lib/api-platform";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { getSupabaseServerClient, getSupabaseAdminClient } from "@/server/services/supabase/supabaseClient";
import { fetchWatchlistQuotes } from "@/modules/watchlist/quotes";
import {
  ensureDefaultWatchlist,
  fetchDefaultWatchlist,
  fetchEnrichmentSnapshots,
  attachEnrichment,
  buildWatchlistResponse,
} from "@/modules/watchlist/service";
import { getOrSet } from "@/server/services/redis/cache";
import { withTimeoutFallback } from "@/lib/utils/timeout";
import type { WatchlistQuote, WatchlistSummary } from "@/types/watchlist";


import { logger } from '@/lib/logger';

const WATCHLIST_CACHE_TTL = 30; // 30 seconds for watchlist data
const WATCHLIST_STALE_TTL = 120; // 2 minutes stale
const QUOTES_CACHE_TTL = 15; // 15 seconds for quote data (more volatile)
const QUOTES_FETCH_TIMEOUT_MS = 15000;

export async function GET(request: Request) {
  await connection();
  return timeApiRoute("watchlist.GET", async () => {
    const jar = await cookies();
    const cookieBridge = createCookieBridge(jar);
    
    try {
      const { context } = await resolveSupabaseContext(cookieBridge, { request });

      if (!context?.userId) {
        return cookieBridge.commit(apiResponse.unauthorized());
      }

      const url = new URL(request.url);
      const vsCurrency = (url.searchParams.get("vsCurrency") ?? "usd").toLowerCase();

      const supabase = await getSupabaseServerClient({ accessToken: context.accessToken });
      if (!supabase) {
        return cookieBridge.commit(apiResponse.serviceUnavailable("Supabase unavailable"));
      }

      // Cache watchlist structure (changes less frequently)
      const watchlistCacheKey = `watchlist:user:${context.userId}`;
      const watchlist = await getOrSet(
        watchlistCacheKey,
        async () => {
          const result = await fetchDefaultWatchlist(supabase, context.userId);
          if (!result) {
            const adminSupabase = getSupabaseAdminClient();
            if (adminSupabase) {
              await ensureDefaultWatchlist(adminSupabase, context.userId);
              return await fetchDefaultWatchlist(adminSupabase, context.userId);
            }
            return null;
          }
          return result;
        },
        {
          ttlSeconds: WATCHLIST_CACHE_TTL,
          staleTtlSeconds: WATCHLIST_STALE_TTL,
          coalesce: true,
          namespace: "watchlist",
        }
      );
      
      if (!watchlist) {
        const emptyData = buildWatchlistResponse(null, vsCurrency);
        const res = apiResponse.success(emptyData);
        res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=120");
        return cookieBridge.commit(res);
      }

      // Attach enrichment snapshots (latest per asset)
      const enrichmentSnapshots = await fetchEnrichmentSnapshots(supabase, watchlist.items);
      const watchlistWithEnrichment = {
        ...watchlist,
        items: attachEnrichment(watchlist.items, enrichmentSnapshots),
      };

      // Cache quotes separately (more volatile, needs shorter TTL)
      const itemKeys = watchlistWithEnrichment.items.map((item) => keyFor(item.assetId, item.assetType)).sort().join(",");
      const quotesCacheKey = `watchlist:quotes:${vsCurrency}:${hashString(itemKeys)}`;
      
      const quotes = await getOrSet(
        quotesCacheKey,
        async () => {
          const result = await withTimeoutFallback(
            fetchWatchlistQuotes(watchlistWithEnrichment.items, vsCurrency),
            {
              timeoutMs: QUOTES_FETCH_TIMEOUT_MS,
              fallback: () => new Map(),
              scope: "watchlist_quotes",
            }
          );
          // Convert Map to serializable object for cache
          return Object.fromEntries(result);
        },
        {
          ttlSeconds: QUOTES_CACHE_TTL,
          staleTtlSeconds: 60,
          coalesce: true,
          namespace: "watchlist_quotes",
        }
      );
      
      // Convert back to Map with proper typing
      const quotesMap = new Map<string, WatchlistQuote>(
        Object.entries(quotes) as Array<[string, WatchlistQuote]>
      );

      const enriched: WatchlistSummary = {
        ...watchlistWithEnrichment,
        items: watchlistWithEnrichment.items.map((item) => ({
          ...item,
          quote: quotesMap.get(keyFor(item.assetId, item.assetType)),
        })),
      };

      const payload = buildWatchlistResponse(enriched, vsCurrency);
      const response = apiResponse.success(payload);
      response.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
      return cookieBridge.commit(response);
    } catch (error: UntypedJson) {
      logger.error("[Watchlist] Safe Fallback triggered:", error instanceof Error ? error : new Error(String(error)));
      // Return bare 200 OK manually to avoid any rigid cookie/bridge logic failing
      const emptyParams = buildWatchlistResponse(null, "usd");
      return cookieBridge.commit(apiResponse.success(emptyParams));
    }
  });
}

function keyFor(assetId: string, assetType: string) {
  return `${assetType}:${assetId}`.toLowerCase();
}

// Simple hash function for cache key generation
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
