import { createSlidingWindowLimiter } from "@/server/security/rate-limit";

// 10 requests / day for table-editor artifact generation.
const tableEditorLimiter = createSlidingWindowLimiter(
  10,
  24 * 60 * 60 * 1000,
  "artifact-table",
);

export async function checkRateLimit(identifier: string) {
  const { success, limit, reset, remaining } = await tableEditorLimiter.limit(identifier);

  return {
    success,
    limit,
    reset,
    remaining,
    headers: {
      "X-RateLimit-Limit": limit.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": reset.toString(),
    },
  };
}

export function getClientIP(req: Request): string {
  // Try to get IP from various headers (for different deployment scenarios)
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIP = req.headers.get("x-real-ip");
  const cfConnectingIP = req.headers.get("cf-connecting-ip");

  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback to a default identifier if no IP is found
  return "unknown";
}
