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
  investorUserId: z.string().uuid().optional(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
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
    const parsedUrl = new URL(req.url);
    const input = querySchema.parse({
      campaignId: parsedUrl.searchParams.get("campaignId") ?? undefined,
      investorUserId: parsedUrl.searchParams.get("investorUserId") ?? undefined,
    });

    const accessResult = await resolveAgentAccess(req, agentId, { allowPublic: true, requireMembership: false });
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    const campaign = input.campaignId
      ? await getCampaignById(access.service, input.campaignId)
      : await getActiveCampaignForAgent(access.service, agentId);
    if (!campaign || campaign.agent_id !== agentId) {
      return createErrorResponse(new Error("campaign_not_found"), {
        status: 404,
        customMessage: "Campaign not found.",
      });
    }

    const investorUserId =
      input.investorUserId && canManageAgent(access.membershipRole) ? input.investorUserId : userId;

    const { data: position, error: positionError } = await access.service
      .from("agent_investor_position")
      .select(
        "id, investor_user_id, shares_owned_base_units, principal_base_units, claimable_base_units, claimed_base_units, updated_at",
      )
      .eq("campaign_id", campaign.id)
      .eq("investor_user_id", investorUserId)
      .maybeSingle();
    if (positionError) {
      return createErrorResponse(new Error(positionError.message), {
        status: 400,
        customMessage: "Failed to load investor position.",
      });
    }

    const { data: distributions, error: distError } = await access.service
      .from("agent_revenue_distribution")
      .select("id, network_id, asset_id, gross_base_units, investor_base_units, epoch_index, created_at")
      .eq("campaign_id", campaign.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (distError) {
      return createErrorResponse(new Error(distError.message), {
        status: 400,
        customMessage: "Failed to load campaign distributions.",
      });
    }

    return createSuccessResponse(
      {
        ok: true,
        campaign: {
          id: campaign.id,
          chainFamily: campaign.chain_family,
          chainRef: campaign.chain_ref,
          tokenStandard: campaign.token_standard,
          status: campaign.status,
          riskScore: campaign.risk_score,
          riskFlags: campaign.risk_flags ?? [],
          launchControls: campaign.launch_controls ?? {},
          compliancePolicy: campaign.compliance_policy ?? {},
          targetBaseUnits: campaign.target_base_units,
          raisedBaseUnits: campaign.raised_base_units,
          closeTs: campaign.close_ts,
        },
        position: position
          ? {
              id: position.id,
              investorUserId: position.investor_user_id,
              sharesOwnedBaseUnits: String(position.shares_owned_base_units),
              principalBaseUnits: String(position.principal_base_units),
              claimableBaseUnits: String(position.claimable_base_units),
              claimedBaseUnits: String(position.claimed_base_units),
              updatedAt: position.updated_at,
            }
          : null,
        distributions: (distributions ?? []).map((item) => ({
          id: item.id,
          networkId: item.network_id,
          assetId: item.asset_id ?? null,
          grossBaseUnits: String(item.gross_base_units),
          investorBaseUnits: String(item.investor_base_units),
          epochIndex: item.epoch_index,
          createdAt: item.created_at,
        })),
      },
      { headers: { "X-Correlation-Id": access.correlationId } },
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}
