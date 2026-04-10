export const maxDuration = 30;

import { NextRequest } from "next/server";
import { z } from "zod";

import { createErrorResponse, createSuccessResponse } from "@/lib/request-utils";
import { getCampaignById } from "@/server/agents/campaign";
import { resolveAgentAccess } from "@/server/agents/agent-access";
import { verifyEvmTransaction } from "@/server/agents/evm-tx-verification";
import { verifySolanaTransaction } from "@/server/agents/solana-tx-verification";
import { claimIdempotencyKey } from "@/server/security/idempotency";
import { withAuth } from "@/server/security/with-auth";

const claimSchema = z.object({
  campaignId: z.string().uuid(),
  networkId: z.string().min(3),
  assetId: z.string().min(1).optional().nullable(),
  claimBaseUnits: z.string().regex(/^\d+$/).optional(),
  idempotencyKey: z.string().min(8),
  txHash: z.string().min(8).optional().nullable(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const auth = await withAuth(req, { requireOrg: false, allowPublic: false });
    if (!auth.ok) return auth.response;
    const userId = auth.session?.user?.id;
    if (!userId) {
      return createErrorResponse(new Error("Unauthenticated"), { status: 401 });
    }

    const { id: agentId } = await context.params;
    const input = claimSchema.parse(await req.json());

    const accessResult = await resolveAgentAccess(req, agentId, { allowPublic: true, requireMembership: false });
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    const idem = await claimIdempotencyKey(input.idempotencyKey);
    if (!idem.ok) {
      return createErrorResponse(new Error("duplicate"), {
        status: 409,
        customMessage: "Duplicate idempotency key",
      });
    }

    const campaign = await getCampaignById(access.service, input.campaignId);
    if (!campaign || campaign.agent_id !== agentId) {
      return createErrorResponse(new Error("campaign_not_found"), {
        status: 404,
        customMessage: "Campaign not found.",
      });
    }

    const { data: position, error: positionError } = await access.service
      .from("agent_investor_position")
      .select("id, claimable_base_units, claimed_base_units")
      .eq("campaign_id", campaign.id)
      .eq("investor_user_id", userId)
      .maybeSingle();
    if (positionError) {
      return createErrorResponse(new Error(positionError.message), {
        status: 400,
        customMessage: "Failed to load investor position.",
      });
    }
    if (!position) {
      return createErrorResponse(new Error("position_not_found"), {
        status: 404,
        customMessage: "Investor position not found.",
      });
    }

    const claimable = BigInt(String(position.claimable_base_units));
    const requested = input.claimBaseUnits ? BigInt(input.claimBaseUnits) : claimable;
    if (requested <= 0n) {
      return createErrorResponse(new Error("invalid_claim_amount"), {
        status: 400,
        customMessage: "Claim amount must be positive.",
      });
    }
    if (requested > claimable) {
      return createErrorResponse(new Error("insufficient_claimable"), {
        status: 400,
        customMessage: "Requested claim exceeds claimable balance.",
      });
    }

    if (input.txHash && campaign.chain_family === "evm") {
      await verifyEvmTransaction({
        networkId: input.networkId,
        txHash: input.txHash,
        assetId: input.assetId,
      });
    }
    if (input.txHash && campaign.chain_family === "solana") {
      await verifySolanaTransaction({
        networkId: input.networkId,
        txHash: input.txHash,
        assetId: input.assetId,
        minValueBaseUnits: requested.toString(),
      });
    }

    const nextClaimable = (claimable - requested).toString();
    const nextClaimed = (BigInt(String(position.claimed_base_units)) + requested).toString();
    const { error: updateError } = await access.service
      .from("agent_investor_position")
      .update({
        claimable_base_units: nextClaimable,
        claimed_base_units: nextClaimed,
      })
      .eq("id", position.id);
    if (updateError) {
      return createErrorResponse(new Error(updateError.message), {
        status: 400,
        customMessage: "Failed to update investor claim state.",
      });
    }

    const { data: usageEvent, error: usageError } = await access.service
      .from("agent_usage_event")
      .insert({
        org_id: campaign.org_id,
        agent_id: agentId,
        renter_user_id: userId,
        owner_user_id: null,
        type: "agent_campaign_claim",
        amount_base_units: requested.toString(),
        network_id: input.networkId,
        asset_id: input.assetId ?? null,
        tx_hash: input.txHash ?? null,
        idempotency_key: `campaign-claim:${input.idempotencyKey}`,
      })
      .select("id, type, amount_base_units, network_id, asset_id, tx_hash, created_at")
      .single();
    if (usageError) {
      return createErrorResponse(new Error(usageError.message), {
        status: 400,
        customMessage: "Failed to record claim event.",
      });
    }

    return createSuccessResponse(
      {
        ok: true,
        claim: {
          amountBaseUnits: requested.toString(),
          remainingClaimableBaseUnits: nextClaimable,
          totalClaimedBaseUnits: nextClaimed,
        },
        event: usageEvent,
      },
      { headers: { "X-Correlation-Id": access.correlationId } },
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}
