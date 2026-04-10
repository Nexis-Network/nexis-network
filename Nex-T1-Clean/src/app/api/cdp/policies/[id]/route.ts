import "server-only";

import { connection, NextRequest, NextResponse } from "next/server";
import { getVerifiedSupabaseSession } from "@/server/auth/session";
import { checkRateLimit, cdpSpendPermissionRateLimit } from "@/server/security/rate-limit";
import { logger } from "@/lib/logger";
import {
  getPolicy,
  updatePolicy,
  deletePolicy,
  updatePolicySchema,
} from "@/server/services/cdp/policy";

/**
 * CDP Policy Engine - Single Policy API
 *
 * GET    /api/cdp/policies/[id]  — Get a policy by ID
 * PUT    /api/cdp/policies/[id]  — Update a policy
 * DELETE /api/cdp/policies/[id]  — Delete a policy
 *
 * All endpoints require authenticated Supabase session.
 * Write operations (PUT, DELETE) are rate-limited.
 */

type RouteContext = {
  params: Promise<{ id: string }>;
};

// ---------------------------------------------------------------------------
// GET /api/cdp/policies/[id]
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  await connection();
  const session = await getVerifiedSupabaseSession({});
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { message: "Authentication required" } },
      { status: 401 },
    );
  }

  const { id: policyId } = await context.params;

  if (!policyId || policyId.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: { message: "Policy ID is required" } },
      { status: 400 },
    );
  }

  try {
    const policy = await getPolicy(policyId, session.user.id);

    return NextResponse.json({
      success: true,
      data: { policy },
    });
  } catch (err) {
    logger.error("cdp_policy_get_api_error", {
      error: err instanceof Error ? err.message : String(err),
      userId: session.user.id,
      policyId,
    });

    const status = (err instanceof Error && err.message.includes("404")) ? 404 : 502;
    return NextResponse.json(
      { success: false, error: { message: status === 404 ? "Policy not found" : "Failed to get policy" } },
      { status },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/cdp/policies/[id]
// ---------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  const session = await getVerifiedSupabaseSession({});
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { message: "Authentication required" } },
      { status: 401 },
    );
  }

  const { id: policyId } = await context.params;

  if (!policyId || policyId.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: { message: "Policy ID is required" } },
      { status: 400 },
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

  const parsed = updatePolicySchema.safeParse(body);
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
    const policy = await updatePolicy(policyId, parsed.data, session.user.id);

    return NextResponse.json({
      success: true,
      data: { policy },
    });
  } catch (err) {
    logger.error("cdp_policy_update_api_error", {
      error: err instanceof Error ? err.message : String(err),
      userId: session.user.id,
      policyId,
    });

    return NextResponse.json(
      { success: false, error: { message: "Failed to update policy" } },
      { status: 502 },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/cdp/policies/[id]
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  const session = await getVerifiedSupabaseSession({});
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { message: "Authentication required" } },
      { status: 401 },
    );
  }

  const { id: policyId } = await context.params;

  if (!policyId || policyId.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: { message: "Policy ID is required" } },
      { status: 400 },
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

  try {
    await deletePolicy(policyId, session.user.id);

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    });
  } catch (err) {
    logger.error("cdp_policy_delete_api_error", {
      error: err instanceof Error ? err.message : String(err),
      userId: session.user.id,
      policyId,
    });

    return NextResponse.json(
      { success: false, error: { message: "Failed to delete policy" } },
      { status: 502 },
    );
  }
}
