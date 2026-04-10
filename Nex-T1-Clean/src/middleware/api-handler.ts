import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@/server/security/rate-limit-lite";
import { isPublicApiRoute } from "@/lib/middleware/route-policy";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContextEdge } from "@/server/auth/auth-context-edge";

/**
 * Routes exempt from middleware rate limiting.
 * - Auth/webhooks: independently protected.
 * - Chat: endpoint enforces its own tier-aware limiter.
 * - Analytics ingestion: high-frequency fire-and-forget beacons.
 */
const RATE_LIMIT_EXEMPT_PREFIXES = [
    "/api/auth/",
    "/api/chat",
    "/api/analytics/events",
    "/api/stripe/webhook",
];

function isRateLimitExempt(pathname: string): boolean {
    return RATE_LIMIT_EXEMPT_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

type ApiHandlerOptions = {
    request: NextRequest;
    requestHeaders: Headers;
    createSecureResponse: (response: NextResponse) => NextResponse;
    isE2ETest: boolean;
    isLocalDev: boolean;
};

export async function handleApiRoutes({
    request,
    requestHeaders,
    createSecureResponse,
    isE2ETest,
    isLocalDev,
}: ApiHandlerOptions): Promise<NextResponse> {
    const { pathname } = request.nextUrl;

    // Skip middleware rate limiting in local development to avoid noisy toast spam
    // when the client hammers anonymous endpoints (e.g., during auth retries).
    if (isLocalDev) {
        return createSecureResponse(
            NextResponse.next({ request: { headers: requestHeaders } }),
        );
    }
    let rateLimitHeaders: Record<string, string> | null = null;

    // Apply middleware rate limiting to mutating requests only.
    // GET/HEAD/OPTIONS endpoints are read-heavy and can legitimately burst.
    const authHeader = request.headers.get("authorization");
    const isServiceRole = authHeader?.startsWith("ServiceRole ") &&
        authHeader.slice(12) === process.env.SUPABASE_SERVICE_ROLE_KEY;
    const isReadRequest =
        request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS";
    const skipRateLimit = isE2ETest || isServiceRole || isReadRequest || isRateLimitExempt(pathname);

    if (!skipRateLimit) {
        const clientIp =
            request.headers.get("x-real-ip") ||
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            "unknown";

        const rate = await checkRateLimit(`api:${clientIp}:${pathname}`);
        if (!rate.success) {
            return createSecureResponse(
                NextResponse.json({ error: "rate_limited" }, { status: 429, headers: rate.headers })
            );
        }
        rateLimitHeaders = rate.headers;
    }

    // Check authentication for protected API routes
    if (!isPublicApiRoute(pathname) && !isServiceRole) {
        const cookieBridge = createCookieBridge(request.cookies);
        const { context } = await resolveSupabaseContextEdge(cookieBridge, { request });
        if (!context && !isE2ETest) {
            return createSecureResponse(
                NextResponse.json({ error: "unauthorized" }, { status: 401 })
            );
        }
    }

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    if (rateLimitHeaders) {
        Object.entries(rateLimitHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
        });
    }
    return createSecureResponse(response);
}
