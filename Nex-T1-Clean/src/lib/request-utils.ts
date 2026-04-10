import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/server/security/rate-limit-lite";
export interface RateLimitConfig {
  prefix?: string;
  maxRequests?: number;
  window?: string;
}

export interface RateLimitResponse {
  success: boolean;
  limit: number;
  reset: number;
  remaining: number;
  headers: Record<string, string>;
}

export interface RateLimitErrorResponse {
  error: string;
  retryAfter: number;
  type: string;
  status: number;
  headers: Record<string, string>;
}

/**
 * Extracts the client IP address from various headers
 * Handles forwarded, real-ip, and Cloudflare headers
 *
 * @param req - The incoming request object
 * @returns The client IP address or "unknown" if not found
 *
 * @example
 * ```typescript
 * const clientIP = extractClientIP(req);
 * logger.debug(`Request from IP: ${clientIP}`);
 * ```
 */
export function extractClientIP(req: Request | NextRequest): string {
  const vercelIp = req.headers.get("x-vercel-ip");
  if (vercelIp) return vercelIp;

  const runtimeIp =
    "ip" in req && typeof (req as { ip?: UntypedJson }).ip === "string"
      ? (req as { ip?: string }).ip
      : undefined;
  if (runtimeIp) return runtimeIp;

  const realIP = req.headers.get("x-real-ip");
  if (realIP) return realIP;

  const cfConnectingIP = req.headers.get("cf-connecting-ip");
  if (cfConnectingIP) return cfConnectingIP;

  return "unknown";
}

/**
 * Creates a rate limit identifier with optional prefix
 *
 * @param clientIP - The client IP address
 * @param prefix - Optional prefix for the identifier (default: "ai-elements-sources-chat")
 * @returns A unique identifier for rate limiting
 *
 * @example
 * ```typescript
 * const identifier = createRateLimitIdentifier("192.168.1.1", "api");
 * // Returns: "api-192.168.1.1"
 * ```
 */
export function createRateLimitIdentifier(
  clientIP: string,
  prefix = "ai-elements-sources-chat"
): string {
  return `${prefix}-${clientIP}`;
}

/**
 * Build a composite rate-limit key factoring org/user/route and IP.
 */
export function createCompositeRateLimitKey(options: {
  clientIP: string;
  route: string;
  orgId?: string | null;
  userId?: string | null;
  prefix?: string;
}): string {
  const { clientIP, route, orgId, userId, prefix = "api" } = options;
  const who = orgId ?? userId ?? "anon";
  return `${prefix}:${route}:${who}:${clientIP}`;
}

/**
 * Checks rate limit and returns the result.
 * Optionally accepts a tier for tier-aware rate limiting.
 *
 * @param identifier - The rate limit identifier
 * @param tier - Optional subscription tier (e.g. "free", "pro", "ultra")
 * @returns Promise resolving to rate limit result
 */
export async function checkRequestRateLimit(
  identifier: string,
  tier?: string | null,
): Promise<RateLimitResponse> {
  return await checkRateLimit(identifier, tier);
}

/**
 * Creates a rate limit error response with proper headers
 *
 * @param rateLimitResult - The rate limit result object
 * @returns Formatted error response with headers
 */
export function createRateLimitErrorResponse(
  rateLimitResult: RateLimitResponse
): RateLimitErrorResponse {
  const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);

  return {
    error: "Rate limit exceeded. Please try again later.",
    retryAfter,
    type: "rate_limit_exceeded",
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": retryAfter.toString(),
      ...rateLimitResult.headers,
    },
  };
}

/**
 * Handles the complete rate limiting flow for a request
 * Returns either the rate limit result or an error response
 *
 * @param req - The incoming request object
 * @param prefix - Optional prefix for rate limiting (default: "ai-elements-sources-chat")
 * @returns Promise resolving to either success with rate limit result or failure with error response
 *
 * @example
 * ```typescript
 * // Basic usage
 * const result = await handleRequestRateLimit(req);
 * if (result.success) {
 *   // Rate limit check passed, continue with request
 *   logger.debug(`Remaining requests: ${result.rateLimitResult.remaining}`);
 * } else {
 *   // Rate limit exceeded, return error
 *   return createRateLimitResponse(result.errorResponse);
 * }
 *
 * // With custom prefix
 * const result = await handleRequestRateLimit(req, "custom-api");
 * ```
 */
