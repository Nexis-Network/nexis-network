export const maxDuration = 15;

import { connection, NextRequest } from "next/server";
import { z } from "zod";

import { createErrorResponse, createSuccessResponse } from "@/lib/request-utils";
import { normalizeOrgMemberRole } from "@/server/agents/agent-access";
import { withAuth } from "@/server/security/with-auth";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";

const querySchema = z.object({
  scope: z.enum(["all", "invested", "managed"]).default("all"),
  status: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? "")
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const ALLOWED_STATUS = new Set(["draft", "active", "finalized", "cancelled"]);

type MembershipRow = {
  org_id: string;
  role: UntypedJson;
};

type CampaignAgent = {
  id: string;
  slug: string;
  name: string;
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
  risk_score: number | null;
  risk_flags: string[] | null;
  accepted_assets: string[] | null;
  status: "draft" | "active" | "finalized" | "cancelled";
  campaign_address: string | null;
  share_token_address: string | null;
  treasury_address: string | null;
  target_base_units: string | number;
  raised_base_units: string | number;
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

function normalizeAgent(row: CampaignRow): CampaignAgent | null {
  if (!row.agent) return null;
  if (Array.isArray(row.agent)) return row.agent[0] ?? null;
  return row.agent;
}

function canManageRole(role: string): boolean {
  return role === "owner" || role === "admin" || role === "manager";
}

function computeProgressBps(raised: string | number, target: string | number): number {
  const targetValue = BigInt(String(target));
  if (targetValue <= 0n) return 0;
  const raisedValue = BigInt(String(raised));
  const bps = Number((raisedValue * 10_000n) / targetValue);
  return Math.max(0, Math.min(10_000, bps));
}

export async function GET(req: NextRequest) {
  await connection();
  try {
    const auth = await withAuth(req, { allowPublic: false, requireOrg: false });
    if (!auth.ok) return auth.response;

    const userId = auth.session?.user?.id;
    if (!userId) {
      return createErrorResponse(new Error("Unauthenticated"), { status: 401 });
    }

    const url = new URL(req.url);
    const input = querySchema.parse({
      scope: url.searchParams.get("scope") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

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

    let campaignQuery = service
      .from("agent_campaign")
      .select(
        "id, org_id, agent_id, chain_family, chain_ref, token_standard, launch_controls, compliance_policy, risk_score, risk_flags, accepted_assets, status, campaign_address, share_token_address, treasury_address, target_base_units, raised_base_units, close_ts, created_at, updated_at, agent:agent(id, slug, name, avatar_url, visibility, owner_user_id)",
      )
      .order("created_at", { ascending: false })
      .limit(input.limit);

    const statusFilters = input.status.filter((status) => ALLOWED_STATUS.has(status));
    if (statusFilters.length > 0) {
      campaignQuery = campaignQuery.in("status", statusFilters);
    }

    if (input.scope === "managed") {
      const manageableOrgIds = Array.from(membershipByOrg.entries())
        .filter(([, role]) => canManageRole(role))
        .map(([orgId]) => orgId);
      if (manageableOrgIds.length === 0) {
        return createSuccessResponse({ ok: true, items: [] });
      }
      campaignQuery = campaignQuery.in("org_id", manageableOrgIds);
    }

    const { data: campaignData, error: campaignError } = await campaignQuery;
    if (campaignError) {
      return createErrorResponse(new Error(campaignError.message), {
        status: 400,
        customMessage: "Failed to load launchpad campaigns.",
      });
    }

    const campaigns = (campaignData ?? []) as CampaignRow[];
    if (campaigns.length === 0) {
      return createSuccessResponse({ ok: true, items: [] });
    }

    const campaignIds = campaigns.map((item) => item.id);
    const { data: positionData, error: positionError } = await service
      .from("agent_investor_position")
      .select("campaign_id, shares_owned_base_units, principal_base_units, claimable_base_units, claimed_base_units")
      .eq("investor_user_id", userId)
      .in("campaign_id", campaignIds);
    if (positionError) {
      return createErrorResponse(new Error(positionError.message), {
        status: 400,
        customMessage: "Failed to load investor positions.",
      });
    }

    const positionByCampaign = new Map<string, PositionRow>();
    for (const position of (positionData ?? []) as PositionRow[]) {
      positionByCampaign.set(position.campaign_id, position);
    }

    const items = campaigns
      .map((campaign) => {
        const agent = normalizeAgent(campaign);
        if (!agent) return null;

        const membershipRole = membershipByOrg.get(campaign.org_id) ?? "viewer";
        const isMember = membershipByOrg.has(campaign.org_id);
        const canManage = canManageRole(membershipRole);
        const position = positionByCampaign.get(campaign.id) ?? null;
        const isOwner = agent.owner_user_id === userId;
        const visibility = agent.visibility;
        const canView = visibility !== "private" || isMember || isOwner || Boolean(position);

        if (!canView) return null;
        if (input.scope === "invested" && !position) return null;

        return {
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
          progressBps: computeProgressBps(campaign.raised_base_units, campaign.target_base_units),
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
        };
      })
      .filter(Boolean);

    return createSuccessResponse({ ok: true, items });
  } catch (error) {
    return createErrorResponse(error);
  }
}
