import { Suspense } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  SettingsAgentCard,
  SETTINGS_AGENT_CARD_WIDTH,
} from "@/components/settings/ai/settings-agent-card";
import {
  SettingsPage,
  SettingsPageHeader,
  SettingsSection,
} from "@/components/settings-v2/primitives/page";
import {
  SettingsTable,
  SettingsTableBody,
  SettingsTableCell,
  SettingsTableHead,
  SettingsTableHeader,
  SettingsTableHeaderRow,
  SettingsTableRow,
} from "@/components/settings/shared/settings-table";
import { getAgentMarketplace, getAgentDetail } from "@/lib/agents/api";
import { formatBaseUnits } from "@/lib/agents/format";
import { getChainIconById } from "@/lib/chain-icons";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";
import { formatDistanceToNowStrict } from "date-fns";
import { createClient as createSupabase } from "@/server/services/supabase/server";
import { ensureActiveOrg } from "@/server/organization/active-org";

type AgentCardRow = {
  id: string;
  name: string;
  subtitle: string;
  chainIconSrc: string;
  chainLabel: string;
};

type RevenueRow = {
  key: string;
  amount: bigint;
  symbol: string;
  networkId: string;
  decimals: number;
};

type RentalRow = {
  id: string;
  listingId: string | null;
  agentName: string;
  state: string;
  startedAt: string;
  endedAt: string | null;
};

export default async function SettingsAgentsPage() {
  // Auth is enforced server-side by app/(authenticated)/layout.tsx
  return (
    <Suspense fallback={<SettingsAgentsSkeleton />}>
      <SettingsAgentsContent />
    </Suspense>
  );
}

