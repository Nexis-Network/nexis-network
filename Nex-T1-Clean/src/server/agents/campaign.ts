import { z } from "zod";

import type { SupabaseServiceRoleClient } from "@/server/services/supabase/service-role";

export const chainFamilySchema = z.enum(["evm", "solana"]);
export const tokenStandardSchema = z.enum(["erc20", "erc404"]);

export const launchControlsSchema = z.object({
  whitelistEnabled: z.boolean().default(false),
  whitelistOnlyUntilTs: z.string().datetime().optional().nullable(),
  bondingCurveEnabled: z.boolean().default(false),
  bondingCurveSlopeBps: z.number().int().min(0).max(100_000).default(0),
  perWalletCooldownSeconds: z.number().int().min(0).max(86_400).default(0),
  maxContributors: z.number().int().min(0).max(1_000_000).default(0),
});

export const compliancePolicySchema = z.object({
  requireVerifiedWallet: z.boolean().default(false),
  blockSanctionedJurisdictions: z.boolean().default(true),
  requireAcknowledgedRisk: z.boolean().default(true),
});

export type CompliancePolicy = z.infer<typeof compliancePolicySchema>;

export const revenuePolicySchema = z
  .object({
    creatorBps: z.number().int().min(0).max(10_000),
    operatorBps: z.number().int().min(0).max(10_000),
    investorBps: z.number().int().min(0).max(10_000),
    creatorTreasury: z.string().trim().min(1).optional(),
    operatorTreasury: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.creatorBps + value.operatorBps + value.investorBps !== 10_000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Revenue policy bps must sum to 10000.",
      });
    }
  });

export type RevenuePolicy = z.infer<typeof revenuePolicySchema>;

export type CampaignRow = {
  id: string;
  org_id: string;
  agent_id: string;
  chain_family: "evm" | "solana";
  chain_ref: string;
  campaign_address: string | null;
  share_token_address: string | null;
  treasury_address: string | null;
  token_standard: "erc20" | "erc404";
  launch_controls: Record<string, UntypedJson>;
  compliance_policy: Record<string, UntypedJson>;
  risk_score: number;
  risk_flags: string[] | null;
  accepted_assets: string[] | null;
  min_contribution_base_units: string;
  max_contribution_base_units: string | null;
  target_base_units: string;
  raised_base_units: string;
  valuation_cap_base_units: string | null;
  status: "draft" | "active" | "finalized" | "cancelled";
  close_ts: string | null;
  revenue_policy: RevenuePolicy | Record<string, UntypedJson>;
};

export function computeCampaignRiskSnapshot(input: {
  treasuryAddress: string | null | undefined;
  revenuePolicy: RevenuePolicy;
  launchControls: z.infer<typeof launchControlsSchema>;
  acceptedAssets: string[];
  valuationCapBaseUnits?: string | null;
}): { riskScore: number; riskFlags: string[] } {
  const flags: string[] = [];
  let score = 0;

  if (!input.treasuryAddress) {
    score += 30;
    flags.push("missing_treasury_address");
  }
  if (input.revenuePolicy.creatorBps >= 3_500) {
    score += 20;
    flags.push("high_creator_revenue_share");
  }
  if (input.revenuePolicy.operatorBps >= 2_000) {
    score += 10;
    flags.push("high_operator_revenue_share");
  }
  if (input.launchControls.whitelistEnabled && !input.launchControls.whitelistOnlyUntilTs) {
    score += 10;
    flags.push("whitelist_without_window");
  }
  if (input.launchControls.bondingCurveEnabled && input.launchControls.bondingCurveSlopeBps > 25_000) {
    score += 20;
    flags.push("aggressive_bonding_curve");
  }
  if (input.acceptedAssets.length === 0) {
    score += 10;
    flags.push("no_accepted_assets");
  }
  if (!input.valuationCapBaseUnits) {
    score += 10;
    flags.push("missing_valuation_cap");
  }

  return { riskScore: Math.min(100, score), riskFlags: flags };
}

export function parseBaseUnits(value: string): bigint {
  if (!/^\d+$/.test(value)) {
    throw new Error("Amount must be a base-unit integer string.");
  }
  return BigInt(value);
}

export function normalizeAssetId(raw: string | null | undefined): string {
  const value = raw?.trim();
  if (!value || value === "native") return "native";
  return value;
}

export function assertContributionWithinBounds(options: {
  amountBaseUnits: string;
  minBaseUnits: string;
  maxBaseUnits?: string | null;
}): void {
  const amount = parseBaseUnits(options.amountBaseUnits);
  const min = parseBaseUnits(options.minBaseUnits);
  if (amount < min) {
    throw new Error("Contribution below campaign minimum.");
  }
  if (options.maxBaseUnits) {
    const max = parseBaseUnits(options.maxBaseUnits);
    if (amount > max) {
      throw new Error("Contribution exceeds campaign maximum.");
    }
  }
}

