"use client";

import { memo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";

import type { AgentListItem, AgentListingSummary } from "@/lib/agents/types";
import {
  deriveAssetSymbol,
  formatListingPrice,
  humanizeListingType,
  humanizeNetwork,
} from "@/lib/agents/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type AgentCardProps = {
  agent: AgentListItem;
};

const CORNER_CUT_PX = 44;
const cornerButtonClipPath = `polygon(${CORNER_CUT_PX}px 0, 100% 0, 100% 100%, 0 100%)`;

type GroupedListing = {
  type: AgentListingSummary["listingType"];
  label: string;
  summaries: AgentListingSummary[];
};

export const AgentCard = memo(function AgentCard({ agent }: AgentCardProps) {
  const grouped = groupListings(agent.listingSummary);
  const href = `/agents/${agent.id}`;
  const createdRelative = formatDistance(agent.createdAt);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="h-full"
    >
      <Card className="group relative flex h-full flex-col overflow-hidden border-white/[0.06] bg-gradient-to-b from-[#0b0f14]/90 via-[#0b0f14]/70 to-[#070a0d]/90 transition hover:border-primary/40 hover:shadow-[0_22px_55px_-16px_rgba(41,145,255,0.35)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(900px circle at 20% -10%, rgba(56,189,248,0.18), transparent 50%), radial-gradient(800px circle at 110% 40%, rgba(167,139,250,0.12), transparent 55%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 38%, rgba(255,255,255,0.01) 100%)",
          }}
        />

        <CardHeader className="relative space-y-3 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-1">
              <Link
                href={href}
                prefetch
                className="inline-flex items-center gap-2 text-left text-lg font-regular tracking-tight text-white transition hover:text-primary"
              >
                {agent.name}
                <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <p className="text-xs uppercase tracking-wide text-muted-foreground/70">
                {createdRelative}
              </p>
            </div>
            <VisibilityBadge visibility={agent.visibility} />
          </div>
          {agent.description ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {agent.description.length > 160
                ? `${agent.description.slice(0, 157)}…`
                : agent.description}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground/70">
              No description provided.
            </p>
          )}
          <AgentPerformance performance={agent.performance} />
        </CardHeader>
        <CardContent className="relative flex flex-1 flex-col justify-between gap-4 pb-14 pt-0">
          {grouped.length > 0 ? (
            <div className="flex flex-col gap-3">
              {grouped.map((group) => (
                <div key={group.type} className="flex flex-col gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                    {group.label}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {group.summaries.map((summary) => (
                      <ListingPill key={`${summary.listingId}-${summary.networkId}-${summary.assetId}`} summary={summary} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-muted-foreground">
              Pricing not published yet. Follow to be notified.
            </div>
          )}
          <div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted-foreground/80">
            <span>ID: {agent.slug}</span>
            <span>{grouped.length > 0 ? `${grouped.length} offer${grouped.length === 1 ? "" : "s"}` : "Unlisted"}</span>
          </div>
        </CardContent>

        <Link
          href={href}
          prefetch
          className={cn(
            "absolute bottom-0 right-0 z-10 flex h-12 items-center justify-center gap-2 px-5 text-xs font-medium uppercase tracking-[0.24em]",
            "border border-primary/40 bg-primary/15 text-white/90 backbackdrop-blur-lg transition",
            "hover:bg-primary/25 hover:text-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
          )}
          style={{ clipPath: cornerButtonClipPath }}
          aria-label={`View ${agent.name}`}
        >
          View
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </Card>
    </motion.div>
  );
});

type AgentPerformanceProps = {
  performance?: AgentListItem["performance"];
};

function AgentPerformance({ performance }: AgentPerformanceProps) {
  if (!performance || performance.totalTrades === 0) {
    return null;
  }

  const positive = performance.realizedPnlUsd >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-white">
        <Icon className={positive ? "h-4 w-4 text-emerald-400" : "h-4 w-4 text-red-400"} />
        <span>{formatCurrency(performance.realizedPnlUsd)}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground/80">
        <span>Win rate</span>
        <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-xs">
          {performance.winRatePercent !== null ? `${performance.winRatePercent.toFixed(1)}%` : "—"}
        </Badge>
        <span>Avg</span>
        <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-xs">
          {performance.averageReturnPercent !== null ? `${performance.averageReturnPercent.toFixed(2)}%` : "—"}
        </Badge>
        <span>· {performance.totalTrades} trades</span>
      </div>
    </div>
  );
}

function formatCurrency(value: number) {
  const formatter = Math.abs(value) >= 1000 ? usdFormatter0 : usdFormatter2;
  return formatter.format(value);
}

const usdFormatter0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdFormatter2 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function groupListings(listings: AgentListingSummary[]): GroupedListing[] {
  const map = new Map<AgentListingSummary["listingType"], AgentListingSummary[]>();
  for (const listing of listings) {
    const existing = map.get(listing.listingType);
    if (existing) {
      existing.push(listing);
    } else {
      map.set(listing.listingType, [listing]);
    }
  }
  return Array.from(map.entries()).map(([type, summaries]) => ({
    type,
    label: humanizeListingType(type),
    summaries: summaries.sort((a, b) => a.networkId.localeCompare(b.networkId)),
  }));
}

function formatDistance(iso: string | null) {
  if (!iso) return "Created recently";
  try {
    return `${formatDistanceToNowStrict(new Date(iso), { addSuffix: true })}`;
  } catch {
    return "Created recently";
  }
}

type VisibilityBadgeProps = {
  visibility: AgentListItem["visibility"];
};

function VisibilityBadge({ visibility }: VisibilityBadgeProps) {
  const { label, tone } = (() => {
    switch (visibility) {
      case "public":
        return { label: "Public", tone: "bg-[#8eb94f]/15 text-emerald-200 border-emerald-500/30" };
      case "unlisted":
        return { label: "Unlisted", tone: "bg-amber-500/15 text-amber-200 border-amber-500/30" };
      default:
        return { label: "Private", tone: "bg-slate-600/20 text-slate-200 border-slate-500/30" };
    }
  })();

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-wide",
        tone,
      )}
    >
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </Badge>
  );
}

type ListingPillProps = {
  summary: AgentListingSummary;
};

function ListingPill({ summary }: ListingPillProps) {
  const priceLabel = formatListingPrice(summary);
  const network = humanizeNetwork(summary.networkId);
  const symbol = deriveAssetSymbol(summary);

  return (
    <motion.div
      layout
      className="flex min-w-[9.5rem] flex-col gap-1 rounded-xl border border-white/8 bg-gradient-to-br from-white/[0.03] to-white/[0.01] px-3 py-2"
    >
      <span className="text-sm font-regular text-white">{priceLabel}</span>
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground/70">
        {network} • {symbol}
      </span>
    </motion.div>
  );
}
