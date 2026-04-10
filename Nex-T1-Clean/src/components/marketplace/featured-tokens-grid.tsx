import { DefaultAgentCard } from "@/components/agents/default-agent-card";
import { DEFAULT_CHAIN_ICON } from "@/lib/chain-icons";

interface FeaturedAgent {
  id: string;
  name: string;
  change: string;
  isPositive: boolean;
  chainIconSrc?: string;
}

export function FeaturedAgentsGrid({ items = [] }: { items?: FeaturedAgent[] }) {
  const safeItems = Array.isArray(items) ? items : [];

  if (safeItems.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col">
        <h2 className="text-xl font-bold text-foreground tracking-tight">Featured Agents</h2>
        <p className="text-[13px] text-muted-foreground">Curated autonomous agents for this week.</p>
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(192px,1fr))]">
        {safeItems.map((agent) => (
          <DefaultAgentCard
            key={agent.id}
            id={agent.id}
            name={agent.name}
            profitLossLabel={agent.isPositive ? `+${agent.change}` : agent.change}
            chainIconSrc={agent.chainIconSrc ?? DEFAULT_CHAIN_ICON}
            chainLabel="Agent chain logo"
          />
        ))}
      </div>
    </section>
  );
}

export const FeaturedTokensGrid = FeaturedAgentsGrid;
