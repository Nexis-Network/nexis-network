/**
 * API Route: Create Approval Request
 * POST /api/approvals/request
 * Purpose: Called by tools to create approval request or check if auto-approve allowed
 */

import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { z } from "zod";
import {
  createApprovalRequest,
  getUserAgentSettings,
  shouldAutoApprove,
  autoApproveRequest,
  ApprovalPayloadSchema,
  type ApprovalPayload,
  AUTONOMOUS_ACTIONS,
} from "@/lib/approvals/state-machine";
import { requireSupabaseUser } from "@/server/api/helpers/with-supabase-user";


import { logger } from '@/lib/logger';
const RequestSchema = z.object({
  toolId: z.enum(["evm_wallet", "token_minter", "bitcoin_network"]),
  command: z.string(),
  args: z.record(z.string(), z.unknown()),
  preview: ApprovalPayloadSchema.shape.preview,
  estimatedCostUsd: z.string().optional(),
  chain: z.string().optional(),
  timeoutSeconds: z.number().int().min(10).max(300).optional(),
  operationType: z.enum(AUTONOMOUS_ACTIONS).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSupabaseUser(req);
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    // Parse and validate request
    const body = await req.json();
    const validated = RequestSchema.parse(body);

    const payload: ApprovalPayload = {
      toolId: validated.toolId,
      command: validated.command,
      args: validated.args,
      preview: validated.preview,
      ...(validated.operationType ? { operationType: validated.operationType } : {}),
    };

    // Get user's agent settings
    const settings = await getUserAgentSettings(userId);

    // Check if auto-approve allowed
    const autoApprove = shouldAutoApprove(
      settings,
      validated.estimatedCostUsd,
      validated.chain,
      validated.operationType,
    );

    if (autoApprove) {
      // Auto-approve and log
      const approvalId = await autoApproveRequest(userId, payload, {
        ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
        userAgent: req.headers.get("user-agent") || undefined,
        sessionId: body.sessionId,
      });

      return apiResponse.success({
        approvalId,
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        requiresApproval: false,
        autoApproved: true,
      });
    }

    // Create approval request (requires user decision)
    const approval = await createApprovalRequest(userId, payload, validated.timeoutSeconds, {
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
      sessionId: body.sessionId,
    });

    return apiResponse.success({
      approvalId: approval.id,
      expiresAt: approval.expiresAt.toISOString(),
      requiresApproval: true,
      autoApproved: false,
    });
  } catch (error) {
    logger.error("[API] Approval request error:", error);

    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error);
    }

    return apiResponse.internalError(error instanceof Error ? error.message : "Failed to create approval request");
  }
}
