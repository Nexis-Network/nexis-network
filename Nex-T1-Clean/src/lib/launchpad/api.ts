import "server-only";

import { randomUUID } from "crypto";
import { cookies as readCookies, headers as readHeaders } from "next/headers";
import { z } from "zod";

import type {
  LaunchpadCampaignDetail,
  LaunchpadCampaignDetailResponse,
  LaunchpadCampaignItem,
  LaunchpadCampaignListResponse,
  LaunchpadCampaignReceiptsResponse,
  LaunchpadCampaignScope,
  LaunchpadCampaignStatus,
} from "@/lib/launchpad/types";

const campaignPositionSchema = z.object({
  sharesOwnedBaseUnits: z.string(),
  principalBaseUnits: z.string(),
  claimableBaseUnits: z.string(),
  claimedBaseUnits: z.string(),
});

const campaignItemSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  agentId: z.string(),
  chainFamily: z.enum(["evm", "solana"]),
  chainRef: z.string(),
  tokenStandard: z.enum(["erc20", "erc404"]).default("erc20"),
  launchControls: z.record(z.string(), z.unknown()).catch({}),
  compliancePolicy: z.record(z.string(), z.unknown()).catch({}),
  riskScore: z.number().catch(0),
  riskFlags: z.array(z.string()).catch([]),
  acceptedAssets: z.array(z.string()).catch([]),
  status: z.enum(["draft", "active", "finalized", "cancelled"]),
  campaignAddress: z.string().nullable(),
  shareTokenAddress: z.string().nullable(),
  treasuryAddress: z.string().nullable(),
  targetBaseUnits: z.string(),
  raisedBaseUnits: z.string(),
  progressBps: z.number(),
  closeTs: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  agent: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    avatarUrl: z.string().nullable(),
    visibility: z.enum(["public", "private", "unlisted"]),
  }),
  permissions: z.object({
    isMember: z.boolean(),
    canManage: z.boolean(),
  }),
  position: campaignPositionSchema.nullable(),
});

const launchpadListResponseSchema = z.object({
  ok: z.literal(true),
  items: z.array(campaignItemSchema),
});

const campaignParticipantSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  walletAddress: z.string().nullable(),
  walletNamespace: z.string().nullable(),
  contributionCount: z.number().int().nonnegative(),
  totalContributedBaseUnits: z.string(),
  totalSharesBaseUnits: z.string(),
  latestContributionAt: z.string(),
  lastTxHash: z.string().nullable(),
});

const campaignTeamMemberSchema = z.object({
  userId: z.string(),
  role: z.enum(["owner", "admin", "manager", "viewer"]),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  walletAddress: z.string().nullable(),
  walletNamespace: z.string().nullable(),
  joinedAt: z.string().nullable(),
});

const campaignDistributionEpochSchema = z.object({
  id: z.string(),
  epochIndex: z.number().int().nonnegative(),
  networkId: z.string(),
  assetId: z.string().nullable(),
  grossBaseUnits: z.string(),
  investorBaseUnits: z.string(),
  creatorBaseUnits: z.string(),
  operatorBaseUnits: z.string(),
  txHash: z.string().nullable(),
  createdAt: z.string(),
});

const campaignReceiptMetadataSchema = z
  .object({
    epochIndex: z.number().int().nonnegative().optional(),
    allocationRank: z.number().int().nonnegative().optional(),
    payoutTxHashes: z.array(z.string()).optional(),
  })
  .catchall(z.unknown());

const campaignReceiptSchema = z.object({
  id: z.string(),
  distributionId: z.string().nullable(),
  recipientUserId: z.string().nullable(),
  recipientAddress: z.string().nullable(),
  networkId: z.string(),
  assetId: z.string().nullable(),
  amountBaseUnits: z.string(),
  txHash: z.string().nullable(),
  signature: z.string(),
  metadata: campaignReceiptMetadataSchema,
  createdAt: z.string(),
});

const campaignDetailSchema = campaignItemSchema.extend({
  description: z.string().nullable(),
  valuationCapBaseUnits: z.string().nullable(),
  minContributionBaseUnits: z.string(),
  maxContributionBaseUnits: z.string().nullable(),
  revenuePolicy: z.object({
    creatorBps: z.number().int().nonnegative(),
    operatorBps: z.number().int().nonnegative(),
    investorBps: z.number().int().nonnegative(),
    creatorTreasury: z.string().nullable(),
    operatorTreasury: z.string().nullable(),
  }),
  saleRound: z.enum(["Preparation", "Whitelist", "Public", "Closed"]),
  totals: z.object({
    participantCount: z.number().int().nonnegative(),
    contributionCount: z.number().int().nonnegative(),
    sharesMintedBaseUnits: z.string(),
    spotPriceBaseUnits: z.string().nullable(),
  }),
  participants: z.array(campaignParticipantSchema),
  team: z.array(campaignTeamMemberSchema),
  distributions: z.array(campaignDistributionEpochSchema),
});

const launchpadDetailResponseSchema = z.object({
  ok: z.literal(true),
  item: campaignDetailSchema,
});

