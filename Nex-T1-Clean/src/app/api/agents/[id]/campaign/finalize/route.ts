export const maxDuration = 30;

import { NextRequest } from "next/server";
import { z } from "zod";

import { createErrorResponse, createSuccessResponse } from "@/lib/request-utils";
import { canManageAgent } from "@/server/agents/access";
import { getCampaignById } from "@/server/agents/campaign";
import { resolveAgentAccess } from "@/server/agents/agent-access";

const finalizeSchema = z.object({
  campaignId: z.string().uuid(),
  finalStatus: z.enum(["finalized", "cancelled"]).default("finalized"),
  campaignAddress: z.string().min(1).optional().nullable(),
  shareTokenAddress: z.string().min(1).optional().nullable(),
  treasuryAddress: z.string().min(1).optional().nullable(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: agentId } = await context.params;
    const input = finalizeSchema.parse(await req.json());

    const accessResult = await resolveAgentAccess(req, agentId, { allowPublic: false, requireMembership: true });
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;
    if (!canManageAgent(access.membershipRole)) {
      return createErrorResponse(new Error("Forbidden"), { status: 403 });
    }

    const campaign = await getCampaignById(access.service, input.campaignId);
    if (!campaign || campaign.agent_id !== agentId) {
      return createErrorResponse(new Error("campaign_not_found"), {
        status: 404,
        customMessage: "Campaign not found.",
      });
    }
    if (campaign.status !== "active" && campaign.status !== "draft") {
      return createErrorResponse(new Error("invalid_campaign_state"), {
        status: 400,
        customMessage: "Campaign is already closed.",
      });
    }

    const { data: updated, error } = await access.service
      .from("agent_campaign")
      .update({
        status: input.finalStatus,
        campaign_address: input.campaignAddress ?? null,
        share_token_address: input.shareTokenAddress ?? null,
        treasury_address: input.treasuryAddress ?? null,
        close_ts: new Date().toISOString(),
      })
      .eq("id", campaign.id)
      .select(
        "id, status, chain_ref, campaign_address, share_token_address, treasury_address, target_base_units, raised_base_units, close_ts, updated_at",
      )
      .single();
    if (error) {
      return createErrorResponse(new Error(error.message), {
        status: 400,
        customMessage: "Failed to finalize campaign.",
      });
    }

    return createSuccessResponse({ ok: true, campaign: updated }, { headers: { "X-Correlation-Id": access.correlationId } });
  } catch (error) {
    return createErrorResponse(error);
  }
}
