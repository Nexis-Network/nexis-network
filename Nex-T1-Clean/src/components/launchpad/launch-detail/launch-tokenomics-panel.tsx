import { AlertTriangle, BarChart3, Coins, Gauge } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { LaunchpadCampaignDetail } from "@/lib/launchpad/types";

import { formatNumber, formatUsdBaseUnits } from "@/components/launchpad/launch-detail/utils";

type LaunchTokenomicsPanelProps = {
  campaign: LaunchpadCampaignDetail;
};

export function LaunchTokenomicsPanel({ campaign }: LaunchTokenomicsPanelProps) {
  const controls = campaign.launchControls as {
    whitelistEnabled?: boolean;
    bondingCurveEnabled?: boolean;
    bondingCurveSlopeBps?: number;
    perWalletCooldownSeconds?: number;
    maxContributors?: number;
  };

  const compliance = campaign.compliancePolicy as {
    requireVerifiedWallet?: boolean;
    blockSanctionedJurisdictions?: boolean;
    requireAcknowledgedRisk?: boolean;
  };

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-2xl border border-[#26272D] bg-[#141415] p-5">
        <header className="mb-4 flex items-center gap-2 text-white">
          <Coins className="size-4 text-[#B9F106]" />
          <h2 className="text-sm font-semibold">Tokenomics & Allocation</h2>
        </header>

        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Field label="Creator Allocation" value={`${campaign.revenuePolicy.creatorBps / 100}%`} />
          <Field label="Operator Allocation" value={`${campaign.revenuePolicy.operatorBps / 100}%`} />
          <Field label="Investor Allocation" value={`${campaign.revenuePolicy.investorBps / 100}%`} />
          <Field label="Token Standard" value={campaign.tokenStandard.toUpperCase()} />
          <Field label="Valuation Cap" value={campaign.valuationCapBaseUnits ? formatUsdBaseUnits(campaign.valuationCapBaseUnits) : "Not set"} />
          <Field label="Spot Price" value={campaign.totals.spotPriceBaseUnits ?? "N/A"} />
          <Field label="Min Contribution" value={formatUsdBaseUnits(campaign.minContributionBaseUnits)} />
          <Field label="Max Contribution" value={campaign.maxContributionBaseUnits ? formatUsdBaseUnits(campaign.maxContributionBaseUnits) : "No cap"} />
        </dl>
      </article>

      <article className="rounded-2xl border border-[#26272D] bg-[#141415] p-5">
        <header className="mb-4 flex items-center gap-2 text-white">
          <Gauge className="size-4 text-[#57B4FF]" />
          <h2 className="text-sm font-semibold">Sale Controls & Risk</h2>
        </header>

        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Field label="Sale Round" value={campaign.saleRound} />
          <Field label="Bonding Curve" value={controls.bondingCurveEnabled ? "Enabled" : "Disabled"} />
          <Field
            label="Curve Slope"
            value={controls.bondingCurveEnabled ? `${Number(controls.bondingCurveSlopeBps ?? 0) / 100}%` : "N/A"}
          />
          <Field label="Whitelist Gate" value={controls.whitelistEnabled ? "Enabled" : "Open"} />
          <Field label="Cooldown" value={`${formatNumber(String(controls.perWalletCooldownSeconds ?? 0))} sec`} />
          <Field
            label="Max Contributors"
            value={Number(controls.maxContributors ?? 0) > 0 ? formatNumber(String(controls.maxContributors)) : "Unlimited"}
          />
          <Field label="Verified Wallet Required" value={compliance.requireVerifiedWallet ? "Yes" : "No"} />
          <Field label="Sanctions Guard" value={compliance.blockSanctionedJurisdictions ? "Enforced" : "Not enforced"} />
        </dl>

        <div className="mt-4 rounded-lg border border-[#2f3138] bg-[#181A1D] p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-white/90">
            <BarChart3 className="size-3.5 text-[#FBD96B]" />
            Risk Snapshot
          </div>
          <p className="text-xs text-white/70">
            Risk score: <span className="font-mono text-white">{campaign.riskScore}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {campaign.riskFlags.length > 0 ? (
              campaign.riskFlags.map((flag) => (
                <Badge key={flag} variant="outline" className="border-[#3a3d44] bg-transparent text-[10px] text-[#FBD96B]">
                  {flag}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="border-[#3a3d44] bg-transparent text-[10px] text-white/70">
                No active flags
              </Badge>
            )}
          </div>
          {compliance.requireAcknowledgedRisk ? (
            <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#FBD96B]">
              <AlertTriangle className="size-3.5" />
              Investor risk acknowledgement required
            </p>
          ) : null}
        </div>
      </article>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#26272D] bg-[#17181b] px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-[0.08em] text-white/50">{label}</p>
      <p className="mt-1 font-mono text-sm text-white">{value}</p>
    </div>
  );
}
