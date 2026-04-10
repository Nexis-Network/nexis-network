
import { cookies } from "next/headers";
import { connection, type NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";
import {
  handleRequestRateLimit,
  createRateLimitResponse,
} from "@/lib/request-utils";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { isNonProductionTestMode } from "@/server/auth/test-mode";
import { getDetachedWalletsByOwner } from "@/server/services/cdp/agent-provision";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * GET /api/agents/wallets/detached
 *
 * Returns all detached (legacy) wallets for the authenticated user.
 * Joins the `agent` table so each wallet includes `agent_name`.
 *
 * Query params:
 *   - limit  (optional, default 50, max 200)
 *   - offset (optional, default 0)
 */
export async function GET(request: NextRequest): Promise<Response> {
  await connection();
  return timeApiRoute("agents.wallets.detached.GET", async () => {
    const jar = await cookies();
    const cookieBridge = createCookieBridge(jar);

    // Rate limit: 30 requests per minute per client
    const rlResult = await handleRequestRateLimit(request, "agents-wallets-detached");
    if (!rlResult.success) {
      return cookieBridge.commit(createRateLimitResponse(rlResult.errorResponse));
    }

    try {
      const { context } = await resolveSupabaseContext(cookieBridge, { request });
      if (!context) {
        if (isNonProductionTestMode({ cookies: jar, request })) {
          return cookieBridge.commit(
            apiResponse.success(
              { wallets: [] },
              {
                page: 1,
                limit: DEFAULT_LIMIT,
                total: 0,
                hasMore: false,
              },
            ),
          );
        }
        return cookieBridge.commit(apiResponse.unauthorized("Valid session required"));
      }

      // Parse optional pagination params
      const url = new URL(request.url);
      const rawLimit = url.searchParams.get("limit");
      const rawOffset = url.searchParams.get("offset");

      const limit = rawLimit
        ? Math.min(Math.max(Number(rawLimit) || DEFAULT_LIMIT, 1), MAX_LIMIT)
        : DEFAULT_LIMIT;

      const offset = rawOffset
        ? Math.max(Number(rawOffset) || 0, 0)
        : 0;

      const { wallets, total } = await getDetachedWalletsByOwner(
        context.userId,
        { limit, offset },
      );

      return cookieBridge.commit(
        apiResponse.success(
          { wallets },
          {
            page: Math.floor(offset / limit) + 1,
            limit,
            total,
            hasMore: offset + wallets.length < total,
          },
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("agents_wallets_detached_failed", { error: message });
      return cookieBridge.commit(
        apiResponse.internalError("Failed to fetch detached wallets"),
      );
    }
  });
}
