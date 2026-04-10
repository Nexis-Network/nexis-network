export const maxDuration = 30;

import { connection, NextRequest } from "next/server";
import { z } from "zod";

import { createErrorResponse, createSuccessResponse } from "@/lib/request-utils";
import {
  aggregateParticipants,
  computeCampaignProgressBps,
  computeSpotPriceBaseUnits,
  deriveCampaignSaleRound,
  parseBaseUnitsSafe,
  pickPreferredWallet,
  sortTeamMembersByRole,
} from "@/lib/launchpad/detail-helpers";
import { normalizeOrgMemberRole } from "@/server/agents/agent-access";
import { withAuth } from "@/server/security/with-auth";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";

type RouteContext = {
  params: Promise<{
    campaignId: string;
  }>;
};

type MembershipRow = {
  org_id: string;
  role: UntypedJson;
};

type CampaignAgent = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  visibility: "public" | "private" | "unlisted";
  owner_user_id: string | null;
};

type CampaignRow = {
  id: string;
  org_id: string;
  agent_id: string;
  chain_family: "evm" | "solana";
  chain_ref: string;
  token_standard: "erc20" | "erc404";
  launch_controls: Record<string, UntypedJson> | null;
  compliance_policy: Record<string, UntypedJson> | null;
  revenue_policy: Record<string, UntypedJson> | null;
  risk_score: number | null;
  risk_flags: string[] | null;
  accepted_assets: string[] | null;
  status: "draft" | "active" | "finalized" | "cancelled";
  campaign_address: string | null;
  share_token_address: string | null;
  treasury_address: string | null;
  target_base_units: string | number;
  raised_base_units: string | number;
  valuation_cap_base_units: string | number | null;
  min_contribution_base_units: string | number;
  max_contribution_base_units: string | number | null;
  close_ts: string | null;
  created_at: string;
  updated_at: string;
  agent: CampaignAgent | CampaignAgent[] | null;
};

type PositionRow = {
  campaign_id: string;
  shares_owned_base_units: string | number;
  principal_base_units: string | number;
  claimable_base_units: string | number;
  claimed_base_units: string | number;
};

