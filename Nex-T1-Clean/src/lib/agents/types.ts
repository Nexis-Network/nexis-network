import type { z } from "zod";
import type {
  AgentDetailResponseRaw,
  AgentListItemRaw,
  AgentListingSummaryRaw,
  AgentStrategySnapshotRaw,
} from "@/lib/agents/schemas";
import type { StrategySnapshot } from "@/lib/strategies/types";
import {
  AgentDetailSchema,
  AgentDeploymentSchema,
  AgentListItemSchema,
  AgentListResponseSchema,
  AgentListingSummarySchema,
  AgentVersionSchema,
} from "@/lib/agents/schemas";

export type AgentVisibility = AgentListItemRaw["visibility"];
export type AgentListingType = AgentListingSummaryRaw["listing_type"];

export type AgentPerformanceSummary = {
  realizedPnlUsd: number;
  volumeUsd: number;
  winRatePercent: number | null;
  totalTrades: number;
  wins: number;
  losses: number;
  averageReturnPercent: number | null;
};

export type AgentStrategySnapshot = StrategySnapshot & {
  id: string;
  createdAt: string;
};

export type AgentListingSummary = {
  listingId: string;
  listingType: AgentListingType;
  networkId: string;
  assetId: string | null;
  priceBaseUnits: string;
  currencySymbol: string | null;
  currencyDecimals: number;
};

export type AgentListItem = {
  id: string;
  orgId: string;
  slug: string;
  name: string;
  description: string | null;
  visibility: AgentVisibility;
  createdAt: string;
  updatedAt: string | null;
  ownerUserId: string | null;
  avatarUrl: string | null;
  listingSummary: AgentListingSummary[];
  performance?: AgentPerformanceSummary;
  supply: number;
  numOwners: number;
};

export type AgentVersion = Readonly<{
  id: string;
  orgId: string;
  agentId: string;
  checksum: string;
  createdAt: string;
  config?: Record<string, UntypedJson>;
}>;

export type AgentDeployment = Readonly<{
  id: string;
  orgId: string;
  agentId: string;
  versionId: string;
  teeProvider: string;
  containerId: string | null;
  endpointUrl: string | null;
  status: string;
  statusReason: string | null;
  attestation: UntypedJson | null;
  attestationHash: string | null;
  lastHeartbeat: string | null;
  createdAt: string;
  updatedAt: string | null;
}>;

export type AgentDetail = Readonly<{
  agent: AgentListItem & {
    systemPrompt: string | null;
    strategySnapshot?: AgentStrategySnapshot;
  };
  versions: AgentVersion[];
  deployments: AgentDeployment[];
  listings: AgentListingSummary[];
}>;

export function parseAgentListResponse(input: UntypedJson): AgentListItem[] {
  const parsed = AgentListResponseSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Malformed agent list response");
  }
  return parsed.data.items.map(mapListItem);
}

export function parseAgentDetailResponse(input: UntypedJson): AgentDetail {
  const parsed = AgentDetailSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Malformed agent detail payload");
  }
  const { agent, versions, deployments, listings } = parsed.data;
  const strategySnapshot = agent.strategy_snapshot ? mapStrategySnapshot(agent.strategy_snapshot) : undefined;
  return {
    agent: {
      ...mapListItem(agent),
      systemPrompt: agent.system_prompt ?? null,
      strategySnapshot,
    },
    versions: versions.map(mapVersion),
    deployments: deployments.map(mapDeployment),
    listings: listings ? listings.map(mapListingSummary) : [],
  };
}

export function parseAgentListings(input: UntypedJson): AgentListingSummary[] {
  if (!Array.isArray(input)) {
    throw new Error("Listing payload must be an array");
  }
  return input.map((item) => {
    const parsed = AgentListingSummarySchema.safeParse(item);
    if (!parsed.success) {
      throw new Error("Invalid listing summary payload");
    }
    return mapListingSummary(parsed.data);
  });
}

