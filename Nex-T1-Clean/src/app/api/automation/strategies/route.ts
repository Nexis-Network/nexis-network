import { NextRequest } from "next/server";
import {
  createAutomationStrategy,
  listAutomationStrategies,
} from "@/server/automation/service";
import { apiResponse } from "@/lib/api-platform";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import { getOrSet } from "@/server/services/redis/cache";
import { withTimeoutFallback } from "@/lib/utils/timeout";
import { redis, isRedisConfigured } from "@/server/services/redis";


import { logger } from '@/lib/logger';
const STRATEGIES_CACHE_TTL = 30; // 30 seconds
const STRATEGIES_STALE_TTL = 120; // 2 minutes stale
const STRATEGIES_FETCH_TIMEOUT_MS = 5000;

export async function GET(_request: NextRequest) {
  return timeApiRoute("automation.strategies.list", async () => {
    return withAuthedSupabase(async ({ cookieBridge, supabase, userId }) => {
      try {
        const cacheKey = `automation:strategies:${userId}`;
        
        const strategies = await getOrSet(
          cacheKey,
          async () => {
            const result = await withTimeoutFallback(
              listAutomationStrategies(supabase, userId),
              {
                timeoutMs: STRATEGIES_FETCH_TIMEOUT_MS,
                fallback: () => [],
                scope: "automation_strategies_list",
              }
            );
            return result;
          },
          {
            ttlSeconds: STRATEGIES_CACHE_TTL,
            staleTtlSeconds: STRATEGIES_STALE_TTL,
            coalesce: true,
            lockTtlSeconds: 10,
            namespace: "automation",
          }
        );
        
        const response = apiResponse.success({ items: strategies });
        response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=120");
        return cookieBridge.commit(response);
      } catch (error) {
        logger.error("Failed to load strategies", error);
        return cookieBridge.commit(
          apiResponse.internalError("Failed to load strategies")
        );
      }
    });
  });
}

export async function POST(request: NextRequest) {
  return timeApiRoute("automation.strategies.create", async () => {
    return withAuthedSupabase(async ({ cookieBridge, supabase, userId }) => {
      try {
        let body;
        try {
            body = await request.json();
        } catch {
            return cookieBridge.commit(apiResponse.badRequest("Invalid JSON body"));
        }

        const created = await createAutomationStrategy(supabase, userId, body);
        
        // Invalidate cache on create
        if (isRedisConfigured) {
          const cacheKey = `automation:strategies:${userId}`;
          await redis!.del(cacheKey).catch(() => {});
        }
        
        return cookieBridge.commit(apiResponse.created(created));
      } catch (error) {
        logger.error("Failed to create strategy", error);
        return cookieBridge.commit(
          apiResponse.badRequest("Failed to create strategy")
        );
      }
    });
  });
}
