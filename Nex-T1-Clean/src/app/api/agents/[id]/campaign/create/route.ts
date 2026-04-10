export const maxDuration = 30;

import { NextRequest } from "next/server";
import { z } from "zod";

import { createErrorResponse, createSuccessResponse } from "@/lib/request-utils";
import { canManageAgent } from "@/server/agents/access";
import {
  chainFamilySchema,
  compliancePolicySchema,
  computeCampaignRiskSnapshot,
  launchControlsSchema,
  revenuePolicySchema,
  tokenStandardSchema,
} from "@/server/agents/campaign";
import { resolveAgentAccess } from "@/server/agents/agent-access";

const createCampaignSchema = z.object({
  chainFamily: chainFamilySchema,
  chainRef: z.string().min(3),
  tokenStandard: tokenStandardSchema.default("erc20"),
  acceptedAssets: z.array(z.string().min(1)).min(1),
  targetBaseUnits: z.string().regex(/^\d+$/),
  minContributionBaseUnits: z.string().regex(/^\d+$/).default("0"),
  maxContributionBaseUnits: z.string().regex(/^\d+$/).optional().nullable(),
  valuationCapBaseUnits: z.string().regex(/^\d+$/).optional().nullable(),
  treasuryAddress: z.string().min(1).optional().nullable(),
  campaignAddress: z.string().min(1).optional().nullable(),
  shareTokenAddress: z.string().min(1).optional().nullable(),
  closeTs: z.string().datetime().optional().nullable(),
  launchControls: launchControlsSchema.default({}),
  compliancePolicy: compliancePolicySchema.default({}),
  revenuePolicy: revenuePolicySchema,
  whitelistUsers: z.array(z.string().uuid()).optional().default([]),
  whitelistWalletAddresses: z.array(z.string().min(8)).optional().default([]),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: agentId } = await context.params;
    const input = createCampaignSchema.parse(await req.json());

    const accessResult = await resolveAgentAccess(req, agentId, { allowPublic: false, requireMembership: true });
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    if (!canManageAgent(access.membershipRole)) {
      return createErrorResponse(new Error("Forbidden"), { status: 403 });
    }

    const { data: existing, error: existingError } = await access.service
      .from("agent_campaign")
      .select("id")
      .eq("agent_id", agentId)
      .eq("chain_ref", input.chainRef)
      .maybeSingle();
    if (existingError) {
      return createErrorResponse(new Error(existingError.message), {
        status: 400,
        customMessage: "Unable to validate campaign uniqueness",
      });
    }
    if (existing?.id) {
      return createErrorResponse(new Error("campaign_exists"), {
        status: 409,
        customMessage: "Campaign already exists for this agent and chain.",
      });
    }

    const normalizedLaunchControls = launchControlsSchema.parse(input.launchControls ?? {});
    const normalizedCompliancePolicy = compliancePolicySchema.parse(input.compliancePolicy ?? {});
    const risk = computeCampaignRiskSnapshot({
      treasuryAddress: input.treasuryAddress,
      revenuePolicy: input.revenuePolicy,
      launchControls: normalizedLaunchControls,
      acceptedAssets: input.acceptedAssets,
      valuationCapBaseUnits: input.valuationCapBaseUnits,
    });

    const payload = {
      org_id: access.agent.orgId,
      agent_id: agentId,
      chain_family: input.chainFamily,
      chain_ref: input.chainRef,
      token_standard: input.tokenStandard,
      accepted_assets: input.acceptedAssets,
      target_base_units: input.targetBaseUnits,
      min_contribution_base_units: input.minContributionBaseUnits,
      max_contribution_base_units: input.maxContributionBaseUnits ?? null,
      valuation_cap_base_units: input.valuationCapBaseUnits ?? null,
      treasury_address: input.treasuryAddress ?? null,
      campaign_address: input.campaignAddress ?? null,
      share_token_address: input.shareTokenAddress ?? null,
      close_ts: input.closeTs ?? null,
      launch_controls: normalizedLaunchControls,
      compliance_policy: normalizedCompliancePolicy,
      risk_score: risk.riskScore,
      risk_flags: risk.riskFlags,
      revenue_policy: input.revenuePolicy,
      status: "active" as const,
    };

    const { data: campaign, error } = await access.service
      .from("agent_campaign")
      .insert(payload)
      .select("id, org_id, agent_id, chain_family, chain_ref, token_standard, campaign_address, share_token_address, treasury_address, target_base_units, raised_base_units, risk_score, risk_flags, status, close_ts, created_at")
      .single();
    if (error) {
      return createErrorResponse(new Error(error.message), {
        status: 400,
        customMessage: "Campaign creation failed",
      });
    }

    if (input.whitelistUsers.length > 0 || input.whitelistWalletAddresses.length > 0) {
      const whitelistRows = [
        ...input.whitelistUsers.map((userId) => ({
          org_id: access.agent.orgId,
          campaign_id: campaign.id,
          user_id: userId,
          wallet_address: null,
        })),
        ...input.whitelistWalletAddresses.map((walletAddress) => ({
          org_id: access.agent.orgId,
          campaign_id: campaign.id,
          user_id: null,
          wallet_address: walletAddress,
        })),
      ];
      const { error: whitelistError } = await access.service.from("agent_campaign_whitelist_entry").insert(whitelistRows);
      if (whitelistError) {
        return createErrorResponse(new Error(whitelistError.message), {
          status: 400,
          customMessage: "Campaign created but whitelist initialization failed.",
        });
      }
    }

    return createSuccessResponse(
      { ok: true, campaign, riskSnapshot: risk },
      { headers: { "X-Correlation-Id": access.correlationId } },
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}
