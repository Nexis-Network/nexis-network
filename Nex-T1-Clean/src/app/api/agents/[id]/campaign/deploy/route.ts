export const maxDuration = 60;

import { NextRequest } from "next/server";
import { z } from "zod";
import { PublicKey } from "@solana/web3.js";

import { createErrorResponse, createSuccessResponse } from "@/lib/request-utils";
import { canManageAgent } from "@/server/agents/access";
import { campaignChainRefToEvmChainId, deployCampaignContracts } from "@/server/agents/campaign-deployer";
import { resolveAgentAccess } from "@/server/agents/agent-access";
import { deploySolanaCampaignArtifacts } from "@/server/agents/solana-campaign-deployer";
import { claimIdempotencyKey } from "@/server/security/idempotency";

const deploySchema = z.object({
  campaignId: z.string().uuid(),
  idempotencyKey: z.string().min(8),
  tokenName: z.string().trim().min(3).max(64).optional(),
  tokenSymbol: z.string().trim().min(2).max(12).optional(),
  tokenStandard: z.enum(["erc20", "erc404"]).optional(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function deriveSymbol(rawName: string): string {
  const cleaned = rawName.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return (cleaned.slice(0, 8) || "NEXA").toUpperCase();
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: agentId } = await context.params;
    const input = deploySchema.parse(await req.json());

    const accessResult = await resolveAgentAccess(req, agentId, { allowPublic: false, requireMembership: true });
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;
    if (!canManageAgent(access.membershipRole)) {
      return createErrorResponse(new Error("Forbidden"), { status: 403 });
    }
    const idem = await claimIdempotencyKey(input.idempotencyKey);
    if (!idem.ok) {
      return createErrorResponse(new Error("duplicate"), {
        status: 409,
        customMessage: "Duplicate idempotency key",
      });
    }

    const { data: campaignRow, error: campaignError } = await access.service
      .from("agent_campaign")
      .select(
        "id, org_id, agent_id, chain_family, chain_ref, token_standard, target_base_units, min_contribution_base_units, max_contribution_base_units, treasury_address, status",
      )
      .eq("id", input.campaignId)
      .eq("agent_id", agentId)
      .eq("org_id", access.agent.orgId)
      .maybeSingle();
    if (campaignError) {
      return createErrorResponse(new Error(campaignError.message), {
        status: 400,
        customMessage: "Unable to load campaign for deployment.",
      });
    }
    if (!campaignRow) {
      return createErrorResponse(new Error("campaign_not_found"), {
        status: 404,
        customMessage: "Campaign not found.",
      });
    }
    if (campaignRow.status === "cancelled") {
      return createErrorResponse(new Error("campaign_cancelled"), {
        status: 400,
        customMessage: "Cannot deploy contracts for cancelled campaigns.",
      });
    }

    const { data: agentRow, error: agentError } = await access.service
      .from("agent")
      .select("name, slug")
      .eq("id", agentId)
      .maybeSingle();
    if (agentError) {
      return createErrorResponse(new Error(agentError.message), {
        status: 400,
        customMessage: "Unable to load agent identity for token metadata.",
      });
    }

    const fallbackName = typeof agentRow?.name === "string" && agentRow.name.trim() ? agentRow.name.trim() : "Nex Agent";
    const tokenName = input.tokenName ?? `${fallbackName} Share`;
    const tokenSymbol = (input.tokenSymbol ?? deriveSymbol(typeof agentRow?.slug === "string" ? agentRow.slug : fallbackName))
      .toUpperCase()
      .slice(0, 12);

    const tokenStandard = input.tokenStandard ?? (campaignRow.token_standard as "erc20" | "erc404" | null) ?? "erc20";
    const treasury = (campaignRow.treasury_address as string | null) ?? null;

    if (campaignRow.chain_family === "solana") {
      if (!treasury) {
        return createErrorResponse(new Error("invalid_treasury_address"), {
          status: 400,
          customMessage: "Campaign treasury address must be set to a valid Solana address before deployment.",
        });
      }
      try {
        new PublicKey(treasury);
      } catch {
        return createErrorResponse(new Error("invalid_treasury_address"), {
          status: 400,
          customMessage: "Campaign treasury address must be set to a valid Solana address before deployment.",
        });
      }
    }

    const deployment =
      campaignRow.chain_family === "solana"
        ? await deploySolanaCampaignArtifacts({
            chainRef: campaignRow.chain_ref,
            treasuryAddress: treasury as string,
            targetBaseUnits: String(campaignRow.target_base_units),
            minContributionBaseUnits: String(campaignRow.min_contribution_base_units),
          })
        : await (async () => {
            const chainId = campaignChainRefToEvmChainId(campaignRow.chain_ref);
            if (!treasury || !/^0x[0-9a-fA-F]{40}$/.test(treasury)) {
              throw new Error("Campaign treasury address must be set to a valid EVM address before deployment.");
            }
            return deployCampaignContracts({
              chainId,
              tokenName,
              tokenSymbol,
              tokenStandard,
              treasuryAddress: treasury as `0x${string}`,
              targetBaseUnits: String(campaignRow.target_base_units),
              minContributionBaseUnits: String(campaignRow.min_contribution_base_units),
              maxContributionBaseUnits: campaignRow.max_contribution_base_units
                ? String(campaignRow.max_contribution_base_units)
                : null,
            });
          })();

    const { data: updatedCampaign, error: updateError } = await access.service
      .from("agent_campaign")
      .update({
        campaign_address: deployment.campaignAddress,
        share_token_address: deployment.shareTokenAddress,
        token_standard: tokenStandard,
        status: campaignRow.status === "draft" ? "active" : campaignRow.status,
      })
      .eq("id", campaignRow.id)
      .select(
        "id, chain_ref, chain_family, campaign_address, share_token_address, treasury_address, status, updated_at",
      )
      .single();
    if (updateError) {
      return createErrorResponse(new Error(updateError.message), {
        status: 400,
        customMessage: "Contracts deployed but campaign record update failed.",
      });
    }

    return createSuccessResponse(
      {
        ok: true,
        campaign: updatedCampaign,
        deployment: {
          chainRef: campaignRow.chain_ref,
          tokenStandard,
          tokenName,
          tokenSymbol,
          shareTokenDeployTxHash: deployment.shareTokenDeployTxHash,
          campaignDeployTxHash: deployment.campaignDeployTxHash,
          deployerAddress: deployment.deployerAddress,
        },
      },
      { headers: { "X-Correlation-Id": access.correlationId } },
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}
