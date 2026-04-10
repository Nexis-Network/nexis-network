import { cookies } from "next/headers";

import { apiResponse } from "@/lib/api-platform";
import { createCompositeRateLimitKey, createRateLimitResponse, extractClientIP, handleRequestRateLimitWithKey } from "@/lib/request-utils";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { MoralisConfigError, MoralisError } from "@/server/moralis/client";

export async function requireUserContext(request: Request): Promise<
  | { ok: true; userId: string; bridge: ReturnType<typeof createCookieBridge> }
  | { ok: false; response: Response }
> {
  const jar = await cookies();
  const bridge = createCookieBridge(jar);
  const { context } = await resolveSupabaseContext(bridge, { refreshSession: false, request });
  const userId = context?.userId ? String(context.userId) : null;
  if (!userId) {
    return { ok: false, response: bridge.commit(apiResponse.unauthorized("unauthorized")) };
  }
  return { ok: true, userId, bridge };
}

export async function enforceToolRateLimit(params: {
  request: Request;
  route: string;
  userId?: string | null;
  orgId?: string | null;
}): Promise<{ ok: true } | { ok: false; response: Response }> {
  const clientIP = extractClientIP(params.request);
  const key = createCompositeRateLimitKey({
    clientIP,
    route: params.route,
    userId: params.userId ?? null,
    orgId: params.orgId ?? null,
    prefix: "tools",
  });

  const rl = await handleRequestRateLimitWithKey(key);
  if (!rl.success) {
    return { ok: false, response: createRateLimitResponse(rl.errorResponse) };
  }
  return { ok: true };
}

export function toolErrorResponse(error: UntypedJson): Response {
  // apiResponse.internalError uses a generic message, here we want specific if provided but safe
  // Replicating legacy logic but with apiResponse
  let fallback = apiResponse.internalError("tool_failed"); 
  // apiResponse headers are readonly-ish in some contexts, so we might need to clone or just set if allow.
  // Actually apiResponse returns NextResponse which has mutable headers.
  fallback.headers.set("Cache-Control", "no-store");

  if (error instanceof Error) {
    const message = error.message?.trim();
    const invalidMessages = new Set([
      "Invalid EVM address",
      "Invalid EVM chain",
      "Invalid Solana address",
      "Invalid Solana network",
    ]);
    if (message && invalidMessages.has(message)) {
      const response = apiResponse.badRequest(message);
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
  }

  if (error instanceof MoralisConfigError) {
    const response = apiResponse.serviceUnavailable("not_configured");
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  if (error instanceof MoralisError) {
    const upstreamStatus = error.meta.status ?? null;
    const requestId = error.meta.requestId ?? null;
    // Map status to standard
    const status = upstreamStatus === 429 ? 429 : upstreamStatus === 401 || upstreamStatus === 403 ? 503 : 502;
    const code =
      upstreamStatus === 429 ? "rate_limited"
        : upstreamStatus === 401 || upstreamStatus === 403 ? "upstream_auth_failed"
          : "upstream_error";
    
    // apiResponse doesn't have explicit arbitrary status helper exposed usually, but we can use error()
    const response = apiResponse.error(code, "Upstream Error", status, { upstreamStatus, requestId });
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  return fallback;
}
