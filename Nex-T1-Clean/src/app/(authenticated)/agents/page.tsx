import { Suspense } from "react";
import { AgentFiltersBar, AgentsGrid } from "@/components/agents";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getAgentMarketplace } from "@/lib/agents/api";
import type { FilterOption } from "@/lib/agents/filters";
import { parseAgentFilterState } from "@/lib/agents/filters";
import { deriveAssetSymbol, humanizeNetwork } from "@/lib/agents/format";
import type { AgentListItem, AgentListingSummary } from "@/lib/agents/types";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type AgentsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function AgentsPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default async function AgentsPage({ searchParams }: AgentsPageProps) {
  const rawSearchParams = await searchParams;
  const filters = parseAgentFilterState(rawSearchParams);

  return (
    <div className="settings-v2-theme mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <header className="overflow-hidden rounded-[24px] border border-border/60 bg-gradient-to-b from-card via-card/95 to-background/90 px-6 py-6 shadow-[0_24px_60px_-44px_rgba(0,0,0,0.45)] sm:px-8 sm:py-7">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <Badge
              variant="outline"
              className="w-fit rounded-full border border-border/60 bg-accent/40 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary"
            >
              Agent Directory
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--settings-foreground-strong)]">
                Explore Agents
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-[var(--settings-foreground-muted)]">
                Browse launch-ready agents, filter by listing mode and chain, and open each profile to review
                performance, pricing, deployments, and campaign controls.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/agents/new"
              className="inline-flex items-center gap-1 rounded-[10px] bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Create agent
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <Suspense fallback={<AgentsPageSkeleton />}>
        <AgentsPageContent filters={filters} />
      </Suspense>
    </div>
  );
}

async function AgentsPageContent({ filters }: { filters: ReturnType<typeof parseAgentFilterState> }) {
  let agents: AgentListItem[] = [];
  let fetchError: string | null = null;

  try {
    agents = await getAgentMarketplace(
      {
        query: filters.query || undefined,
        listingTypes: filters.listingTypes.length > 0 ? filters.listingTypes : undefined,
        networks: filters.networks.length > 0 ? filters.networks : undefined,
        assets: filters.assets.length > 0 ? filters.assets : undefined,
      },
      { revalidate: false },
    );
  } catch (error) {
    fetchError = error instanceof Error ? error.message : "Failed to load agent listings.";
  }

  const networkOptions = buildNetworkOptions(agents);
  const assetOptions = buildAssetOptions(agents);

  if (fetchError) {
    return (
      <section className="rounded-[20px] border border-destructive/40 bg-destructive/10 px-6 py-5 text-sm text-muted-foreground">
        <p className="text-base font-medium text-foreground">Unable to load agents</p>
        <p className="mt-1">{fetchError}</p>
      </section>
    );
  }

  return (
    <>
      <AgentFiltersBar value={filters} networkOptions={networkOptions} assetOptions={assetOptions} />
      <AgentsGrid
        agents={agents}
        emptyMessage="No agents match the current filters. Try broadening your listing type or chain filters."
      />
    </>
  );
}

function buildNetworkOptions(agents: AgentListItem[]): FilterOption[] {
  const countByNetwork = new Map<string, number>();

  for (const agent of agents) {
    for (const listing of agent.listingSummary) {
      countByNetwork.set(listing.networkId, (countByNetwork.get(listing.networkId) ?? 0) + 1);
    }
  }

  return Array.from(countByNetwork.entries())
    .map(([value, count]) => ({
      value,
      label: humanizeNetwork(value),
      badge: String(count),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function buildAssetOptions(agents: AgentListItem[]): FilterOption[] {
  const assetMap = new Map<string, { label: string; count: number }>();

  for (const agent of agents) {
    for (const listing of agent.listingSummary) {
      const value = serializeAssetFilter(listing);
      const label = `${deriveAssetSymbol(listing)} · ${humanizeNetwork(listing.networkId)}`;
      const existing = assetMap.get(value);
      if (existing) {
        existing.count += 1;
      } else {
        assetMap.set(value, { label, count: 1 });
      }
    }
  }

  return Array.from(assetMap.entries())
    .map(([value, item]) => ({
      value,
      label: item.label,
      badge: String(item.count),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function serializeAssetFilter(summary: AgentListingSummary): string {
  return `${summary.networkId}|${summary.assetId ?? "native"}`;
}
