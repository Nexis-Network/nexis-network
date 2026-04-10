import { cookies } from "next/headers";
import { ZodError } from "zod";

import { apiResponse } from "@/lib/api-platform";
import {
  createCompositeRateLimitKey,
  createRateLimitResponse,
  extractClientIP,
  handleRequestRateLimitWithKey,
} from "@/lib/request-utils";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getSupabaseServerClient } from "@/server/services/supabase/supabaseClient";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { normalizeEmbeddedWatchlistPayload } from "@/server/watchlist/embedded-payload";
import { addWatchlistItem } from "@/modules/watchlist/service";
import { watchlistItemInputSchema } from "@/modules/watchlist/validation";


export async function POST(request: Request) {
  return timeApiRoute("watchlist.items.POST", async () => {
    const jar = await cookies();
    const cookieBridge = createCookieBridge(jar);
    const { context } = await resolveSupabaseContext(cookieBridge, { request });

    if (!context?.userId) {
      return cookieBridge.commit(apiResponse.unauthorized());
    }

    const clientIP = extractClientIP(request);
    const rateKey = createCompositeRateLimitKey({
      clientIP,
      route: "watchlist-items-post",
      userId: context.userId,
      prefix: "watchlist",
    });
    const rateLimit = await handleRequestRateLimitWithKey(rateKey);
    if (!rateLimit.success) {
      return cookieBridge.commit(createRateLimitResponse(rateLimit.errorResponse));
    }

    let payload;
    try {
      const body = await request.json();
      try {
        payload = watchlistItemInputSchema.parse(body);
      } catch (parseError) {
        const normalized = normalizeEmbeddedWatchlistPayload(body);
        if (!normalized) {
          throw parseError;
        }
        payload = normalized;
      }
    } catch (error) {
      const message =
        error instanceof ZodError
          ? `${error.issues.map((issue) => issue.message).join(", ")}. Unable to extract address from embedded payload.`
          : "Invalid payload";
      return cookieBridge.commit(apiResponse.badRequest(message));
    }

    const supabase = await getSupabaseServerClient({ accessToken: context.accessToken });
    if (!supabase) {
      return cookieBridge.commit(apiResponse.serviceUnavailable("Supabase unavailable"));
    }

    const result = await addWatchlistItem(supabase, context.userId, payload);
    return cookieBridge.commit(apiResponse.success(result));
  });
}
