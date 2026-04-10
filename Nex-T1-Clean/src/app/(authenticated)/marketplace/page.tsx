import { Suspense } from "react";
import dynamic from "next/dynamic";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { MarketNav } from "@/components/marketplace/market-nav";
import { MarketHero } from "@/components/marketplace/market-hero";
import { Skeleton } from "@/components/ui/skeleton";

const TrendingAgentsGrid = dynamic(() => import("@/components/marketplace/trending-tokens-grid").then(mod => mod.TrendingAgentsGrid));
const CollectionSection = dynamic(() => import("@/components/marketplace/collection-section").then(mod => mod.CollectionSection));
const WeeklySalesFeature = dynamic(() => import("@/components/marketplace/weekly-sales-feature").then(mod => mod.WeeklySalesFeature));
const FeaturedAgentsGrid = dynamic(() => import("@/components/marketplace/featured-tokens-grid").then(mod => mod.FeaturedAgentsGrid));
const AgentGuidesSection = dynamic(() => import("@/components/marketplace/nft-101-section").then(mod => mod.AgentGuidesSection));
import { getMarketplaceData } from "@/lib/marketplace/data-access";
import { mapAgentToCollection } from "@/lib/marketplace/utils";
import { resolveAvatarImageSrc } from "@/lib/avatar-image-fallback";

function MarketplaceContentSkeleton() {
  return (
    <div className="flex flex-col min-h-screen max-w-[1400px] mx-auto px-6 py-6 space-y-12">
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-[320px] w-full rounded-2xl" />
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function MarketplacePage(props: {
  searchParams: Promise<{ q?: string; category?: string; chain?: string }>
}) {
  const searchParams = await props.searchParams;
  const query = searchParams.q ?? "";
  const category = searchParams.category ?? "All";
  const chain = searchParams.chain ?? "all";

  return (
    <DashboardShell insetClassName="overflow-y-auto bg-background">
      <Suspense fallback={<MarketplaceContentSkeleton />}>
        <MarketplaceContent query={query} category={category} chain={chain} />
      </Suspense>
    </DashboardShell>
  );
}

async function MarketplaceContent({
  query,
  category,
  chain,
}: {
  query: string;
  category: string;
  chain: string;
}) {
  const data = await getMarketplaceData({ query, category, chain });

  const listedPercent = data.heroAgent
    ? `${Math.max(
        0,
        Math.min(
          100,
          data.heroAgent.supply > 0 ? (data.heroAgent.numOwners / data.heroAgent.supply) * 100 : 0,
        ),
      ).toFixed(1)}%`
    : undefined;

  return (
    <div className="flex flex-col min-h-screen max-w-[1400px] mx-auto px-6 py-6 space-y-12">
      <MarketNav />

      <MarketHero
        title={data.heroAgent?.name}
        author={data.heroAgent?.orgId ? `Org ${data.heroAgent.orgId.slice(0, 8)}` : "Nexis Foundation"}
        href={data.heroAgent ? `/agents/${data.heroAgent.id}` : "/marketplace"}
        backgroundImage={data.heroAgent?.avatarUrl || undefined}
        thumbnails={data.heroThumbnails}
        splineScene={data.heroAgent?.name === "Quantum Arbiter" ? "https://prod.spline.design/56-vjjwXUgaBF27P/scene.splinecode" : undefined}
        stats={data.heroAgent ? {
          entryPrice: mapAgentToCollection(data.heroAgent).value || "Custom",
          owners: data.heroAgent.numOwners.toLocaleString(),
          weeklyVolume: `$${(data.heroAgent.performance?.volumeUsd || 0).toLocaleString()}`,
          adoption: listedPercent ?? "0.0%",
        } : undefined}
      />

      <TrendingAgentsGrid
        title="Trending Agents"
        subtitle="Largest PnL change in the past 24h"
        items={data.trendingAgents}
      />

      <CollectionSection
        title="Strategy Catalog"
        subtitle="High-performance autonomous strategies you can deploy or copy."
        items={data.curatedStrategies}
      />

      <CollectionSection
        title="New Agent Releases"
        subtitle="Recently published agents and fresh strategy versions."
        type="drop"
        gridCols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        items={data.newDeployments}
      />

      <WeeklySalesFeature
        topAgent={data.topSalesAgent ? {
          name: data.topSalesAgent.name,
          image: resolveAvatarImageSrc(data.topSalesAgent.avatarUrl, data.topSalesAgent.slug),
          volume: `$${(data.topSalesAgent.performance?.volumeUsd || 0).toLocaleString()}`,
          change: `${data.topSalesAgent.performance?.averageReturnPercent?.toFixed(2) || "0.00"}%`,
          description: data.topSalesAgent.description || "No description provided.",
          href: `/agents/${data.topSalesAgent.id}`,
        } : undefined}
        relatedAgents={data.relatedSalesAgents}
      />

      <CollectionSection
        title="Top Performers"
        subtitle="Highest average return in the selected dataset."
        type="mover"
        gridCols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        items={data.topPerformers}
      />

      <FeaturedAgentsGrid items={data.featuredModels} />

      <CollectionSection
        title="Most Active Agents"
        subtitle="Agents with the most executed trades."
        type="mover"
        gridCols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        items={data.activeSwarms}
      />

      <AgentGuidesSection />

      <div className="h-20" />
    </div>
  );
}
