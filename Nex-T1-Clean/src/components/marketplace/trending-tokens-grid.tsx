"use client";

import { cn } from "@/lib/utils";
import { AgentAvatar } from "@/components/marketplace/agent-avatar";
import Link from "next/link";

interface TrendingAgentCardProps {
  id: string;
  name: string;
  value: string;   // Was price
  change: string;
  isPositive: boolean;
  valueLabel?: string; // e.g. "PnL" or "Price"
  imageUrl?: string;
  sparkline?: string;
  href?: string;
}

export function TrendingAgentCard({
  name,
  value,
  change,
  isPositive,
  imageUrl,
  href,
}: TrendingAgentCardProps) {
  const card = (
    <div className="bg-card rounded-xl p-3 border border-border/60 flex items-center group cursor-pointer hover:bg-accent transition-all">
        <div className="w-9 h-9 rounded-full overflow-hidden bg-muted/40 shrink-0 relative">
          <AgentAvatar
            src={imageUrl}
            name={name}
            fill
            imageClassName="object-cover w-full h-full"
            sizes="36px"
            enableOrb={false}
            orbClassName="scale-150"
          />
        </div>

        {/* Info */}
        <div className="min-w-0 ml-3">
          <h4 className="text-[13px] font-bold text-foreground truncate group-hover:text-primary transition-colors">
            {name}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-muted-foreground font-medium">{value}</span>
            <span
              className={cn(
                "text-[11px] font-bold",
                isPositive ? "text-emerald-500" : "text-rose-500"
              )}
            >
              {isPositive ? "+" : ""}{change}
            </span>
          </div>
        </div>

      {/* Sparkline (Visual placeholder) */}
      <div className="w-12 h-6 shrink-0 ml-auto">
        <svg
          viewBox="0 0 44 16"
          className={cn(
            "w-full h-full",
            isPositive ? "text-emerald-500" : "text-rose-500"
          )}
        >
          <path
            d={isPositive ? "M2 14 L8 10 L14 12 L20 6 L26 9 L32 4 L38 6 L42 2" : "M2 2 L8 6 L14 4 L20 10 L26 8 L32 12 L38 10 L42 14"}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

export function TrendingAgentsGrid({ items = [], title = "Trending Agents", subtitle = "Largest PnL change in the past day" }: { items?: TrendingAgentCardProps[], title?: string, subtitle?: string }) {
  const safeItems = Array.isArray(items) ? items : [];

  if (safeItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col">
        <h2 className="text-xl font-bold text-foreground tracking-tight">{title}</h2>
        <p className="text-[13px] text-muted-foreground">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {safeItems.map((agent) => (
          <TrendingAgentCard key={agent.id} {...agent} />
        ))}
      </div>
    </div>
  );
}

export const TrendingTokensGrid = TrendingAgentsGrid;
