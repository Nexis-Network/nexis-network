import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { LaunchDetailPage } from "@/components/launchpad/launch-detail-page";
import { getLaunchpadCampaignDetail, getLaunchpadCampaignReceipts } from "@/lib/launchpad/api";

type LaunchDetailRouteProps = {
  params: Promise<{
    campaignId: string;
  }>;
};

export async function generateMetadata({ params }: LaunchDetailRouteProps): Promise<Metadata> {
  try {
    const { campaignId } = await params;
    const campaign = await getLaunchpadCampaignDetail(campaignId, { revalidate: false });
    return {
      title: `${campaign.agent.name} Launch | Nex-T1`,
      description: `Launch details, tokenomics, crowdfunding status, and participant ledger for ${campaign.agent.name}.`,
      alternates: {
        canonical: `/launches/${campaign.id}`,
      },
    };
  } catch {
    return {
      title: "Launch Detail | Nex-T1",
      description: "AI agent launch detail page with tokenomics and crowdfunding progress.",
    };
  }
}

export default async function LaunchDetailRoute({ params }: LaunchDetailRouteProps) {
  const { campaignId } = await params;

  let campaign: Awaited<ReturnType<typeof getLaunchpadCampaignDetail>>;
  try {
    campaign = await getLaunchpadCampaignDetail(campaignId, { revalidate: false });
  } catch {
    notFound();
  }

  const receiptTimeline = await getLaunchpadCampaignReceipts(
    campaign.agentId,
    campaign.id,
    { limit: 100 },
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
      <LaunchDetailPage campaign={campaign} receipts={receiptTimeline.receipts} />
    </DashboardShell>
  );
}
