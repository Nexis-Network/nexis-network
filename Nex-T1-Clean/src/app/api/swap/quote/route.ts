import { connection, NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import { getZeroExSwapQuote, ZeroExQuoteSchema } from "@/server/swap/0x";
import { z } from "zod";
import { checkRateLimit, swapQuoteRateLimit } from "@/server/security/rate-limit";


import { logger } from '@/lib/logger';
export async function GET(req: NextRequest) {
  await connection();
  return withAuthedSupabase(async ({ cookieBridge, userId }) => {
    const rl = await checkRateLimit(userId, swapQuoteRateLimit);
    if (!rl.success) {
      return cookieBridge.commit(apiResponse.error("RATE_LIMITED", "Too many swap quote requests", 429));
    }

    const searchParams = req.nextUrl.searchParams;
    const params = Object.fromEntries(searchParams.entries());

    try {
      const validated = ZeroExQuoteSchema.parse(params);
      const quote = await getZeroExSwapQuote(validated);
      return cookieBridge.commit(apiResponse.success(quote));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return cookieBridge.commit(apiResponse.validationError(error));
      }
      const message = error instanceof Error ? error.message : "Failed to fetch swap quote";
      logger.error("[swap/quote] Error:", message);
      return cookieBridge.commit(apiResponse.internalError(message));
    }
  });
}
