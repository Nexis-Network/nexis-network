import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { LaunchpadCampaignDetail } from "@/lib/launchpad/types";
import { resolveAvatarImageSrc } from "@/lib/avatar-image-fallback";
import { cn } from "@/lib/utils";

import {
  chainName,
  createHeroBackground,
  formatDateTime,
  formatNumber,
  formatRoundFromBps,
  formatUsdBaseUnits,
} from "@/components/launchpad/launch-detail/utils";

type LaunchHeroProps = {
  campaign: LaunchpadCampaignDetail;
};

export function LaunchHero({ campaign }: LaunchHeroProps) {
  const progressPercent = Math.max(0, Math.min(100, campaign.progressBps / 100));

  return (
    <section className="overflow-hidden rounded-2xl border border-[#26272D] bg-[#141415]">
      <div
        className="relative isolate min-h-[280px] border-b border-white/10 px-6 py-6 sm:px-8 sm:py-8"
        style={{ background: createHeroBackground(campaign.agent.slug) }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/45" aria-hidden="true" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={campaign.status} />
              <Badge variant="outline" className="border-white/25 bg-black/30 text-white/85">
                {chainName(campaign.chainRef)}
              </Badge>
              <Badge variant="outline" className="border-white/25 bg-black/30 text-white/85">
                {campaign.tokenStandard.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="border-white/25 bg-black/30 text-white/85">
                {campaign.saleRound}
              </Badge>
            </div>

            <div className="mt-5 flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveAvatarImageSrc(campaign.agent.avatarUrl, campaign.agent.slug)}
                alt={`${campaign.agent.name} logo`}
                className="size-16 shrink-0 rounded-2xl border border-white/20 bg-black/20 object-cover sm:size-20"
                loading="lazy"
              />
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold text-white sm:text-3xl">{campaign.agent.name}</h1>
                <p className="mt-2 max-w-2xl text-sm text-white/80 sm:text-[15px]">
                  {campaign.description ?? "AI agent crowdfunding launch with on-chain fractionalized ownership."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {campaign.acceptedAssets.slice(0, 6).map((asset) => (
                    <Badge key={asset} variant="outline" className="border-white/20 bg-black/25 text-white/75">
                      {asset}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/15 bg-black/35 p-4 backbackdrop-blur-lg sm:p-5">
            <dl className="space-y-3 text-sm">
              <Metric label="Raised" value={formatUsdBaseUnits(campaign.raisedBaseUnits)} />
              <Metric label="Target" value={formatUsdBaseUnits(campaign.targetBaseUnits)} />
              <Metric label="Progress" value={formatRoundFromBps(campaign.progressBps)} />
              <Metric label="Contributors" value={formatNumber(String(campaign.totals.participantCount))} />
            </dl>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#7CFFB2] transition-[width]"
                style={{ width: `${progressPercent.toFixed(2)}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-white/70">
              Updated {formatDateTime(campaign.updatedAt)}. Close window: {formatDateTime(campaign.closeTs)}.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/agents/${campaign.agentId}`}
                className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
              >
                Agent Profile
                <ArrowUpRight className="size-3.5" />
              </Link>
              <Link
                href={`/launchpad/dashboard`}
                className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-black/35 px-3 py-1.5 text-xs font-medium text-white/85 transition-colors hover:bg-white/10"
              >
                <ShieldCheck className="size-3.5" />
                Launch Console
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-white/70">{label}</dt>
      <dd className="text-right font-mono text-sm text-white">{value}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: LaunchpadCampaignDetail["status"] }) {
  const label = status === "active" ? "Live" : status === "draft" ? "Draft" : status === "finalized" ? "Finalized" : "Cancelled";
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-white/30 bg-black/30",
        status === "active" && "text-[#7CFFB2]",
        status === "draft" && "text-[#f6d67d]",
        status === "finalized" && "text-[#9cc1ff]",
        status === "cancelled" && "text-[#ff8f8f]",
      )}
    >
      {label}
    </Badge>
  );
}
