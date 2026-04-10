import { cookies } from "next/headers";
import { connection, type NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getEnrichedUserWallets } from "@/server/wallets/user-wallets";
import { timeApiRoute } from "@/server/instrumentation/metrics";


import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return timeApiRoute("user.wallets.GET", async () => {
    await connection();
    const jar = await cookies();
    const cookieBridge = createCookieBridge(jar);
    const { context } = await resolveSupabaseContext(cookieBridge, {
      refreshSession: false,
      request,
    });

    if (!context?.userId) {
      if (request.headers.has("authorization")) {
        logger.warn(
          "[api/user/wallets] Authorization header provided but no authenticated user found, returning empty list",
        );
      }
      return cookieBridge.commit(apiResponse.success({ wallets: [] }));
    }

    const userId = String(context.userId);
    const wallets = await getEnrichedUserWallets(userId);

    const res = apiResponse.success({ wallets });
    res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
    return cookieBridge.commit(res);
  });
}
