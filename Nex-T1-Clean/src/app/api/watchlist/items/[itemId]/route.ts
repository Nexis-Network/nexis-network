import { cookies } from "next/headers";

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
import { deleteWatchlistItem } from "@/modules/watchlist/service";
import { removeWatchlistItemSchema } from "@/modules/watchlist/validation";


type RouteContext = {
  params: Promise<{ itemId: string }>;
};

async function resolveAuthContext(request: Request) {
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);
  const { context } = await resolveSupabaseContext(cookieBridge, { refreshSession: false, request });
  return { cookieBridge, context };
}

export async function DELETE(request: Request, context: RouteContext) {
  return timeApiRoute("watchlist.items.DELETE", async () => {
    const { itemId } = await context.params;
    const { cookieBridge, context: auth } = await resolveAuthContext(request);

    if (!auth?.userId) {
      return cookieBridge.commit(apiResponse.unauthorized());
    }

    const clientIP = extractClientIP(request);
    const rateKey = createCompositeRateLimitKey({
      clientIP,
      route: "watchlist-items-delete",
      userId: auth.userId,
      prefix: "watchlist",
    });
    const rateLimit = await handleRequestRateLimitWithKey(rateKey);
    if (!rateLimit.success) {
      return cookieBridge.commit(createRateLimitResponse(rateLimit.errorResponse));
    }

    const parsed = removeWatchlistItemSchema.safeParse({ itemId });
    if (!parsed.success) {
      return cookieBridge.commit(apiResponse.badRequest("Invalid watchlist item"));
    }

    const supabase = await getSupabaseServerClient({ accessToken: auth.accessToken });
    if (!supabase) {
      return cookieBridge.commit(apiResponse.serviceUnavailable("Supabase unavailable"));
    }

    await deleteWatchlistItem(supabase, parsed.data.itemId);
    return cookieBridge.commit(apiResponse.success({ deleted: true }));
  });
}