async function SettingsAgentsContent() {
  const supabase = await createSupabase();
  const activeOrg = await ensureActiveOrg();
  const orgId = activeOrg.ok ? activeOrg.orgId : null;

  let agents: Awaited<ReturnType<typeof getAgentMarketplace>> = [];
  let fetchError: string | null = null;

  try {
    agents = await getAgentMarketplace({}, { orgId });
  } catch (error) {
    fetchError =
      error instanceof Error
        ? normalizeAgentsError(error.message)
        : "We couldn’t load agents. Please try again.";
  }

  if (fetchError) {
    return (
      <SettingsPage>
        <SettingsPageHeader
          title="Agents"
          description="Create and publish agents from the marketplace wizard."
        />
        <div className="rounded-[20px] border border-destructive/40 bg-destructive/10 p-8 text-sm text-[var(--bento-text-muted)]">
          <p className="text-base font-medium text-[var(--bento-text-primary)]">
            We couldn’t load agents.
          </p>
          <p className="mt-1">{fetchError}</p>
          <p className="mt-4">
            If you recently changed workspaces, try{" "}
            <Link
              href="/settings/workspace?tab=organization"
              className="text-[var(--settings-foreground-strong)] underline"
            >
              selecting an active workspace
            </Link>
            .
          </p>
        </div>
      </SettingsPage>
    );
  }

  if (agents.length === 0) {
    return (
      <SettingsPage>
        <SettingsPageHeader
          title="Agents"
          description="Create and publish agents from the marketplace wizard."
        />
        <div className="rounded-[20px] border border-dashed border-[var(--bento-border)] bg-transparent p-10 text-center text-sm text-[var(--bento-text-muted)]">
          No agents yet.{" "}
          <Link
            href="/agents/new"
            className="text-[var(--settings-foreground-strong)] underline"
          >
            Create your first agent
          </Link>
          .
        </div>
      </SettingsPage>
    );
  }

  const agentsList = Array.isArray(agents) ? agents : [];
  const details = await Promise.all(
    agentsList.map((agent) => getAgentDetail(agent.id, { orgId })),
  ).catch(() => []);
  const detailList = Array.isArray(details) ? details : [];

  const cardRows: AgentCardRow[] = detailList.length
    ? detailList.map((detail) => {
        const primaryNetworkId =
          detail.agent.listingSummary[0]?.networkId ??
          detail.listings[0]?.networkId ??
          null;
        return {
          id: detail.agent.id,
          name: detail.agent.name,
          subtitle: formatProfitLossLabel(
            detail.agent.performance?.realizedPnlUsd,
          ),
          chainIconSrc: resolveChainIcon(primaryNetworkId),
          chainLabel: primaryNetworkId
            ? `Chain ${primaryNetworkId}`
            : "Agent chain",
        };
      })
    : agentsList.map((agent) => {
        const primaryNetworkId = agent.listingSummary[0]?.networkId ?? null;
        return {
          id: agent.id,
          name: agent.name,
          subtitle: formatProfitLossLabel(agent.performance?.realizedPnlUsd),
          chainIconSrc: resolveChainIcon(primaryNetworkId),
          chainLabel: primaryNetworkId
            ? `Chain ${primaryNetworkId}`
            : "Agent chain",
        };
      });

  let revenue: RevenueRow[] = [];
  let rentals: RentalRow[] = [];

  if (supabase && orgId) {
    const listingMeta = new Map<
      string,
      { symbol: string; decimals: number; agentName: string }
    >();
    for (const detail of detailList) {
      for (const listing of detail.agent.listingSummary) {
        listingMeta.set(listing.listingId, {
          symbol: listing.currencySymbol ?? "NATIVE",
          decimals: listing.currencyDecimals,
          agentName: detail.agent.name,
        });
      }
    }

    const { data: usageEvents } = await supabase
      .from("agent_usage_event")
      .select(
        "agent_id, listing_id, amount_base_units, network_id, asset_id, created_at",
      )
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (Array.isArray(usageEvents)) {
      const totals = new Map<string, RevenueRow>();
      for (const event of usageEvents) {
        if (!event.amount_base_units) continue;
        const key = `${event.network_id ?? "unknown"}|${event.asset_id ?? "native"}`;
        const listing = event.listing_id
          ? listingMeta.get(event.listing_id)
          : undefined;
        const current = totals.get(key) ?? {
          key,
          amount: 0n,
          symbol:
            listing?.symbol ??
            (event.asset_id
              ? (event.asset_id.split(":").pop() ?? "ASSET")
              : "NATIVE"),
          networkId: event.network_id ?? "unknown",
          decimals: listing?.decimals ?? 0,
        };
        totals.set(key, {
          ...current,
          amount: current.amount + BigInt(String(event.amount_base_units)),
        });
      }
      revenue = Array.from(totals.values());
    }

    const { data: rentalsData } = await supabase
      .from("agent_rental")
      .select("id, listing_id, state, start_ts, end_ts")
      .eq("org_id", orgId)
      .order("start_ts", { ascending: false })
      .limit(10);

    if (Array.isArray(rentalsData)) {
      rentals = rentalsData.map((rental) => {
        const listing = rental.listing_id
          ? listingMeta.get(rental.listing_id)
          : undefined;
        return {
          id: rental.id,
          listingId: rental.listing_id ?? null,
          agentName: listing?.agentName ?? "Unknown agent",
          state: rental.state ?? "pending",
          startedAt: rental.start_ts,
          endedAt: rental.end_ts ?? null,
        };
      });
    }
  }

  return (
    <SettingsPage>
      <SettingsPageHeader
        title="Agents"
        description="Manage your marketplace agents in a studio-style card view tuned for the settings workspace."
        badge={
          <Badge
            variant="outline"
            className="rounded-full border border-[var(--settings-border-soft)] bg-white/[0.03] text-xs text-[var(--settings-foreground-muted)]"
          >
            {cardRows.length}
          </Badge>
        }
      />

      <SettingsSection
        title="Marketplace studio"
        description="Open an agent to review deployments, pricing, performance, and listing state."
      >
        <div
          className="grid justify-start gap-4"
          style={{
            gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${SETTINGS_AGENT_CARD_WIDTH}), ${SETTINGS_AGENT_CARD_WIDTH}))`,
          }}
        >
          {cardRows.map((agent) => (
            <SettingsAgentCard
              key={agent.id}
              id={agent.id}
              name={agent.name}
              subtitle={agent.subtitle}
              badgeIconSrc={agent.chainIconSrc}
              badgeIconLabel={agent.chainLabel}
            />
          ))}
        </div>
      </SettingsSection>

      {revenue.length > 0 ? (
        <SettingsSection
          tone="ledger"
          title="Revenue summary"
          description="Aggregated by network and settlement asset."
        >
          <div data-settings-row-list>
            {revenue.map((entry) => (
              <div
                key={entry.key}
                className="flex items-center justify-between gap-4 px-5 py-4 text-sm"
              >
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-[var(--settings-foreground-subtle)]">
                    {entry.networkId}
                  </p>
                  <p className="text-sm text-[var(--settings-foreground-muted)]">
                    {entry.symbol}
                  </p>
                </div>
                <p className="text-lg font-regular text-[var(--settings-foreground-strong)]">
                  {formatBaseUnits(entry.amount.toString(), entry.decimals)}{" "}
                  {entry.symbol}
                </p>
              </div>
            ))}
          </div>
        </SettingsSection>
      ) : null}

      {rentals.length > 0 ? (
        <SettingsSection
          tone="ledger"
          title="Recent rentals"
          description="Latest rental activity across your marketplace listings."
        >
          <div className="overflow-hidden">
            <SettingsTable>
              <SettingsTableHeader>
                <SettingsTableHeaderRow>
                  <SettingsTableHead>Agent</SettingsTableHead>
                  <SettingsTableHead>State</SettingsTableHead>
                  <SettingsTableHead>Started</SettingsTableHead>
                  <SettingsTableHead>Ended</SettingsTableHead>
                </SettingsTableHeaderRow>
              </SettingsTableHeader>
              <SettingsTableBody>
                {rentals.map((rental) => (
                  <SettingsTableRow key={rental.id}>
                    <SettingsTableCell className="text-[var(--settings-foreground-strong)]">
                      {rental.agentName}
                    </SettingsTableCell>
                    <SettingsTableCell className="capitalize">
                      {rental.state}
                    </SettingsTableCell>
                    <SettingsTableCell>
                      {formatDistanceToNowStrict(new Date(rental.startedAt), {
                        addSuffix: true,
                      })}
                    </SettingsTableCell>
                    <SettingsTableCell>
                      {rental.endedAt
                        ? formatDistanceToNowStrict(new Date(rental.endedAt), {
                            addSuffix: true,
                          })
                        : "–"}
                    </SettingsTableCell>
                  </SettingsTableRow>
                ))}
              </SettingsTableBody>
            </SettingsTable>
          </div>
        </SettingsSection>
      ) : null}
    </SettingsPage>
  );
}

function SettingsAgentsSkeleton() {
  return (
    <SettingsPage>
      <header className="space-y-2">
        <div className="h-6 w-32 rounded-lg bg-white/[0.03] bg-white/[0.03]" />
        <div className="h-4 w-48 rounded-lg bg-white/[0.03] bg-white/[0.03]" />
      </header>
      <div className="h-64 rounded-[20px] border border-[var(--settings-border-soft)] bg-white/[0.03]" />
    </SettingsPage>
  );
}

function normalizeAgentsError(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return "We couldn’t load agents. Please try again.";
  if (!trimmed.startsWith("{")) return trimmed;

  try {
    const json = JSON.parse(trimmed) as UntypedJson;
    if (typeof json?.error === "string" && json.error.trim())
      return json.error.trim();
    if (typeof json?.message === "string" && json.message.trim())
      return json.message.trim();
    if (typeof json?.details === "string" && json.details.trim())
      return json.details.trim();
  } catch {
    // ignore parse errors
  }

  return trimmed;
}

function resolveChainIcon(networkId: string | null | undefined): string {
  if (!networkId) return LIQUID_GLASS_LOGOS.ethereum;
  const parsedNetworkId = Number.parseInt(networkId, 10);
  if (!Number.isFinite(parsedNetworkId))
    return LIQUID_GLASS_LOGOS.ethereum;

  const mapped = getChainIconById(parsedNetworkId);
  return normalizeChainIconPath(mapped);
}

const CHAIN_ICON_FILENAME_ALIASES: Record<string, string> = {
  "avax.svg": "avalanche.svg",
  "eth.svg": "ethereum.svg",
};

function normalizeChainIconPath(source: string | null | undefined): string {
  const fallback = LIQUID_GLASS_LOGOS.ethereum;
  if (!source) return fallback;

  if (source.startsWith("/icons/chain-icons/")) {
    return source;
  }

  const filename = source.split("/").pop()?.trim();
  if (!filename) return fallback;

  const normalizedFilename = CHAIN_ICON_FILENAME_ALIASES[filename] ?? filename;
  return `/icons/chain-icons/${normalizedFilename}`;
}

function formatProfitLossLabel(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "$0";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
