import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { LaunchReceiptsTimeline } from "@/components/launchpad/launch-detail/launch-receipts-timeline";
import { getLaunchpadCampaignDetail, getLaunchpadCampaignReceipts } from "@/lib/launchpad/api";

type LaunchReceiptsPageProps = {
  params: Promise<{ campaignId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Launch Receipt Timeline | Nex-T1",
  description: "Signed payout receipts and epoch-level audit trail for launch campaigns.",
};

function parseEpochFilter(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export default async function LaunchReceiptsPage({ params, searchParams }: LaunchReceiptsPageProps) {
  const { campaignId } = await params;
  const epochFilter = parseEpochFilter((await searchParams).epoch);

  let campaign: Awaited<ReturnType<typeof getLaunchpadCampaignDetail>>;
  try {
    campaign = await getLaunchpadCampaignDetail(campaignId, { revalidate: false });
  } catch {
    notFound();
  }

  const receiptTimeline = await getLaunchpadCampaignReceipts(
    campaign.agentId,
    campaign.id,
    { limit: 250 },
    { revalidate: false },
  ).catch(() => ({
    ok: true as const,
    campaign: {
      id: campaign.id,
      riskScore: campaign.riskScore,
      riskFlags: campaign.riskFlags,
    },
    receipts: [],
  }));

  return (
    <DashboardShell insetClassName="h-full min-h-full overflow-hidden bg-background">
      <LaunchReceiptsTimeline campaign={campaign} receipts={receiptTimeline.receipts} activeEpoch={epochFilter} />
    </DashboardShell>
  );
}