const launchpadReceiptsResponseSchema = z.object({
  ok: z.literal(true),
  campaign: z.object({
    id: z.string(),
    riskScore: z.number(),
    riskFlags: z.array(z.string()).catch([]),
  }),
  receipts: z.array(campaignReceiptSchema),
});

type FetchOptions = {
  revalidate?: number | false;
  signal?: AbortSignal;
};

export type GetLaunchpadCampaignsParams = {
  scope?: LaunchpadCampaignScope;
  status?: LaunchpadCampaignStatus[];
  limit?: number;
};

export type GetLaunchpadCampaignReceiptsParams = {
  limit?: number;
};

class LaunchpadApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "LaunchpadApiError";
    this.status = status;
  }
}

export async function getLaunchpadCampaigns(
  params: GetLaunchpadCampaignsParams = {},
  options: FetchOptions = {},
): Promise<LaunchpadCampaignItem[]> {
  const baseUrl = await resolveBaseUrl();
  const cookieStore = await readCookies();
  const search = new URLSearchParams();
  search.set("scope", params.scope ?? "all");

  if (Array.isArray(params.status) && params.status.length > 0) {
    search.set("status", params.status.join(","));
  }

  if (typeof params.limit === "number" && Number.isFinite(params.limit)) {
    search.set("limit", String(params.limit));
  }

  const response = await fetch(`${baseUrl}/api/launchpad/campaigns?${search.toString()}`, {
    method: "GET",
    headers: buildHeaders(cookieStore.getAll()),
    cache: "no-store",
    signal: options.signal,
    next: options.revalidate === false ? { revalidate: 0 } : undefined,
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new LaunchpadApiError(response.status, message || "Failed to load launchpad campaigns.");
  }

  const payload = (await response.json()) as LaunchpadCampaignListResponse;
  const parsed = launchpadListResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Malformed launchpad campaigns response");
  }

  return parsed.data.items;
}

export async function getLaunchpadCampaignDetail(
  campaignId: string,
  options: FetchOptions = {},
): Promise<LaunchpadCampaignDetail> {
  const baseUrl = await resolveBaseUrl();
  const cookieStore = await readCookies();

  const response = await fetch(`${baseUrl}/api/launchpad/campaigns/${campaignId}`, {
    method: "GET",
    headers: buildHeaders(cookieStore.getAll()),
    cache: "no-store",
    signal: options.signal,
    next: options.revalidate === false ? { revalidate: 0 } : undefined,
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new LaunchpadApiError(response.status, message || "Failed to load launchpad campaign detail.");
  }

  const payload = (await response.json()) as LaunchpadCampaignDetailResponse;
  const parsed = launchpadDetailResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Malformed launchpad campaign detail response");
  }

  return parsed.data.item;
}

export async function getLaunchpadCampaignReceipts(
  agentId: string,
  campaignId: string,
  params: GetLaunchpadCampaignReceiptsParams = {},
  options: FetchOptions = {},
): Promise<LaunchpadCampaignReceiptsResponse> {
  const baseUrl = await resolveBaseUrl();
  const cookieStore = await readCookies();
  const search = new URLSearchParams();
  search.set("campaignId", campaignId);
  if (typeof params.limit === "number" && Number.isFinite(params.limit)) {
    search.set("limit", String(params.limit));
  }

  const response = await fetch(`${baseUrl}/api/agents/${agentId}/campaign/receipts?${search.toString()}`, {
    method: "GET",
    headers: buildHeaders(cookieStore.getAll()),
    cache: "no-store",
    signal: options.signal,
    next: options.revalidate === false ? { revalidate: 0 } : undefined,
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new LaunchpadApiError(response.status, message || "Failed to load launchpad campaign receipts.");
  }

  const payload = (await response.json()) as LaunchpadCampaignReceiptsResponse;
  const parsed = launchpadReceiptsResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Malformed launchpad campaign receipts response");
  }

  return parsed.data;
}

function buildHeaders(cookies: Array<{ name: string; value: string }>): HeadersInit {
  const cookieHeader = serializeCookies(cookies);
  const headers: HeadersInit = {
    Accept: "application/json",
    "x-correlation-id": randomUUID(),
  };

  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  return headers;
}

function serializeCookies(cookies: Array<{ name: string; value: string }>): string | undefined {
  if (cookies.length === 0) return undefined;
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

async function resolveBaseUrl(): Promise<string> {
  try {
    const headerStore = await readHeaders();
    const protocol = headerStore.get("x-forwarded-proto") ?? "https";
    const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
    if (host) {
      return `${protocol}://${host}`;
    }
  } catch {
    // headers() can be unavailable in non-request contexts.
  }

  const fallback = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return fallback.replace(/\/$/, "");
}

async function parseErrorMessage(response: Response): Promise<string> {
  const raw = await response.text().catch(() => "");
  const trimmed = raw.trim();
  if (!trimmed) return response.statusText || "Request failed";

  try {
    const json = JSON.parse(trimmed) as { error?: string; message?: string };
    if (typeof json.error === "string" && json.error.trim()) return json.error.trim();
    if (typeof json.message === "string" && json.message.trim()) return json.message.trim();
  } catch {
    // Ignore parse errors and fall back to response body.
  }

  return trimmed;
}
