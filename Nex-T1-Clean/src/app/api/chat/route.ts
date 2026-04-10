/**
 * Chat API Route
 * 
 * Handles chat message streaming using AI SDK patterns.
 * Uses createUIMessageStreamResponse for native SDK streaming.
 * 
 * Phase 4 of AI SDK Modernization - aligned with:
 * - AI SDK's UIMessage format
 * - Native tool call handling via message parts
 * - Rate limiting and security guardrails
 */

import { cookies } from "next/headers";

import { chatController } from "@/modules/chat/controller";
import { withAuth } from "@/server/security/with-auth";

// Tighter budget for chat executions to control spend
// Note: Streaming chat requests can legitimately exceed 30s when tools run or models
// take longer. If the handler is terminated mid-stream, browsers surface it as a
// TypeError "Failed to fetch" (network error), which is misleading.
export const maxDuration = 120;
const ALLOW_METHODS = "GET,POST,HEAD,OPTIONS";
const PREFLIGHT_HEADERS = {
  Allow: ALLOW_METHODS,
  "Access-Control-Allow-Methods": ALLOW_METHODS,
  "Access-Control-Allow-Headers": "content-type,authorization,x-correlation-id,x-request-id",
  "Access-Control-Max-Age": "86400",
} as const;

export async function GET() {
  return new Response(null, {
    status: 204,
    headers: { Allow: ALLOW_METHODS },
  });
}

export async function HEAD() {
  return new Response(null, {
    status: 204,
    headers: { Allow: ALLOW_METHODS },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: PREFLIGHT_HEADERS,
  });
}

export async function POST(req: Request) {
  const jar = await cookies();
  const auth = await withAuth(req, { requireOrg: false, allowPublic: false });
  if (!auth.ok) {
    return auth.response;
  }

  return chatController.streamResponse({ request: req, cookies: jar });
}
