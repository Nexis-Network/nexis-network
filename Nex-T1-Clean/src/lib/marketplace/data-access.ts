import { getAgentMarketplace } from "@/lib/agents/api";
import { mapAgentToTrendingToken, mapAgentToCollection, mapAgentToMover } from "@/lib/marketplace/utils";
import { AgentListItem } from "@/lib/agents/types";
import type { AgentListingType } from "@/lib/agents/types";
import { resolveAvatarImageSrc } from "@/lib/avatar-image-fallback";
import { getChainIconById } from "@/lib/chain-icons";

export interface MarketplaceData {
  heroAgent?: AgentListItem;
  heroThumbnails: Array<{ src: string; alt: string; href: string }>;
  trendingAgents: UntypedJson[];
  curatedStrategies: UntypedJson[];
  newDeployments: UntypedJson[];
  topPerformers: UntypedJson[];
  activeSwarms: UntypedJson[];
  topSalesAgent?: AgentListItem;
  relatedSalesAgents: UntypedJson[];
  featuredModels: UntypedJson[];
}

function categoryToListingTypes(category: string | null | undefined): AgentListingType[] | undefined {
  const normalized = (category ?? "All").trim().toLowerCase();
  if (normalized === "all") return undefined;
  if (normalized === "buy") return ["sale"];
  if (normalized === "sale") return ["sale"];
  if (normalized === "rent") return ["rent"];
  if (normalized === "usage") return ["usage"];
  return undefined;
}

export async function getMarketplaceData(filters: {
  query?: string | null;
  category?: string | null;
  chain?: string | null;
} = {}): Promise<MarketplaceData> {
  const listingTypes = categoryToListingTypes(filters.category);
  const chain = (filters.chain ?? "all").trim();
  const query = (filters.query ?? "").trim();
  const networks = chain && chain !== "all" ? [chain] : undefined;

  const allAgents = await getAgentMarketplace(
    { query: query || undefined, listingTypes, networks },
    { revalidate: false },
  ).catch(() => []);

  const realAgentsList = Array.isArray(allAgents) ? allAgents.slice() : [];

  // 1. Hero Data (Pick the top performing agent or newest)
  const heroAgent = realAgentsList
    .slice()
    .sort((a, b) => (b.performance?.realizedPnlUsd ?? 0) - (a.performance?.realizedPnlUsd ?? 0))[0];

  const heroThumbnails = realAgentsList
    .slice()
    .sort((a, b) => (b.performance?.volumeUsd ?? 0) - (a.performance?.volumeUsd ?? 0))
    .slice(0, 3)
    .map((agent) => ({
      src: resolveAvatarImageSrc(agent.avatarUrl, agent.slug),
      alt: agent.name,
      href: `/agents/${agent.id}`,
    }));
  
  // 2. Trending Agents (Top 8 by PnL)
  const trendingAgents = realAgentsList
    .slice()
    .sort((a, b) => (b.performance?.realizedPnlUsd ?? 0) - (a.performance?.realizedPnlUsd ?? 0))
    .slice(0, 8)
    .map(mapAgentToTrendingToken);

  // 3. Strategy catalog - Top by win rate
  const curatedStrategies = realAgentsList
    .slice()
    .sort((a, b) => (b.performance?.winRatePercent ?? 0) - (a.performance?.winRatePercent ?? 0))
    .slice(0, 5)
    .map(mapAgentToCollection);

  // 4. New releases - newest agents
  const newDeployments = realAgentsList
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4)
    .map(agent => ({
      ...mapAgentToCollection(agent),
      subtitle: `Deployed ${new Date(agent.createdAt).toLocaleDateString()}`
    }));

  // 5. Top performers - highest average return %
  const topPerformers = realAgentsList
    .slice()
    .sort((a, b) => (b.performance?.averageReturnPercent ?? 0) - (a.performance?.averageReturnPercent ?? 0))
    .slice(0, 4)
    .map(mapAgentToMover);

  // 6. Most active agents - total trades
  const activeSwarms = realAgentsList
    .slice()
    .sort((a, b) => (b.performance?.totalTrades ?? 0) - (a.performance?.totalTrades ?? 0))
    .slice(0, 8)
    .map(agent => ({
      ...mapAgentToMover(agent),
      value: `${agent.performance?.totalTrades || 0}`,
      valueLabel: "Trades"
    }));

  // 7. Highest weekly volume
  const topVolumeAgents = realAgentsList
     .slice()
     .sort((a, b) => ((b.performance?.volumeUsd ?? 0) - (a.performance?.volumeUsd ?? 0)));
  
  const topSalesAgent = topVolumeAgents[0];
  const relatedSalesAgents = topVolumeAgents.slice(1, 4).map(agent => ({
    name: agent.name,
    price: mapAgentToCollection(agent).value, 
    image: resolveAvatarImageSrc(agent.avatarUrl, agent.slug),
    href: `/agents/${agent.id}`,
  }));

  // 8. Featured agents - curation + fallback
  const featuredModels = (realAgentsList.slice(8, 12).length > 0 ? realAgentsList.slice(8, 12) : realAgentsList.slice(0, 4))
    .map((agent, i) => {
       const gradients = [
         "from-[#ff66cc] to-[#ffcc00]",
         "from-[#4facfe] to-[#00f2fe]",
         "from-[#667eea] to-[#764ba2]",
         "from-[#434343] to-[#000000]"
       ];
       return {
         id: agent.id,
         name: agent.name,
         price: mapAgentToCollection(agent).value || "Custom",
         change: agent.performance?.averageReturnPercent ? `${agent.performance.averageReturnPercent.toFixed(1)}%` : "0%",
         isPositive: (agent.performance?.averageReturnPercent ?? 0) >= 0,
         image: resolveAvatarImageSrc(agent.avatarUrl, agent.slug),
         gradient: gradients[i % gradients.length],
         chainIconSrc: getChainIconById(Number.parseInt(agent.listingSummary?.[0]?.networkId ?? "", 10) || null),
         href: `/agents/${agent.id}`,
       };
    });

  return {
    heroAgent,
    heroThumbnails,
    trendingAgents,
    curatedStrategies,
    newDeployments,
    topPerformers,
    activeSwarms,
    topSalesAgent,
    relatedSalesAgents,
    featuredModels
  };
}
