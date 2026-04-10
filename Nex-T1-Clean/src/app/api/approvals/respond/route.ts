/**
 * API Route: Respond to Approval
 * POST /api/approvals/respond
 * Purpose: User approves or rejects a pending approval request
 */

import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { z } from "zod";
import { respondToApproval } from "@/lib/approvals/state-machine";
import { jsonRecordSchema } from "@/lib/validation/json";
import { requireSupabaseUser } from "@/server/api/helpers/with-supabase-user";


import { logger } from '@/lib/logger';
const ResponseSchema = z.object({
  approvalId: z.string().uuid(),
  approved: z.boolean(),
  reason: z.string().optional(),
  metadata: jsonRecordSchema.optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSupabaseUser(req);
    if (!auth.ok) return auth.response;
    const { supabase, userId } = auth;

    // Parse request
    const body = await req.json();
    const validated = ResponseSchema.parse(body);

    // Verify approval exists and is pending
    const { data: approval, error: fetchError } = await supabase
      .from("tool_approvals")
      .select("status, expires_at")
      .eq("id", validated.approvalId)
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      return apiResponse.notFound("Approval not found");
    }

    if (approval.status !== "pending") {
      return apiResponse.error("APPROVAL_GONE", `Approval already ${approval.status}`, 410);
    }

    // Check if expired
    if (new Date(approval.expires_at) < new Date()) {
      return apiResponse.error("APPROVAL_EXPIRED", "Approval request has expired", 410);
    }

    // Record response
    await respondToApproval(
      validated.approvalId,
      userId,
      {
        approved: validated.approved,
        reason: validated.reason,
        metadata: validated.metadata,
      },
      {
        ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
        userAgent: req.headers.get("user-agent") || undefined,
      },
    );

    return apiResponse.success({
      success: true,
      status: validated.approved ? "approved" : "rejected",
    });
  } catch (error) {
    logger.error("[API] Approval response error:", error);

    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error);
    }

    return apiResponse.internalError(error instanceof Error ? error.message : "Failed to respond to approval");
  }
}