export function assertAcceptedAsset(options: { acceptedAssets: string[] | null; assetId: string | null | undefined }): void {
  const accepted = new Set((options.acceptedAssets ?? []).map(normalizeAssetId));
  if (accepted.size === 0) return;
  const selected = normalizeAssetId(options.assetId);
  if (!accepted.has(selected)) {
    throw new Error("Asset is not accepted by this campaign.");
  }
}

export function computeSharesMinted(amountBaseUnits: string, valuationCapBaseUnits?: string | null): string {
  if (!valuationCapBaseUnits) {
    return parseBaseUnits(amountBaseUnits).toString();
  }
  const contribution = parseBaseUnits(amountBaseUnits);
  const valuation = parseBaseUnits(valuationCapBaseUnits);
  if (valuation === 0n) {
    throw new Error("Invalid campaign valuation cap.");
  }
  // 1e18 precision synthetic share units.
  const shares = (contribution * 1_000_000_000_000_000_000n) / valuation;
  if (shares <= 0n) {
    throw new Error("Contribution is too small for current valuation precision.");
  }
  return shares.toString();
}

export function computeBondingCurveQuotedShares(options: {
  amountBaseUnits: string;
  baseShares: string;
  launchControls: z.infer<typeof launchControlsSchema>;
  raisedBaseUnits: string;
}): string {
  if (!options.launchControls.bondingCurveEnabled || options.launchControls.bondingCurveSlopeBps <= 0) {
    return options.baseShares;
  }
  const base = parseBaseUnits(options.baseShares);
  const raised = parseBaseUnits(options.raisedBaseUnits);
  const amount = parseBaseUnits(options.amountBaseUnits);
  const bpsPenalty = (raised * BigInt(options.launchControls.bondingCurveSlopeBps)) / (amount + 1n);
  const cappedPenalty = bpsPenalty > 9_000n ? 9_000n : bpsPenalty;
  const adjusted = (base * (10_000n - cappedPenalty)) / 10_000n;
  return adjusted > 0n ? adjusted.toString() : "1";
}

export function computeRevenueSplit(amountBaseUnits: string, policy: RevenuePolicy): {
  creatorBaseUnits: string;
  operatorBaseUnits: string;
  investorBaseUnits: string;
} {
  const gross = parseBaseUnits(amountBaseUnits);
  const creator = (gross * BigInt(policy.creatorBps)) / 10_000n;
  const operator = (gross * BigInt(policy.operatorBps)) / 10_000n;
  const investor = gross - creator - operator;
  return {
    creatorBaseUnits: creator.toString(),
    operatorBaseUnits: operator.toString(),
    investorBaseUnits: investor.toString(),
  };
}

export function computeProRataClaim(options: {
  investorSharesBaseUnits: string;
  totalSharesBaseUnits: string;
  distributableInvestorBaseUnits: string;
}): string {
  const investorShares = parseBaseUnits(options.investorSharesBaseUnits);
  const totalShares = parseBaseUnits(options.totalSharesBaseUnits);
  const distributable = parseBaseUnits(options.distributableInvestorBaseUnits);
  if (totalShares <= 0n) return "0";
  return ((investorShares * distributable) / totalShares).toString();
}

export async function getCampaignById(
  service: SupabaseServiceRoleClient,
  campaignId: string,
): Promise<CampaignRow | null> {
  const { data, error } = await service
    .from("agent_campaign")
    .select(
      "id, org_id, agent_id, chain_family, chain_ref, campaign_address, share_token_address, treasury_address, token_standard, launch_controls, compliance_policy, risk_score, risk_flags, accepted_assets, min_contribution_base_units, max_contribution_base_units, target_base_units, raised_base_units, valuation_cap_base_units, status, close_ts, revenue_policy",
    )
    .eq("id", campaignId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return (data as CampaignRow | null) ?? null;
}

export async function getActiveCampaignForAgent(
  service: SupabaseServiceRoleClient,
  agentId: string,
): Promise<CampaignRow | null> {
  const { data, error } = await service
    .from("agent_campaign")
    .select(
      "id, org_id, agent_id, chain_family, chain_ref, campaign_address, share_token_address, treasury_address, token_standard, launch_controls, compliance_policy, risk_score, risk_flags, accepted_assets, min_contribution_base_units, max_contribution_base_units, target_base_units, raised_base_units, valuation_cap_base_units, status, close_ts, revenue_policy",
    )
    .eq("agent_id", agentId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return (data as CampaignRow | null) ?? null;
}
