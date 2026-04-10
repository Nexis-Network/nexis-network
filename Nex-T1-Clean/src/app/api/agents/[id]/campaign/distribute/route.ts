export const maxDuration = 45;

import { NextRequest } from "next/server";
import { z } from "zod";

import { createErrorResponse, createSuccessResponse } from "@/lib/request-utils";
import { canManageAgent } from "@/server/agents/access";
import { computeRevenueSplit, getCampaignById, revenuePolicySchema } from "@/server/agents/campaign";
import { resolveAgentAccess } from "@/server/agents/agent-access";
import { executeEvmRevenuePayouts, executeSolanaRevenuePayouts } from "@/server/agents/payout-executor";
import { buildPayoutReceiptRows, computeDistributionAllocations } from "@/server/agents/payout-receipts";
import { verifyEvmTransaction } from "@/server/agents/evm-tx-verification";
import { verifySolanaTransaction } from "@/server/agents/solana-tx-verification";
import { claimIdempotencyKey } from "@/server/security/idempotency";

const distributeSchema = z.object({
  campaignId: z.string().uuid(),
  networkId: z.string().min(3),
  assetId: z.string().min(1).optional().nullable(),
  grossBaseUnits: z.string().regex(/^\d+$/),
  idempotencyKey: z.string().min(8),
  txHash: z.string().min(8).optional().nullable(),
  executeOnChain: z.boolean().optional().default(false),
  investorTreasury: z.string().optional().nullable(),
  revenuePolicyOverride: revenuePolicySchema.optional(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: agentId } = await context.params;
    const input = distributeSchema.parse(await req.json());

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

    const campaign = await getCampaignById(access.service, input.campaignId);
    if (!campaign || campaign.agent_id !== agentId) {
      return createErrorResponse(new Error("campaign_not_found"), {
        status: 404,
        customMessage: "Campaign not found.",
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
      });
    }

    const policy = input.revenuePolicyOverride ?? revenuePolicySchema.parse(campaign.revenue_policy);
    const split = computeRevenueSplit(input.grossBaseUnits, policy);

    const { data: latestDistribution, error: latestError } = await access.service
      .from("agent_revenue_distribution")
      .select("epoch_index")
      .eq("campaign_id", campaign.id)
      .order("epoch_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) {
      return createErrorResponse(new Error(latestError.message), {
        status: 400,
        customMessage: "Failed to determine distribution epoch.",
      });
    }
    const nextEpoch = Number(latestDistribution?.epoch_index ?? -1) + 1;

    const { data: positions, error: positionsError } = await access.service
      .from("agent_investor_position")
      .select("id, investor_user_id, shares_owned_base_units, claimable_base_units")
      .eq("campaign_id", campaign.id)
      .gt("shares_owned_base_units", "0");
    if (positionsError) {
      return createErrorResponse(new Error(positionsError.message), {
        status: 400,
        customMessage: "Failed to load investor positions.",
      });
    }

    const investorRows = (positions ?? []).map((row) => ({
      id: row.id as string,
      investorUserId: String(row.investor_user_id),
      sharesOwnedBaseUnits: String(row.shares_owned_base_units),
      claimableBaseUnits: String(row.claimable_base_units),
    }));
    const { allocations } = computeDistributionAllocations({
      positions: investorRows,
      investorPoolBaseUnits: split.investorBaseUnits,
    });

    const payoutInput = {
      networkId: input.networkId,
      assetId: input.assetId,
      creatorAmountBaseUnits: split.creatorBaseUnits,
      operatorAmountBaseUnits: split.operatorBaseUnits,
      investorPoolAmountBaseUnits: split.investorBaseUnits,
      creatorTreasury: policy.creatorTreasury ?? campaign.treasury_address,
      operatorTreasury: policy.operatorTreasury ?? campaign.treasury_address,
      investorTreasury: input.investorTreasury ?? campaign.treasury_address ?? "",
    };

    const payoutResult =
      input.executeOnChain && campaign.chain_family === "evm"
        ? await executeEvmRevenuePayouts(payoutInput)
        : input.executeOnChain && campaign.chain_family === "solana"
          ? await executeSolanaRevenuePayouts(payoutInput)
          : { payoutTxHashes: [] };

    const settledTxHash = input.txHash ?? payoutResult.payoutTxHashes[0] ?? null;

    // Build allocation updates for the atomic transaction
    const allocationUpdates = allocations.map((allocation) => ({
      positionId: allocation.positionId,
      nextClaimable: (BigInt(allocation.claimableBaseUnits) + BigInt(allocation.amountBaseUnits)).toString(),
    }));

    // Build receipt rows if needed
    let receiptRows: unknown[] = [];
    if (allocations.length > 0) {
      const timestamp = new Date().toISOString();
      const investorUserIds = Array.from(new Set(allocations.map((entry) => entry.investorUserId)));
      const { data: walletData, error: walletError } =
        investorUserIds.length > 0
          ? await access.service
              .from("user_wallet_link")
              .select("user_id, namespace, address, verified_at")
              .eq("org_id", campaign.org_id)
              .in("user_id", investorUserIds)
          : { data: [], error: null };
      if (walletError) {
        return createErrorResponse(new Error(walletError.message), {
          status: 400,
          customMessage: "Failed to resolve wallets for receipts.",
        });
      }

      receiptRows = buildPayoutReceiptRows({
        orgId: campaign.org_id,
        campaignId: campaign.id,
        distributionId: "00000000-0000-0000-0000-000000000000",
        chainFamily: campaign.chain_family,
        networkId: input.networkId,
        assetId: input.assetId ?? null,
        txHash: settledTxHash,
        epochIndex: nextEpoch,
        payoutTxHashes: payoutResult.payoutTxHashes,
        allocations,
        walletRows: (walletData ?? []) as Array<{
          user_id: string;
          namespace: string;
          address: string;
          verified_at: string | null;
        }>,
        createdAt: timestamp,
      });
    }

    // Atomic transaction: update positions + insert distribution + insert receipts
    const { data: distributionResult, error: txError } = await access.service.rpc(
      "launchpad_distribute_atomic",
      {
        p_allocations: allocationUpdates,
        p_distribution: {
          org_id: campaign.org_id,
          agent_id: agentId,
          campaign_id: campaign.id,
          network_id: input.networkId,
          asset_id: input.assetId ?? "",
          gross_base_units: input.grossBaseUnits,
          creator_base_units: split.creatorBaseUnits,
          operator_base_units: split.operatorBaseUnits,
          investor_base_units: split.investorBaseUnits,
          epoch_index: nextEpoch,
          tx_hash: settledTxHash ?? "",
          idempotency_key: input.idempotencyKey,
        },
        p_receipts: receiptRows,
      },
    );
    if (txError) {
      return createErrorResponse(new Error(txError.message), {
        status: 400,
        customMessage: "Failed to store revenue distribution (transaction rolled back).",
      });
    }

    return createSuccessResponse(
      {
        ok: true,
        distribution: distributionResult,
        payout: {
          executedOnChain: input.executeOnChain,
          payoutTxHashes: payoutResult.payoutTxHashes,
        },
      },
      { headers: { "X-Correlation-Id": access.correlationId } },
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}
