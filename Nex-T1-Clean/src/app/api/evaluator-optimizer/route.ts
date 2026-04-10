import { cookies } from "next/headers";
import { validateUIMessages, type UIMessage, createAgentUIStreamResponse } from "ai";
import { evaluatorOptimizerOrchestratorAgent } from "../../../lib/multi-agent-orchestrator";
import { checkRateLimit } from "@/server/security/rate-limit-lite";
import { extractClientIP } from "@/lib/request-utils";
import { getVerifiedSupabaseSession } from "@/server/auth/session";
import { ensureActiveOrg } from "@/server/organization/active-org";


import { logger } from '@/lib/logger';
// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

/** Maximum duration for streaming responses (60 seconds) */
export const maxDuration = 60;

/** Rate limit key prefix for this endpoint */
const RATE_LIMIT_KEY_PREFIX = "ai-evaluator-optimizer-agent";

/**
 * Main API endpoint for the multi-agent evaluator-optimizer system
 *
 * This endpoint processes user messages and uses a multi-agent system with:
 * - Evaluator Agent: Specializes in assessing content quality and providing detailed feedback
 * - Optimizer Agent: Specializes in improving content based on evaluation feedback
 * - Orchestrator: Coordinates between the two agents to ensure high-quality outputs
 *
 * The system can:
 * - Evaluate content quality against specific criteria
 * - Optimize content based on evaluation feedback
 * - Iterate through evaluation-optimization cycles
 * - Provide detailed quality assessments and improvements
 * - Coordinate communication between specialized agents
 */
export async function POST(req: Request) {
  try {
    const session = await getVerifiedSupabaseSession({ request: req });
    if (!session) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const cookieJar = await cookies();
    let orgId = cookieJar.get("org_active_account")?.value?.trim();

    if (!orgId) {
      const orgResolution = await ensureActiveOrg({ cookieSource: cookieJar });
      if (!orgResolution.ok) {
        return orgResolution.response;
      }
      orgId = orgResolution.orgId;
    }

    // Extract client IP for rate limiting
    const clientIP = extractClientIP(req);

    // Check rate limit before processing
    const rateLimitResult = await checkRateLimit(
      `${RATE_LIMIT_KEY_PREFIX}-${orgId}-${clientIP}`
    );

    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // Parse request body
    const rawBody = (await req.json()) as UntypedJson;
    const body = parseRequestBody(rawBody);

    if (!body) {
      return new Response(
        JSON.stringify({
          error: "Payload must include a messages array.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Use the multi-agent orchestrator system with createAgentUIStreamResponse (AI SDK v6)
    const validatedMessages = await validateUIMessages({ messages: body.messages });
    return createAgentUIStreamResponse({
      agent: evaluatorOptimizerOrchestratorAgent,
      uiMessages: validatedMessages,
    });
  } catch (error) {
    logger.error("Error in multi-agent evaluator-optimizer system:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a rate limit exceeded response
 */
type RateLimitResult = Awaited<ReturnType<typeof checkRateLimit>>;

function createRateLimitResponse(rateLimitResult: RateLimitResult): Response {
  const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: "Rate limit exceeded. Please try again later.",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": retryAfter.toString(),
        ...rateLimitResult.headers,
      },
    }
  );
}

function parseRequestBody(
  body: UntypedJson
): { messages: UIMessage[] | UntypedJson[] } | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const maybeMessages = (body as { messages?: UntypedJson }).messages;
  if (!Array.isArray(maybeMessages)) {
    return null;
  }
  return { messages: maybeMessages };
}
