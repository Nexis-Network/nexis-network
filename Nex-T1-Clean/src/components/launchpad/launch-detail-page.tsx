import Link from "next/link";
import { ChevronLeft, Hash, Target, Users } from "lucide-react";
import type { ComponentType } from "react";

import { LaunchDistributionsTable } from "@/components/launchpad/launch-detail/launch-distributions-table";
import { LaunchHero } from "@/components/launchpad/launch-detail/launch-hero";
import { LaunchInvestorProtectionPanel } from "@/components/launchpad/launch-detail/launch-investor-protection-panel";
import { LaunchParticipantsTable } from "@/components/launchpad/launch-detail/launch-participants-table";
import { LaunchTeamPanel } from "@/components/launchpad/launch-detail/launch-team-panel";
import { LaunchTokenomicsPanel } from "@/components/launchpad/launch-detail/launch-tokenomics-panel";
import {
  chainName,
  formatNumber,
  formatRoundFromBps,
  formatUsdBaseUnits,
} from "@/components/launchpad/launch-detail/utils";
import type { LaunchpadCampaignDetail, LaunchpadCampaignReceipt } from "@/lib/launchpad/types";

type LaunchDetailPageProps = {
  campaign: LaunchpadCampaignDetail;
  receipts: LaunchpadCampaignReceipt[];
};

export function LaunchDetailPage({ campaign, receipts }: LaunchDetailPageProps) {
  return (
    <div className="flex h-full min-h-full w-full justify-center overflow-y-auto bg-[#111214] px-4 py-4 sm:px-6 sm:py-6">
      <div className="w-full max-w-[1240px] space-y-4 pb-10 sm:space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/launches"
              className="inline-flex items-center gap-1 rounded-md border border-[#2c2e35] bg-[#17181b] px-2.5 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-[#1c1e22]"
            >
              <ChevronLeft className="size-3.5" />
              Launches
            </Link>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{campaign.agent.name}</p>
              <p className="truncate text-xs text-white/55">
                {chainName(campaign.chainRef)} • {campaign.campaignAddress ?? "Campaign address pending"}
              </p>
            </div>
          </div>
          <Link
            href={`/launches/${campaign.id}/receipts`}
            className="inline-flex items-center gap-1 rounded-md border border-[#2c2e35] bg-[#17181b] px-2.5 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-[#1c1e22]"
          >
            Receipt Timeline
          </Link>
        </header>

        <LaunchHero campaign={campaign} />

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat
            icon={Target}
            label="Crowdfunding Fill"
            value={formatRoundFromBps(campaign.progressBps)}
            subvalue={`${formatUsdBaseUnits(campaign.raisedBaseUnits)} of ${formatUsdBaseUnits(campaign.targetBaseUnits)}`}
          />
          <MiniStat
            icon={Users}
            label="Wallet Participants"
            value={formatNumber(String(campaign.totals.participantCount))}
            subvalue={`${formatNumber(String(campaign.totals.contributionCount))} contribution events`}
          />
          <MiniStat
            icon={Hash}
            label="Shares Minted"
            value={formatNumber(campaign.totals.sharesMintedBaseUnits)}
            subvalue={`Spot price ${campaign.totals.spotPriceBaseUnits ?? "N/A"}`}
          />
          <MiniStat
            icon={Hash}
            label="Token / Round"
            value={`${campaign.tokenStandard.toUpperCase()} • ${campaign.saleRound}`}
            subvalue={`Risk score ${campaign.riskScore}`}
          />
        </section>

        <LaunchTokenomicsPanel campaign={campaign} />

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <LaunchParticipantsTable campaign={campaign} />
          <LaunchTeamPanel campaign={campaign} />
        </section>

        <LaunchInvestorProtectionPanel campaign={campaign} receipts={receipts} />
        <LaunchDistributionsTable campaign={campaign} receipts={receipts} />
      </div>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  subvalue,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subvalue: string;
}) {
  return (
    <article className="rounded-xl border border-[#26272D] bg-[#141415] p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-white/55">
        <Icon className="size-3.5 text-white/70" />
        {label}
      </div>
      <p className="mt-2 truncate font-mono text-base text-white">{value}</p>
      <p className="mt-1 text-xs text-white/55">{subvalue}</p>
    </article>
  );
}