export async function handleRequestRateLimit(
  req: Request | NextRequest,
  prefix = "ai-elements-sources-chat",
  tier?: string | null,
): Promise<
  | { success: true; rateLimitResult: RateLimitResponse }
  | { success: false; errorResponse: RateLimitErrorResponse }
> {
  const clientIP = extractClientIP(req);
  const identifier = createRateLimitIdentifier(clientIP, prefix);
  const rateLimitResult = await checkRequestRateLimit(identifier, tier);

  if (rateLimitResult.success) {
    return { success: true, rateLimitResult };
  }
  const errorResponse = createRateLimitErrorResponse(rateLimitResult);
  return { success: false, errorResponse };
}

/**
 * Handle rate limit with a precomputed identifier key.
 * Optionally accepts a tier for tier-aware rate limiting.
 */
export async function handleRequestRateLimitWithKey(
  identifier: string,
  tier?: string | null,
): Promise<
  | { success: true; rateLimitResult: RateLimitResponse }
  | { success: false; errorResponse: RateLimitErrorResponse }
> {
  const rateLimitResult = await checkRequestRateLimit(identifier, tier);
  if (rateLimitResult.success) return { success: true, rateLimitResult };
  return { success: false, errorResponse: createRateLimitErrorResponse(rateLimitResult) };
}

/**
 * Utility to create a rate limit error response as a Next.js Response
 *
 * @param errorResponse - The error response object
 * @returns Next.js Response object with proper status and headers
 *
 * @example
 * ```typescript
 * const result = await handleRequestRateLimit(req);
 * if (!result.success) {
 *   return createRateLimitResponse(result.errorResponse);
 * }
 * ```
 */
export function createRateLimitResponse(
  errorResponse: RateLimitErrorResponse
): Response {
  return new Response(
    JSON.stringify({
      error: errorResponse.error,
      retryAfter: errorResponse.retryAfter,
      type: errorResponse.type,
    }),
    {
      status: errorResponse.status,
      headers: errorResponse.headers,
    }
  );
}

/**
 * Creates a standardized error response for internal server errors
 *
 * @param error - The error object
 * @param options - Optional configuration for the error response
 * @returns Next.js Response object with proper error formatting
 *
 * @example
 * ```typescript
 * try {
 *   // Your API logic
 * } catch (error) {
 *   return createErrorResponse(error);
 * }
 *
 * // With custom options
 * return createErrorResponse(error, {
 *   includeDetails: true,
 *   customMessage: "Something went wrong with the request"
 * });
 * ```
 */
export function createErrorResponse(
  error: UntypedJson,
  options: {
    includeDetails?: boolean;
    customMessage?: string;
    status?: number;
    headers?: Record<string, string>;
  } = {}
): Response {
  const {
    includeDetails = process.env.NODE_ENV === "development",
    customMessage = "Internal server error. Please try again later.",
    status = 500,
    headers = {},
  } = options;

  const errorMessage = error instanceof Error ? error.message : String(error);

  return new Response(
    JSON.stringify({
      error: customMessage,
      type: "internal_error",
      ...(includeDetails && { details: errorMessage }),
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    }
  );
}

/**
 * Returns existing correlation ID from headers or generates a new one.
 */
export function getOrCreateCorrelationId(req: Request | NextRequest): string {
  const existing =
    req.headers.get("x-correlation-id") ||
    req.headers.get("x-request-id");
  if (existing) return existing;
  // Prefer Web Crypto when available (edge/runtime-safe)
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback to Node's crypto when running in a Node.js runtime.
  try {
    // Lazy import to avoid bundling for edge.
    const { randomUUID } = require("crypto") as typeof import("crypto");
    return randomUUID();
  } catch {
    // Last-resort, low-collision fallback.
    return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }
}

/**
 * Creates a standardized success response with optional data
 *
 * @param data - The data to return
 * @param options - Optional configuration for the response
 * @returns Next.js Response object with proper formatting
 *
 * @example
 * ```typescript
 * return createSuccessResponse({ message: "Success!" });
 *
 * // With custom status
 * return createSuccessResponse(data, { status: 201 });
 * ```
 */
export function createSuccessResponse(
  data: UntypedJson,
  options: {
    status?: number;
    headers?: Record<string, string>;
  } = {}
): Response {
  const { status = 200, headers = {} } = options;

  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}
