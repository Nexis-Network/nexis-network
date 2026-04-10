export const maxDuration = 30;

import { NextRequest } from "next/server";
import { z } from "zod";

import { createErrorResponse, createSuccessResponse } from "@/lib/request-utils";
import {
  assertAcceptedAsset,
  assertContributionWithinBounds,
  compliancePolicySchema,
  computeBondingCurveQuotedShares,
  computeSharesMinted,
  getCampaignById,
  getActiveCampaignForAgent,
  launchControlsSchema,
  normalizeAssetId,
} from "@/server/agents/campaign";
import {
  assertWhitelistAccessForContribution,
  ContributionComplianceError,
  enforceContributionCompliancePolicy,
  normalizeCandidateWalletAddresses,
} from "@/server/agents/campaign-compliance";
import { verifyEvmTransaction } from "@/server/agents/evm-tx-verification";
import { verifySolanaTransaction } from "@/server/agents/solana-tx-verification";
import { resolveAgentAccess } from "@/server/agents/agent-access";
import { claimIdempotencyKey } from "@/server/security/idempotency";
import { withAuth } from "@/server/security/with-auth";

const contributeSchema = z.object({
  campaignId: z.string().uuid().optional(),
  networkId: z.string().min(3),
  assetId: z.string().min(1).optional().nullable(),
  amountBaseUnits: z.string().regex(/^\d+$/),
  idempotencyKey: z.string().min(8),
  txHash: z.string().min(8).optional().nullable(),
  riskAcknowledged: z.boolean().optional().default(false),
  jurisdictionCountryCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/)
    .optional()
    .nullable(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isCampaignOpen(closeTs: string | null): boolean {
  if (!closeTs) return true;
  const closeAt = Date.parse(closeTs);
  if (!Number.isFinite(closeAt)) return true;
  return closeAt > Date.now();
}

function parseDateOrNull(value: string | null | undefined): number | null {
  if (!value) return null;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : null;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const auth = await withAuth(req, { requireOrg: false, allowPublic: false });
    if (!auth.ok) return auth.response;
    const userId = auth.session?.user?.id;
    if (!userId) {
      return createErrorResponse(new Error("Unauthenticated"), { status: 401 });
    }

    const { id: agentId } = await context.params;
    const input = contributeSchema.parse(await req.json());

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

    const campaign = input.campaignId
      ? await getCampaignById(access.service, input.campaignId)
      : await getActiveCampaignForAgent(access.service, agentId);
    if (!campaign || campaign.agent_id !== agentId) {
      return createErrorResponse(new Error("campaign_not_found"), {
        status: 404,
        customMessage: "Campaign not found.",
      });
    }
    if (campaign.status !== "active" || !isCampaignOpen(campaign.close_ts)) {
      return createErrorResponse(new Error("campaign_closed"), {
        status: 400,
        customMessage: "Campaign is not open for contributions.",
      });
    }

    const launchControls = launchControlsSchema.parse(campaign.launch_controls ?? {});
    const compliancePolicy = compliancePolicySchema.parse(campaign.compliance_policy ?? {});
    const isWhitelistPhaseActive =
      launchControls.whitelistEnabled &&
      (() => {
        const whitelistUntil = parseDateOrNull(launchControls.whitelistOnlyUntilTs ?? null);
        return !whitelistUntil || Date.now() <= whitelistUntil;
      })();

    let complianceState: Awaited<ReturnType<typeof enforceContributionCompliancePolicy>>;
    try {
      complianceState = await enforceContributionCompliancePolicy({
        service: access.service,
        orgId: campaign.org_id,
        userId,
        policy: compliancePolicy,
        riskAcknowledged: input.riskAcknowledged,
        jurisdictionCountryCode: input.jurisdictionCountryCode,
        headers: req.headers,
        requireWalletLookup: isWhitelistPhaseActive,
      });
    } catch (error) {
      const status = error instanceof ContributionComplianceError ? error.status : 400;
      return createErrorResponse(error, {
        status,
        customMessage: error instanceof Error ? error.message : "Campaign compliance validation failed.",
      });
    }

    if (isWhitelistPhaseActive) {
      try {
        await assertWhitelistAccessForContribution({
          service: access.service,
          campaignId: campaign.id,
          userId,
          candidateWalletAddresses: normalizeCandidateWalletAddresses(complianceState.linkedWallets),
        });
      } catch (error) {
        const status = error instanceof ContributionComplianceError ? error.status : 400;
        return createErrorResponse(error, {
          status,
          customMessage: error instanceof Error ? error.message : "Unable to validate whitelist access.",
        });
      }
    }

    const { data: existingPosition, error: positionReadError } = await access.service
      .from("agent_investor_position")
      .select("id, shares_owned_base_units, principal_base_units")
      .eq("campaign_id", campaign.id)
      .eq("investor_user_id", userId)
      .maybeSingle();
    if (positionReadError) {
      return createErrorResponse(new Error(positionReadError.message), {
        status: 400,
        customMessage: "Failed to load investor position.",
      });
    }

    if (launchControls.maxContributors > 0 && !existingPosition) {
      const { count: investorCount, error: investorCountError } = await access.service
        .from("agent_investor_position")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign.id);
      if (investorCountError) {
        return createErrorResponse(new Error(investorCountError.message), {
          status: 400,
          customMessage: "Unable to validate max contributor threshold.",
        });
      }
      const currentCount = Number(investorCount ?? 0);
      if (currentCount >= launchControls.maxContributors) {
        return createErrorResponse(new Error("max_contributors_reached"), {
          status: 400,
          customMessage: "Campaign has reached max contributors limit.",
        });
      }
    }

    if (launchControls.perWalletCooldownSeconds > 0) {
      const cooldownCutoff = new Date(Date.now() - launchControls.perWalletCooldownSeconds * 1000).toISOString();
      const { data: latestContribution, error: contributionCooldownError } = await access.service
        .from("agent_contribution")
        .select("id, created_at")
        .eq("campaign_id", campaign.id)
        .eq("contributor_user_id", userId)
        .gte("created_at", cooldownCutoff)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (contributionCooldownError) {
        return createErrorResponse(new Error(contributionCooldownError.message), {
          status: 400,
          customMessage: "Unable to validate contribution cooldown.",
        });
      }
      if (latestContribution?.id) {
        return createErrorResponse(new Error("contribution_cooldown"), {
          status: 429,
          customMessage: "Please wait before submitting another contribution.",
        });
      }
    }

    assertContributionWithinBounds({
      amountBaseUnits: input.amountBaseUnits,
      minBaseUnits: campaign.min_contribution_base_units,
      maxBaseUnits: campaign.max_contribution_base_units,
    });
    assertAcceptedAsset({
      acceptedAssets: campaign.accepted_assets,
      assetId: input.assetId,
    });

    if (input.txHash && campaign.chain_family === "evm") {
      await verifyEvmTransaction({
        networkId: input.networkId,
        txHash: input.txHash,
        assetId: input.assetId,
        expectedTo: campaign.campaign_address ?? campaign.treasury_address,
        minValueBaseUnits: input.amountBaseUnits,
      });
    }
    if (input.txHash && campaign.chain_family === "solana") {
      const normalizedAsset = normalizeAssetId(input.assetId);
      await verifySolanaTransaction({
        networkId: input.networkId,
        txHash: input.txHash,
        assetId: input.assetId,
        expectedTo: normalizedAsset === "native" ? campaign.treasury_address : null,
        minValueBaseUnits: input.amountBaseUnits,
      });
    }

    const baseSharesMinted = computeSharesMinted(input.amountBaseUnits, campaign.valuation_cap_base_units);
    const sharesMintedBaseUnits = computeBondingCurveQuotedShares({
      amountBaseUnits: input.amountBaseUnits,
      baseShares: baseSharesMinted,
      launchControls,
      raisedBaseUnits: campaign.raised_base_units,
    });

    const nextRaised = (BigInt(campaign.raised_base_units) + BigInt(input.amountBaseUnits)).toString();

    // Atomic transaction: insert contribution + update campaign total + upsert position
    const { data: contributionResult, error: txError } = await access.service.rpc(
      "launchpad_contribute_atomic",
      {
        p_org_id: campaign.org_id,
        p_agent_id: agentId,
        p_campaign_id: campaign.id,
        p_contributor_user_id: userId,
        p_network_id: input.networkId,
        p_asset_id: input.assetId ?? "",
        p_amount_base_units: input.amountBaseUnits,
        p_shares_minted: sharesMintedBaseUnits,
        p_tx_hash: input.txHash ?? "",
        p_idempotency_key: input.idempotencyKey,
        p_raised_next: nextRaised,
      },
    );
    if (txError) {
      return createErrorResponse(new Error(txError.message), {
        status: 400,
        customMessage: "Failed to persist contribution (transaction rolled back).",
      });
    }

    return createSuccessResponse(
      { ok: true, campaignId: campaign.id, contribution: contributionResult },
      { headers: { "X-Correlation-Id": access.correlationId } },
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}
