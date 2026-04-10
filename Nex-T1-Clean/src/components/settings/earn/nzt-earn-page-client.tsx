"use client";

// Domain: settings/earn
// Responsibility: NZT staking placeholder (Coming Soon).
// Notes: NZT staking is not yet live. All mock data has been removed.
//        Wire to live pricing/staking APIs when the feature launches.

import Image from "next/image";
import { Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { BentoCard } from "@/components/settings/shared/bento-card";
import { SettingsPage, SettingsPageHeader } from "@/components/settings-v2/primitives/page";

const NZT_LOGO_URL = "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/nzt-logo.png";

export default function NztEarnPageClient() {
  return (
    <SettingsPage>
      <SettingsPageHeader
        title="Earn"
        description="Stake NZT to earn yield and track price, APY, and activity."
      />

      <BentoCard>
        <div className="flex flex-col items-center justify-center gap-6 py-12 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-[var(--bento-border)] bg-white/[0.03]">
            <Image
              src={NZT_LOGO_URL}
              alt="NZT"
              fill
              sizes="64px"
              className="object-cover"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-5 w-5 text-[var(--bento-text-muted)]" />
              <Badge
                variant="outline"
                className="rounded-full border-[var(--bento-border)] px-3 py-1 text-[11px] uppercase tracking-wide text-[var(--bento-text-muted)]"
              >
                Coming Soon
              </Badge>
            </div>

            <h2 className="text-xl font-medium text-[var(--bento-text-primary)]">NZT Staking</h2>
            <p className="mx-auto max-w-md text-sm text-[var(--bento-text-muted)]">
              NZT staking is not yet live. When launched, you will be able to stake NZT tokens
              to earn yield, track your APY, and manage your staking positions here.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4">
            <div className="rounded-lg bg-white/[0.03] px-3 py-2">
              <div className="text-xs uppercase tracking-wide text-[var(--bento-text-muted)]">Staked</div>
              <div className="mt-1 font-mono text-sm text-[var(--bento-text-primary)]">--</div>
            </div>
            <div className="rounded-lg bg-white/[0.03] px-3 py-2">
              <div className="text-xs uppercase tracking-wide text-[var(--bento-text-muted)]">Rewards</div>
              <div className="mt-1 font-mono text-sm text-[var(--bento-text-primary)]">--</div>
            </div>
            <div className="rounded-lg bg-white/[0.03] px-3 py-2">
              <div className="text-xs uppercase tracking-wide text-[var(--bento-text-muted)]">APY</div>
              <div className="mt-1 font-mono text-sm text-[var(--bento-text-primary)]">--</div>
            </div>
          </div>
        </div>
      </BentoCard>
    </SettingsPage>
  );
}