function mapListItem(raw: AgentListItemRaw): AgentListItem {
  const validated = AgentListItemSchema.parse(raw);
  const performance = mapPerformance(validated);
  return {
    id: validated.id,
    orgId: validated.org_id,
    slug: validated.slug,
    name: validated.name,
    description: validated.description ?? null,
    visibility: validated.visibility,
    createdAt: validated.created_at,
    updatedAt: validated.updated_at ?? null,
    ownerUserId: validated.owner_user_id ?? null,
    avatarUrl: validated.avatar_url ?? null,
    listingSummary: (validated.listing_summary ?? []).map(mapListingSummary),
    performance,
    supply: validated.supply,
    numOwners: validated.num_owners,
  };
}

function mapListingSummary(raw: AgentListingSummaryRaw): AgentListingSummary {
  const validated = AgentListingSummarySchema.parse(raw);
  return {
    listingId: validated.listing_id,
    listingType: validated.listing_type,
    networkId: validated.network_id,
    assetId: validated.asset_id ?? null,
    priceBaseUnits: validated.price_base_units,
    currencySymbol: validated.currency_symbol ?? null,
    currencyDecimals: validated.currency_decimals,
  };
}

type AgentVersionRow = z.infer<typeof AgentVersionSchema>;
type AgentDeploymentRow = z.infer<typeof AgentDeploymentSchema>;
type AgentListItemParsed = z.infer<typeof AgentListItemSchema>;
type AgentStrategySnapshotRow = AgentStrategySnapshotRaw;

function mapVersion(raw: AgentVersionRow): AgentVersion {
  return {
    id: raw.id,
    orgId: raw.org_id,
    agentId: raw.agent_id,
    checksum: raw.checksum,
    createdAt: raw.created_at,
    config: raw.config ?? undefined,
  };
}

function mapDeployment(raw: AgentDeploymentRow): AgentDeployment {
  return {
    id: raw.id,
    orgId: raw.org_id,
    agentId: raw.agent_id,
    versionId: raw.version_id,
    teeProvider: raw.tee_provider,
    containerId: raw.container_id ?? null,
    endpointUrl: raw.endpoint_url ?? null,
    status: raw.status,
    statusReason: raw.status_reason ?? null,
    attestation: raw.attestation ?? null,
    attestationHash: raw.attestation_hash ?? null,
    lastHeartbeat: raw.last_heartbeat ?? null,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at ?? null,
  };
}

export type AgentDetailResponse = AgentDetailResponseRaw;

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapPerformance(input: AgentListItemParsed): AgentPerformanceSummary | undefined {
  const totalTrades = toNumber(input.total_trades);
  const wins = toNumber(input.wins);
  const losses = toNumber(input.losses);
  const pnl = toNumber(input.realized_pnl_usd);
  const volume = toNumber(input.volume_usd);
  const winRate = toNumber(input.win_rate_percent);
  const averageReturn = toNumber(input.average_return_percent);

  if ([totalTrades, wins, losses, pnl, winRate, averageReturn, volume].every((value) => value === null)) {
    return undefined;
  }

  return {
    realizedPnlUsd: pnl ?? 0,
    volumeUsd: volume ?? 0,
    winRatePercent: winRate,
    totalTrades: totalTrades ?? 0,
    wins: wins ?? 0,
    losses: losses ?? 0,
    averageReturnPercent: averageReturn,
  };
}

function mapStrategySnapshot(raw: AgentStrategySnapshotRow): AgentStrategySnapshot {
  return {
    id: raw.id,
    createdAt: raw.created_at,
    templateId: raw.template_id ?? undefined,
    blocklyXml: raw.blockly_xml,
    summary: (raw.summary ?? { triggers: [], actions: [], riskControls: [] }) as StrategySnapshot["summary"],
    workflow: (raw.workflow ?? { nodes: [] }) as StrategySnapshot["workflow"],
  };
}
