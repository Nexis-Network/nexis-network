import "server-only";

import {
  checkRateLimit,
  createSlidingWindowLimiter,
} from "@/server/security/rate-limit";
import type { DeveloperApiAuthContext } from "@/server/services/developer-api/types";

export async function enforcePublicApiRateLimit(
  context: DeveloperApiAuthContext,
): Promise<
  | { ok: true; headers: Record<string, string> }
  | { ok: false; status: 429; code: string; message: string; headers: Record<string, string> }
> {
  const limiter = createSlidingWindowLimiter(
    context.rateLimit.requests,
    context.rateLimit.windowSeconds * 1_000,
    "developer-public-api",
  );
  const result = await checkRateLimit(
    `${context.apiKeyId}:${context.requestIp}`,
    limiter,
  );

  if (result.success) {
    return { ok: true, headers: result.headers };
  }

  return {
    ok: false,
    status: 429,
    code: "RATE_LIMIT_EXCEEDED",
    message: "Rate limit exceeded for this API key.",
    headers: result.headers,
  };
}
