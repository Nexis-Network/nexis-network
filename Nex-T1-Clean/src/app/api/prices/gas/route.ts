import { NextRequest, connection } from "next/server";
import { z } from "zod";
import { withApiRoute } from "@/lib/api-handler";
import {
  createCompositeRateLimitKey,
  extractClientIP,
  handleRequestRateLimitWithKey,
} from "@/lib/request-utils";
import {
  GasPriceLookupError,
  lookupGasPrice,
} from "@/server/services/prices/gas-price";


const querySchema = z.object({
  chainId: z.coerce.number().int().positive().optional(),
});

export const GET = withApiRoute(async (request: NextRequest) => {
  await connection();
  const clientIP = extractClientIP(request);
  const rateKey = createCompositeRateLimitKey({
    clientIP,
    route: "prices-gas-get",
    prefix: "prices",
  });
  const rateLimit = await handleRequestRateLimitWithKey(rateKey);
  if (!rateLimit.success) {
    throw { status: 429, code: "RATE_LIMITED", message: "Too many requests" };
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    chainId: url.searchParams.get("chainId") ?? undefined,
  });
  if (!parsed.success) {
    throw { status: 400, code: "VALIDATION_ERROR", message: "Invalid request parameters" };
  }

  try {
    return await lookupGasPrice(parsed.data.chainId ?? 1);
  } catch (error) {
    if (error instanceof GasPriceLookupError) {
      throw {
        status: error.status,
        code: error.code,
        message: error.message,
      };
    }
    throw error;
  }
});
