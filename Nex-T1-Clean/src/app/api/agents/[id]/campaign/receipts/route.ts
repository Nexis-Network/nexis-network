export const maxDuration = 30;

import { connection, NextRequest } from "next/server";
import { z } from "zod";

import { createErrorResponse, createSuccessResponse } from "@/lib/request-utils";
import { canManageAgent } from "@/server/agents/access";
import { getCampaignById, getActiveCampaignForAgent } from "@/server/agents/campaign";
import { resolveAgentAccess } from "@/server/agents/agent-access";
import { withAuth } from "@/server/security/with-auth";

const querySchema = z.object({
  campaignId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  await connection();
  try {
    const auth = await withAuth(req, { requireOrg: false, allowPublic: false });
    if (!auth.ok) return auth.response;
    const userId = auth.session?.user?.id;
    if (!userId) {
      return createErrorResponse(new Error("Unauthenticated"), { status: 401 });
    }

    const { id: agentId } = await context.params;
    const url = new URL(req.url);
    const input = querySchema.parse({
      campaignId: url.searchParams.get("campaignId") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

    const accessResult = await resolveAgentAccess(req, agentId, { allowPublic: true, requireMembership: false });
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    const campaign = input.campaignId
      ? await getCampaignById(access.service, input.campaignId)
      : await getActiveCampaignForAgent(access.service, agentId);
    if (!campaign || campaign.agent_id !== agentId) {
      return createErrorResponse(new Error("campaign_not_found"), { status: 404, customMessage: "Campaign not found." });
    }

    const isManager = canManageAgent(access.membershipRole);
    let query = access.service
      .from("agent_payout_receipt")
      .select("id, distribution_id, recipient_user_id, recipient_address, network_id, asset_id, amount_base_units, tx_hash, receipt_signature, metadata, created_at")
      .eq("campaign_id", campaign.id)
      .order("created_at", { ascending: false })
      .limit(input.limit);
    if (!isManager) {
      query = query.eq("recipient_user_id", userId);
    }

    const { data, error } = await query;
    if (error) {
      return createErrorResponse(new Error(error.message), {
        status: 400,
        customMessage: "Failed to load campaign receipt timeline.",
      });
    }

    return createSuccessResponse({
      ok: true,
      campaign: {
        id: campaign.id,
        riskScore: campaign.risk_score,
        riskFlags: campaign.risk_flags ?? [],
      },
      receipts: (data ?? []).map((row) => ({
        id: row.id,
        distributionId: row.distribution_id,
        recipientUserId: row.recipient_user_id,
        recipientAddress: row.recipient_address,
        networkId: row.network_id,
        assetId: row.asset_id,
        amountBaseUnits: String(row.amount_base_units),
        txHash: row.tx_hash,
        signature: row.receipt_signature,
        metadata: row.metadata ?? {},
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
