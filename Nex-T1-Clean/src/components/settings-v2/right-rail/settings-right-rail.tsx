"use client";

import { ArrowUpRight, Database, LifeBuoy, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

import { useTranslations } from "@/components/providers/locale-provider";
import { NotificationsCard } from "@/components/settings/right-panel/notifications-card";
import { ProfileSummaryCard } from "@/components/settings/right-panel/profile-summary-card";
import { TopHoldingsCard } from "@/components/settings/right-panel/top-holdings-card";
import { SettingsPanel } from "@/components/settings-v2/primitives/panel";
import { getSettingsRightRailCopy } from "@/modules/settings/i18n";
import type { SettingsRightRailSlot } from "@/modules/settings/types";

type SettingsRightRailProps = {
  slot: SettingsRightRailSlot;
};

export function SettingsRightRail({ slot }: SettingsRightRailProps) {
  const t = useTranslations("settingsNav");
  const copy = getSettingsRightRailCopy(t);

  if (slot === "hidden") {
    return null;
  }

  return (
    <div className="space-y-4">
      {slot === "overview" ? (
        <>
          <ProfileSummaryCard />
          <NotificationsCard />
          <TopHoldingsCard />
        </>
      ) : null}

      {slot === "profile" ? (
        <>
          <ProfileSummaryCard />
          <NotificationsCard />
        </>
      ) : null}

      {slot === "finance" ? (
        <>
          <TopHoldingsCard />
          <ProfileSummaryCard />
          <SettingsPanel
            title={copy.finance.title}
            description={copy.finance.description}
          >
            <div className="space-y-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Database className="size-4 text-primary" />
                {copy.finance.itemOne}
              </p>
              <p className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                {copy.finance.itemTwo}
              </p>
            </div>
          </SettingsPanel>
        </>
      ) : null}

      {slot === "activity" ? (
        <>
          <NotificationsCard />
          <SettingsPanel title={copy.activity.title} description={copy.activity.description}>
            <div className="space-y-2 text-sm text-muted-foreground">
              <Link href="/app" className="inline-flex items-center gap-2 text-foreground hover:text-primary">
                {copy.activity.linkLabel}
                <ArrowUpRight className="size-4" />
              </Link>
              <p>{copy.activity.body}</p>
            </div>
          </SettingsPanel>
        </>
      ) : null}

      {slot === "agents" ? (
        <>
          <SettingsPanel title={copy.agents.title} description={copy.agents.description}>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                {copy.agents.itemOne}
              </p>
              <p className="flex items-center gap-2">
                <LifeBuoy className="size-4 text-primary" />
                {copy.agents.itemTwo}
              </p>
            </div>
          </SettingsPanel>
          <NotificationsCard />
        </>
      ) : null}

      {slot === "integrations" ? (
        <>
          <SettingsPanel title={copy.integrations.title} description={copy.integrations.description}>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>{copy.integrations.itemOne}</p>
              <p>{copy.integrations.itemTwo}</p>
            </div>
          </SettingsPanel>
          <NotificationsCard />
        </>
      ) : null}

      {slot === "security" ? (
        <>
          <SettingsPanel title={copy.security.title} description={copy.security.description}>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>{copy.security.itemOne}</p>
              <p>{copy.security.itemTwo}</p>
            </div>
          </SettingsPanel>
          <ProfileSummaryCard />
        </>
      ) : null}

      {slot === "workspace" ? (
        <>
          <SettingsPanel title={copy.workspace.title} description={copy.workspace.description}>
            <p className="text-sm text-muted-foreground">
              {copy.workspace.body}
            </p>
          </SettingsPanel>
          <ProfileSummaryCard />
        </>
      ) : null}

      {slot === "developer" ? (
        <>
          <SettingsPanel title={copy.developer.title} description={copy.developer.description}>
            <p className="text-sm text-muted-foreground">
              {copy.developer.body}
            </p>
          </SettingsPanel>
          <ProfileSummaryCard />
        </>
      ) : null}
    </div>
  );
}