type ContributionRow = {
  contributor_user_id: string;
  amount_base_units: string | number;
  shares_minted_base_units: string | number;
  tx_hash: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type WalletRow = {
  user_id: string;
  namespace: string;
  address: string;
  verified_at: string | null;
};

type TeamRow = {
  user_id: string;
  role: UntypedJson;
  created_at: string | null;
};

type DistributionRow = {
  id: string;
  epoch_index: number;
  network_id: string;
  asset_id: string | null;
  gross_base_units: string | number;
  investor_base_units: string | number;
  creator_base_units: string | number;
  operator_base_units: string | number;
  tx_hash: string | null;
  created_at: string;
};

type RevenuePolicySnapshot = {
  creatorBps: number;
  operatorBps: number;
  investorBps: number;
  creatorTreasury: string | null;
  operatorTreasury: string | null;
};

const paramsSchema = z.object({
  campaignId: z.string().uuid(),
});

function normalizeAgent(row: CampaignRow): CampaignAgent | null {
  if (!row.agent) return null;
  if (Array.isArray(row.agent)) return row.agent[0] ?? null;
  return row.agent;
}

function canManageRole(role: string): boolean {
  return role === "owner" || role === "admin" || role === "manager";
}

function safeAddress(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeDisplayName(profile: ProfileRow | undefined, fallbackUserId: string): string {
  const displayName = profile?.display_name?.trim();
  if (displayName) return displayName;

  const username = profile?.username?.trim();
  if (username) return username;

  return `User ${fallbackUserId.slice(0, 8)}`;
}

function parseRevenuePolicy(value: Record<string, UntypedJson> | null, fallbackTreasury: string | null): RevenuePolicySnapshot {
  const creatorBpsRaw = Number(value?.creatorBps ?? 0);
  const operatorBpsRaw = Number(value?.operatorBps ?? 0);
  const investorBpsRaw = Number(value?.investorBps ?? Number.NaN);

  const creatorBps = Number.isFinite(creatorBpsRaw) ? creatorBpsRaw : 0;
  const operatorBps = Number.isFinite(operatorBpsRaw) ? operatorBpsRaw : 0;
  const investorBps = Number.isFinite(investorBpsRaw)
    ? investorBpsRaw
    : Math.max(0, 10_000 - creatorBps - operatorBps);

  return {
    creatorBps,
    operatorBps,
    investorBps,
    creatorTreasury: safeAddress((value?.creatorTreasury as string | null | undefined) ?? fallbackTreasury),
    operatorTreasury: safeAddress((value?.operatorTreasury as string | null | undefined) ?? fallbackTreasury),
  };
}

export async function GET(req: NextRequest, context: RouteContext) {
  await connection();
  try {
    const auth = await withAuth(req, { allowPublic: false, requireOrg: false });
    if (!auth.ok) return auth.response;

    const userId = auth.session?.user?.id;
    if (!userId) {
      return createErrorResponse(new Error("Unauthenticated"), { status: 401 });
    }

    const { campaignId } = paramsSchema.parse(await context.params);
    const service = createServiceRoleClient();

    const { data: membershipData, error: membershipError } = await service
      .from("org_member")
      .select("org_id, role")
      .eq("user_id", userId);
    if (membershipError) {
      return createErrorResponse(new Error(membershipError.message), {
        status: 400,
        customMessage: "Failed to load org memberships.",
      });
    }

    const membershipByOrg = new Map<string, string>();
    for (const row of (membershipData ?? []) as MembershipRow[]) {
      membershipByOrg.set(row.org_id, normalizeOrgMemberRole(row.role));
    }

    const { data: campaignData, error: campaignError } = await service
      .from("agent_campaign")
      .select(
        "id, org_id, agent_id, chain_family, chain_ref, token_standard, launch_controls, compliance_policy, revenue_policy, risk_score, risk_flags, accepted_assets, status, campaign_address, share_token_address, treasury_address, target_base_units, raised_base_units, valuation_cap_base_units, min_contribution_base_units, max_contribution_base_units, close_ts, created_at, updated_at, agent:agent(id, slug, name, description, avatar_url, visibility, owner_user_id)",
      )
      .eq("id", campaignId)
      .maybeSingle();
    if (campaignError) {
      return createErrorResponse(new Error(campaignError.message), {
        status: 400,
        customMessage: "Failed to load launch campaign.",
      });
    }

    const campaign = (campaignData as CampaignRow | null) ?? null;
    if (!campaign) {
      return createErrorResponse(new Error("campaign_not_found"), {
        status: 404,
        customMessage: "Launch campaign not found.",
      });
    }

    const agent = normalizeAgent(campaign);
    if (!agent) {
      return createErrorResponse(new Error("campaign_agent_missing"), {
        status: 404,
        customMessage: "Campaign agent data is unavailable.",
      });
    }

    const { data: positionData, error: positionError } = await service
      .from("agent_investor_position")
      .select("campaign_id, shares_owned_base_units, principal_base_units, claimable_base_units, claimed_base_units")
      .eq("campaign_id", campaign.id)
      .eq("investor_user_id", userId)
      .maybeSingle();
    if (positionError) {
      return createErrorResponse(new Error(positionError.message), {
        status: 400,
        customMessage: "Failed to load campaign position.",
      });
    }
    const position = (positionData as PositionRow | null) ?? null;

    const membershipRole = membershipByOrg.get(campaign.org_id) ?? "viewer";
    const isMember = membershipByOrg.has(campaign.org_id);
    const canManage = canManageRole(membershipRole);
    const isOwner = agent.owner_user_id === userId;
    const canView = agent.visibility !== "private" || isMember || isOwner || Boolean(position);
    if (!canView) {
      return createErrorResponse(new Error("campaign_not_found"), {
        status: 404,
        customMessage: "Launch campaign not found.",
      });
    }

    const { data: contributionData, error: contributionError } = await service
      .from("agent_contribution")
      .select("contributor_user_id, amount_base_units, shares_minted_base_units, tx_hash, created_at")
      .eq("campaign_id", campaign.id)
      .order("created_at", { ascending: false })
      .limit(500);
    if (contributionError) {
      return createErrorResponse(new Error(contributionError.message), {
        status: 400,
        customMessage: "Failed to load participant contributions.",
      });
    }
    const contributions = (contributionData ?? []) as ContributionRow[];

    const aggregatedParticipants = aggregateParticipants(
      contributions.map((row) => ({
        contributorUserId: row.contributor_user_id,
        amountBaseUnits: String(row.amount_base_units),
        sharesMintedBaseUnits: String(row.shares_minted_base_units),
        txHash: row.tx_hash,
        createdAt: row.created_at,
      })),
    );

    const participantUserIds = Array.from(new Set(aggregatedParticipants.map((entry) => entry.userId)));
    const [profilesResult, walletsResult] = await Promise.all([
      participantUserIds.length > 0
        ? service
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .in("id", participantUserIds)
        : Promise.resolve({ data: [], error: null }),
      participantUserIds.length > 0
        ? service
            .from("user_wallet_link")
            .select("user_id, namespace, address, verified_at")
            .eq("org_id", campaign.org_id)
            .in("user_id", participantUserIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (profilesResult.error) {
      return createErrorResponse(new Error(profilesResult.error.message), {
        status: 400,
        customMessage: "Failed to load participant profiles.",
      });
    }
    if (walletsResult.error) {
      return createErrorResponse(new Error(walletsResult.error.message), {
        status: 400,
        customMessage: "Failed to load participant wallets.",
      });
    }

    const profileByUserId = new Map<string, ProfileRow>();
    for (const profile of (profilesResult.data ?? []) as ProfileRow[]) {
      profileByUserId.set(profile.id, profile);
    }

    const walletByUserId = new Map<string, WalletRow[]>();
    for (const wallet of (walletsResult.data ?? []) as WalletRow[]) {
      const existing = walletByUserId.get(wallet.user_id) ?? [];
      existing.push(wallet);
      walletByUserId.set(wallet.user_id, existing);
    }

    const participants = aggregatedParticipants.slice(0, 50).map((entry) => {
      const profile = profileByUserId.get(entry.userId);
      const preferredWallet = pickPreferredWallet(
        (walletByUserId.get(entry.userId) ?? []).map((wallet) => ({
          namespace: wallet.namespace,
          address: wallet.address,
          verifiedAt: wallet.verified_at,
        })),
        campaign.chain_family,
      );

      return {
        userId: entry.userId,
        displayName: normalizeDisplayName(profile, entry.userId),
        avatarUrl: profile?.avatar_url ?? null,
        walletAddress: preferredWallet?.address ?? null,
        walletNamespace: preferredWallet?.namespace ?? null,
        contributionCount: entry.contributionCount,
        totalContributedBaseUnits: entry.totalContributedBaseUnits,
        totalSharesBaseUnits: entry.totalSharesBaseUnits,
        latestContributionAt: entry.latestContributionAt,
        lastTxHash: entry.lastTxHash,
      };
    });

    const totalContributed = contributions.reduce(
      (acc, row) => acc + parseBaseUnitsSafe(String(row.amount_base_units)),
      0n,
    );
    const totalSharesMinted = contributions.reduce(
      (acc, row) => acc + parseBaseUnitsSafe(String(row.shares_minted_base_units)),
      0n,
    );

    const { data: teamRowsData, error: teamError } = await service
      .from("org_member")
      .select("user_id, role, created_at")
      .eq("org_id", campaign.org_id)
      .order("created_at", { ascending: true })
      .limit(25);
    if (teamError) {
      return createErrorResponse(new Error(teamError.message), {
        status: 400,
        customMessage: "Failed to load launch team members.",
      });
    }

    const teamRows = (teamRowsData ?? []) as TeamRow[];
    const teamUserIds = Array.from(new Set(teamRows.map((row) => row.user_id)));

    const [teamProfilesResult, teamWalletsResult] = await Promise.all([
      teamUserIds.length > 0
        ? service.from("profiles").select("id, username, display_name, avatar_url").in("id", teamUserIds)
        : Promise.resolve({ data: [], error: null }),
      teamUserIds.length > 0
        ? service
            .from("user_wallet_link")
            .select("user_id, namespace, address, verified_at")
            .eq("org_id", campaign.org_id)
            .in("user_id", teamUserIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (teamProfilesResult.error) {
      return createErrorResponse(new Error(teamProfilesResult.error.message), {
        status: 400,
        customMessage: "Failed to load team profiles.",
      });
    }
    if (teamWalletsResult.error) {
      return createErrorResponse(new Error(teamWalletsResult.error.message), {
        status: 400,
        customMessage: "Failed to load team wallets.",
      });
    }

    const teamProfileByUserId = new Map<string, ProfileRow>();
    for (const profile of (teamProfilesResult.data ?? []) as ProfileRow[]) {
      teamProfileByUserId.set(profile.id, profile);
    }

    const teamWalletByUserId = new Map<string, WalletRow[]>();
    for (const wallet of (teamWalletsResult.data ?? []) as WalletRow[]) {
      const existing = teamWalletByUserId.get(wallet.user_id) ?? [];
      existing.push(wallet);
      teamWalletByUserId.set(wallet.user_id, existing);
    }

    const team = sortTeamMembersByRole(
      teamRows.map((row) => {
        const role = normalizeOrgMemberRole(row.role);
        const profile = teamProfileByUserId.get(row.user_id);
        const preferredWallet = pickPreferredWallet(
          (teamWalletByUserId.get(row.user_id) ?? []).map((wallet) => ({
            namespace: wallet.namespace,
            address: wallet.address,
            verifiedAt: wallet.verified_at,
          })),
          campaign.chain_family,
        );

        return {
          userId: row.user_id,
          role,
          displayName: normalizeDisplayName(profile, row.user_id),
          avatarUrl: profile?.avatar_url ?? null,
          walletAddress: preferredWallet?.address ?? null,
          walletNamespace: preferredWallet?.namespace ?? null,
          joinedAt: row.created_at,
          createdAt: row.created_at,
        };
      }),
    )
      .slice(0, 12)
      .map(({ createdAt: _createdAt, ...member }) => member);

    const { data: distributionData, error: distributionError } = await service
      .from("agent_revenue_distribution")
      .select(
        "id, epoch_index, network_id, asset_id, gross_base_units, investor_base_units, creator_base_units, operator_base_units, tx_hash, created_at",
      )
      .eq("campaign_id", campaign.id)
      .order("epoch_index", { ascending: false })
      .limit(20);
    if (distributionError) {
      return createErrorResponse(new Error(distributionError.message), {
        status: 400,
        customMessage: "Failed to load distribution epochs.",
      });
    }
    const distributions = ((distributionData ?? []) as DistributionRow[]).map((row) => ({
      id: row.id,
      epochIndex: Number(row.epoch_index),
      networkId: row.network_id,
      assetId: row.asset_id,
      grossBaseUnits: String(row.gross_base_units),
      investorBaseUnits: String(row.investor_base_units),
      creatorBaseUnits: String(row.creator_base_units),
      operatorBaseUnits: String(row.operator_base_units),
      txHash: row.tx_hash,
      createdAt: row.created_at,
    }));

    const saleRound = deriveCampaignSaleRound(campaign.status, {
      whitelistEnabled: campaign.launch_controls?.whitelistEnabled === true,
      whitelistOnlyUntilTs: (campaign.launch_controls?.whitelistOnlyUntilTs as string | null | undefined) ?? null,
    });
    const progressBps = computeCampaignProgressBps(campaign.raised_base_units, campaign.target_base_units);
    const revenuePolicy = parseRevenuePolicy(campaign.revenue_policy, campaign.treasury_address);

    const item = {
      id: campaign.id,
      orgId: campaign.org_id,
      agentId: campaign.agent_id,
      chainFamily: campaign.chain_family,
      chainRef: campaign.chain_ref,
      tokenStandard: campaign.token_standard ?? "erc20",
      launchControls: campaign.launch_controls ?? {},
      compliancePolicy: campaign.compliance_policy ?? {},
      riskScore: campaign.risk_score ?? 0,
      riskFlags: campaign.risk_flags ?? [],
      acceptedAssets: campaign.accepted_assets ?? [],
      status: campaign.status,
      campaignAddress: campaign.campaign_address,
      shareTokenAddress: campaign.share_token_address,
      treasuryAddress: campaign.treasury_address,
      targetBaseUnits: String(campaign.target_base_units),
      raisedBaseUnits: String(campaign.raised_base_units),
      progressBps,
      closeTs: campaign.close_ts,
      createdAt: campaign.created_at,
      updatedAt: campaign.updated_at,
      agent: {
        id: agent.id,
        slug: agent.slug,
        name: agent.name,
        avatarUrl: agent.avatar_url,
        visibility: agent.visibility,
      },
      permissions: {
        isMember,
        canManage,
      },
      position: position
        ? {
            sharesOwnedBaseUnits: String(position.shares_owned_base_units),
            principalBaseUnits: String(position.principal_base_units),
            claimableBaseUnits: String(position.claimable_base_units),
            claimedBaseUnits: String(position.claimed_base_units),
          }
        : null,
      description: agent.description ?? null,
      valuationCapBaseUnits: campaign.valuation_cap_base_units ? String(campaign.valuation_cap_base_units) : null,
      minContributionBaseUnits: String(campaign.min_contribution_base_units),
      maxContributionBaseUnits: campaign.max_contribution_base_units ? String(campaign.max_contribution_base_units) : null,
      revenuePolicy,
      saleRound,
      totals: {
        participantCount: aggregatedParticipants.length,
        contributionCount: contributions.length,
        sharesMintedBaseUnits: totalSharesMinted.toString(),
        spotPriceBaseUnits: computeSpotPriceBaseUnits(totalContributed.toString(), totalSharesMinted.toString()),
      },
      participants,
      team,
      distributions,
    };

    return createSuccessResponse({ ok: true, item });
  } catch (error) {
    return createErrorResponse(error);
  }
}
