import "server-only";

import { connection, NextRequest, NextResponse } from "next/server";
import { getVerifiedSupabaseSession } from "@/server/auth/session";
import { checkRateLimit, cdpSpendPermissionRateLimit } from "@/server/security/rate-limit";
import { logger } from "@/lib/logger";
import {
  createPolicy,
  listPolicies,
  createPolicySchema,
} from "@/server/services/cdp/policy";

/**
 * CDP Policy Engine API
 *
 * GET  /api/cdp/policies?accountAddress=0x...  — List policies
 * POST /api/cdp/policies                       — Create a new policy
 *
 * All endpoints require authenticated Supabase session.
 * Write operations are rate-limited.
 */

// ---------------------------------------------------------------------------
// GET /api/cdp/policies
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  await connection();
  const session = await getVerifiedSupabaseSession({});
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { message: "Authentication required" } },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const accountAddress = searchParams.get("accountAddress") ?? undefined;

  try {
    const policies = await listPolicies(session.user.id, accountAddress);

    return NextResponse.json({
      success: true,
      data: { policies },
    });
  } catch (err) {
    logger.error("cdp_policy_list_api_error", {
      error: err instanceof Error ? err.message : String(err),
      userId: session.user.id,
      accountAddress: accountAddress ?? null,
    });

    return NextResponse.json(
      { success: false, error: { message: "Failed to list policies" } },
      { status: 502 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/cdp/policies
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const session = await getVerifiedSupabaseSession({});
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { message: "Authentication required" } },
      { status: 401 },
    );
  }

  // Rate limit write operations
  const rl = await checkRateLimit(session.user.id, cdpSpendPermissionRateLimit);
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: { message: "Too many requests" } },
      { status: 429, headers: rl.headers },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const parsed = createPolicySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: parsed.error.issues[0]?.message ?? "Invalid request body",
          details: parsed.error.issues,
        },
      },
      { status: 400 },
    );
  }

  try {
    const policy = await createPolicy(parsed.data, session.user.id);

    return NextResponse.json(
      { success: true, data: { policy } },
      { status: 201 },
    );
  } catch (err) {
    logger.error("cdp_policy_create_api_error", {
      error: err instanceof Error ? err.message : String(err),
      userId: session.user.id,
      name: parsed.data.name,
    });

    return NextResponse.json(
      { success: false, error: { message: "Failed to create policy" } },
      { status: 502 },
    );
  }
}
