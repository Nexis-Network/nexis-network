import { connection, NextRequest, NextResponse } from "next/server";

import { checkRateLimit, createErrorResponse, getClientIdentifier } from "@/lib/api-proxy";
import { createLogger } from "@/server/logging/logging";
import {
  resolveRequestedMarketStream,
} from "./route.service";
import { createMarketStreamResponse } from "./route.stream";

const logger = createLogger("market-stream");
const STREAM_RATE_LIMIT = {
  maxRequests: 30,
  windowSeconds: 60,
  prefix: "coingecko-stream",
} as const;
const MAX_STREAM_COINS = 25;
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  await connection();
  const clientId = getClientIdentifier(req);
  const rateLimit = await checkRateLimit(clientId, STREAM_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return createErrorResponse("Rate limit exceeded", 429, {
      rateLimitRemaining: rateLimit.remaining,
      rateLimitResetAt: rateLimit.resetAt,
    });
  }

  const { searchParams } = new URL(req.url);
  let requestedCoinList: string[] = [];
  let resolvedMapping: Record<string, string> = {};

  try {
    const resolvedRequest = await resolveRequestedMarketStream(searchParams);
    requestedCoinList = resolvedRequest.requestedCoinList;
    resolvedMapping = resolvedRequest.resolvedMapping;
  } catch (err) {
    logger.error("Failed to resolve market stream request identifiers", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Unable to resolve requested stream identifiers." },
      { status: 502 },
    );
  }

  if (!requestedCoinList.length) {
    return NextResponse.json(
      { error: "Provide at least one coin via coins, symbols, or addresses query parameters." },
      { status: 400 },
    );
  }

  if (requestedCoinList.length > MAX_STREAM_COINS) {
    return NextResponse.json(
      { error: `Too many coins requested. Maximum ${MAX_STREAM_COINS} coins per stream.` },
      { status: 400 },
    );
  }

  return createMarketStreamResponse({
    rateLimit: {
      remaining: rateLimit.remaining,
      resetAt: rateLimit.resetAt,
    },
    req,
    requestedCoinList,
    resolvedMapping,
  });
}
